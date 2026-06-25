const cron = require("node-cron");
const OnlineConsultation = require("../models/OnlineConsultation");
const {
    createDoctorNotification,
    createPatientNotification,
} = require("./notifications");
const { emitToUsers } = require("../socket");

let schedulerStarted = false;

const consultationPopulateProjection = [
    {
        path: "doctor",
        select: "fullName specialization user",
        populate: { path: "user", select: "name email" },
    },
    {
        path: "patient",
        select: "fullName user_id",
        populate: { path: "user_id", select: "name email" },
    },
];

const mapConsultationForEvent = (consultation) => ({
    id: consultation._id,
    status: consultation.status,
    paymentStatus: consultation.paymentStatus,
    meeting: {
        platform: consultation.meetingPlatform || "jitsi",
        provider: consultation.meetingProvider || "",
        scheduledStartAt: consultation.meetingScheduledStartAt || null,
        joinOpensAt: consultation.meetingJoinOpensAt || null,
        joinClosesAt: consultation.meetingJoinClosesAt || null,
        roomReady: Boolean(consultation.jitsiRoomName || consultation.meetingLink),
    },
});

const notifyOpenConsultationWindows = async () => {
    const now = new Date();
    const consultations = await OnlineConsultation.find({
        status: "scheduled",
        paymentStatus: "paid",
        meetingJoinOpensAt: { $lte: now },
        meetingJoinClosesAt: { $gt: now },
        meetingWindowNotificationSentAt: null,
    })
        .populate(consultationPopulateProjection)
        .limit(50);

    for (const consultation of consultations) {
        consultation.meetingWindowNotificationSentAt = now;
        await consultation.save();

        const patientUserId = consultation.patient?.user_id?._id || consultation.patient?.user_id;
        const doctorUserId = consultation.doctor?.user?._id || consultation.doctor?.user;
        const doctorName =
            consultation.doctorNameSnapshot ||
            consultation.doctor?.fullName ||
            consultation.doctor?.user?.name ||
            "your doctor";
        const patientName =
            consultation.patientNameSnapshot ||
            consultation.patient?.fullName ||
            consultation.patient?.user_id?.name ||
            "your patient";

        await createPatientNotification({
            patientUserId,
            type: "CONSULTATION_UPDATE",
            title: "Join now available",
            message: `Your virtual consultation with ${doctorName} is open now.`,
            link: `/virtual-consultation/status/${consultation._id}`,
        });

        await createDoctorNotification({
            doctorUserId,
            type: "CONSULTATION_UPDATE",
            title: "Virtual consultation is open",
            message: `${patientName}'s virtual consultation can be joined now.`,
            link: "/doctor/schedule",
        });

        emitToUsers(
            [patientUserId, doctorUserId],
            "consultation:updated",
            mapConsultationForEvent(consultation)
        );
    }
};

const startConsultationMeetingScheduler = () => {
    if (schedulerStarted) return;
    schedulerStarted = true;

    cron.schedule("* * * * *", () => {
        notifyOpenConsultationWindows().catch((error) => {
            console.error("[ConsultationScheduler] Failed to process join windows:", error.message);
        });
    });
};

module.exports = {
    notifyOpenConsultationWindows,
    startConsultationMeetingScheduler,
};
