const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/', (req, res) => {
    res.status(200).json({ message: 'User routes are working' });
});

module.exports = router;

