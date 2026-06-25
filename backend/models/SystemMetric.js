const mongoose = require('mongoose');

const systemMetricSchema = mongoose.Schema(
    {
        metricType: {
            type: String,
            required: true,
            unique: true, // e.g. "409_CONFLICT"
        },
        count: {
            type: Number,
            required: true,
            default: 0,
        },
        description: {
            type: String,
        }
    },
    {
        timestamps: true,
    }
);

const SystemMetric = mongoose.model('SystemMetric', systemMetricSchema);

module.exports = SystemMetric;
