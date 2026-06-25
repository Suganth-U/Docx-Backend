const express = require("express");
const router = express.Router();
const {
    completeConsultation,
    createConsultationPayHereSession,
    createConsultationRequest,
    createConsultationStripeSession,
    createVirtualSchedule,
    deleteVirtualSchedule,
    getConsultationById,
    getConsultationMeetingAccess,
    getConsultationOptions,
    getConsultations,
    getMyConsultations,
    getMyVirtualSchedules,
    notifyConsultationPayHerePayment,
    payConsultation,
    recordConsultationMeetingEvent,
    respondToConsultation,
    updateConsultationLink,
    verifyConsultationStripeSession,
} = require("../controllers/onlineConsultationController");
const { admin, protect, doctor, optionalProtect } = require("../middleware/authMiddleware");

router.get("/options", getConsultationOptions);
router.post("/requests", optionalProtect, createConsultationRequest);
router.post("/payhere/notify", notifyConsultationPayHerePayment);
router.get("/my", protect, getMyConsultations);

router.get("/schedules/mine", protect, doctor, getMyVirtualSchedules);
router.post("/schedules", protect, doctor, createVirtualSchedule);
router.delete("/schedules/:id", protect, doctor, deleteVirtualSchedule);

router.get("/", protect, getConsultations);
router.get("/:id", optionalProtect, getConsultationById);
router.get("/:id/meeting/access", protect, getConsultationMeetingAccess);
router.post("/:id/meeting/events", protect, recordConsultationMeetingEvent);
router.post("/:id/complete", protect, doctor, completeConsultation);
router.put("/:id/respond", protect, doctor, respondToConsultation);
router.post("/:id/payhere/session", optionalProtect, createConsultationPayHereSession);
router.post("/:id/stripe/session", optionalProtect, createConsultationStripeSession);
router.post("/:id/stripe/verify", optionalProtect, verifyConsultationStripeSession);
router.put("/:id/pay", protect, admin, payConsultation);
router.put("/:id/link", protect, doctor, updateConsultationLink);

module.exports = router;
