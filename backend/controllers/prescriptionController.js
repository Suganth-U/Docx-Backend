const fs = require('fs');
const path = require('path');
const axios = require('axios');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Prescription = require('../models/Prescription');
const PrescriptionRequest = require('../models/PrescriptionRequest');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Medicine = require('../models/Medicine');
const { sendTemplatedEmail } = require('../utils/email/dispatcher');
const { createDoctorNotifications } = require('../utils/notifications');
const { generatePrescriptionDocument } = require('../utils/prescriptionDocument');
const { prescriptionProofsDir, toAbsoluteUrl } = require('../utils/storagePaths');

const normalizeSpecialtyTerm = (value = '') =>
    String(value)
        .toLowerCase()
        .replace(/[^a-z\s]/g, ' ')
        .replace(/\b(consultant|specialist|medicine|medical)\b/g, ' ')
        .replace(/(ologist|ology|iatrist|iatry|ician|icians|logist|ics|ic|ist|ian|ry)\b/g, ' ')
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

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const TRIAGE_STATUSES = new Set(['needs_more_info', 'ready_for_doctor', 'urgent_care', 'blocked']);
const RISK_LEVELS = new Set(['low', 'medium', 'high', 'blocked']);
const HIGH_RISK_PATTERNS = [
    /\b(controlled|narcotic|opioid|opiate|sedative|benzodiazepine|sleeping pill)\b/i,
    /\b(morphine|oxycodone|tramadol|codeine|fentanyl|alprazolam|diazepam|clonazepam|lorazepam|zolpidem)\b/i,
    /\b(steroid|prednisolone|antibiotic|insulin|warfarin|isotretinoin)\b/i,
];
const URGENT_PATTERN =
    /\b(chest pain|shortness of breath|difficulty breathing|severe allergic|anaphylaxis|swelling of lips|suicidal|overdose|fainting|stroke|seizure|severe bleeding|pregnant and bleeding)\b/i;

const INTAKE_RESPONSE_SCHEMA = {
    type: 'OBJECT',
    properties: {
        status: {
            type: 'STRING',
            enum: ['needs_more_info', 'ready_for_doctor', 'urgent_care', 'blocked'],
        },
        riskLevel: {
            type: 'STRING',
            enum: ['low', 'medium', 'high', 'blocked'],
        },
        patientMessage: { type: 'STRING' },
        summaryForDoctor: { type: 'STRING' },
        missingFields: {
            type: 'ARRAY',
            items: { type: 'STRING' },
        },
        redFlags: {
            type: 'ARRAY',
            items: { type: 'STRING' },
        },
        questions: {
            type: 'ARRAY',
            items: {
                type: 'OBJECT',
                properties: {
                    id: { type: 'STRING' },
                    label: { type: 'STRING' },
                    type: {
                        type: 'STRING',
                        enum: ['text', 'textarea', 'select', 'yes_no'],
                    },
                    options: {
                        type: 'ARRAY',
                        items: { type: 'STRING' },
                    },
                    required: { type: 'BOOLEAN' },
                },
                required: ['id', 'label', 'type', 'required'],
            },
        },
    },
    required: ['status', 'riskLevel', 'patientMessage', 'summaryForDoctor', 'missingFields', 'redFlags', 'questions'],
};

const parseMaybeJson = (value, fallback = {}) => {
    if (value && typeof value === 'object') return value;
    if (typeof value !== 'string') return fallback;

    const trimmed = value.trim();
    if (!trimmed) return fallback;

    try {
        return JSON.parse(trimmed);
    } catch {
        return fallback;
    }
};

const normalizeString = (value = '', max = 1200) =>
    String(value || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, max);

const normalizeLongText = (value = '', max = 3200) =>
    String(value || '')
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
        .slice(0, max);

const sanitizeQuestionAnswers = (items = []) =>
    (Array.isArray(items) ? items : [])
        .map((item, index) => ({
            id: normalizeString(item?.id || `q_${index + 1}`, 80),
            question: normalizeString(item?.question || item?.label || '', 500),
            answer: normalizeLongText(item?.answer || '', 1200),
            answeredAt: item?.answeredAt ? new Date(item.answeredAt) : new Date(),
        }))
        .filter((item) => item.question && item.answer)
        .slice(0, 24);

const sanitizeClinicalIntake = (value = {}, requestType = 'refill') => {
    const intake = parseMaybeJson(value, {});
    const attestation = intake.patientAttestation || {};

    return {
        requestType: requestType === 'pharmacy_rx_item' ? 'pharmacy_rx_item' : 'refill',
        requestedMedicationName: normalizeString(intake.requestedMedicationName, 180),
        conditionOrReason: normalizeLongText(intake.conditionOrReason, 1800),
        symptomDuration: normalizeString(intake.symptomDuration, 220),
        previousDiagnosis: normalizeLongText(intake.previousDiagnosis, 1200),
        previousPrescriber: normalizeString(intake.previousPrescriber, 220),
        currentMedications: normalizeLongText(intake.currentMedications, 1200),
        allergies: normalizeLongText(intake.allergies, 900),
        chronicConditions: normalizeLongText(intake.chronicConditions, 900),
        pregnancyStatus: normalizeString(intake.pregnancyStatus, 120),
        additionalContext: normalizeLongText(intake.additionalContext, 1800),
        questionAnswers: sanitizeQuestionAnswers(intake.questionAnswers),
        redFlags: Array.isArray(intake.redFlags) ? intake.redFlags.map((item) => normalizeString(item, 160)).filter(Boolean).slice(0, 12) : [],
        patientAttestation: {
            truthfulInfo: Boolean(attestation.truthfulInfo),
            notEmergency: Boolean(attestation.notEmergency),
            consentToDoctorReview: Boolean(attestation.consentToDoctorReview),
        },
    };
};

const sanitizeTriageQuestions = (items = []) =>
    (Array.isArray(items) ? items : [])
        .map((item, index) => ({
            id: normalizeString(item?.id || `follow_up_${index + 1}`, 80),
            label: normalizeString(item?.label || item?.question || '', 500),
            type: ['text', 'textarea', 'select', 'yes_no'].includes(item?.type) ? item.type : 'textarea',
            options: Array.isArray(item?.options)
                ? item.options.map((option) => normalizeString(option, 120)).filter(Boolean).slice(0, 6)
                : [],
            required: item?.required !== false,
        }))
        .filter((item) => item.label)
        .slice(0, 4);

const sanitizeAiTriage = (value = {}) => {
    const triage = parseMaybeJson(value, {});
    const status = TRIAGE_STATUSES.has(triage.status) ? triage.status : 'needs_more_info';
    const riskLevel = RISK_LEVELS.has(triage.riskLevel) ? triage.riskLevel : 'medium';

    return {
        status,
        riskLevel,
        missingFields: Array.isArray(triage.missingFields)
            ? triage.missingFields.map((item) => normalizeString(item, 120)).filter(Boolean).slice(0, 16)
            : [],
        redFlags: Array.isArray(triage.redFlags)
            ? triage.redFlags.map((item) => normalizeString(item, 180)).filter(Boolean).slice(0, 16)
            : [],
        summaryForDoctor: normalizeLongText(triage.summaryForDoctor, 2400),
        patientMessage: normalizeLongText(triage.patientMessage, 900),
        questions: sanitizeTriageQuestions(triage.questions),
        model: normalizeString(triage.model, 120),
        evaluatedAt: triage.evaluatedAt ? new Date(triage.evaluatedAt) : new Date(),
    };
};

const isVerifiedPatientAccount = (user = {}) =>
    user?.role === 'patient' && user?.status === 'active' && user?.isVerified !== false;

const isHighRiskMedicine = (medicine = {}) => {
    const haystack = [
        medicine.name,
        medicine.category,
        medicine.restrictedPrescriptionCategory,
        medicine.description,
    ].filter(Boolean).join(' ');

    return Boolean(
        medicine.isHighRisk ||
        medicine.restrictedPrescriptionCategory ||
        HIGH_RISK_PATTERNS.some((pattern) => pattern.test(haystack))
    );
};

const isUrgentIntake = (intake = {}) =>
    URGENT_PATTERN.test([
        intake.conditionOrReason,
        intake.previousDiagnosis,
        intake.additionalContext,
        intake.questionAnswers?.map((item) => item.answer).join(' '),
    ].filter(Boolean).join(' '));

const buildProofFile = (file) => ({
    storedName: file.filename,
    originalName: file.originalname || file.filename,
    mimeType: file.mimetype || 'application/octet-stream',
    size: file.size || 0,
    uploadedAt: new Date(),
});

const getProofAbsolutePath = (storedName = '') => {
    const safeName = path.basename(String(storedName || ''));
    return path.join(prescriptionProofsDir, safeName);
};

const appendAudit = (request, req, action, note = '') => {
    request.auditTrail = [
        ...(request.auditTrail || []),
        {
            action,
            actor: req.user?._id,
            actorRole: req.user?.role || 'system',
            note,
            ip: req.ip || '',
            userAgent: req.get?.('user-agent') || '',
            createdAt: new Date(),
        },
    ];
};

const extractGeminiText = (payload = {}) =>
    payload?.candidates?.[0]?.content?.parts
        ?.map((part) => part?.text || '')
        .join('')
        .trim() || '';

const parseModelJson = (text = '') => {
    if (!text) return null;
    const cleanedText = text
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

    try {
        return JSON.parse(cleanedText);
    } catch {
        const firstBrace = cleanedText.indexOf('{');
        const lastBrace = cleanedText.lastIndexOf('}');
        if (firstBrace >= 0 && lastBrace > firstBrace) {
            try {
                return JSON.parse(cleanedText.slice(firstBrace, lastBrace + 1));
            } catch {
                return null;
            }
        }
        return null;
    }
};

const buildIntakePrompt = ({ intake, requestedItems = [], patient = {} }) => `
You are DocX prescription intake safety support. You do not prescribe, diagnose, recommend medications, recommend dosages, or imply that a patient qualifies for a prescription.

Task:
- Collect missing safety information for a doctor-gated refill or pharmacy prescription-item request.
- Return JSON only using the provided schema.
- Ask at most 3 follow-up questions.
- If the request appears urgent, unsafe for digital review, misuse-prone, contradictory, or asks for a new prescription without prior proof, set status to urgent_care or blocked.
- If sufficient intake is present for a doctor to review, set status to ready_for_doctor.
- Patient-facing message must say this is only a request for doctor review, not a prescription.

Patient snapshot:
Name: ${patient.fullName || 'Patient'}
Gender: ${patient.gender || 'Unknown'}
Allergies: ${(patient.allergies || []).join(', ') || 'Not recorded'}
Chronic conditions: ${(patient.chronicConditions || []).join(', ') || 'Not recorded'}
Current medications: ${(patient.currentMedications || []).join(', ') || 'Not recorded'}

Requested items:
${requestedItems.map((item) => `- ${item.medicineName || item.name || 'Medicine'} (${item.category || 'uncategorized'}) qty ${item.qty || 1}`).join('\n') || '- Refill request entered by patient'}

Structured intake:
${JSON.stringify(intake, null, 2)}
`;

const buildFallbackTriage = ({ intake, requestedItems = [], blockedReason = '' }) => {
    if (blockedReason) {
        return sanitizeAiTriage({
            status: 'blocked',
            riskLevel: 'blocked',
            redFlags: [blockedReason],
            patientMessage: 'This medicine cannot be requested through digital prescription. Please book a consultation so a doctor can review you directly.',
            summaryForDoctor: `Digital request blocked: ${blockedReason}`,
            questions: [],
            model: 'local-safety-rules',
        });
    }

    if (isUrgentIntake(intake)) {
        return sanitizeAiTriage({
            status: 'urgent_care',
            riskLevel: 'high',
            redFlags: ['Urgent symptom or safety concern mentioned'],
            patientMessage: 'Some details suggest this may need urgent care or a direct consultation. A digital prescription request is not the right path for this situation.',
            summaryForDoctor: 'Patient intake mentioned possible urgent symptoms. Digital prescription request should not be issued.',
            questions: [],
            model: 'local-safety-rules',
        });
    }

    const missingFields = [];
    const questions = [];
    const addMissing = (field, label, type = 'textarea', options = []) => {
        missingFields.push(field);
        questions.push({ id: field, label, type, options, required: true });
    };

    if (!intake.conditionOrReason) {
        addMissing('conditionOrReason', 'What medical condition or reason is this prescription request for?');
    }
    if (!intake.symptomDuration) {
        addMissing('symptomDuration', 'How long have you had this condition or been using this medicine?', 'text');
    }
    if (!intake.previousDiagnosis) {
        addMissing('previousDiagnosis', 'Who diagnosed this condition before, and when was it last reviewed?');
    }
    if (!intake.currentMedications) {
        addMissing('currentMedications', 'List any medicines, supplements, or treatments you are currently using.');
    }
    if (!intake.allergies) {
        addMissing('allergies', 'Do you have any medicine allergies or previous bad reactions?', 'text');
    }
    if (!requestedItems.length && !intake.requestedMedicationName) {
        addMissing('requestedMedicationName', 'Which medicine are you requesting a refill for?', 'text');
    }

    if (missingFields.length) {
        return sanitizeAiTriage({
            status: 'needs_more_info',
            riskLevel: 'medium',
            missingFields,
            patientMessage: 'Please answer the follow-up questions so a doctor has enough context to review your request.',
            summaryForDoctor: 'Prescription intake is incomplete and needs more patient details before doctor review.',
            questions: questions.slice(0, 3),
            model: 'local-safety-rules',
        });
    }

    return sanitizeAiTriage({
        status: 'ready_for_doctor',
        riskLevel: 'medium',
        patientMessage: 'Your answers are ready for doctor review. This is not a prescription and the doctor may still reject or request a consultation.',
        summaryForDoctor: [
            `Requested ${requestedItems.length ? requestedItems.map((item) => item.medicineName).filter(Boolean).join(', ') : intake.requestedMedicationName || 'refill'}.`,
            `Reason: ${intake.conditionOrReason}.`,
            `Duration: ${intake.symptomDuration}.`,
            intake.previousDiagnosis ? `Prior diagnosis/review: ${intake.previousDiagnosis}.` : '',
            intake.currentMedications ? `Current medicines: ${intake.currentMedications}.` : '',
            intake.allergies ? `Allergies/reactions: ${intake.allergies}.` : '',
        ].filter(Boolean).join(' '),
        questions: [],
        model: 'local-safety-rules',
    });
};

const runGeminiIntake = async ({ intake, requestedItems, patient, blockedReason }) => {
    const localTriage = buildFallbackTriage({ intake, requestedItems, blockedReason });

    if (blockedReason || localTriage.status === 'urgent_care') {
        return localTriage;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return localTriage;
    }

    const preferredModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const modelCandidates = [...new Set([preferredModel, 'gemini-2.0-flash', 'gemini-flash-latest'])];
    let lastError = null;

    for (const model of modelCandidates) {
        try {
            const response = await axios.post(
                `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:generateContent`,
                {
                    systemInstruction: {
                        parts: [{ text: 'You are an intake-only medical safety assistant. You never prescribe, diagnose, recommend medicine, recommend dose, or approve prescriptions.' }],
                    },
                    contents: [
                        {
                            role: 'user',
                            parts: [{ text: buildIntakePrompt({ intake, requestedItems, patient }) }],
                        },
                    ],
                    generationConfig: {
                        temperature: 0.2,
                        maxOutputTokens: 900,
                        responseMimeType: 'application/json',
                        responseSchema: INTAKE_RESPONSE_SCHEMA,
                    },
                },
                {
                    timeout: 18000,
                    headers: {
                        'Content-Type': 'application/json',
                        'x-goog-api-key': apiKey,
                    },
                }
            );

            const parsed = parseModelJson(extractGeminiText(response.data));
            if (parsed) {
                return sanitizeAiTriage({
                    ...parsed,
                    model,
                    evaluatedAt: new Date(),
                });
            }
        } catch (error) {
            lastError = error;
        }
    }

    console.warn('Gemini prescription intake failed, using local triage:', lastError?.message);
    return localTriage;
};

const PHARMACY_CATEGORY_SPECIALTIES = {
    'cardiac care': 'Cardiology',
    'respiratory care': 'Pulmonology',
    'diabetic care': 'General Physician',
    infection: 'General Physician',
    'stomach care': 'General Physician',
    others: 'General Physician',
};

const inferSpecialtyFromMedicine = (medicine) =>
    PHARMACY_CATEGORY_SPECIALTIES[String(medicine?.category || '').toLowerCase().trim()] ||
    'General Physician';

const sanitizeReturnPath = (value = '') => {
    const path = String(value || '').trim();

    if (!path || !path.startsWith('/') || path.startsWith('//') || path.includes('://')) {
        return '/pharmacy';
    }

    return path.slice(0, 240);
};

const normalizeRequestedIntentItems = (pharmacyIntent = {}, body = {}) => {
    const rawItems = Array.isArray(pharmacyIntent.requestedItems)
        ? pharmacyIntent.requestedItems
        : [];
    const fallbackMedicineId = body.medicineId || pharmacyIntent.medicineId;

    const items = rawItems.length
        ? rawItems
        : fallbackMedicineId
            ? [{ medicine: fallbackMedicineId, qty: body.qty || pharmacyIntent.qty }]
            : [];

    return items
        .map((item) => ({
            medicineId: String(item?.medicine || item?.medicineId || '').trim(),
            qty: Math.max(1, Number.parseInt(item?.qty || item?.quantity || 1, 10) || 1),
        }))
        .filter((item) => item.medicineId);
};

const resolvePharmacyIntent = async ({ pharmacyIntent = {}, body = {}, res }) => {
    const requestedItems = normalizeRequestedIntentItems(pharmacyIntent, body);

    if (!requestedItems.length) {
        return null;
    }

    const invalidMedicine = requestedItems.find(
        (item) => !mongoose.Types.ObjectId.isValid(item.medicineId)
    );

    if (invalidMedicine) {
        res.status(400);
        throw new Error('One or more requested medicines could not be found');
    }

    const source = ['pharmacy_product', 'cart'].includes(pharmacyIntent.source)
        ? pharmacyIntent.source
        : requestedItems.length > 1
            ? 'cart'
            : 'pharmacy_product';
    const medicineIds = [...new Set(requestedItems.map((item) => item.medicineId))];
    const medicines = await Medicine.find({ _id: { $in: medicineIds } })
        .select('_id name description category requiresPrescription isHighRisk restrictedPrescriptionCategory')
        .lean();
    const medicineMap = new Map(medicines.map((medicine) => [String(medicine._id), medicine]));

    if (medicineMap.size !== medicineIds.length) {
        res.status(400);
        throw new Error('One or more requested medicines could not be found');
    }

    const nonPrescriptionMedicine = medicines.find((medicine) => !medicine.requiresPrescription);
    if (nonPrescriptionMedicine) {
        res.status(400);
        throw new Error(`${nonPrescriptionMedicine.name} does not require a digital prescription request`);
    }

    const highRiskMedicine = medicines.find(isHighRiskMedicine);
    if (highRiskMedicine) {
        res.status(400);
        throw new Error(`${highRiskMedicine.name} cannot be requested through digital prescription. Please book a direct consultation.`);
    }

    return {
        source,
        returnPath: sanitizeReturnPath(pharmacyIntent.returnPath || body.returnPath),
        requestedItems: requestedItems.map((item) => {
            const medicine = medicineMap.get(item.medicineId);

            return {
                medicine: medicine._id,
                medicineName: medicine.name,
                category: medicine.category || '',
                qty: item.qty,
            };
        }),
        inferredSpecialty: inferSpecialtyFromMedicine(medicines[0]),
    };
};

const computeAge = (dob) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    if (Number.isNaN(birthDate.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age -= 1;
    }

    return age >= 0 ? age : null;
};

const sanitizeMedicines = (items = []) => {
    if (!Array.isArray(items)) return [];

    return items
        .map((item) => ({
            name: String(item?.name || '').trim(),
            dosage: String(item?.dosage || '').trim(),
            frequency: String(item?.frequency || '').trim(),
            duration: String(item?.duration || '').trim(),
            quantity: String(item?.quantity || '').trim(),
        }))
        .filter((item) => item.name && item.dosage && item.frequency);
};

const formatPrescription = (req, prescription) => {
    const object = prescription.toObject ? prescription.toObject() : { ...prescription };

    if (object.documentUrl) {
        object.documentUrl = toAbsoluteUrl(req, object.documentUrl);
    }

    if (object.signatureImageUrl) {
        object.signatureImageUrl = toAbsoluteUrl(req, object.signatureImageUrl);
    }

    return object;
};

const formatPrescriptionRequest = (req, request) => {
    const object = request.toObject ? request.toObject() : { ...request };

    if (object.prescriptionFile) {
        object.prescriptionFile = toAbsoluteUrl(req, object.prescriptionFile);
    }

    if (object.issuedPrescriptionId?.documentUrl) {
        object.issuedPrescriptionId.documentUrl = toAbsoluteUrl(
            req,
            object.issuedPrescriptionId.documentUrl
        );
    }

    if (Array.isArray(object.proofFiles)) {
        object.proofFiles = object.proofFiles.map((file) => ({
            ...file,
            downloadUrl: `${req.protocol}://${req.get('host')}/api/prescriptions/requests/${object._id}/proof/${file._id}`,
        }));
    }

    return object;
};

const ensurePatientProfile = async ({ user, allowGenderFallback = true }) => {
    let patientProfile = await Patient.findOne({ user_id: user._id });

    if (patientProfile) {
        return patientProfile;
    }

    patientProfile = await Patient.create({
        user_id: user._id,
        fullName: user.name,
        gender: allowGenderFallback ? 'Other' : undefined,
    });

    return patientProfile;
};

const canDoctorAccessRequest = (doctorProfile, request) =>
    Boolean(
        doctorProfile &&
        (
            matchesSpecialtyQuery(doctorProfile.specialization, request.specialist) ||
            String(request.issuedBy?._id || request.issuedBy || '') === String(doctorProfile._id)
        )
    );

const ensurePrescriptionRequestAccess = async (req, request) => {
    if (req.user.role === 'admin') {
        return { allowed: true, doctorProfile: null, patientProfile: null };
    }

    if (req.user.role === 'patient') {
        const patientProfile = await Patient.findOne({ user_id: req.user._id }).select('_id');
        const isOwner = String(request.userId?._id || request.userId || '') === String(req.user._id) ||
            (patientProfile && String(request.patientId?._id || request.patientId || '') === String(patientProfile._id));
        return { allowed: Boolean(isOwner), doctorProfile: null, patientProfile };
    }

    if (req.user.role === 'doctor') {
        const doctorProfile = await Doctor.findOne({ user: req.user._id }).select('_id specialization fullName');
        return { allowed: canDoctorAccessRequest(doctorProfile, request), doctorProfile, patientProfile: null };
    }

    return { allowed: false, doctorProfile: null, patientProfile: null };
};

const getRequestedItemsFromResolvedIntent = (resolvedPharmacyIntent) =>
    Array.isArray(resolvedPharmacyIntent?.requestedItems)
        ? resolvedPharmacyIntent.requestedItems
        : [];

const findDuplicatePendingRequest = async ({ userId, requestType, medicineKey, pharmacyMedicineIds = [] }) => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const query = {
        userId,
        status: 'Pending',
        createdAt: { $gte: since },
        requestType,
    };

    const pending = await PrescriptionRequest.find(query)
        .select('_id clinicalIntake pharmacyIntent createdAt')
        .lean();

    return pending.find((request) => {
        if (pharmacyMedicineIds.length) {
            const existingIds = (request.pharmacyIntent?.requestedItems || []).map((item) => String(item.medicine));
            return pharmacyMedicineIds.some((id) => existingIds.includes(String(id)));
        }

        const existingMedicine = normalizeString(request.clinicalIntake?.requestedMedicationName, 180).toLowerCase();
        return medicineKey && existingMedicine && existingMedicine === medicineKey;
    });
};

const enforceDailyPrescriptionRequestLimit = async (userId) => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await PrescriptionRequest.countDocuments({
        userId,
        createdAt: { $gte: since },
    });

    return recentCount < 5;
};

const createPrescription = asyncHandler(async (req, res) => {
    const { patientId, appointmentId, diagnosis, medicines, notes } = req.body;
    const doctor = await Doctor.findOne({ user: req.user._id });

    if (!doctor) {
        res.status(404);
        throw new Error('Doctor not found');
    }

    const patientProfile = await Patient.findById(patientId).populate('user_id', 'name email');

    if (!patientProfile) {
        res.status(404);
        throw new Error('Patient not found');
    }

    const cleanedMedicines = sanitizeMedicines(medicines);
    if (!diagnosis || !cleanedMedicines.length) {
        res.status(400);
        throw new Error('Diagnosis and at least one medicine are required');
    }

    const prescription = await Prescription.create({
        doctor_id: doctor._id,
        patient_id: patientProfile._id,
        appointment_id: appointmentId || null,
        diagnosis: String(diagnosis).trim(),
        medicines: cleanedMedicines,
        notes: String(notes || '').trim(),
        signatureImageUrl: doctor.signatureImageUrl || '',
    });

    if (appointmentId) {
        await Appointment.findByIdAndUpdate(appointmentId, { status: 'Completed' });
    }

    const createdPrescription = await Prescription.findById(prescription._id)
        .populate({
            path: 'doctor_id',
            populate: { path: 'user', select: 'name email' }
        })
        .populate('patient_id', 'fullName gender');

    await sendTemplatedEmail({
        eventKey: 'PRESCRIPTION_ISSUED',
        recipient: patientProfile.user_id?.email,
        data: {
            patientName: patientProfile.fullName || 'Patient',
            doctorName: doctor.fullName || doctor.specialization || 'Doctor',
        },
        dedupeKey: `prescription-created:${prescription._id}`,
        relatedEntity: prescription._id,
        relatedEntityModel: 'Prescription',
        category: 'transactional'
    });

    res.status(201).json(formatPrescription(req, createdPrescription));
});

const getPrescriptions = asyncHandler(async (req, res) => {
    const doctor = await Doctor.findOne({ user: req.user._id });
    if (!doctor) {
        res.status(404);
        throw new Error('Doctor profile not found');
    }

    const prescriptions = await Prescription.find({ doctor_id: doctor._id })
        .populate('patient_id', 'fullName gender')
        .sort({ createdAt: -1 });

    res.json(prescriptions.map((prescription) => formatPrescription(req, prescription)));
});

const getMyPrescriptions = asyncHandler(async (req, res) => {
    const patientProfile = await Patient.findOne({ user_id: req.user._id });

    if (!patientProfile) {
        return res.json([]);
    }

    const prescriptions = await Prescription.find({ patient_id: patientProfile._id })
        .populate({
            path: 'doctor_id',
            populate: { path: 'user', select: 'name email' }
        })
        .populate('appointment_id')
        .sort({ createdAt: -1 });

    res.json(prescriptions.map((prescription) => formatPrescription(req, prescription)));
});

const getMyPrescriptionRequests = asyncHandler(async (req, res) => {
    const requests = await PrescriptionRequest.find({ userId: req.user._id })
        .populate('pharmacyIntent.requestedItems.medicine', 'name category requiresPrescription image price manufacturer')
        .populate({
            path: 'issuedPrescriptionId',
            populate: {
                path: 'doctor_id',
                populate: { path: 'user', select: 'name email' }
            }
        })
        .populate({
            path: 'issuedBy',
            populate: { path: 'user', select: 'name email' }
        })
        .sort({ createdAt: -1 });

    res.json(requests.map((request) => formatPrescriptionRequest(req, request)));
});

const runPrescriptionIntake = asyncHandler(async (req, res) => {
    if (!isVerifiedPatientAccount(req.user)) {
        res.status(403);
        throw new Error('Only verified patient accounts can request digital prescription review');
    }

    const patientProfile = await ensurePatientProfile({ user: req.user });
    const pharmacyIntent = parseMaybeJson(req.body.pharmacyIntent, req.body.pharmacyIntent || {});
    let resolvedPharmacyIntent = null;
    let blockedReason = '';

    try {
        resolvedPharmacyIntent = await resolvePharmacyIntent({
            pharmacyIntent: pharmacyIntent || {},
            body: req.body,
            res,
        });
    } catch (error) {
        if (/cannot be requested through digital prescription/i.test(error.message || '')) {
            res.status(200);
            blockedReason = error.message;
        } else {
            throw error;
        }
    }

    const requestType = resolvedPharmacyIntent ? 'pharmacy_rx_item' : 'refill';
    const intake = sanitizeClinicalIntake(req.body.clinicalIntake || req.body, requestType);
    const requestedItems = getRequestedItemsFromResolvedIntent(resolvedPharmacyIntent);
    const refillMedicineText = normalizeString(intake.requestedMedicationName, 220);

    if (!blockedReason && requestType === 'refill' && refillMedicineText && HIGH_RISK_PATTERNS.some((pattern) => pattern.test(refillMedicineText))) {
        blockedReason = `${refillMedicineText} may require direct consultation and cannot be requested through digital prescription.`;
    }

    const triage = await runGeminiIntake({
        intake,
        requestedItems,
        patient: patientProfile,
        blockedReason,
    });

    res.json({
        requestType,
        clinicalIntake: intake,
        aiTriage: triage,
        requestedItems,
    });
});

const createRequest = asyncHandler(async (req, res) => {
    if (!isVerifiedPatientAccount(req.user)) {
        res.status(403);
        throw new Error('Only verified patient accounts can submit digital prescription requests');
    }

    const { specialist, symptoms, history, requestNotes } = req.body;
    const pharmacyIntent = parseMaybeJson(req.body.pharmacyIntent, req.body.pharmacyIntent || {});
    const resolvedPharmacyIntent = await resolvePharmacyIntent({
        pharmacyIntent: pharmacyIntent || {},
        body: req.body,
        res,
    });
    const requestType = resolvedPharmacyIntent ? 'pharmacy_rx_item' : 'refill';
    const clinicalIntake = sanitizeClinicalIntake(req.body.clinicalIntake || req.body, requestType);
    const aiTriage = await runGeminiIntake({
        intake: clinicalIntake,
        requestedItems: getRequestedItemsFromResolvedIntent(resolvedPharmacyIntent),
        patient: await ensurePatientProfile({ user: req.user }),
        blockedReason: '',
    });
    const resolvedSpecialist = String(
        specialist || resolvedPharmacyIntent?.inferredSpecialty || ''
    ).trim();

    if (!resolvedSpecialist || !clinicalIntake.conditionOrReason) {
        res.status(400);
        throw new Error('Specialty and prescription reason are required');
    }

    if (requestType === 'refill' && !clinicalIntake.requestedMedicationName) {
        res.status(400);
        throw new Error('Refill requests must include the medicine name');
    }

    if (!req.file) {
        res.status(400);
        throw new Error('Please upload prior prescription or medical proof before submitting');
    }

    if (aiTriage.status !== 'ready_for_doctor') {
        res.status(400);
        throw new Error('Complete the safety intake before submitting for doctor review');
    }

    if (aiTriage.riskLevel === 'blocked' || aiTriage.status === 'blocked' || aiTriage.status === 'urgent_care') {
        res.status(400);
        throw new Error('This request cannot be submitted as a digital prescription. Please book a consultation.');
    }

    if (isUrgentIntake(clinicalIntake)) {
        res.status(400);
        throw new Error('Urgent symptoms require direct care or consultation, not digital prescription request');
    }

    const attestation = clinicalIntake.patientAttestation || {};
    if (!attestation.truthfulInfo || !attestation.notEmergency || !attestation.consentToDoctorReview) {
        res.status(400);
        throw new Error('Please confirm the safety attestations before submitting');
    }

    const patientProfile = await ensurePatientProfile({ user: req.user });
    const age = computeAge(patientProfile.dob);
    const withinDailyLimit = await enforceDailyPrescriptionRequestLimit(req.user._id);

    if (!withinDailyLimit) {
        res.status(429);
        throw new Error('You have reached the daily prescription request limit. Please wait before submitting another request.');
    }

    const pharmacyMedicineIds = getRequestedItemsFromResolvedIntent(resolvedPharmacyIntent).map((item) => item.medicine);
    const duplicateRequest = await findDuplicatePendingRequest({
        userId: req.user._id,
        requestType,
        medicineKey: normalizeString(clinicalIntake.requestedMedicationName, 180).toLowerCase(),
        pharmacyMedicineIds,
    });

    if (duplicateRequest) {
        res.status(409);
        throw new Error('A pending request for this medicine already exists. Please wait for doctor review.');
    }

    const proofFiles = [buildProofFile(req.file)];
    const derivedSymptoms = normalizeLongText(
        symptoms || clinicalIntake.conditionOrReason,
        1800
    );
    const derivedHistory = normalizeLongText(
        history || [
            clinicalIntake.previousDiagnosis,
            clinicalIntake.currentMedications ? `Current medicines: ${clinicalIntake.currentMedications}` : '',
            clinicalIntake.allergies ? `Allergies: ${clinicalIntake.allergies}` : '',
            clinicalIntake.chronicConditions ? `Chronic conditions: ${clinicalIntake.chronicConditions}` : '',
        ].filter(Boolean).join('\n'),
        2400
    );

    const request = await PrescriptionRequest.create({
        patientName: patientProfile.fullName || req.user.name,
        age,
        gender: patientProfile.gender,
        symptoms: derivedSymptoms,
        history: derivedHistory,
        requestNotes: normalizeLongText(requestNotes || clinicalIntake.additionalContext, 1800),
        specialist: resolvedSpecialist,
        requestType,
        clinicalIntake,
        aiTriage,
        proofFiles,
        pharmacyIntent: resolvedPharmacyIntent
            ? {
                source: resolvedPharmacyIntent.source,
                returnPath: resolvedPharmacyIntent.returnPath,
                requestedItems: resolvedPharmacyIntent.requestedItems,
            }
            : undefined,
        userId: req.user._id,
        patientId: patientProfile._id,
        statusHistory: [
            {
                status: 'Pending',
                note: 'Safety intake completed and request submitted by patient',
                changedByRole: 'patient',
                changedAt: new Date(),
            }
        ],
        auditTrail: [
            {
                action: 'submitted',
                actor: req.user._id,
                actorRole: 'patient',
                note: `Submitted ${requestType} request with prior proof`,
                ip: req.ip || '',
                userAgent: req.get('user-agent') || '',
                createdAt: new Date(),
            }
        ],
    });

    const matchingDoctors = await Doctor.find({})
        .populate('user', '_id status')
        .select('user specialization fullName');

    const recipientDoctorUserIds = matchingDoctors
        .filter((doctorProfile) =>
            doctorProfile.user &&
            doctorProfile.user.status === 'active' &&
            matchesSpecialtyQuery(doctorProfile.specialization, resolvedSpecialist)
        )
        .map((doctorProfile) => doctorProfile.user._id);

    await createDoctorNotifications({
        doctorUserIds: recipientDoctorUserIds,
        type: 'PRESCRIPTION_REQUEST',
        title: 'New prescription request',
        message: `${patientProfile.fullName} submitted a ${resolvedSpecialist} digital prescription request.`,
        link: '/doctor/requests',
    });

    await sendTemplatedEmail({
        eventKey: 'PRESCRIPTION_REQUEST_RECEIVED',
        recipient: req.user.email,
        data: {
            patientName: patientProfile.fullName || 'Patient',
            doctorName: 'specialist review team',
            specialist: resolvedSpecialist,
        },
        dedupeKey: `prescription-request:${request._id}`,
        relatedEntity: request._id,
        relatedEntityModel: 'PrescriptionRequest',
        category: 'transactional'
    });

    const createdRequest = await PrescriptionRequest.findById(request._id)
        .populate('pharmacyIntent.requestedItems.medicine', 'name category requiresPrescription image price manufacturer');
    res.status(201).json(formatPrescriptionRequest(req, createdRequest));
});

const getDoctorRequests = asyncHandler(async (req, res) => {
    const doctorProfile = await Doctor.findOne({ user: req.user._id });

    if (!doctorProfile) {
        res.status(404);
        throw new Error('Doctor profile not found');
    }

    const requestedStatus = String(req.query.status || '').trim();
    const query = requestedStatus ? { status: requestedStatus } : {};

    const requests = await PrescriptionRequest.find(query)
        .populate('patientId', 'fullName gender dob allergies chronicConditions currentMedications')
        .populate('pharmacyIntent.requestedItems.medicine', 'name category requiresPrescription image price manufacturer')
        .populate('issuedPrescriptionId')
        .sort({ createdAt: -1 });

    const filteredRequests = requests.filter((request) =>
        matchesSpecialtyQuery(doctorProfile.specialization, request.specialist)
    );

    res.json(filteredRequests.map((request) => formatPrescriptionRequest(req, request)));
});

const issuePrescription = asyncHandler(async (req, res) => {
    const { diagnosis, medicines, notes } = req.body;
    const doctorProfile = await Doctor.findOne({ user: req.user._id }).populate('user', 'name email');

    if (!doctorProfile) {
        res.status(404);
        throw new Error('Doctor profile not found');
    }

    if (!doctorProfile.signatureImagePath || !doctorProfile.signatureImageUrl) {
        res.status(400);
        throw new Error('Please upload your signature in the doctor profile before issuing prescriptions');
    }

    const prescriptionRequest = await PrescriptionRequest.findById(req.params.id)
        .populate('patientId')
        .populate('userId', 'name email');

    if (!prescriptionRequest) {
        res.status(404);
        throw new Error('Request not found');
    }

    if (prescriptionRequest.status !== 'Pending') {
        res.status(409);
        throw new Error(`This request is already ${prescriptionRequest.status.toLowerCase()}`);
    }

    if (
        ['blocked', 'urgent_care'].includes(prescriptionRequest.aiTriage?.status) ||
        prescriptionRequest.aiTriage?.riskLevel === 'blocked'
    ) {
        res.status(400);
        throw new Error('This request was blocked by safety intake and cannot be issued digitally');
    }

    if (!prescriptionRequest.proofFiles?.length) {
        res.status(400);
        throw new Error('Prior prescription or medical proof is required before issuing');
    }

    if (!matchesSpecialtyQuery(doctorProfile.specialization, prescriptionRequest.specialist)) {
        res.status(403);
        throw new Error('This request does not belong to your specialty queue');
    }

    const patientProfile = prescriptionRequest.patientId
        || await ensurePatientProfile({ user: prescriptionRequest.userId || req.user });

    const cleanedMedicines = sanitizeMedicines(medicines);
    if (!diagnosis || !cleanedMedicines.length) {
        res.status(400);
        throw new Error('Diagnosis and at least one valid medicine row are required');
    }

    const prescription = await Prescription.create({
        doctor_id: doctorProfile._id,
        patient_id: patientProfile._id,
        request_id: prescriptionRequest._id,
        diagnosis: String(diagnosis).trim(),
        medicines: cleanedMedicines,
        notes: String(notes || '').trim(),
        signatureImageUrl: doctorProfile.signatureImageUrl,
    });

    const document = await generatePrescriptionDocument({
        prescriptionId: prescription._id.toString(),
        patientName: patientProfile.fullName || prescriptionRequest.patientName,
        patientGender: patientProfile.gender || prescriptionRequest.gender,
        patientAge: prescriptionRequest.age || computeAge(patientProfile.dob),
        specialist: prescriptionRequest.specialist,
        diagnosis: prescription.diagnosis,
        medicines: prescription.medicines,
        notes: prescription.notes,
        doctorName: doctorProfile.fullName || doctorProfile.user?.name || 'Doctor',
        doctorSpecialty: doctorProfile.specialization,
        hospitalName: doctorProfile.hospitalAffiliation,
        signatureImagePath: doctorProfile.signatureImagePath,
    });

    prescription.documentPath = document.documentPath;
    prescription.documentUrl = document.documentUrl;
    await prescription.save();

    prescriptionRequest.status = 'Issued';
    prescriptionRequest.doctorNote = String(notes || '').trim();
    prescriptionRequest.prescriptionFile = document.documentUrl;
    prescriptionRequest.issuedBy = doctorProfile._id;
    prescriptionRequest.issuedPrescriptionId = prescription._id;
    prescriptionRequest.issuedAt = new Date();
    prescriptionRequest.updatedAt = new Date();
    prescriptionRequest.statusHistory = [
        ...(prescriptionRequest.statusHistory || []),
        {
        status: 'Issued',
        note: 'Signed prescription issued by doctor',
        changedByRole: 'doctor',
        changedAt: new Date(),
        }
    ];
    appendAudit(prescriptionRequest, req, 'issued', 'Doctor issued signed prescription');
    await prescriptionRequest.save();

    await sendTemplatedEmail({
        eventKey: 'PRESCRIPTION_ISSUED',
        recipient: prescriptionRequest.userId?.email,
        data: {
            patientName: patientProfile.fullName || prescriptionRequest.patientName || 'Patient',
            doctorName: doctorProfile.fullName || doctorProfile.user?.name || 'Doctor',
        },
        dedupeKey: `prescription-issued:${prescriptionRequest._id}`,
        relatedEntity: prescriptionRequest._id,
        relatedEntityModel: 'PrescriptionRequest',
        category: 'transactional'
    });

    const updatedRequest = await PrescriptionRequest.findById(prescriptionRequest._id)
        .populate('pharmacyIntent.requestedItems.medicine', 'name category requiresPrescription image price manufacturer')
        .populate({
            path: 'issuedPrescriptionId',
            populate: {
                path: 'doctor_id',
                populate: { path: 'user', select: 'name email' }
            }
        })
        .populate({
            path: 'issuedBy',
            populate: { path: 'user', select: 'name email' }
        });

    res.json(formatPrescriptionRequest(req, updatedRequest));
});

const rejectPrescriptionRequest = asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const doctorProfile = await Doctor.findOne({ user: req.user._id }).populate('user', 'name email');

    if (!doctorProfile) {
        res.status(404);
        throw new Error('Doctor profile not found');
    }

    if (!reason || !String(reason).trim()) {
        res.status(400);
        throw new Error('A rejection reason is required');
    }

    const prescriptionRequest = await PrescriptionRequest.findById(req.params.id)
        .populate('userId', 'name email')
        .populate('pharmacyIntent.requestedItems.medicine', 'name category requiresPrescription image price manufacturer');

    if (!prescriptionRequest) {
        res.status(404);
        throw new Error('Request not found');
    }

    if (!matchesSpecialtyQuery(doctorProfile.specialization, prescriptionRequest.specialist)) {
        res.status(403);
        throw new Error('This request does not belong to your specialty queue');
    }

    prescriptionRequest.status = 'Rejected';
    prescriptionRequest.rejectionReason = String(reason).trim();
    prescriptionRequest.issuedBy = doctorProfile._id;
    prescriptionRequest.updatedAt = new Date();
    prescriptionRequest.statusHistory = [
        ...(prescriptionRequest.statusHistory || []),
        {
        status: 'Rejected',
        note: String(reason).trim(),
        changedByRole: 'doctor',
        changedAt: new Date(),
        }
    ];
    appendAudit(prescriptionRequest, req, 'rejected', String(reason).trim());

    await prescriptionRequest.save();

    await sendTemplatedEmail({
        eventKey: 'PRESCRIPTION_REJECTED',
        recipient: prescriptionRequest.userId?.email,
        data: {
            patientName: prescriptionRequest.patientName || prescriptionRequest.userId?.name || 'Patient',
            doctorName: doctorProfile.fullName || doctorProfile.user?.name || 'Doctor',
            reason: String(reason).trim(),
        },
        dedupeKey: `prescription-rejected:${prescriptionRequest._id}`,
        relatedEntity: prescriptionRequest._id,
        relatedEntityModel: 'PrescriptionRequest',
        category: 'transactional'
    });

    res.json(formatPrescriptionRequest(req, prescriptionRequest));
});

const getPrescriptionRequestProof = asyncHandler(async (req, res) => {
    const request = await PrescriptionRequest.findById(req.params.id)
        .populate('patientId', '_id')
        .populate('issuedBy', '_id specialization');

    if (!request) {
        res.status(404);
        throw new Error('Prescription request not found');
    }

    const access = await ensurePrescriptionRequestAccess(req, request);
    if (!access.allowed) {
        res.status(403);
        throw new Error('Not authorized to access this prescription proof');
    }

    const proofFile = (request.proofFiles || []).id(req.params.fileId);
    if (!proofFile) {
        res.status(404);
        throw new Error('Prescription proof file not found');
    }

    const absolutePath = getProofAbsolutePath(proofFile.storedName);
    if (!fs.existsSync(absolutePath)) {
        res.status(404);
        throw new Error('Prescription proof file is no longer available');
    }

    appendAudit(request, req, 'proof_downloaded', proofFile.originalName || 'Prescription proof downloaded');
    await request.save();

    if (req.query.download === '1') {
        return res.download(
            absolutePath,
            path.basename(proofFile.originalName || `prescription-proof-${request._id}`)
        );
    }

    res.type(proofFile.mimeType || 'application/octet-stream');
    return res.sendFile(absolutePath);
});

const getPrescriptionDocument = asyncHandler(async (req, res) => {
    const prescription = await Prescription.findById(req.params.id)
        .populate('doctor_id')
        .populate('patient_id');

    if (!prescription || !prescription.documentPath || !fs.existsSync(prescription.documentPath)) {
        res.status(404);
        throw new Error('Prescription document not found');
    }

    const patientProfile = req.user.role === 'patient'
        ? await Patient.findOne({ user_id: req.user._id }).select('_id')
        : null;
    const doctorProfile = req.user.role === 'doctor'
        ? await Doctor.findOne({ user: req.user._id }).select('_id')
        : null;

    const isAdmin = req.user.role === 'admin';
    const isOwnerPatient = patientProfile && String(prescription.patient_id?._id || prescription.patient_id) === String(patientProfile._id);
    const isOwnerDoctor = doctorProfile && String(prescription.doctor_id?._id || prescription.doctor_id) === String(doctorProfile._id);

    if (!isAdmin && !isOwnerPatient && !isOwnerDoctor) {
        res.status(403);
        throw new Error('Not authorized to access this document');
    }

    if (req.query.download === '1') {
        return res.download(
            prescription.documentPath,
            `docx-prescription-${String(prescription._id).slice(-8).toUpperCase()}.pdf`
        );
    }

    return res.sendFile(prescription.documentPath);
});

module.exports = {
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
    getPrescriptionDocument,
};
