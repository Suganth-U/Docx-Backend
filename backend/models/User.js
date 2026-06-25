const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const splitName = (value = '') => {
    const parts = String(value || '').trim().split(/\s+/).filter(Boolean);

    return {
        firstName: parts[0] || '',
        lastName: parts.slice(1).join(' '),
    };
};

const getRoleFallbackName = (role = '') => {
    if (role === 'admin') return 'Admin User';
    if (role === 'doctor') return 'Doctor User';
    if (role === 'patient') return 'DocX Patient';
    return 'DocX User';
};

const resolveDisplayName = (doc = {}) => {
    const legacyName = `${doc.firstName || ''} ${doc.lastName || ''}`.trim();
    const emailName = String(doc.email || '').split('@')[0].replace(/[._-]+/g, ' ').trim();

    return String(doc.name || legacyName || emailName || getRoleFallbackName(doc.role)).trim();
};

const userSchema = mongoose.Schema(
    {
        name: {
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
        email: {
            type: String,
            required: true,
            unique: true,
        },
        phone: {
            type: String,
            default: '',
            trim: true,
        },
        password: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            enum: ['patient', 'doctor', 'admin'],
            default: 'patient',
        },
        status: {
            type: String,
            enum: ['pending', 'active', 'rejected', 'blocked'],
            default: 'pending' // Default pending for everyone, but patients get auto-activated
        },
        statusBeforeBlocked: {
            type: String,
            enum: ['pending', 'active', 'rejected', ''],
            default: ''
        },
        rejectionReason: {
            type: String,
            default: ''
        },
        blockedReason: {
            type: String,
            default: ''
        },
        blockedAt: {
            type: Date,
        },
        blockedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        medicalLicenseId: {
            type: String, // For doctors only
        },
        specialization: {
            type: String, // For doctors only
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        googleVerifiedEmail: {
            type: Boolean,
            default: false,
        },
        isProfileComplete: {
            type: Boolean,
            default: false,
        },
        refreshToken: [String],
        resetPasswordToken: String,
        resetPasswordExpire: Date,
        encryption: {
            publicKey: {
                type: mongoose.Schema.Types.Mixed,
                default: null,
            },
            publicKeyAlgorithm: {
                type: String,
                default: '',
            },
            publicKeyUpdatedAt: {
                type: Date,
                default: null,
            },
        },
        membership: {
            status: {
                type: String,
                enum: ['inactive', 'active', 'expired', 'canceled'],
                default: 'inactive',
            },
            planType: {
                type: String,
                enum: ['', 'general', 'premium', 'vip'],
                default: '',
            },
            planName: {
                type: String,
                default: '',
            },
            membershipId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Membership',
            },
            paymentProvider: {
                type: String,
                default: '',
            },
            startedAt: {
                type: Date,
            },
            currentPeriodEnd: {
                type: Date,
            },
            renewedAt: {
                type: Date,
            },
        },
    },
    {
        timestamps: true,
    }
);

userSchema.pre('validate', function () {
    this.name = resolveDisplayName(this);

    const nameParts = splitName(this.name);
    if (!this.firstName) {
        this.firstName = nameParts.firstName;
    }
    if (!this.lastName) {
        this.lastName = nameParts.lastName;
    }
});

userSchema.methods.getDisplayName = function () {
    return resolveDisplayName(this);
};

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Encrypt password using bcrypt
userSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Generate and hash password reset token
userSchema.methods.getResetPasswordToken = function () {
    const crypto = require('crypto');
    // Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Set expire
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
