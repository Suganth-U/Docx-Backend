const asyncHandler = require('express-async-handler');
const SystemSettings = require('../models/SystemSettings');

// @desc    Get system settings (singleton)
// @route   GET /api/admin/settings
// @access  Private/Admin
const getSettings = asyncHandler(async (req, res) => {
    let settings = await SystemSettings.findOne({});

    if (!settings) {
        // Create default settings document if none exists
        settings = await SystemSettings.create({});
    }

    res.json(settings);
});

// @desc    Update system settings
// @route   PUT /api/admin/settings
// @access  Private/Admin
const updateSettings = asyncHandler(async (req, res) => {
    const settings = await SystemSettings.findOneAndUpdate(
        {},
        { $set: req.body },
        { new: true, upsert: true, runValidators: true }
    );

    res.json({
        message: 'Settings updated successfully',
        settings,
    });
});

module.exports = { getSettings, updateSettings };
