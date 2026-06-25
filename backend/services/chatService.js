const Appointment = require("../models/Appointment");
const Conversation = require("../models/Conversation");
const Doctor = require("../models/Doctor");
const Message = require("../models/Message");
const Patient = require("../models/Patient");
const User = require("../models/User");
const { emitToUsers, isUserOnline } = require("../socket");

const toIdString = (value) => String(value?._id || value || "");

const uniqueIds = (values = []) =>
    Array.from(
        new Set(
            values
                .map((value) => toIdString(value))
                .filter(Boolean)
        )
    );

const normalizeMessageContent = (value = "") =>
    String(value || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

const escapeRegex = (value = "") =>
    String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const ENCRYPTED_MESSAGE_TYPE = "docx.e2ee.message";
const ENCRYPTED_MESSAGE_ALGORITHM = "AES-GCM-256";

const parseEncryptedMessagePayload = (value = "") => {
    try {
        const payload = JSON.parse(String(value || ""));

        if (
            payload?.v === 1 &&
            payload?.type === ENCRYPTED_MESSAGE_TYPE &&
            payload?.alg === ENCRYPTED_MESSAGE_ALGORITHM &&
            typeof payload?.iv === "string" &&
            typeof payload?.ciphertext === "string" &&
            payload?.keys &&
            typeof payload.keys === "object" &&
            !Array.isArray(payload.keys)
        ) {
            return payload;
        }
    } catch {
        return null;
    }

    return null;
};

const isEncryptedMessageContent = (value = "") => Boolean(parseEncryptedMessagePayload(value));

const createHttpError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const getRoleKeyForConversationUser = (conversation, userId) => {
    const normalizedUserId = toIdString(userId);
    return normalizedUserId === toIdString(conversation.patientUser) ? "patient" : "doctor";
};

const createConversationEventPayload = (conversation) => ({
    conversationId: toIdString(conversation._id),
    lastMessage: conversation.lastMessage || "",
    lastMessageAt: conversation.lastMessageAt || null,
    lastMessageSenderId: toIdString(conversation.lastMessageSender),
    unreadCounts: {
        patient: Number(conversation.unreadCounts?.patient || 0),
        doctor: Number(conversation.unreadCounts?.doctor || 0),
    },
});

const getMessagingProfilesForUsers = async (userIds = []) => {
    const normalizedUserIds = uniqueIds(userIds);

    if (!normalizedUserIds.length) {
        return {
            doctorMap: new Map(),
            patientMap: new Map(),
            userMap: new Map(),
        };
    }

    const [users, doctors, patients] = await Promise.all([
        User.find({ _id: { $in: normalizedUserIds } }).select("_id name email role"),
        Doctor.find({ user: { $in: normalizedUserIds } }).select("user fullName specialization"),
        Patient.find({ user_id: { $in: normalizedUserIds } }).select("user_id fullName"),
    ]);

    return {
        userMap: new Map(users.map((user) => [toIdString(user._id), user])),
        doctorMap: new Map(doctors.map((doctor) => [toIdString(doctor.user), doctor])),
        patientMap: new Map(patients.map((patient) => [toIdString(patient.user_id), patient])),
    };
};

const buildParticipantPayload = ({ viewerId, conversation, doctorMap, patientMap, userMap }) => {
    const normalizedViewerId = toIdString(viewerId);
    const participantUserId =
        normalizedViewerId === toIdString(conversation.patientUser)
            ? toIdString(conversation.doctorUser)
            : toIdString(conversation.patientUser);

    const participantUser = userMap.get(participantUserId);
    const doctorProfile = doctorMap.get(participantUserId);
    const patientProfile = patientMap.get(participantUserId);
    const participantRole = participantUser?.role || (doctorProfile ? "doctor" : "patient");
    const participantName =
        doctorProfile?.fullName ||
        patientProfile?.fullName ||
        participantUser?.name ||
        "DocX contact";

    return {
        _id: participantUserId,
        name: participantName,
        role: participantRole,
        specialization: doctorProfile?.specialization || "",
        online: isUserOnline(participantUserId),
    };
};

const hydrateConversationSummaries = async (conversations = [], viewerId) => {
    const normalizedViewerId = toIdString(viewerId);
    const { doctorMap, patientMap, userMap } = await getMessagingProfilesForUsers(
        conversations.flatMap((conversation) => [conversation.patientUser, conversation.doctorUser])
    );

    return conversations.map((conversation) => {
        const participant = buildParticipantPayload({
            viewerId: normalizedViewerId,
            conversation,
            doctorMap,
            patientMap,
            userMap,
        });

        return {
            _id: toIdString(conversation._id),
            participant,
            lastMessage: conversation.lastMessage || "",
            lastMessageAt: conversation.lastMessageAt || null,
            lastMessageSenderId: toIdString(conversation.lastMessageSender),
            unreadCount:
                normalizedViewerId === toIdString(conversation.patientUser)
                    ? Number(conversation.unreadCounts?.patient || 0)
                    : Number(conversation.unreadCounts?.doctor || 0),
            unreadCounts: {
                patient: Number(conversation.unreadCounts?.patient || 0),
                doctor: Number(conversation.unreadCounts?.doctor || 0),
            },
            hasMessages: Boolean(conversation.lastMessageAt),
        };
    });
};

const resolveConversationParticipantPair = async ({ requesterUser, participantUserId }) => {
    const participantUser = await User.findById(participantUserId).select("_id role name");

    if (!participantUser) {
        throw createHttpError("Conversation participant not found", 404);
    }

    if (toIdString(participantUser._id) === toIdString(requesterUser._id)) {
        throw createHttpError("You cannot message yourself", 400);
    }

    if (requesterUser.role === "admin" || participantUser.role === "admin") {
        throw createHttpError("Admin messaging is not available in this workspace", 403);
    }

    if (requesterUser.role === participantUser.role) {
        throw createHttpError("Only patient-to-doctor conversations are supported", 403);
    }

    return requesterUser.role === "patient"
        ? {
              patientUserId: toIdString(requesterUser._id),
              doctorUserId: toIdString(participantUser._id),
              participantUser,
          }
        : {
              patientUserId: toIdString(participantUser._id),
              doctorUserId: toIdString(requesterUser._id),
              participantUser,
          };
};

const ensureConversationForPair = async ({ patientUserId, doctorUserId }) => {
    const conversation = await Conversation.findOneAndUpdate(
        {
            patientUser: patientUserId,
            doctorUser: doctorUserId,
        },
        {
            $setOnInsert: {
                participants: [patientUserId, doctorUserId],
                unreadCounts: {
                    patient: 0,
                    doctor: 0,
                },
            },
        },
        {
            new: true,
            upsert: true,
        }
    );

    return conversation;
};

const hasAppointmentRelationship = async ({ patientUserId, doctorUserId }) => {
    const [patientProfile, doctorProfile] = await Promise.all([
        Patient.findOne({ user_id: patientUserId }).select("_id"),
        Doctor.findOne({ user: doctorUserId }).select("_id"),
    ]);

    if (!patientProfile || !doctorProfile) {
        return false;
    }

    return Boolean(
        await Appointment.exists({
            patient_id: patientProfile._id,
            doctor_id: doctorProfile._id,
        })
    );
};

const syncAppointmentConversationsForUser = async (user) => {
    if (!user || !["patient", "doctor"].includes(user.role)) {
        return [];
    }

    if (user.role === "patient") {
        const patientProfile = await Patient.findOne({ user_id: user._id }).select("_id");

        if (!patientProfile) {
            return [];
        }

        const appointments = await Appointment.find({ patient_id: patientProfile._id })
            .populate({
                path: "doctor_id",
                select: "user",
            })
            .select("doctor_id");

        const doctorUserIds = uniqueIds(
            appointments.map((appointment) => appointment.doctor_id?.user)
        );

        return Promise.all(
            doctorUserIds.map((doctorUserId) =>
                ensureConversationForPair({
                    patientUserId: toIdString(user._id),
                    doctorUserId,
                })
            )
        );
    }

    const doctorProfile = await Doctor.findOne({ user: user._id }).select("_id");

    if (!doctorProfile) {
        return [];
    }

    const appointments = await Appointment.find({ doctor_id: doctorProfile._id })
        .populate({
            path: "patient_id",
            select: "user_id",
        })
        .select("patient_id");

    const patientUserIds = uniqueIds(
        appointments.map((appointment) => appointment.patient_id?.user_id)
    );

    return Promise.all(
        patientUserIds.map((patientUserId) =>
            ensureConversationForPair({
                patientUserId,
                doctorUserId: toIdString(user._id),
            })
        )
    );
};

const listConversationsForUser = async (user, { query = "" } = {}) => {
    await syncAppointmentConversationsForUser(user);

    const conversations = await Conversation.find({
        participants: toIdString(user._id),
    }).sort({ lastMessageAt: -1, updatedAt: -1 });

    const summaries = await hydrateConversationSummaries(conversations, user._id);
    const normalizedQuery = normalizeMessageContent(query);

    if (!normalizedQuery) {
        return summaries;
    }

    return summaries.filter((summary) => {
        const haystack = normalizeMessageContent(
            `${summary.participant.name} ${summary.participant.specialization}`
        );
        return haystack.includes(normalizedQuery);
    });
};

const getConversationForUser = async ({ conversationId, userId }) => {
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
        throw createHttpError("Conversation not found", 404);
    }

    if (!conversation.participants.some((participantId) => toIdString(participantId) === toIdString(userId))) {
        throw createHttpError("You do not have access to this conversation", 403);
    }

    return conversation;
};

const openConversationForUser = async ({ requesterUser, participantUserId }) => {
    const { patientUserId, doctorUserId } = await resolveConversationParticipantPair({
        requesterUser,
        participantUserId,
    });

    let conversation = await Conversation.findOne({
        patientUser: patientUserId,
        doctorUser: doctorUserId,
    });

    if (!conversation) {
        const linked = await hasAppointmentRelationship({
            patientUserId,
            doctorUserId,
        });

        if (!linked) {
            throw createHttpError(
                "Conversations are limited to patients and doctors with appointments together",
                403
            );
        }

        conversation = await ensureConversationForPair({
            patientUserId,
            doctorUserId,
        });
    }

    return conversation;
};

const recalculateConversationState = async (conversationId) => {
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
        return null;
    }

    const [latestMessage, unreadPatientCount, unreadDoctorCount] = await Promise.all([
        Message.findOne({ conversationId }).sort({ createdAt: -1 }),
        Message.countDocuments({
            conversationId,
            recipient: conversation.patientUser,
            status: { $ne: "read" },
        }),
        Message.countDocuments({
            conversationId,
            recipient: conversation.doctorUser,
            status: { $ne: "read" },
        }),
    ]);

    conversation.lastMessage = latestMessage && !latestMessage.deleted ? latestMessage.content || "" : "";
    conversation.lastMessageAt = latestMessage?.createdAt || null;
    conversation.lastMessageSender = latestMessage?.sender || null;
    conversation.unreadCounts = {
        patient: unreadPatientCount,
        doctor: unreadDoctorCount,
    };

    await conversation.save();
    return conversation;
};

const markConversationAsRead = async ({ conversation, readerUserId }) => {
    const normalizedReaderId = toIdString(readerUserId);
    const unreadMessages = await Message.find({
        conversationId: conversation._id,
        recipient: normalizedReaderId,
        status: { $ne: "read" },
    }).select("_id");

    if (!unreadMessages.length) {
        return {
            conversation,
            messageIds: [],
        };
    }

    const messageIds = unreadMessages.map((message) => toIdString(message._id));

    await Message.updateMany(
        {
            _id: { $in: messageIds },
        },
        {
            $set: {
                status: "read",
                read: true,
            },
        }
    );

    await Conversation.updateOne(
        { _id: conversation._id },
        {
            $set: {
                [`unreadCounts.${getRoleKeyForConversationUser(conversation, normalizedReaderId)}`]: 0,
            },
        }
    );

    const refreshedConversation = await recalculateConversationState(conversation._id);

    emitToUsers(
        [conversation.patientUser, conversation.doctorUser],
        "conversation:updated",
        createConversationEventPayload(refreshedConversation)
    );
    emitToUsers(
        [conversation.patientUser, conversation.doctorUser],
        "conversation:read",
        {
            conversationId: toIdString(conversation._id),
            readerUserId: normalizedReaderId,
            messageIds,
        }
    );

    return {
        conversation: refreshedConversation,
        messageIds,
    };
};

const sendConversationMessage = async ({
    conversation,
    senderUser,
    content,
    clientMessageId = "",
}) => {
    const trimmedContent = String(content || "").trim();

    if (!trimmedContent) {
        throw createHttpError("Message content is required", 400);
    }

    if (!isEncryptedMessageContent(trimmedContent)) {
        throw createHttpError("Messages must be end-to-end encrypted before sending", 400);
    }

    const senderUserId = toIdString(senderUser._id);
    const recipientUserId =
        senderUserId === toIdString(conversation.patientUser)
            ? toIdString(conversation.doctorUser)
            : toIdString(conversation.patientUser);

    if (clientMessageId) {
        const existingMessage = await Message.findOne({
            sender: senderUserId,
            clientMessageId,
        })
            .populate("sender", "name role")
            .populate("recipient", "name role");

        if (existingMessage) {
            return {
                conversation,
                message: existingMessage,
                duplicate: true,
            };
        }
    }

    const nextStatus = isUserOnline(recipientUserId) ? "delivered" : "sent";
    const message = await Message.create({
        conversationId: conversation._id,
        sender: senderUserId,
        recipient: recipientUserId,
        content: trimmedContent,
        normalizedContent: "",
        encrypted: true,
        encryption: {
            version: 1,
            algorithm: ENCRYPTED_MESSAGE_ALGORITHM,
        },
        clientMessageId,
        status: nextStatus,
        read: nextStatus === "read",
    });

    await Conversation.updateOne(
        { _id: conversation._id },
        {
            $set: {
                lastMessage: trimmedContent,
                lastMessageAt: message.createdAt,
                lastMessageSender: senderUserId,
            },
            $inc: {
                [`unreadCounts.${getRoleKeyForConversationUser(conversation, recipientUserId)}`]: 1,
            },
        }
    );

    const [hydratedMessage, refreshedConversation] = await Promise.all([
        Message.findById(message._id)
            .populate("sender", "name role")
            .populate("recipient", "name role"),
        recalculateConversationState(conversation._id),
    ]);

    const eventPayload = createConversationEventPayload(refreshedConversation);

    emitToUsers([recipientUserId], "message:new", {
        conversationId: toIdString(conversation._id),
        message: hydratedMessage,
    });
    emitToUsers([senderUserId], "message:ack", {
        conversationId: toIdString(conversation._id),
        clientMessageId,
        message: hydratedMessage,
    });
    emitToUsers([conversation.patientUser, conversation.doctorUser], "conversation:updated", eventPayload);

    return {
        conversation: refreshedConversation,
        message: hydratedMessage,
        duplicate: false,
    };
};

const searchConversationsForUser = async ({ user, query }) => {
    const normalizedQuery = normalizeMessageContent(query);

    if (normalizedQuery.length < 2) {
        return {
            conversations: [],
            messages: [],
            doctors: [],
        };
    }

    const conversations = await listConversationsForUser(user);
    const matchingConversations = conversations
        .filter((conversation) => {
            const haystack = normalizeMessageContent(
                `${conversation.participant.name} ${conversation.participant.specialization}`
            );

            return haystack.includes(normalizedQuery);
        })
        .slice(0, 12);

    let matchingDoctors = [];
    if (user.role === "patient") {
        const users = await User.find({ role: "doctor", name: { $regex: escapeRegex(normalizedQuery), $options: "i" } }).select('_id name');
        const userIds = users.map(u => u._id);
        const doctors = await Doctor.find({ user: { $in: userIds } }).populate("user", "name role");
        
        const existingParticipantIds = new Set(
            conversations.map(c => toIdString(c.participant._id))
        );

        matchingDoctors = doctors
            .filter(doc => doc.user && !existingParticipantIds.has(toIdString(doc.user._id)))
            .map(doc => ({
                _id: toIdString(doc.user._id),
                participant: {
                    _id: toIdString(doc.user._id),
                    name: doc.user.name,
                    role: "doctor",
                    specialization: doc.specialization,
                    online: isUserOnline(doc.user._id),
                }
            }));
    }

    return {
        conversations: matchingConversations,
        messages: [],
        doctors: matchingDoctors,
    };
};

const editConversationMessage = async ({
    conversation,
    messageId,
    senderUserId,
    newContent,
}) => {
    const trimmedContent = String(newContent || "").trim();

    if (!trimmedContent) {
        throw createHttpError("Message content is required", 400);
    }

    if (!isEncryptedMessageContent(trimmedContent)) {
        throw createHttpError("Messages must be end-to-end encrypted before saving", 400);
    }

    const message = await Message.findOne({
        _id: messageId,
        conversationId: conversation._id,
    });

    if (!message) {
        throw createHttpError("Message not found", 404);
    }

    if (toIdString(message.sender) !== toIdString(senderUserId)) {
        throw createHttpError("You can only edit your own messages", 403);
    }

    if (message.deleted) {
        throw createHttpError("Cannot edit a deleted message", 400);
    }

    message.content = trimmedContent;
    message.normalizedContent = "";
    message.encrypted = true;
    message.encryption = {
        version: 1,
        algorithm: ENCRYPTED_MESSAGE_ALGORITHM,
    };
    message.edited = true;
    message.editedAt = new Date();
    await message.save();

    const hydratedMessage = await Message.findById(message._id)
        .populate("sender", "name role")
        .populate("recipient", "name role");

    emitToUsers(
        [conversation.patientUser, conversation.doctorUser],
        "message:edited",
        {
            conversationId: toIdString(conversation._id),
            message: hydratedMessage,
        }
    );

    const latestMessage = await Message.findOne({ conversationId: conversation._id })
        .sort({ createdAt: -1 });

    if (latestMessage && toIdString(latestMessage._id) === toIdString(message._id)) {
        await Conversation.updateOne(
            { _id: conversation._id },
            { $set: { lastMessage: trimmedContent } }
        );

        const refreshedConversation = await recalculateConversationState(conversation._id);
        emitToUsers(
            [conversation.patientUser, conversation.doctorUser],
            "conversation:updated",
            createConversationEventPayload(refreshedConversation)
        );
    }

    return {
        conversation,
        message: hydratedMessage,
    };
};

const deleteConversationMessage = async ({
    conversation,
    messageId,
    senderUserId,
}) => {
    const message = await Message.findOne({
        _id: messageId,
        conversationId: conversation._id,
    });

    if (!message) {
        throw createHttpError("Message not found", 404);
    }

    if (toIdString(message.sender) !== toIdString(senderUserId)) {
        throw createHttpError("You can only delete your own messages", 403);
    }

    if (message.deleted) {
        throw createHttpError("Message is already deleted", 400);
    }

    message.content = "";
    message.normalizedContent = "";
    message.encrypted = false;
    message.encryption = {
        version: 0,
        algorithm: "",
    };
    message.deleted = true;
    message.edited = false;
    await message.save();

    const hydratedMessage = await Message.findById(message._id)
        .populate("sender", "name role")
        .populate("recipient", "name role");

    emitToUsers(
        [conversation.patientUser, conversation.doctorUser],
        "message:deleted",
        {
            conversationId: toIdString(conversation._id),
            message: hydratedMessage,
        }
    );

    const refreshedConversation = await recalculateConversationState(conversation._id);
    emitToUsers(
        [conversation.patientUser, conversation.doctorUser],
        "conversation:updated",
        createConversationEventPayload(refreshedConversation)
    );

    return {
        conversation: refreshedConversation,
        message: hydratedMessage,
    };
};

module.exports = {
    createConversationEventPayload,
    createHttpError,
    deleteConversationMessage,
    editConversationMessage,
    ensureConversationForPair,
    getConversationForUser,
    hydrateConversationSummaries,
    isEncryptedMessageContent,
    listConversationsForUser,
    markConversationAsRead,
    normalizeMessageContent,
    parseEncryptedMessagePayload,
    openConversationForUser,
    recalculateConversationState,
    searchConversationsForUser,
    sendConversationMessage,
    syncAppointmentConversationsForUser,
};
