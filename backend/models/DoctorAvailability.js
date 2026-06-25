const mongoose = require('mongoose');

const doctorAvailabilitySchema = mongoose.Schema(
    {
        doctor: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Doctor'
        },
        hospital: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Hospital'
        },
        hospitalName: {
            type: String,
            required: true
        },
        date: {
            type: Date, // Specific date (e.g., 2026-02-20)
            required: true
        },
        dateKey: {
            type: String,
            required: true
        },
        scheduleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'DoctorSchedule' // Link back to the template
        },
        totalSlots: {
            type: Number,
            required: true
        },
        slots: [
            {
                time: { type: String, required: true }, // "09:00"
                tokenNumber: { type: Number, required: true }, // 1, 2, 3...
                status: {
                    type: String,
                    enum: ['available', 'held', 'booked'],
                    default: 'available'
                },
                isBooked: { type: Boolean, default: false },
                bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Patient ID
                bookedAt: { type: Date },
                heldByAppointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
                holdExpiresAt: { type: Date },
                bookedAppointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' }
            }
        ]
    },
    {
        timestamps: true
    }
);

// Ensure a doctor has only one availability document per hospital per date
doctorAvailabilitySchema.index({ doctor: 1, hospital: 1, dateKey: 1 }, { unique: true });

const DoctorAvailability = mongoose.model('DoctorAvailability', doctorAvailabilitySchema);

module.exports = DoctorAvailability;
