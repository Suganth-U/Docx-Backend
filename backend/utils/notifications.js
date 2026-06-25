const Notification = require("../models/Notification");
const User = require("../models/User");
const { emitToUsers } = require("../socket");

const ADMIN_NOTIFICATION_QUERY = {
    $or: [
        { recipientRole: "admin" },
        { recipientRole: { $exists: false } },
        { recipientRole: null },
    ],
};

const buildDoctorNotificationQuery = (doctorUserId) => ({
    recipientRole: "doctor",
    recipientUser: doctorUserId,
});

const buildPatientNotificationQuery = (patientUserId) => ({
    recipientRole: "patient",
    recipientUser: patientUserId,
});

const emitNotificationToUsers = (userIds, notification) => {
    if (!notification) return;

    const payload =
        typeof notification.toObject === "function"
            ? notification.toObject()
            : notification;

    emitToUsers(userIds, "notification:new", payload);
};

const createAdminNotification = async ({
    type = "SYSTEM_ALERT",
    title,
    message,
    link,
}) => {
    try {
        const notification = await Notification.create({
            type,
            title,
            message,
            link,
            recipientRole: "admin",
        });

        const admins = await User.find({ role: "admin" }).select("_id").lean();
        emitNotificationToUsers(admins.map((adminUser) => adminUser._id), notification);
    } catch (error) {
        console.error("Failed to create admin notification", error.message);
    }
};

const createDoctorNotification = async ({
    doctorUserId,
    type = "SYSTEM_ALERT",
    title,
    message,
    link,
}) => {
    if (!doctorUserId) return;

    try {
        const notification = await Notification.create({
            type,
            title,
            message,
            link,
            recipientRole: "doctor",
            recipientUser: doctorUserId,
        });
        emitNotificationToUsers([doctorUserId], notification);
    } catch (error) {
        console.error("Failed to create doctor notification", error.message);
    }
};

const createPatientNotification = async ({
    patientUserId,
    type = "SYSTEM_ALERT",
    title,
    message,
    link,
}) => {
    if (!patientUserId) return;

    try {
        const notification = await Notification.create({
            type,
            title,
            message,
            link,
            recipientRole: "patient",
            recipientUser: patientUserId,
        });
        emitNotificationToUsers([patientUserId], notification);
    } catch (error) {
        console.error("Failed to create patient notification", error.message);
    }
};

const createDoctorNotifications = async ({
    doctorUserIds = [],
    type = "SYSTEM_ALERT",
    title,
    message,
    link,
}) => {
    const uniqueDoctorUserIds = [...new Set(
        doctorUserIds
            .map((id) => String(id || "").trim())
            .filter(Boolean)
    )];

    if (uniqueDoctorUserIds.length === 0) return;

    try {
        const notifications = await Notification.insertMany(
            uniqueDoctorUserIds.map((doctorUserId) => ({
                type,
                title,
                message,
                link,
                recipientRole: "doctor",
                recipientUser: doctorUserId,
            }))
        );

        notifications.forEach((notification) => {
            emitNotificationToUsers([notification.recipientUser], notification);
        });
    } catch (error) {
        console.error("Failed to create doctor notifications", error.message);
    }
};

module.exports = {
    ADMIN_NOTIFICATION_QUERY,
    buildDoctorNotificationQuery,
    buildPatientNotificationQuery,
    createAdminNotification,
    createDoctorNotification,
    createDoctorNotifications,
    createPatientNotification,
};
