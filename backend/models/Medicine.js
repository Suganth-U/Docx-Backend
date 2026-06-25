const mongoose = require('mongoose');

const medicineSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        price: {
            type: Number,
            required: true,
            default: 0,
        },
        category: {
            type: String,
            required: true,
        },
        requiresPrescription: {
            type: Boolean,
            required: true,
            default: false,
        },
        isHighRisk: {
            type: Boolean,
            default: false,
        },
        restrictedPrescriptionCategory: {
            type: String,
            default: '',
            trim: true,
        },
        stock: {
            type: Number,
            required: true,
            default: 0,
        },
        image: {
            type: String,
            required: true,
        },
        manufacturer: {
            type: String,
            required: true,
        },
        // ── Refill / Reorder Fields ──
        reorderLevel: {
            type: Number,
            default: 50,  // Threshold below which we trigger low-stock alert
        },
        reorderQuantity: {
            type: Number,
            default: 100, // How many units to reorder
        },
        lastRestockedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

const Medicine = mongoose.model('Medicine', medicineSchema);

module.exports = Medicine;
