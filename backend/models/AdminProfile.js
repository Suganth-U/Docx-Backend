const mongoose = require('mongoose');

const splitName = (value = '') => {
    const parts = String(value || '').trim().split(/\s+/).filter(Boolean);

    return {
        firstName: parts[0] || '',
        lastName: parts.slice(1).join(' '),
    };
};

const adminProfileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
        unique: true
    },
    name: {
        type: String,
        default: 'Admin User',
        trim: true
    },
    firstName: {
        type: String,
        default: '',
        trim: true
    },
    lastName: {
        type: String,
        default: '',
        trim: true
    },
    username: {
        type: String,
        default: 'admin_user'
    },
    phone: {
        type: String,
        default: ''
    },
    address: {
        type: String,
        default: ''
    },
    dob: {
        type: String,
        default: ''
    },
    bio: {
        type: String,
        default: 'Experienced Administrator with a focus on healthcare management.'
    }
}, {
    timestamps: true
});

adminProfileSchema.pre('validate', function () {
    const legacyName = `${this.firstName || ''} ${this.lastName || ''}`.trim();
    this.name = String(this.name || legacyName || 'Admin User').trim();

    const nameParts = splitName(this.name);
    if (!this.firstName) {
        this.firstName = nameParts.firstName;
    }
    if (!this.lastName) {
        this.lastName = nameParts.lastName;
    }

});

const AdminProfile = mongoose.model('AdminProfile', adminProfileSchema);
module.exports = AdminProfile;
