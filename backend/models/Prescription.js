const mongoose = require('mongoose');

const prescriptionSchema = mongoose.Schema(
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
        appointment_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Appointment',
        },
        request_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PrescriptionRequest',
        },
        diagnosis: {
            type: String,
            required: true,
        },
        medicines: [
            {
                name: { type: String, required: true },
                dosage: { type: String, required: true },
                frequency: { type: String, required: true }, // e.g. "1-0-1"
                duration: { type: String }, // e.g. "5 days"
                quantity: { type: String },
            }
        ],
        notes: {
            type: String,
        },
        signatureImageUrl: {
            type: String,
        },
        documentUrl: {
            type: String,
        },
        documentPath: {
            type: String,
        },
        date: {
            type: Date,
            default: Date.now,
        }
    },
    {
        timestamps: true,
    }
);

const Prescription = mongoose.model('Prescription', prescriptionSchema);

module.exports = Prescription;
