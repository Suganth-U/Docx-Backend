const express = require("express");
const {
  handleStripeWebhook,
} = require("../controllers/paymentWebhookController");

const router = express.Router();

router.post("/stripe", express.raw({ type: "application/json" }), handleStripeWebhook);

module.exports = router;
