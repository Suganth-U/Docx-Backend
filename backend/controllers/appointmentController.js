const { sendTemplatedEmail } = require('../utils/email/dispatcher');
const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const User = require("../models/User");
const Patient = require("../models/Patient");
const DoctorAvailability = require("../models/DoctorAvailability");
const Hospital = require("../models/Hospital");
const SystemMetric = require("../models/SystemMetric");
const DoctorSchedule = require("../models/DoctorSchedule");
const {
    buildAppointmentPaymentPayload,
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
    HOLD_DURATION_MINUTES,
    buildReceiptNumber,
    dateFromKey,
    ensureAvailabilityDocument,
    getDayOfWeekFromDateKey,
    normalizeDateKey,
    releaseExpiredHoldsForDoctorDate,
} = require("../utils/appointmentScheduling");
const { createDoctorNotification, createPatientNotification } = require("../utils/notifications");

const CURRENCY = "LKR";
const ensurePaymentRequesterCanAccessAppointment = async (req, appointment) => {
    if (!req.user) return;

    if (!["patient", "admin"].includes(req.user.role)) {
        const error = new Error("Please sign in with a patient account to pay for this appointment.");
        error.statusCode = 403;
        throw error;
    }

    if (req.user.role === "patient") {
        const patientProfile = await Patient.findOne({
            _id: appointment.patient_id,
            user_id: req.user._id,
        }).select("_id");

        if (!patientProfile) {
            const error = new Error("This appointment belongs to another patient account.");
            error.statusCode = 403;
            throw error;
        }
    }
};
const formatAppointmentNotificationDate = (appointment) => {
    try {
        return new Date(appointment.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
    } catch (error) {
        return "the scheduled date";
    }
};

const trackBookingConflict = async () => {
    await SystemMetric.findOneAndUpdate(
        { metricType: "409_CONFLICT" },
        {
            $inc: { count: 1 },
            $setOnInsert: {
                description: "Concurrency Guard: Concurrent bookings on the same time slot.",
            },
        },
        { upsert: true }
    );
};

const appointmentPublicProjection = [
    {
        path: "doctor_id",
        select: "fullName specialization consultationFee user",
        populate: { path: "user", select: "name email" },
    },
    {
        path: "patient_id",
        select: "fullName phone gender user_id",
        populate: { path: "user_id", select: "name email" },
    },
    { path: "hospital", select: "name location contact" },
];

const getDoctorDisplayName = (doctor) =>
    doctor?.fullName || doctor?.user?.name || "Selected doctor";

const getDoctorSpecialty = (doctor) => doctor?.specialization || "Specialty";

const getAppointmentAmount = (doctor) => Number(doctor?.consultationFee || 0);

const buildMeetingLink = (doctorId, patientId) =>
    `https://meet.jit.si/DocX_${doctorId}_${patientId}_${Date.now()}`;

const parseAmount = (value) => Number(Number(value || 0).toFixed(2));

const isHoldExpired = (appointment) =>
    Boolean(
        appointment?.holdExpiresAt &&
        new Date(appointment.holdExpiresAt).getTime() <= Date.now()
    );

const populateAppointment = (appointmentId) =>
    Appointment.findById(appointmentId)
        .populate(appointmentPublicProjection)
        .lean();

const buildReceiptPayload = (appointment) => {
    if (!appointment) return null;

    const doctorName = appointment.doctorNameSnapshot || getDoctorDisplayName(appointment.doctor_id);
    const specialty = appointment.specialtySnapshot || getDoctorSpecialty(appointment.doctor_id);
    const hospitalName = appointment.hospitalNameSnapshot || appointment.hospital?.name || "Venue pending";
    const hospitalLocation =
        appointment.hospitalLocationSnapshot || appointment.hospital?.location || "";
    const patientName =
        appointment.patientNameSnapshot ||
        appointment.patient_id?.fullName ||
        appointment.patient_id?.user_id?.name ||
        "Patient";
    const patientEmail =
        appointment.patientEmailSnapshot || appointment.patient_id?.user_id?.email || "";
    const patientPhone =
        appointment.patientPhoneSnapshot || appointment.patient_id?.phone || "";

    return {
        appointmentId: appointment._id,
        receiptNumber: appointment.receiptNumber || "",
        queueNumber: appointment.queueNumber || null,
        consultationType: appointment.type,
        status: appointment.status,
        paymentStatus: appointment.paymentStatus,
        paymentProvider: appointment.paymentProvider || "",
        paymentResult: appointment.paymentResult || null,
        paidAt: appointment.paidAt || null,
        holdExpiresAt: appointment.holdExpiresAt || null,
        meetingLink: appointment.meetingLink || "",
        amount: parseAmount(appointment.consultationFeeSnapshot),
        currency: CURRENCY,
        date: appointment.date,
        dateKey: appointment.appointmentDateKey,
        timeSlot: appointment.timeSlot,
        doctor: {
            id: appointment.doctor_id?._id || appointment.doctor_id,
            name: doctorName,
            specialty,
        },
        patient: {
            name: patientName,
            email: patientEmail,
            phone: patientPhone,
        },
        venue: {
            id: appointment.hospital?._id || appointment.hospital,
            name: hospitalName,
            location: hospitalLocation,
        },
        canRetryPayment:
            appointment.paymentStatus === "pending" &&
            appointment.status === "pending" &&
            !isHoldExpired(appointment),
    };
};

const findOrCreateBookingPatient = async ({ req, fullName, email, mobileNumber, gender }) => {
    let userId = req.user?._id || null;

    if (!userId) {
        if (!fullName || !email || !mobileNumber) {
            throw new Error("Please provide full name, email and mobile number for booking");
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
            phone: mobileNumber || req.user?.phone || "",
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

const releaseHeldSlot = async (appointment) => {
    if (!appointment?.hospital || !appointment?.appointmentDateKey) return;

    const availability = await DoctorAvailability.findOne({
        doctor: appointment.doctor_id,
        hospital: appointment.hospital,
        dateKey: appointment.appointmentDateKey,
    });

    if (!availability) return;

    let changed = false;
    availability.slots = (availability.slots || []).map((slot) => {
        if (
            slot.time === appointment.timeSlot &&
            slot.status === "held" &&
            String(slot.heldByAppointment || "") === String(appointment._id)
        ) {
            changed = true;
            const slotObject = typeof slot.toObject === "function" ? slot.toObject() : { ...slot };
            return {
                ...slotObject,
                status: "available",
                isBooked: false,
                heldByAppointment: undefined,
                holdExpiresAt: undefined,
                bookedAppointment: undefined,
                bookedAt: undefined,
                bookedBy: undefined,
            };
        }

        return slot;
    });

    if (changed) {
        await availability.save();
    }
};

const assignQueueNumber = async (appointment) => {
    if (appointment.queueNumber) {
        return appointment;
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
        const latest = await Appointment.findOne({
            doctor_id: appointment.doctor_id,
            appointmentDateKey: appointment.appointmentDateKey,
            queueNumber: { $exists: true },
        })
            .sort({ queueNumber: -1 })
            .select("queueNumber");

        appointment.queueNumber = Number(latest?.queueNumber || 0) + 1;
        appointment.receiptNumber = appointment.receiptNumber || buildReceiptNumber(appointment);

        if (appointment.type === "PHYSICAL") {
            appointment.tokenNumber = appointment.queueNumber;
        }

        try {
            await appointment.save();
            return appointment;
        } catch (error) {
            if (error.code === 11000 && error.message.includes("queueNumber")) {
                appointment.queueNumber = undefined;
                continue;
            }

            throw error;
        }
    }

    throw new Error("Could not assign a queue number for this appointment");
};

const confirmAppointmentFromPayment = async (appointment, paymentUpdate = {}) => {
    if (appointment.paymentStatus === "paid" && appointment.status === "confirmed") {
        return appointment;
    }

    const availability = await DoctorAvailability.findOne({
        doctor: appointment.doctor_id,
        hospital: appointment.hospital,
        dateKey: appointment.appointmentDateKey,
    });

    if (!availability) {
        throw new Error("Doctor availability could not be found for this appointment");
    }

    const slotIndex = (availability.slots || []).findIndex((slot) => slot.time === appointment.timeSlot);

    if (slotIndex === -1) {
        throw new Error("The selected slot no longer exists");
    }

    const selectedSlot = availability.slots[slotIndex];
    const heldByThisAppointment =
        selectedSlot.status === "held" &&
        String(selectedSlot.heldByAppointment || "") === String(appointment._id);
    const alreadyBookedForThisAppointment =
        selectedSlot.status === "booked" &&
        String(selectedSlot.bookedAppointment || "") === String(appointment._id);
    const slotStillAvailable = selectedSlot.status === "available";

    if (!heldByThisAppointment && !alreadyBookedForThisAppointment && !slotStillAvailable) {
        throw new Error("This appointment slot is no longer available to confirm");
    }

    availability.slots[slotIndex].status = "booked";
    availability.slots[slotIndex].isBooked = true;
    availability.slots[slotIndex].heldByAppointment = undefined;
    availability.slots[slotIndex].holdExpiresAt = undefined;
    availability.slots[slotIndex].bookedAppointment = appointment._id;
    availability.slots[slotIndex].bookedAt = new Date();
    await availability.save();

    appointment.paymentProvider = paymentUpdate.paymentProvider || appointment.paymentProvider || "PAYHERE";
    appointment.paymentResult = paymentUpdate.paymentResult || appointment.paymentResult;
    appointment.gatewayOrderId = paymentUpdate.gatewayOrderId || appointment.gatewayOrderId;
    appointment.paymentStatus = "paid";
    appointment.status = "confirmed";
    appointment.paidAt = paymentUpdate.paidAt || new Date();
    appointment.holdExpiresAt = undefined;
    await assignQueueNumber(appointment);

    // 📧 Success email
    const patientForEmail = await require('../models/Patient').findById(appointment.patient_id).populate('user_id');
    const doctorForEmail = await require('../models/Doctor').findById(appointment.doctor_id).populate('user');
    await sendTemplatedEmail({
        eventKey: 'APPOINTMENT_PAYMENT_SUCCESS',
        recipient: patientForEmail?.user_id?.email || appointment.patientEmailSnapshot,
        data: {
            patientName: patientForEmail?.fullName || appointment.patientNameSnapshot,
            doctorName: doctorForEmail?.fullName || appointment.doctorNameSnapshot,
            date: new Date(appointment.date).toLocaleDateString(),
            time: appointment.timeSlot,
            hospitalName: appointment.hospitalNameSnapshot || "Hospital",
            receiptNumber: appointment.receiptNumber,
            queueNumber: appointment.queueNumber,
            meetingLink: appointment.type === "VIRTUAL" ? appointment.meetingLink || "" : "",
        },
        category: 'transactional'
    });


    const doctorProfile = await Doctor.findById(appointment.doctor_id).select("user");
    await createDoctorNotification({
        doctorUserId: doctorProfile?.user,
        type: "APPOINTMENT_UPDATE",
        title: "New appointment confirmed",
        message: `${appointment.patientNameSnapshot || "A patient"} booked a ${String(appointment.type || "consultation").toLowerCase()} appointment for ${formatAppointmentNotificationDate(appointment)} at ${appointment.timeSlot}.`,
        link: "/doctor/appointments",
    });

    await createPatientNotification({
        patientUserId: patientForEmail?.user_id?._id || patientForEmail?.user_id,
        type: "APPOINTMENT_UPDATE",
        title: "Appointment confirmed",
        message: `Your appointment with ${doctorForEmail?.fullName || appointment.doctorNameSnapshot || "the doctor"} is confirmed for ${formatAppointmentNotificationDate(appointment)} at ${appointment.timeSlot}. Queue number ${appointment.queueNumber || "pending"}.`,
        link: `/appointment/receipt/${appointment._id}`,
    });

    return appointment;
};

const markAppointmentPaymentFailure = async (appointment, paymentStatus, paymentResult = {}) => {
    appointment.paymentProvider = paymentResult.paymentProvider || appointment.paymentProvider || "PAYHERE";
    appointment.paymentResult = paymentResult.paymentResult || appointment.paymentResult;
    appointment.gatewayOrderId = paymentResult.gatewayOrderId || appointment.gatewayOrderId;
    appointment.paymentStatus = paymentStatus;
    appointment.status = paymentStatus === "expired" ? "expired" : "cancelled";
    appointment.holdExpiresAt = undefined;
    await appointment.save();
    await releaseHeldSlot(appointment);

    // 📧 Failed email
    const patientForFailEmail = await require('../models/Patient').findById(appointment.patient_id).populate('user_id');
    await sendTemplatedEmail({
        eventKey: 'APPOINTMENT_PAYMENT_FAILED',
        recipient: patientForFailEmail?.user_id?.email || appointment.patientEmailSnapshot,
        data: {
            patientName: patientForFailEmail?.fullName || appointment.patientNameSnapshot,
            doctorName: appointment.doctorNameSnapshot || "Doctor",
            date: new Date(appointment.date).toLocaleDateString(),
            time: appointment.timeSlot,
            statusLabel: paymentStatus,
        },
        category: 'transactional'
    });

};

const ensureLiveAppointment = async (appointmentId) => {
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
        throw new Error("Appointment not found");
    }

    if (appointment.paymentStatus === "paid") {
        return appointment;
    }

    if (isHoldExpired(appointment)) {
        await markAppointmentPaymentFailure(appointment, "expired");
        throw new Error("This appointment hold expired. Please choose the slot again.");
    }

    return appointment;
};

const bookAppointment = asyncHandler(async (req, res) => {
    const {
        doctorId,
        hospitalId,
        date,
        timeSlot,
        consultationType,
        fullName,
        email,
        mobileNumber,
        gender,
        reasonForAppointment,
    } = req.body;

    const dateKey = normalizeDateKey(date);

    if (!doctorId || !hospitalId || !dateKey || !timeSlot) {
        res.status(400);
        throw new Error("Doctor, venue, date and time are required");
    }

    const patientProfile = await findOrCreateBookingPatient({
        req,
        fullName,
        email,
        mobileNumber,
        gender,
    });

    const doctor = await Doctor.findById(doctorId).populate("user", "name email isVerified status");
    if (!doctor) {
        res.status(404);
        throw new Error("Doctor not found");
    }

    if (doctor.user?.status !== "active" || (!doctor.user?.isVerified && !doctor.isVerified)) {
        res.status(403);
        throw new Error("This doctor is not available for booking.");
    }

    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
        res.status(404);
        throw new Error("Hospital not found");
    }

    const schedule = await DoctorSchedule.findOne({
        doctor: doctorId,
        hospital: hospitalId,
        dayOfWeek: getDayOfWeekFromDateKey(dateKey),
    }).populate("hospital", "name location contact");

    if (!schedule) {
        res.status(400);
        throw new Error("The selected doctor is not scheduled at this venue on that date");
    }

    await releaseExpiredHoldsForDoctorDate({
        doctorId,
        dateKey,
        hospitalId,
    });

    const availability = await ensureAvailabilityDocument({
        doctorId,
        schedule,
        dateKey,
    });

    const holdExpiresAt = new Date(Date.now() + HOLD_DURATION_MINUTES * 60 * 1000);
    const appointmentId = new mongoose.Types.ObjectId();

    const slotHold = await DoctorAvailability.findOneAndUpdate(
        {
            _id: availability._id,
            slots: {
                $elemMatch: {
                    time: timeSlot,
                    status: "available",
                },
            },
        },
        {
            $set: {
                "slots.$.status": "held",
                "slots.$.isBooked": false,
                "slots.$.heldByAppointment": appointmentId,
                "slots.$.holdExpiresAt": holdExpiresAt,
            },
            $unset: {
                "slots.$.bookedAppointment": 1,
                "slots.$.bookedAt": 1,
                "slots.$.bookedBy": 1,
            }
        },
        { new: true }
    );

    if (!slotHold) {
        await trackBookingConflict();
        res.status(409);
        throw new Error("This time slot is no longer available. Please choose another.");
    }

    const type = String(consultationType).toUpperCase() === "VIRTUAL" ? "VIRTUAL" : "PHYSICAL";
    const bookingUser = patientProfile?.user_id ? await User.findById(patientProfile.user_id).select("email") : null;
    const normalizedReasonForAppointment = String(reasonForAppointment || "").trim();

    try {
        const appointment = await Appointment.create({
            _id: appointmentId,
            doctor_id: doctorId,
            patient_id: patientProfile._id,
            hospital: hospitalId,
            date: dateFromKey(dateKey),
            appointmentDateKey: dateKey,
            timeSlot,
            type,
            status: "pending",
            paymentStatus: "pending",
            reasonForAppointment: normalizedReasonForAppointment,
            meetingLink: type === "VIRTUAL" ? buildMeetingLink(doctorId, patientProfile._id) : "",
            specialtySnapshot: getDoctorSpecialty(doctor),
            doctorNameSnapshot: getDoctorDisplayName(doctor),
            hospitalNameSnapshot: hospital.name,
            hospitalLocationSnapshot: hospital.location,
            patientNameSnapshot: fullName || patientProfile.fullName,
            patientEmailSnapshot: email || req.user?.email || "",
            patientPhoneSnapshot: mobileNumber || patientProfile.phone || "",
            consultationFeeSnapshot: getAppointmentAmount(doctor),
            holdExpiresAt,
        });

        res.status(201).json({
            appointmentId: appointment._id,
            paymentStatus: appointment.paymentStatus,
            holdExpiresAt: appointment.holdExpiresAt,
            amount: appointment.consultationFeeSnapshot,
            currency: CURRENCY,
        });
        
        // 📧 Hold email
        await sendTemplatedEmail({
            eventKey: 'APPOINTMENT_BOOKING_HOLD',
            recipient: email || bookingUser?.email || req.user?.email,
            data: {
                patientName: fullName || patientProfile.fullName,
                doctorName: doctor.fullName || doctor.user?.name,
                date: new Date(dateFromKey(dateKey)).toLocaleDateString(),
                time: timeSlot,
                holdExpiresAt: new Date(holdExpiresAt).toLocaleString(),
                type: type === "VIRTUAL" ? "virtual appointment" : "appointment",
            },
            category: 'transactional'
        });

    } catch (error) {
        await DoctorAvailability.updateOne(
            {
                _id: availability._id,
                "slots.time": timeSlot,
                "slots.heldByAppointment": appointmentId,
            },
            {
                $set: {
                    "slots.$.status": "available",
                    "slots.$.isBooked": false,
                },
                $unset: {
                    "slots.$.heldByAppointment": 1,
                    "slots.$.holdExpiresAt": 1,
                    "slots.$.bookedAppointment": 1,
                    "slots.$.bookedAt": 1,
                },
            }
        );
        throw error;
    }
});

const createAppointmentPayHereSession = asyncHandler(async (req, res) => {
    if (!isPayHereConfigured()) {
        res.status(503);
        throw new Error(
            "Secure online payment is not available right now. Please try another payment option or contact support."
        );
    }

    const appointment = await ensureLiveAppointment(req.params.id);
    await ensurePaymentRequesterCanAccessAppointment(req, appointment);
    const populatedAppointment = await Appointment.findById(appointment._id).populate(
        appointmentPublicProjection
    );

    const receipt = buildReceiptPayload(populatedAppointment);

    const payment = buildAppointmentPaymentPayload({
        appointment: populatedAppointment,
        fullName: receipt.patient.name,
        email: receipt.patient.email,
        phone: receipt.patient.phone,
        frontendOrigin: req.get("origin") || req.body.origin || "",
        city: receipt.venue.location || "Colombo",
    });

    res.status(201).json({
        appointmentId: appointment._id,
        payment,
    });
});

const createAppointmentStripeSession = asyncHandler(async (req, res) => {
    if (!isStripeConfigured()) {
        res.status(503);
        throw new Error("Stripe checkout is not configured. Add STRIPE_SECRET_KEY on the server.");
    }

    const appointment = await ensureLiveAppointment(req.params.id);
    await ensurePaymentRequesterCanAccessAppointment(req, appointment);
    const populatedAppointment = await Appointment.findById(appointment._id).populate(
        appointmentPublicProjection
    );
    const receipt = buildReceiptPayload(populatedAppointment);

    const session = await createStripeCheckoutSession({
        targetType: "appointment",
        targetId: appointment._id,
        amount: receipt.amount,
        currency: CURRENCY,
        label: receipt.doctor.name
            ? `DocX appointment with ${receipt.doctor.name}`
            : "DocX doctor appointment",
        customerEmail: receipt.patient.email,
        successPath: `/appointment/receipt/${appointment._id}`,
        cancelPath: `/appointment/receipt/${appointment._id}`,
        frontendOrigin: req.get("origin") || req.body.origin || "",
        metadata: {
            patientId: String(appointment.patient_id || ""),
            doctorId: String(appointment.doctor_id || ""),
        },
    });

    appointment.paymentProvider = "STRIPE";
    appointment.gatewayOrderId = session.id;
    appointment.paymentResult = {
        id: session.id,
        status: "pending",
        update_time: new Date().toISOString(),
        method: "stripe_checkout",
        status_message: "Stripe Checkout session created",
        secureHash: session.secureHash,
        checkoutUrl: session.checkoutUrl,
    };
    await appointment.save();

    res.status(201).json({
        appointmentId: appointment._id,
        provider: "STRIPE",
        checkoutUrl: session.checkoutUrl,
        sessionId: session.id,
    });
});

const verifyAppointmentStripeSession = asyncHandler(async (req, res) => {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
        res.status(404);
        throw new Error("Appointment not found");
    }
    await ensurePaymentRequesterCanAccessAppointment(req, appointment);

    const sessionId = req.body.sessionId || req.query.session_id;
    if (!sessionId || String(sessionId) !== String(appointment.gatewayOrderId)) {
        res.status(400);
        throw new Error("Stripe checkout session does not match this appointment.");
    }

    const session = await retrieveStripeCheckoutSession(sessionId);
    assertStripeSessionMatches({
        session,
        targetType: "appointment",
        targetId: appointment._id,
        amount: appointment.consultationFeeSnapshot,
        currency: CURRENCY,
        secureHash: appointment.paymentResult?.secureHash,
    });

    if (session.payment_status === "paid") {
        if (appointment.paymentStatus === "paid" && appointment.status === "confirmed") {
            const populatedAppointment = await populateAppointment(appointment._id);
            res.json(buildReceiptPayload(populatedAppointment));
            return;
        }

        await confirmAppointmentFromPayment(appointment, {
            paymentProvider: "STRIPE",
            gatewayOrderId: session.id,
            paymentResult: {
                id: session.id,
                status: "paid",
                update_time: new Date().toISOString(),
                email_address: session.customer_details?.email || appointment.patientEmailSnapshot,
                method: "stripe_checkout",
                status_message: "Stripe Checkout payment verified",
                secureHash: appointment.paymentResult?.secureHash,
            },
            paidAt: new Date(),
        });
    } else if (session.status === "expired") {
        await markAppointmentPaymentFailure(appointment, "canceled", {
            paymentProvider: "STRIPE",
            gatewayOrderId: session.id,
            paymentResult: {
                id: session.id,
                status: session.status,
                update_time: new Date().toISOString(),
                method: "stripe_checkout",
                status_message: "Stripe Checkout session expired",
                secureHash: appointment.paymentResult?.secureHash,
            },
        });
    }

    const populatedAppointment = await populateAppointment(appointment._id);
    res.json(buildReceiptPayload(populatedAppointment));
});

const createAppointmentPayPalSession = asyncHandler(async (req, res) => {
    if (!isPayPalConfigured()) {
        res.status(503);
        throw new Error("PayPal checkout is not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET on the server.");
    }

    const appointment = await ensureLiveAppointment(req.params.id);
    await ensurePaymentRequesterCanAccessAppointment(req, appointment);
    const populatedAppointment = await Appointment.findById(appointment._id).populate(
        appointmentPublicProjection
    );
    const receipt = buildReceiptPayload(populatedAppointment);

    const paypalOrder = await createPayPalOrder({
        targetType: "appointment",
        targetId: appointment._id,
        amount: receipt.amount,
        currency: CURRENCY,
        label: receipt.doctor.name
            ? `DocX appointment with ${receipt.doctor.name}`
            : "DocX doctor appointment",
        returnPath: `/appointment/receipt/${appointment._id}`,
        cancelPath: `/appointment/receipt/${appointment._id}`,
        frontendOrigin: req.get("origin") || req.body.origin || "",
    });

    appointment.paymentProvider = "PAYPAL";
    appointment.gatewayOrderId = paypalOrder.id;
    appointment.paymentResult = {
        id: paypalOrder.id,
        status: "pending",
        update_time: new Date().toISOString(),
        method: "paypal",
        status_message: "PayPal order created",
        secureHash: paypalOrder.secureHash,
        checkoutUrl: paypalOrder.approvalUrl,
    };
    await appointment.save();

    res.status(201).json({
        appointmentId: appointment._id,
        provider: "PAYPAL",
        paypalOrderId: paypalOrder.id,
        approvalUrl: paypalOrder.approvalUrl,
    });
});

const captureAppointmentPayPalPayment = asyncHandler(async (req, res) => {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
        res.status(404);
        throw new Error("Appointment not found");
    }
    await ensurePaymentRequesterCanAccessAppointment(req, appointment);

    if (appointment.paymentStatus === "paid" && appointment.status === "confirmed") {
        const populatedAppointment = await populateAppointment(appointment._id);
        res.json(buildReceiptPayload(populatedAppointment));
        return;
    }

    const paypalOrderId = req.body.paypalOrderId || req.body.token || req.query.token;
    if (!paypalOrderId || String(paypalOrderId) !== String(appointment.gatewayOrderId)) {
        res.status(400);
        throw new Error("PayPal order does not match this appointment.");
    }

    const capture = await capturePayPalOrder(paypalOrderId);
    assertPayPalCaptureMatches({
        capture,
        targetId: appointment._id,
        amount: appointment.consultationFeeSnapshot,
        currency: CURRENCY,
        secureHash: appointment.paymentResult?.secureHash,
    });

    const paypalCapture = capture.purchase_units?.[0]?.payments?.captures?.[0];
    await confirmAppointmentFromPayment(appointment, {
        paymentProvider: "PAYPAL",
        gatewayOrderId: paypalOrderId,
        paymentResult: {
            id: paypalCapture?.id || paypalOrderId,
            status: "paid",
            update_time: paypalCapture?.update_time || new Date().toISOString(),
            email_address: capture.payer?.email_address || appointment.patientEmailSnapshot,
            method: "paypal",
            status_message: "PayPal payment captured",
            secureHash: appointment.paymentResult?.secureHash,
        },
        paidAt: new Date(),
    });

    const populatedAppointment = await populateAppointment(appointment._id);
    res.json(buildReceiptPayload(populatedAppointment));
});

const notifyAppointmentPayHerePayment = asyncHandler(async (req, res) => {
    if (!verifyPayHereNotification(req.body)) {
        res.status(400).send("invalid signature");
        return;
    }

    const appointment = await Appointment.findById(req.body.order_id);

    if (!appointment) {
        res.status(404).send("appointment not found");
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

    if (appointment.paymentStatus === "paid" && paymentStatus === "paid") {
        res.status(200).send("ok");
        return;
    }

    if (paymentStatus === "paid") {
        try {
            await confirmAppointmentFromPayment(appointment, paymentResult);
            res.status(200).send("ok");
        } catch (error) {
            await markAppointmentPaymentFailure(appointment, "failed", {
                ...paymentResult,
                paymentResult: {
                    ...paymentResult.paymentResult,
                    note: error.message,
                },
            });
            res.status(200).send("ok");
        }
        return;
    }

    if (["failed", "canceled", "chargedback"].includes(paymentStatus)) {
        await markAppointmentPaymentFailure(appointment, paymentStatus, paymentResult);
        res.status(200).send("ok");
        return;
    }

    appointment.paymentProvider = "PAYHERE";
    appointment.gatewayOrderId = req.body.payment_id || appointment.gatewayOrderId;
    appointment.paymentResult = paymentResult.paymentResult;
    await appointment.save();
    res.status(200).send("ok");
});

const getAppointmentReceipt = asyncHandler(async (req, res) => {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
        res.status(404);
        throw new Error("Appointment not found");
    }

    if (appointment.paymentStatus === "pending" && isHoldExpired(appointment)) {
        await markAppointmentPaymentFailure(appointment, "expired");
    }

    const populatedAppointment = await populateAppointment(req.params.id);
    res.json(buildReceiptPayload(populatedAppointment));
});

const getMyAppointments = asyncHandler(async (req, res) => {
    const patientProfile = await Patient.findOne({ user_id: req.user._id });

    if (!patientProfile) {
        return res.json([]);
    }

    const appointments = await Appointment.find({ patient_id: patientProfile._id })
        .populate(appointmentPublicProjection)
        .sort({ createdAt: -1 });

    res.json(
        appointments.map((appointment) => ({
            ...appointment.toObject(),
            receipt: buildReceiptPayload(appointment.toObject()),
        }))
    );
});

const payAppointment = asyncHandler(async (req, res) => {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
        res.status(404);
        throw new Error("Appointment not found");
    }

    await confirmAppointmentFromPayment(appointment, {
        paymentProvider: req.body.provider || "MANUAL",
        paymentResult: {
            id: req.body.id || `manual-${appointment._id}`,
            status: "paid",
            update_time: new Date().toISOString(),
            method: req.body.method || "manual",
            status_message: req.body.status_message || "Payment confirmed by staff",
        },
        paidAt: new Date(),
    });

    const populatedAppointment = await populateAppointment(appointment._id);
    res.json(buildReceiptPayload(populatedAppointment));
});

module.exports = {
    bookAppointment,
    captureAppointmentPayPalPayment,
    confirmAppointmentFromPayment,
    createAppointmentPayHereSession,
    createAppointmentPayPalSession,
    createAppointmentStripeSession,
    getAppointmentReceipt,
    getMyAppointments,
    markAppointmentPaymentFailure,
    notifyAppointmentPayHerePayment,
    payAppointment,
    verifyAppointmentStripeSession,
};
