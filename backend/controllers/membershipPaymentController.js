const asyncHandler = require("express-async-handler");
const Membership = require("../models/Membership");
const User = require("../models/User");
const {
  addOneMonth,
  getMembershipPlan,
  getMembershipTotals,
} = require("../utils/membershipPlans");
const {
  assertStripeSessionMatches,
  createStripeCheckoutSession,
  isStripeConfigured,
  retrieveStripeCheckoutSession,
} = require("../utils/paymentGateways");

const isStripePaidEvent = (eventType) =>
  ["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(eventType);
const isStripeExpiredEvent = (eventType) => eventType === "checkout.session.expired";

const getPlanBenefits = (planType) => {
  const plan = getMembershipPlan(planType);
  return {
    bookingDiscountPercent: plan.bookingDiscountPercent,
    pharmacyDiscountPercent: plan.pharmacyDiscountPercent,
  };
};

const assertCanonicalMembershipCharge = (membership) => {
  const totals = getMembershipTotals(getMembershipPlan(membership.planType));

  if (
    Number(membership.totalAmount) !== Number(totals.totalAmount) ||
    String(membership.currency || "").toUpperCase() !== totals.currency
  ) {
    const error = new Error("Membership checkout amount is out of sync with the selected plan.");
    error.statusCode = 500;
    throw error;
  }
};

const buildMembershipPayload = (membership) => {
  if (!membership) return null;

  const object = typeof membership.toObject === "function" ? membership.toObject() : membership;

  return {
    id: object._id,
    planType: object.planType,
    planName: object.planName,
    status: object.status,
    paymentStatus: object.paymentStatus,
    paymentProvider: object.paymentProvider || "",
    amount: object.amount,
    taxAmount: object.taxAmount,
    totalAmount: object.totalAmount,
    currency: object.currency,
    startedAt: object.startedAt || null,
    currentPeriodStart: object.currentPeriodStart || null,
    currentPeriodEnd: object.currentPeriodEnd || null,
    paidAt: object.paidAt || null,
    ...getPlanBenefits(object.planType),
  };
};

const assertMembershipOwner = (membership, req) => {
  if (!req.user || String(membership.user) !== String(req.user._id)) {
    const error = new Error("Please sign in with the patient account that started this membership checkout.");
    error.statusCode = 403;
    throw error;
  }
};

const expireMembershipIfNeeded = async (membership) => {
  if (
    !membership ||
    membership.status !== "active" ||
    !membership.currentPeriodEnd ||
    new Date(membership.currentPeriodEnd).getTime() > Date.now()
  ) {
    return membership;
  }

  membership.status = "expired";
  await membership.save();

  await User.updateOne(
    {
      _id: membership.user,
      "membership.membershipId": membership._id,
    },
    {
      $set: {
        "membership.status": "expired",
        "membership.planType": "",
        "membership.planName": "",
        "membership.paymentProvider": "",
      },
    }
  );

  return membership;
};

const createPendingMembership = ({ user, planType, provider }) => {
  const plan = getMembershipPlan(planType);
  const totals = getMembershipTotals(plan);

  return new Membership({
    user: user._id,
    planType: plan.key,
    planName: plan.name,
    status: "pending",
    paymentStatus: "pending",
    paymentProvider: provider,
    ...totals,
  });
};

const activateMembership = async (membership, paymentUpdate = {}) => {
  if (membership.paymentStatus === "paid" && membership.status === "active") {
    return membership;
  }

  const now = new Date();
  const user = await User.findById(membership.user);
  const existingPeriodEnd = user?.membership?.currentPeriodEnd
    ? new Date(user.membership.currentPeriodEnd)
    : null;
  const renewFromExistingPeriod =
    user?.membership?.status === "active" &&
    user?.membership?.planType === membership.planType &&
    existingPeriodEnd &&
    existingPeriodEnd.getTime() > now.getTime();
  const currentPeriodEnd = addOneMonth(renewFromExistingPeriod ? existingPeriodEnd : now);

  membership.status = "active";
  membership.paymentStatus = "paid";
  membership.paymentProvider = paymentUpdate.paymentProvider || membership.paymentProvider;
  membership.gatewaySessionId = paymentUpdate.gatewaySessionId || membership.gatewaySessionId;
  membership.gatewaySubscriptionId =
    paymentUpdate.gatewaySubscriptionId || membership.gatewaySubscriptionId;
  membership.gatewayCustomerId = paymentUpdate.gatewayCustomerId || membership.gatewayCustomerId;
  membership.paymentResult = paymentUpdate.paymentResult || membership.paymentResult;
  membership.startedAt = membership.startedAt || now;
  membership.currentPeriodStart = now;
  membership.currentPeriodEnd = currentPeriodEnd;
  membership.paidAt = paymentUpdate.paidAt || now;
  await membership.save();

  if (user) {
    user.membership = {
      status: "active",
      planType: membership.planType,
      planName: membership.planName,
      membershipId: membership._id,
      paymentProvider: membership.paymentProvider,
      startedAt: membership.startedAt,
      currentPeriodEnd: membership.currentPeriodEnd,
      renewedAt: now,
    };
    await user.save();
  }

  return membership;
};

const markMembershipPaymentFailed = async (membership, paymentStatus, paymentResult = {}) => {
  membership.status = paymentStatus === "expired" ? "expired" : "failed";
  membership.paymentStatus = paymentStatus;
  membership.paymentProvider = paymentResult.paymentProvider || membership.paymentProvider;
  membership.gatewaySessionId = paymentResult.gatewaySessionId || membership.gatewaySessionId;
  membership.paymentResult = paymentResult.paymentResult || membership.paymentResult;
  await membership.save();
  return membership;
};

const getMembershipByCheckout = async ({ membershipId, sessionId }) => {
  if (membershipId) {
    return Membership.findById(membershipId);
  }

  if (sessionId) {
    return Membership.findOne({ gatewaySessionId: sessionId });
  }

  return null;
};

const getCurrentOrLatestMembership = async (userId) => {
  const activeMembership = await Membership.findOne({
    user: userId,
    status: "active",
    currentPeriodEnd: { $gt: new Date() },
  }).sort({ currentPeriodEnd: -1 });

  if (activeMembership) {
    return activeMembership;
  }

  return Membership.findOne({ user: userId }).sort({ createdAt: -1 });
};

const stripePaymentResult = (session, membership, statusMessage) => ({
  id: session.id,
  status: session.payment_status || session.status,
  update_time: new Date().toISOString(),
  email_address: session.customer_details?.email || "",
  method: "stripe_checkout",
  status_message: statusMessage,
  secureHash: membership.paymentResult?.secureHash || session.metadata?.secureHash || "",
});

const getMyMembership = asyncHandler(async (req, res) => {
  const membership = await getCurrentOrLatestMembership(req.user._id);
  const syncedMembership = await expireMembershipIfNeeded(membership);

  res.json({
    membership: buildMembershipPayload(syncedMembership),
  });
});

const createMembershipStripeSession = asyncHandler(async (req, res) => {
  if (!isStripeConfigured()) {
    res.status(503);
    throw new Error("Stripe checkout is not configured. Add STRIPE_SECRET_KEY on the server.");
  }

  const membership = createPendingMembership({
    user: req.user,
    planType: req.body.planType,
    provider: "STRIPE",
  });
  assertCanonicalMembershipCharge(membership);

  const successPath = `/membership-checkout?plan=${membership.planType}&membershipId=${membership._id}`;
  const session = await createStripeCheckoutSession({
    targetType: "membership",
    targetId: membership._id,
    amount: membership.totalAmount,
    currency: membership.currency,
    label: `DocX ${membership.planName} membership`,
    customerEmail: req.user.email,
    successPath,
    cancelPath: successPath,
    frontendOrigin: req.get("origin") || req.body.origin || "",
    mode: "subscription",
    recurringInterval: "month",
    metadata: {
      userId: String(req.user._id),
      planType: membership.planType,
    },
  });

  membership.gatewaySessionId = session.id;
  membership.paymentResult = {
    id: session.id,
    status: "pending",
    update_time: new Date().toISOString(),
    method: "stripe_checkout",
    status_message: "Stripe Checkout session created",
    secureHash: session.secureHash,
    checkoutUrl: session.checkoutUrl,
  };
  await membership.save();

  res.status(201).json({
    membershipId: membership._id,
    provider: "STRIPE",
    checkoutUrl: session.checkoutUrl,
    sessionId: session.id,
  });
});

const activateDemoMembership = asyncHandler(async (req, res) => {
  const membership = createPendingMembership({
    user: req.user,
    planType: req.body.planType,
    provider: "DEMO",
  });

  membership.paymentResult = {
    id: `demo-membership-${membership._id}`,
    status: "paid",
    update_time: new Date().toISOString(),
    method: "demo_payment",
    status_message: "Demo membership payment approved",
  };
  await membership.save();

  const updatedMembership = await activateMembership(membership, {
    paymentProvider: "DEMO",
    paymentResult: membership.paymentResult,
    paidAt: new Date(),
  });

  res.status(201).json({
    status: "paid",
    provider: "DEMO",
    membership: buildMembershipPayload(updatedMembership),
  });
});

const verifyMembershipStripeSession = asyncHandler(async (req, res) => {
  const sessionId = req.body.sessionId || req.query.session_id;
  const membership = await getMembershipByCheckout({
    membershipId: req.body.membershipId || req.query.membershipId,
    sessionId,
  });

  if (!membership) {
    res.status(404);
    throw new Error("Membership checkout not found.");
  }

  assertMembershipOwner(membership, req);

  if (!sessionId || String(sessionId) !== String(membership.gatewaySessionId)) {
    res.status(400);
    throw new Error("Stripe checkout session does not match this membership.");
  }

  if (membership.paymentStatus === "paid" && membership.status === "active") {
    res.json({
      status: "paid",
      provider: "STRIPE",
      membership: buildMembershipPayload(membership),
    });
    return;
  }

  const session = await retrieveStripeCheckoutSession(sessionId);
  assertStripeSessionMatches({
    session,
    targetType: "membership",
    targetId: membership._id,
    amount: membership.totalAmount,
    currency: membership.currency,
    secureHash: membership.paymentResult?.secureHash,
  });

  if (session.payment_status === "paid") {
    const updatedMembership = await activateMembership(membership, {
      paymentProvider: "STRIPE",
      gatewaySessionId: session.id,
      gatewaySubscriptionId:
        typeof session.subscription === "string" ? session.subscription : session.subscription?.id || "",
      gatewayCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id || "",
      paymentResult: stripePaymentResult(session, membership, "Stripe Checkout membership verified"),
      paidAt: new Date(),
    });

    res.json({
      status: "paid",
      provider: "STRIPE",
      membership: buildMembershipPayload(updatedMembership),
    });
    return;
  }

  if (session.status === "expired") {
    await markMembershipPaymentFailed(membership, "expired", {
      paymentProvider: "STRIPE",
      gatewaySessionId: session.id,
      paymentResult: stripePaymentResult(session, membership, "Stripe Checkout session expired"),
    });
  }

  res.status(409).json({
    status: membership.paymentStatus,
    provider: "STRIPE",
    membership: buildMembershipPayload(membership),
    message: "Membership payment has not been completed.",
  });
});

const handleStripeMembershipCheckout = async ({ session, eventType }) => {
  const membership = await Membership.findById(session.metadata?.targetId || session.client_reference_id);
  if (!membership || String(membership.gatewaySessionId || "") !== String(session.id)) return;

  assertStripeSessionMatches({
    session,
    targetType: "membership",
    targetId: membership._id,
    amount: membership.totalAmount,
    currency: membership.currency,
    secureHash: membership.paymentResult?.secureHash || session.metadata?.secureHash,
  });

  if (isStripePaidEvent(eventType) && session.payment_status === "paid") {
    await activateMembership(membership, {
      paymentProvider: "STRIPE",
      gatewaySessionId: session.id,
      gatewaySubscriptionId:
        typeof session.subscription === "string" ? session.subscription : session.subscription?.id || "",
      gatewayCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id || "",
      paymentResult: stripePaymentResult(
        session,
        membership,
        "Stripe Checkout membership verified by webhook"
      ),
      paidAt: new Date(),
    });
    return;
  }

  if (isStripeExpiredEvent(eventType)) {
    await markMembershipPaymentFailed(membership, "expired", {
      paymentProvider: "STRIPE",
      gatewaySessionId: session.id,
      paymentResult: stripePaymentResult(session, membership, "Stripe Checkout session expired"),
    });
  }
};

module.exports = {
  activateDemoMembership,
  activateMembership,
  buildMembershipPayload,
  createMembershipStripeSession,
  getMyMembership,
  handleStripeMembershipCheckout,
  verifyMembershipStripeSession,
};
