export const PHARMACY_THEME = {
  ink: "#172033",
  inkSoft: "#51607a",
  inkMuted: "#6f7b92",
  line: "#d9dfeb",
  lineStrong: "#c9d3e4",
  surface: "#f6f3fc",
  surfaceStrong: "#eee8f8",
  card: "#ffffff",
  accent: "#8e7dbe",
  accentSoft: "#efeafb",
  accentStrong: "#695694",
  brand: "#8e7dbe",
  brandSoft: "#efeafb",
  danger: "#c53b39",
  dangerSoft: "#fceceb",
  warning: "#9d6516",
  warningSoft: "#fff1dd",
  success: "#17855c",
  shadow: "0 24px 80px rgba(23, 32, 51, 0.08)",
  shadowSoft: "0 12px 36px rgba(23, 32, 51, 0.08)",
};

export const FALLBACK_MEDICINE_IMAGE = "/assets/medicines/Panadol.png";
export const DEFAULT_SHIPPING_FEE = 350;
export const DEFAULT_COUNTRY = "Sri Lanka";

export const RX_CATEGORIES = new Set([
  "Infection",
  "Cardiac care",
  "Diabetic Care",
  "Others",
]);

export const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

export const formatDateTime = (value) => {
  if (!value) return "Pending";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Pending";
  return parsed.toLocaleString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export const getPaymentMethodLabel = (...values) => {
  const value = values.find((item) => item !== undefined && item !== null && String(item).trim());

  if (!value) {
    return "Pending";
  }

  const normalized = String(value).trim().toLowerCase();

  if (["stripe", "stripe_checkout", "card", "demo_card", "demo gateway", "visa", "mastercard"].includes(normalized)) {
    return "Card payment";
  }

  if (normalized === "stripe") {
    return "Stripe";
  }

  if (normalized === "cod") {
    return "Cash on delivery";
  }

  if (normalized === "free") {
    return "No payment required";
  }

  if (normalized === "manual") {
    return "Confirmed by staff";
  }

  return String(value).replace(/_/g, " ");
};

export const getDeliveryCopy = (item = {}) => {
  if (item.requiresPrescription) {
    return "Pharmacist review before dispatch";
  }

  if ((item.stock ?? 0) <= 0) {
    return "Back in stock soon";
  }

  if ((item.stock ?? 0) < 20) {
    return "Low stock, dispatch today";
  }

  return "Express delivery in 2 to 4 hours";
};

export const splitFullName = (fullName = "") => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return { firstName: "DocX", lastName: "Patient" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" ") || "Patient",
  };
};

export const getOrderTone = (order = {}) => {
  const status = order.paymentStatus || (order.isPaid ? "paid" : "pending");

  if (["paid", "success"].includes(status)) {
    return {
      label: "Paid",
      background: PHARMACY_THEME.accentSoft,
      color: PHARMACY_THEME.accentStrong,
    };
  }

  if (["canceled", "cancelled"].includes(status)) {
    return {
      label: "Cancelled",
      background: PHARMACY_THEME.dangerSoft,
      color: PHARMACY_THEME.danger,
    };
  }

  if (["failed", "chargedback"].includes(status)) {
    return {
      label: "Payment Failed",
      background: PHARMACY_THEME.warningSoft,
      color: PHARMACY_THEME.warning,
    };
  }

  return {
    label: order.paymentMethod === "COD" ? "Cash on delivery" : "Awaiting payment",
    background: PHARMACY_THEME.brandSoft,
    color: PHARMACY_THEME.brand,
  };
};

export const clampQuantity = (value) => Math.max(1, Number(value) || 1);
