const MEMBERSHIP_TAX_RATE = 0;

const MEMBERSHIP_PLANS = {
  general: {
    key: "general",
    name: "General Care",
    price: 4900,
    bookingDiscountPercent: 5,
    pharmacyDiscountPercent: 10,
  },
  premium: {
    key: "premium",
    name: "Premium Care",
    price: 9900,
    bookingDiscountPercent: 10,
    pharmacyDiscountPercent: 15,
  },
  vip: {
    key: "vip",
    name: "VIP Care",
    price: 14900,
    bookingDiscountPercent: 20,
    pharmacyDiscountPercent: 20,
  },
};

const parseAmount = (value) => Number(Number(value || 0).toFixed(2));

const getMembershipPlan = (planType = "general") => {
  const key = String(planType || "general").toLowerCase();
  return MEMBERSHIP_PLANS[key] || MEMBERSHIP_PLANS.general;
};

const getMembershipTotals = (plan) => {
  const amount = parseAmount(plan.price);
  const taxAmount = parseAmount(amount * MEMBERSHIP_TAX_RATE);
  const totalAmount = parseAmount(amount + taxAmount);

  return {
    amount,
    taxAmount,
    totalAmount,
    currency: "LKR",
  };
};

const addOneMonth = (value = new Date()) => {
  const next = new Date(value);
  next.setMonth(next.getMonth() + 1);
  return next;
};

module.exports = {
  MEMBERSHIP_PLANS,
  addOneMonth,
  getMembershipPlan,
  getMembershipTotals,
};
