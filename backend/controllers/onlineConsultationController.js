const {
    sendTemplatedEmail,
} = require('../utils/email/dispatcher');
const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const OnlineConsultation = require("../models/OnlineConsultation");
const ClinicalEncounter = require("../models/ClinicalEncounter");
const DoctorVirtualSchedule = require("../models/DoctorVirtualSchedule");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const User = require("../models/User");
const {
    buildConsultationPaymentPayload,
    isPayHereConfigured,
    mapPayHereStatus,
    verifyPayHereNotification,
} = require("../utils/payhere");
const {
    assertPayPalCaptureMatches,
    assertStripeSessionMatches,
    capturePayPalOrder,
    createPayPalOrder,
    createStripeCheckoutSession,
    isPayPalConfigured,
    isStripeConfigured,
    retrieveStripeCheckoutSession,
} = require("../utils/paymentGateways");
const {
    dateFromKey,
    getDayOfWeekFromDateKey,
    hasTimeOverlap,
    normalizeDateKey,
    timeToMinutes,
} = require("../utils/appointmentScheduling");
const { encryptFields } = require("../utils/crypto");
const {
    buildJitsiJwt,
    buildJoinWindow,
    getJitsiConfig,
    prepareJitsiMeeting,
} = require("../utils/jitsi");
const {
    createAdminNotification,
    createDoctorNotification,
    createPatientNotification,
} = require("../utils/notifications");
const { emitToUsers } = require("../socket");

const CURRENCY = "LKR";
const SLOT_DURATION_MINUTES = 20;
const VIRTUAL_HOLD_DURATION_MINUTES = Number(process.env.VIRTUAL_CONSULTATION_HOLD_MINUTES || 10);
const BOOKING_TIME_ZONE = "Asia/Colombo";
const BOOKING_TIME_ZONE_OFFSET = "+05:30";
const ACTIVE_SLOT_STATUSES = ["approved", "scheduled", "meeting_pending", "completed"];
const ACTIVE_HOLD_PAYMENT_STATUSES = ["pending", "failed", "canceled"];
const EHR_ENCRYPTED_FIELDS = ["symptoms", "diagnosis", "doctorNotes"];

const ensurePaymentRequesterCanAccessConsultation = async (req, consultation) => {
    if (!consultation) return;
    if (!req.user) return;

    if (!["patient", "admin"].includes(req.user.role)) {
        const error = new Error("Please sign in with a patient account to pay for this consultation.");
        error.statusCode = 403;
        throw error;
    }

    if (req.user.role === "patient") {
        const patientProfile = await Patient.findOne({
            _id: consultation.patient?._id || consultation.patient,
            user_id: req.user._id,
        }).select("_id");

        if (!patientProfile) {
            const error = new Error("This consultation belongs to another patient account.");
            error.statusCode = 403;
            throw error;
        }
    }
};

const consultationPopulateProjection = [
    {
        path: "doctor",
        select: "fullName specialization consultationFee user",
        populate: { path: "user", select: "name email" },
    },
    {
        path: "patient",
        select: "fullName phone gender user_id",
        populate: { path: "user_id", select: "name email" },
    },
];

const pad = (value) => String(value).padStart(2, "0");

const getBookingTimeParts = (now = new Date()) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: BOOKING_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    })
        .formatToParts(now)
        .reduce((acc, part) => {
            if (part.type !== "literal") {
                acc[part.type] = part.value;
            }
            return acc;
        }, {});

    return {
        dateKey: `${parts.year}-${parts.month}-${parts.day}`,
        minutes: Number(parts.hour || 0) * 60 + Number(parts.minute || 0),
    };
};

const isSlotInPastForBooking = (dateKey, timeSlot, now = new Date()) => {
    const normalizedDateKey = normalizeDateKey(dateKey);
    const slotTime = normalizeTimeSlot(timeSlot);

    if (!normalizedDateKey || !slotTime) {
        return true;
    }

    const current = getBookingTimeParts(now);

    if (normalizedDateKey < current.dateKey) {
        return true;
    }

    if (normalizedDateKey > current.dateKey) {
        return false;
    }

    return timeToMinutes(slotTime) <= current.minutes;
};

const getBookingDateTime = (dateKey, timeSlot) => {
    const normalizedDateKey = normalizeDateKey(dateKey);
    const slotTime = normalizeTimeSlot(timeSlot);

    if (!normalizedDateKey || !slotTime) {
        return null;
    }

    return new Date(`${normalizedDateKey}T${slotTime}:00${BOOKING_TIME_ZONE_OFFSET}`);
};

const isConsultationHoldExpired = (consultation) =>
    Boolean(
        consultation?.holdExpiresAt &&
            new Date(consultation.holdExpiresAt).getTime() <= Date.now() &&
            consultation.paymentStatus !== "paid"
    );

const normalizeSpecialtyTerm = (value = "") =>
    String(value)
        .toLowerCase()
        .replace(/[^a-z\s]/g, " ")
        .replace(/\b(consultant|specialist|medicine|medical)\b/g, " ")
        .replace(/(ologist|ology|iatrist|iatry|ician|icians|logist|ics|ic|ist|ian|ry)\b/g, "")
        .replace(/\s+/g, " ")
        .trim();

const matchesSpecialtyQuery = (doctorSpecialty = "", query = "") => {
    const left = String(doctorSpecialty || "").toLowerCase().trim();
    const right = String(query || "").toLowerCase().trim();

    if (!right) return true;
    if (left.includes(right) || right.includes(left)) return true;

    const normalizedLeft = normalizeSpecialtyTerm(left);
    const normalizedRight = normalizeSpecialtyTerm(right);

    return Boolean(
        normalizedLeft &&
            normalizedRight &&
            (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft))
    );
};

const normalizeTimeSlot = (value = "") => {
    const trimmed = String(value || "").trim();
    if (!trimmed) return "";

    const twentyFourHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (twentyFourHourMatch) {
        return `${pad(Number(twentyFourHourMatch[1]))}:${pad(Number(twentyFourHourMatch[2]))}`;
    }

    const twelveHourMatch = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
    if (twelveHourMatch) {
        let hours = Number(twelveHourMatch[1]);
        const minutes = Number(twelveHourMatch[2] || "0");
        const meridiem = twelveHourMatch[3].toUpperCase();

        if (meridiem === "PM" && hours !== 12) hours += 12;
        if (meridiem === "AM" && hours === 12) hours = 0;

        return `${pad(hours)}:${pad(minutes)}`;
    }

    return "";
};

const minutesToTime = (value) => {
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    return `${pad(hours)}:${pad(minutes)}`;
};

const buildConsultationNumber = (dateKey, consultationId) =>
    `DXV-${String(dateKey).replace(/-/g, "")}-${String(consultationId).slice(-6).toUpperCase()}`;

const generateVirtualSlots = (startTime, endTime, slotDuration = SLOT_DURATION_MINUTES) => {
    const slots = [];
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    for (let current = startMinutes; current + slotDuration <= endMinutes; current += slotDuration) {
        slots.push(minutesToTime(current));
    }

    return slots;
};

const getDoctorDisplayName = (doctor) =>
    doctor?.fullName || doctor?.user?.name || "Selected doctor";

const getPatientDisplayName = (patient, fallback = "") =>
    patient?.fullName || patient?.user_id?.name || fallback || "Patient";

const getConsultationAmount = (doctor) => Number(doctor?.consultationFee || 0);

const getMeetingWindowState = (consultation, now = new Date()) => {
    const opensAt = consultation?.meetingJoinOpensAt
        ? new Date(consultation.meetingJoinOpensAt)
        : null;
    const closesAt = consultation?.meetingJoinClosesAt
        ? new Date(consultation.meetingJoinClosesAt)
        : null;
    const nowTime = now.getTime();
    const opensTime = opensAt?.getTime();
    const closesTime = closesAt?.getTime();
    const hasWindow =
        opensAt &&
        closesAt &&
        !Number.isNaN(opensTime) &&
        !Number.isNaN(closesTime);

    return {
        opensAt,
        closesAt,
        canJoin:
            hasWindow &&
            nowTime >= opensTime &&
            nowTime <= closesTime &&
            consultation.paymentStatus === "paid" &&
            consultation.status === "scheduled",
        isBeforeWindow: hasWindow && nowTime < opensTime,
        isAfterWindow: hasWindow && nowTime > closesTime,
    };
};

const getConsultationRecipientUserIds = (consultation = {}) => {
    const doctorUser = consultation.doctor?.user?._id || consultation.doctor?.user || null;
    const patientUser = consultation.patient?.user_id?._id || consultation.patient?.user_id || null;

    return {
        doctorUserId: doctorUser,
        patientUserId: patientUser,
        all: [doctorUser, patientUser].filter(Boolean),
    };
};

const emitConsultationUpdated = async (consultationId) => {
    const populated = await OnlineConsultation.findById(consultationId)
        .populate(consultationPopulateProjection)
        .lean();

    if (!populated) return;

    const { all } = getConsultationRecipientUserIds(populated);
    emitToUsers(all, "consultation:updated", buildConsultationPayload(populated));
};

const buildConsultationPayload = (consultation, options = {}) => {
    if (!consultation) return null;

    const { includeMeetingUrls = false } = options;
    const doctor = consultation.doctor || {};
    const patient = consultation.patient || {};
    const doctorName = consultation.doctorNameSnapshot || getDoctorDisplayName(doctor);
    const specialty = consultation.specialtySnapshot || doctor.specialization || "Specialty";
    const patientName = consultation.patientNameSnapshot || getPatientDisplayName(patient);
    const patientEmail = consultation.patientEmailSnapshot || patient?.user_id?.email || "";
    const patientPhone = consultation.patientPhoneSnapshot || patient?.phone || "";
    const amount = Number(consultation.consultationFeeSnapshot || doctor.consultationFee || 0);
    const meetingWindow = getMeetingWindowState(consultation);
    const meetingError = consultation.meetingProviderError || consultation.zoomCreationError || "";
    const manualJoinUrl = includeMeetingUrls ? consultation.meetingLink || "" : "";

    return {
        id: consultation._id,
        consultationNumber: consultation.consultationNumber || "",
        status: consultation.status,
        paymentStatus: consultation.paymentStatus,
        paymentProvider: consultation.paymentProvider || "",
        paymentResult: consultation.paymentResult || null,
        paidAt: consultation.paidAt || null,
        holdExpiresAt: consultation.holdExpiresAt || null,
        requestNote: consultation.requestNote || "",
        doctorResponseNote: consultation.doctorResponseNote || "",
        doctorNotes: consultation.doctorNotes || "",
        requestedDate: consultation.requestedDate || null,
        requestedDateKey: consultation.requestedDateKey || "",
        requestedTimeSlot: consultation.requestedTimeSlot || "",
        approvedDate: consultation.approvedDate || null,
        approvedDateKey: consultation.approvedDateKey || "",
        approvedTimeSlot: consultation.approvedTimeSlot || "",
        createdAt: consultation.createdAt,
        updatedAt: consultation.updatedAt,
        amount,
        currency: CURRENCY,
        canPay:
            consultation.status === "approved" &&
            ACTIVE_HOLD_PAYMENT_STATUSES.includes(consultation.paymentStatus) &&
            !isConsultationHoldExpired(consultation),
        doctor: {
            id: doctor?._id || consultation.doctor,
            name: doctorName,
            specialty,
            email: doctor?.user?.email || "",
            consultationFee: amount,
        },
        patient: {
            id: patient?._id || consultation.patient,
            name: patientName,
            email: patientEmail,
            phone: patientPhone,
        },
        meeting: {
            platform: consultation.meetingPlatform || "jitsi",
            provider: consultation.meetingProvider || "",
            roomReady: Boolean(consultation.jitsiRoomName || consultation.meetingLink),
            scheduledStartAt: consultation.meetingScheduledStartAt || null,
            joinOpensAt: consultation.meetingJoinOpensAt || null,
            joinClosesAt: consultation.meetingJoinClosesAt || null,
            canJoin: meetingWindow.canJoin,
            isBeforeWindow: meetingWindow.isBeforeWindow,
            isAfterWindow: meetingWindow.isAfterWindow,
            patientJoinedAt: consultation.patientJoinedAt || null,
            patientLastLeftAt: consultation.patientLastLeftAt || null,
            doctorJoinedAt: consultation.doctorJoinedAt || null,
            doctorLastLeftAt: consultation.doctorLastLeftAt || null,
            completedAt: consultation.meetingCompletedAt || null,
            error: meetingError,
            manualLink: manualJoinUrl,
        },
        zoom: {
            platform: consultation.meetingPlatform || "jitsi",
            joinUrl: manualJoinUrl,
            hostUrl: includeMeetingUrls ? consultation.hostLink || "" : "",
            meetingId: consultation.meetingId || "",
            adminAdded: Boolean(consultation.adminAddedMeetingLink),
            error: meetingError,
        },
    };
};

const findOrCreateConsultationPatient = async ({ req, fullName, email, mobileNumber, gender }) => {
    let userId = req.user?._id || null;

    if (!userId) {
        if (!fullName || !email || !mobileNumber) {
            throw new Error("Please provide full name, email and mobile number to request a consultation");
        }

        let user = await User.findOne({ email });

        if (!user) {
            const password = Math.random().toString(36).slice(-10);
            user = await User.create({
                name: fullName,
                email,
                password,
                role: "patient",
                status: "active",
                isVerified: true,
            });
        }

        userId = user._id;
    }

    let patientProfile = await Patient.findOne({ user_id: userId });

    if (!patientProfile) {
        patientProfile = await Patient.create({
            user_id: userId,
            fullName: fullName || req.user?.name || "DocX Patient",
            phone: mobileNumber || "",
            gender: gender || "Other",
            address: "",
            medicalHistory: [],
        });
    } else {
        let shouldSave = false;

        if (fullName && patientProfile.fullName !== fullName) {
            patientProfile.fullName = fullName;
            shouldSave = true;
        }

        if (mobileNumber && patientProfile.phone !== mobileNumber) {
            patientProfile.phone = mobileNumber;
            shouldSave = true;
        }

        if (gender && patientProfile.gender !== gender) {
            patientProfile.gender = gender;
            shouldSave = true;
        }

        if (shouldSave) {
            await patientProfile.save();
        }
    }

    return patientProfile;
};

const getDoctorProfileForUser = async (userId) =>
    Doctor.findOne({ user: userId }).populate("user", "name email");

const getPatientRecipientEmail = async (patientProfile, fallbackEmail = "") => {
    if (fallbackEmail) {
        return fallbackEmail;
    }

    if (!patientProfile?.user_id) {
        return "";
    }

    const user = await User.findById(patientProfile.user_id).select("email").lean();
    return user?.email || "";
};

const expireConsultationHold = async (consultation) => {
    if (!consultation || !isConsultationHoldExpired(consultation)) {
        return false;
    }

    consultation.status = "expired";
    consultation.paymentStatus = "expired";
    consultation.holdExpiresAt = null;
    await consultation.save();
    await emitConsultationUpdated(consultation._id);
    return true;
};

const releaseExpiredVirtualHoldsForDoctorDate = async ({ doctorId, dateKey }) => {
    const normalizedDateKey = normalizeDateKey(dateKey);
    if (!doctorId || !normalizedDateKey) {
        return;
    }

    const expiredConsultations = await OnlineConsultation.find({
        doctor: doctorId,
        approvedDateKey: normalizedDateKey,
        status: "approved",
        paymentStatus: { $in: ACTIVE_HOLD_PAYMENT_STATUSES },
        holdExpiresAt: { $lte: new Date() },
    });

    for (const consultation of expiredConsultations) {
        consultation.status = "expired";
        consultation.paymentStatus = "expired";
        consultation.holdExpiresAt = null;
        await consultation.save();
        await emitConsultationUpdated(consultation._id);
    }
};

const hasActiveSlotConflict = async (consultation) => {
    if (!consultation?.doctor || !consultation.approvedDateKey || !consultation.approvedTimeSlot) {
        return false;
    }

    const doctorId = consultation.doctor?._id || consultation.doctor;

    return Boolean(
        await OnlineConsultation.exists({
            _id: { $ne: consultation._id },
            doctor: doctorId,
            approvedDateKey: consultation.approvedDateKey,
            approvedTimeSlot: normalizeTimeSlot(consultation.approvedTimeSlot),
            status: { $in: ACTIVE_SLOT_STATUSES },
        })
    );
};

const hasPatientTimeConflict = async ({ patientId, dateKey, timeSlot, excludeConsultationId = null }) => {
    const normalizedDateKey = normalizeDateKey(dateKey);
    const normalizedTimeSlot = normalizeTimeSlot(timeSlot);

    if (!patientId || !normalizedDateKey || !normalizedTimeSlot) {
        return false;
    }

    const query = {
        patient: patientId,
        approvedDateKey: normalizedDateKey,
        approvedTimeSlot: normalizedTimeSlot,
        status: { $in: ACTIVE_SLOT_STATUSES },
    };

    if (excludeConsultationId) {
        query._id = { $ne: excludeConsultationId };
    }

    return Boolean(await OnlineConsultation.exists(query));
};

const buildDoctorTimeline = async ({ doctorId, dateKey, excludeConsultationId = null }) => {
    const normalizedDateKey = normalizeDateKey(dateKey);
    if (!normalizedDateKey) {
        return {
            dateKey: "",
            schedules: [],
            virtualSchedules: [],
            availableSlots: [],
        };
    }

    await releaseExpiredVirtualHoldsForDoctorDate({ doctorId, dateKey: normalizedDateKey });

    const dayOfWeek = getDayOfWeekFromDateKey(normalizedDateKey);
    const schedules = await DoctorVirtualSchedule.find({
        doctor: doctorId,
        dayOfWeek,
        active: true,
    })
        .sort({ startTime: 1, endTime: 1 })
        .lean();

    const reservedQuery = {
        doctor: doctorId,
        approvedDateKey: normalizedDateKey,
        approvedTimeSlot: { $ne: "" },
        status: { $in: ACTIVE_SLOT_STATUSES },
    };

    if (excludeConsultationId) {
        reservedQuery._id = { $ne: excludeConsultationId };
    }

    const reservedConsultations = await OnlineConsultation.find(reservedQuery)
        .select("approvedTimeSlot")
        .lean();

    const reservedSet = new Set(
        reservedConsultations
            .map((consultation) => normalizeTimeSlot(consultation.approvedTimeSlot))
            .filter(Boolean)
    );

    const availableSlotSet = new Set();

    const virtualSchedules = schedules.map((schedule) => {
        const slotDuration = Number(schedule.slotDuration || SLOT_DURATION_MINUTES);
        const slots = generateVirtualSlots(schedule.startTime, schedule.endTime, slotDuration).map(
            (time) => {
                const status = reservedSet.has(time)
                    ? "booked"
                    : isSlotInPastForBooking(normalizedDateKey, time)
                        ? "past"
                        : "available";
                if (status === "available") {
                    availableSlotSet.add(time);
                }

                return {
                    time,
                    status,
                };
            }
        );

        return {
            id: schedule._id,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            slotDuration,
            slots,
        };
    });

    return {
        dateKey: normalizedDateKey,
        schedules,
        virtualSchedules,
        availableSlots: Array.from(availableSlotSet).sort((left, right) => left.localeCompare(right)),
    };
};

const populateConsultation = (consultationId) =>
    OnlineConsultation.findById(consultationId).populate(consultationPopulateProjection).lean();

const getAuthorizedParticipant = async (consultation, user) => {
    if (!consultation || !user) return null;

    if (user.role === "doctor") {
        const doctorProfile = await getDoctorProfileForUser(user._id);

        if (doctorProfile && String(doctorProfile._id) === String(consultation.doctor?._id || consultation.doctor)) {
            return {
                role: "doctor",
                profile: doctorProfile,
                userId: doctorProfile.user?._id || doctorProfile.user,
                name: getDoctorDisplayName(doctorProfile),
                email: doctorProfile.user?.email || user.email || "",
                isModerator: true,
            };
        }
    }

    if (user.role === "patient") {
        const patientProfile = await Patient.findOne({ user_id: user._id }).populate("user_id", "name email");

        if (patientProfile && String(patientProfile._id) === String(consultation.patient?._id || consultation.patient)) {
            return {
                role: "patient",
                profile: patientProfile,
                userId: patientProfile.user_id?._id || patientProfile.user_id,
                name: getPatientDisplayName(patientProfile, user.name),
                email: patientProfile.user_id?.email || user.email || "",
                isModerator: false,
            };
        }
    }

    return null;
};

const buildMeetingAccessBase = (consultation) => {
    const state = getMeetingWindowState(consultation);
    const doctor = consultation.doctor || {};
    const patient = consultation.patient || {};

    return {
        consultationId: consultation._id,
        status: consultation.status,
        paymentStatus: consultation.paymentStatus,
        doctor: {
            id: doctor?._id || consultation.doctor,
            name: consultation.doctorNameSnapshot || getDoctorDisplayName(doctor),
            specialty: consultation.specialtySnapshot || doctor.specialization || "",
        },
        patient: {
            id: patient?._id || consultation.patient,
            name: consultation.patientNameSnapshot || getPatientDisplayName(patient),
            email: consultation.patientEmailSnapshot || patient?.user_id?.email || "",
            phone: consultation.patientPhoneSnapshot || patient?.phone || "",
        },
        canJoin: false,
        opensAt: state.opensAt,
        closesAt: state.closesAt,
        serverNow: new Date(),
        reason: state.isBeforeWindow
            ? "not_open"
            : state.isAfterWindow
                ? "closed"
                : "",
    };
};

const finalizeConsultationPayment = async (consultation, paymentUpdate = {}) => {
    if (!consultation) {
        throw new Error("Consultation not found");
    }

    if (!consultation.approvedDateKey || !consultation.approvedTimeSlot) {
        throw new Error("The doctor must approve a consultation time before payment");
    }

    if (consultation.status !== "approved") {
        throw new Error("This consultation is not ready for payment confirmation");
    }

    if (!ACTIVE_HOLD_PAYMENT_STATUSES.includes(consultation.paymentStatus)) {
        throw new Error("This consultation is not ready for payment confirmation");
    }

    if (isConsultationHoldExpired(consultation)) {
        await expireConsultationHold(consultation);
        throw new Error("This virtual consultation hold expired. Please choose the slot again.");
    }

    if (await hasActiveSlotConflict(consultation)) {
        throw new Error("This virtual slot is no longer available. Please choose another.");
    }

    if (
        await hasPatientTimeConflict({
            patientId: consultation.patient?._id || consultation.patient,
            dateKey: consultation.approvedDateKey,
            timeSlot: consultation.approvedTimeSlot,
            excludeConsultationId: consultation._id,
        })
    ) {
        throw new Error("You already have a virtual consultation at this time. Please choose another slot.");
    }

    consultation.paymentProvider =
        paymentUpdate.paymentProvider || consultation.paymentProvider || "PAYHERE";
    consultation.paymentResult = paymentUpdate.paymentResult || consultation.paymentResult;
    consultation.gatewayOrderId = paymentUpdate.gatewayOrderId || consultation.gatewayOrderId;
    consultation.paymentStatus = "paid";
    consultation.paidAt = paymentUpdate.paidAt || new Date();
    consultation.holdExpiresAt = null;
    consultation.meetingPlatform = "jitsi";
    consultation.meetingProvider = "jaas";

    const populated = await OnlineConsultation.findById(consultation._id).populate(
        consultationPopulateProjection
    );

    const doctorName = getDoctorDisplayName(populated.doctor);
    const patientName = getPatientDisplayName(populated.patient, consultation.patientNameSnapshot);
    const scheduledAt = getBookingDateTime(
        consultation.approvedDateKey,
        consultation.approvedTimeSlot
    );

    try {
        const jitsiMeeting = prepareJitsiMeeting({
            consultation,
            scheduledAt,
        });

        consultation.meetingId = jitsiMeeting.meetingId;
        consultation.meetingLink = "";
        consultation.hostLink = "";
        consultation.meetingPlatform = jitsiMeeting.platform;
        consultation.meetingProvider = jitsiMeeting.provider;
        consultation.jitsiAppId = jitsiMeeting.appId;
        consultation.jitsiDomain = jitsiMeeting.domain;
        consultation.jitsiRoomName = jitsiMeeting.roomName;
        consultation.meetingScheduledStartAt = jitsiMeeting.scheduledStartAt;
        consultation.meetingJoinOpensAt = jitsiMeeting.joinOpensAt;
        consultation.meetingJoinClosesAt = jitsiMeeting.joinClosesAt;
        consultation.meetingProviderError = "";
        consultation.adminAddedMeetingLink = false;
        consultation.zoomCreationError = "";
        consultation.status = "scheduled";
    } catch (error) {
        const joinWindow = buildJoinWindow(scheduledAt);
        consultation.status = "meeting_pending";
        consultation.meetingScheduledStartAt = scheduledAt;
        consultation.meetingJoinOpensAt = joinWindow.opensAt;
        consultation.meetingJoinClosesAt = joinWindow.closesAt;
        consultation.meetingProviderError = error.message;
        consultation.zoomCreationError = error.message;
        await createAdminNotification({
            type: "CONSULTATION_UPDATE",
            title: "Manual meeting setup required",
            message: `${doctorName} has a paid virtual consultation waiting for secure Jitsi setup.`,
            link: "/admin/online-consultation",
        });
    }

    await consultation.save();

    await sendTemplatedEmail({
        eventKey: 'VIRTUAL_PAYMENT_CONFIRMED',
        recipient: populated.patient?.user_id?.email || consultation.patientEmailSnapshot,
        data: {
            patientName,
            doctorName,
            date: new Date(consultation.approvedDate).toLocaleDateString(),
            time: consultation.approvedTimeSlot,
            meetingLink: "",
            meetingPending: consultation.status !== "scheduled",
        },
        dedupeKey: `consultation-paid:${consultation._id}:${consultation.paymentResult?.id || "manual"}`,
        relatedEntity: consultation._id,
        relatedEntityModel: "OnlineConsultation",
        category: 'transactional'
    });

    await createPatientNotification({
        patientUserId: populated.patient?.user_id?._id || populated.patient?.user_id,
        type: "CONSULTATION_UPDATE",
        title:
            consultation.status === "scheduled"
                ? "Virtual consultation confirmed"
                : "Virtual consultation payment confirmed",
        message:
            consultation.status === "scheduled"
                ? `Your secure video consultation with ${doctorName} is scheduled for ${consultation.approvedDateKey} at ${consultation.approvedTimeSlot}. Join opens 30 minutes before the appointment.`
                : `Your payment is confirmed. Secure meeting setup for ${doctorName} is still being prepared.`,
        link: `/virtual-consultation/status/${consultation._id}`,
    });

    await createDoctorNotification({
        doctorUserId: populated.doctor?.user?._id,
        type: "CONSULTATION_UPDATE",
        title:
            consultation.status === "scheduled"
                ? "Virtual consultation confirmed"
                : "Consultation paid and awaiting meeting link",
        message:
            consultation.status === "scheduled"
                ? `${patientName} completed payment for the ${consultation.approvedDateKey} video consultation at ${consultation.approvedTimeSlot}.`
                : `${patientName} completed payment for the ${consultation.approvedDateKey} consultation. Secure meeting setup is still being prepared.`,
        link: "/doctor/schedule",
    });

    await emitConsultationUpdated(consultation._id);

    return consultation;
};

// @desc    Get available virtual consultation options for a specialty and date
// @route   GET /api/consultations/options
// @access  Public
const getConsultationOptions = asyncHandler(async (req, res) => {
    const specialty = String(req.query.specialty || "").trim();
    const dateKey = normalizeDateKey(req.query.date);

    if (!dateKey) {
        res.status(400);
        throw new Error("Date is required");
    }

    const doctors = await Doctor.find({})
        .populate("user", "name email isVerified status")
        .lean();

    const matchingDoctors = doctors
        .filter((doctor) => doctor.user?.status === "active" && ((doctor.user && doctor.user.isVerified) || doctor.isVerified))
        .filter((doctor) => matchesSpecialtyQuery(doctor.specialization, specialty));

    const options = await Promise.all(
        matchingDoctors.map(async (doctor) => {
            const timeline = await buildDoctorTimeline({
                doctorId: doctor._id,
                dateKey,
            });

            return {
                id: doctor._id,
                name: getDoctorDisplayName(doctor),
                specialty: doctor.specialization,
                consultationFee: getConsultationAmount(doctor),
                requestedDateKey: dateKey,
                availableSlotCount: timeline.availableSlots.length,
                nextAvailableSlot: timeline.availableSlots[0] || "",
                hasWorkingHours: timeline.virtualSchedules.length > 0,
                virtualSchedules: timeline.virtualSchedules,
                availableSlots: timeline.availableSlots,
            };
        })
    );

    options.sort((left, right) => {
        if (right.availableSlotCount !== left.availableSlotCount) {
            return right.availableSlotCount - left.availableSlotCount;
        }

        return left.name.localeCompare(right.name);
    });

    res.json(options);
});

// @desc    Create a virtual consultation request
// @route   POST /api/consultations/requests
// @access  Public
const createConsultationRequest = asyncHandler(async (req, res) => {
    const {
        doctorId,
        specialty,
        requestedDate,
        requestedTimeSlot,
        requestNote,
        fullName,
        email,
        mobileNumber,
        gender,
    } = req.body;

    const requestedDateKey = normalizeDateKey(requestedDate);
    const normalizedRequestedTimeSlot = normalizeTimeSlot(requestedTimeSlot);

    if (!doctorId || !requestedDateKey) {
        res.status(400);
        throw new Error("Doctor and requested date are required");
    }

    if (!normalizedRequestedTimeSlot) {
        res.status(400);
        throw new Error("Please select an available time slot.");
    }

    const doctor = await Doctor.findById(doctorId).populate("user", "name email isVerified status");

    if (!doctor) {
        res.status(404);
        throw new Error("Doctor not found");
    }

    if (doctor.user?.status !== "active" || (!doctor.user?.isVerified && !doctor.isVerified)) {
        res.status(403);
        throw new Error("This doctor is not available for consultation.");
    }

    const patientProfile = await findOrCreateConsultationPatient({
        req,
        fullName,
        email,
        mobileNumber,
        gender,
    });
    const recipientEmail = await getPatientRecipientEmail(patientProfile, email || req.user?.email || "");

    const timeline = await buildDoctorTimeline({
        doctorId: doctor._id,
        dateKey: requestedDateKey,
    });

    if (!timeline.availableSlots.includes(normalizedRequestedTimeSlot)) {
        res.status(409);
        throw new Error("This virtual slot is no longer available. Please choose another.");
    }

    if (
        await hasPatientTimeConflict({
            patientId: patientProfile._id,
            dateKey: requestedDateKey,
            timeSlot: normalizedRequestedTimeSlot,
        })
    ) {
        res.status(409);
        throw new Error("You already have a virtual consultation at this time. Please choose another slot.");
    }

    const consultationId = new mongoose.Types.ObjectId();
    const holdExpiresAt = new Date(Date.now() + VIRTUAL_HOLD_DURATION_MINUTES * 60 * 1000);
    let consultation;

    try {
        consultation = await OnlineConsultation.create({
            _id: consultationId,
            consultationNumber: buildConsultationNumber(requestedDateKey, consultationId),
            patient: patientProfile._id,
            doctor: doctor._id,
            specialtySnapshot: specialty || doctor.specialization || "",
            doctorNameSnapshot: getDoctorDisplayName(doctor),
            patientNameSnapshot: fullName || patientProfile.fullName,
            patientEmailSnapshot: email || req.user?.email || "",
            patientPhoneSnapshot: mobileNumber || patientProfile.phone || "",
            consultationFeeSnapshot: getConsultationAmount(doctor),
            requestedDate: dateFromKey(requestedDateKey),
            requestedDateKey,
            requestedTimeSlot: normalizedRequestedTimeSlot,
            approvedDate: dateFromKey(requestedDateKey),
            approvedDateKey: requestedDateKey,
            approvedTimeSlot: normalizedRequestedTimeSlot,
            requestNote: String(requestNote || "").trim(),
            status: "approved",
            paymentStatus: "pending",
            holdExpiresAt,
        });
    } catch (error) {
        if (error.code === 11000) {
            res.status(409);
            throw new Error("This virtual slot is no longer available. Please choose another.");
        }
        throw error;
    }

    await createPatientNotification({
        patientUserId: patientProfile.user_id,
        type: "CONSULTATION_UPDATE",
        title: "Virtual consultation slot held",
        message: `Your ${requestedDateKey} slot at ${consultation.approvedTimeSlot} is held for ${VIRTUAL_HOLD_DURATION_MINUTES} minutes. Complete payment to confirm.`,
        link: `/virtual-consultation/status/${consultation._id}`,
    });

    const populated = await populateConsultation(consultation._id);

    res.status(201).json({
        consultation: buildConsultationPayload(populated),
    });

    await sendTemplatedEmail({
        eventKey: 'VIRTUAL_APPROVED_PROMPT_PAYMENT',
        recipient: recipientEmail,
        data: {
            patientName: fullName || patientProfile.fullName,
            doctorName: doctor.fullName || doctor.user?.name,
            date: new Date(consultation.approvedDate).toLocaleDateString(),
            time: consultation.approvedTimeSlot,
        },
        dedupeKey: `consultation-slot-held:${consultation._id}`,
        relatedEntity: consultation._id,
        relatedEntityModel: 'OnlineConsultation',
        category: 'transactional'
    });

});

// @desc    Get all online consultations for doctor/admin
// @route   GET /api/consultations
// @access  Private/Admin/Doctor
const getConsultations = asyncHandler(async (req, res) => {
    if (!["admin", "doctor"].includes(req.user.role)) {
        res.status(403);
        throw new Error("Not authorized to view consultation management");
    }

    const query = {};

    if (req.user.role === "doctor") {
        const doctorProfile = await getDoctorProfileForUser(req.user._id);

        if (!doctorProfile) {
            res.status(404);
            throw new Error("Doctor profile not found");
        }

        query.doctor = doctorProfile._id;
    }

    await OnlineConsultation.updateMany(
        {
            ...(query.doctor ? { doctor: query.doctor } : {}),
            status: "approved",
            paymentStatus: { $in: ACTIVE_HOLD_PAYMENT_STATUSES },
            holdExpiresAt: { $lte: new Date() },
        },
        {
            $set: { status: "expired", paymentStatus: "expired", holdExpiresAt: null },
        }
    );

    if (req.query.status && req.query.status !== "all") {
        query.status = req.query.status;
    }

    const consultations = await OnlineConsultation.find(query)
        .populate(consultationPopulateProjection)
        .sort({ createdAt: -1 });

    const searchTerm = String(req.query.search || "").trim().toLowerCase();

    const mapped = await Promise.all(
        consultations.map(async (consultation) => {
            const payload = buildConsultationPayload(consultation.toObject(), {
                includeMeetingUrls: true,
            });

            if (req.user.role === "doctor" && consultation.status === "requested") {
                const approvalOptions = await buildDoctorTimeline({
                    doctorId: consultation.doctor._id,
                    dateKey: consultation.requestedDateKey,
                    excludeConsultationId: consultation._id,
                });

                payload.approvalOptions = {
                    dateKey: consultation.requestedDateKey,
                    availableSlots: approvalOptions.availableSlots,
                    virtualSchedules: approvalOptions.virtualSchedules,
                };
            }

            return payload;
        })
    );

    const filtered = searchTerm
        ? mapped.filter((consultation) => {
              const haystack = [
                  consultation.consultationNumber,
                  consultation.patient.name,
                  consultation.doctor.name,
                  consultation.doctor.specialty,
              ]
                  .join(" ")
                  .toLowerCase();

              return haystack.includes(searchTerm);
          })
        : mapped;

    res.json(filtered);
});

// @desc    Get a patient's own virtual consultations
// @route   GET /api/consultations/my
// @access  Private/Patient
const getMyConsultations = asyncHandler(async (req, res) => {
    const patientProfile = await Patient.findOne({ user_id: req.user._id });

    if (!patientProfile) {
        return res.json([]);
    }

    await OnlineConsultation.updateMany(
        {
            patient: patientProfile._id,
            status: "approved",
            paymentStatus: { $in: ACTIVE_HOLD_PAYMENT_STATUSES },
            holdExpiresAt: { $lte: new Date() },
        },
        {
            $set: { status: "expired", paymentStatus: "expired", holdExpiresAt: null },
        }
    );

    const consultations = await OnlineConsultation.find({ patient: patientProfile._id })
        .populate(consultationPopulateProjection)
        .sort({ createdAt: -1 })
        .lean();

    res.json(consultations.map((consultation) => buildConsultationPayload(consultation)));
});

// @desc    Get virtual consultation detail
// @route   GET /api/consultations/:id
// @access  Public
const getConsultationById = asyncHandler(async (req, res) => {
    const consultationDoc = await OnlineConsultation.findById(req.params.id);

    if (!consultationDoc) {
        res.status(404);
        throw new Error("Consultation not found");
    }

    await expireConsultationHold(consultationDoc);

    const consultation = await populateConsultation(req.params.id);
    res.json(buildConsultationPayload(consultation));
});

// @desc    Get secure meeting access for an authorized consultation participant
// @route   GET /api/consultations/:id/meeting/access
// @access  Private/Patient or assigned Doctor
const getConsultationMeetingAccess = asyncHandler(async (req, res) => {
    const consultation = await OnlineConsultation.findById(req.params.id).populate(
        consultationPopulateProjection
    );

    if (!consultation) {
        res.status(404);
        throw new Error("Consultation not found");
    }
    await ensurePaymentRequesterCanAccessConsultation(req, consultation);

    const participant = await getAuthorizedParticipant(consultation, req.user);

    if (!participant) {
        res.status(403);
        throw new Error("You can only join your assigned consultation");
    }

    const access = {
        ...buildMeetingAccessBase(consultation),
        participantRole: participant.role,
        participantName: participant.name,
    };

    if (consultation.paymentStatus !== "paid") {
        return res.json({ ...access, reason: "payment_required" });
    }

    if (consultation.status === "completed") {
        return res.json({ ...access, reason: "completed" });
    }

    if (consultation.status !== "scheduled") {
        return res.json({
            ...access,
            reason: consultation.status === "meeting_pending" ? "setup_pending" : "not_scheduled",
        });
    }

    if (!getMeetingWindowState(consultation).canJoin) {
        return res.json(access);
    }

    if (consultation.adminAddedMeetingLink && consultation.meetingLink) {
        return res.json({
            ...access,
            canJoin: true,
            provider: "external",
            launchUrl: consultation.meetingLink,
            participantRole: participant.role,
            reason: "",
        });
    }

    if (!consultation.jitsiRoomName) {
        return res.json({ ...access, reason: "setup_pending" });
    }

    try {
        const config = getJitsiConfig();
        const appId = consultation.jitsiAppId || config.appId;
        const domain = consultation.jitsiDomain || config.domain;
        const token = buildJitsiJwt({
            consultation,
            user: req.user,
            name: participant.name,
            email: participant.email,
            isModerator: participant.isModerator,
        });

        res.json({
            ...access,
            canJoin: true,
            provider: "jitsi",
            domain,
            appId,
            room: consultation.jitsiRoomName,
            roomName: `${appId}/${consultation.jitsiRoomName}`,
            jwt: token,
            participantRole: participant.role,
            participantName: participant.name,
            reason: "",
        });
    } catch (error) {
        res.status(503);
        throw new Error(error.message || "Secure meeting access is not configured");
    }
});

// @desc    Record client-side meeting events from the embedded Jitsi frame
// @route   POST /api/consultations/:id/meeting/events
// @access  Private/Patient or assigned Doctor
const recordConsultationMeetingEvent = asyncHandler(async (req, res) => {
    const consultation = await OnlineConsultation.findById(req.params.id);

    if (!consultation) {
        res.status(404);
        throw new Error("Consultation not found");
    }

    const participant = await getAuthorizedParticipant(consultation, req.user);

    if (!participant) {
        res.status(403);
        throw new Error("You can only update your assigned consultation");
    }

    const eventName = String(req.body.event || "").toLowerCase();

    if (!["joined", "left"].includes(eventName)) {
        res.status(400);
        throw new Error("Meeting event must be joined or left");
    }

    const timestamp = new Date();

    if (participant.role === "doctor") {
        if (eventName === "joined") {
            consultation.doctorJoinedAt = consultation.doctorJoinedAt || timestamp;
        } else {
            consultation.doctorLastLeftAt = timestamp;
        }
    } else if (eventName === "joined") {
        consultation.patientJoinedAt = consultation.patientJoinedAt || timestamp;
    } else {
        consultation.patientLastLeftAt = timestamp;
    }

    await consultation.save();
    await emitConsultationUpdated(consultation._id);

    res.json({ ok: true, event: eventName, role: participant.role, timestamp });
});

// @desc    Complete a virtual consultation and write the post-call note to EHR
// @route   POST /api/consultations/:id/complete
// @access  Private/Assigned Doctor
const completeConsultation = asyncHandler(async (req, res) => {
    if (req.user.role !== "doctor") {
        res.status(403);
        throw new Error("Only the assigned doctor can complete a virtual consultation");
    }

    const consultation = await OnlineConsultation.findById(req.params.id).populate(
        consultationPopulateProjection
    );

    if (!consultation) {
        res.status(404);
        throw new Error("Consultation not found");
    }

    const participant = await getAuthorizedParticipant(consultation, req.user);

    if (!participant || participant.role !== "doctor") {
        res.status(403);
        throw new Error("You can only complete your own virtual consultations");
    }

    if (consultation.paymentStatus !== "paid") {
        res.status(400);
        throw new Error("Only paid consultations can be completed");
    }

    const symptoms = String(req.body.symptoms || "").trim();
    const diagnosis = String(req.body.diagnosis || "").trim();
    const doctorNotes = String(req.body.doctorNotes || "").trim();

    if (!symptoms || !diagnosis || !doctorNotes) {
        res.status(400);
        throw new Error("Symptoms, diagnosis, and doctor notes are required to update EHR");
    }

    let encounter = null;

    if (consultation.ehrEncounterId) {
        encounter = await ClinicalEncounter.findById(consultation.ehrEncounterId);
    }

    if (!encounter) {
        const encounterData = {
            patientId: consultation.patient?._id || consultation.patient,
            doctorId: consultation.doctor?._id || consultation.doctor,
            onlineConsultationId: consultation._id,
            sourceType: "virtual_consultation",
            vitals: req.body.vitals || {},
            symptoms,
            diagnosis,
            doctorNotes,
            timestamp: new Date(),
        };

        encryptFields(encounterData, EHR_ENCRYPTED_FIELDS);
        encounter = await ClinicalEncounter.create(encounterData);
    }

    consultation.status = "completed";
    consultation.meetingCompletedAt = consultation.meetingCompletedAt || new Date();
    consultation.doctorNotes = doctorNotes;
    consultation.ehrSynced = true;
    consultation.ehrEncounterId = encounter._id;
    await consultation.save();

    await createPatientNotification({
        patientUserId: consultation.patient?.user_id?._id || consultation.patient?.user_id,
        type: "CONSULTATION_UPDATE",
        title: "Virtual consultation completed",
        message: `${consultation.doctorNameSnapshot || "Your doctor"} completed the post-call EHR note for your virtual consultation.`,
        link: "/patient/profile",
    });

    await emitConsultationUpdated(consultation._id);

    const populated = await populateConsultation(consultation._id);
    res.json({
        consultation: buildConsultationPayload(populated),
        ehrEncounterId: encounter._id,
    });
});

// @desc    Doctor/admin respond to a virtual consultation request
// @route   PUT /api/consultations/:id/respond
// @access  Private/Admin/Doctor
const respondToConsultation = asyncHandler(async (req, res) => {
    const consultation = await OnlineConsultation.findById(req.params.id);

    if (!consultation) {
        res.status(404);
        throw new Error("Consultation not found");
    }

    if (req.user.role === "doctor") {
        const doctorProfile = await getDoctorProfileForUser(req.user._id);

        if (!doctorProfile || String(doctorProfile._id) !== String(consultation.doctor)) {
            res.status(403);
            throw new Error("You can only manage your own consultation requests");
        }
    }

    const action = String(req.body.action || "").toLowerCase();
    const note = String(req.body.note || "").trim();

    if (!["approve", "reject"].includes(action)) {
        res.status(400);
        throw new Error("Action must be approve or reject");
    }

    if (action === "reject") {
        consultation.status = "rejected";
        consultation.paymentStatus = "canceled";
        consultation.doctorResponseNote = note;
        consultation.approvedDate = null;
        consultation.approvedDateKey = "";
        consultation.approvedTimeSlot = "";
        await consultation.save();

        // 📧 Reject email
        const patientProfile = await Patient.findById(consultation.patient).populate('user_id');
        await sendTemplatedEmail({
            eventKey: 'VIRTUAL_REJECTED',
            recipient: patientProfile?.user_id?.email || consultation.patientEmailSnapshot,
            data: {
                patientName: patientProfile?.fullName || consultation.patientNameSnapshot,
                doctorName: consultation.doctorNameSnapshot,
                reason: note || "No reason provided."
            },
            dedupeKey: `consultation-rejected:${consultation._id}`,
            relatedEntity: consultation._id,
            relatedEntityModel: 'OnlineConsultation',
            category: 'transactional'
        });

        await createPatientNotification({
            patientUserId: patientProfile?.user_id?._id || patientProfile?.user_id,
            type: "CONSULTATION_UPDATE",
            title: "Virtual consultation rejected",
            message: `${consultation.doctorNameSnapshot || "The doctor"} rejected your virtual consultation request.${note ? ` Reason: ${note}` : ""}`,
            link: `/virtual-consultation/status/${consultation._id}`,
        });

        await createAdminNotification({
            type: "CONSULTATION_UPDATE",
            title: "Virtual consultation rejected",
            message: `${consultation.doctorNameSnapshot || "A doctor"} rejected a virtual consultation request.`,
            link: "/admin/online-consultation",
        });

        await emitConsultationUpdated(consultation._id);

        const populated = await populateConsultation(consultation._id);
        return res.json(buildConsultationPayload(populated));
    }

    const approvedDateKey = normalizeDateKey(req.body.approvedDate || consultation.requestedDateKey);
    const approvedTimeSlot = normalizeTimeSlot(
        req.body.approvedTimeSlot || consultation.requestedTimeSlot
    );

    if (!approvedDateKey || !approvedTimeSlot) {
        res.status(400);
        throw new Error("Approval requires a date and 20-minute time slot");
    }

    const timeline = await buildDoctorTimeline({
        doctorId: consultation.doctor,
        dateKey: approvedDateKey,
        excludeConsultationId: consultation._id,
    });

    if (!timeline.availableSlots.includes(approvedTimeSlot)) {
        res.status(409);
        throw new Error("That virtual slot is no longer available for approval");
    }

    if (
        await hasPatientTimeConflict({
            patientId: consultation.patient,
            dateKey: approvedDateKey,
            timeSlot: approvedTimeSlot,
            excludeConsultationId: consultation._id,
        })
    ) {
        res.status(409);
        throw new Error("This patient already has a virtual consultation at that time.");
    }

    consultation.status = "approved";
    consultation.paymentStatus = "pending";
    consultation.approvedDate = dateFromKey(approvedDateKey);
    consultation.approvedDateKey = approvedDateKey;
    consultation.approvedTimeSlot = approvedTimeSlot;
    consultation.doctorResponseNote = note;
    consultation.holdExpiresAt = new Date(Date.now() + VIRTUAL_HOLD_DURATION_MINUTES * 60 * 1000);
    await consultation.save();

    // 📧 Approve email
    const patientProfile = await Patient.findById(consultation.patient).populate('user_id');
    await sendTemplatedEmail({
        eventKey: 'VIRTUAL_APPROVED_PROMPT_PAYMENT',
        recipient: patientProfile?.user_id?.email || consultation.patientEmailSnapshot,
        data: {
            patientName: patientProfile?.fullName || consultation.patientNameSnapshot,
            doctorName: consultation.doctorNameSnapshot,
            date: new Date(consultation.approvedDate).toLocaleDateString(),
            time: consultation.approvedTimeSlot
        },
        dedupeKey: `consultation-approved:${consultation._id}`,
        relatedEntity: consultation._id,
        relatedEntityModel: 'OnlineConsultation',
        category: 'transactional'
    });

    await createPatientNotification({
        patientUserId: patientProfile?.user_id?._id || patientProfile?.user_id,
        type: "CONSULTATION_UPDATE",
        title: "Virtual consultation approved",
        message: `${consultation.doctorNameSnapshot || "The doctor"} approved your virtual consultation for ${approvedDateKey} at ${approvedTimeSlot}. Payment is now open.`,
        link: `/virtual-consultation/status/${consultation._id}`,
    });

    await createAdminNotification({
        type: "CONSULTATION_UPDATE",
        title: "Virtual consultation approved",
        message: `${consultation.doctorNameSnapshot || "A doctor"} approved a virtual consultation and opened payment.`,
        link: "/admin/online-consultation",
    });

    await emitConsultationUpdated(consultation._id);

    const populated = await populateConsultation(consultation._id);
    res.json(buildConsultationPayload(populated));
});

// @desc    Create a PayHere session for an approved consultation
// @route   POST /api/consultations/:id/payhere/session
// @access  Public
const createConsultationPayHereSession = asyncHandler(async (req, res) => {
    if (!isPayHereConfigured()) {
        res.status(503);
        throw new Error(
            "Secure online payment is not available right now. Please try another payment option or contact support."
        );
    }

    const consultation = await OnlineConsultation.findById(req.params.id).populate(
        consultationPopulateProjection
    );

    if (!consultation) {
        res.status(404);
        throw new Error("Consultation not found");
    }

    if (await expireConsultationHold(consultation)) {
        res.status(409);
        throw new Error("This virtual consultation hold expired. Please choose the slot again.");
    }

    if (consultation.status !== "approved") {
        res.status(400);
        throw new Error("This consultation is not ready for payment");
    }

    if (!ACTIVE_HOLD_PAYMENT_STATUSES.includes(consultation.paymentStatus)) {
        res.status(400);
        throw new Error("This consultation is not ready for payment");
    }

    if (await hasActiveSlotConflict(consultation)) {
        res.status(409);
        throw new Error("This virtual slot is no longer available. Please choose another.");
    }

    if (
        await hasPatientTimeConflict({
            patientId: consultation.patient?._id || consultation.patient,
            dateKey: consultation.approvedDateKey,
            timeSlot: consultation.approvedTimeSlot,
            excludeConsultationId: consultation._id,
        })
    ) {
        res.status(409);
        throw new Error("You already have a virtual consultation at this time. Please choose another slot.");
    }

    const payload = buildConsultationPayload(consultation.toObject());
    const payment = buildConsultationPaymentPayload({
        consultation,
        fullName: payload.patient.name,
        email: payload.patient.email,
        phone: payload.patient.phone,
        frontendOrigin: req.get("origin") || req.body.origin || "",
    });

    res.status(201).json({
        consultationId: consultation._id,
        payment,
    });
});

const ensurePayableConsultation = async (consultation) => {
    if (!consultation) {
        const error = new Error("Consultation not found");
        error.statusCode = 404;
        throw error;
    }

    if (await expireConsultationHold(consultation)) {
        const error = new Error("This virtual consultation hold expired. Please choose the slot again.");
        error.statusCode = 409;
        throw error;
    }

    if (consultation.status !== "approved") {
        const error = new Error("This consultation is not ready for payment");
        error.statusCode = 400;
        throw error;
    }

    if (!ACTIVE_HOLD_PAYMENT_STATUSES.includes(consultation.paymentStatus)) {
        const error = new Error("This consultation is not ready for payment");
        error.statusCode = 400;
        throw error;
    }

    if (await hasActiveSlotConflict(consultation)) {
        const error = new Error("This virtual slot is no longer available. Please choose another.");
        error.statusCode = 409;
        throw error;
    }

    if (
        await hasPatientTimeConflict({
            patientId: consultation.patient?._id || consultation.patient,
            dateKey: consultation.approvedDateKey,
            timeSlot: consultation.approvedTimeSlot,
            excludeConsultationId: consultation._id,
        })
    ) {
        const error = new Error("You already have a virtual consultation at this time. Please choose another slot.");
        error.statusCode = 409;
        throw error;
    }
};

const createConsultationStripeSession = asyncHandler(async (req, res) => {
    if (!isStripeConfigured()) {
        res.status(503);
        throw new Error("Stripe checkout is not configured. Add STRIPE_SECRET_KEY on the server.");
    }

    const consultation = await OnlineConsultation.findById(req.params.id).populate(
        consultationPopulateProjection
    );
    await ensurePaymentRequesterCanAccessConsultation(req, consultation);
    await ensurePayableConsultation(consultation);

    const payload = buildConsultationPayload(consultation.toObject());
    const session = await createStripeCheckoutSession({
        targetType: "consultation",
        targetId: consultation._id,
        amount: consultation.consultationFeeSnapshot,
        currency: "LKR",
        label: consultation.doctorNameSnapshot
            ? `DocX virtual consultation with ${consultation.doctorNameSnapshot}`
            : "DocX virtual consultation",
        customerEmail: payload.patient.email,
        successPath: `/virtual-consultation/status/${consultation._id}`,
        cancelPath: `/virtual-consultation/status/${consultation._id}`,
        frontendOrigin: req.get("origin") || req.body.origin || "",
        metadata: {
            patientId: String(consultation.patient?._id || consultation.patient || ""),
            doctorId: String(consultation.doctor?._id || consultation.doctor || ""),
        },
    });

    consultation.paymentProvider = "STRIPE";
    consultation.gatewayOrderId = session.id;
    consultation.paymentResult = {
        id: session.id,
        status: "pending",
        update_time: new Date().toISOString(),
        method: "stripe_checkout",
        status_message: "Stripe Checkout session created",
        secureHash: session.secureHash,
        checkoutUrl: session.checkoutUrl,
    };
    await consultation.save();
    await emitConsultationUpdated(consultation._id);

    res.status(201).json({
        consultationId: consultation._id,
        provider: "STRIPE",
        checkoutUrl: session.checkoutUrl,
        sessionId: session.id,
    });
});

const verifyConsultationStripeSession = asyncHandler(async (req, res) => {
    const consultation = await OnlineConsultation.findById(req.params.id);

    if (!consultation) {
        res.status(404);
        throw new Error("Consultation not found");
    }
    await ensurePaymentRequesterCanAccessConsultation(req, consultation);

    const sessionId = req.body.sessionId || req.query.session_id;
    if (!sessionId || String(sessionId) !== String(consultation.gatewayOrderId)) {
        res.status(400);
        throw new Error("Stripe checkout session does not match this consultation.");
    }

    const session = await retrieveStripeCheckoutSession(sessionId);
    assertStripeSessionMatches({
        session,
        targetType: "consultation",
        targetId: consultation._id,
        amount: consultation.consultationFeeSnapshot,
        currency: "LKR",
        secureHash: consultation.paymentResult?.secureHash,
    });

    if (session.payment_status === "paid") {
        if (
            consultation.paymentStatus === "paid" &&
            ["scheduled", "meeting_pending", "completed"].includes(consultation.status)
        ) {
            const populated = await populateConsultation(consultation._id);
            res.json(buildConsultationPayload(populated));
            return;
        }

        await finalizeConsultationPayment(consultation, {
            paymentProvider: "STRIPE",
            gatewayOrderId: session.id,
            paymentResult: {
                id: session.id,
                status: "paid",
                update_time: new Date().toISOString(),
                email_address: session.customer_details?.email || consultation.patientEmailSnapshot,
                method: "stripe_checkout",
                status_message: "Stripe Checkout payment verified",
                secureHash: consultation.paymentResult?.secureHash,
            },
            paidAt: new Date(),
        });
    } else if (session.status === "expired") {
        consultation.paymentProvider = "STRIPE";
        consultation.gatewayOrderId = session.id;
        consultation.paymentResult = {
            id: session.id,
            status: session.status,
            update_time: new Date().toISOString(),
            method: "stripe_checkout",
            status_message: "Stripe Checkout session expired",
            secureHash: consultation.paymentResult?.secureHash,
        };
        consultation.paymentStatus = "canceled";
        if (consultation.status === "approved") {
            consultation.status = "cancelled";
        }
        consultation.holdExpiresAt = null;
        await consultation.save();
        await emitConsultationUpdated(consultation._id);
    }

    const populated = await populateConsultation(consultation._id);
    res.json(buildConsultationPayload(populated));
});

const createConsultationPayPalSession = asyncHandler(async (req, res) => {
    if (!isPayPalConfigured()) {
        res.status(503);
        throw new Error("PayPal checkout is not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET on the server.");
    }

    const consultation = await OnlineConsultation.findById(req.params.id).populate(
        consultationPopulateProjection
    );
    await ensurePaymentRequesterCanAccessConsultation(req, consultation);
    await ensurePayableConsultation(consultation);

    const paypalOrder = await createPayPalOrder({
        targetType: "consultation",
        targetId: consultation._id,
        amount: consultation.consultationFeeSnapshot,
        currency: "LKR",
        label: consultation.doctorNameSnapshot
            ? `DocX virtual consultation with ${consultation.doctorNameSnapshot}`
            : "DocX virtual consultation",
        returnPath: `/virtual-consultation/status/${consultation._id}`,
        cancelPath: `/virtual-consultation/status/${consultation._id}`,
        frontendOrigin: req.get("origin") || req.body.origin || "",
    });

    consultation.paymentProvider = "PAYPAL";
    consultation.gatewayOrderId = paypalOrder.id;
    consultation.paymentResult = {
        id: paypalOrder.id,
        status: "pending",
        update_time: new Date().toISOString(),
        method: "paypal",
        status_message: "PayPal order created",
        secureHash: paypalOrder.secureHash,
        checkoutUrl: paypalOrder.approvalUrl,
    };
    await consultation.save();
    await emitConsultationUpdated(consultation._id);

    res.status(201).json({
        consultationId: consultation._id,
        provider: "PAYPAL",
        paypalOrderId: paypalOrder.id,
        approvalUrl: paypalOrder.approvalUrl,
    });
});

const captureConsultationPayPalPayment = asyncHandler(async (req, res) => {
    const consultation = await OnlineConsultation.findById(req.params.id);

    if (!consultation) {
        res.status(404);
        throw new Error("Consultation not found");
    }
    await ensurePaymentRequesterCanAccessConsultation(req, consultation);

    if (
        consultation.paymentStatus === "paid" &&
        ["scheduled", "meeting_pending", "completed"].includes(consultation.status)
    ) {
        const populated = await populateConsultation(consultation._id);
        res.json(buildConsultationPayload(populated));
        return;
    }

    const paypalOrderId = req.body.paypalOrderId || req.body.token || req.query.token;
    if (!paypalOrderId || String(paypalOrderId) !== String(consultation.gatewayOrderId)) {
        res.status(400);
        throw new Error("PayPal order does not match this consultation.");
    }

    const capture = await capturePayPalOrder(paypalOrderId);
    assertPayPalCaptureMatches({
        capture,
        targetId: consultation._id,
        amount: consultation.consultationFeeSnapshot,
        currency: "LKR",
        secureHash: consultation.paymentResult?.secureHash,
    });

    const paypalCapture = capture.purchase_units?.[0]?.payments?.captures?.[0];
    await finalizeConsultationPayment(consultation, {
        paymentProvider: "PAYPAL",
        gatewayOrderId: paypalOrderId,
        paymentResult: {
            id: paypalCapture?.id || paypalOrderId,
            status: "paid",
            update_time: paypalCapture?.update_time || new Date().toISOString(),
            email_address: capture.payer?.email_address || consultation.patientEmailSnapshot,
            method: "paypal",
            status_message: "PayPal payment captured",
            secureHash: consultation.paymentResult?.secureHash,
        },
        paidAt: new Date(),
    });

    const populated = await populateConsultation(consultation._id);
    res.json(buildConsultationPayload(populated));
});

// @desc    Pay a consultation manually or confirm a free consultation
// @route   PUT /api/consultations/:id/pay
// @access  Public
const payConsultation = asyncHandler(async (req, res) => {
    const consultation = await OnlineConsultation.findById(req.params.id);

    if (!consultation) {
        res.status(404);
        throw new Error("Consultation not found");
    }

    if (await expireConsultationHold(consultation)) {
        res.status(409);
        throw new Error("This virtual consultation hold expired. Please choose the slot again.");
    }

    if (consultation.status !== "approved") {
        res.status(400);
        throw new Error("Only approved consultations can be paid");
    }

    if (await hasActiveSlotConflict(consultation)) {
        res.status(409);
        throw new Error("This virtual slot is no longer available. Please choose another.");
    }

    if (
        await hasPatientTimeConflict({
            patientId: consultation.patient?._id || consultation.patient,
            dateKey: consultation.approvedDateKey,
            timeSlot: consultation.approvedTimeSlot,
            excludeConsultationId: consultation._id,
        })
    ) {
        res.status(409);
        throw new Error("You already have a virtual consultation at this time. Please choose another slot.");
    }

    await finalizeConsultationPayment(consultation, {
        paymentProvider: req.body.provider || "MANUAL",
        paymentResult: {
            id: req.body.id || `manual-${consultation._id}`,
            status: "paid",
            update_time: new Date().toISOString(),
            method: req.body.method || "manual",
            status_message: req.body.status_message || "Payment confirmed by staff",
        },
        paidAt: new Date(),
    });

    const populated = await populateConsultation(consultation._id);
    res.json(buildConsultationPayload(populated));
});

// @desc    Handle PayHere notification for virtual consultations
// @route   POST /api/consultations/payhere/notify
// @access  Public
const notifyConsultationPayHerePayment = asyncHandler(async (req, res) => {
    if (!verifyPayHereNotification(req.body)) {
        res.status(400).send("invalid signature");
        return;
    }

    const consultation = await OnlineConsultation.findById(req.body.order_id);

    if (!consultation) {
        res.status(404).send("consultation not found");
        return;
    }

    const paymentStatus = mapPayHereStatus(req.body.status_code);
    const paymentResult = {
        paymentProvider: "PAYHERE",
        gatewayOrderId: req.body.payment_id,
        paymentResult: {
            id: req.body.payment_id,
            status: paymentStatus,
            update_time: new Date().toISOString(),
            method: req.body.method,
            status_message: req.body.status_message,
        },
        paidAt: new Date(),
    };

    if (
        consultation.paymentStatus === "paid" &&
        ["scheduled", "meeting_pending", "completed"].includes(consultation.status)
    ) {
        res.status(200).send("ok");
        return;
    }

    if (paymentStatus !== "paid" && (await expireConsultationHold(consultation))) {
        res.status(200).send("ok");
        return;
    }

    if (paymentStatus === "paid") {
        try {
            await finalizeConsultationPayment(consultation, paymentResult);
        } catch (error) {
            if (consultation.paymentStatus !== "expired") {
                consultation.paymentProvider = "PAYHERE";
                consultation.gatewayOrderId = req.body.payment_id || consultation.gatewayOrderId;
                consultation.paymentResult = {
                    ...paymentResult.paymentResult,
                    note: error.message,
                };
                consultation.paymentStatus = "failed";
                if (consultation.status === "approved") {
                    consultation.status = "cancelled";
                }
                consultation.holdExpiresAt = null;
                await consultation.save();
                await emitConsultationUpdated(consultation._id);
            }
        }
        res.status(200).send("ok");
        return;
    }

    consultation.paymentProvider = "PAYHERE";
    consultation.gatewayOrderId = req.body.payment_id || consultation.gatewayOrderId;
    consultation.paymentResult = paymentResult.paymentResult;

    if (paymentStatus === "failed") {
        consultation.paymentStatus = "failed";
    } else if (paymentStatus === "canceled") {
        consultation.paymentStatus = "canceled";
    } else {
        consultation.paymentStatus = "pending";
    }

    await consultation.save();

    if (["failed", "canceled"].includes(paymentStatus)) {
        const populated = await OnlineConsultation.findById(consultation._id).populate(
            consultationPopulateProjection
        );

        await sendTemplatedEmail({
            eventKey: "VIRTUAL_PAYMENT_FAILED",
            recipient: populated?.patient?.user_id?.email || consultation.patientEmailSnapshot,
            data: {
                patientName:
                    populated?.patient?.fullName || consultation.patientNameSnapshot || "Patient",
                doctorName:
                    consultation.doctorNameSnapshot ||
                    populated?.doctor?.fullName ||
                    populated?.doctor?.user?.name ||
                    "Doctor",
                date: consultation.approvedDate
                    ? new Date(consultation.approvedDate).toLocaleDateString()
                    : "",
                time: consultation.approvedTimeSlot || "",
                statusLabel: paymentStatus,
            },
            dedupeKey: `consultation-payment-failed:${consultation._id}:${paymentStatus}`,
            relatedEntity: consultation._id,
            relatedEntityModel: "OnlineConsultation",
            category: "transactional",
        });
    }

    res.status(200).send("ok");
});

// @desc    Add or update a meeting link
// @route   PUT /api/consultations/:id/link
// @access  Private/Admin/Doctor
const updateConsultationLink = asyncHandler(async (req, res) => {
    const consultation = await OnlineConsultation.findById(req.params.id);

    if (!consultation) {
        res.status(404);
        throw new Error("Consultation not found");
    }

    if (req.user.role === "doctor") {
        const doctorProfile = await getDoctorProfileForUser(req.user._id);

        if (!doctorProfile || String(doctorProfile._id) !== String(consultation.doctor)) {
            res.status(403);
            throw new Error("You can only update your own consultation meetings");
        }
    }

    consultation.meetingLink = String(req.body.meetingLink || consultation.meetingLink || "").trim();
    consultation.hostLink = String(req.body.hostLink || consultation.hostLink || "").trim();
    consultation.meetingPlatform = req.body.meetingPlatform || consultation.meetingPlatform || "jitsi";
    consultation.meetingProvider = req.body.meetingProvider || consultation.meetingProvider || "manual";
    consultation.adminAddedMeetingLink = true;
    consultation.meetingProviderError = "";
    consultation.zoomCreationError = "";

    if (consultation.meetingLink && consultation.paymentStatus === "paid") {
        consultation.status = "scheduled";
    }

    await consultation.save();

    if (consultation.status === "scheduled" && consultation.meetingLink) {
        const patientForMail = await Patient.findById(consultation.patient).populate("user_id");
        await sendTemplatedEmail({
            eventKey: "VIRTUAL_MEETING_LINK_READY",
            recipient: patientForMail?.user_id?.email || consultation.patientEmailSnapshot,
            data: {
                patientName: patientForMail?.fullName || consultation.patientNameSnapshot,
                doctorName: consultation.doctorNameSnapshot,
                date: consultation.approvedDate
                    ? new Date(consultation.approvedDate).toLocaleDateString()
                    : consultation.approvedDateKey,
                time: consultation.approvedTimeSlot,
                meetingLink: consultation.meetingLink,
            },
            dedupeKey: `consultation-meeting-link:${consultation._id}:${consultation.meetingLink}`,
            relatedEntity: consultation._id,
            relatedEntityModel: "OnlineConsultation",
            category: "transactional",
        });

        await createPatientNotification({
            patientUserId: patientForMail?.user_id?._id || patientForMail?.user_id,
            type: "CONSULTATION_UPDATE",
            title: "Virtual consultation link ready",
            message: `Your virtual consultation link with ${consultation.doctorNameSnapshot || "the doctor"} is now ready. Join access opens 30 minutes before the appointment.`,
            link: `/virtual-consultation/status/${consultation._id}`,
        });
    }

    await createAdminNotification({
        type: "CONSULTATION_UPDATE",
        title: "Meeting link updated",
        message: `A virtual consultation meeting link was updated for ${consultation.doctorNameSnapshot || "a doctor"}.`,
        link: "/admin/online-consultation",
    });

    if (req.user.role === "admin" && consultation.meetingLink) {
        const doctorProfile = await Doctor.findById(consultation.doctor).select("user");
        await createDoctorNotification({
            doctorUserId: doctorProfile?.user,
            type: "CONSULTATION_UPDATE",
            title: "Meeting link ready",
            message: `The meeting link for your virtual consultation on ${consultation.approvedDateKey || consultation.requestedDateKey} is now available.`,
            link: "/doctor/schedule",
        });
    }

    const populated = await populateConsultation(consultation._id);
    await emitConsultationUpdated(consultation._id);
    res.json(buildConsultationPayload(populated, { includeMeetingUrls: true }));
});

// @desc    Get the doctor's own recurring virtual schedules
// @route   GET /api/consultations/schedules/mine
// @access  Private/Doctor
const getMyVirtualSchedules = asyncHandler(async (req, res) => {
    const doctorProfile = await getDoctorProfileForUser(req.user._id);

    if (!doctorProfile) {
        res.status(404);
        throw new Error("Doctor profile not found");
    }

    const schedules = await DoctorVirtualSchedule.find({ doctor: doctorProfile._id })
        .sort({ dayOfWeek: 1, startTime: 1 })
        .lean();

    res.json(schedules);
});

// @desc    Create a recurring virtual schedule
// @route   POST /api/consultations/schedules
// @access  Private/Doctor
const createVirtualSchedule = asyncHandler(async (req, res) => {
    const doctorProfile = await getDoctorProfileForUser(req.user._id);

    if (!doctorProfile) {
        res.status(404);
        throw new Error("Doctor profile not found");
    }

    const dayOfWeek = String(req.body.dayOfWeek || "").trim();
    const startTime = normalizeTimeSlot(req.body.startTime);
    const endTime = normalizeTimeSlot(req.body.endTime);
    const slotDuration = Number(req.body.slotDuration || SLOT_DURATION_MINUTES);

    if (!dayOfWeek || !startTime || !endTime) {
        res.status(400);
        throw new Error("Day, start time and end time are required");
    }

    if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
        res.status(400);
        throw new Error("End time must be after the start time");
    }

    if (slotDuration !== SLOT_DURATION_MINUTES) {
        res.status(400);
        throw new Error("Virtual consultations use fixed 20-minute slots");
    }

    const overlapping = await DoctorVirtualSchedule.findOne({
        doctor: doctorProfile._id,
        dayOfWeek,
        active: true,
    });

    if (overlapping) {
        const hasOverlap = (await DoctorVirtualSchedule.find({
            doctor: doctorProfile._id,
            dayOfWeek,
            active: true,
        })).some((schedule) =>
            hasTimeOverlap(startTime, endTime, schedule.startTime, schedule.endTime)
        );

        if (hasOverlap) {
            res.status(409);
            throw new Error("This virtual schedule overlaps with another block on the same day");
        }
    }

    const schedule = await DoctorVirtualSchedule.create({
        doctor: doctorProfile._id,
        dayOfWeek,
        startTime,
        endTime,
        slotDuration,
        active: true,
    });

    res.status(201).json(schedule);
});

// @desc    Delete a recurring virtual schedule
// @route   DELETE /api/consultations/schedules/:id
// @access  Private/Doctor
const deleteVirtualSchedule = asyncHandler(async (req, res) => {
    const doctorProfile = await getDoctorProfileForUser(req.user._id);

    if (!doctorProfile) {
        res.status(404);
        throw new Error("Doctor profile not found");
    }

    const schedule = await DoctorVirtualSchedule.findById(req.params.id);

    if (!schedule || String(schedule.doctor) !== String(doctorProfile._id)) {
        res.status(404);
        throw new Error("Virtual schedule not found");
    }

    await schedule.deleteOne();
    res.json({ message: "Virtual schedule removed" });
});

module.exports = {
    captureConsultationPayPalPayment,
    completeConsultation,
    createConsultationPayHereSession,
    createConsultationPayPalSession,
    createConsultationRequest,
    createConsultationStripeSession,
    createVirtualSchedule,
    deleteVirtualSchedule,
    emitConsultationUpdated,
    finalizeConsultationPayment,
    getConsultationById,
    getConsultationMeetingAccess,
    getConsultationOptions,
    getConsultations,
    getMyConsultations,
    getMyVirtualSchedules,
    notifyConsultationPayHerePayment,
    payConsultation,
    recordConsultationMeetingEvent,
    respondToConsultation,
    updateConsultationLink,
    verifyConsultationStripeSession,
};
