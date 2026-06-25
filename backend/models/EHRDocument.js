const mongoose = require('mongoose');

const ehrDocumentSchema = mongoose.Schema(
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
        appointmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Appointment',
            index: true,
        },
        onlineConsultationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OnlineConsultation',
            index: true,
        },
        category: {
            type: String,
            enum: [
                'doctor_note',
                'lab_report',
                'imaging',
                'prescription_record',
                'discharge_summary',
                'vaccination',
                'old_record',
                'other',
            ],
            default: 'other',
            index: true,
        },
        title: {
            type: String, // Stored as iv:ciphertext
            required: true,
        },
        description: {
            type: String, // Stored as iv:ciphertext
            default: '',
        },
        files: [
            {
                storedName: {
                    type: String,
                    required: true,
                },
                originalName: {
                    type: String, // Stored as iv:ciphertext
                    required: true,
                },
                mimeType: {
                    type: String,
                    required: true,
                },
                size: {
                    type: Number,
                    default: 0,
                },
                checksum: {
                    type: String,
                    required: true,
                },
                uploadedAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
        recordDate: {
            type: Date,
            default: Date.now,
            index: true,
        },
        lastClinicalUpdateAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
        uploadedBy: {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
            role: {
                type: String,
                enum: ['patient', 'doctor', 'admin'],
                required: true,
            },
        },
        status: {
            type: String,
            enum: ['active', 'archived', 'deleted'],
            default: 'active',
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

ehrDocumentSchema.index({ patientId: 1, category: 1, recordDate: -1 });
ehrDocumentSchema.index({ patientId: 1, lastClinicalUpdateAt: -1 });
ehrDocumentSchema.index({ doctorId: 1, recordDate: -1 });

module.exports = mongoose.model('EHRDocument', ehrDocumentSchema);
