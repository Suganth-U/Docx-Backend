const express = require('express');
const router = express.Router();
const {
    appendEncounterNote,
    createEHRDocument,
    createEncounterWithPrescription,
    createMedication,
    dispensePrescription,
    downloadEHRDocumentFile,
    getPatientTimeline,
    getPendingPrescriptions,
    getEHRPatientList,
    getPatientSummary,
    listMedications,
    updateEHRDocument,
    updateMedication,
} = require('../controllers/ehrController');
const { protect, admin, doctor } = require('../middleware/authMiddleware');
const { parseEhrDocumentUpload } = require('../middleware/uploadMiddleware');

router.post('/', protect, doctor, createEncounterWithPrescription);

router.put('/dispense/:id', protect, admin, dispensePrescription);

router.get('/summary/:patientId', protect, getPatientSummary);

router.get('/timeline/:patientId', protect, getPatientTimeline);

router.get('/pending', protect, admin, getPendingPrescriptions);

router.get('/patients', protect, admin, getEHRPatientList);

router.post('/documents', protect, parseEhrDocumentUpload, createEHRDocument);
router.patch('/documents/:id', protect, updateEHRDocument);
router.get('/documents/:id/files/:fileId', protect, downloadEHRDocumentFile);

router.patch('/encounters/:id/notes', protect, appendEncounterNote);

router.route('/medications')
    .get(protect, listMedications)
    .post(protect, createMedication);

router.patch('/medications/:id', protect, updateMedication);

module.exports = router;
