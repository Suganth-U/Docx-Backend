const mongoose = require('mongoose');

const patientMedicationSchema = mongoose.Schema(
    {
        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Patient',
            index: true,
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Doctor',
            index: true,
        },
        encounterId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ClinicalEncounter',
            index: true,
        },
        prescriptionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'EPrescription',
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        dosage: {
            type: String,
            default: '',
            trim: true,
        },
        frequency: {
            type: String,
            default: '',
            trim: true,
        },
        route: {
            type: String,
            default: '',
            trim: true,
        },
        startDate: {
            type: Date,
        },
        endDate: {
            type: Date,
        },
        status: {
            type: String,
            enum: ['active', 'stopped', 'completed', 'unknown'],
            default: 'active',
            index: true,
        },
        source: {
            type: String,
            enum: ['patient_reported', 'doctor_prescribed', 'imported_record'],
            default: 'patient_reported',
            index: true,
        },
        notes: {
            type: String,
            default: '',
        },
        lastClinicalUpdateAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

patientMedicationSchema.index({ patientId: 1, status: 1, updatedAt: -1 });
patientMedicationSchema.index({ patientId: 1, name: 1, source: 1 });

module.exports = mongoose.model('PatientMedication', patientMedicationSchema);
