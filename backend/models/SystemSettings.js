const mongoose = require('mongoose');

const systemSettingsSchema = mongoose.Schema(
    {
        // General Settings
        hospitalName: { type: String, default: 'DocX Medical Center' },
        hospitalEmail: { type: String, default: 'admin@docx.com' },
        hospitalPhone: { type: String, default: '+1 (555) 000-0000' },
        hospitalAddress: { type: String, default: '123 Medical Drive, Healthcare City' },
        hospitalWebsite: { type: String, default: 'https://docx.com' },
        timezone: { type: String, default: 'Asia/Kolkata' },
        dateFormat: { type: String, default: 'DD/MM/YYYY' },
        language: { type: String, default: 'English' },

        // Security Settings
        twoFactorAuth: { type: Boolean, default: true },
        forcePasswordReset: { type: Boolean, default: true },
        passwordResetDays: { type: Number, default: 90 },
        sessionTimeout: { type: Number, default: 30 }, // minutes
        maxLoginAttempts: { type: Number, default: 5 },
        ipWhitelisting: { type: Boolean, default: false },

        // Notification Settings
        emailNotifications: { type: Boolean, default: true },
        smsNotifications: { type: Boolean, default: false },
        appointmentReminders: { type: Boolean, default: true },
        reminderHours: { type: Number, default: 24 },
        lowStockAlerts: { type: Boolean, default: true },
        systemAlerts: { type: Boolean, default: true },

        // Maintenance Settings
        maintenanceMode: { type: Boolean, default: false },
        maintenanceMessage: { type: String, default: 'System is currently under maintenance. Please try again later.' },
        autoBackup: { type: Boolean, default: true },
        backupFrequency: { type: String, default: 'daily' }, // daily, weekly, monthly
        dataRetentionDays: { type: Number, default: 365 },
    },
    {
        timestamps: true,
    }
);

const SystemSettings = mongoose.model('SystemSettings', systemSettingsSchema);

module.exports = SystemSettings;
