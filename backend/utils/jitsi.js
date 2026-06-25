const crypto = require("crypto");
const fs = require("fs");
const jwt = require("jsonwebtoken");

const DEFAULT_JITSI_DOMAIN = "8x8.vc";
const JOIN_WINDOW_BEFORE_MINUTES = 30;
const JOIN_WINDOW_AFTER_MINUTES = 120;
const TOKEN_TTL_SECONDS = 2 * 60 * 60;

const normalizePrivateKey = (value = "") =>
    String(value || "")
        .replace(/\\n/g, "\n")
        .trim();

const getPrivateKey = () => {
    const inlineKey = normalizePrivateKey(process.env.JITSI_PRIVATE_KEY);
    if (inlineKey) return inlineKey;

    const keyPath = String(process.env.JITSI_PRIVATE_KEY_PATH || "").trim();
    if (!keyPath) return "";

    return normalizePrivateKey(fs.readFileSync(keyPath, "utf8"));
};

const getJitsiConfig = () => {
    const appId = String(process.env.JITSI_APP_ID || "").trim();
    const apiKeyId = String(process.env.JITSI_API_KEY_ID || "").trim();
    const privateKey = getPrivateKey();
    const domain = String(process.env.JITSI_DOMAIN || DEFAULT_JITSI_DOMAIN).trim();

    const missing = [];
    if (!appId) missing.push("JITSI_APP_ID");
    if (!apiKeyId) missing.push("JITSI_API_KEY_ID");
    if (!privateKey) missing.push("JITSI_PRIVATE_KEY or JITSI_PRIVATE_KEY_PATH");

    if (missing.length) {
        throw new Error(`Missing Jitsi configuration: ${missing.join(", ")}`);
    }

    return { appId, apiKeyId, privateKey, domain };
};

const generateJitsiRoomName = (consultationId) => {
    const idSuffix = String(consultationId || "consultation")
        .replace(/[^a-z0-9]/gi, "")
        .slice(-8)
        .toLowerCase();
    return `docx-${idSuffix}-${crypto.randomBytes(16).toString("hex")}`;
};

const getConsultationStartAt = (consultation) => {
    const dateKey = consultation?.approvedDateKey || "";
    const timeSlot = consultation?.approvedTimeSlot || "";

    if (!dateKey || !timeSlot) {
        return null;
    }

    const startAt = new Date(`${dateKey}T${timeSlot}:00`);
    return Number.isNaN(startAt.getTime()) ? null : startAt;
};

const buildJoinWindow = (startAt) => {
    const startTime = startAt instanceof Date ? startAt.getTime() : NaN;
    if (Number.isNaN(startTime)) {
        throw new Error("A valid scheduled start time is required for the Jitsi meeting");
    }

    return {
        opensAt: new Date(startTime - JOIN_WINDOW_BEFORE_MINUTES * 60 * 1000),
        closesAt: new Date(startTime + JOIN_WINDOW_AFTER_MINUTES * 60 * 1000),
    };
};

const assertJitsiCanSign = () => {
    const config = getJitsiConfig();

    jwt.sign(
        {
            aud: "jitsi",
            iss: "chat",
            sub: config.appId,
            room: "docx-signing-check",
            exp: Math.floor(Date.now() / 1000) + 60,
            nbf: Math.floor(Date.now() / 1000) - 10,
        },
        config.privateKey,
        {
            algorithm: "RS256",
            header: {
                kid: config.apiKeyId,
                typ: "JWT",
            },
        }
    );

    return config;
};

const prepareJitsiMeeting = ({ consultation, scheduledAt }) => {
    const config = assertJitsiCanSign();
    const startAt = scheduledAt || getConsultationStartAt(consultation);
    const window = buildJoinWindow(startAt);
    const roomName = consultation.jitsiRoomName || generateJitsiRoomName(consultation._id);

    return {
        platform: "jitsi",
        provider: "jaas",
        appId: config.appId,
        domain: config.domain,
        roomName,
        meetingId: roomName,
        scheduledStartAt: startAt,
        joinOpensAt: window.opensAt,
        joinClosesAt: window.closesAt,
    };
};

const buildJitsiJwt = ({
    consultation,
    user,
    name,
    email,
    isModerator = false,
}) => {
    const config = getJitsiConfig();
    const now = Math.floor(Date.now() / 1000);
    const closesAt = consultation.meetingJoinClosesAt
        ? Math.floor(new Date(consultation.meetingJoinClosesAt).getTime() / 1000)
        : now + TOKEN_TTL_SECONDS;
    const exp = Math.max(now + 60, Math.min(now + TOKEN_TTL_SECONDS, closesAt));

    return jwt.sign(
        {
            aud: "jitsi",
            context: {
                user: {
                    id: String(user?._id || user?.id || ""),
                    name: name || user?.name || "DocX user",
                    email: email || user?.email || "",
                    avatar: "",
                    moderator: isModerator ? "true" : "false",
                },
                features: {
                    livestreaming: false,
                    recording: false,
                    transcription: false,
                    "sip-inbound-call": false,
                    "sip-outbound-call": false,
                    "inbound-call": false,
                    "outbound-call": false,
                    "file-upload": false,
                    "list-visitors": false,
                },
                room: {
                    regex: false,
                },
            },
            exp,
            iss: "chat",
            nbf: now - 10,
            room: consultation.jitsiRoomName,
            sub: config.appId,
        },
        config.privateKey,
        {
            algorithm: "RS256",
            header: {
                kid: config.apiKeyId,
                typ: "JWT",
            },
        }
    );
};

module.exports = {
    JOIN_WINDOW_AFTER_MINUTES,
    JOIN_WINDOW_BEFORE_MINUTES,
    buildJitsiJwt,
    buildJoinWindow,
    generateJitsiRoomName,
    getConsultationStartAt,
    getJitsiConfig,
    prepareJitsiMeeting,
};
