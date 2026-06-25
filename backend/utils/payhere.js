const crypto = require("crypto");

const normalizeBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return String(value).toLowerCase() === "true";
};

const md5Upper = (value) =>
  crypto.createHash("md5").update(String(value)).digest("hex").toUpperCase();

const formatAmount = (amount) => Number(amount || 0).toFixed(2);

const getConfig = () => ({
  merchantId: process.env.PAYHERE_MERCHANT_ID || "",
  merchantSecret: process.env.PAYHERE_MERCHANT_SECRET || "",
  notifyUrl: process.env.PAYHERE_NOTIFY_URL || "",
  sandbox: normalizeBoolean(process.env.PAYHERE_SANDBOX, true),
  frontendUrl: process.env.FRONTEND_URL || "",
});

const isConfigured = () => {
  const config = getConfig();
  return Boolean(config.merchantId && config.merchantSecret && config.notifyUrl);
};

const buildHash = ({ merchantId, orderId, amount, currency, merchantSecret }) =>
  md5Upper(
    `${merchantId}${orderId}${formatAmount(amount)}${currency}${md5Upper(
      merchantSecret
    )}`
  );

const splitFullName = (fullName = "") => {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return { firstName: "DocX", lastName: "Patient" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" ") || "Patient",
  };
};

const resolveFrontendBase = (frontendOrigin = "") => {
  const config = getConfig();
  return frontendOrigin || config.frontendUrl || "http://localhost:5173";
};

const buildPaymentPayload = ({
  order,
  fullName,
  email,
  phone,
  shippingAddress = {},
  frontendOrigin = "",
}) => {
  const config = getConfig();
  const { firstName, lastName } = splitFullName(fullName);
  const frontendBase = resolveFrontendBase(frontendOrigin);
  const orderPage = `${frontendBase.replace(/\/+$/, "")}/orders/${order._id}`;
  const address = [shippingAddress.addressLine1, shippingAddress.addressLine2]
    .filter(Boolean)
    .join(", ");

  return {
    sandbox: config.sandbox,
    merchant_id: config.merchantId,
    return_url: orderPage,
    cancel_url: orderPage,
    notify_url: config.notifyUrl,
    order_id: String(order._id),
    items:
      order.orderItems.length === 1
        ? order.orderItems[0].name
        : `DocX Pharmacy order (${order.orderItems.length} items)`,
    amount: formatAmount(order.totalPrice),
    currency: order.currency || "LKR",
    hash: buildHash({
      merchantId: config.merchantId,
      orderId: String(order._id),
      amount: order.totalPrice,
      currency: order.currency || "LKR",
      merchantSecret: config.merchantSecret,
    }),
    first_name: firstName,
    last_name: lastName,
    email,
    phone,
    address,
    city: shippingAddress.city || "Colombo",
    country: shippingAddress.country || "Sri Lanka",
    delivery_address: address,
    delivery_city: shippingAddress.city || "Colombo",
    delivery_country: shippingAddress.country || "Sri Lanka",
    custom_1: String(order.user),
    custom_2: order.paymentMethod,
  };
};

const buildAppointmentPaymentPayload = ({
  appointment,
  fullName,
  email,
  phone,
  frontendOrigin = "",
  city = "Colombo",
  country = "Sri Lanka",
}) => {
  const config = getConfig();
  const { firstName, lastName } = splitFullName(fullName);
  const frontendBase = resolveFrontendBase(frontendOrigin);
  const receiptPage = `${frontendBase.replace(/\/+$/, "")}/appointment/receipt/${appointment._id}?payment=submitted`;
  const appointmentLabel = appointment.doctorNameSnapshot
    ? `DocX appointment with ${appointment.doctorNameSnapshot}`
    : "DocX doctor appointment";

  return {
    sandbox: config.sandbox,
    merchant_id: config.merchantId,
    return_url: receiptPage,
    cancel_url: receiptPage,
    notify_url: config.notifyUrl,
    order_id: String(appointment._id),
    items: appointmentLabel,
    amount: formatAmount(appointment.consultationFeeSnapshot),
    currency: "LKR",
    hash: buildHash({
      merchantId: config.merchantId,
      orderId: String(appointment._id),
      amount: appointment.consultationFeeSnapshot,
      currency: "LKR",
      merchantSecret: config.merchantSecret,
    }),
    first_name: firstName,
    last_name: lastName,
    email,
    phone,
    address: appointment.hospitalNameSnapshot || "DocX",
    city,
    country,
    delivery_address: appointment.hospitalNameSnapshot || "DocX",
    delivery_city: city,
    delivery_country: country,
    custom_1: String(appointment.patient_id || ""),
    custom_2: appointment.type,
  };
};

const buildConsultationPaymentPayload = ({
  consultation,
  fullName,
  email,
  phone,
  frontendOrigin = "",
  city = "Colombo",
  country = "Sri Lanka",
}) => {
  const config = getConfig();
  const { firstName, lastName } = splitFullName(fullName);
  const frontendBase = resolveFrontendBase(frontendOrigin);
  const statusPage = `${frontendBase.replace(/\/+$/, "")}/virtual-consultation/status/${consultation._id}?payment=submitted`;
  const consultationLabel = consultation.doctorNameSnapshot
    ? `DocX virtual consultation with ${consultation.doctorNameSnapshot}`
    : "DocX virtual consultation";

  return {
    sandbox: config.sandbox,
    merchant_id: config.merchantId,
    return_url: statusPage,
    cancel_url: statusPage,
    notify_url: config.notifyUrl,
    order_id: String(consultation._id),
    items: consultationLabel,
    amount: formatAmount(consultation.consultationFeeSnapshot),
    currency: "LKR",
    hash: buildHash({
      merchantId: config.merchantId,
      orderId: String(consultation._id),
      amount: consultation.consultationFeeSnapshot,
      currency: "LKR",
      merchantSecret: config.merchantSecret,
    }),
    first_name: firstName,
    last_name: lastName,
    email,
    phone,
    address: "DocX Virtual Consultation",
    city,
    country,
    delivery_address: "DocX Virtual Consultation",
    delivery_city: city,
    delivery_country: country,
    custom_1: String(consultation.patient || ""),
    custom_2: "VIRTUAL_CONSULTATION",
  };
};

const verifyNotification = (payload = {}) => {
  const config = getConfig();
  if (!config.merchantId || !config.merchantSecret) return false;

  const localMd5Sig = md5Upper(
    `${payload.merchant_id}${payload.order_id}${payload.payhere_amount}${payload.payhere_currency}${payload.status_code}${md5Upper(
      config.merchantSecret
    )}`
  );

  return (
    String(payload.merchant_id) === String(config.merchantId) &&
    String(payload.md5sig || "").toUpperCase() === localMd5Sig
  );
};

const mapStatus = (statusCode) => {
  switch (String(statusCode)) {
    case "2":
      return "paid";
    case "0":
      return "pending";
    case "-1":
      return "canceled";
    case "-2":
      return "failed";
    case "-3":
      return "chargedback";
    default:
      return "pending";
  }
};

module.exports = {
  buildAppointmentPaymentPayload,
  buildConsultationPaymentPayload,
  buildPaymentPayload,
  getPayHereConfig: getConfig,
  isPayHereConfigured: isConfigured,
  mapPayHereStatus: mapStatus,
  verifyPayHereNotification: verifyNotification,
};
