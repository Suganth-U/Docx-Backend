const {
    sendAdminTemplatedEmail,
    sendTemplatedEmail,
} = require('../utils/email/dispatcher');
const asyncHandler = require('express-async-handler');
const Medicine = require('../models/Medicine');
const Order = require('../models/Order');
const EPrescription = require('../models/EPrescription');
const Notification = require('../models/Notification');

// ─────────────────────────────────────────────────────────────────────────────
// LOW STOCK ALERTS — Real-time inventory monitoring
// GET /api/admin/pharmacy/low-stock
// ─────────────────────────────────────────────────────────────────────────────
const getLowStockMedicines = asyncHandler(async (req, res) => {
    const medicines = await Medicine.find({
        $expr: { $lte: ['$stock', '$reorderLevel'] }
    }).sort({ stock: 1 });

    res.json(medicines);
});

// ─────────────────────────────────────────────────────────────────────────────
// REFILL / RESTOCK — Add stock to medicine
// PUT /api/admin/pharmacy/refill/:id
// ─────────────────────────────────────────────────────────────────────────────
const refillMedicine = asyncHandler(async (req, res) => {
    const { quantity } = req.body;
    const medicine = await Medicine.findById(req.params.id);

    if (!medicine) {
        res.status(404);
        throw new Error('Medicine not found');
    }

    const addQty = quantity || medicine.reorderQuantity || 100;
    medicine.stock += addQty;
    medicine.lastRestockedAt = new Date();
    await medicine.save();

    res.json({
        message: `Restocked ${addQty} units of ${medicine.name}. New stock: ${medicine.stock}`,
        medicine,
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PHARMACY STATS — Dashboard summary
// GET /api/admin/pharmacy/stats
// ─────────────────────────────────────────────────────────────────────────────
const getPharmacyStats = asyncHandler(async (req, res) => {
    const totalMedicines = await Medicine.countDocuments();
    const totalStock = await Medicine.aggregate([{ $group: { _id: null, total: { $sum: '$stock' } } }]);
    const lowStockCount = await Medicine.countDocuments({
        $expr: { $lte: ['$stock', '$reorderLevel'] }
    });
    const prescriptionMeds = await Medicine.countDocuments({ requiresPrescription: true });
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ isPaid: false });
    const deliveredOrders = await Order.countDocuments({ isDelivered: true });

    // Pending e-prescriptions from EHR
    let pendingEPrescriptions = 0;
    try {
        pendingEPrescriptions = await EPrescription.countDocuments({ status: 'PENDING_PHARMACY' });
    } catch (e) { /* EPrescription might not exist yet */ }

    res.json({
        totalMedicines,
        totalStock: totalStock[0]?.total || 0,
        lowStockCount,
        prescriptionMeds,
        totalOrders,
        pendingOrders,
        deliveredOrders,
        pendingEPrescriptions,
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ALL ORDERS — Admin order history with filters
// GET /api/admin/pharmacy/orders?status=paid|unpaid|delivered
// ─────────────────────────────────────────────────────────────────────────────
const getAllOrders = asyncHandler(async (req, res) => {
    const { status } = req.query;
    let filter = {};

    if (status === 'paid') filter.isPaid = true;
    else if (status === 'unpaid') filter.isPaid = false;
    if (status === 'delivered') filter.isDelivered = true;

    const orders = await Order.find(filter)
        .populate('user', 'name email')
        .sort({ createdAt: -1 });

    res.json(orders);
});

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE ORDER STATUS — Mark as delivered
// PUT /api/admin/pharmacy/orders/:id/deliver
// ─────────────────────────────────────────────────────────────────────────────
const markOrderDelivered = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    order.isDelivered = true;
    order.deliveredAt = new Date();
    const updated = await order.save();

    // 📧 Order Delivered
    await sendTemplatedEmail({
        eventKey: 'PHARMACY_ORDER_DELIVERED',
        recipient: updated.email,
        data: { patientName: updated.fullName || 'Valued Customer', orderId: updated._id.toString() },
        dedupeKey: `order-delivered:${updated._id}`,
        relatedEntity: updated._id,
        relatedEntityModel: 'Order',
        category: 'transactional'
    });


    res.json({ message: 'Order marked as delivered', order: updated });
});

// ─────────────────────────────────────────────────────────────────────────────
// PRESCRIPTION VERIFICATION — Orders containing Rx-required medicines
// GET /api/admin/pharmacy/rx-verification
// ─────────────────────────────────────────────────────────────────────────────
const getOrdersNeedingVerification = asyncHandler(async (req, res) => {
    // Get all prescription-required medicine IDs
    const rxMedicines = await Medicine.find({ requiresPrescription: true }).select('_id name');
    const rxMedIds = rxMedicines.map(m => m._id.toString());
    const rxMedNames = {};
    rxMedicines.forEach(m => { rxMedNames[m._id.toString()] = m.name; });

    // Find unpaid or undelivered orders that contain prescription medicines
    const allOrders = await Order.find({ isDelivered: false })
        .populate('user', 'name email')
        .sort({ createdAt: -1 });

    const flaggedOrders = allOrders.filter(order =>
        order.orderItems.some(item =>
            rxMedIds.includes(item.medicine.toString())
        )
    ).map(order => {
        const rxItems = order.orderItems.filter(item =>
            rxMedIds.includes(item.medicine.toString())
        ).map(item => ({
            ...item.toObject(),
            medicineName: rxMedNames[item.medicine.toString()] || item.name,
        }));

        return {
            ...order.toObject(),
            rxItems,
            requiresVerification: true,
        };
    });

    res.json(flaggedOrders);
});

// ─────────────────────────────────────────────────────────────────────────────
// VERIFY & APPROVE ORDER — Admin approves Rx order
// PUT /api/admin/pharmacy/orders/:id/verify
// ─────────────────────────────────────────────────────────────────────────────
const verifyAndApproveOrder = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    // Mark as paid (approved by admin/pharmacist)
    order.isPaid = true;
    order.paidAt = new Date();
    const updated = await order.save();

    // 📧 Order Verified Update
    await sendTemplatedEmail({
        eventKey: 'PHARMACY_VERIFICATION_UPDATE',
        recipient: updated.email,
        data: { patientName: updated.fullName || 'Valued Customer', orderId: updated._id.toString(), status: 'Approved & Finalized' },
        dedupeKey: `order-verified:${updated._id}`,
        relatedEntity: updated._id,
        relatedEntityModel: 'Order',
        category: 'transactional'
    });


    // Deduct stock for each item
    for (const item of order.orderItems) {
        await Medicine.findByIdAndUpdate(item.medicine, {
            $inc: { stock: -(item.qty || 1) }
        });
    }

    // Check for low stock after deduction and create notifications
    for (const item of order.orderItems) {
        const med = await Medicine.findById(item.medicine);
        if (med && med.stock <= med.reorderLevel) {
            await Notification.create({
                type: 'LOW_STOCK_ALERT',
                title: 'Low Stock Alert',
                message: `${med.name} is low on stock (${med.stock} remaining). Reorder level: ${med.reorderLevel}.`,
                link: '/admin/pharmacy'
            });

            await sendAdminTemplatedEmail({
                eventKey: 'SYSTEM_LOW_STOCK',
                data: {
                    items: [{ name: med.name, stock: med.stock }],
                },
                dedupeKey: `low-stock-immediate:${med._id}:${med.stock}`,
                relatedEntity: med._id,
                relatedEntityModel: 'Medicine',
                category: 'lowStock',
            });
        }
    }

    res.json({ message: 'Order verified, approved, and stock deducted.', order: updated });
});

module.exports = {
    getLowStockMedicines,
    refillMedicine,
    getPharmacyStats,
    getAllOrders,
    markOrderDelivered,
    getOrdersNeedingVerification,
    verifyAndApproveOrder,
};
