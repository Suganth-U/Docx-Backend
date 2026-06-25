const Appointment = require("../models/Appointment");
const DoctorAvailability = require("../models/DoctorAvailability");
const { generateAvailableSlots } = require("./slotGenerator");

const HOLD_DURATION_MINUTES = Number(process.env.APPOINTMENT_HOLD_MINUTES || 10);
const DAYS_OF_WEEK = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
];

const pad = (value) => String(value).padStart(2, "0");

const normalizeDateKey = (value) => {
    if (!value) return "";

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
    }

    const stringValue = String(value).trim();
    const directMatch = stringValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (directMatch) {
        return `${directMatch[1]}-${directMatch[2]}-${directMatch[3]}`;
    }

    const parsed = new Date(stringValue);

    if (Number.isNaN(parsed.getTime())) {
        return "";
    }

    return `${parsed.getUTCFullYear()}-${pad(parsed.getUTCMonth() + 1)}-${pad(parsed.getUTCDate())}`;
};

const dateFromKey = (dateKey) => new Date(`${normalizeDateKey(dateKey)}T00:00:00.000Z`);

const getDayOfWeekFromDateKey = (dateKey) => DAYS_OF_WEEK[dateFromKey(dateKey).getUTCDay()];

const timeToMinutes = (time = "") => {
    const [hours = "0", minutes = "0"] = String(time).split(":");
    return Number(hours) * 60 + Number(minutes);
};

const hasTimeOverlap = (startA, endA, startB, endB) =>
    timeToMinutes(startA) < timeToMinutes(endB) && timeToMinutes(startB) < timeToMinutes(endA);

const createAvailabilitySlots = (schedule) =>
    generateAvailableSlots(schedule.startTime, schedule.endTime, schedule.slotDuration).map((slot) => ({
        time: slot.time,
        tokenNumber: slot.tokenNumber,
        status: "available",
        isBooked: false,
    }));

const markExpiredAppointments = async (appointmentIds = []) => {
    if (!appointmentIds.length) return;

    await Appointment.updateMany(
        {
            _id: { $in: appointmentIds },
            paymentStatus: "pending",
        },
        {
            $set: {
                paymentStatus: "expired",
                status: "expired",
            },
            $unset: {
                holdExpiresAt: 1,
            },
        }
    );
};

const releaseExpiredHoldsForAvailability = async (availability) => {
    if (!availability) return availability;

    const now = new Date();
    const expiredAppointmentIds = [];
    let changed = false;

    availability.slots = (availability.slots || []).map((slot) => {
        if (
            slot.status === "held" &&
            slot.holdExpiresAt &&
            new Date(slot.holdExpiresAt).getTime() <= now.getTime()
        ) {
            changed = true;
            if (slot.heldByAppointment) {
                expiredAppointmentIds.push(slot.heldByAppointment);
            }

            const slotObject = typeof slot.toObject === "function" ? slot.toObject() : { ...slot };

            return {
                ...slotObject,
                status: "available",
                isBooked: false,
                heldByAppointment: undefined,
                holdExpiresAt: undefined,
                bookedAppointment: undefined,
                bookedBy: undefined,
                bookedAt: undefined,
            };
        }

        return slot;
    });

    if (changed) {
        await availability.save();
        await markExpiredAppointments(expiredAppointmentIds);
    }

    return availability;
};

const releaseExpiredHoldsForDoctorDate = async ({ doctorId, dateKey, hospitalId }) => {
    const query = {
        doctor: doctorId,
        date: dateFromKey(dateKey),
    };

    if (hospitalId) {
        query.hospital = hospitalId;
    }

    const availabilityDocs = await DoctorAvailability.find(query);
    for (const availability of availabilityDocs) {
        await releaseExpiredHoldsForAvailability(availability);
    }
};

const ensureAvailabilityDocument = async ({ doctorId, schedule, dateKey }) => {
    const normalizedDateKey = normalizeDateKey(dateKey);
    const appointmentDate = dateFromKey(normalizedDateKey);
    let availability = await DoctorAvailability.findOne({
        doctor: doctorId,
        hospital: schedule.hospital._id || schedule.hospital,
        date: appointmentDate,
    });

    if (!availability) {
        const generatedSlots = createAvailabilitySlots(schedule);

        availability = await DoctorAvailability.create({
            doctor: doctorId,
            hospital: schedule.hospital._id || schedule.hospital,
            hospitalName: schedule.hospital?.name || "",
            date: appointmentDate,
            dateKey: normalizedDateKey,
            scheduleId: schedule._id,
            totalSlots: generatedSlots.length,
            slots: generatedSlots,
        });
    }

    return releaseExpiredHoldsForAvailability(availability);
};

const getOpenSlots = (availability) =>
    (availability?.slots || []).filter((slot) => slot.status === "available" && !slot.isBooked);

const buildReceiptNumber = (appointment) => {
    const suffix = String(appointment._id).slice(-6).toUpperCase();
    return `DXA-${appointment.appointmentDateKey.replace(/-/g, "")}-${suffix}`;
};

module.exports = {
    HOLD_DURATION_MINUTES,
    buildReceiptNumber,
    dateFromKey,
    ensureAvailabilityDocument,
    getDayOfWeekFromDateKey,
    getOpenSlots,
    hasTimeOverlap,
    normalizeDateKey,
    releaseExpiredHoldsForAvailability,
    releaseExpiredHoldsForDoctorDate,
    timeToMinutes,
};
