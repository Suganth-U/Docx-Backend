const mongoose = require('mongoose');

const notificationSchema = mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: [
            'PATIENT_REGISTRATION',
            'DOCTOR_APPROVAL',
            'LOW_STOCK_ALERT',
            'APPOINTMENT_UPDATE',
            'PRESCRIPTION_REQUEST',
            'CONSULTATION_UPDATE',
            'DOCTOR_STATUS_UPDATE',
            'ACCOUNT_STATUS_UPDATE',
            'SYSTEM_ALERT'
        ]
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    link: {
        type: String,
        required: true
    },
    recipientRole: {
        type: String,
        enum: ['admin', 'doctor', 'patient'],
        default: 'admin',
        index: true
    },
    recipientUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    }
}, {
    timestamps: true
});

notificationSchema.index({ recipientRole: 1, recipientUser: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
