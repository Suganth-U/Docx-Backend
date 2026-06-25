const mongoose = require('mongoose');

const ehrAccessLogSchema = mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        role: {
            type: String,
            enum: ['patient', 'doctor', 'admin'],
            required: true,
            index: true,
        },
        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Patient',
            required: true,
            index: true,
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Doctor',
            index: true,
        },
        action: {
            type: String,
            enum: [
                'timeline_view',
                'summary_view',
                'document_upload',
                'document_update',
                'document_download',
                'note_update',
                'medication_create',
                'medication_update',
            ],
            required: true,
            index: true,
        },
        targetType: {
            type: String,
            default: '',
        },
        targetId: {
            type: mongoose.Schema.Types.ObjectId,
        },
        ip: {
            type: String,
            default: '',
        },
        userAgent: {
            type: String,
            default: '',
        },
    },
    {
        timestamps: true,
    }
);

ehrAccessLogSchema.index({ patientId: 1, createdAt: -1 });
ehrAccessLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('EHRAccessLog', ehrAccessLogSchema);
