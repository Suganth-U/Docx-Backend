const express = require('express');
const router = express.Router();
const { getPendingDoctors, approveDoctor, rejectDoctor, blockUser, unblockUser, getAdminDashboardStats, getAllPatients, getPatientFullDetails, getAllDoctors, deleteUser, getAdminProfile, updateAdminProfile, getAllAppointments, getAdminGlobalSearch } = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/dashboard', protect, admin, getAdminDashboardStats);
router.get('/search', protect, admin, getAdminGlobalSearch);
router.get('/doctors/pending', protect, admin, getPendingDoctors);
router.put('/approve-doctor/:id', protect, admin, approveDoctor);
router.put('/reject-doctor/:id', protect, admin, rejectDoctor);

router.get('/patients', protect, admin, getAllPatients);
router.get('/patients/:id', protect, admin, getPatientFullDetails);
router.get('/doctors', protect, admin, getAllDoctors);
router.put('/users/:id/block', protect, admin, blockUser);
router.put('/users/:id/unblock', protect, admin, unblockUser);
router.delete('/users/:id', protect, admin, deleteUser);

router.get('/profile', protect, admin, getAdminProfile);
router.put('/profile', protect, admin, updateAdminProfile);

router.get('/appointments', protect, admin, getAllAppointments);

module.exports = router;
