const nodemailer = require("nodemailer");
const axios = require("axios");
const EmailNotificationLog = require("../../models/EmailNotificationLog");
const SystemSettings = require("../../models/SystemSettings");
const templates = require("./templates");

let transporterPromise = null;
const BREVO_EMAIL_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

const normalizeRecipient = (value = "") => String(value || "").trim().toLowerCase();
const stripHtml = (value = "") => String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const getBrevoApiKey = () => process.env.BREVO_API_KEY || process.env.EMAIL_BREVO_API_KEY || "";

const buildProviderLabel = () =>
    getBrevoApiKey()
        ? "brevo-api"
        : process.env.EMAIL_SMTP_USER && process.env.EMAIL_SMTP_PASS
            ? "brevo-smtp"
            : "json-transport";

const isReminderCategory = (category) => category === "reminder";

const getSystemSettings = async () => {
    const settings = await SystemSettings.findOne({}).lean();
    return settings || {};
};

const shouldSendForCategory = async (category = "transactional") => {
    const settings = await getSystemSettings();

    if (settings.emailNotifications === false) {
        return false;
    }

    if (category === "reminder" && settings.appointmentReminders === false) {
        return false;
    }

    if (category === "lowStock" && settings.lowStockAlerts === false) {
        return false;
    }

    if (category === "system" && settings.systemAlerts === false) {
        return false;
    }

    return true;
};

const getFrontendUrl = () => process.env.FRONTEND_URL || "http://localhost:5173";

const getTransporter = async () => {
    if (!transporterPromise) {
        transporterPromise = Promise.resolve().then(() => {
            if (process.env.EMAIL_SMTP_USER && process.env.EMAIL_SMTP_PASS) {
                return nodemailer.createTransport({
                    host: process.env.EMAIL_SMTP_HOST || "smtp-relay.brevo.com",
                    port: Number(process.env.EMAIL_SMTP_PORT || 587),
                    secure: Number(process.env.EMAIL_SMTP_PORT || 587) === 465,
                    auth: {
                        user: process.env.EMAIL_SMTP_USER,
                        pass: process.env.EMAIL_SMTP_PASS,
                    },
                });
            }

            return nodemailer.createTransport({ jsonTransport: true });
        });
    }

    return transporterPromise;
};

const renderTemplate = (eventKey, payload = {}) => {
    const templateFn = templates[eventKey];

    if (!templateFn) {
        throw new Error(`Missing email template for event: ${eventKey}`);
    }

    return templateFn({
        ...payload,
        frontendUrl: payload.frontendUrl || getFrontendUrl(),
    });
};

const resolveAdminAlertRecipients = async () => {
    const envRecipients = String(process.env.ADMIN_ALERT_EMAILS || "")
        .split(",")
        .map((value) => normalizeRecipient(value))
        .filter(Boolean);

    if (envRecipients.length) {
        return envRecipients;
    }

    const settings = await getSystemSettings();
    const fallback = normalizeRecipient(settings.hospitalEmail || process.env.EMAIL_FROM || "");

    return fallback ? [fallback] : [];
};

const buildMailOptions = (recipient, subject, html) => {
    const fromAddress = process.env.EMAIL_FROM || "noreply@docx.com";
    const fromName = process.env.EMAIL_FROM_NAME || "DocX Care";
    const replyTo = process.env.EMAIL_REPLY_TO || fromAddress;

    return {
        from: `${fromName} <${fromAddress}>`,
        replyTo,
        to: recipient,
        subject,
        html,
    };
};

const sendViaBrevoApi = async (recipient, subject, html) => {
    const fromAddress = process.env.EMAIL_FROM || "noreply@docx.com";
    const fromName = process.env.EMAIL_FROM_NAME || "DocX Care";
    const replyTo = process.env.EMAIL_REPLY_TO || fromAddress;

    const response = await axios.post(
        BREVO_EMAIL_ENDPOINT,
        {
            sender: { name: fromName, email: fromAddress },
            to: [{ email: recipient }],
            replyTo: { email: replyTo, name: fromName },
            subject,
            htmlContent: html,
            textContent: stripHtml(html),
        },
        {
            headers: {
                accept: "application/json",
                "api-key": getBrevoApiKey(),
                "content-type": "application/json",
            },
            timeout: 15000,
        }
    );

    return {
        messageId: response.data?.messageId || "",
    };
};

const executeEmailSend = async (log) => {
    const { subject, html } = renderTemplate(log.eventKey, log.payload || {});
    const useBrevoApi = Boolean(getBrevoApiKey());
    let info;

    if (useBrevoApi) {
        try {
            info = await sendViaBrevoApi(log.recipient, subject, html);
        } catch (error) {
            throw new Error(`Brevo API Error: ${error.response?.data?.message || error.message}`);
        }
    } else {
        const transporter = await getTransporter();
        const mailOptions = buildMailOptions(log.recipient, subject, html);
        info = await transporter.sendMail(mailOptions);

        if (transporter.options && transporter.options.jsonTransport && info.message) {
            try {
                const jsonMessage = JSON.parse(info.message);
                console.log("[Email JSON Preview]", {
                    to: jsonMessage.to?.[0]?.address || log.recipient,
                    subject: jsonMessage.subject || subject,
                });
            } catch (error) {
                console.log("[Email JSON Preview]", { to: log.recipient, subject });
            }
        }
    }

    log.status = "sent";
    log.provider = buildProviderLabel();
    log.sentTime = new Date();
    log.lastAttemptAt = new Date();
    log.attempts += 1;
    log.lastError = "";
    log.messageId = info.messageId || "";
    await log.save();

    return log;
};

const markLogFailure = async (log, error) => {
    log.status = "failed";
    log.provider = buildProviderLabel();
    log.lastError = error.message || "Unknown email error";
    log.lastAttemptAt = new Date();
    log.attempts += 1;
    await log.save();
    return log;
};

const createEmailLog = async ({
    eventKey,
    recipient,
    payload = {},
    dedupeKey,
    relatedEntity = null,
    relatedEntityModel = "",
    category = "transactional",
    scheduleFor = new Date(),
}) =>
    EmailNotificationLog.create({
        eventKey,
        recipient: normalizeRecipient(recipient),
        payload,
        dedupeKey,
        relatedEntity,
        relatedEntityModel,
        category,
        status: "pending",
        scheduledTime: scheduleFor,
        provider: buildProviderLabel(),
    });

const sendTemplatedEmail = async ({
    eventKey,
    recipient,
    data = {},
    dedupeKey,
    relatedEntity = null,
    relatedEntityModel = "",
    scheduleFor = new Date(),
    category = "transactional",
    throwOnError = false,
}) => {
    const normalizedRecipient = normalizeRecipient(recipient);

    if (!normalizedRecipient) {
        return null;
    }

    if (!(await shouldSendForCategory(category))) {
        return null;
    }

    try {
        renderTemplate(eventKey, data);
    } catch (error) {
        if (throwOnError) {
            throw error;
        }
        console.error("[Email] Template render validation failed:", error.message);
        return null;
    }

    if (dedupeKey) {
        const existing = await EmailNotificationLog.findOne({ dedupeKey });
        if (existing) {
            return existing;
        }
    }

    const log = await createEmailLog({
        eventKey,
        recipient: normalizedRecipient,
        payload: data,
        dedupeKey:
            dedupeKey ||
            `${eventKey}:${normalizedRecipient}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
        relatedEntity,
        relatedEntityModel,
        category,
        scheduleFor,
    });

    if (scheduleFor.getTime() > Date.now()) {
        return log;
    }

    try {
        return await executeEmailSend(log);
    } catch (error) {
        await markLogFailure(log, error);
        if (throwOnError) {
            throw error;
        }
        return log;
    }
};

const sendAdminTemplatedEmail = async ({
    eventKey,
    data = {},
    dedupeKey,
    relatedEntity = null,
    relatedEntityModel = "",
    scheduleFor = new Date(),
    category = "system",
    throwOnError = false,
}) => {
    const recipients = await resolveAdminAlertRecipients();
    const results = [];

    for (const recipient of recipients) {
        const scopedDedupeKey = dedupeKey ? `${dedupeKey}:${recipient}` : undefined;
        const result = await sendTemplatedEmail({
            eventKey,
            recipient,
            data,
            dedupeKey: scopedDedupeKey,
            relatedEntity,
            relatedEntityModel,
            scheduleFor,
            category,
            throwOnError,
        });
        if (result) {
            results.push(result);
        }
    }

    return results;
};

const processDueEmailNotifications = async () => {
    const candidates = await EmailNotificationLog.find({
        status: { $in: ["pending", "failed"] },
        scheduledTime: { $lte: new Date() },
        attempts: { $lt: 3 },
    })
        .sort({ scheduledTime: 1, createdAt: 1 })
        .limit(100);

    const processed = [];

    for (const log of candidates) {
        if (!(await shouldSendForCategory(log.category))) {
            log.status = "skipped";
            log.lastError = "Skipped because notification category is disabled";
            log.lastAttemptAt = new Date();
            await log.save();
            processed.push(log);
            continue;
        }

        try {
            const sentLog = await executeEmailSend(log);
            processed.push(sentLog);
        } catch (error) {
            const failedLog = await markLogFailure(log, error);
            processed.push(failedLog);
        }
    }

    return processed;
};

module.exports = {
    executeEmailSend,
    getSystemSettings,
    processDueEmailNotifications,
    renderTemplate,
    resolveAdminAlertRecipients,
    sendAdminTemplatedEmail,
    sendTemplatedEmail,
    shouldSendForCategory,
};
