const mongoose = require('mongoose');

const ePrescriptionSchema = mongoose.Schema(
    {
        encounterId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'ClinicalEncounter',
            index: true,
        },
        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Patient',
            index: true,
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Doctor',
        },
        medicines: [
            {
                name: { type: String, required: true },
                dosage: { type: String, required: true },       // e.g. "500mg"
                frequency: { type: String, required: true },    // e.g. "1-0-1"
                duration: { type: String },                     // e.g. "5 days"
                quantity: { type: Number, default: 1 },         // units to dispense
            }
        ],
        // State Machine
        status: {
            type: String,
            enum: ['PENDING_PHARMACY', 'DISPENSED'],
            default: 'PENDING_PHARMACY',
            index: true,
        },
        // Filled on dispense
        pharmacistId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        dispenseTimestamp: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

const EPrescription = mongoose.model('EPrescription', ePrescriptionSchema);

module.exports = EPrescription;
