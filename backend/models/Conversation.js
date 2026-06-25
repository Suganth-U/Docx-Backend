const mongoose = require("mongoose");

const conversationSchema = mongoose.Schema(
    {
        patientUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        doctorUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
        ],
        lastMessage: {
            type: String,
            default: "",
        },
        lastMessageSender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        lastMessageAt: {
            type: Date,
            default: null,
        },
        unreadCounts: {
            patient: {
                type: Number,
                default: 0,
            },
            doctor: {
                type: Number,
                default: 0,
            },
        },
    },
    {
        timestamps: true,
    }
);

conversationSchema.index({ patientUser: 1, doctorUser: 1 }, { unique: true });
conversationSchema.index({ participants: 1, lastMessageAt: -1 });
conversationSchema.index({ lastMessageAt: -1 });

const Conversation = mongoose.model("Conversation", conversationSchema);

module.exports = Conversation;
