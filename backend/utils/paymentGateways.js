/* global Buffer, module, process, require */
const crypto = require("crypto");
const axios = require("axios");
const Stripe = require("stripe");

const STRIPE_API_VERSION = "2026-02-25.clover";

const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif",
  "clp",
  "djf",
  "gnf",
  "jpy",
  "kmf",
  "krw",
  "mga",
  "pyg",
  "rwf",
  "ugx",
  "vnd",
  "vuv",
  "xaf",
  "xof",
  "xpf",
]);

const normalizeBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return String(value).toLowerCase() === "true";
};

const normalizeCurrency = (currency = "LKR") => String(currency || "LKR").trim().toUpperCase();

const formatAmount = (amount) => Number(amount || 0).toFixed(2);

const toStripeMinorUnits = (amount, currency = "LKR") => {
  const normalizedCurrency = normalizeCurrency(currency).toLowerCase();
  const multiplier = ZERO_DECIMAL_CURRENCIES.has(normalizedCurrency) ? 1 : 100;
  return Math.round(Number(amount || 0) * multiplier);
};

const getFrontendBase = (frontendOrigin = "") =>
  String(frontendOrigin || process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");

const getPaymentSecret = () => {
  const secret = process.env.PAYMENT_HMAC_SECRET || process.env.JWT_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("PAYMENT_HMAC_SECRET or JWT_SECRET must be configured for production payments.");
  }

  return "docx_payment_development_secret";
};

const createPaymentSignature = ({
  provider,
  targetType,
  targetId,
  amount,
  currency,
}) =>
  crypto
    .createHmac("sha256", getPaymentSecret())
    .update(
      [
        String(provider || "").toUpperCase(),
        String(targetType || "").toLowerCase(),
        String(targetId || ""),
        formatAmount(amount),
        normalizeCurrency(currency),
      ].join("|")
    )
    .digest("hex");

const verifyPaymentSignature = (expected, payload) => {
  if (!expected) return false;
  const actual = createPaymentSignature(payload);
  if (Buffer.byteLength(expected) !== Buffer.byteLength(actual)) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
};

const createIdempotencyKey = (payload = {}) =>
  crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
    .slice(0, 64);

const getStripeClient = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: STRIPE_API_VERSION,
  });
};

const isStripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);

const createStripeCheckoutSession = async ({
  targetType,
  targetId,
  amount,
  currency = "LKR",
  label,
  customerEmail,
  successPath,
  cancelPath,
  frontendOrigin,
  metadata = {},
  mode = "payment",
  recurringInterval = "month",
}) => {
  const stripe = getStripeClient();
  if (!stripe) {
    const error = new Error("Stripe is not configured.");
    error.statusCode = 503;
    throw error;
  }

  const normalizedCurrency = normalizeCurrency(currency);
  const signature = createPaymentSignature({
    provider: "STRIPE",
    targetType,
    targetId,
    amount,
    currency: normalizedCurrency,
  });
  const baseUrl = getFrontendBase(frontendOrigin);
  const successUrl = `${baseUrl}${successPath}${successPath.includes("?") ? "&" : "?"}payment=submitted&provider=stripe&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${baseUrl}${cancelPath}${cancelPath.includes("?") ? "&" : "?"}payment=canceled&provider=stripe`;
  const normalizedMode = mode === "subscription" ? "subscription" : "payment";
  const sessionMetadata = {
    ...metadata,
    targetType,
    targetId: String(targetId),
    amount: formatAmount(amount),
    currency: normalizedCurrency,
    secureHash: signature,
  };
  const priceData = {
    currency: normalizedCurrency.toLowerCase(),
    product_data: {
      name: label || "DocX payment",
      description: "Secure payment processed by DocX Health Platform",
    },
    unit_amount: toStripeMinorUnits(amount, normalizedCurrency),
  };

  if (normalizedMode === "subscription") {
    priceData.recurring = { interval: recurringInterval };
  }

  const sessionPayload = {
    mode: normalizedMode,
    client_reference_id: String(targetId),
    customer_email: customerEmail || undefined,
    success_url: successUrl,
    cancel_url: cancelUrl,
    custom_text: {
      submit: { message: "Your payment will be confirmed immediately after checkout." },
      after_submit: { message: "Thank you for choosing DocX — your trusted health platform." },
    },
    line_items: [
      {
        price_data: priceData,
        quantity: 1,
      },
    ],
    metadata: sessionMetadata,
  };

  if (normalizedMode === "subscription") {
    sessionPayload.subscription_data = {
      metadata: sessionMetadata,
    };
  } else {
    sessionPayload.submit_type = "pay";
    sessionPayload.payment_intent_data = {
      metadata: {
        targetType,
        targetId: String(targetId),
        secureHash: signature,
      },
    };
  }

  const session = await stripe.checkout.sessions.create(
    sessionPayload,
    {
      idempotencyKey: createIdempotencyKey({
        provider: "stripe",
        targetType,
        targetId,
        amount: formatAmount(amount),
        currency: normalizedCurrency,
        mode: normalizedMode,
      }),
    }
  );

  return {
    id: session.id,
    checkoutUrl: session.url,
    secureHash: signature,
    provider: "STRIPE",
  };
};

const retrieveStripeCheckoutSession = async (sessionId) => {
  const stripe = getStripeClient();
  if (!stripe) {
    const error = new Error("Stripe is not configured.");
    error.statusCode = 503;
    throw error;
  }

  return stripe.checkout.sessions.retrieve(sessionId);
};

const constructStripeWebhookEvent = (rawBody, signature) => {
  const stripe = getStripeClient();
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    const error = new Error("Stripe webhook verification is not configured.");
    error.statusCode = 503;
    throw error;
  }

  return stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
};

const assertStripeSessionMatches = ({
  session,
  targetType,
  targetId,
  amount,
  currency,
  secureHash,
}) => {
  if (!session) {
    throw new Error("Stripe checkout session was not found.");
  }

  if (String(session.client_reference_id || "") !== String(targetId)) {
    throw new Error("Stripe checkout session does not match this record.");
  }

  if (String(session.metadata?.targetType || "") !== String(targetType)) {
    throw new Error("Stripe checkout session type mismatch.");
  }

  if (String(session.metadata?.targetId || "") !== String(targetId)) {
    throw new Error("Stripe checkout session record mismatch.");
  }

  if (secureHash && String(session.metadata?.secureHash || "") !== String(secureHash)) {
    throw new Error("Stripe checkout session signature mismatch.");
  }

  const expectedAmount = toStripeMinorUnits(amount, currency);
  if (Number(session.amount_total || 0) !== expectedAmount) {
    throw new Error("Stripe checkout amount mismatch.");
  }

  if (normalizeCurrency(session.currency) !== normalizeCurrency(currency)) {
    throw new Error("Stripe checkout currency mismatch.");
  }
};

const getPayPalBaseUrl = () =>
  normalizeBoolean(process.env.PAYPAL_LIVE, false) ||
  String(process.env.PAYPAL_MODE || "").toLowerCase() === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

// PayPal does not support LKR. Convert to USD using env-configurable rate.
const LKR_TO_USD_RATE = parseFloat(process.env.LKR_TO_USD_RATE || "300");
const toPayPalAmount = (amount, currency) => {
  const cur = normalizeCurrency(currency);
  if (cur === "LKR") {
    return { value: formatAmount(amount / LKR_TO_USD_RATE), currency_code: "USD" };
  }
  return { value: formatAmount(amount), currency_code: cur };
};

const isPayPalConfigured = () =>
  Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);

const getPayPalAccessToken = async () => {
  if (!isPayPalConfigured()) {
    const error = new Error("PayPal is not configured.");
    error.statusCode = 503;
    throw error;
  }

  const response = await axios.post(
    `${getPayPalBaseUrl()}/v1/oauth2/token`,
    "grant_type=client_credentials",
    {
      auth: {
        username: process.env.PAYPAL_CLIENT_ID,
        password: process.env.PAYPAL_CLIENT_SECRET,
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  return response.data.access_token;
};

const createPayPalOrder = async ({
  targetType,
  targetId,
  amount,
  currency = "LKR",
  label,
  returnPath,
  cancelPath,
  frontendOrigin,
}) => {
  const normalizedCurrency = normalizeCurrency(currency);
  const signature = createPaymentSignature({
    provider: "PAYPAL",
    targetType,
    targetId,
    amount,
    currency: normalizedCurrency,
  });
  const baseUrl = getFrontendBase(frontendOrigin);
  const accessToken = await getPayPalAccessToken();
  const paypalAmount = toPayPalAmount(amount, normalizedCurrency);

  console.log("[PayPal] Creating order:", {
    targetId,
    originalAmount: amount,
    originalCurrency: normalizedCurrency,
    paypalAmount,
    baseUrl,
  });

  let response;
  try {
    response = await axios.post(
      `${getPayPalBaseUrl()}/v2/checkout/orders`,
      {
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: String(targetId),
            custom_id: signature,
            description: label || "DocX payment",
            amount: paypalAmount,
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: "DocX",
              landing_page: "LOGIN",
              shipping_preference: "NO_SHIPPING",
              user_action: "PAY_NOW",
              return_url: `${baseUrl}${returnPath}${returnPath.includes("?") ? "&" : "?"}payment=submitted&provider=paypal`,
              cancel_url: `${baseUrl}${cancelPath}${cancelPath.includes("?") ? "&" : "?"}payment=canceled&provider=paypal`,
            },
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "PayPal-Request-Id": createIdempotencyKey({
            provider: "paypal",
            targetType,
            targetId,
            amount: formatAmount(amount),
            currency: normalizedCurrency,
          }),
        },
      }
    );
  } catch (err) {
    const paypalError = err.response?.data;
    console.error("[PayPal] Order creation failed:", JSON.stringify(paypalError, null, 2));
    const detail = paypalError?.details?.[0]?.description || paypalError?.message || err.message;
    const error = new Error(`PayPal error: ${detail}`);
    error.statusCode = err.response?.status || 502;
    throw error;
  }

  const approvalUrl =
    response.data.links?.find((link) => ["payer-action", "approve"].includes(link.rel))?.href || "";

  return {
    id: response.data.id,
    approvalUrl,
    secureHash: signature,
    provider: "PAYPAL",
  };
};

const capturePayPalOrder = async (paypalOrderId) => {
  const accessToken = await getPayPalAccessToken();
  const response = await axios.post(
    `${getPayPalBaseUrl()}/v2/checkout/orders/${paypalOrderId}/capture`,
    {},
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": createIdempotencyKey({
          provider: "paypal-capture",
          paypalOrderId,
        }),
      },
    }
  );

  return response.data;
};

const verifyPayPalWebhookSignature = async ({ headers, body }) => {
  if (!process.env.PAYPAL_WEBHOOK_ID) {
    const error = new Error("PayPal webhook verification is not configured.");
    error.statusCode = 503;
    throw error;
  }

  const accessToken = await getPayPalAccessToken();
  const response = await axios.post(
    `${getPayPalBaseUrl()}/v1/notifications/verify-webhook-signature`,
    {
      auth_algo: headers["paypal-auth-algo"],
      cert_url: headers["paypal-cert-url"],
      transmission_id: headers["paypal-transmission-id"],
      transmission_sig: headers["paypal-transmission-sig"],
      transmission_time: headers["paypal-transmission-time"],
      webhook_id: process.env.PAYPAL_WEBHOOK_ID,
      webhook_event: body,
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data?.verification_status === "SUCCESS";
};

const assertPayPalCaptureMatches = ({
  capture,
  targetId,
  amount,
  currency,
  secureHash,
}) => {
  const purchaseUnit = capture?.purchase_units?.[0];
  const capturedPayment = purchaseUnit?.payments?.captures?.[0];

  if (!capture || capture.status !== "COMPLETED") {
    throw new Error("PayPal payment is not complete.");
  }

  if (String(purchaseUnit?.reference_id || "") !== String(targetId)) {
    throw new Error("PayPal order does not match this record.");
  }

  if (secureHash && String(purchaseUnit?.custom_id || "") !== String(secureHash)) {
    throw new Error("PayPal payment signature mismatch.");
  }

  // PayPal charges in USD when original currency is LKR (not supported by PayPal).
  const { value: expectedValue, currency_code: expectedCurrency } = toPayPalAmount(amount, currency);

  if (normalizeCurrency(capturedPayment?.amount?.currency_code) !== normalizeCurrency(expectedCurrency)) {
    throw new Error("PayPal payment currency mismatch.");
  }

  if (Math.abs(Number(capturedPayment?.amount?.value || 0) - Number(expectedValue || 0)) > 0.02) {
    throw new Error("PayPal payment amount mismatch.");
  }
};

module.exports = {
  STRIPE_API_VERSION,
  assertPayPalCaptureMatches,
  assertStripeSessionMatches,
  capturePayPalOrder,
  createPayPalOrder,
  createPaymentSignature,
  createStripeCheckoutSession,
  constructStripeWebhookEvent,
  formatAmount,
  isPayPalConfigured,
  isStripeConfigured,
  normalizeCurrency,
  retrieveStripeCheckoutSession,
  toStripeMinorUnits,
  verifyPayPalWebhookSignature,
  verifyPaymentSignature,
};
