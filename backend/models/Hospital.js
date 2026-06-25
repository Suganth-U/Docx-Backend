const mongoose = require('mongoose');

const hospitalSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true
        },
        location: {
            type: String,
            required: true
        },
        contact: {
            type: String,
            required: true
        },
        image: {
            type: String, // URL or path to image
            default: '/assets/hospitals/default.jpg'
        }
    },
    {
        timestamps: true
    }
);

const Hospital = mongoose.model('Hospital', hospitalSchema);

module.exports = Hospital;
