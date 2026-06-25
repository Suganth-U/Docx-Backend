const cron = require("node-cron");
const Appointment = require("../../models/Appointment");
const OnlineConsultation = require("../../models/OnlineConsultation");
const Medicine = require("../../models/Medicine");
const {
    getSystemSettings,
    processDueEmailNotifications,
    sendAdminTemplatedEmail,
    sendTemplatedEmail,
} = require("./dispatcher");

const DEFAULT_TIMEZONE = "Asia/Colombo";

const parseTimeSlot = (value = "") => {
    const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})$/);

    if (!match) {
        return { hours: 0, minutes: 0 };
    }

    return {
        hours: Number(match[1]),
        minutes: Number(match[2]),
    };
};

const buildScheduledDate = (dateValue, timeSlot) => {
    const base = new Date(dateValue);

    if (Number.isNaN(base.getTime())) {
        return null;
    }

    const { hours, minutes } = parseTimeSlot(timeSlot);
    base.setHours(hours, minutes, 0, 0);
    return base;
};

const formatDate = (value, timeZone = DEFAULT_TIMEZONE) =>
    new Intl.DateTimeFormat("en-LK", {
        dateStyle: "medium",
        timeZone,
    }).format(new Date(value));

const formatDateTime = (value, timeZone = DEFAULT_TIMEZONE) =>
    new Intl.DateTimeFormat("en-LK", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone,
    }).format(new Date(value));

const buildReminderWindow = (hoursAhead) => {
    const now = new Date();
    const upper = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
    const lower = new Date(now);
    lower.setHours(0, 0, 0, 0);
    return { now, lower, upper };
};

const queueAppointmentReminders = async (settings) => {
    if (settings.appointmentReminders === false) {
        return [];
    }

    const leadHours = Number(settings.reminderHours || 24);
    const { now, lower, upper } = buildReminderWindow(leadHours);
    const appointments = await Appointment.find({
        status: "confirmed",
        paymentStatus: "paid",
        date: { $gte: lower, $lte: upper },
    }).populate([
        {
            path: "doctor_id",
            select: "fullName user",
            populate: { path: "user", select: "name email" },
        },
        {
            path: "patient_id",
            select: "fullName user_id",
            populate: { path: "user_id", select: "name email" },
        },
        { path: "hospital", select: "name" },
    ]);

    const queued = [];

    for (const appointment of appointments) {
        const scheduledAt = buildScheduledDate(
            appointment.appointmentDateKey || appointment.date,
            appointment.timeSlot
        );

        if (!scheduledAt || scheduledAt <= now) {
            continue;
        }

        const recipient =
            appointment.patient_id?.user_id?.email || appointment.patientEmailSnapshot || "";

        if (!recipient) {
            continue;
        }

        const dedupeKey = `reminder:appointment:${appointment._id}:${leadHours}`;
        const log = await sendTemplatedEmail({
            eventKey: "APPOINTMENT_REMINDER",
            recipient,
            data: {
                patientName:
                    appointment.patient_id?.fullName ||
                    appointment.patientNameSnapshot ||
                    appointment.patient_id?.user_id?.name ||
                    "Patient",
                doctorName:
                    appointment.doctorNameSnapshot ||
                    appointment.doctor_id?.fullName ||
                    appointment.doctor_id?.user?.name ||
                    "Doctor",
                date: formatDate(scheduledAt, settings.timezone || DEFAULT_TIMEZONE),
                time: appointment.timeSlot,
                hospitalName: appointment.hospitalNameSnapshot || appointment.hospital?.name || "",
                meetingLink: appointment.type === "VIRTUAL" ? appointment.meetingLink || "" : "",
            },
            dedupeKey,
            relatedEntity: appointment._id,
            relatedEntityModel: "Appointment",
            category: "reminder",
        });

        if (log) {
            queued.push(log);
        }
    }

    return queued;
};

const queueConsultationReminders = async (settings) => {
    if (settings.appointmentReminders === false) {
        return [];
    }

    const leadHours = Number(settings.reminderHours || 24);
    const { now, lower, upper } = buildReminderWindow(leadHours);
    const consultations = await OnlineConsultation.find({
        status: { $in: ["scheduled", "meeting_pending"] },
        paymentStatus: "paid",
        approvedDate: { $gte: lower, $lte: upper },
    }).populate([
        {
            path: "doctor",
            select: "fullName user",
            populate: { path: "user", select: "name email" },
        },
        {
            path: "patient",
            select: "fullName user_id",
            populate: { path: "user_id", select: "name email" },
        },
    ]);

    const queued = [];

    for (const consultation of consultations) {
        const scheduledAt = buildScheduledDate(
            consultation.approvedDateKey || consultation.approvedDate,
            consultation.approvedTimeSlot
        );

        if (!scheduledAt || scheduledAt <= now) {
            continue;
        }

        const recipient =
            consultation.patient?.user_id?.email || consultation.patientEmailSnapshot || "";

        if (!recipient) {
            continue;
        }

        const dedupeKey = `reminder:consultation:${consultation._id}:${leadHours}`;
        const log = await sendTemplatedEmail({
            eventKey: "VIRTUAL_REMINDER",
            recipient,
            data: {
                patientName:
                    consultation.patient?.fullName ||
                    consultation.patientNameSnapshot ||
                    consultation.patient?.user_id?.name ||
                    "Patient",
                doctorName:
                    consultation.doctorNameSnapshot ||
                    consultation.doctor?.fullName ||
                    consultation.doctor?.user?.name ||
                    "Doctor",
                date: formatDate(scheduledAt, settings.timezone || DEFAULT_TIMEZONE),
                time: consultation.approvedTimeSlot,
                meetingLink: consultation.meetingLink || "",
            },
            dedupeKey,
            relatedEntity: consultation._id,
            relatedEntityModel: "OnlineConsultation",
            category: "reminder",
        });

        if (log) {
            queued.push(log);
        }
    }

    return queued;
};

const runLowStockAlertSweep = async () => {
    const medicines = await Medicine.find({
        $expr: { $lte: ["$stock", "$reorderLevel"] },
    })
        .select("name stock reorderLevel")
        .sort({ stock: 1 })
        .lean();

    if (!medicines.length) {
        return [];
    }

    const dayKey = new Date().toISOString().slice(0, 10);
    const inventorySignature = medicines
        .map((medicine) => `${medicine._id}:${medicine.stock}`)
        .join("|");

    return sendAdminTemplatedEmail({
        eventKey: "SYSTEM_LOW_STOCK",
        data: {
            items: medicines.map((medicine) => ({
                name: medicine.name,
                stock: medicine.stock,
            })),
        },
        dedupeKey: `low-stock:${dayKey}:${inventorySignature}`,
        category: "lowStock",
    });
};

const runEmailSchedulerCycle = async () => {
    const settings = await getSystemSettings();

    await processDueEmailNotifications();
    await queueAppointmentReminders(settings);
    await queueConsultationReminders(settings);
};

const startEmailScheduler = () => {
    const timezone = process.env.APP_TIMEZONE || DEFAULT_TIMEZONE;

    cron.schedule(
        "*/5 * * * *",
        async () => {
            try {
                await runEmailSchedulerCycle();
            } catch (error) {
                console.error("[Email Scheduler] Failed cycle:", error.message);
            }
        },
        { timezone }
    );

    cron.schedule(
        "0 * * * *",
        async () => {
            try {
                await runLowStockAlertSweep();
            } catch (error) {
                console.error("[Email Scheduler] Low stock sweep failed:", error.message);
            }
        },
        { timezone }
    );

    console.log("[Email Scheduler] Started");
};

module.exports = {
    formatDate,
    formatDateTime,
    queueAppointmentReminders,
    queueConsultationReminders,
    runEmailSchedulerCycle,
    runLowStockAlertSweep,
    startEmailScheduler,
};
