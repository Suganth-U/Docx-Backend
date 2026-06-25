const express = require('express');
const router = express.Router();
const {
    bookAppointment,
    createAppointmentPayHereSession,
    createAppointmentStripeSession,
    getAppointmentReceipt,
    getMyAppointments,
    notifyAppointmentPayHerePayment,
    payAppointment,
    verifyAppointmentStripeSession
} = require('../controllers/appointmentController');
const { admin, protect, optionalProtect } = require('../middleware/authMiddleware');

router.post('/', optionalProtect, bookAppointment);
router.post('/payhere/notify', notifyAppointmentPayHerePayment);
router.post('/:id/payhere/session', optionalProtect, createAppointmentPayHereSession);
router.post('/:id/stripe/session', optionalProtect, createAppointmentStripeSession);
router.post('/:id/stripe/verify', optionalProtect, verifyAppointmentStripeSession);
router.put('/:id/pay', protect, admin, payAppointment);
router.get('/:id/receipt', optionalProtect, getAppointmentReceipt);

router.get('/my', protect, getMyAppointments);

module.exports = router;
