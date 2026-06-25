const express = require('express');
const router = express.Router();
const { healthChat } = require('../controllers/assistantController');

router.post('/health-chat', healthChat);

module.exports = router;
