
const express = require('express');

const router = express.Router();
const {
    createPrescription,
    getPrescriptions,
    getMyPrescriptions,
    getMyPrescriptionRequests,
    runPrescriptionIntake,
    createRequest,
    getDoctorRequests,
    issuePrescription,
    rejectPrescriptionRequest,
    getPrescriptionRequestProof,
    getPrescriptionDocument
} = require('../controllers/prescriptionController');
const { protect, doctor, patient } = require('../middleware/authMiddleware');
const { parsePrescriptionRequestUpload } = require('../middleware/uploadMiddleware');

router.route('/').post(protect, doctor, createPrescription).get(protect, doctor, getPrescriptions);
router.route('/my').get(protect, getMyPrescriptions);
router.route('/requests/my').get(protect, patient, getMyPrescriptionRequests);

router.route('/requests/intake').post(protect, patient, runPrescriptionIntake);
router.route('/request').post(protect, patient, parsePrescriptionRequestUpload, createRequest);
router.route('/requests').get(protect, doctor, getDoctorRequests);
router.route('/requests/:id/issue').put(protect, doctor, issuePrescription);
router.route('/requests/:id/reject').put(protect, doctor, rejectPrescriptionRequest);
router.route('/requests/:id/proof/:fileId').get(protect, getPrescriptionRequestProof);
router.route('/:id/document').get(protect, getPrescriptionDocument);

module.exports = router;
