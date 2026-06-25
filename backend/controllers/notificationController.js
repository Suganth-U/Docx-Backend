const asyncHandler = require('express-async-handler');
const Appointment = require('../models/Appointment');
const Notification = require('../models/Notification');
const OnlineConsultation = require('../models/OnlineConsultation');
const Patient = require('../models/Patient');
const {
    ADMIN_NOTIFICATION_QUERY,
    buildDoctorNotificationQuery,
    buildPatientNotificationQuery,
} = require('../utils/notifications');

// @desc    Get all notifications (mostly unread, sorted by newest)
// @route   GET /api/admin/notifications
// @access  Private/Admin
const getNotifications = asyncHandler(async (req, res) => {
    const notifications = await Notification.find(ADMIN_NOTIFICATION_QUERY)
        .sort({ createdAt: -1 })
        .limit(50);
    res.json(notifications);
});

// @desc    Mark a specific notification as read
// @route   PUT /api/admin/notifications/:id/read
// @access  Private/Admin
const markAsRead = asyncHandler(async (req, res) => {
    const notification = await Notification.findOneAndUpdate(
        {
            _id: req.params.id,
            ...ADMIN_NOTIFICATION_QUERY,
        },
        { $set: { isRead: true } },
        { new: true }
    );

    if (notification) {
        res.json(notification);
    } else {
        res.status(404);
        throw new Error('Notification not found');
    }
});

// @desc    Mark all notifications as read
// @route   PUT /api/admin/notifications/read-all
// @access  Private/Admin
const markAllAsRead = asyncHandler(async (req, res) => {
    await Notification.updateMany(
        {
            ...ADMIN_NOTIFICATION_QUERY,
            isRead: false,
        },
        { $set: { isRead: true } }
    );
    res.json({ message: 'All notifications marked as read' });
});

// @desc    Get doctor notifications
// @route   GET /api/doctor/notifications
// @access  Private/Doctor
const getDoctorNotifications = asyncHandler(async (req, res) => {
    const notifications = await Notification.find(buildDoctorNotificationQuery(req.user._id))
        .sort({ createdAt: -1 })
        .limit(50);

    res.json(notifications);
});

// @desc    Mark a doctor notification as read
// @route   PUT /api/doctor/notifications/:id/read
// @access  Private/Doctor
const markDoctorNotificationAsRead = asyncHandler(async (req, res) => {
    const notification = await Notification.findOneAndUpdate(
        {
            _id: req.params.id,
            ...buildDoctorNotificationQuery(req.user._id),
        },
        { $set: { isRead: true } },
        { new: true }
    );

    if (!notification) {
        res.status(404);
        throw new Error('Notification not found');
    }

    res.json(notification);
});

// @desc    Mark all doctor notifications as read
// @route   PUT /api/doctor/notifications/read-all
// @access  Private/Doctor
const markAllDoctorNotificationsAsRead = asyncHandler(async (req, res) => {
    await Notification.updateMany(
        {
            ...buildDoctorNotificationQuery(req.user._id),
            isRead: false,
        },
        { $set: { isRead: true } }
    );

    res.json({ message: 'All doctor notifications marked as read' });
});

const getNotificationDateLabel = (date, fallback = '') => {
    if (!date) return fallback;

    const value = new Date(date);
    if (Number.isNaN(value.getTime())) return fallback;

    return value.toLocaleDateString();
};

const ensurePatientNotificationBackfill = async (patientUserId) => {
    const patientProfile = await Patient.findOne({ user_id: patientUserId }).select('_id');
    if (!patientProfile) return;

    const [appointments, consultations] = await Promise.all([
        Appointment.find({
            patient_id: patientProfile._id,
            status: { $in: ['confirmed', 'completed'] },
            paymentStatus: 'paid',
        })
            .sort({ updatedAt: -1 })
            .limit(25)
            .lean(),
        OnlineConsultation.find({ patient: patientProfile._id })
            .sort({ updatedAt: -1 })
            .limit(25)
            .lean(),
    ]);

    const candidates = [
        ...appointments.map((appointment) => ({
            type: 'APPOINTMENT_UPDATE',
            title: 'Appointment confirmed',
            message: `Your appointment with ${appointment.doctorNameSnapshot || 'the doctor'} is confirmed for ${getNotificationDateLabel(appointment.date, appointment.appointmentDateKey)} at ${appointment.timeSlot || 'the selected time'}. Queue number ${appointment.queueNumber || 'pending'}.`,
            link: `/appointment/receipt/${appointment._id}`,
            createdAt: appointment.updatedAt || appointment.createdAt || new Date(),
        })),
        ...consultations
            .filter((consultation) =>
                ['requested', 'approved', 'scheduled', 'meeting_pending', 'rejected'].includes(
                    consultation.status
                )
            )
            .map((consultation) => {
                const link = `/virtual-consultation/status/${consultation._id}`;
                const dateLabel =
                    consultation.approvedDateKey ||
                    consultation.requestedDateKey ||
                    getNotificationDateLabel(consultation.approvedDate || consultation.requestedDate);

                if (consultation.status === 'approved') {
                    return {
                        type: 'CONSULTATION_UPDATE',
                        title: 'Virtual consultation approved',
                        message: `${consultation.doctorNameSnapshot || 'The doctor'} approved your virtual consultation for ${dateLabel} at ${consultation.approvedTimeSlot || consultation.requestedTimeSlot || 'the selected time'}. Payment is now open.`,
                        link,
                        createdAt: consultation.updatedAt || consultation.createdAt || new Date(),
                    };
                }

                if (consultation.status === 'scheduled') {
                    return {
                        type: 'CONSULTATION_UPDATE',
                        title: 'Virtual consultation confirmed',
                        message: `Your secure video consultation with ${consultation.doctorNameSnapshot || 'the doctor'} is scheduled for ${dateLabel} at ${consultation.approvedTimeSlot || consultation.requestedTimeSlot || 'the selected time'}. Join Now opens 30 minutes before the appointment.`,
                        link,
                        createdAt: consultation.updatedAt || consultation.createdAt || new Date(),
                    };
                }

                if (consultation.status === 'meeting_pending') {
                    return {
                        type: 'CONSULTATION_UPDATE',
                        title: 'Virtual consultation payment confirmed',
                        message: `Your payment is confirmed. Secure video setup for ${consultation.doctorNameSnapshot || 'the doctor'} is still being prepared.`,
                        link,
                        createdAt: consultation.updatedAt || consultation.createdAt || new Date(),
                    };
                }

                if (consultation.status === 'rejected') {
                    return {
                        type: 'CONSULTATION_UPDATE',
                        title: 'Virtual consultation rejected',
                        message: `${consultation.doctorNameSnapshot || 'The doctor'} rejected your virtual consultation request.`,
                        link,
                        createdAt: consultation.updatedAt || consultation.createdAt || new Date(),
                    };
                }

                return {
                    type: 'CONSULTATION_UPDATE',
                    title: 'Virtual consultation request sent',
                    message: `Your request with ${consultation.doctorNameSnapshot || 'the doctor'} was sent for ${dateLabel}${consultation.requestedTimeSlot ? ` at ${consultation.requestedTimeSlot}` : ''}.`,
                    link,
                    createdAt: consultation.updatedAt || consultation.createdAt || new Date(),
                };
            }),
    ];

    await Promise.all(
        candidates.map(async (candidate) => {
            const existing = await Notification.exists({
                recipientRole: 'patient',
                recipientUser: patientUserId,
                title: candidate.title,
                link: candidate.link,
            });

            if (existing) return;

            await Notification.create({
                ...candidate,
                recipientRole: 'patient',
                recipientUser: patientUserId,
                isRead: false,
            });
        })
    );
};

// @desc    Get patient notifications
// @route   GET /api/patient/notifications
// @access  Private/Patient
const getPatientNotifications = asyncHandler(async (req, res) => {
    await ensurePatientNotificationBackfill(req.user._id);

    const notifications = await Notification.find(buildPatientNotificationQuery(req.user._id))
        .sort({ createdAt: -1 })
        .limit(50);

    res.json(notifications);
});

// @desc    Mark a patient notification as read
// @route   PUT /api/patient/notifications/:id/read
// @access  Private/Patient
const markPatientNotificationAsRead = asyncHandler(async (req, res) => {
    const notification = await Notification.findOneAndUpdate(
        {
            _id: req.params.id,
            ...buildPatientNotificationQuery(req.user._id),
        },
        { $set: { isRead: true } },
        { new: true }
    );

    if (!notification) {
        res.status(404);
        throw new Error('Notification not found');
    }

    res.json(notification);
});

// @desc    Mark all patient notifications as read
// @route   PUT /api/patient/notifications/read-all
// @access  Private/Patient
const markAllPatientNotificationsAsRead = asyncHandler(async (req, res) => {
    await Notification.updateMany(
        {
            ...buildPatientNotificationQuery(req.user._id),
            isRead: false,
        },
        { $set: { isRead: true } }
    );

    res.json({ message: 'All patient notifications marked as read' });
});

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead,
    getDoctorNotifications,
    markDoctorNotificationAsRead,
    markAllDoctorNotificationsAsRead,
    getPatientNotifications,
    markPatientNotificationAsRead,
    markAllPatientNotificationsAsRead,
};
