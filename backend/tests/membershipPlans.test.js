const assert = require("node:assert/strict");
const test = require("node:test");

const {
  MEMBERSHIP_PLANS,
  getMembershipPlan,
  getMembershipTotals,
} = require("../utils/membershipPlans");

test("membership totals match the public monthly plan prices in LKR", () => {
  assert.deepEqual(getMembershipTotals(MEMBERSHIP_PLANS.general), {
    amount: 4900,
    taxAmount: 0,
    totalAmount: 4900,
    currency: "LKR",
  });

  assert.deepEqual(getMembershipTotals(MEMBERSHIP_PLANS.premium), {
    amount: 9900,
    taxAmount: 0,
    totalAmount: 9900,
    currency: "LKR",
  });

  assert.deepEqual(getMembershipTotals(MEMBERSHIP_PLANS.vip), {
    amount: 14900,
    taxAmount: 0,
    totalAmount: 14900,
    currency: "LKR",
  });
});

test("unknown membership plans fall back to General Care", () => {
  assert.equal(getMembershipPlan("unknown").key, "general");
});
