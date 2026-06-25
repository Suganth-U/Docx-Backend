const mongoose = require('mongoose');

const doctorLeaveSchema = new mongoose.Schema({
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        required: true
    },
    dateKey: {
        type: String, // Format: YYYY-MM-DD
        required: true
    },
    reason: {
        type: String,
        default: 'Unavailable'
    }
}, {
    timestamps: true
});

doctorLeaveSchema.index({ doctor: 1, dateKey: 1 }, { unique: true });

const DoctorLeave = mongoose.model('DoctorLeave', doctorLeaveSchema);
module.exports = DoctorLeave;
