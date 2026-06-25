const asyncHandler = require('express-async-handler');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');
const User = require('../models/User');
const Notification = require('../models/Notification');
const jwt = require('jsonwebtoken');
const admin = require('../config/firebaseAdmin');
const Doctor = require('../models/Doctor');
const axios = require('axios');
const crypto = require('crypto');
const {
    sendAdminTemplatedEmail,
    sendTemplatedEmail,
} = require('../utils/email/dispatcher');
const { normalizePublicPath } = require('../utils/storagePaths');

const FIREBASE_PROJECT_ID = 'docx-dz';
const FIREBASE_WEB_API_KEY =
    process.env.FIREBASE_WEB_API_KEY ||
    process.env.VITE_FIREBASE_API_KEY ||
    'AIzaSyCHdTTnzVWcS9X7uHk4OREUvCvB5VwKBX8';
const FIREBASE_CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const FIREBASE_ACCOUNTS_LOOKUP_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup';
const PASSWORD_MIN_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENERIC_RESET_EMAIL_MESSAGE =
    'If an account exists for this email, we sent a password reset link.';
const PORTAL_AUTH_ERROR_MESSAGE =
    "We couldn't sign you in on this portal. Check your credentials or use the correct login page.";
const PATIENT_DOCTOR_PORTAL_ROLES = new Set(['patient', 'doctor']);
const GOOGLE_AUTH_ROLES = new Set(['patient', 'doctor', 'admin']);
const GOOGLE_AUTH_INTENTS = new Set(['login', 'signup']);

const normalizeEmail = (value = '') => String(value || '').trim().toLowerCase();
const normalizeRole = (value = '') => String(value || '').trim().toLowerCase();
const getRoleLabel = (role = '') => {
    if (role === 'doctor') return 'doctor';
    if (role === 'admin') return 'admin';
    return 'patient';
};
const validateEmailInput = (email, label = 'Email address') => {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
        return `${label} is required.`;
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
        return `Enter a valid ${label.toLowerCase()}, like name@example.com.`;
    }

    return '';
};
const validatePasswordInput = (password, label = 'Password') => {
    if (!password) {
        return `${label} is required.`;
    }

    if (String(password).length < PASSWORD_MIN_LENGTH) {
        return `${label} must be at least ${PASSWORD_MIN_LENGTH} characters.`;
    }

    return '';
};
const validateStrongPasswordInput = (password, label = 'Password') => {
    const baseError = validatePasswordInput(password, label);
    if (baseError) return baseError;

    if (!/[A-Z]/.test(password)) {
        return `${label} must include at least one uppercase letter.`;
    }

    if (!/[0-9]/.test(password)) {
        return `${label} must include at least one number.`;
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
        return `${label} must include at least one symbol.`;
    }

    return '';
};
const getRequiredInputError = (value, label) =>
    String(value || '').trim() ? '' : `${label} is required.`;
const throwValidationError = (res, message) => {
    res.status(400);
    throw createClientAuthError(message, 400);
};
const hashResetPasswordToken = (token = '') =>
    crypto.createHash('sha256').update(token).digest('hex');
const getUploadedRegistrationFile = (files, fieldName) =>
    Array.isArray(files?.[fieldName]) ? files[fieldName][0] : null;
const NAME_FALLBACKS_BY_ROLE = {
    admin: 'Admin User',
    doctor: 'Doctor User',
    patient: 'DocX Patient',
    default: 'DocX User',
};
const splitDisplayName = (value = '') => {
    const parts = String(value || '').trim().split(/\s+/).filter(Boolean);

    return {
        firstName: parts[0] || '',
        lastName: parts.slice(1).join(' '),
    };
};
const resolveRequiredUserNames = ({ firstName, lastName, displayName, email, role } = {}) => {
    const existingFirstName = String(firstName || '').trim();
    const existingLastName = String(lastName || '').trim();
    const legacyName = `${existingFirstName} ${existingLastName}`.trim();
    const displayNameParts = splitDisplayName(displayName);
    const emailNameParts = splitDisplayName(String(email || '').split('@')[0].replace(/[._-]+/g, ' '));
    const roleFallback = NAME_FALLBACKS_BY_ROLE[normalizeRole(role)] || NAME_FALLBACKS_BY_ROLE.default;
    const fallbackNameParts = splitDisplayName(roleFallback);
    const name =
        String(displayName || '').trim() ||
        legacyName ||
        `${emailNameParts.firstName} ${emailNameParts.lastName}`.trim() ||
        roleFallback;

    return {
        name,
        firstName:
            existingFirstName ||
            displayNameParts.firstName ||
            emailNameParts.firstName ||
            fallbackNameParts.firstName,
        lastName:
            existingLastName ||
            displayNameParts.lastName ||
            emailNameParts.lastName ||
            fallbackNameParts.lastName,
    };
};
const ensureRequiredUserNames = (user, displayName = '') => {
    if (!user) return null;

    const requiredNames = resolveRequiredUserNames({
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: displayName || user.name,
        email: user.email,
        role: user.role,
    });

    user.name = requiredNames.name;
    user.firstName = requiredNames.firstName;
    user.lastName = requiredNames.lastName;

    return user;
};
const getUserDisplayName = (user) => (
    typeof user?.getDisplayName === 'function'
        ? user.getDisplayName()
        : String(user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'DocX User')
);
const parseNonNegativeNumber = (value, fallback = 0) => {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }

    if (typeof value === 'number') {
        return Number.isFinite(value) && value >= 0 ? value : fallback;
    }

    const normalizedValue = String(value).trim().replace(/,/g, '');
    const directNumber = Number(normalizedValue);

    if (Number.isFinite(directNumber) && directNumber >= 0) {
        return directNumber;
    }

    const numericParts = normalizedValue.match(/\d+(?:\.\d+)?/g);
    const parsedNumber = numericParts?.length ? Number(numericParts[numericParts.length - 1]) : NaN;

    return Number.isFinite(parsedNumber) && parsedNumber >= 0 ? parsedNumber : fallback;
};
const cleanupUploadedRegistrationFiles = (files = {}) => {
    Object.values(files)
        .flat()
        .forEach((file) => {
            if (file?.path && fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
        });
};
const appendRefreshToken = async (user, refreshToken) => {
    ensureRequiredUserNames(user);
    user.refreshToken = [...(user.refreshToken || []), refreshToken];
    await user.save();
};
const setRefreshCookie = (res, refreshToken, rememberMe = false) => {
    res.cookie('jwt', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'None',
        maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    });
};
const issueAuthSession = async ({ user, res, rememberMe = false, displayName = '' }) => {
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id, rememberMe);

    ensureRequiredUserNames(user, displayName);
    await appendRefreshToken(user, refreshToken);
    setRefreshCookie(res, refreshToken, rememberMe);

    return accessToken;
};
const sendLoginAlert = async (user, roleLabel = user.role) => {
    const displayName = getUserDisplayName(user);

    await sendTemplatedEmail({
        eventKey: 'LOGIN_ALERT',
        recipient: user.email,
        data: {
            name: displayName,
            firstName: user.firstName,
            lastName: user.lastName,
            time: new Date().toLocaleString(),
            roleLabel,
        },
        category: 'security'
    });
};
const sendAuthSuccess = async ({ user, res, rememberMe = false, message, roleLabel }) => {
    const accessToken = await issueAuthSession({ user, res, rememberMe });
    const displayName = getUserDisplayName(user);

    await sendLoginAlert(user, roleLabel);

    res.json({
        _id: user._id,
        name: displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        status: user.status,
        isVerified: user.isVerified,
        isProfileComplete: user.isProfileComplete,
        membership: user.membership || { status: 'inactive' },
        accessToken,
        message,
    });
};
const createClientAuthError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.exposeToClient = true;
    return error;
};
const rejectPortalAuth = (res, statusCode = 401) => {
    res.status(statusCode);
    throw createClientAuthError(PORTAL_AUTH_ERROR_MESSAGE, statusCode);
};
const enforceAccountNotBlocked = (user, res) => {
    if (user.status !== 'blocked') {
        return;
    }

    res.status(403);
    throw createClientAuthError(
        'Account blocked: ' + (user.blockedReason || 'Please contact DocX support for more information.'),
        403
    );
};
const enforceDoctorPortalStatus = (user, res) => {
    if (user.role !== 'doctor') {
        return;
    }

    enforceAccountNotBlocked(user, res);

    if (user.status === 'rejected') {
        res.status(403);
        throw createClientAuthError(
            'Application Declined: ' + (user.rejectionReason || 'Please contact support for more details.'),
            403
        );
    }

    if (user.status !== 'active' || !user.isVerified) {
        res.status(403);
        throw createClientAuthError('Access Denied: Your account is currently pending Admin approval.', 403);
    }
};

const hasGoogleProvider = (providers = []) => (
    providers
        .map((provider) => provider?.providerId || provider)
        .filter(Boolean)
        .includes('google.com')
);

const verifyFirebaseIdTokenWithRest = async (credential) => {
    if (!FIREBASE_WEB_API_KEY) {
        throw new Error('Firebase web API key is not configured.');
    }

    const { data } = await axios.post(
        `${FIREBASE_ACCOUNTS_LOOKUP_URL}?key=${FIREBASE_WEB_API_KEY}`,
        { idToken: credential },
        { timeout: 15000 }
    );
    const firebaseUser = data?.users?.[0];

    if (!firebaseUser) {
        throw new Error('Google token could not be verified.');
    }

    const providerUserInfo = firebaseUser.providerUserInfo || [];
    if (providerUserInfo.length && !hasGoogleProvider(providerUserInfo)) {
        throw new Error('Sign in with a Google account to verify this email.');
    }

    if (!firebaseUser.email || firebaseUser.emailVerified === false) {
        throw new Error('Use a Google account with a verified email address.');
    }

    return {
        email: normalizeEmail(firebaseUser.email),
        name: firebaseUser.displayName || '',
        uid: firebaseUser.localId || '',
    };
};

const verifyGoogleCredential = async (credential) => {
    if (!credential) {
        throw new Error('Google email verification is required.');
    }

    if (admin.apps && admin.apps.length > 0) {
        const decoded = await admin.auth().verifyIdToken(credential);
        const providerId = decoded?.firebase?.sign_in_provider || decoded?.sign_in_provider;
        if (providerId && providerId !== 'google.com') {
            throw new Error('Sign in with a Google account to verify this email.');
        }

        if (!decoded?.email || decoded?.email_verified === false) {
            throw new Error('Use a Google account with a verified email address.');
        }

        return {
            email: normalizeEmail(decoded.email),
            name: decoded.name || '',
            uid: decoded.uid || decoded.sub || '',
        };
    }

    try {
        return await verifyFirebaseIdTokenWithRest(credential);
    } catch (restError) {
        const tokenParts = credential.split('.');
        if (tokenParts.length !== 3) {
            throw new Error('Invalid Google token format.');
        }

        try {
            const header = JSON.parse(Buffer.from(tokenParts[0], 'base64url').toString());
            const { data: certs } = await axios.get(FIREBASE_CERTS_URL, { timeout: 15000 });
            const publicKey = certs[header.kid];

            if (!publicKey) {
                throw new Error('Invalid Google token signing key.');
            }

            const decoded = jwt.verify(credential, publicKey, {
                algorithms: ['RS256'],
                audience: FIREBASE_PROJECT_ID,
                issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
            });
            const providerId = decoded?.firebase?.sign_in_provider || decoded?.sign_in_provider;
            if (providerId && providerId !== 'google.com') {
                throw new Error('Sign in with a Google account to verify this email.');
            }

            if (!decoded?.email || decoded?.email_verified === false) {
                throw new Error('Use a Google account with a verified email address.');
            }

            return {
                email: normalizeEmail(decoded.email),
                name: decoded.name || '',
                uid: decoded.uid || decoded.sub || '',
            };
        } catch (jwtError) {
            throw new Error(restError.response?.data?.error?.message || restError.message || jwtError.message);
        }
    }
};

const authUser = asyncHandler(async (req, res) => {
    const { email, password, rememberMe, expectedRole } = req.body;
    const normalizedExpectedRole = normalizeRole(expectedRole);

    if (!PATIENT_DOCTOR_PORTAL_ROLES.has(normalizedExpectedRole)) {
        return res.status(400).json({ message: 'Choose whether you are signing in as a patient or a doctor.' });
    }

    const emailError = validateEmailInput(email, normalizedExpectedRole === 'doctor' ? 'Professional email' : 'Email address');
    if (emailError) {
        return res.status(400).json({ message: emailError });
    }

    const passwordError = validatePasswordInput(password);
    if (passwordError) {
        return res.status(400).json({ message: passwordError });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
        return res.status(401).json({ message: 'No account found with this email address.' });
    }

    if (user.role !== normalizedExpectedRole) {
        return res.status(403).json({
            message: `This email belongs to a ${getRoleLabel(user.role)} account. Use the correct login page.`,
        });
    }

    if (!(await user.matchPassword(password))) {
        return res.status(401).json({ message: 'The password you entered is incorrect.' });
    }

    enforceAccountNotBlocked(user, res);

    if (user.role === 'doctor') {
        enforceDoctorPortalStatus(user, res);
    }

    if (user.role === 'patient' && !user.isVerified) {
        return res.status(401).json({
            message: 'Verify Your Email: Please click the link we sent to your email to verify your account.',
            requiresVerification: true
        });
    }

    await sendAuthSuccess({
        user,
        res,
        rememberMe,
        message: 'Login successful',
    });
});

const authAdmin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const emailError = validateEmailInput(email);
    if (emailError) {
        return res.status(400).json({ message: emailError });
    }

    const passwordError = validatePasswordInput(password);
    if (passwordError) {
        return res.status(400).json({ message: passwordError });
    }

    const user = await User.findOne({ email: normalizeEmail(email) });

    if (!user) {
        return res.status(401).json({ message: 'No admin account found with this email address.' });
    }

    if (user.role !== 'admin') {
        return res.status(403).json({ message: 'This email is not registered as an admin account.' });
    }

    if (!(await user.matchPassword(password))) {
        return res.status(401).json({ message: 'The password you entered is incorrect.' });
    }

    enforceAccountNotBlocked(user, res);

    await sendAuthSuccess({
        user,
        res,
        message: 'Admin Login successful',
        roleLabel: 'admin account',
    });
});

const registerUser = asyncHandler(async (req, res) => {
    const { name, firstName, lastName, email, password, role } = req.body;
    const normalizedRole = normalizeRole(role || 'patient');
    const normalizedEmail = normalizeEmail(email);

    if (!['patient', 'doctor'].includes(normalizedRole)) {
        throwValidationError(res, 'Choose whether you are registering as a patient or a doctor.');
    }

    const nameError = getRequiredInputError(name || `${firstName || ''} ${lastName || ''}`, 'Full name');
    if (nameError) {
        throwValidationError(res, nameError);
    }

    const emailError = validateEmailInput(normalizedEmail);
    if (emailError) {
        throwValidationError(res, emailError);
    }

    const passwordError = validateStrongPasswordInput(password);
    if (passwordError) {
        throwValidationError(res, passwordError);
    }

    if (req.body.confirmPassword && password !== req.body.confirmPassword) {
        throwValidationError(res, 'Passwords do not match. Type the same password again.');
    }

    if (normalizedRole === 'doctor') {
        const doctorFieldErrors = [
            getRequiredInputError(req.body.medicalLicenseId, 'Medical license ID'),
            getRequiredInputError(req.body.specialization, 'Specialization'),
            getRequiredInputError(req.body.hospitalName, 'Hospital name'),
            getRequiredInputError(req.body.experience, 'Experience'),
            getRequiredInputError(req.body.fees, 'Consultation fee'),
        ].filter(Boolean);

        if (doctorFieldErrors.length) {
            throwValidationError(res, doctorFieldErrors[0]);
        }
    }

    const requiredNames = resolveRequiredUserNames({
        firstName,
        lastName,
        displayName: name,
        email: normalizedEmail,
        role: normalizedRole,
    });
    const medicalLicenseImageFile = getUploadedRegistrationFile(req.files, 'medicalLicenseImage');
    const nicImageFile = getUploadedRegistrationFile(req.files, 'nicImage');

    if (normalizedRole === 'doctor' && (!medicalLicenseImageFile || !nicImageFile)) {
        cleanupUploadedRegistrationFiles(req.files);
        res.status(400);
        throw new Error('Medical license image and NIC image are required for doctor registration');
    }

    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
        cleanupUploadedRegistrationFiles(req.files);
        res.status(400);
        throw new Error('An account already exists with this email. Try logging in instead.');
    }

    let user;

    try {
        user = await User.create({
            name: requiredNames.name,
            firstName: requiredNames.firstName,
            lastName: requiredNames.lastName,
            email: normalizedEmail,
            password,
            role: normalizedRole,
            status: (normalizedRole === 'doctor') ? 'pending' : 'active',
            medicalLicenseId: req.body.medicalLicenseId,
            specialization: req.body.specialization,
            isVerified: normalizedRole === 'patient',
            googleVerifiedEmail: false,
        });
    } catch (error) {
        cleanupUploadedRegistrationFiles(req.files);
        throw error;
    }

    if (user && normalizedRole === 'doctor') {
        try {
            const experienceYears = parseNonNegativeNumber(req.body.experience);
            const consultationFee = parseNonNegativeNumber(req.body.fees);

            await Doctor.create({
                user: user._id,
                fullName: getUserDisplayName(user),
                firstName: user.firstName,
                lastName: user.lastName,
                specialization: req.body.specialization || 'General',
                hospitalAffiliation: req.body.hospitalName || 'Private Practice',
                experienceYears,
                consultationFee,
                medicalLicenseImagePath: medicalLicenseImageFile.path,
                medicalLicenseImageUrl: normalizePublicPath(medicalLicenseImageFile.path),
                nicImagePath: nicImageFile.path,
                nicImageUrl: normalizePublicPath(nicImageFile.path),
                isVerified: false,
            });
        } catch (error) {
            cleanupUploadedRegistrationFiles(req.files);
            await User.deleteOne({ _id: user._id });
            console.error("Error creating doctor profile:", error);
            res.status(500);
            throw new Error('Unable to complete doctor registration');
        }

        // Generate Doctor Notification
        await Notification.create({
            type: 'DOCTOR_APPROVAL',
            title: 'New Doctor Registration',
            message: `Dr. ${user.name} has registered and is awaiting approval.`,
            link: '/admin/doctors'
        });

        await sendTemplatedEmail({
            eventKey: 'DOCTOR_APPLICATION_RECEIVED',
            recipient: user.email,
            data: { name: user.name },
            category: 'transactional'
        });

        await sendAdminTemplatedEmail({
            eventKey: 'SYSTEM_ALERT_NEW_DOCTOR',
            data: {
                name: user.name,
                email: user.email,
                specialization: req.body.specialization || '',
            },
            dedupeKey: `doctor-registration:${user._id}`,
            relatedEntity: user._id,
            relatedEntityModel: 'User',
            category: 'system',
        });
    } else if (user && normalizedRole !== 'admin') {
        // Generate Patient Notification
        await Notification.create({
            type: 'PATIENT_REGISTRATION',
            title: 'New Patient Joined',
            message: `${user.name} has registered as a new patient.`,
            link: '/admin/patients'
        });
    }

    if (user) {
        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        user.refreshToken = [refreshToken];
        await user.save();

        res.cookie('jwt', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'None',
            maxAge: 24 * 60 * 60 * 1000
        });

        if (normalizedRole === 'patient') {
            try {
                await sendTemplatedEmail({
                eventKey: 'WELCOME_PATIENT',
                recipient: user.email,
                data: { name: user.name },
                category: 'transactional'
            });
        } catch (emailErr) {
            console.error('Welcome email failed (non-blocking):', emailErr.message);
            }
        }

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isProfileComplete: user.isProfileComplete,
            accessToken,
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});

const handleRefreshToken = asyncHandler(async (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.jwt) return res.sendStatus(401);

    const refreshToken = cookies.jwt;
    res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true });

    const user = await User.findOne({ refreshToken }).exec();

    if (!user) {
        jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET || 'refresh_secret_123',
            async (err, decoded) => {
                if (!err) {
                    const hackedUser = await User.findOne({ _id: decoded.id }).exec();
                    if (hackedUser) {
                        hackedUser.refreshToken = [];
                        await hackedUser.save();
                    }
                }
            }
        );
        return res.sendStatus(403);
    }

    const newRefreshTokenArray = user.refreshToken.filter(rt => rt !== refreshToken);

    jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET || 'refresh_secret_123',
        async (err, decoded) => {
            if (err) {
                user.refreshToken = [...newRefreshTokenArray];
                await user.save();
                return res.sendStatus(403);
            }

            if (err || user._id.toString() !== decoded.id) return res.sendStatus(403);

            const accessToken = generateAccessToken(user._id);
            const newRefreshToken = generateRefreshToken(user._id);

            if (user.status === 'blocked') {
                user.refreshToken = [...newRefreshTokenArray];
                await user.save();
                return res.status(403).json({
                    message: 'This account has been blocked by an administrator.',
                });
            }

            if (user.role === 'doctor' && (user.status !== 'active' || !user.isVerified)) {
                user.refreshToken = [...newRefreshTokenArray];
                await user.save();
                return res.status(403).json({
                    message:
                        user.status === 'rejected'
                            ? 'Doctor access is no longer available for this account.'
                            : 'Doctor access is pending admin approval.',
                });
            }

            user.refreshToken = [...newRefreshTokenArray, newRefreshToken];
            await user.save();

            res.cookie('jwt', newRefreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'None',
                maxAge: 24 * 60 * 60 * 1000
            });

            res.json({
                accessToken,
                role: user.role,
                status: user.status,
                isVerified: user.isVerified,
                name: user.name,
                _id: user._id,
            });
        }
    );
});

const logoutUser = asyncHandler(async (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.jwt) return res.sendStatus(204);

    const refreshToken = cookies.jwt;

    const user = await User.findOne({ refreshToken }).exec();
    if (!user) {
        res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true });
        return res.sendStatus(204);
    }

    user.refreshToken = user.refreshToken.filter(rt => rt !== refreshToken);
    await user.save();

    res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true });
    res.sendStatus(204);
});

const googleAuth = asyncHandler(async (req, res) => {
    const { credential, expectedRole, intent } = req.body;
    const normalizedExpectedRole = normalizeRole(expectedRole);
    const normalizedIntent = String(intent || '').trim().toLowerCase();

    if (!credential || !GOOGLE_AUTH_ROLES.has(normalizedExpectedRole) || !GOOGLE_AUTH_INTENTS.has(normalizedIntent)) {
        return res.status(400).json({ message: 'Google Authentication failed' });
    }

    if (normalizedExpectedRole !== 'patient' && normalizedIntent !== 'login') {
        return res.status(400).json({ message: 'Google Authentication failed' });
    }

    try {
        const googleProfile = await verifyGoogleCredential(credential);
        const { email, name, uid } = googleProfile;
        const requiredNames = resolveRequiredUserNames({
            displayName: name,
            email,
            role: normalizedExpectedRole,
        });

        let user = await User.findOne({ email });
        const isNewPatientSignup =
            normalizedExpectedRole === 'patient' && normalizedIntent === 'signup' && !user;

        if (!user && isNewPatientSignup) {
            user = await User.create({
                name: requiredNames.name,
                firstName: requiredNames.firstName,
                lastName: requiredNames.lastName,
                email: normalizeEmail(email),
                password: await bcrypt.hash(uid + process.env.ACCESS_TOKEN_SECRET, 10),
                role: 'patient',
                status: 'active',
                isVerified: true,
                googleVerifiedEmail: true,
            });
        }

        if (!user || user.role !== normalizedExpectedRole) {
            return rejectPortalAuth(res);
        }

        ensureRequiredUserNames(user, name);
        enforceAccountNotBlocked(user, res);

        if (user.role === 'doctor') {
            enforceDoctorPortalStatus(user, res);
        }

        if (user.role === 'patient') {
            user.isVerified = true;
        }

        user.googleVerifiedEmail = true;

        const accessToken = await issueAuthSession({ user, res, displayName: name });

        if (isNewPatientSignup) {
            await sendTemplatedEmail({
                eventKey: 'WELCOME_PATIENT',
                recipient: user.email,
                data: { name: getUserDisplayName(user) },
                category: 'transactional'
            });
        } else {
            await sendLoginAlert(user, user.role === 'admin' ? 'admin account' : user.role);
        }

        res.json({
            _id: user._id,
            name: getUserDisplayName(user),
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            status: user.status,
            isVerified: user.isVerified,
            isProfileComplete: user.isProfileComplete,
            accessToken,
            message: "Google Login successful"
        });

    } catch (error) {
        if (error?.exposeToClient) {
            return res
                .status(error.statusCode || (res.statusCode >= 400 ? res.statusCode : 400))
                .json({ message: error.message });
        }

        console.error("Google Auth Error:", error);
        if (process.env.NODE_ENV !== 'production' && error?.message) {
            return res.status(400).json({ message: `Google Authentication failed: ${error.message}` });
        }
        res.status(400).json({ message: "Google Authentication failed" });
    }
});

const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const emailError = validateEmailInput(email);
    if (emailError) {
        throwValidationError(res, emailError);
    }

    const user = await User.findOne({ email: normalizeEmail(email) });

    if (!user) {
        return res.status(200).json({
            success: true,
            message: GENERIC_RESET_EMAIL_MESSAGE,
        });
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

    try {
        const log = await sendTemplatedEmail({
            eventKey: 'FORGOT_PASSWORD',
            recipient: user.email,
            data: { name: user.name, resetUrl },
            category: 'security',
            throwOnError: true,
        });

        if (!log) {
            throw new Error('Email delivery unavailable');
        }

        res.status(200).json({
            success: true,
            message: GENERIC_RESET_EMAIL_MESSAGE,
        });
    } catch (err) {
        console.error(err);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save({ validateBeforeSave: false });

        res.status(500);
        throw new Error('Email could not be sent');
    }
});

const validateResetPasswordToken = asyncHandler(async (req, res) => {
    const { token } = req.body;

    if (!token) {
        res.status(400);
        throw new Error('Reset token is required');
    }

    const resetPasswordToken = hashResetPasswordToken(token);
    const userWithToken = await User.findOne({ resetPasswordToken });

    if (!userWithToken) {
        return res.status(400).json({
            valid: false,
            status: 'invalid',
            message: 'This reset link is invalid or has already been used.',
        });
    }

    if (!userWithToken.resetPasswordExpire || userWithToken.resetPasswordExpire <= Date.now()) {
        return res.status(400).json({
            valid: false,
            status: 'expired',
            message: 'This reset link has expired. Request a new one to continue.',
        });
    }

    res.status(200).json({
        valid: true,
        status: 'valid',
        message: 'Reset link is valid.',
    });
});

const resetPassword = asyncHandler(async (req, res) => {
    const { newPassword, token } = req.body;

    if (!token) {
        res.status(400);
        throw new Error('Reset token is required');
    }

    const passwordError = validatePasswordInput(newPassword, 'New password');
    if (passwordError) {
        throwValidationError(res, passwordError);
    }

    const resetPasswordToken = hashResetPasswordToken(token);
    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
        res.status(400);
        throw new Error('Invalid or expired reset token');
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    await sendTemplatedEmail({
        eventKey: 'PASSWORD_RESET_SUCCESS',
        recipient: user.email,
        data: { name: user.name },
        category: 'security'
    });

    res.status(200).json({ message: 'Password updated successfully' });
});
const getMyProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select('-password');

    if (user) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            isVerified: user.isVerified,
            phone: user.phone || "",
            location: user.location || "",
            medicalLicenseId: user.medicalLicenseId,
            specialization: user.specialization
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

// @desc    Update user profile (Self)
// @route   PUT /api/auth/me
// @access  Private
const updateMyProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        user.phone = req.body.phone || user.phone;
        user.location = req.body.location || user.location;

        if (req.body.password) {
            user.password = req.body.password;
        }

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            phone: updatedUser.phone,
            location: updatedUser.location,
            token: generateAccessToken(updatedUser._id),
            message: "Profile updated successfully."
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

module.exports = {
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
};
