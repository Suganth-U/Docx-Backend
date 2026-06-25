const mongoose = require('mongoose');

const splitName = (value = '') => {
    const parts = String(value || '').trim().split(/\s+/).filter(Boolean);

    return {
        firstName: parts[0] || '',
        lastName: parts.slice(1).join(' '),
    };
};

const doctorSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
        },
        firstName: {
            type: String,
            trim: true,
            default: '',
        },
        lastName: {
            type: String,
            trim: true,
            default: '',
        },
        specialization: {
            type: String,
            required: true,
        },
        hospitalAffiliation: {
            type: String,
            required: true,
            default: 'General Hospital',
        },
        experienceYears: {
            type: Number,
            default: 0,
        },
        consultationFee: {
            type: Number,
            default: 0,
        },
        bio: {
            type: String,
            default: '',
            trim: true,
        },
        education: {
            type: [String],
            default: [],
        },
        profileImageUrl: {
            type: String,
            default: '',
        },
        medicalLicenseImageUrl: {
            type: String,
            default: '',
        },
        medicalLicenseImagePath: {
            type: String,
            default: '',
        },
        nicImageUrl: {
            type: String,
            default: '',
        },
        nicImagePath: {
            type: String,
            default: '',
        },
        signatureImageUrl: {
            type: String,
            default: '',
        },
        signatureImagePath: {
            type: String,
            default: '',
        },
        signatureUpdatedAt: {
            type: Date,
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

doctorSchema.pre('validate', function () {
    const legacyName = `${this.firstName || ''} ${this.lastName || ''}`.trim();
    this.fullName = String(this.fullName || legacyName || 'Doctor').trim();

    const nameParts = splitName(this.fullName);
    if (!this.firstName) {
        this.firstName = nameParts.firstName;
    }
    if (!this.lastName) {
        this.lastName = nameParts.lastName;
    }
});

const Doctor = mongoose.model('Doctor', doctorSchema);

module.exports = Doctor;
