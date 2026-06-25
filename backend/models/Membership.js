const mongoose = require("mongoose");

const membershipSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    planType: {
      type: String,
      enum: ["general", "premium", "vip"],
      required: true,
    },
    planName: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "active", "expired", "canceled", "failed"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "canceled", "expired"],
      default: "pending",
    },
    paymentProvider: {
      type: String,
      default: "",
    },
    gatewaySessionId: {
      type: String,
      default: "",
    },
    gatewaySubscriptionId: {
      type: String,
      default: "",
    },
    gatewayCustomerId: {
      type: String,
      default: "",
    },
    paymentResult: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
    },
    taxAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    currency: {
      type: String,
      default: "LKR",
    },
    startedAt: {
      type: Date,
    },
    currentPeriodStart: {
      type: Date,
    },
    currentPeriodEnd: {
      type: Date,
    },
    paidAt: {
      type: Date,
    },
    canceledAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

membershipSchema.index({ user: 1, status: 1, currentPeriodEnd: -1 });
membershipSchema.index(
  { gatewaySessionId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      gatewaySessionId: { $type: "string", $gt: "" },
    },
  }
);

const Membership = mongoose.model("Membership", membershipSchema);

module.exports = Membership;
