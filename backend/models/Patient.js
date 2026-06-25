const mongoose = require('mongoose');

const splitName = (value = '') => {
    const parts = String(value || '').trim().split(/\s+/).filter(Boolean);

    return {
        firstName: parts[0] || '',
        lastName: parts.slice(1).join(' '),
    };
};

const patientSchema = mongoose.Schema(
    {
        user_id: {
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
        dob: {
            type: Date,
        },
        phone: {
            type: String,
        },
        address: {
            type: String,
        },
        gender: {
            type: String,
            enum: ['Male', 'Female', 'Other'],
            required: true // Making it required as per user flow request
        },
        bloodGroup: {
            type: String,
            enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
        },
        height: {
            type: String, // e.g., "175 cm"
        },
        weight: {
            type: String, // e.g., "70 kg"
        },
        allergies: [String],
        chronicConditions: [String],
        currentMedications: [String],
        emergencyContact: {
            name: String,
            phone: String,
            relation: String
        },
        medicalHistory: [
            {
                condition: String,
                diagnosisDate: Date,
                status: {
                    type: String,
                    enum: ['Active', 'Recovered', 'Ongoing']
                },
                notes: String
            }
        ],
    },
    {
        timestamps: true,
    }
);

patientSchema.pre('validate', function () {
    const legacyName = `${this.firstName || ''} ${this.lastName || ''}`.trim();
    this.fullName = String(this.fullName || legacyName || 'DocX Patient').trim();

    const nameParts = splitName(this.fullName);
    if (!this.firstName) {
        this.firstName = nameParts.firstName;
    }
    if (!this.lastName) {
        this.lastName = nameParts.lastName;
    }
});

const Patient = mongoose.model('Patient', patientSchema);

module.exports = Patient;
