const mongoose = require("mongoose");

const doctorVirtualScheduleSchema = mongoose.Schema(
    {
        doctor: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "Doctor",
            index: true,
        },
        dayOfWeek: {
            type: String,
            required: true,
            enum: [
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
            ],
        },
        startTime: {
            type: String,
            required: true,
        },
        endTime: {
            type: String,
            required: true,
        },
        slotDuration: {
            type: Number,
            default: 20,
        },
        active: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

doctorVirtualScheduleSchema.index(
    { doctor: 1, dayOfWeek: 1, startTime: 1, endTime: 1 },
    { unique: true }
);

module.exports = mongoose.model("DoctorVirtualSchedule", doctorVirtualScheduleSchema);
