const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");
const connectDB = require("../config/db");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const {
    ensureConversationForPair,
    normalizeMessageContent,
    recalculateConversationState,
} = require("../services/chatService");

const toIdString = (value) => String(value?._id || value || "");

const backfillLegacyMessagesToConversations = async () => {
    const legacyMessages = await Message.find({
        conversationId: null,
    }).select("_id sender recipient content read status clientMessageId normalizedContent createdAt");

    if (!legacyMessages.length) {
        return {
            touchedConversationIds: [],
            updatedMessages: 0,
        };
    }

    const userIds = Array.from(
        new Set(
            legacyMessages.flatMap((message) => [toIdString(message.sender), toIdString(message.recipient)])
        )
    );

    const users = await User.find({ _id: { $in: userIds } }).select("_id role");
    const userMap = new Map(users.map((user) => [toIdString(user._id), user]));
    const touchedConversationIds = new Set();
    let updatedMessages = 0;

    for (const message of legacyMessages) {
        const senderUser = userMap.get(toIdString(message.sender));
        const recipientUser = userMap.get(toIdString(message.recipient));

        if (!senderUser || !recipientUser) {
            continue;
        }

        if (
            senderUser.role === recipientUser.role ||
            senderUser.role === "admin" ||
            recipientUser.role === "admin"
        ) {
            continue;
        }

        const patientUserId =
            senderUser.role === "patient"
                ? toIdString(senderUser._id)
                : toIdString(recipientUser._id);
        const doctorUserId =
            senderUser.role === "doctor"
                ? toIdString(senderUser._id)
                : toIdString(recipientUser._id);

        const conversation = await ensureConversationForPair({
            patientUserId,
            doctorUserId,
        });

        message.conversationId = conversation._id;
        message.normalizedContent =
            message.normalizedContent || normalizeMessageContent(message.content);
        message.status = message.status || (message.read ? "read" : "sent");
        message.read = message.status === "read" || Boolean(message.read);

        await message.save();
        touchedConversationIds.add(toIdString(conversation._id));
        updatedMessages += 1;
    }

    for (const conversationId of touchedConversationIds) {
        await recalculateConversationState(conversationId);
    }

    return {
        touchedConversationIds: Array.from(touchedConversationIds),
        updatedMessages,
    };
};

if (require.main === module) {
    dotenv.config({ path: path.resolve(__dirname, "../../.env") });

    (async () => {
        try {
            await connectDB();
            const result = await backfillLegacyMessagesToConversations();
            console.log(
                `Backfilled ${result.updatedMessages} messages across ${result.touchedConversationIds.length} conversations.`
            );
            await mongoose.disconnect();
            process.exit(0);
        } catch (error) {
            console.error(`Chat backfill failed: ${error.message}`);
            await mongoose.disconnect();
            process.exit(1);
        }
    })();
}

module.exports = {
    backfillLegacyMessagesToConversations,
};
