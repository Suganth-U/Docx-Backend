const mongoose = require('mongoose');

const appointmentSchema = mongoose.Schema(
    {
        doctor_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Doctor',
        },
        patient_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Patient',
        },
        hospital: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hospital',
            required: true
        },
        date: {
            type: Date,
            required: true,
        },
        appointmentDateKey: {
            type: String,
            required: true,
        },
        timeSlot: {
            type: String,
            required: true,
        },
        tokenNumber: {
            type: Number,
        },
        queueNumber: {
            type: Number,
        },
        receiptNumber: {
            type: String,
        },
        type: {
            type: String,
            enum: ['PHYSICAL', 'VIRTUAL'],
            default: 'PHYSICAL',
        },
        reasonForAppointment: {
            type: String,
            default: '',
            trim: true,
        },
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'completed', 'cancelled', 'expired'],
            default: 'pending',
        },
        statusReason: {
            type: String,
            default: '',
            trim: true,
        },
        statusUpdatedAt: {
            type: Date,
        },
        statusUpdatedByRole: {
            type: String,
            enum: ['', 'doctor', 'admin', 'patient', 'system'],
            default: '',
        },
        statusUpdatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        cancelledAt: {
            type: Date,
        },
        cancelledByRole: {
            type: String,
            enum: ['', 'doctor', 'admin', 'patient', 'system'],
            default: '',
        },
        cancelledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'failed', 'canceled', 'expired', 'chargedback'],
            default: 'pending',
        },
        meetingLink: {
            type: String, // For virtual appointments
        },
        specialtySnapshot: {
            type: String,
            default: '',
        },
        doctorNameSnapshot: {
            type: String,
            default: '',
        },
        hospitalNameSnapshot: {
            type: String,
            default: '',
        },
        hospitalLocationSnapshot: {
            type: String,
            default: '',
        },
        patientNameSnapshot: {
            type: String,
            default: '',
        },
        patientEmailSnapshot: {
            type: String,
            default: '',
        },
        patientPhoneSnapshot: {
            type: String,
            default: '',
        },
        consultationFeeSnapshot: {
            type: Number,
            default: 0,
        },
        paymentProvider: {
            type: String,
            default: '',
        },
        paymentResult: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
        paidAt: {
            type: Date,
        },
        holdExpiresAt: {
            type: Date,
        },
        gatewayOrderId: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

appointmentSchema.index(
    { doctor_id: 1, appointmentDateKey: 1, queueNumber: 1 },
    {
        unique: true,
        partialFilterExpression: {
            appointmentDateKey: { $type: 'string' },
            queueNumber: { $type: 'number' }
        }
    }
);
appointmentSchema.index(
    { receiptNumber: 1 },
    {
        unique: true,
        partialFilterExpression: {
            receiptNumber: { $type: 'string' }
        }
    }
);

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;
