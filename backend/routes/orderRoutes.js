const express = require("express");
const router = express.Router();
const {
    addOrderItems,
    uploadPrescriptionProof,
    createPayHereSession,
    createStripeSession,
    notifyPayHerePayment,
    getOrderById,
    updateOrderToPaid,
    verifyStripeSession,
    getMyOrders,
} = require("../controllers/orderController");
const { admin, optionalProtect, protect } = require("../middleware/authMiddleware");
const { parsePrescriptionProofUpload } = require("../middleware/uploadMiddleware");

router.route("/").post(optionalProtect, addOrderItems);
router.route("/myorders").get(protect, getMyOrders);
router.route("/prescription-upload").post(optionalProtect, parsePrescriptionProofUpload, uploadPrescriptionProof);
router.route("/payhere/session").post(optionalProtect, createPayHereSession);
router.route("/payhere/notify").post(notifyPayHerePayment);
router.route("/stripe/session").post(protect, createStripeSession);
router.route("/:id/stripe/verify").post(protect, verifyStripeSession);
router.route("/:id").get(optionalProtect, getOrderById);
router.route("/:id/pay").put(protect, admin, updateOrderToPaid);

module.exports = router;
