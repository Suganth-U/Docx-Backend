const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Order = require('../models/Order');
const OnlineConsultation = require('../models/OnlineConsultation');
const SystemMetric = require('../models/SystemMetric');
const AdminProfile = require('../models/AdminProfile');
const Prescription = require('../models/Prescription');
const Message = require('../models/Message');
const { sendTemplatedEmail } = require('../utils/email/dispatcher');
const {
    createDoctorNotification,
    createPatientNotification,
} = require('../utils/notifications');
const { toAbsoluteUrl } = require('../utils/storagePaths');
const { cascadeDeleteUser } = require('../services/userCascadeDeleteService');

const getUserDisplayName = (user) => (
    typeof user?.getDisplayName === 'function'
        ? user.getDisplayName()
        : String(user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Admin User')
);

const escapeRegex = (value = '') =>
    String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const makeSearchRegex = (query = '') => new RegExp(escapeRegex(query), 'i');

const compactId = (value = '') => String(value || '').slice(-8).toUpperCase();

const formatDateTime = (value) => {
    if (!value) return 'Date pending';

    return new Date(value).toLocaleString('en-LK', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
};

const formatCurrency = (value = 0) =>
    `LKR ${Number(value || 0).toLocaleString('en-LK', { maximumFractionDigits: 0 })}`;

const appendResult = (results, item) => {
    if (!item?.path) return;

    const key = `${item.type}:${item.path}:${item.title}`;
    if (results.some((existing) => `${existing.type}:${existing.path}:${existing.title}` === key)) {
        return;
    }

    results.push(item);
};

const addAdminQuickLinks = (results, query) => {
    const normalized = String(query || '').toLowerCase();
    const quickLinks = [
        {
            type: 'navigation',
            title: 'Doctor directory',
            subtitle: 'Manage doctor profiles and approval status',
            meta: 'Doctors',
            path: `/admin/doctors?search=${encodeURIComponent(query)}`,
            keywords: ['doctor', 'doctors', 'specialist', 'specialty', 'approval'],
        },
        {
            type: 'navigation',
            title: 'Patient records',
            subtitle: 'Open patient profiles, appointments, orders, and EHR',
            meta: 'Patients',
            path: `/admin/patients?search=${encodeURIComponent(query)}`,
            keywords: ['patient', 'patients', 'record', 'records', 'profile'],
        },
        {
            type: 'navigation',
            title: 'Appointment management',
            subtitle: 'Review visits, queue numbers, status, and payment state',
            meta: 'Appointments',
            path: `/admin/appointments?search=${encodeURIComponent(query)}`,
            keywords: ['appointment', 'appointments', 'booking', 'visit', 'queue', 'payment'],
        },
        {
            type: 'navigation',
            title: 'Order history',
            subtitle: 'Search pharmacy orders, delivery, and payment state',
            meta: 'Orders',
            path: `/admin/pharmacy?tab=orders&search=${encodeURIComponent(query)}`,
            keywords: ['order', 'orders', 'payment', 'payments', 'pharmacy', 'medicine', 'delivery'],
        },
        {
            type: 'navigation',
            title: 'Electronic health records',
            subtitle: 'Search patient clinical timelines and prescriptions',
            meta: 'EHR',
            path: `/admin/ehr?search=${encodeURIComponent(query)}`,
            keywords: ['ehr', 'record', 'records', 'prescription', 'diagnosis', 'clinical'],
        },
        {
            type: 'navigation',
            title: 'Online consultations',
            subtitle: 'Review virtual requests, approvals, meetings, and payments',
            meta: 'Consultations',
            path: `/admin/online-consultation?search=${encodeURIComponent(query)}`,
            keywords: ['online', 'virtual', 'consultation', 'consultations', 'meeting', 'payment'],
        },
    ];

    quickLinks.forEach((link) => {
        if (link.keywords.some((keyword) => keyword.includes(normalized) || normalized.includes(keyword))) {
            appendResult(results, link);
        }
    });
};

const BLOCKABLE_ACCOUNT_ROLES = new Set(['patient', 'doctor']);
const RESTORABLE_ACCOUNT_STATUSES = new Set(['pending', 'active', 'rejected']);

const formatAdminAccountUser = (user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    isVerified: user.isVerified,
    statusBeforeBlocked: user.statusBeforeBlocked || '',
    blockedReason: user.blockedReason || '',
    blockedAt: user.blockedAt || null,
});

const getRestoredStatus = (user) => {
    if (RESTORABLE_ACCOUNT_STATUSES.has(user.statusBeforeBlocked)) {
        return user.statusBeforeBlocked;
    }

    return user.role === 'doctor' ? 'pending' : 'active';
};

const syncDoctorVerificationForStatus = async (userId, status) => {
    const doctorProfile = await Doctor.findOne({ user: userId });
    if (!doctorProfile) {
        return;
    }

    const isVerified = status === 'active';
    doctorProfile.isVerified = isVerified;
    await doctorProfile.save();

    await User.updateOne(
        { _id: userId },
        { $set: { isVerified } }
    );
};

const notifyAccountStatusChange = async ({ user, isBlocked, reason }) => {
    const notification = {
        type: 'ACCOUNT_STATUS_UPDATE',
        title: isBlocked ? 'Account blocked' : 'Account restored',
        message: isBlocked
            ? `Your DocX account has been blocked by an administrator.${reason ? ` Reason: ${reason}` : ''}`
            : 'Your DocX account access has been restored.',
        link: user.role === 'doctor' ? '/doctor/dashboard' : '/patient/profile',
    };

    if (user.role === 'doctor') {
        await createDoctorNotification({
            doctorUserId: user._id,
            ...notification,
        });
        return;
    }

    if (user.role === 'patient') {
        await createPatientNotification({
            patientUserId: user._id,
            ...notification,
        });
    }
};

// Simple in-memory cache for dashboard data
let dashboardCache = {
    data: null,
    timestamp: 0
};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getPendingDoctors = asyncHandler(async (req, res) => {
    const pendingUsers = await User.find({ role: 'doctor', status: 'pending' }).select('-password');

    const pendingDoctorsWithDetails = await Promise.all(pendingUsers.map(async (user) => {
        const doctorProfile = await require('../models/Doctor').findOne({ user: user._id });

        return {
            _id: user._id,
            name: user.name,
            email: user.email,
            status: user.status,
            createdAt: user.createdAt,
            specialization: doctorProfile ? doctorProfile.specialization : 'N/A',
            experience: doctorProfile ? doctorProfile.experienceYears : 'N/A',
            hospitalName: doctorProfile ? doctorProfile.hospitalAffiliation : 'N/A',
            fees: doctorProfile ? doctorProfile.consultationFee : 'N/A',
            medicalLicenseId: user.medicalLicenseId,
            medicalLicenseImageUrl: doctorProfile
                ? toAbsoluteUrl(req, doctorProfile.medicalLicenseImageUrl)
                : '',
            nicImageUrl: doctorProfile
                ? toAbsoluteUrl(req, doctorProfile.nicImageUrl)
                : '',
        };
    }));

    res.json(pendingDoctorsWithDetails);
});

const approveDoctor = asyncHandler(async (req, res) => {
    const doctorUser = await User.findById(req.params.id);

    if (doctorUser) {
        doctorUser.status = 'active';
        doctorUser.isVerified = true;
        const updatedUser = await doctorUser.save();

        const doctorProfile = await require('../models/Doctor').findOne({ user: req.params.id });
        if (doctorProfile) {
            doctorProfile.isVerified = true;
            await doctorProfile.save();
        }

        try {
            await sendTemplatedEmail({
                eventKey: 'DOCTOR_APPROVED',
                recipient: doctorUser.email,
                data: { name: doctorUser.name },
                category: 'transactional'
            });
        } catch (error) {
            console.error("Email send failed:", error);
        }

        await createDoctorNotification({
            doctorUserId: doctorUser._id,
            type: 'DOCTOR_STATUS_UPDATE',
            title: 'Doctor account approved',
            message: 'Your DocX doctor account is now active. You can start managing appointments and prescriptions.',
            link: '/doctor/dashboard',
        });

        res.json({ message: 'Doctor approved successfully', doctor: updatedUser });
    } else {
        res.status(404);
        throw new Error('Doctor not found');
    }
});

const rejectDoctor = asyncHandler(async (req, res) => {
    const doctorUser = await User.findById(req.params.id);

    if (doctorUser) {
        const rejectionReason = String(req.body.rejectionReason || '').trim();

        doctorUser.status = 'rejected';
        doctorUser.rejectionReason = rejectionReason;
        doctorUser.isVerified = false;
        await doctorUser.save();

        const doctorProfile = await require('../models/Doctor').findOne({ user: req.params.id });
        if (doctorProfile) {
            doctorProfile.isVerified = false;
            await doctorProfile.save();
        }

        try {
            await sendTemplatedEmail({
                eventKey: 'DOCTOR_REJECTED',
                recipient: doctorUser.email,
                data: { name: doctorUser.name, reason: doctorUser.rejectionReason },
                category: 'transactional'
            });
        } catch (error) {
            console.error("Email send failed:", error);
        }

        await createDoctorNotification({
            doctorUserId: doctorUser._id,
            type: 'DOCTOR_STATUS_UPDATE',
            title: 'Doctor account update',
            message: doctorUser.rejectionReason
                ? `Your DocX doctor application was not approved. Reason: ${doctorUser.rejectionReason}`
                : 'Your DocX doctor application was not approved. Please contact support for more details.',
            link: '/doctor/profile',
        });

        res.json({ message: 'Doctor rejected' });
    } else {
        res.status(404);
        throw new Error('Doctor not found');
    }
});

// @desc    Block a patient or doctor account
// @route   PUT /api/admin/users/:id/block
// @access  Private/Admin
const blockUser = asyncHandler(async (req, res) => {
    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
        res.status(404);
        throw new Error('User not found.');
    }

    if (!BLOCKABLE_ACCOUNT_ROLES.has(targetUser.role)) {
        res.status(400);
        throw new Error('Only patient and doctor accounts can be blocked from this panel.');
    }

    const blockedReason = String(req.body.reason || '').trim();

    if (targetUser.status !== 'blocked') {
        targetUser.statusBeforeBlocked = RESTORABLE_ACCOUNT_STATUSES.has(targetUser.status)
            ? targetUser.status
            : '';
    }

    targetUser.status = 'blocked';
    targetUser.blockedReason = blockedReason;
    targetUser.blockedAt = new Date();
    targetUser.blockedBy = req.user._id;
    targetUser.refreshToken = [];

    if (targetUser.role === 'doctor') {
        targetUser.isVerified = false;
        const doctorProfile = await Doctor.findOne({ user: targetUser._id });
        if (doctorProfile) {
            doctorProfile.isVerified = false;
            await doctorProfile.save();
        }
    }

    await targetUser.save();
    await notifyAccountStatusChange({ user: targetUser, isBlocked: true, reason: blockedReason });

    res.json({
        message: `${targetUser.role === 'doctor' ? 'Doctor' : 'Patient'} account blocked successfully.`,
        user: formatAdminAccountUser(targetUser),
    });
});

// @desc    Restore a blocked patient or doctor account
// @route   PUT /api/admin/users/:id/unblock
// @access  Private/Admin
const unblockUser = asyncHandler(async (req, res) => {
    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
        res.status(404);
        throw new Error('User not found.');
    }

    if (!BLOCKABLE_ACCOUNT_ROLES.has(targetUser.role)) {
        res.status(400);
        throw new Error('Only patient and doctor accounts can be restored from this panel.');
    }

    const restoredStatus = getRestoredStatus(targetUser);

    targetUser.status = restoredStatus;
    targetUser.statusBeforeBlocked = '';
    targetUser.blockedReason = '';
    targetUser.blockedAt = undefined;
    targetUser.blockedBy = undefined;

    if (targetUser.role === 'doctor') {
        targetUser.isVerified = restoredStatus === 'active';
    } else if (targetUser.role === 'patient' && restoredStatus === 'active') {
        targetUser.isVerified = true;
    }

    await targetUser.save();

    if (targetUser.role === 'doctor') {
        await syncDoctorVerificationForStatus(targetUser._id, restoredStatus);
        targetUser.isVerified = restoredStatus === 'active';
    }

    await notifyAccountStatusChange({ user: targetUser, isBlocked: false });

    res.json({
        message: `${targetUser.role === 'doctor' ? 'Doctor' : 'Patient'} account restored successfully.`,
        user: formatAdminAccountUser(targetUser),
    });
});

const getAdminDashboardStats = asyncHandler(async (req, res) => {
    // Check Cache
    if (dashboardCache.data && (Date.now() - dashboardCache.timestamp < CACHE_TTL)) {
        return res.json(dashboardCache.data);
    }

    // 1. Basic Counts & Metrics
    const patientCount = await User.countDocuments({ role: 'patient' });
    const doctorCount = await User.countDocuments({ role: 'doctor', status: 'active' });
    const appointmentCount = await Appointment.countDocuments();

    const conflictMetric = await SystemMetric.findOne({ metricType: '409_CONFLICT' });
    const conflictCount = conflictMetric ? conflictMetric.count : 0;

    const orders = await Order.aggregate([
        { $match: { isPaid: true } },
        { $group: { _id: null, totalRevenue: { $sum: "$totalPrice" } } }
    ]);
    const totalRevenue = orders.length > 0 ? orders[0].totalRevenue : 0;

    // 2. Patient Demographics (Age)
    const patients = await Patient.find({ dob: { $exists: true } });
    let ageDemographics = { '0-18': 0, '19-35': 0, '36-50': 0, '51+': 0 };
    const currentYear = new Date().getFullYear();
    patients.forEach(p => {
        const age = currentYear - new Date(p.dob).getFullYear();
        if (age <= 18) ageDemographics['0-18']++;
        else if (age <= 35) ageDemographics['19-35']++;
        else if (age <= 50) ageDemographics['36-50']++;
        else ageDemographics['51+']++;
    });

    // 3. Physical vs Virtual Ratio
    const typeCounts = await Appointment.aggregate([
        { $group: { _id: "$type", count: { $sum: 1 } } }
    ]);
    const appointmentTypes = { PHYSICAL: 0, VIRTUAL: 0 };
    typeCounts.forEach(t => {
        if (t._id === 'PHYSICAL') appointmentTypes.PHYSICAL = t.count;
        if (t._id === 'VIRTUAL') appointmentTypes.VIRTUAL = t.count;
    });

    // 4. Peak Consultation Hours
    const peakHours = await Appointment.aggregate([
        {
            $group: {
                _id: { $substr: ["$timeSlot", 0, 2] },
                count: { $sum: 1 }
            }
        },
        { $sort: { "_id": 1 } }
    ]);

    // 5. Appointment Status Breakdown (Stacked Bar Prep)
    const statusCounts = await Appointment.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    const appointmentStatus = { Completed: 0, Pending: 0, Cancelled: 0 };
    statusCounts.forEach(stat => {
        if (stat._id === 'completed') appointmentStatus.Completed = stat.count;
        if (stat._id === 'pending') appointmentStatus.Pending = stat.count;
        if (stat._id === 'cancelled' || stat._id === 'canceled') appointmentStatus.Cancelled = stat.count;
    });

    // 6. Specialty Demand & Utilization (Top Departments)
    const departmentCounts = await Appointment.aggregate([
        {
            $lookup: {
                from: "doctors",
                localField: "doctor_id",
                foreignField: "_id",
                as: "doctor"
            }
        },
        { $unwind: "$doctor" },
        {
            $group: {
                _id: "$doctor.specialization",
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
    ]);

    // 7. Top Dispensed Medications
    const topMedicines = await Order.aggregate([
        { $match: { isPaid: true } },
        { $unwind: "$orderItems" },
        {
            $group: {
                _id: "$orderItems.name", // Grouping by name since we stored name in OrderItem
                qty: { $sum: "$orderItems.qty" }
            }
        },
        { $sort: { qty: -1 } },
        { $limit: 5 }
    ]);

    // 8. Critical Low-Stock Alerts
    const lowStockMedicines = await require('../models/Medicine').find({ stock: { $lt: 20 } }).select('name stock category').limit(10);

    // 9. Revenue Trends (Visualized by physical vs virtual if applicable. Simplified here to monthly for standard area chart)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const monthlyRevenue = await Order.aggregate([
        { $match: { isPaid: true, createdAt: { $gte: sixMonthsAgo } } },
        { $group: { _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } }, revenue: { $sum: "$totalPrice" } } },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const revenueGrowth = monthlyRevenue.map(item => ({
        name: `${monthNames[item._id.month - 1]}`,
        revenue: item.revenue
    }));

    const responseData = {
        counts: {
            patients: patientCount,
            doctors: doctorCount,
            appointments: appointmentCount,
            revenue: totalRevenue,
            conflicts: conflictCount
        },
        demographics: ageDemographics,
        appointmentTypes: appointmentTypes,
        peakHours: peakHours.map(h => ({ hour: h._id + ":00", count: h.count })),
        appointmentStatus: appointmentStatus,
        topDepartments: departmentCounts.map(d => ({ name: d._id || "General", value: d.count })), // Ensure 'value' exists for Donut Chart
        topMedicines: topMedicines.map(m => ({ name: m._id, count: m.qty })), // Changed qty to count
        lowStockMedicines: lowStockMedicines,
        revenueGrowth: revenueGrowth
    };

    // Update Cache
    dashboardCache.data = responseData;
    dashboardCache.timestamp = Date.now();

    res.json(responseData);
});

// @desc    Get all registered patients
// @route   GET /api/admin/patients
// @access  Private/Admin
const getAllPatients = asyncHandler(async (req, res) => {
    const patients = await Patient.find({}).populate('user_id', '-password');

    // Filter out orphaned records where user might be null due to manual DB drops
    const validPatients = patients.filter(p => p.user_id != null);

    const formattedPatients = validPatients.map(p => ({
        _id: p.user_id._id,
        patientId: p._id,
        name: p.user_id.name,
        email: p.user_id.email,
        phone: p.phone || 'N/A',
        status: p.user_id.status || 'active',
        statusBeforeBlocked: p.user_id.statusBeforeBlocked || '',
        blockedReason: p.user_id.blockedReason || '',
        blockedAt: p.user_id.blockedAt || null,
        createdAt: p.user_id.createdAt,
        dob: p.dob,
        bloodGroup: p.bloodGroup || 'N/A',
        gender: p.gender || 'N/A'
    }));

    res.json(formattedPatients);
});

// @desc    Get comprehensive patient details (360 view)
// @route   GET /api/admin/patients/:id
// @access  Private/Admin
const getPatientFullDetails = asyncHandler(async (req, res) => {
    // 1. Fetch Patient Profile & User Core details
    const patient = await Patient.findById(req.params.id).populate('user_id', '-password');
    if (!patient || !patient.user_id) {
        res.status(404);
        throw new Error('Patient record not found');
    }

    const userId = patient.user_id._id;

    // 2. Fetch all Appointments (Join with Doctor details)
    const appointments = await Appointment.find({ patient_id: patient._id })
        .populate('doctor_id', 'fullName specialization')
        .sort({ date: -1 });

    // 3. Fetch Electronic Health Records (Prescriptions)
    const prescriptions = await Prescription.find({ patient_id: patient._id })
        .populate('doctor_id', 'fullName')
        .sort({ createdAt: -1 });

    // 4. Fetch E-Commerce Order History
    const orders = await Order.find({ user: userId }).sort({ createdAt: -1 });

    // 5. Fetch Chat Questions / Message Logs
    const messages = await Message.find({
        $or: [{ sender: userId }, { recipient: userId }]
    })
        .populate('sender', 'name')
        .populate('recipient', 'name')
        .sort({ createdAt: -1 });

    // 6. Aggregate Payload
    res.json({
        profile: {
            _id: userId,
            patientId: patient._id,
            name: patient.user_id.name,
            email: patient.user_id.email,
            phone: patient.phone || 'N/A',
            address: patient.address || 'N/A',
            status: patient.user_id.status || 'active',
            statusBeforeBlocked: patient.user_id.statusBeforeBlocked || '',
            blockedReason: patient.user_id.blockedReason || '',
            blockedAt: patient.user_id.blockedAt || null,
            createdAt: patient.user_id.createdAt,
            dob: patient.dob,
            bloodGroup: patient.bloodGroup || 'N/A',
            gender: patient.gender || 'N/A',
            height: patient.height || 'N/A',
            weight: patient.weight || 'N/A',
            allergies: patient.allergies || [],
            currentMedications: patient.currentMedications || [],
            emergencyContact: patient.emergencyContact || 'N/A',
        },
        metrics: {
            totalAppointments: appointments.length,
            totalOrders: orders.length,
            totalSpent: orders.reduce((acc, order) => acc + (order.totalPrice || 0), 0),
        },
        appointments,
        prescriptions,
        orders,
        messages
    });
});

// @desc    Get all registered doctors (both pending and active)
// @route   GET /api/admin/doctors
// @access  Private/Admin
const getAllDoctors = asyncHandler(async (req, res) => {
    const doctors = await Doctor.find({}).populate('user', '-password');

    const validDoctors = doctors.filter(d => d.user != null);

    const formattedDoctors = validDoctors.map(d => ({
        _id: d.user._id,
        doctorId: d._id,
        name: d.user.name,
        email: d.user.email,
        phone: d.user.phone || 'N/A',
        status: d.user.status,
        statusBeforeBlocked: d.user.statusBeforeBlocked || '',
        blockedReason: d.user.blockedReason || '',
        blockedAt: d.user.blockedAt || null,
        isVerified: d.isVerified,
        createdAt: d.user.createdAt,
        specialization: d.specialization || 'N/A',
        experience: d.experienceYears || 'N/A',
        hospitalName: d.hospitalAffiliation || 'N/A',
        fees: d.consultationFee || 0,
        medicalLicenseId: d.user.medicalLicenseId || 'N/A',
        medicalLicenseImageUrl: toAbsoluteUrl(req, d.medicalLicenseImageUrl),
        nicImageUrl: toAbsoluteUrl(req, d.nicImageUrl),
    }));

    res.json(formattedDoctors);
});

// @desc    Delete any user and their associated profile
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
    const result = await cascadeDeleteUser(req.params.id);

    if (!result) {
        res.status(404);
        throw new Error('User not found.');
    }

    res.json({
        message: 'User and related records completely purged from the system.',
        deletedCounts: result.deletedCounts,
    });
});

// @desc    Get dedicated admin profile
// @route   GET /api/admin/profile
// @access  Private/Admin
const getAdminProfile = asyncHandler(async (req, res) => {
    let profile = await AdminProfile.findOne({ user: req.user._id });

    if (!profile) {
        const user = await User.findById(req.user._id);
        // Auto-initialize if it doesn't exist
        profile = await AdminProfile.create({
            user: req.user._id,
            name: getUserDisplayName(user),
        });
    }

    res.json(profile);
});

// @desc    Update dedicated admin profile
// @route   PUT /api/admin/profile
// @access  Private/Admin
const updateAdminProfile = asyncHandler(async (req, res) => {
    let profile = await AdminProfile.findOne({ user: req.user._id });

    if (!profile) {
        res.status(404);
        throw new Error('Admin profile document not found.');
    }

    // Optional: Password Update Security Loop
    if (req.body.newPassword) {
        if (!req.body.oldPassword) {
            res.status(400);
            throw new Error('Please enter your current Old Password to authorize an update.');
        }

        const authUser = await User.findById(req.user._id);

        // Verify current password via Schema Method
        const isMatch = await authUser.matchPassword(req.body.oldPassword);

        if (!isMatch) {
            res.status(401);
            throw new Error('The Old Password you entered is incorrect.');
        }

        if (req.body.newPassword.length < 6) {
            res.status(400);
            throw new Error('New Password must be at least 6 characters long.');
        }

        if (req.body.name) {
            authUser.name = req.body.name;
            authUser.firstName = '';
            authUser.lastName = '';
        }
        authUser.password = req.body.newPassword;
        await authUser.save();
    }

    // Profile Metadata Fields
    if (req.body.name) {
        profile.name = req.body.name;
        profile.firstName = '';
        profile.lastName = '';
    } else {
        profile.firstName = req.body.firstName || profile.firstName;
        profile.lastName = req.body.lastName || profile.lastName;
        profile.name = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || profile.name;
    }
    profile.username = req.body.username || profile.username;
    profile.phone = req.body.phone || profile.phone;
    profile.address = req.body.address || profile.address;
    profile.dob = req.body.dob || profile.dob;
    profile.bio = req.body.bio !== undefined ? req.body.bio : profile.bio;

    if (req.body.name && !req.body.newPassword) {
        const authUser = await User.findById(req.user._id);
        if (authUser) {
            authUser.name = req.body.name;
            authUser.firstName = '';
            authUser.lastName = '';
            await authUser.save();
        }
    }

    const updatedProfile = await profile.save();
    res.json({
        profile: updatedProfile,
        message: req.body.newPassword ? 'Profile and Password successfully updated!' : 'Profile updated successfully.'
    });
});

// @desc    Get all appointments with populated data
// @route   GET /api/admin/appointments
// @access  Private/Admin
const getAllAppointments = asyncHandler(async (req, res) => {
    const Appointment = require('../models/Appointment');
    const Patient = require('../models/Patient');

    const appointments = await Appointment.find({})
        .populate({
            path: 'doctor_id',
            select: 'fullName specialization consultationFee user',
            populate: { path: 'user', select: 'name email' }
        })
        .populate({
            path: 'patient_id',
            select: 'user_id',
            populate: { path: 'user_id', select: 'name email' }
        })
        .populate('hospital', 'name address')
        .sort({ createdAt: -1 });

    const formatted = appointments.map(a => ({
        _id: a._id,
        doctorName: a.doctor_id?.fullName || a.doctor_id?.user?.name || 'Unknown',
        doctorEmail: a.doctor_id?.user?.email || '',
        specialization: a.doctor_id?.specialization || 'N/A',
        consultationFee: a.doctor_id?.consultationFee || 0,
        patientName: a.patient_id?.user_id?.name || 'Unknown',
        patientEmail: a.patient_id?.user_id?.email || '',
        hospital: a.hospital?.name || 'N/A',
        date: a.date,
        timeSlot: a.timeSlot,
        type: a.type,
        status: a.status,
        statusReason: a.statusReason || '',
        statusUpdatedAt: a.statusUpdatedAt || null,
        statusUpdatedByRole: a.statusUpdatedByRole || '',
        cancelledAt: a.cancelledAt || null,
        cancelledByRole: a.cancelledByRole || '',
        paymentStatus: a.paymentStatus,
        tokenNumber: a.tokenNumber,
        meetingLink: a.meetingLink,
        createdAt: a.createdAt
    }));

    res.json(formatted);
});

// @desc    Global admin search across people, appointments, payments, orders, and records
// @route   GET /api/admin/search?query=
// @access  Private/Admin
const getAdminGlobalSearch = asyncHandler(async (req, res) => {
    const query = String(req.query.query || '').trim();
    const results = [];

    if (query.length < 2) {
        return res.json({ query, results });
    }

    const regex = makeSearchRegex(query);
    addAdminQuickLinks(results, query);

    const [matchingUsers, matchingPatientsByProfile, matchingDoctorsByProfile] = await Promise.all([
        User.find({
            $or: [
                { name: regex },
                { email: regex },
                { role: regex },
                { status: regex },
            ],
        })
            .select('_id name email role status')
            .limit(20),
        Patient.find({
            $or: [
                { fullName: regex },
                { phone: regex },
                { bloodGroup: regex },
                { gender: regex },
            ],
        })
            .populate('user_id', 'name email status')
            .limit(8),
        Doctor.find({
            $or: [
                { fullName: regex },
                { specialization: regex },
                { hospitalAffiliation: regex },
            ],
        })
            .populate('user', 'name email status')
            .limit(8),
    ]);

    const matchingPatientUserIds = matchingUsers
        .filter((user) => user.role === 'patient')
        .map((user) => user._id);
    const matchingDoctorUserIds = matchingUsers
        .filter((user) => user.role === 'doctor')
        .map((user) => user._id);

    const [patientsByUser, doctorsByUser] = await Promise.all([
        matchingPatientUserIds.length
            ? Patient.find({ user_id: { $in: matchingPatientUserIds } })
                .populate('user_id', 'name email status')
                .limit(8)
            : [],
        matchingDoctorUserIds.length
            ? Doctor.find({ user: { $in: matchingDoctorUserIds } })
                .populate('user', 'name email status')
                .limit(8)
            : [],
    ]);

    const patients = [...matchingPatientsByProfile, ...patientsByUser].filter(
        (patient, index, list) =>
            patient?.user_id && list.findIndex((item) => String(item._id) === String(patient._id)) === index
    );
    const doctors = [...matchingDoctorsByProfile, ...doctorsByUser].filter(
        (doctor, index, list) =>
            doctor?.user && list.findIndex((item) => String(item._id) === String(doctor._id)) === index
    );

    const patientIds = patients.map((patient) => patient._id);
    const patientUserIds = patients.map((patient) => patient.user_id?._id).filter(Boolean);
    const doctorIds = doctors.map((doctor) => doctor._id);

    const [patientCounts, doctorCounts] = await Promise.all([
        Promise.all(
            patients.slice(0, 6).map(async (patient) => {
                const [appointments, prescriptions, orders] = await Promise.all([
                    Appointment.countDocuments({ patient_id: patient._id }),
                    Prescription.countDocuments({ patient_id: patient._id }),
                    Order.countDocuments({ user: patient.user_id?._id }),
                ]);

                return { patient, appointments, prescriptions, orders };
            })
        ),
        Promise.all(
            doctors.slice(0, 6).map(async (doctor) => {
                const [appointments, consultations] = await Promise.all([
                    Appointment.countDocuments({ doctor_id: doctor._id }),
                    OnlineConsultation.countDocuments({ doctor: doctor._id }),
                ]);

                return { doctor, appointments, consultations };
            })
        ),
    ]);

    patientCounts.forEach(({ patient, appointments, prescriptions, orders }) => {
        appendResult(results, {
            type: 'patient',
            title: patient.fullName || patient.user_id?.name || 'Patient',
            subtitle: patient.user_id?.email || patient.phone || 'Patient profile',
            meta: `${appointments} appointments · ${orders} orders · ${prescriptions} records`,
            path: `/admin/patients/${patient._id}`,
        });
    });

    doctorCounts.forEach(({ doctor, appointments, consultations }) => {
        appendResult(results, {
            type: 'doctor',
            title: doctor.fullName || doctor.user?.name || 'Doctor',
            subtitle: `${doctor.specialization || 'General care'} · ${doctor.user?.email || 'No email'}`,
            meta: `${appointments} appointments · ${consultations} online consultations`,
            path: `/admin/doctors?search=${encodeURIComponent(doctor.fullName || doctor.user?.name || query)}`,
        });
    });

    const appointments = await Appointment.find({
        $or: [
            { patientNameSnapshot: regex },
            { patientEmailSnapshot: regex },
            { patientPhoneSnapshot: regex },
            { doctorNameSnapshot: regex },
            { specialtySnapshot: regex },
            { hospitalNameSnapshot: regex },
            { receiptNumber: regex },
            { status: regex },
            { paymentStatus: regex },
            ...(patientIds.length ? [{ patient_id: { $in: patientIds } }] : []),
            ...(doctorIds.length ? [{ doctor_id: { $in: doctorIds } }] : []),
        ],
    })
        .populate('doctor_id', 'fullName specialization')
        .populate('patient_id', 'fullName user_id')
        .sort({ createdAt: -1 })
        .limit(6);

    appointments.forEach((appointment) => {
        const patientName = appointment.patientNameSnapshot || appointment.patient_id?.fullName || 'Patient';
        const doctorName = appointment.doctorNameSnapshot || appointment.doctor_id?.fullName || 'Doctor';

        appendResult(results, {
            type: 'appointment',
            title: `${patientName} with ${doctorName}`,
            subtitle: `${formatDateTime(appointment.date)} · ${appointment.timeSlot || 'Time pending'}`,
            meta: `${appointment.status || 'pending'} · ${appointment.paymentStatus || 'payment pending'}`,
            path: `/admin/appointments?search=${encodeURIComponent(patientName)}`,
        });
    });

    const orders = await Order.find({
        $or: [
            { fullName: regex },
            { email: regex },
            { phone: regex },
            { paymentMethod: regex },
            { paymentStatus: regex },
            { 'shippingAddress.city': regex },
            { 'orderItems.name': regex },
            ...(patientUserIds.length ? [{ user: { $in: patientUserIds } }] : []),
        ],
    })
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .limit(6);

    orders.forEach((order) => {
        appendResult(results, {
            type: 'order',
            title: `Order ${compactId(order._id)} · ${order.fullName || order.user?.name || 'Customer'}`,
            subtitle: (order.orderItems || []).slice(0, 2).map((item) => item.name).join(', ') || 'Pharmacy order',
            meta: `${order.isPaid ? 'Paid' : 'Payment pending'} · ${formatCurrency(order.totalPrice)}`,
            path: `/admin/pharmacy?tab=orders&search=${encodeURIComponent(order.fullName || order.email || compactId(order._id))}`,
        });
    });

    const consultations = await OnlineConsultation.find({
        $or: [
            { consultationNumber: regex },
            { patientNameSnapshot: regex },
            { patientEmailSnapshot: regex },
            { doctorNameSnapshot: regex },
            { specialtySnapshot: regex },
            { status: regex },
            { paymentStatus: regex },
            ...(patientIds.length ? [{ patient: { $in: patientIds } }] : []),
            ...(doctorIds.length ? [{ doctor: { $in: doctorIds } }] : []),
        ],
    })
        .sort({ createdAt: -1 })
        .limit(6);

    consultations.forEach((consultation) => {
        appendResult(results, {
            type: 'consultation',
            title: consultation.consultationNumber || `Consultation ${compactId(consultation._id)}`,
            subtitle: `${consultation.patientNameSnapshot || 'Patient'} with ${consultation.doctorNameSnapshot || 'Doctor'}`,
            meta: `${consultation.status || 'requested'} · ${consultation.paymentStatus || 'payment pending'}`,
            path: `/admin/online-consultation?search=${encodeURIComponent(consultation.consultationNumber || consultation.patientNameSnapshot || query)}`,
        });
    });

    const prescriptions = await Prescription.find({
        $or: [
            { diagnosis: regex },
            { notes: regex },
            { 'medicines.name': regex },
            ...(patientIds.length ? [{ patient_id: { $in: patientIds } }] : []),
            ...(doctorIds.length ? [{ doctor_id: { $in: doctorIds } }] : []),
        ],
    })
        .populate('patient_id', 'fullName')
        .populate('doctor_id', 'fullName')
        .sort({ createdAt: -1 })
        .limit(6);

    prescriptions.forEach((prescription) => {
        const patientName = prescription.patient_id?.fullName || 'Patient';

        appendResult(results, {
            type: 'record',
            title: `${patientName} · ${prescription.diagnosis || 'Clinical record'}`,
            subtitle: (prescription.medicines || []).slice(0, 2).map((medicine) => medicine.name).join(', ') || 'Prescription record',
            meta: `By ${prescription.doctor_id?.fullName || 'doctor'} · ${formatDateTime(prescription.createdAt)}`,
            path: `/admin/ehr?search=${encodeURIComponent(patientName)}`,
        });
    });

    res.json({ query, results: results.slice(0, 24) });
});

module.exports = {
    getPendingDoctors,
    approveDoctor,
    rejectDoctor,
    blockUser,
    unblockUser,
    getAdminDashboardStats,
    getAllPatients,
    getPatientFullDetails,
    getAllDoctors,
    deleteUser,
    getAdminProfile,
    updateAdminProfile,
    getAllAppointments,
    getAdminGlobalSearch
};
