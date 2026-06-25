const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'docx_secret_123');

            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                res.status(401);
                throw new Error('Your session is no longer available. Please sign in again.');
            }

            if (req.user.status === 'blocked') {
                res.status(403);
                throw new Error('This account has been blocked by an administrator.');
            }

            if (req.user.role === 'doctor' && (req.user.status !== 'active' || !req.user.isVerified)) {
                res.status(403);
                throw new Error(
                    req.user.status === 'rejected'
                        ? 'Doctor account access has been disabled'
                        : 'Doctor account is pending admin approval'
                );
            }

            next();
        } catch (error) {
            console.error(error);

            if (res.statusCode === 403) {
                throw error;
            }

            res.status(401);
            throw new Error('Your session has expired. Please sign in again.');
        }
    }

    if (!token) {
        res.status(401);
        throw new Error('Please sign in to continue.');
    }
});

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(401);
        throw new Error('Not authorized as an admin');
    }
};

const doctor = (req, res, next) => {
    if (req.user && (req.user.role === 'doctor' || req.user.role === 'admin')) {
        next();
    } else {
        res.status(401);
        throw new Error('Not authorized as a doctor');
    }
};

const patient = (req, res, next) => {
    if (req.user && req.user.role === 'patient') {
        next();
    } else {
        res.status(401);
        throw new Error('Not authorized as a patient');
    }
};

const optionalProtect = asyncHandler(async (req, res, next) => {
    let token;
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'docx_secret_123');
            req.user = await User.findById(decoded.id).select('-password');
        } catch (error) {
            console.error("Optional Auth Token Failed:", error.message);
            // Continue without req.user (guest)
        }
    }
    next();
});

module.exports = { protect, admin, doctor, patient, optionalProtect };
