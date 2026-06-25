const express = require('express');
const router = express.Router();
const {
    getLowStockMedicines,
    refillMedicine,
    getPharmacyStats,
    getAllOrders,
    markOrderDelivered,
    getOrdersNeedingVerification,
    verifyAndApproveOrder,
} = require('../controllers/pharmacyAdminController');
const { protect, admin } = require('../middleware/authMiddleware');


router.get('/stats', protect, admin, getPharmacyStats);


router.get('/low-stock', protect, admin, getLowStockMedicines);

router.put('/refill/:id', protect, admin, refillMedicine);

router.get('/orders', protect, admin, getAllOrders);
router.put('/orders/:id/deliver', protect, admin, markOrderDelivered);

router.get('/rx-verification', protect, admin, getOrdersNeedingVerification);
router.put('/orders/:id/verify', protect, admin, verifyAndApproveOrder);

module.exports = router;
