const mongoose = require('mongoose');

const messageSchema = mongoose.Schema(
    {
        conversationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Conversation",
            default: null,
            index: true,
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', // Can be Patient (User) or Doctor (User)
            required: true,
        },
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        content: {
            type: String,
            default: "",
        },
        normalizedContent: {
            type: String,
            default: "",
        },
        encrypted: {
            type: Boolean,
            default: false,
        },
        encryption: {
            version: {
                type: Number,
                default: 0,
            },
            algorithm: {
                type: String,
                default: "",
            },
        },
        clientMessageId: {
            type: String,
            default: "",
        },
        status: {
            type: String,
            enum: ["sent", "delivered", "read"],
            default: "sent",
        },
        read: {
            type: Boolean,
            default: false,
        },
        edited: {
            type: Boolean,
            default: false,
        },
        editedAt: {
            type: Date,
            default: null,
        },
        deleted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ conversationId: 1, status: 1 });
messageSchema.index(
    { sender: 1, clientMessageId: 1 },
    {
        unique: true,
        partialFilterExpression: {
            clientMessageId: { $type: "string", $gt: "" },
        },
    }
);
messageSchema.index({ normalizedContent: "text" });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
