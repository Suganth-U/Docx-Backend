const asyncHandler = require("express-async-handler");
const Message = require("../models/Message");
const User = require("../models/User");
const {
    deleteConversationMessage,
    editConversationMessage,
    getConversationForUser,
    hydrateConversationSummaries,
    listConversationsForUser,
    markConversationAsRead,
    openConversationForUser,
    searchConversationsForUser,
    sendConversationMessage,
} = require("../services/chatService");

const isValidPublicKeyJwk = (value) =>
    Boolean(
        value &&
            typeof value === "object" &&
            !Array.isArray(value) &&
            value.kty === "RSA" &&
            typeof value.n === "string" &&
            typeof value.e === "string"
    );

const bubbleChatError = (res, error) => {
    if (error?.statusCode) {
        res.status(error.statusCode);
        throw error;
    }

    res.status(500);
    throw error;
};

const listConversations = asyncHandler(async (req, res) => {
    try {
        const conversations = await listConversationsForUser(req.user, {
            query: req.query.query || "",
        });

        res.json({
            conversations,
            nextCursor: null,
        });
    } catch (error) {
        bubbleChatError(res, error);
    }
});

const openConversation = asyncHandler(async (req, res) => {
    try {
        const { participantUserId } = req.body;

        if (!participantUserId) {
            res.status(400);
            throw new Error("participantUserId is required");
        }

        const conversation = await openConversationForUser({
            requesterUser: req.user,
            participantUserId,
        });
        const [summary] = await hydrateConversationSummaries([conversation], req.user._id);

        res.status(201).json({
            conversation: summary,
        });
    } catch (error) {
        bubbleChatError(res, error);
    }
});

const getEncryptionKey = asyncHandler(async (req, res) => {
    res.json({
        publicKey: req.user.encryption?.publicKey || null,
        publicKeyAlgorithm: req.user.encryption?.publicKeyAlgorithm || "",
        publicKeyUpdatedAt: req.user.encryption?.publicKeyUpdatedAt || null,
    });
});

const setEncryptionKey = asyncHandler(async (req, res) => {
    const { publicKey, publicKeyAlgorithm = "RSA-OAEP-256" } = req.body || {};

    if (!isValidPublicKeyJwk(publicKey)) {
        res.status(400);
        throw new Error("A valid RSA public key is required");
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                "encryption.publicKey": publicKey,
                "encryption.publicKeyAlgorithm": publicKeyAlgorithm,
                "encryption.publicKeyUpdatedAt": new Date(),
            },
        },
        {
            new: true,
            select: "encryption",
        }
    );

    res.json({
        publicKey: updatedUser.encryption?.publicKey || null,
        publicKeyAlgorithm: updatedUser.encryption?.publicKeyAlgorithm || "",
        publicKeyUpdatedAt: updatedUser.encryption?.publicKeyUpdatedAt || null,
    });
});

const getConversationEncryptionKeys = asyncHandler(async (req, res) => {
    try {
        const conversation = await getConversationForUser({
            conversationId: req.params.conversationId,
            userId: req.user._id,
        });

        const users = await User.find({
            _id: {
                $in: conversation.participants,
            },
        }).select("_id name role encryption.publicKey encryption.publicKeyAlgorithm encryption.publicKeyUpdatedAt");

        res.json({
            users: users.map((user) => ({
                _id: String(user._id),
                name: user.name,
                role: user.role,
                publicKey: user.encryption?.publicKey || null,
                publicKeyAlgorithm: user.encryption?.publicKeyAlgorithm || "",
                publicKeyUpdatedAt: user.encryption?.publicKeyUpdatedAt || null,
            })),
        });
    } catch (error) {
        bubbleChatError(res, error);
    }
});

const getConversationMessages = asyncHandler(async (req, res) => {
    try {
        const conversation = await getConversationForUser({
            conversationId: req.params.conversationId,
            userId: req.user._id,
        });

        const messages = await Message.find({
            conversationId: conversation._id,
        })
            .sort({ createdAt: 1 })
            .populate("sender", "name role")
            .populate("recipient", "name role");

        const [summary] = await hydrateConversationSummaries([conversation], req.user._id);

        res.json({
            conversation: summary,
            messages,
            nextCursor: null,
        });
    } catch (error) {
        bubbleChatError(res, error);
    }
});

const postConversationMessage = asyncHandler(async (req, res) => {
    try {
        const conversation = await getConversationForUser({
            conversationId: req.params.conversationId,
            userId: req.user._id,
        });
        const { content, clientMessageId = "" } = req.body;
        const result = await sendConversationMessage({
            conversation,
            senderUser: req.user,
            content,
            clientMessageId,
        });
        const [summary] = await hydrateConversationSummaries([result.conversation], req.user._id);

        res.status(result.duplicate ? 200 : 201).json({
            conversation: summary,
            message: result.message,
        });
    } catch (error) {
        bubbleChatError(res, error);
    }
});

const readConversation = asyncHandler(async (req, res) => {
    try {
        const conversation = await getConversationForUser({
            conversationId: req.params.conversationId,
            userId: req.user._id,
        });
        const result = await markConversationAsRead({
            conversation,
            readerUserId: req.user._id,
        });
        const [summary] = await hydrateConversationSummaries([result.conversation], req.user._id);

        res.json({
            conversation: summary,
            messageIds: result.messageIds,
        });
    } catch (error) {
        bubbleChatError(res, error);
    }
});

const searchMessages = asyncHandler(async (req, res) => {
    try {
        const query = String(req.query.query || "").trim();

        if (query.length < 2) {
            return res.json({
                conversations: [],
                messages: [],
            });
        }

        const result = await searchConversationsForUser({
            user: req.user,
            query,
        });

        res.json(result);
    } catch (error) {
        bubbleChatError(res, error);
    }
});

const getContacts = asyncHandler(async (req, res) => {
    try {
        const conversations = await listConversationsForUser(req.user);

        res.json(
            conversations.map((conversation) => ({
                _id: conversation.participant._id,
                name: conversation.participant.name,
                role: conversation.participant.role,
                specialization: conversation.participant.specialization,
                online: conversation.participant.online,
                lastMessageAt: conversation.lastMessageAt,
                unreadCount: conversation.unreadCount,
                conversationId: conversation._id,
            }))
        );
    } catch (error) {
        bubbleChatError(res, error);
    }
});

const getMessages = asyncHandler(async (req, res) => {
    try {
        const conversation = await openConversationForUser({
            requesterUser: req.user,
            participantUserId: req.params.otherUserId,
        });

        const messages = await Message.find({
            conversationId: conversation._id,
        })
            .sort({ createdAt: 1 })
            .populate("sender", "name role")
            .populate("recipient", "name role");

        res.json(messages);
    } catch (error) {
        if (error?.statusCode === 403 || error?.statusCode === 404) {
            return res.json([]);
        }

        bubbleChatError(res, error);
    }
});

const sendMessage = asyncHandler(async (req, res) => {
    try {
        const { recipientId, content, clientMessageId = "" } = req.body;

        if (!recipientId) {
            res.status(400);
            throw new Error("recipientId is required");
        }

        const conversation = await openConversationForUser({
            requesterUser: req.user,
            participantUserId: recipientId,
        });
        const result = await sendConversationMessage({
            conversation,
            senderUser: req.user,
            content,
            clientMessageId,
        });

        res.status(result.duplicate ? 200 : 201).json(result.message);
    } catch (error) {
        bubbleChatError(res, error);
    }
});

const editMessage = asyncHandler(async (req, res) => {
    try {
        const conversation = await getConversationForUser({
            conversationId: req.params.conversationId,
            userId: req.user._id,
        });
        const { content } = req.body;
        const result = await editConversationMessage({
            conversation,
            messageId: req.params.messageId,
            senderUserId: req.user._id,
            newContent: content,
        });

        res.json({
            message: result.message,
        });
    } catch (error) {
        bubbleChatError(res, error);
    }
});

const deleteMessage = asyncHandler(async (req, res) => {
    try {
        const conversation = await getConversationForUser({
            conversationId: req.params.conversationId,
            userId: req.user._id,
        });
        const result = await deleteConversationMessage({
            conversation,
            messageId: req.params.messageId,
            senderUserId: req.user._id,
        });

        res.json({
            message: result.message,
        });
    } catch (error) {
        bubbleChatError(res, error);
    }
});

module.exports = {
    deleteMessage,
    editMessage,
    getContacts,
    getConversationMessages,
    getConversationEncryptionKeys,
    getEncryptionKey,
    getMessages,
    listConversations,
    openConversation,
    postConversationMessage,
    readConversation,
    searchMessages,
    sendMessage,
    setEncryptionKey,
};
