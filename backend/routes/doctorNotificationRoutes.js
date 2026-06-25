const express = require('express');
const router = express.Router();
const {
    getDoctorNotifications,
    markDoctorNotificationAsRead,
    markAllDoctorNotificationsAsRead,
} = require('../controllers/notificationController');
const { protect, doctor } = require('../middleware/authMiddleware');

router.route('/').get(protect, doctor, getDoctorNotifications);
router.route('/read-all').put(protect, doctor, markAllDoctorNotificationsAsRead);
router.route('/:id/read').put(protect, doctor, markDoctorNotificationAsRead);

module.exports = router;
