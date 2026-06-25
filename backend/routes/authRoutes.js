const express = require('express');
const router = express.Router();
const { parseDoctorRegistrationDocuments } = require('../middleware/uploadMiddleware');
const {
    authUser,
    authAdmin,
    registerUser,
    logoutUser,
    handleRefreshToken,
    googleAuth,
    forgotPassword,
    validateResetPasswordToken,
    resetPassword,
    getMyProfile,
    updateMyProfile
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', parseDoctorRegistrationDocuments, registerUser);
router.post('/login', authUser);
router.post('/admin/login', authAdmin);
router.post('/logout', logoutUser);
router.get('/refresh', handleRefreshToken);
router.post('/google', googleAuth);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/validate', validateResetPasswordToken);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMyProfile);
router.put('/me', protect, updateMyProfile);

module.exports = router;
