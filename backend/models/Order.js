const mongoose = require('mongoose');

const orderSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        orderItems: [
            {
                name: { type: String, required: true },
                qty: { type: Number, required: true },
                image: { type: String, required: true },
                price: { type: Number, required: true },
                medicine: {
                    type: mongoose.Schema.Types.ObjectId,
                    required: true,
                    ref: 'Medicine',
                },
                prescriptionRequest: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'PrescriptionRequest',
                },
                prescription: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Prescription',
                },
                prescriptionUpload: {
                    source: { type: String, default: 'patient_upload' },
                    fileName: { type: String, default: '' },
                    fileType: { type: String, default: '' },
                    fileSize: { type: Number, default: 0 },
                    uploadedAt: { type: Date },
                    fileUrl: { type: String, default: '' },
                    storageName: { type: String, default: '' },
                    patientName: { type: String, default: '' },
                    patientPhone: { type: String, default: '' },
                    notes: { type: String, default: '' },
                },
            },
        ],
        fullName: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        phone: {
            type: String,
            required: true,
        },
        shippingAddress: {
            addressLine1: { type: String, required: true },
            addressLine2: { type: String, default: '' },
            city: { type: String, required: true },
            postalCode: { type: String, required: true },
            country: { type: String, required: true },
            deliveryNotes: { type: String, default: '' },
        },
        paymentMethod: {
            type: String,
            required: true,
        },
        paymentProvider: {
            type: String,
            default: 'COD',
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'failed', 'canceled', 'chargedback'],
            default: 'pending',
        },
        gatewayOrderId: {
            type: String,
        },
        paymentResult: {
            id: String,
            status: String,
            update_time: String,
            email_address: String,
            method: String,
            status_message: String,
            secureHash: String,
            checkoutUrl: String,
        },
        itemsPrice: {
            type: Number,
            required: true,
            default: 0.0,
        },
        taxPrice: {
            type: Number,
            required: true,
            default: 0.0,
        },
        shippingPrice: {
            type: Number,
            required: true,
            default: 0.0,
        },
        totalPrice: {
            type: Number,
            required: true,
            default: 0.0,
        },
        isPaid: {
            type: Boolean,
            required: true,
            default: false,
        },
        paidAt: {
            type: Date,
        },
        isDelivered: {
            type: Boolean,
            required: true,
            default: false,
        },
        deliveredAt: {
            type: Date,
        },
        currency: {
            type: String,
            default: 'LKR',
        },
    },
    {
        timestamps: true,
    }
);

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
