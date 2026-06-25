const mongoose = require('mongoose');

const clinicalEncounterSchema = mongoose.Schema(
    {
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
        appointmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Appointment',
        },
        onlineConsultationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OnlineConsultation',
            index: true,
        },
        sourceType: {
            type: String,
            enum: ['physical_consultation', 'virtual_consultation', 'manual_note'],
            default: 'physical_consultation',
            index: true,
        },
        timestamp: {
            type: Date,
            default: Date.now,
            index: true,
        },
        vitals: {
            bloodPressure: { type: String },     // e.g. "120/80 mmHg"
            heartRate: { type: Number },          // bpm
            temperature: { type: Number },        // °F
            weight: { type: Number },             // kg
            oxygenSaturation: { type: Number },   // SpO2 %
        },
        // --- Encrypted at rest (AES-256-CBC) ---
        symptoms: {
            type: String,  // Stored as iv:ciphertext
            required: true,
        },
        diagnosis: {
            type: String,  // Stored as iv:ciphertext
            required: true,
        },
        doctorNotes: {
            type: String,  // Stored as iv:ciphertext
        },
        noteAddenda: [
            {
                doctorId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Doctor',
                },
                note: {
                    type: String, // Stored as iv:ciphertext
                    required: true,
                },
                reason: {
                    type: String, // Stored as iv:ciphertext when supplied
                    default: '',
                },
                addedAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
    },
    {
        timestamps: true,
    }
);

// Compound index for fast patient timeline queries
clinicalEncounterSchema.index({ patientId: 1, timestamp: -1 });
clinicalEncounterSchema.index({ patientId: 1, updatedAt: -1 });
clinicalEncounterSchema.index({ doctorId: 1, patientId: 1, timestamp: -1 });
clinicalEncounterSchema.index({ appointmentId: 1 });

const ClinicalEncounter = mongoose.model('ClinicalEncounter', clinicalEncounterSchema);

module.exports = ClinicalEncounter;
