const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

let ioInstance = null;
const connectedUsers = new Map();

const getRoomNameForUser = (userId) => `user:${String(userId)}`;

const isUserOnline = (userId) => connectedUsers.has(String(userId));

const emitPresenceChanged = (userId, online) => {
    if (!ioInstance) return;
    ioInstance.emit("presence:changed", {
        userId: String(userId),
        online: Boolean(online),
    });
};

const emitToUsers = (userIds = [], eventName, payload) => {
    if (!ioInstance) return;

    Array.from(
        new Set(
            userIds
                .filter(Boolean)
                .map((userId) => String(userId))
        )
    ).forEach((userId) => {
        ioInstance.to(getRoomNameForUser(userId)).emit(eventName, payload);
    });
};

const initializeSocket = (httpServer) => {
    if (ioInstance) {
        return ioInstance;
    }

    ioInstance = new Server(httpServer, {
        cors: {
            origin: [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:5174",
                "http://localhost:5175",
                "http://127.0.0.1:5174",
                "http://127.0.0.1:5175",
                "http://localhost:4173/",
            ],
            credentials: true,
        },
    });

    ioInstance.use(async (socket, next) => {
        try {
            const rawToken =
                socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization ||
                "";
            const token = String(rawToken).replace(/^Bearer\s+/i, "").trim();

            if (!token) {
                return next(new Error("Socket authentication token missing"));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET || "docx_secret_123");
            const user = await User.findById(decoded.id).select("_id role name");

            if (!user) {
                return next(new Error("Socket user not found"));
            }

            socket.user = {
                _id: String(user._id),
                role: user.role,
                name: user.name,
            };

            next();
        } catch (error) {
            next(new Error("Socket authentication failed"));
        }
    });

    ioInstance.on("connection", (socket) => {
        const userId = String(socket.user._id);
        const roomName = getRoomNameForUser(userId);

        socket.join(roomName);

        const nextCount = (connectedUsers.get(userId) || 0) + 1;
        connectedUsers.set(userId, nextCount);

        if (nextCount === 1) {
            emitPresenceChanged(userId, true);
        }

        socket.on("disconnect", () => {
            const currentCount = connectedUsers.get(userId) || 0;
            const remaining = Math.max(currentCount - 1, 0);

            if (remaining === 0) {
                connectedUsers.delete(userId);
                emitPresenceChanged(userId, false);
                return;
            }

            connectedUsers.set(userId, remaining);
        });
    });

    return ioInstance;
};

module.exports = {
    emitToUsers,
    getRoomNameForUser,
    initializeSocket,
    isUserOnline,
};
