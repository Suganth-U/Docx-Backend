const express = require('express');
const router = express.Router();
const {
    getMedicines,
    getMedicineById,
    deleteMedicine,
    createMedicine,
    updateMedicine,
} = require('../controllers/medicineController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(getMedicines)
    .post(protect, admin, createMedicine);

router.route('/:id')
    .get(getMedicineById)
    .delete(protect, admin, deleteMedicine)
    .put(protect, admin, updateMedicine);

module.exports = router;
