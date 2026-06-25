import axios from "axios";
import { API_BASE_URL } from "@/shared/lib/apiBase";
import { getStoredAuthSession } from "@/shared/lib/authSession";

const wait = (durationMs) =>
  new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });

const RETRYABLE_STATUS_CODES = new Set([500, 502, 503, 504]);
const MAX_RETRIES = import.meta.env.DEV ? 4 : 2;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to include the token
api.interceptors.request.use(
  (config) => {
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      if (typeof config.headers?.delete === "function") {
        config.headers.delete("Content-Type");
      } else if (config.headers) {
        delete config.headers["Content-Type"];
        delete config.headers["content-type"];
      }
    }

    const { accessToken } = getStoredAuthSession();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {};
    const method = String(config.method || "get").toLowerCase();
    const status = error.response?.status;
    const retryCount = Number(config.__retryCount || 0);
    const isRetryableMethod = ["get", "head", "options"].includes(method);
    const isRetryableError = !error.response || RETRYABLE_STATUS_CODES.has(status);

    if (isRetryableMethod && isRetryableError && retryCount < MAX_RETRIES) {
      config.__retryCount = retryCount + 1;
      const retryDelay = 250 * 2 ** retryCount;
      await wait(retryDelay);
      return api(config);
    }

    return Promise.reject(error);
  }
);

export default api;

// A separate axios instance used by the useAxiosPrivate hook.
// This instance does NOT include the retry/token interceptors above,
// because the hook wires its own interceptors at runtime.
export const axiosPrivate = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});
