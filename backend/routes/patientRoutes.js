const express = require('express');
const router = express.Router();
const { completeOnboarding, getPatientProfile, updatePatientProfile } = require('../controllers/patientController');
const {
    getPatientNotifications,
    markAllPatientNotificationsAsRead,
    markPatientNotificationAsRead,
} = require('../controllers/notificationController');
const { protect, patient } = require('../middleware/authMiddleware');

router.get('/notifications', protect, patient, getPatientNotifications);
router.put('/notifications/read-all', protect, patient, markAllPatientNotificationsAsRead);
router.put('/notifications/:id/read', protect, patient, markPatientNotificationAsRead);

router.post('/onboarding', protect, patient, completeOnboarding);
router.route('/profile')
    .get(protect, patient, getPatientProfile)
    .put(protect, patient, updatePatientProfile);

module.exports = router;
