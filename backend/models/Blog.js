const mongoose = require('mongoose');

const blogSchema = mongoose.Schema(
    {
        title: { type: String, required: true },
        category: { type: String, required: true },
        content: { type: String, required: true },
        authorName: { type: String, required: true },
        image: { type: String, default: '' },
        isPublished: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Blog', blogSchema);
