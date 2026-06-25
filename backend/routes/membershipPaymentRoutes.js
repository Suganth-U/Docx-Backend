const express = require("express");
const {
  activateDemoMembership,
  createMembershipStripeSession,
  getMyMembership,
  verifyMembershipStripeSession,
} = require("../controllers/membershipPaymentController");
const { patient, protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, patient);

router.get("/me", getMyMembership);
router.post("/demo/activate", activateDemoMembership);
router.post("/stripe/session", createMembershipStripeSession);
router.post("/stripe/verify", verifyMembershipStripeSession);

module.exports = router;
