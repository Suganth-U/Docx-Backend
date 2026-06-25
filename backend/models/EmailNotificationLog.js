const mongoose = require("mongoose");

const emailNotificationLogSchema = new mongoose.Schema(
    {
        eventKey: { type: String, required: true, index: true },
        recipient: { type: String, required: true, trim: true, lowercase: true },
        category: {
            type: String,
            enum: ["transactional", "security", "reminder", "lowStock", "system"],
            default: "transactional",
            index: true,
        },
        relatedEntity: { type: mongoose.Schema.Types.ObjectId, default: null },
        relatedEntityModel: { type: String, default: "" },
        dedupeKey: { type: String, required: true, unique: true },
        status: {
            type: String,
            enum: ["pending", "sent", "failed", "skipped"],
            default: "pending",
            index: true,
        },
        provider: { type: String, default: "brevo-smtp" },
        payload: { type: mongoose.Schema.Types.Mixed, default: {} },
        attempts: { type: Number, default: 0 },
        lastError: { type: String, default: "" },
        scheduledTime: { type: Date, required: true, index: true },
        sentTime: { type: Date, default: null },
        lastAttemptAt: { type: Date, default: null },
        messageId: { type: String, default: "" },
    },
    {
        timestamps: true,
    }
);

emailNotificationLogSchema.index({ status: 1, scheduledTime: 1, attempts: 1 });
emailNotificationLogSchema.index({ relatedEntityModel: 1, relatedEntity: 1, eventKey: 1 });

module.exports = mongoose.model("EmailNotificationLog", emailNotificationLogSchema);
