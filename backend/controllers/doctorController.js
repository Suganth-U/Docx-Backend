const asyncHandler = require('express-async-handler');
const fs = require('fs');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const OnlineConsultation = require('../models/OnlineConsultation');
const User = require('../models/User');
const Prescription = require('../models/Prescription');
const DoctorSchedule = require('../models/DoctorSchedule');
const DoctorVirtualSchedule = require('../models/DoctorVirtualSchedule');
const Hospital = require('../models/Hospital');
const Patient = require('../models/Patient');
const Order = require('../models/Order');
const DoctorLeave = require('../models/DoctorLeave');
const { sendTemplatedEmail } = require('../utils/email/dispatcher');
const { createPatientNotification } = require('../utils/notifications');
const {
    ensureAvailabilityDocument,
    getDayOfWeekFromDateKey,
    getOpenSlots,
    hasTimeOverlap,
    normalizeDateKey,
    releaseExpiredHoldsForDoctorDate,
} = require('../utils/appointmentScheduling');
const { normalizePublicPath, toAbsoluteUrl } = require('../utils/storagePaths');
const { cascadeDeleteUser, releaseAppointmentSlots } = require('../services/userCascadeDeleteService');

const normalizeSpecialtyTerm = (value = '') =>
    String(value)
        .toLowerCase()
        .replace(/[^a-z\s]/g, ' ')
        .replace(/\b(consultant|specialist|medicine|medical)\b/g, ' ')
        .replace(/(ologist|ology|iatrist|iatry|ician|icians|logist|ics|ic|ist|ian|ry)\b/g, '')
        .replace(/\s+/g, ' ')
        .trim();

const matchesSpecialtyQuery = (doctorSpecialty = '', query = '') => {
    const left = String(doctorSpecialty || '').toLowerCase().trim();
    const right = String(query || '').toLowerCase().trim();

    if (!right) return true;
    if (left.includes(right) || right.includes(left)) return true;

    const normalizedLeft = normalizeSpecialtyTerm(left);
    const normalizedRight = normalizeSpecialtyTerm(right);

    return Boolean(
        normalizedLeft &&
        normalizedRight &&
        (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft))
    );
};

const visiblePhysicalAppointmentQuery = (doctorId) => ({
    doctor_id: doctorId,
    type: 'PHYSICAL',
    status: { $in: ['confirmed', 'completed'] },
    paymentStatus: 'paid'
});

const manageablePhysicalAppointmentQuery = (doctorId) => ({
    doctor_id: doctorId,
    type: 'PHYSICAL',
    status: { $in: ['pending', 'confirmed', 'completed', 'cancelled'] },
    $and: [
        {
            $or: [
                { status: 'cancelled' },
                { paymentStatus: { $nin: ['failed', 'canceled', 'expired', 'chargedback'] } },
            ],
        },
        {
            $or: [
                { status: { $in: ['confirmed', 'completed', 'cancelled'] } },
                { holdExpiresAt: { $exists: false } },
                { holdExpiresAt: null },
                { holdExpiresAt: { $gt: new Date() } },
            ],
        },
    ],
});

const visiblePatientRosterAppointmentQuery = (doctorId) => ({
    doctor_id: doctorId,
    status: { $in: ['pending', 'confirmed', 'completed'] },
    paymentStatus: { $nin: ['failed', 'canceled', 'expired', 'chargedback'] },
    $or: [
        { status: { $in: ['confirmed', 'completed'] } },
        { holdExpiresAt: { $exists: false } },
        { holdExpiresAt: null },
        { holdExpiresAt: { $gt: new Date() } },
    ],
});

const visibleVirtualConsultationQuery = (doctorId) => ({
    doctor: doctorId,
    status: { $in: ['scheduled', 'meeting_pending', 'completed'] },
    paymentStatus: 'paid'
});

const displayDateLabel = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const escapeRegex = (value = '') =>
    String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const makeSearchRegex = (query = '') => new RegExp(escapeRegex(query), 'i');

const compactId = (value = '') => String(value || '').slice(-8).toUpperCase();

const calculateAge = (dob) => {
    if (!dob) return 'Not recorded';

    const birthDate = new Date(dob);
    if (Number.isNaN(birthDate.getTime())) return 'Not recorded';

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDelta = today.getMonth() - birthDate.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) {
        age -= 1;
    }

    return age >= 0 ? age : 'Not recorded';
};

const normalizeEducationList = (value) => {
    if (Array.isArray(value)) {
        return value.map((item) => String(item || '').trim()).filter(Boolean);
    }

    if (typeof value === 'string') {
        return value
            .split(/\r?\n|,/)
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return [];
};

const getDoctorProfileMetrics = async (doctorId) => {
    const [
        physicalAppointments,
        virtualConsultations,
        physicalScheduleCount,
        virtualScheduleCount,
        prescriptionCount,
    ] = await Promise.all([
        Appointment.find(visiblePhysicalAppointmentQuery(doctorId)).select('patient_id').lean(),
        OnlineConsultation.find(visibleVirtualConsultationQuery(doctorId)).select('patient').lean(),
        DoctorSchedule.countDocuments({ doctor: doctorId }),
        DoctorVirtualSchedule.countDocuments({ doctor: doctorId, active: true }),
        Prescription.countDocuments({ doctor_id: doctorId }),
    ]);

    const uniquePatients = new Set([
        ...physicalAppointments.map((appointment) => appointment.patient_id?.toString()),
        ...virtualConsultations.map((consultation) => consultation.patient?.toString()),
    ].filter(Boolean));

    return {
        patients: uniquePatients.size,
        totalPatients: uniquePatients.size,
        totalConsultations: physicalAppointments.length + virtualConsultations.length,
        prescriptionCount,
        physicalScheduleCount,
        virtualScheduleCount,
        availability:
            physicalScheduleCount || virtualScheduleCount
                ? 'Available'
                : 'No schedules set',
        rating: 'Not rated',
    };
};

const buildDoctorProfilePayload = async (req, doctor, userDoc = null) => {
    const user = userDoc || doctor.user || {};
    const metrics = await getDoctorProfileMetrics(doctor._id);

    return {
        _id: doctor._id,
        name: doctor.fullName || user.name || 'Doctor',
        email: user.email || '',
        phone: user.phone || '',
        specialty: doctor.specialization || '',
        specialization: doctor.specialization || '',
        hospitalName: doctor.hospitalAffiliation || '',
        experience: doctor.experienceYears ?? 0,
        fees: doctor.consultationFee ?? 0,
        about: doctor.bio || '',
        education: doctor.education || [],
        profileImageUrl: toAbsoluteUrl(req, doctor.profileImageUrl),
        signatureImageUrl: toAbsoluteUrl(req, doctor.signatureImageUrl),
        signatureUpdatedAt: doctor.signatureUpdatedAt,
        isVerified: Boolean(doctor.isVerified || user.isVerified),
        ...metrics,
    };
};

const addResult = (results, item) => {
    if (!item?.path) return;

    const key = `${item.type}:${item.path}:${item.title}`;
    if (results.some((existing) => `${existing.type}:${existing.path}:${existing.title}` === key)) {
        return;
    }

    results.push(item);
};

const addDoctorQuickLinks = (results, query) => {
    const normalized = String(query || '').toLowerCase();
    const links = [
        {
            type: 'navigation',
            title: 'Patient records',
            subtitle: 'Open patient profiles, appointments, and prescriptions',
            meta: 'Patients',
            path: `/doctor/patients?search=${encodeURIComponent(query)}`,
            keywords: ['patient', 'patients', 'record', 'records', 'history'],
        },
        {
            type: 'navigation',
            title: 'Appointments',
            subtitle: 'Search your physical appointment list',
            meta: 'Appointments',
            path: `/doctor/appointments?search=${encodeURIComponent(query)}`,
            keywords: ['appointment', 'appointments', 'booking', 'queue', 'payment'],
        },
        {
            type: 'navigation',
            title: 'Prescriptions',
            subtitle: 'Search prescriptions by patient, diagnosis, or medicine',
            meta: 'Prescriptions',
            path: `/doctor/prescription?search=${encodeURIComponent(query)}`,
            keywords: ['prescription', 'prescriptions', 'medicine', 'diagnosis', 'record'],
        },
        {
            type: 'navigation',
            title: 'Online sessions',
            subtitle: 'Review virtual consultation requests and scheduled sessions',
            meta: 'Sessions',
            path: `/doctor/schedule?search=${encodeURIComponent(query)}`,
            keywords: ['online', 'virtual', 'consultation', 'session', 'meeting'],
        },
    ];

    links.forEach((link) => {
        if (link.keywords.some((keyword) => keyword.includes(normalized) || normalized.includes(keyword))) {
            addResult(results, link);
        }
    });
};

const shortDateLabel = (date) => {
    if (!date) return 'Upcoming';

    const value = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(value);
    target.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (target.getTime() === today.getTime()) return 'Today';
    if (target.getTime() === tomorrow.getTime()) return 'Tomorrow';

    return value.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const buildDoctorAppointmentPayload = (appointment) => ({
    id: appointment._id,
    patientName:
        appointment.patientNameSnapshot ||
        appointment.patient_id?.fullName ||
        appointment.patient_id?.user_id?.name ||
        'Unknown patient',
    patientEmail: appointment.patientEmailSnapshot || appointment.patient_id?.user_id?.email || '',
    date: appointment.date,
    timeSlot: appointment.timeSlot,
    time_slot: appointment.timeSlot,
    type: appointment.type,
    status: appointment.status,
    statusReason: appointment.statusReason || '',
    statusUpdatedAt: appointment.statusUpdatedAt || null,
    statusUpdatedByRole: appointment.statusUpdatedByRole || '',
    cancelledAt: appointment.cancelledAt || null,
    cancelledByRole: appointment.cancelledByRole || '',
    paymentStatus: appointment.paymentStatus,
    queueNumber: appointment.queueNumber || null,
    receiptNumber: appointment.receiptNumber || '',
    doctorName: appointment.doctorNameSnapshot || appointment.doctor_id?.fullName || appointment.doctor_id?.user?.name || '',
    specialty: appointment.specialtySnapshot || appointment.doctor_id?.specialization || '',
    venueName: appointment.hospitalNameSnapshot || appointment.hospital?.name || '',
    venueLocation: appointment.hospitalLocationSnapshot || appointment.hospital?.location || '',
    reason_for_appointment:
        appointment.reasonForAppointment ||
        (appointment.type === 'PHYSICAL' ? 'Physical consultation' : 'Virtual consultation'),
});

const getDoctorProfile = asyncHandler(async (req, res) => {
    const doctor = await Doctor.findOne({ user: req.user._id }).populate('user', 'name email phone isVerified');

    if (doctor) {
        res.json(await buildDoctorProfilePayload(req, doctor));
    } else {
        res.status(404);
        throw new Error('Doctor not found');
    }
});

const getDoctorStats = asyncHandler(async (req, res) => {
    const doctor = await Doctor.findOne({ user: req.user._id });

    if (!doctor) {
        res.status(404);
        throw new Error('Doctor profile not found');
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [physicalAppointments, virtualConsultations] = await Promise.all([
        Appointment.find(visiblePhysicalAppointmentQuery(doctor._id)),
        OnlineConsultation.find(visibleVirtualConsultationQuery(doctor._id)),
    ]);

    const uniquePatients = new Set([
        ...physicalAppointments.map(apt => apt.patient_id ? apt.patient_id.toString() : null),
        ...virtualConsultations.map(consultation => consultation.patient ? consultation.patient.toString() : null),
    ]);
    uniquePatients.delete(null);

    const [todaysPhysicalAppointments, todaysVirtualConsultations] = await Promise.all([
        Appointment.countDocuments({
            ...visiblePhysicalAppointmentQuery(doctor._id),
            date: { $gte: todayStart, $lte: todayEnd }
        }),
        OnlineConsultation.countDocuments({
            ...visibleVirtualConsultationQuery(doctor._id),
            approvedDate: { $gte: todayStart, $lte: todayEnd }
        })
    ]);

    const todaysAppointmentsCount = todaysPhysicalAppointments + todaysVirtualConsultations;
    const totalConsultations = physicalAppointments.length + virtualConsultations.length;
    const totalRevenue = [...physicalAppointments, ...virtualConsultations].reduce(
        (sum, item) => sum + Number(item.consultationFeeSnapshot || 0),
        0
    );

    const weeklyAppointments = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
        const dStart = new Date(todayStart);
        dStart.setDate(todayStart.getDate() - i);
        const dEnd = new Date(todayEnd);
        dEnd.setDate(todayEnd.getDate() - i);

        const [physicalCount, virtualCount] = await Promise.all([
            Appointment.countDocuments({
                ...visiblePhysicalAppointmentQuery(doctor._id),
                date: { $gte: dStart, $lte: dEnd }
            }),
            OnlineConsultation.countDocuments({
                ...visibleVirtualConsultationQuery(doctor._id),
                approvedDate: { $gte: dStart, $lte: dEnd }
            })
        ]);
        
        weeklyAppointments.push({
            day: i === 0 ? 'Today' : dayNames[dStart.getDay()],
            appointments: physicalCount + virtualCount
        });
    }

    const currentYear = new Date().getFullYear();
    const monthlyRevenue = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let m = 0; m < 12; m++) monthlyRevenue.push({ month: monthNames[m], amount: 0 });
    
    physicalAppointments.forEach(apt => {
        if (apt.date && new Date(apt.date).getFullYear() === currentYear) {
            const m = new Date(apt.date).getMonth();
            monthlyRevenue[m].amount += Number(apt.consultationFeeSnapshot || 0);
        }
    });

    virtualConsultations.forEach(consultation => {
        if (consultation.approvedDate && new Date(consultation.approvedDate).getFullYear() === currentYear) {
            const m = new Date(consultation.approvedDate).getMonth();
            monthlyRevenue[m].amount += Number(consultation.consultationFeeSnapshot || 0);
        }
    });

    const patientGenderDataMap = { 'Male': 0, 'Female': 0, 'Other': 0 };
    if (uniquePatients.size > 0) {
        const patients = await Patient.find({ _id: { $in: Array.from(uniquePatients) } });
        patients.forEach(p => {
            if (p.gender && patientGenderDataMap[p.gender] !== undefined) {
                patientGenderDataMap[p.gender]++;
            } else {
                patientGenderDataMap['Other']++;
            }
        });
    }

    const totalPatientCount = uniquePatients.size || 1;
    const patientGenderData = [
        { name: 'Male', value: patientGenderDataMap['Male'], percentage: ((patientGenderDataMap['Male'] / totalPatientCount) * 100).toFixed(1) },
        { name: 'Female', value: patientGenderDataMap['Female'], percentage: ((patientGenderDataMap['Female'] / totalPatientCount) * 100).toFixed(1) },
    ];

    const [recentAppointmentsSorted, recentVirtualSorted] = await Promise.all([
        Appointment.find(visiblePhysicalAppointmentQuery(doctor._id))
            .sort({ date: -1, createdAt: -1 })
            .populate('patient_id', 'fullName condition status gender'),
        OnlineConsultation.find(visibleVirtualConsultationQuery(doctor._id))
            .sort({ approvedDate: -1, createdAt: -1 })
            .populate('patient', 'fullName condition status gender'),
    ]);
    
    const recentPatients = [];
    const seenPatientIds = new Set();
    
    for (let apt of [...recentAppointmentsSorted, ...recentVirtualSorted]) {
        const patient = apt.patient_id || apt.patient;

        if (patient && !seenPatientIds.has(patient._id.toString())) {
            seenPatientIds.add(patient._id.toString());
            recentPatients.push({
                name: patient.fullName || "Patient",
                diagnosis: apt.type || "General",
                lastVisit: (apt.date || apt.approvedDate) ? new Date(apt.date || apt.approvedDate).toLocaleDateString() : "N/A",
                status: "Active"
            });
            if (recentPatients.length >= 5) break; 
        }
    }

    const [upcomingAppointments, upcomingVirtualConsultations] = await Promise.all([
        Appointment.find({
            ...visiblePhysicalAppointmentQuery(doctor._id),
            date: { $gte: todayStart },
        })
            .sort({ date: 1, timeSlot: 1 })
            .limit(4)
            .populate('patient_id', 'fullName'),
        OnlineConsultation.find({
            ...visibleVirtualConsultationQuery(doctor._id),
            approvedDate: { $gte: todayStart },
        })
            .sort({ approvedDate: 1, approvedTimeSlot: 1 })
            .limit(4)
            .populate('patient', 'fullName'),
    ]);

    const upcomingSessions = [
        ...upcomingAppointments.map(apt => ({
            patient: apt.patient_id ? apt.patient_id.fullName : "Unknown",
            date: shortDateLabel(apt.date),
            time: apt.timeSlot || "TBD",
            type: 'In-Person',
            sortAt: `${apt.appointmentDateKey || ''} ${apt.timeSlot || ''}`,
        })),
        ...upcomingVirtualConsultations.map(consultation => ({
            patient: consultation.patient ? consultation.patient.fullName : "Unknown",
            date: shortDateLabel(consultation.approvedDate),
            time: consultation.approvedTimeSlot || "TBD",
            type: consultation.status === 'meeting_pending' ? 'Video Call Pending' : 'Video Call',
            sortAt: `${consultation.approvedDateKey || ''} ${consultation.approvedTimeSlot || ''}`,
        })),
    ].sort((left, right) => left.sortAt.localeCompare(right.sortAt)).slice(0, 4);

    const recentPrescriptionDocs = await Prescription.find({ doctor_id: doctor._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('patient_id', 'fullName');

    const recentPrescriptions = recentPrescriptionDocs.map(rx => {
        return {
            id: rx._id.toString().substring(0, 8).toUpperCase(),
            patient: rx.patient_id ? rx.patient_id.fullName : "Unknown",
            medication: rx.medicines && rx.medicines.length > 0 ? rx.medicines[0].name + (rx.medicines.length > 1 ? ` +${rx.medicines.length - 1} more` : '') : "N/A",
            date: new Date(rx.date || rx.createdAt).toLocaleDateString(),
            status: 'Active'
        }
    });

    const recentApptsFormatted = [
        ...recentAppointmentsSorted.map(apt => ({
            id: apt._id.toString().substring(0, 8).toUpperCase(),
            name: apt.patient_id ? apt.patient_id.fullName : "Patient",
            date: displayDateLabel(apt.date),
            type: 'PHYSICAL',
            status: apt.status.charAt(0).toUpperCase() + apt.status.slice(1),
            sortDate: apt.date || apt.createdAt,
        })),
        ...recentVirtualSorted.map(consultation => ({
            id: consultation._id.toString().substring(0, 8).toUpperCase(),
            name: consultation.patient ? consultation.patient.fullName : "Patient",
            date: displayDateLabel(consultation.approvedDate),
            type: 'VIRTUAL',
            status: consultation.status === 'meeting_pending' ? 'Meeting pending' : consultation.status.charAt(0).toUpperCase() + consultation.status.slice(1),
            sortDate: consultation.approvedDate || consultation.createdAt,
        })),
    ]
        .sort((left, right) => new Date(right.sortDate || 0) - new Date(left.sortDate || 0))
        .slice(0, 5)
        .map(({ sortDate, ...appointment }) => appointment);

    res.json({
        totalPatients: uniquePatients.size,
        todaysAppointmentsCount,
        totalConsultations,
        totalRevenue: totalRevenue ? totalRevenue.toLocaleString() : "0",
        weeklyAppointments,
        patientGenderData,
        monthlyRevenue,
        recentPatients,
        upcomingSessions,
        recentPrescriptions,
        recentAppointments: recentApptsFormatted
    });
});

const getAllDoctors = asyncHandler(async (req, res) => {
    const keyword = req.query.keyword;
    let query = {};

    if (keyword) {
        const matchingUsers = await User.find({
            name: { $regex: keyword, $options: 'i' },
            role: 'doctor'
        }).select('_id');

        const matchingUserIds = matchingUsers.map(user => user._id);

        query = {
            $or: [
                { specialization: { $regex: keyword, $options: 'i' } },
                { user: { $in: matchingUserIds } }
            ]
        };
    }

    if (req.query.hospital) {
        const hospitalKeyword = req.query.hospital;
        const hospitals = await Hospital.find({
            $or: [
                { name: { $regex: hospitalKeyword, $options: 'i' } },
                { location: { $regex: hospitalKeyword, $options: 'i' } }
            ]
        }).select('_id');

        const hospitalIds = hospitals.map(hospital => hospital._id);
        const schedules = await DoctorSchedule.find({
            hospital: { $in: hospitalIds }
        }).select('doctor');

        const doctorIdsInHospital = schedules.map(s => s.doctor);
        query._id = { $in: doctorIdsInHospital };
    }

    const doctors = await Doctor.find(query).populate({
        path: 'user',
        select: 'name email isVerified status',
        strictPopulate: false
    });

    const verifiedDoctors = doctors.filter(
        doc => doc.user?.status === 'active' && ((doc.user && doc.user.isVerified) || doc.isVerified)
    );

    const formattedDoctors = await Promise.all(verifiedDoctors.map(async doc => {
        const schedules = await DoctorSchedule.find({ doctor: doc._id }).populate('hospital', 'name location');
        const locations = [...new Set(
            schedules
                .map(sch => sch.hospital?.name || sch.hospitalName)
                .filter(Boolean)
        )];

        let nextAvailableSlot = "Not Available";
        let nextAvailableDate = "N/A";
        let availableSlots = [];
        const today = new Date();
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        for (let i = 0; i < 7; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() + i);
            const dayName = days[checkDate.getDay()];
            const dateString = `${checkDate.getDate()} ${months[checkDate.getMonth()]}`;

            const schedule = schedules.find(s => s.dayOfWeek === dayName);

            if (schedule) {
                const [startHour, startMin] = schedule.startTime.split(':').map(Number);
                const [endHour, endMin] = schedule.endTime.split(':').map(Number);

                let currentHour = startHour;
                let potentialSlots = [];

                while (currentHour < endHour) {
                    const startLabel = currentHour > 12 ? (currentHour - 12) + " PM" : (currentHour === 12 ? "12 PM" : currentHour + " AM");
                    const nextHour = currentHour + 1;
                    const endLabel = nextHour > 12 ? (nextHour - 12) + " PM" : (nextHour === 12 ? "12 PM" : nextHour + " AM");
                    potentialSlots.push(`${startLabel} - ${endLabel}`);
                    currentHour++;
                }

                if (i === 0) {
                    const nowHour = today.getHours();
                    const validSlots = [];
                    for (let slot of potentialSlots) {
                        const parts = slot.split(' - ');
                        const startPart = parts[0];
                        let h = parseInt(startPart);
                        if (startPart.includes('PM') && h !== 12) h += 12;
                        if (startPart.includes('AM') && h === 12) h = 0;

                        if (nowHour < h) {
                            validSlots.push(slot);
                        }
                    }

                    if (validSlots.length > 0) {
                        nextAvailableSlot = "Today " + validSlots[0];
                        nextAvailableDate = `Today, ${dateString}`;
                        availableSlots = validSlots;
                        break;
                    }
                } else {
                    nextAvailableSlot = (i === 1 ? "Tomorrow" : dayName) + " " + potentialSlots[0];
                    nextAvailableDate = i === 1 ? `Tomorrow, ${dateString}` : `${dayName}, ${dateString}`;
                    availableSlots = potentialSlots;
                    break;
                }
            }
        }

        const rawName = (doc.user && doc.user.name) ? doc.user.name : (doc.fullName || "Doctor");
        return {
            id: doc._id,
            name: rawName.startsWith("Dr.") ? rawName : "Dr. " + rawName,
            specialty: doc.specialization,
            experience: doc.experienceYears + " Years",
            hospitals: locations,
            location: locations.length > 0 ? locations.join(", ") : doc.hospitalAffiliation,
            rating: 4.8,
            reviews: 100,
            image: "https://ui-avatars.com/api/?name=" + encodeURIComponent(rawName) + "&background=random",
            available: true,
            nextAvailableSlot,
            nextAvailableDate,
            availableSlots
        };
    }));

    res.json(formattedDoctors);
});

const getDoctorSchedules = asyncHandler(async (req, res) => {
    const schedules = await DoctorSchedule.find({ doctor: req.params.id })
        .populate('hospital', 'name location contact')
        .sort({ dayOfWeek: 1, startTime: 1 });
    res.json(schedules);
});

const getMyDoctorSchedules = asyncHandler(async (req, res) => {
    const doctor = await Doctor.findOne({ user: req.user._id });

    if (!doctor) {
        res.status(404);
        throw new Error('Doctor profile not found');
    }

    const schedules = await DoctorSchedule.find({ doctor: doctor._id })
        .populate('hospital', 'name location contact')
        .sort({ dayOfWeek: 1, startTime: 1 });

    res.json(schedules);
});

const getHospitalOptions = asyncHandler(async (_req, res) => {
    const hospitals = await Hospital.find({})
        .select('name location contact')
        .sort({ name: 1 });

    res.json(hospitals);
});

const getDoctorBookingOptions = asyncHandler(async (req, res) => {
    const dateKey = normalizeDateKey(req.query.date);
    const specialty = String(req.query.specialty || '').trim().toLowerCase();

    if (!dateKey) {
        res.status(400);
        throw new Error('A valid date is required');
    }

    const schedules = await DoctorSchedule.find({
        dayOfWeek: getDayOfWeekFromDateKey(dateKey),
    })
        .populate('hospital', 'name location')
        .populate({
            path: 'doctor',
            populate: { path: 'user', select: 'name email isVerified status' }
        });

    const filteredSchedules = schedules.filter((schedule) => {
        const doctor = schedule.doctor;
        if (!doctor) return false;
        if (doctor.user?.status !== 'active' || (!doctor.user?.isVerified && !doctor.isVerified)) return false;
        return matchesSpecialtyQuery(doctor.specialization, specialty);
    });

    const doctorMap = new Map();

    for (const schedule of filteredSchedules) {
        const doctor = schedule.doctor;
        await releaseExpiredHoldsForDoctorDate({
            doctorId: doctor._id,
            dateKey,
            hospitalId: schedule.hospital?._id,
        });

        const availability = await ensureAvailabilityDocument({
            doctorId: doctor._id,
            schedule,
            dateKey,
        });
        const openSlots = getOpenSlots(availability);

        if (!openSlots.length) {
            continue;
        }

        const existing = doctorMap.get(String(doctor._id)) || {
            id: doctor._id,
            name: doctor.user?.name || doctor.fullName,
            specialty: doctor.specialization,
            image: `https://ui-avatars.com/api/?name=${encodeURIComponent(
                doctor.user?.name || doctor.fullName || 'Doctor'
            )}&background=random`,
            experience: `${doctor.experienceYears || 0} Years`,
            consultationFee: doctor.consultationFee || 0,
            hospitals: new Set(),
            slotCount: 0,
            firstAvailableTime: null,
        };

        existing.hospitals.add(schedule.hospital?.name || '');
        existing.slotCount += openSlots.length;
        existing.firstAvailableTime = existing.firstAvailableTime
            ? [existing.firstAvailableTime, openSlots[0]?.time].filter(Boolean).sort()[0]
            : openSlots[0]?.time || null;

        doctorMap.set(String(doctor._id), existing);
    }

    res.json(
        Array.from(doctorMap.values())
            .map((doctor) => ({
                ...doctor,
                hospitals: Array.from(doctor.hospitals).filter(Boolean),
            }))
            .sort((left, right) => right.slotCount - left.slotCount)
    );
});

const addDoctorSchedule = asyncHandler(async (req, res) => {
    const {
        hospitalId: requestedHospitalId,
        hospitalName,
        dayOfWeek,
        startTime,
        endTime,
        slotDuration
    } = req.body;

    const doctor = await Doctor.findOne({ user: req.user._id });

    if (!doctor) {
        res.status(404);
        throw new Error('Doctor profile not found');
    }

    if (!dayOfWeek || !startTime || !endTime) {
        res.status(400);
        throw new Error('Day of week, start time and end time are required');
    }

    if (startTime >= endTime) {
        res.status(400);
        throw new Error('End time must be later than the start time');
    }

    let hospitalId = requestedHospitalId;

    if (!hospitalId && hospitalName) {
        let matchedHospital = await Hospital.findOne({ name: hospitalName });
        if (!matchedHospital) {
            matchedHospital = await Hospital.create({
                name: hospitalName,
                location: 'Sri Lanka',
                contact: 'N/A'
            });
        }
        hospitalId = matchedHospital._id;
    }

    if (!hospitalId) {
        res.status(400);
        throw new Error('Please choose a valid hospital or clinic');
    }

    const hospital = await Hospital.findById(hospitalId);

    if (!hospital) {
        res.status(404);
        throw new Error('Hospital not found');
    }

    const existingSchedules = await DoctorSchedule.find({
        doctor: doctor._id,
        dayOfWeek,
    });

    const overlappingSchedule = existingSchedules.find((schedule) =>
        hasTimeOverlap(schedule.startTime, schedule.endTime, startTime, endTime)
    );

    if (overlappingSchedule) {
        res.status(409);
        throw new Error(
            'This schedule overlaps with another published shift. Please change the time range.'
        );
    }

    const schedule = await DoctorSchedule.create({
        doctor: doctor._id,
        hospital: hospital._id,
        dayOfWeek,
        startTime,
        endTime,
        slotDuration: Number(slotDuration || 15)
    });

    const populatedSchedule = await DoctorSchedule.findById(schedule._id).populate(
        'hospital',
        'name location contact'
    );

    res.status(201).json(populatedSchedule);
});

const deleteDoctorSchedule = asyncHandler(async (req, res) => {
    const schedule = await DoctorSchedule.findById(req.params.id);

    if (!schedule) {
        res.status(404);
        throw new Error('Schedule not found');
    }

    const doctor = await Doctor.findOne({ user: req.user._id });
    if (!doctor || schedule.doctor.toString() !== doctor._id.toString()) {
        res.status(401);
        throw new Error('Not authorized to delete this schedule');
    }

    await schedule.deleteOne();
    res.json({ message: 'Schedule removed' });
});

const getDoctorAvailability = asyncHandler(async (req, res) => {
    const dateKey = normalizeDateKey(req.query.date);
    const doctorId = req.params.id;

    if (!dateKey) {
        res.status(400);
        throw new Error('Date query parameter is required');
    }

    await releaseExpiredHoldsForDoctorDate({ doctorId, dateKey });

    const schedules = await DoctorSchedule.find({
        doctor: doctorId,
        dayOfWeek: getDayOfWeekFromDateKey(dateKey),
    }).populate('hospital', 'name location');

    const availabilityData = [];

    for (const schedule of schedules) {
        const availability = await ensureAvailabilityDocument({
            doctorId,
            schedule,
            dateKey,
        });

        availabilityData.push({
            id: availability._id,
            doctorId,
            hospitalId: schedule.hospital?._id || null,
            hospitalName: schedule.hospital?.name || availability.hospitalName,
            location: schedule.hospital?.location || '',
            date: availability.date,
            totalSlots: availability.totalSlots,
            slots: availability.slots,
        });
    }

    res.json(availabilityData.filter((entry) => entry.hospitalId));
});

const updateDoctorProfile = asyncHandler(async (req, res) => {
    const doctor = await Doctor.findOne({ user: req.user._id }).populate('user', 'name email phone isVerified');

    if (doctor) {
        doctor.specialization = req.body.specialization || doctor.specialization;
        doctor.fullName = req.body.name || doctor.fullName;
        doctor.hospitalAffiliation = req.body.hospitalName || doctor.hospitalAffiliation;
        doctor.experienceYears =
            req.body.experience !== undefined
                ? Number(req.body.experience) || 0
                : doctor.experienceYears;
        doctor.consultationFee =
            req.body.fees !== undefined
                ? Number(req.body.fees) || 0
                : doctor.consultationFee;
        doctor.bio = req.body.about ?? req.body.bio ?? doctor.bio;

        if (req.body.education !== undefined) {
            doctor.education = normalizeEducationList(req.body.education);
        }

        const user = await User.findById(req.user._id);
        if (user) {
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;
            user.phone = req.body.phone ?? user.phone;

            if (req.body.password) {
                user.password = req.body.password;
            }
            await user.save();
        }

        const updatedDoctor = await doctor.save();
        res.json(await buildDoctorProfilePayload(req, updatedDoctor, user));
    } else {
        res.status(404);
        throw new Error('Doctor not found');
    }
});

const uploadDoctorSignatureImage = asyncHandler(async (req, res) => {
    const doctor = await Doctor.findOne({ user: req.user._id });

    if (!doctor) {
        res.status(404);
        throw new Error('Doctor not found');
    }

    if (!req.file) {
        res.status(400);
        throw new Error('Please upload a signature image');
    }

    if (doctor.signatureImagePath && fs.existsSync(doctor.signatureImagePath)) {
        fs.unlinkSync(doctor.signatureImagePath);
    }

    doctor.signatureImagePath = req.file.path;
    doctor.signatureImageUrl = normalizePublicPath(req.file.path);
    doctor.signatureUpdatedAt = new Date();

    await doctor.save();

    res.status(201).json({
        message: 'Signature uploaded successfully',
        signatureImageUrl: toAbsoluteUrl(req, doctor.signatureImageUrl),
        signatureUpdatedAt: doctor.signatureUpdatedAt,
    });
});

const addDoctor = asyncHandler(async (req, res) => {
    const { name, email, password, specialization, hospitalName, experience, fees } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    const user = await User.create({
        name,
        email,
        password,
        role: 'doctor',
        status: 'active',
        isVerified: true,
    });

    if (user) {
        const doctor = await Doctor.create({
            user: user._id,
            fullName: name,
            specialization: specialization || 'General',
            hospitalAffiliation: hospitalName || 'General Hospital',
            experienceYears: Number(experience) || 0,
            consultationFee: Number(fees) || 0,
            isVerified: true,
        });

        res.status(201).json({
            _id: doctor._id,
            name: user.name,
            email: user.email,
            specialization: doctor.specialization,
            hospitalName: doctor.hospitalAffiliation,
            experience: doctor.experienceYears,
            fees: doctor.consultationFee,
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});

const deleteDoctor = asyncHandler(async (req, res) => {
    const doctor = await Doctor.findById(req.params.id);

    if (doctor) {
        const result = await cascadeDeleteUser(doctor.user);
        res.json({
            message: 'Doctor and related records removed',
            deletedCounts: result?.deletedCounts || {},
        });
    } else {
        res.status(404);
        throw new Error('Doctor not found');
    }
});

const getDoctorAppointments = asyncHandler(async (req, res) => {
    const doctor = await Doctor.findOne({ user: req.user._id });

    if (!doctor) {
        res.status(404);
        throw new Error('Doctor not found');
    }

    const appointments = await Appointment.find(manageablePhysicalAppointmentQuery(doctor._id))
        .populate({
            path: 'patient_id',
            select: 'fullName phone gender user_id',
            populate: { path: 'user_id', select: 'name email' },
        })
        .populate({
            path: 'doctor_id',
            select: 'fullName specialization user',
            populate: { path: 'user', select: 'name email' },
        })
        .populate('hospital', 'name location contact')
        .sort({ date: 1, timeSlot: 1 });

    const formatted = appointments.map((appointment) =>
        buildDoctorAppointmentPayload(appointment.toObject())
    );

    res.json({ success: true, appointments: formatted });
});

const DOCTOR_CANCELLATION_REASONS = new Set([
    'Doctor unavailable',
    'Emergency schedule change',
    'Clinic unavailable',
    'Patient requested cancellation',
    'Duplicate booking',
    'Other',
]);

const updateAppointmentStatus = asyncHandler(async (req, res) => {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
        res.status(404);
        throw new Error('Appointment not found');
    }

    const doctor = await Doctor.findOne({ user: req.user._id });
    if (!doctor || String(appointment.doctor_id) !== String(doctor._id)) {
        res.status(403);
        throw new Error('Not authorized to update this appointment');
    }

    const requestedStatus = String(req.body.status || '').toLowerCase();
    if (!['completed', 'cancelled'].includes(requestedStatus)) {
        res.status(400);
        throw new Error('Physical appointments can only be marked completed or cancelled by doctors');
    }

    if (['cancelled', 'completed', 'expired'].includes(appointment.status)) {
        res.status(400);
        throw new Error(`This appointment is already ${appointment.status}`);
    }

    if (requestedStatus === 'completed' && appointment.status !== 'confirmed') {
        res.status(400);
        throw new Error('Only confirmed appointments can be marked completed');
    }

    let statusReason = '';
    if (requestedStatus === 'cancelled') {
        const selectedReason = String(req.body.reason || req.body.statusReason || '').trim();
        const customReason = String(req.body.customReason || '').trim();

        if (!selectedReason) {
            res.status(400);
            throw new Error('Please select a cancellation reason');
        }

        if (!DOCTOR_CANCELLATION_REASONS.has(selectedReason)) {
            res.status(400);
            throw new Error('Please select a valid cancellation reason');
        }

        if (selectedReason === 'Other' && !customReason) {
            res.status(400);
            throw new Error('Please enter the cancellation reason');
        }

        statusReason = (selectedReason === 'Other' ? customReason : selectedReason).slice(0, 240);

        await releaseAppointmentSlots([appointment._id]);
        appointment.holdExpiresAt = undefined;
        if (appointment.paymentStatus === 'pending') {
            appointment.paymentStatus = 'canceled';
        }
        appointment.cancelledAt = new Date();
        appointment.cancelledByRole = 'doctor';
        appointment.cancelledBy = req.user._id;
    }

    appointment.status = requestedStatus;
    appointment.statusReason = statusReason;
    appointment.statusUpdatedAt = new Date();
    appointment.statusUpdatedByRole = 'doctor';
    appointment.statusUpdatedBy = req.user._id;

    await appointment.save();

    const populatedAppointment = await Appointment.findById(appointment._id)
        .populate({
            path: 'patient_id',
            select: 'fullName phone gender user_id',
            populate: { path: 'user_id', select: 'name email' },
        })
        .populate({
            path: 'doctor_id',
            select: 'fullName specialization user',
            populate: { path: 'user', select: 'name email' },
        })
        .populate('hospital', 'name location contact');

    if (requestedStatus === 'cancelled') {
        const patientUser = populatedAppointment.patient_id?.user_id;
        const doctorName = populatedAppointment.doctorNameSnapshot || populatedAppointment.doctor_id?.fullName || 'your doctor';
        const dateLabel = populatedAppointment.date
            ? new Date(populatedAppointment.date).toLocaleDateString()
            : populatedAppointment.appointmentDateKey || '';

        if (patientUser?._id) {
            await createPatientNotification({
                patientUserId: patientUser._id,
                type: 'APPOINTMENT_UPDATE',
                title: 'Appointment cancelled',
                message: `Your appointment with Dr. ${doctorName} on ${dateLabel} at ${populatedAppointment.timeSlot} was cancelled. Reason: ${statusReason}.`,
                link: `/appointment/receipt/${populatedAppointment._id}`,
            });
        }

        await sendTemplatedEmail({
            eventKey: 'APPOINTMENT_CANCELLED_BY_DOCTOR',
            recipient: patientUser?.email || populatedAppointment.patientEmailSnapshot,
            data: {
                patientName: populatedAppointment.patient_id?.fullName || populatedAppointment.patientNameSnapshot || patientUser?.name || 'Patient',
                doctorName,
                date: dateLabel,
                time: populatedAppointment.timeSlot,
                hospitalName: populatedAppointment.hospitalNameSnapshot || populatedAppointment.hospital?.name || '',
                reason: statusReason,
            },
            dedupeKey: `appointment-cancelled:${populatedAppointment._id}:${populatedAppointment.updatedAt?.getTime?.() || Date.now()}`,
            relatedEntity: populatedAppointment._id,
            relatedEntityModel: 'Appointment',
            category: 'transactional',
        });
    }

    res.json({
        success: true,
        message: requestedStatus === 'cancelled'
            ? 'Appointment cancelled and patient notified'
            : 'Appointment updated',
        appointment: buildDoctorAppointmentPayload(populatedAppointment.toObject()),
    });
});

const getDoctorPatients = asyncHandler(async (req, res) => {
    const doctor = await Doctor.findOne({ user: req.user._id });

    if (!doctor) {
        res.status(404);
        throw new Error('Doctor not found');
    }

    const appointments = await Appointment.find(visiblePatientRosterAppointmentQuery(doctor._id))
        .sort({ date: -1, timeSlot: -1 })
        .populate({
            path: 'patient_id',
            select: 'fullName phone gender bloodGroup address dob user_id',
            populate: { path: 'user_id', select: 'name email role' },
        })
        .populate('hospital', 'name location');

    const uniquePatients = {};
    appointments.forEach(apt => {
        if (apt.patient_id) {
            const patientId = String(apt.patient_id._id);
            const appointmentDate = apt.date ? new Date(apt.date) : null;
            const now = new Date();
            const existingPatient = uniquePatients[patientId];
            const currentAppointment = {
                id: apt._id,
                date: apt.date,
                time: apt.timeSlot,
                type: apt.type,
                status: apt.status,
                paymentStatus: apt.paymentStatus,
                reasonForAppointment: apt.reasonForAppointment || '',
                venueName: apt.hospitalNameSnapshot || apt.hospital?.name || '',
                venueLocation: apt.hospitalLocationSnapshot || apt.hospital?.location || '',
            };

            const patientPayload = existingPatient || {
                id: apt.patient_id._id,
                name: apt.patient_id.fullName || apt.patientNameSnapshot || 'Patient',
                email: apt.patient_id.user_id?.email || apt.patientEmailSnapshot || '',
                phone: apt.patient_id.phone || apt.patientPhoneSnapshot || 'Not recorded',
                lastVisit: null,
                nextAppointment: null,
                latestAppointment: null,
                latestBookingReason: '',
                condition: apt.type,
                status: 'Active',
                latestAppointmentStatus: apt.status,
                latestPaymentStatus: apt.paymentStatus,
                gender: apt.patient_id.gender || 'Not recorded',
                bloodGroup: apt.patient_id.bloodGroup || 'Not recorded',
                age: calculateAge(apt.patient_id.dob),
                address: apt.patient_id.address || 'Not recorded',
                appointmentCount: 0,
            };

            patientPayload.appointmentCount += 1;

            if (!patientPayload.latestAppointment) {
                patientPayload.latestAppointment = currentAppointment;
                patientPayload.latestBookingReason = currentAppointment.reasonForAppointment;
                patientPayload.latestAppointmentStatus = currentAppointment.status;
                patientPayload.latestPaymentStatus = currentAppointment.paymentStatus;
                patientPayload.lastVisit = currentAppointment.date;
                patientPayload.condition = currentAppointment.type;
            }

            if (appointmentDate && appointmentDate >= now) {
                const currentNextDate = patientPayload.nextAppointment?.date
                    ? new Date(patientPayload.nextAppointment.date)
                    : null;
                if (!currentNextDate || appointmentDate < currentNextDate) {
                    patientPayload.nextAppointment = currentAppointment;
                }
            }

            uniquePatients[patientId] = patientPayload;
        }
    });

    res.json(Object.values(uniquePatients));
});

const getPatientRecords = asyncHandler(async (req, res) => {
    const doctor = await Doctor.findOne({ user: req.user._id });
    const patientId = req.params.id;

    if (!doctor) {
        res.status(404);
        throw new Error('Doctor not found');
    }

    const appointments = await Appointment.find({ doctor_id: doctor._id, patient_id: patientId })
        .sort({ date: -1, timeSlot: -1 })
        .populate('hospital', 'name location');

    const prescriptions = await Prescription.find({ doctor_id: doctor._id, patient_id: patientId })
        .sort({ date: -1 });

    res.json({
        appointments: appointments.map(a => ({
            id: a._id,
            date: a.date,
            time: a.timeSlot,
            type: a.type,
            status: a.status,
            paymentStatus: a.paymentStatus,
            reasonForAppointment: a.reasonForAppointment || '',
            venueName: a.hospitalNameSnapshot || a.hospital?.name || '',
            venueLocation: a.hospitalLocationSnapshot || a.hospital?.location || '',
        })),
        prescriptions: prescriptions.map(p => ({
            id: p._id,
            date: p.date,
            diagnosis: p.diagnosis,
            medicines: p.medicines
        }))
    });
});

// @desc    Search across the signed-in doctor's patients, appointments, sessions, and prescriptions
// @route   GET /api/doctor/search?query=
// @access  Private/Doctor
const getDoctorGlobalSearch = asyncHandler(async (req, res) => {
    const query = String(req.query.query || '').trim();
    const results = [];

    if (query.length < 2) {
        return res.json({ query, results });
    }

    const doctor = await Doctor.findOne({ user: req.user._id });

    if (!doctor) {
        res.status(404);
        throw new Error('Doctor profile not found');
    }

    const regex = makeSearchRegex(query);
    addDoctorQuickLinks(results, query);

    const matchingPatientUsers = await User.find({
        role: 'patient',
        $or: [{ name: regex }, { email: regex }],
    })
        .select('_id')
        .limit(20);

    const matchingPatients = await Patient.find({
        $or: [
            { fullName: regex },
            { phone: regex },
            { gender: regex },
            { bloodGroup: regex },
            ...(matchingPatientUsers.length
                ? [{ user_id: { $in: matchingPatientUsers.map((user) => user._id) } }]
                : []),
        ],
    })
        .select('_id')
        .limit(20);

    const matchingPatientIds = matchingPatients.map((patient) => patient._id);

    const [appointments, consultations, prescriptions, schedules] = await Promise.all([
        Appointment.find({
            doctor_id: doctor._id,
            $or: [
                { patientNameSnapshot: regex },
                { patientEmailSnapshot: regex },
                { patientPhoneSnapshot: regex },
                { specialtySnapshot: regex },
                { hospitalNameSnapshot: regex },
                { reasonForAppointment: regex },
                { receiptNumber: regex },
                { status: regex },
                { paymentStatus: regex },
                ...(matchingPatientIds.length ? [{ patient_id: { $in: matchingPatientIds } }] : []),
            ],
        })
            .populate({
                path: 'patient_id',
                select: 'fullName phone gender bloodGroup user_id',
                populate: { path: 'user_id', select: 'name email' },
            })
            .sort({ date: -1, createdAt: -1 })
            .limit(8),
        OnlineConsultation.find({
            doctor: doctor._id,
            $or: [
                { consultationNumber: regex },
                { patientNameSnapshot: regex },
                { patientEmailSnapshot: regex },
                { patientPhoneSnapshot: regex },
                { specialtySnapshot: regex },
                { status: regex },
                { paymentStatus: regex },
                ...(matchingPatientIds.length ? [{ patient: { $in: matchingPatientIds } }] : []),
            ],
        })
            .populate({
                path: 'patient',
                select: 'fullName phone gender bloodGroup user_id',
                populate: { path: 'user_id', select: 'name email' },
            })
            .sort({ createdAt: -1 })
            .limit(8),
        Prescription.find({
            doctor_id: doctor._id,
            $or: [
                { diagnosis: regex },
                { notes: regex },
                { 'medicines.name': regex },
                ...(matchingPatientIds.length ? [{ patient_id: { $in: matchingPatientIds } }] : []),
            ],
        })
            .populate('patient_id', 'fullName user_id')
            .sort({ createdAt: -1 })
            .limit(8),
        DoctorSchedule.find({
            doctor: doctor._id,
            $or: [
                { dayOfWeek: regex },
                { startTime: regex },
                { endTime: regex },
            ],
        })
            .populate('hospital', 'name location')
            .sort({ dayOfWeek: 1, startTime: 1 })
            .limit(4),
    ]);

    const patientMap = new Map();

    const addPatient = (patient, sourceDate) => {
        if (!patient?._id) return;

        const name = patient.fullName || patient.user_id?.name || 'Patient';
        const haystack = [
            name,
            patient.user_id?.email,
            patient.phone,
            patient.gender,
            patient.bloodGroup,
        ].join(' ');

        if (!regex.test(haystack)) return;

        const key = String(patient._id);
        const existing = patientMap.get(key);

        patientMap.set(key, {
            patient,
            lastVisit: existing?.lastVisit || sourceDate,
        });
    };

    appointments.forEach((appointment) => addPatient(appointment.patient_id, appointment.date));
    consultations.forEach((consultation) => addPatient(consultation.patient, consultation.approvedDate || consultation.requestedDate));

    patientMap.forEach(({ patient, lastVisit }) => {
        const name = patient.fullName || patient.user_id?.name || 'Patient';

        addResult(results, {
            type: 'patient',
            title: name,
            subtitle: patient.user_id?.email || patient.phone || 'Patient record',
            meta: `Last visit ${shortDateLabel(lastVisit)}`,
            path: `/doctor/patients?patient=${patient._id}&search=${encodeURIComponent(name)}`,
        });
    });

    appointments.forEach((appointment) => {
        const patientName = appointment.patientNameSnapshot || appointment.patient_id?.fullName || 'Patient';

        addResult(results, {
            type: 'appointment',
            title: `${patientName} · ${appointment.type === 'VIRTUAL' ? 'Virtual' : 'Physical'} appointment`,
            subtitle: `${shortDateLabel(appointment.date)} · ${appointment.timeSlot || 'Time pending'}`,
            meta: `${appointment.status || 'pending'} · ${appointment.paymentStatus || 'payment pending'}`,
            path: `/doctor/appointments?search=${encodeURIComponent(patientName)}`,
        });
    });

    consultations.forEach((consultation) => {
        const patientName = consultation.patientNameSnapshot || consultation.patient?.fullName || 'Patient';

        addResult(results, {
            type: 'consultation',
            title: consultation.consultationNumber || `Consultation ${compactId(consultation._id)}`,
            subtitle: `${patientName} · ${consultation.approvedTimeSlot || consultation.requestedTimeSlot || 'Time pending'}`,
            meta: `${consultation.status || 'requested'} · ${consultation.paymentStatus || 'payment pending'}`,
            path: `/doctor/schedule?search=${encodeURIComponent(patientName)}`,
        });
    });

    prescriptions.forEach((prescription) => {
        const patientName = prescription.patient_id?.fullName || 'Patient';

        addResult(results, {
            type: 'record',
            title: `${patientName} · ${prescription.diagnosis || 'Prescription'}`,
            subtitle: (prescription.medicines || []).slice(0, 2).map((medicine) => medicine.name).join(', ') || 'Prescription record',
            meta: `Created ${shortDateLabel(prescription.createdAt)}`,
            path: `/doctor/prescription?search=${encodeURIComponent(patientName || prescription.diagnosis || query)}`,
        });
    });

    schedules.forEach((schedule) => {
        addResult(results, {
            type: 'schedule',
            title: `${schedule.dayOfWeek} availability`,
            subtitle: `${schedule.startTime} to ${schedule.endTime}`,
            meta: schedule.hospital?.name || 'Published schedule',
            path: '/doctor/my-schedule',
        });
    });

    res.json({ query, results: results.slice(0, 18) });
});

const getDoctorLeaves = asyncHandler(async (req, res) => {
    const doctor = await Doctor.findOne({ user: req.user._id });
    if (!doctor) {
        res.status(404);
        throw new Error('Doctor profile not found');
    }
    const leaves = await DoctorLeave.find({ doctor: doctor._id });
    res.json(leaves);
});

const addDoctorLeave = asyncHandler(async (req, res) => {
    const doctor = await Doctor.findOne({ user: req.user._id });
    if (!doctor) {
        res.status(404);
        throw new Error('Doctor profile not found');
    }

    const { dateKey, reason } = req.body;
    if (!dateKey) {
        res.status(400);
        throw new Error('dateKey is required');
    }

    const exists = await DoctorLeave.findOne({ doctor: doctor._id, dateKey });
    if (exists) {
        res.status(400);
        throw new Error('Leave already exists for this date');
    }

    const leave = await DoctorLeave.create({
        doctor: doctor._id,
        dateKey,
        reason: reason || 'Unavailable'
    });

    res.status(201).json(leave);
});

const deleteDoctorLeave = asyncHandler(async (req, res) => {
    const doctor = await Doctor.findOne({ user: req.user._id });
    if (!doctor) {
        res.status(404);
        throw new Error('Doctor profile not found');
    }

    const leave = await DoctorLeave.findOne({ _id: req.params.id, doctor: doctor._id });
    if (!leave) {
        res.status(404);
        throw new Error('Leave not found');
    }

    await leave.remove();
    res.json({ message: 'Leave removed' });
});

module.exports = {
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
    getDoctorAvailability,
    getMyDoctorSchedules,
    addDoctorSchedule,
    deleteDoctorSchedule,
    uploadDoctorSignatureImage,
    getDoctorLeaves,
    addDoctorLeave,
    deleteDoctorLeave
};
