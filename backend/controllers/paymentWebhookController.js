/* global module, require */
const asyncHandler = require("express-async-handler");
const Appointment = require("../models/Appointment");
const OnlineConsultation = require("../models/OnlineConsultation");
const Order = require("../models/Order");
const {
  assertStripeSessionMatches,
  constructStripeWebhookEvent,
  verifyPayPalWebhookSignature,
} = require("../utils/paymentGateways");
const {
  markOrderPaid,
  markOrderPaymentFailed,
} = require("./orderController");
const {
  confirmAppointmentFromPayment,
  markAppointmentPaymentFailure,
} = require("./appointmentController");
const {
  emitConsultationUpdated,
  finalizeConsultationPayment,
} = require("./onlineConsultationController");
const {
  handleStripeMembershipCheckout,
} = require("./membershipPaymentController");

const isStripePaidEvent = (eventType) =>
  ["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(eventType);

const isStripeExpiredEvent = (eventType) => eventType === "checkout.session.expired";

const stripePaymentResult = (session, fallback = {}) => ({
  id: session.id,
  status: session.payment_status || session.status,
  update_time: new Date().toISOString(),
  email_address: session.customer_details?.email || fallback.email || "",
  method: "stripe_checkout",
  status_message: fallback.statusMessage || "Stripe webhook verified",
  secureHash: fallback.secureHash || session.metadata?.secureHash || "",
});

const handleStripeOrder = async ({ session, eventType }) => {
  const order = await Order.findById(session.metadata?.targetId || session.client_reference_id);
  if (!order || String(order.gatewayOrderId || "") !== String(session.id)) return;

  assertStripeSessionMatches({
    session,
    targetType: "order",
    targetId: order._id,
    amount: order.totalPrice,
    currency: order.currency,
    secureHash: order.paymentResult?.secureHash || session.metadata?.secureHash,
  });

  if (isStripePaidEvent(eventType) && session.payment_status === "paid") {
    await markOrderPaid(order, {
      paymentProvider: "STRIPE",
      gatewayOrderId: session.id,
      paymentResult: stripePaymentResult(session, {
        email: order.email,
        secureHash: order.paymentResult?.secureHash,
        statusMessage: "Stripe Checkout payment verified by webhook",
      }),
    });
    return;
  }

  if (isStripeExpiredEvent(eventType)) {
    await markOrderPaymentFailed(order, "canceled", {
      paymentProvider: "STRIPE",
      gatewayOrderId: session.id,
      paymentResult: stripePaymentResult(session, {
        secureHash: order.paymentResult?.secureHash,
        statusMessage: "Stripe Checkout session expired",
      }),
    });
  }
};

const handleStripeAppointment = async ({ session, eventType }) => {
  const appointment = await Appointment.findById(session.metadata?.targetId || session.client_reference_id);
  if (!appointment || String(appointment.gatewayOrderId || "") !== String(session.id)) return;

  assertStripeSessionMatches({
    session,
    targetType: "appointment",
    targetId: appointment._id,
    amount: appointment.consultationFeeSnapshot,
    currency: "LKR",
    secureHash: appointment.paymentResult?.secureHash || session.metadata?.secureHash,
  });

  if (isStripePaidEvent(eventType) && session.payment_status === "paid") {
    if (appointment.paymentStatus === "paid" && appointment.status === "confirmed") return;

    await confirmAppointmentFromPayment(appointment, {
      paymentProvider: "STRIPE",
      gatewayOrderId: session.id,
      paymentResult: stripePaymentResult(session, {
        email: appointment.patientEmailSnapshot,
        secureHash: appointment.paymentResult?.secureHash,
        statusMessage: "Stripe Checkout payment verified by webhook",
      }),
      paidAt: new Date(),
    });
    return;
  }

  if (isStripeExpiredEvent(eventType)) {
    await markAppointmentPaymentFailure(appointment, "canceled", {
      paymentProvider: "STRIPE",
      gatewayOrderId: session.id,
      paymentResult: stripePaymentResult(session, {
        secureHash: appointment.paymentResult?.secureHash,
        statusMessage: "Stripe Checkout session expired",
      }),
    });
  }
};

const markConsultationExpired = async (consultation, session) => {
  consultation.paymentProvider = "STRIPE";
  consultation.gatewayOrderId = session.id;
  consultation.paymentResult = stripePaymentResult(session, {
    secureHash: consultation.paymentResult?.secureHash,
    statusMessage: "Stripe Checkout session expired",
  });
  consultation.paymentStatus = "canceled";
  if (consultation.status === "approved") {
    consultation.status = "cancelled";
  }
  consultation.holdExpiresAt = null;
  await consultation.save();
  await emitConsultationUpdated(consultation._id);
};

const handleStripeConsultation = async ({ session, eventType }) => {
  const consultation = await OnlineConsultation.findById(session.metadata?.targetId || session.client_reference_id);
  if (!consultation || String(consultation.gatewayOrderId || "") !== String(session.id)) return;

  assertStripeSessionMatches({
    session,
    targetType: "consultation",
    targetId: consultation._id,
    amount: consultation.consultationFeeSnapshot,
    currency: "LKR",
    secureHash: consultation.paymentResult?.secureHash || session.metadata?.secureHash,
  });

  if (isStripePaidEvent(eventType) && session.payment_status === "paid") {
    if (
      consultation.paymentStatus === "paid" &&
      ["scheduled", "meeting_pending", "completed"].includes(consultation.status)
    ) {
      return;
    }

    await finalizeConsultationPayment(consultation, {
      paymentProvider: "STRIPE",
      gatewayOrderId: session.id,
      paymentResult: stripePaymentResult(session, {
        email: consultation.patientEmailSnapshot,
        secureHash: consultation.paymentResult?.secureHash,
        statusMessage: "Stripe Checkout payment verified by webhook",
      }),
      paidAt: new Date(),
    });
    return;
  }

  if (isStripeExpiredEvent(eventType)) {
    await markConsultationExpired(consultation, session);
  }
};

const handleStripeCheckoutSession = async (session, eventType) => {
  const targetType = String(session.metadata?.targetType || "").toLowerCase();

  if (targetType === "order") {
    await handleStripeOrder({ session, eventType });
  } else if (targetType === "appointment") {
    await handleStripeAppointment({ session, eventType });
  } else if (targetType === "consultation") {
    await handleStripeConsultation({ session, eventType });
  } else if (targetType === "membership") {
    await handleStripeMembershipCheckout({ session, eventType });
  }
};

const handleStripeWebhook = asyncHandler(async (req, res) => {
  let event;
  try {
    event = constructStripeWebhookEvent(req.body, req.headers["stripe-signature"]);
  } catch (error) {
    res.status(error.statusCode || 400).send(error.message || "invalid signature");
    return;
  }

  if (isStripePaidEvent(event.type) || isStripeExpiredEvent(event.type)) {
    await handleStripeCheckoutSession(event.data.object, event.type);
  }

  res.status(200).json({ received: true });
});

const handlePayPalWebhook = asyncHandler(async (req, res) => {
  const verified = await verifyPayPalWebhookSignature({
    headers: req.headers,
    body: req.body,
  });

  if (!verified) {
    res.status(400).send("invalid signature");
    return;
  }

  res.status(200).json({ received: true });
});

module.exports = {
  handlePayPalWebhook,
  handleStripeWebhook,
};
