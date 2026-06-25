const mongoose = require("mongoose");

const onlineConsultationSchema = mongoose.Schema(
    {
        consultationNumber: {
            type: String,
            index: true,
        },
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "Patient",
            index: true,
        },
        doctor: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "Doctor",
            index: true,
        },
        specialtySnapshot: {
            type: String,
            default: "",
        },
        doctorNameSnapshot: {
            type: String,
            default: "",
        },
        patientNameSnapshot: {
            type: String,
            default: "",
        },
        patientEmailSnapshot: {
            type: String,
            default: "",
        },
        patientPhoneSnapshot: {
            type: String,
            default: "",
        },
        consultationFeeSnapshot: {
            type: Number,
            default: 0,
        },
        requestedDate: {
            type: Date,
            required: true,
        },
        requestedDateKey: {
            type: String,
            required: true,
            index: true,
        },
        requestedTimeSlot: {
            type: String,
            default: "",
        },
        approvedDate: {
            type: Date,
            default: null,
        },
        approvedDateKey: {
            type: String,
            default: "",
            index: true,
        },
        approvedTimeSlot: {
            type: String,
            default: "",
        },
        requestNote: {
            type: String,
            default: "",
        },
        doctorResponseNote: {
            type: String,
            default: "",
        },
        status: {
            type: String,
            enum: [
                "requested",
                "approved",
                "scheduled",
                "meeting_pending",
                "rejected",
                "completed",
                "cancelled",
                "expired",
            ],
            default: "requested",
            index: true,
        },
        paymentStatus: {
            type: String,
            enum: ["awaiting_approval", "pending", "paid", "failed", "canceled", "expired", "refunded"],
            default: "awaiting_approval",
            index: true,
        },
        paymentProvider: {
            type: String,
            default: "",
        },
        paymentResult: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
        paidAt: {
            type: Date,
            default: null,
        },
        gatewayOrderId: {
            type: String,
            default: "",
        },
        holdExpiresAt: {
            type: Date,
            default: null,
            index: true,
        },
        meetingLink: {
            type: String,
            default: "",
        },
        hostLink: {
            type: String,
            default: "",
        },
        meetingId: {
            type: String,
            default: "",
        },
        meetingPlatform: {
            type: String,
            enum: ["zoom", "jitsi", "google_meet", "teams", "other"],
            default: "jitsi",
        },
        meetingProvider: {
            type: String,
            default: "",
        },
        jitsiAppId: {
            type: String,
            default: "",
        },
        jitsiDomain: {
            type: String,
            default: "",
        },
        jitsiRoomName: {
            type: String,
            default: "",
            index: true,
        },
        meetingScheduledStartAt: {
            type: Date,
            default: null,
            index: true,
        },
        meetingJoinOpensAt: {
            type: Date,
            default: null,
            index: true,
        },
        meetingJoinClosesAt: {
            type: Date,
            default: null,
            index: true,
        },
        meetingWindowNotificationSentAt: {
            type: Date,
            default: null,
        },
        patientJoinedAt: {
            type: Date,
            default: null,
        },
        patientLastLeftAt: {
            type: Date,
            default: null,
        },
        doctorJoinedAt: {
            type: Date,
            default: null,
        },
        doctorLastLeftAt: {
            type: Date,
            default: null,
        },
        meetingCompletedAt: {
            type: Date,
            default: null,
        },
        meetingProviderError: {
            type: String,
            default: "",
        },
        adminAddedMeetingLink: {
            type: Boolean,
            default: false,
        },
        zoomCreationError: {
            type: String,
            default: "",
        },
        doctorNotes: {
            type: String,
            default: "",
        },
        ehrSynced: {
            type: Boolean,
            default: false,
        },
        ehrEncounterId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ClinicalEncounter",
        },
    },
    {
        timestamps: true,
    }
);

onlineConsultationSchema.index({ doctor: 1, requestedDateKey: 1, status: 1 });
onlineConsultationSchema.index(
    { doctor: 1, approvedDateKey: 1, approvedTimeSlot: 1 },
    {
        unique: true,
        partialFilterExpression: {
            approvedDateKey: { $type: "string" },
            approvedTimeSlot: { $type: "string" },
            status: {
                $in: ["approved", "scheduled", "meeting_pending", "completed"],
            },
        },
    }
);

module.exports = mongoose.model("OnlineConsultation", onlineConsultationSchema);
