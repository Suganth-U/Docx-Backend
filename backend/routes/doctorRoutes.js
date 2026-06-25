const express = require('express');
const router = express.Router();
const {
    getDoctorStats,
    getAllDoctors,
    updateDoctorProfile,
    getDoctorProfile,
    addDoctor,
    deleteDoctor,
    getDoctorAppointments,
    updateAppointmentStatus,
    getDoctorPatients,
    getPatientRecords,
    getDoctorGlobalSearch,
    getDoctorBookingOptions,
    getDoctorSchedules,
    getHospitalOptions,
    addDoctorSchedule,
    deleteDoctorSchedule,
    getDoctorAvailability,
    getMyDoctorSchedules,
    uploadDoctorSignatureImage,
    getDoctorLeaves,
    addDoctorLeave,
    deleteDoctorLeave
} = require('../controllers/doctorController');
const { protect, doctor, admin } = require('../middleware/authMiddleware');
const { uploadDoctorSignature } = require('../middleware/uploadMiddleware');

router.route('/')
    .get(getAllDoctors)
    .post(protect, admin, addDoctor);

router.get('/booking/options', getDoctorBookingOptions);
router.get('/search', protect, doctor, getDoctorGlobalSearch);
router.get('/hospitals/options', getHospitalOptions);
router.get('/schedules/mine', protect, doctor, getMyDoctorSchedules);
router.get('/:id/availability', getDoctorAvailability);
router.get('/:id/schedules', getDoctorSchedules);

router.route('/leaves')
    .get(protect, doctor, getDoctorLeaves)
    .post(protect, doctor, addDoctorLeave);

router.route('/leaves/:id')
    .delete(protect, doctor, deleteDoctorLeave);

router.route('/:id').delete(protect, admin, deleteDoctor);

router.route('/schedules')
    .post(protect, doctor, addDoctorSchedule);

router.route('/schedules/:id')
    .delete(protect, doctor, deleteDoctorSchedule);

router.route('/patients/:id/records')
    .get(protect, doctor, getPatientRecords);

router.route('/patients')
    .get(protect, doctor, getDoctorPatients);

router.route('/appointments')
    .get(protect, doctor, getDoctorAppointments);

router.route('/appointments/:id')
    .put(protect, doctor, updateAppointmentStatus);

router.get('/stats', protect, doctor, getDoctorStats);
router.post('/profile/signature', protect, doctor, uploadDoctorSignature.single('signature'), uploadDoctorSignatureImage);
router.route('/profile')
    .get(protect, doctor, getDoctorProfile)
    .put(protect, doctor, updateDoctorProfile);

module.exports = router;
