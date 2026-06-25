import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import net from "node:net";
import { spawn } from "node:child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_BACKEND_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const BACKEND_START_TIMEOUT_MS = 20000;

let managedBackendChild = null;
let managedBackendPromise = null;

const createAssistantFallbackPayload = () =>
  JSON.stringify({
    status: "ok",
    mode: "follow_up",
    answer:
      "The live health assistant is starting up. Tell me your main symptom, how long it has been happening, and whether it is getting worse, and I’ll keep helping while the service reconnects.",
    disclaimer:
      "DocX Health Assistant shares general health guidance only. It cannot diagnose, prescribe, or replace urgent medical care.",
    urgency: "routine",
    specialties: [],
    actions: [],
    quickReplies: [
      "I have a headache",
      "I have a fever",
      "I have a cough",
      "I have stomach pain",
    ],
  });

const isPortReachable = ({ hostname, port }, timeoutMs = 500) =>
  new Promise((resolve) => {
    const socket = net.createConnection({
      host: hostname,
      port: Number(port),
    });

    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });

const waitForReachablePort = async (target, timeoutMs = BACKEND_START_TIMEOUT_MS) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isPortReachable(target, 500)) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  return false;
};

const createManagedBackendStarter = ({ rootDir, targetUrl }) => async () => {
  if (!targetUrl || !LOCAL_BACKEND_HOSTS.has(targetUrl.hostname)) {
    return;
  }

  const target = {
    hostname: targetUrl.hostname,
    port: targetUrl.port || "80",
  };

  if (await isPortReachable(target)) {
    return;
  }

  if (managedBackendPromise) {
    return managedBackendPromise;
  }

  managedBackendPromise = (async () => {
    const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

    managedBackendChild = spawn(npmCommand, ["--prefix", "backend", "run", "start"], {
      cwd: rootDir,
      stdio: "inherit",
      env: process.env,
    });

    managedBackendChild.on("exit", () => {
      managedBackendChild = null;
      managedBackendPromise = null;
    });

    const isReady = await waitForReachablePort(target);

    if (!isReady) {
      console.warn(
        `[DocX] Backend on ${target.hostname}:${target.port} is still not reachable after startup.`
      );
    }
  })();

  return managedBackendPromise;
};

const attachManagedBackendCleanup = (server) => {
  if (!server?.httpServer) {
    return;
  }

  server.httpServer.once("close", () => {
    if (managedBackendChild && !managedBackendChild.killed) {
      managedBackendChild.kill("SIGTERM");
    }

    managedBackendChild = null;
    managedBackendPromise = null;
  });
};

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_API_URL || "http://localhost:5001";
  const targetUrl = (() => {
    try {
      return new URL(apiTarget);
    } catch {
      return null;
    }
  })();
  const ensureBackendRunning = createManagedBackendStarter({
    rootDir: process.cwd(),
    targetUrl,
  });

  return {
    plugins: [
      react(),
      {
        name: "docx-dev-backend-autostart",
        apply: "serve",
        async configureServer(server) {
          attachManagedBackendCleanup(server);
          await ensureBackendRunning();

          server.middlewares.use("/api/assistant/health-chat", async (req, res, next) => {
            if (req.method !== "POST" || !targetUrl) {
              next();
              return;
            }

            const isBackendUp = await isPortReachable(
              {
                hostname: targetUrl.hostname,
                port: targetUrl.port || "80",
              },
              200
            );

            if (isBackendUp) {
              next();
              return;
            }

            void ensureBackendRunning();
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(createAssistantFallbackPayload());
          });
        },
      },
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          timeout: BACKEND_START_TIMEOUT_MS,
          proxyTimeout: BACKEND_START_TIMEOUT_MS,
          configure(proxy) {
            proxy.on("error", (_error, req, res) => {
              void ensureBackendRunning();

              if (res.headersSent || res.writableEnded) {
                return;
              }

              if (req.url?.startsWith("/api/assistant/health-chat")) {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(createAssistantFallbackPayload());
                return;
              }

              res.writeHead(503, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  message:
                    "DocX API is starting up. Please retry in a moment.",
                })
              );
            });
          },
        },
        "/socket.io": {
          target: apiTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (id.includes("react") || id.includes("react-dom") || id.includes("react-router")) {
                return "vendor-react";
              }
              if (id.includes("@stripe")) {
                return "vendor-stripe";
              }
              return "vendor";
            }
          },
        },
      },
    },
  };
});
