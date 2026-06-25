const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const ClinicalEncounter = require('../models/ClinicalEncounter');
const Doctor = require('../models/Doctor');
const EHRAccessLog = require('../models/EHRAccessLog');
const EHRDocument = require('../models/EHRDocument');
const EPrescription = require('../models/EPrescription');
const Medicine = require('../models/Medicine');
const OnlineConsultation = require('../models/OnlineConsultation');
const Patient = require('../models/Patient');
const PatientMedication = require('../models/PatientMedication');
const Prescription = require('../models/Prescription');
const { ehrPrivateDocumentsDir } = require('../utils/storagePaths');
const { encrypt, decrypt, encryptFields, decryptFields } = require('../utils/crypto');
const {
    sendAdminTemplatedEmail,
    sendTemplatedEmail,
} = require('../utils/email/dispatcher');

const ENCOUNTER_ENCRYPTED_FIELDS = ['symptoms', 'diagnosis', 'doctorNotes'];
const DOCUMENT_ENCRYPTED_FIELDS = ['title', 'description'];
const DOCUMENT_CATEGORIES = new Set([
    'doctor_note',
    'lab_report',
    'imaging',
    'prescription_record',
    'discharge_summary',
    'vaccination',
    'old_record',
    'other',
]);
const MEDICATION_STATUSES = new Set(['active', 'stopped', 'completed', 'unknown']);
const MEDICATION_SOURCES = new Set(['patient_reported', 'doctor_prescribed', 'imported_record']);

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ''));

const parseDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const cleanFiles = (files = []) => {
    files.forEach((file) => {
        if (file?.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
    });
};

const checksumFile = (filePath) => {
    const hash = crypto.createHash('sha256');
    hash.update(fs.readFileSync(filePath));
    return hash.digest('hex');
};

const getRequestMeta = (req) => ({
    ip: req.ip || req.headers['x-forwarded-for'] || '',
    userAgent: req.get('user-agent') || '',
});

const logEhrAccess = async (req, { patientId, doctorId, action, targetType = '', targetId = null }) => {
    try {
        await EHRAccessLog.create({
            userId: req.user._id,
            role: req.user.role,
            patientId,
            doctorId,
            action,
            targetType,
            targetId,
            ...getRequestMeta(req),
        });
    } catch (error) {
        console.warn(`[EHR] Failed to write access log: ${error.message}`);
    }
};

const getDoctorForUser = async (userId) => Doctor.findOne({ user: userId });

const doctorHasPatientRelationship = async (doctorId, patientId) => {
    const [physicalAppointment, virtualConsultation] = await Promise.all([
        Appointment.exists({
            doctor_id: doctorId,
            patient_id: patientId,
            type: 'PHYSICAL',
            status: { $in: ['confirmed', 'completed'] },
            paymentStatus: 'paid',
        }),
        OnlineConsultation.exists({
            doctor: doctorId,
            patient: patientId,
            status: { $in: ['approved', 'scheduled', 'meeting_pending', 'completed'] },
            paymentStatus: 'paid',
        }),
    ]);

    return Boolean(physicalAppointment || virtualConsultation);
};

const assertPatientExists = async (patientId) => {
    if (!isValidObjectId(patientId)) {
        const error = new Error('Invalid patient id');
        error.statusCode = 400;
        throw error;
    }

    const patient = await Patient.findById(patientId).populate({ path: 'user_id', select: 'name email' });
    if (!patient) {
        const error = new Error('Patient not found');
        error.statusCode = 404;
        throw error;
    }

    return patient;
};

const assertEhrAccess = async (req, patientId) => {
    const patient = await assertPatientExists(patientId);

    if (req.user.role === 'admin') {
        return { patient, doctor: null };
    }

    if (req.user.role === 'patient') {
        if (String(patient.user_id?._id || patient.user_id) !== String(req.user._id)) {
            const error = new Error('You can only access your own EHR');
            error.statusCode = 403;
            throw error;
        }
        return { patient, doctor: null };
    }

    if (req.user.role === 'doctor') {
        const doctor = await getDoctorForUser(req.user._id);
        if (!doctor) {
            const error = new Error('Doctor profile not found');
            error.statusCode = 404;
            throw error;
        }

        const hasRelationship = await doctorHasPatientRelationship(doctor._id, patient._id);
        if (!hasRelationship) {
            const error = new Error('You do not have an active care relationship with this patient');
            error.statusCode = 403;
            throw error;
        }

        return { patient, doctor };
    }

    const error = new Error('Not authorized to access EHR');
    error.statusCode = 403;
    throw error;
};

const resolvePatientIdForRequest = async (req, requestedPatientId) => {
    if (req.user.role === 'patient') {
        const patient = await Patient.findOne({ user_id: req.user._id });
        if (!patient) {
            const error = new Error('Patient profile not found');
            error.statusCode = 404;
            throw error;
        }

        if (requestedPatientId && String(requestedPatientId) !== String(patient._id)) {
            const error = new Error('You can only write records to your own EHR');
            error.statusCode = 403;
            throw error;
        }

        return patient._id;
    }

    if (!requestedPatientId) {
        const error = new Error('patientId is required');
        error.statusCode = 400;
        throw error;
    }

    return requestedPatientId;
};

const buildDoctorSummary = (doctor) => {
    if (!doctor) return null;
    const doctorDoc = doctor.toObject ? doctor.toObject() : doctor;
    return {
        _id: doctorDoc._id,
        name: doctorDoc.fullName || doctorDoc.user?.name || 'Unknown Doctor',
        specialization: doctorDoc.specialization || '',
    };
};

const decryptEncounter = (encounter) => {
    const plain = decryptFields(encounter, ENCOUNTER_ENCRYPTED_FIELDS);
    plain.noteAddenda = (plain.noteAddenda || []).map((entry) => ({
        ...entry,
        note: decrypt(entry.note),
        reason: decrypt(entry.reason),
    }));
    return plain;
};

const decryptDocument = (document) => {
    const plain = decryptFields(document, DOCUMENT_ENCRYPTED_FIELDS);
    plain.files = (plain.files || []).map((file) => ({
        _id: file._id,
        originalName: decrypt(file.originalName),
        mimeType: file.mimeType,
        size: file.size,
        checksum: file.checksum,
        uploadedAt: file.uploadedAt,
    }));
    return plain;
};

const syncPatientCurrentMedicationStrings = async (patientId) => {
    const activeMedications = await PatientMedication.find({ patientId, status: 'active' })
        .select('name dosage frequency')
        .sort({ updatedAt: -1 })
        .lean();

    const values = activeMedications.map((med) =>
        [med.name, med.dosage, med.frequency].filter(Boolean).join(' ')
    );

    await Patient.findByIdAndUpdate(patientId, { currentMedications: values });
};

const backfillLegacyMedications = async (patient) => {
    const legacyMedications = (patient.currentMedications || [])
        .map((item) => String(item || '').trim())
        .filter(Boolean);

    if (!legacyMedications.length) return;

    const existingLegacyCount = await PatientMedication.countDocuments({
        patientId: patient._id,
        source: 'patient_reported',
    });

    if (existingLegacyCount > 0) return;

    await PatientMedication.insertMany(
        legacyMedications.map((name) => ({
            patientId: patient._id,
            name,
            status: 'active',
            source: 'patient_reported',
            lastClinicalUpdateAt: new Date(),
        }))
    );
};

const createMedicationRowsFromPrescription = async ({ patientId, doctorId, encounterId, prescriptionId, medicines = [] }, session = null) => {
    const medicationRows = medicines
        .filter((medicine) => medicine?.name)
        .map((medicine) => ({
            patientId,
            doctorId,
            encounterId,
            prescriptionId,
            name: medicine.name,
            dosage: medicine.dosage || '',
            frequency: medicine.frequency || '',
            endDate: null,
            status: 'active',
            source: 'doctor_prescribed',
            lastClinicalUpdateAt: new Date(),
        }));

    if (!medicationRows.length) return;

    if (session) {
        await PatientMedication.create(medicationRows, { session });
        return;
    }

    await PatientMedication.insertMany(medicationRows);
};

const filterByTimelineQuery = (items, query) => {
    const type = String(query.type || '').trim();
    const category = String(query.category || '').trim();
    const source = String(query.source || '').trim();
    const doctorName = String(query.doctor || '').trim().toLowerCase();
    const specialty = String(query.specialty || '').trim().toLowerCase();

    return items.filter((item) => {
        if (type && type !== 'all' && item.type !== type && item.category !== type) return false;
        if (category && category !== 'all' && item.category !== category) return false;
        if (source && source !== 'all' && item.sourceType !== source && item.source !== source) return false;
        if (doctorName && !String(item.doctor?.name || '').toLowerCase().includes(doctorName)) return false;
        if (specialty && !String(item.doctor?.specialization || '').toLowerCase().includes(specialty)) return false;
        return true;
    });
};

const toTimelineDoctor = (doc) => buildDoctorSummary(doc?.doctorId || doc?.doctor_id || doc?.doctor);

const createEncounterWithPrescription = asyncHandler(async (req, res) => {
    const {
        patientId,
        appointmentId,
        onlineConsultationId,
        vitals,
        symptoms,
        diagnosis,
        doctorNotes,
        medicines,
    } = req.body;

    if (!patientId || !symptoms || !diagnosis || !Array.isArray(medicines) || medicines.length === 0) {
        res.status(400);
        throw new Error('Missing required fields: patientId, symptoms, diagnosis, and at least one medicine.');
    }

    const { patient, doctor } = await assertEhrAccess(req, patientId);
    if (!doctor) {
        res.status(404);
        throw new Error('Doctor profile not found for authenticated user.');
    }

    const session = await mongoose.startSession();

    try {
        let encounter;
        let prescription;

        await session.withTransaction(async () => {
            const encounterData = {
                patientId,
                doctorId: doctor._id,
                appointmentId: appointmentId || undefined,
                onlineConsultationId: onlineConsultationId || undefined,
                sourceType: onlineConsultationId ? 'virtual_consultation' : 'physical_consultation',
                vitals: vitals || {},
                symptoms,
                diagnosis,
                doctorNotes: doctorNotes || '',
                timestamp: new Date(),
            };

            encryptFields(encounterData, ENCOUNTER_ENCRYPTED_FIELDS);

            const [createdEncounter] = await ClinicalEncounter.create([encounterData], { session });
            encounter = createdEncounter;

            const prescriptionData = {
                encounterId: encounter._id,
                patientId,
                doctorId: doctor._id,
                medicines,
                status: 'PENDING_PHARMACY',
            };

            const [createdPrescription] = await EPrescription.create([prescriptionData], { session });
            prescription = createdPrescription;

            await createMedicationRowsFromPrescription({
                patientId,
                doctorId: doctor._id,
                encounterId: encounter._id,
                prescriptionId: prescription._id,
                medicines,
            }, session);
        });

        await syncPatientCurrentMedicationStrings(patientId);

        const decryptedEncounter = decryptEncounter(encounter);

        await logEhrAccess(req, {
            patientId,
            doctorId: doctor._id,
            action: 'note_update',
            targetType: 'ClinicalEncounter',
            targetId: encounter._id,
        });

        await sendAdminTemplatedEmail({
            eventKey: 'EPRESCRIPTION_CREATED',
            data: {
                patientName: patient.fullName || 'Patient',
                doctorName: doctor.fullName || 'Doctor',
            },
            dedupeKey: `eprescription-created:${prescription._id}`,
            relatedEntity: prescription._id,
            relatedEntityModel: 'EPrescription',
            category: 'system',
        });

        res.status(201).json({
            message: 'Encounter and prescription created successfully.',
            encounter: decryptedEncounter,
            prescription,
        });
    } catch (error) {
        console.error('[EHR] Transaction failed:', error);
        if (!res.statusCode || res.statusCode < 400) {
            res.status(500);
        }
        throw new Error(error.message || 'Failed to create encounter. Transaction rolled back.');
    } finally {
        session.endSession();
    }
});

const dispensePrescription = asyncHandler(async (req, res) => {
    const prescription = await EPrescription.findById(req.params.id);

    if (!prescription) {
        res.status(404);
        throw new Error('Prescription not found.');
    }

    if (prescription.status === 'DISPENSED') {
        res.status(400);
        throw new Error('This prescription has already been dispensed.');
    }

    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            prescription.status = 'DISPENSED';
            prescription.pharmacistId = req.user._id;
            prescription.dispenseTimestamp = new Date();
            await prescription.save({ session });

            for (const med of prescription.medicines) {
                const inventoryItem = await Medicine.findOne({ name: { $regex: new RegExp(`^${escapeRegex(med.name)}$`, 'i') } }).session(session);

                if (inventoryItem) {
                    const deductQty = med.quantity || 1;
                    inventoryItem.stock = Math.max(0, inventoryItem.stock - deductQty);
                    await inventoryItem.save({ session });
                } else {
                    console.warn(`[EHR Dispense] Medicine "${med.name}" not found in inventory. Skipping stock deduction.`);
                }
            }
        });

        const updatedPrescription = await EPrescription.findById(req.params.id)
            .populate({ path: 'patientId', select: 'fullName' })
            .populate({ path: 'doctorId', populate: { path: 'user', select: 'name' } });

        const patientProfile = updatedPrescription?.patientId
            ? await Patient.findById(updatedPrescription.patientId._id || updatedPrescription.patientId)
                .populate({ path: 'user_id', select: 'email name' })
            : null;

        await sendTemplatedEmail({
            eventKey: 'EPRESCRIPTION_DISPENSED',
            recipient: patientProfile?.user_id?.email,
            data: {
                patientName: patientProfile?.fullName || updatedPrescription?.patientId?.fullName || 'Patient',
                doctorName:
                    updatedPrescription?.doctorId?.fullName ||
                    updatedPrescription?.doctorId?.user?.name ||
                    'Doctor',
            },
            dedupeKey: `eprescription-dispensed:${updatedPrescription._id}`,
            relatedEntity: updatedPrescription._id,
            relatedEntityModel: 'EPrescription',
            category: 'transactional',
        });

        res.json({
            message: 'Prescription dispensed and inventory updated.',
            prescription: updatedPrescription,
        });
    } catch (error) {
        console.error('[EHR] Dispense transaction failed:', error);
        res.status(500);
        throw new Error('Failed to dispense. Transaction rolled back.');
    } finally {
        session.endSession();
    }
});

const getPatientSummary = asyncHandler(async (req, res) => {
    const { patient, doctor } = await assertEhrAccess(req, req.params.patientId);
    await backfillLegacyMedications(patient);

    const [activeMedications, encounterCount, documentCount, ePrescriptionCount, signedPrescriptionCount, latestEncounter, latestDocument, latestMedication] = await Promise.all([
        PatientMedication.find({ patientId: patient._id, status: 'active' })
            .populate({ path: 'doctorId', select: 'fullName specialization' })
            .sort({ updatedAt: -1 })
            .lean(),
        ClinicalEncounter.countDocuments({ patientId: patient._id }),
        EHRDocument.countDocuments({ patientId: patient._id, status: 'active' }),
        EPrescription.countDocuments({ patientId: patient._id }),
        Prescription.countDocuments({ patient_id: patient._id }),
        ClinicalEncounter.findOne({ patientId: patient._id }).sort({ updatedAt: -1 }).select('updatedAt timestamp').lean(),
        EHRDocument.findOne({ patientId: patient._id, status: 'active' }).sort({ lastClinicalUpdateAt: -1 }).select('lastClinicalUpdateAt updatedAt').lean(),
        PatientMedication.findOne({ patientId: patient._id }).sort({ updatedAt: -1 }).select('updatedAt').lean(),
    ]);

    const latestUpdate = [latestEncounter?.updatedAt, latestEncounter?.timestamp, latestDocument?.lastClinicalUpdateAt, latestDocument?.updatedAt, latestMedication?.updatedAt]
        .filter(Boolean)
        .map((date) => new Date(date))
        .sort((a, b) => b - a)[0] || null;

    await logEhrAccess(req, {
        patientId: patient._id,
        doctorId: doctor?._id,
        action: 'summary_view',
        targetType: 'Patient',
        targetId: patient._id,
    });

    res.json({
        patient: {
            _id: patient._id,
            fullName: patient.fullName,
            dob: patient.dob,
            gender: patient.gender,
            phone: patient.phone,
            bloodGroup: patient.bloodGroup,
            allergies: patient.allergies || [],
            chronicConditions: patient.chronicConditions || [],
            emergencyContact: patient.emergencyContact || null,
        },
        counts: {
            encounters: encounterCount,
            documents: documentCount,
            prescriptions: ePrescriptionCount + signedPrescriptionCount,
            activeMedications: activeMedications.length,
        },
        activeMedications,
        latestUpdate,
    });
});

const getPatientTimeline = asyncHandler(async (req, res) => {
    const { patient, doctor } = await assertEhrAccess(req, req.params.patientId);
    await backfillLegacyMedications(patient);

    const dateFrom = parseDate(req.query.dateFrom);
    const dateTo = parseDate(req.query.dateTo);
    const dateQuery = {};
    if (dateFrom) dateQuery.$gte = dateFrom;
    if (dateTo) dateQuery.$lte = dateTo;

    const encounterQuery = { patientId: patient._id };
    const documentQuery = { patientId: patient._id, status: { $ne: 'deleted' } };
    const medicationQuery = { patientId: patient._id };
    const ePrescriptionQuery = { patientId: patient._id };
    const signedPrescriptionQuery = { patient_id: patient._id };

    if (Object.keys(dateQuery).length) {
        encounterQuery.timestamp = dateQuery;
        documentQuery.recordDate = dateQuery;
        medicationQuery.lastClinicalUpdateAt = dateQuery;
        ePrescriptionQuery.createdAt = dateQuery;
        signedPrescriptionQuery.date = dateQuery;
    }

    if (req.query.doctorId && isValidObjectId(req.query.doctorId)) {
        encounterQuery.doctorId = req.query.doctorId;
        documentQuery.doctorId = req.query.doctorId;
        medicationQuery.doctorId = req.query.doctorId;
        ePrescriptionQuery.doctorId = req.query.doctorId;
        signedPrescriptionQuery.doctor_id = req.query.doctorId;
    }

    const [encounters, documents, medications, ePrescriptions, signedPrescriptions] = await Promise.all([
        ClinicalEncounter.find(encounterQuery)
            .populate({ path: 'doctorId', select: 'fullName specialization user', populate: { path: 'user', select: 'name' } })
            .lean(),
        EHRDocument.find(documentQuery)
            .populate({ path: 'doctorId', select: 'fullName specialization user', populate: { path: 'user', select: 'name' } })
            .lean(),
        PatientMedication.find(medicationQuery)
            .populate({ path: 'doctorId', select: 'fullName specialization user', populate: { path: 'user', select: 'name' } })
            .lean(),
        EPrescription.find(ePrescriptionQuery)
            .populate({ path: 'doctorId', select: 'fullName specialization user', populate: { path: 'user', select: 'name' } })
            .lean(),
        Prescription.find(signedPrescriptionQuery)
            .populate({ path: 'doctor_id', select: 'fullName specialization user', populate: { path: 'user', select: 'name' } })
            .lean(),
    ]);

    const ePrescriptionByEncounter = new Map(ePrescriptions.map((rx) => [String(rx.encounterId), rx]));

    const encounterItems = encounters.map((encounter) => {
        const decrypted = decryptEncounter(encounter);
        const prescription = ePrescriptionByEncounter.get(String(encounter._id)) || null;
        const itemDoctor = toTimelineDoctor(encounter);

        return {
            id: String(encounter._id),
            type: 'doctor_note',
            category: 'doctor_note',
            title: decrypted.diagnosis || 'Clinical encounter',
            summary: decrypted.doctorNotes || decrypted.symptoms || '',
            recordDate: encounter.timestamp,
            lastUpdatedAt: encounter.updatedAt || encounter.timestamp,
            sourceType: encounter.sourceType || 'physical_consultation',
            doctor: itemDoctor,
            encounter: decrypted,
            prescription,
        };
    });

    const documentItems = documents.map((document) => {
        const decrypted = decryptDocument(document);
        return {
            id: String(document._id),
            type: 'document',
            category: document.category,
            title: decrypted.title,
            summary: decrypted.description,
            recordDate: document.recordDate,
            lastUpdatedAt: document.lastClinicalUpdateAt || document.updatedAt,
            sourceType: document.uploadedBy?.role === 'patient' ? 'patient_upload' : 'clinical_upload',
            status: document.status,
            uploadedBy: document.uploadedBy,
            doctor: toTimelineDoctor(document),
            files: decrypted.files.map((file) => ({
                ...file,
                downloadUrl: `/ehr/documents/${document._id}/files/${file._id}`,
            })),
            document: decrypted,
        };
    });

    const medicationItems = medications.map((medication) => ({
        id: String(medication._id),
        type: 'medication',
        category: 'medication',
        title: medication.name,
        summary: [medication.dosage, medication.frequency, medication.route].filter(Boolean).join(' • '),
        recordDate: medication.startDate || medication.createdAt,
        lastUpdatedAt: medication.lastClinicalUpdateAt || medication.updatedAt,
        source: medication.source,
        status: medication.status,
        doctor: toTimelineDoctor(medication),
        medication,
    }));

    const signedPrescriptionItems = signedPrescriptions.map((prescription) => ({
        id: String(prescription._id),
        type: 'prescription',
        category: 'prescription_record',
        title: prescription.diagnosis || 'Signed prescription',
        summary: (prescription.medicines || []).map((medicine) => medicine.name).join(', '),
        recordDate: prescription.date || prescription.createdAt,
        lastUpdatedAt: prescription.updatedAt || prescription.date,
        sourceType: 'signed_prescription',
        doctor: toTimelineDoctor(prescription),
        prescription,
    }));

    const timelineItems = filterByTimelineQuery([
        ...encounterItems,
        ...documentItems,
        ...medicationItems,
        ...signedPrescriptionItems,
    ], req.query);

    const sortBy = req.query.sortBy === 'recordDate' ? 'recordDate' : 'lastUpdatedAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    timelineItems.sort((a, b) => {
        const left = new Date(a[sortBy] || a.recordDate || 0).getTime();
        const right = new Date(b[sortBy] || b.recordDate || 0).getTime();
        return (left - right) * sortOrder;
    });

    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const start = (page - 1) * limit;
    const paginatedItems = timelineItems.slice(start, start + limit);

    await logEhrAccess(req, {
        patientId: patient._id,
        doctorId: doctor?._id,
        action: 'timeline_view',
        targetType: 'Patient',
        targetId: patient._id,
    });

    res.json({
        items: paginatedItems,
        timeline: paginatedItems,
        total: timelineItems.length,
        page,
        limit,
        totalPages: Math.ceil(timelineItems.length / limit),
    });
});

const getPendingPrescriptions = asyncHandler(async (_req, res) => {
    const pending = await EPrescription.find({ status: 'PENDING_PHARMACY' })
        .populate({ path: 'patientId', select: 'fullName' })
        .populate({ path: 'doctorId', populate: { path: 'user', select: 'name' } })
        .sort({ createdAt: -1 });

    res.json(pending);
});

const getEHRPatientList = asyncHandler(async (_req, res) => {
    const [encounters, documents, medications, ePrescriptions, signedPrescriptions] = await Promise.all([
        ClinicalEncounter.aggregate([
            { $group: { _id: '$patientId', encounterCount: { $sum: 1 }, lastVisit: { $max: '$timestamp' } } },
        ]),
        EHRDocument.aggregate([
            { $match: { status: { $ne: 'deleted' } } },
            { $group: { _id: '$patientId', documentCount: { $sum: 1 }, lastDocumentUpdate: { $max: '$lastClinicalUpdateAt' } } },
        ]),
        PatientMedication.aggregate([
            { $group: { _id: '$patientId', medicationCount: { $sum: 1 }, lastMedicationUpdate: { $max: '$updatedAt' } } },
        ]),
        EPrescription.aggregate([
            { $group: { _id: '$patientId', ePrescriptionCount: { $sum: 1 }, lastEPrescriptionUpdate: { $max: '$updatedAt' } } },
        ]),
        Prescription.aggregate([
            { $group: { _id: '$patient_id', signedPrescriptionCount: { $sum: 1 }, lastSignedPrescriptionUpdate: { $max: '$updatedAt' } } },
        ]),
    ]);

    const stats = new Map();
    const mergeStat = (rows, mapper) => {
        rows.forEach((row) => {
            if (!row._id) return;
            const key = String(row._id);
            stats.set(key, { ...(stats.get(key) || { _id: row._id }), ...mapper(row) });
        });
    };

    mergeStat(encounters, (row) => ({ encounterCount: row.encounterCount, lastVisit: row.lastVisit }));
    mergeStat(documents, (row) => ({ documentCount: row.documentCount, lastDocumentUpdate: row.lastDocumentUpdate }));
    mergeStat(medications, (row) => ({ medicationCount: row.medicationCount, lastMedicationUpdate: row.lastMedicationUpdate }));
    mergeStat(ePrescriptions, (row) => ({ ePrescriptionCount: row.ePrescriptionCount, lastEPrescriptionUpdate: row.lastEPrescriptionUpdate }));
    mergeStat(signedPrescriptions, (row) => ({ signedPrescriptionCount: row.signedPrescriptionCount, lastSignedPrescriptionUpdate: row.lastSignedPrescriptionUpdate }));

    const patientIds = Array.from(stats.values()).map((stat) => stat._id);
    const patients = await Patient.find({ _id: { $in: patientIds } })
        .select('fullName dob gender bloodGroup allergies chronicConditions currentMedications')
        .lean();

    const patientMap = new Map(patients.map((patient) => [String(patient._id), patient]));

    const result = Array.from(stats.values())
        .map((stat) => {
            const patient = patientMap.get(String(stat._id)) || {};
            const lastUpdatedAt = [
                stat.lastVisit,
                stat.lastDocumentUpdate,
                stat.lastMedicationUpdate,
                stat.lastEPrescriptionUpdate,
                stat.lastSignedPrescriptionUpdate,
            ]
                .filter(Boolean)
                .map((date) => new Date(date))
                .sort((a, b) => b - a)[0] || null;

            return {
                ...patient,
                _id: stat._id,
                encounterCount: stat.encounterCount || 0,
                documentCount: stat.documentCount || 0,
                medicationCount: stat.medicationCount || 0,
                prescriptionCount: (stat.ePrescriptionCount || 0) + (stat.signedPrescriptionCount || 0),
                lastVisit: stat.lastVisit || lastUpdatedAt,
                lastUpdatedAt,
            };
        })
        .sort((a, b) => new Date(b.lastUpdatedAt || 0) - new Date(a.lastUpdatedAt || 0));

    res.json(result);
});

const createEHRDocument = asyncHandler(async (req, res) => {
    try {
        const patientId = await resolvePatientIdForRequest(req, req.body.patientId);
        const { patient, doctor } = await assertEhrAccess(req, patientId);

        if (!req.files || req.files.length === 0) {
            res.status(400);
            throw new Error('At least one EHR file is required');
        }

        const category = DOCUMENT_CATEGORIES.has(req.body.category) ? req.body.category : 'other';
        const title = String(req.body.title || req.files[0].originalname || 'Medical record').trim();
        const description = String(req.body.description || '').trim();
        const recordDate = parseDate(req.body.recordDate) || new Date();
        const now = new Date();

        const documentData = {
            patientId: patient._id,
            doctorId: doctor?._id || (isValidObjectId(req.body.doctorId) ? req.body.doctorId : undefined),
            encounterId: isValidObjectId(req.body.encounterId) ? req.body.encounterId : undefined,
            appointmentId: isValidObjectId(req.body.appointmentId) ? req.body.appointmentId : undefined,
            onlineConsultationId: isValidObjectId(req.body.onlineConsultationId) ? req.body.onlineConsultationId : undefined,
            category,
            title,
            description,
            recordDate,
            lastClinicalUpdateAt: now,
            uploadedBy: {
                user: req.user._id,
                role: req.user.role,
            },
            files: req.files.map((file) => ({
                storedName: file.filename,
                originalName: encrypt(file.originalname || file.filename),
                mimeType: file.mimetype,
                size: file.size,
                checksum: checksumFile(file.path),
                uploadedAt: now,
            })),
        };

        encryptFields(documentData, DOCUMENT_ENCRYPTED_FIELDS);
        const document = await EHRDocument.create(documentData);

        await logEhrAccess(req, {
            patientId: patient._id,
            doctorId: doctor?._id || document.doctorId,
            action: 'document_upload',
            targetType: 'EHRDocument',
            targetId: document._id,
        });

        res.status(201).json({
            message: 'EHR document uploaded successfully.',
            document: decryptDocument(document),
        });
    } catch (error) {
        cleanFiles(req.files || []);
        if (error.statusCode) {
            res.status(error.statusCode);
        }
        throw error;
    }
});

const updateEHRDocument = asyncHandler(async (req, res) => {
    const document = await EHRDocument.findById(req.params.id);
    if (!document || document.status === 'deleted') {
        res.status(404);
        throw new Error('EHR document not found');
    }

    const { doctor } = await assertEhrAccess(req, document.patientId);

    if (req.body.category && DOCUMENT_CATEGORIES.has(req.body.category)) {
        document.category = req.body.category;
    }
    if (typeof req.body.title === 'string') {
        document.title = encrypt(req.body.title.trim() || 'Medical record');
    }
    if (typeof req.body.description === 'string') {
        document.description = encrypt(req.body.description.trim());
    }
    if (req.body.recordDate) {
        const recordDate = parseDate(req.body.recordDate);
        if (recordDate) document.recordDate = recordDate;
    }
    if (req.body.status && ['active', 'archived', 'deleted'].includes(req.body.status)) {
        document.status = req.body.status;
    }
    document.lastClinicalUpdateAt = new Date();

    await document.save();

    await logEhrAccess(req, {
        patientId: document.patientId,
        doctorId: doctor?._id || document.doctorId,
        action: 'document_update',
        targetType: 'EHRDocument',
        targetId: document._id,
    });

    res.json({
        message: 'EHR document updated successfully.',
        document: decryptDocument(document),
    });
});

const downloadEHRDocumentFile = asyncHandler(async (req, res) => {
    const document = await EHRDocument.findById(req.params.id);
    if (!document || document.status === 'deleted') {
        res.status(404);
        throw new Error('EHR document not found');
    }

    const { doctor } = await assertEhrAccess(req, document.patientId);
    const file = document.files.id(req.params.fileId);
    if (!file) {
        res.status(404);
        throw new Error('EHR file not found');
    }

    const filePath = path.join(ehrPrivateDocumentsDir, file.storedName);
    if (!fs.existsSync(filePath)) {
        res.status(404);
        throw new Error('EHR file is missing from storage');
    }

    await logEhrAccess(req, {
        patientId: document.patientId,
        doctorId: doctor?._id || document.doctorId,
        action: 'document_download',
        targetType: 'EHRDocument',
        targetId: document._id,
    });

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${decrypt(file.originalName).replace(/"/g, '')}"`);
    res.sendFile(filePath);
});

const appendEncounterNote = asyncHandler(async (req, res) => {
    const note = String(req.body.note || '').trim();
    const reason = String(req.body.reason || '').trim();

    if (!note) {
        res.status(400);
        throw new Error('Note is required');
    }

    const encounter = await ClinicalEncounter.findById(req.params.id);
    if (!encounter) {
        res.status(404);
        throw new Error('Encounter not found');
    }

    const { doctor } = await assertEhrAccess(req, encounter.patientId);
    if (req.user.role === 'doctor' && !doctor) {
        res.status(404);
        throw new Error('Doctor profile not found');
    }

    encounter.noteAddenda.push({
        doctorId: doctor?._id || encounter.doctorId,
        note: encrypt(note),
        reason: encrypt(reason),
        addedAt: new Date(),
    });

    await encounter.save();

    await logEhrAccess(req, {
        patientId: encounter.patientId,
        doctorId: doctor?._id || encounter.doctorId,
        action: 'note_update',
        targetType: 'ClinicalEncounter',
        targetId: encounter._id,
    });

    res.json({
        message: 'Doctor note added successfully.',
        encounter: decryptEncounter(encounter),
    });
});

const listMedications = asyncHandler(async (req, res) => {
    const patientId = await resolvePatientIdForRequest(req, req.query.patientId);
    const { patient, doctor } = await assertEhrAccess(req, patientId);
    await backfillLegacyMedications(patient);

    const query = { patientId: patient._id };
    if (req.query.status && MEDICATION_STATUSES.has(req.query.status)) {
        query.status = req.query.status;
    }
    if (req.query.source && MEDICATION_SOURCES.has(req.query.source)) {
        query.source = req.query.source;
    }

    const medications = await PatientMedication.find(query)
        .populate({ path: 'doctorId', select: 'fullName specialization' })
        .sort({ status: 1, updatedAt: -1 })
        .lean();

    await logEhrAccess(req, {
        patientId: patient._id,
        doctorId: doctor?._id,
        action: 'summary_view',
        targetType: 'PatientMedication',
        targetId: patient._id,
    });

    res.json({ medications });
});

const createMedication = asyncHandler(async (req, res) => {
    const patientId = await resolvePatientIdForRequest(req, req.body.patientId);
    const { patient, doctor } = await assertEhrAccess(req, patientId);
    const name = String(req.body.name || '').trim();

    if (!name) {
        res.status(400);
        throw new Error('Medication name is required');
    }

    const source = MEDICATION_SOURCES.has(req.body.source)
        ? req.body.source
        : req.user.role === 'doctor'
            ? 'doctor_prescribed'
            : 'patient_reported';

    const medication = await PatientMedication.create({
        patientId: patient._id,
        doctorId: doctor?._id || (isValidObjectId(req.body.doctorId) ? req.body.doctorId : undefined),
        encounterId: isValidObjectId(req.body.encounterId) ? req.body.encounterId : undefined,
        prescriptionId: isValidObjectId(req.body.prescriptionId) ? req.body.prescriptionId : undefined,
        name,
        dosage: String(req.body.dosage || '').trim(),
        frequency: String(req.body.frequency || '').trim(),
        route: String(req.body.route || '').trim(),
        startDate: parseDate(req.body.startDate) || undefined,
        endDate: parseDate(req.body.endDate) || undefined,
        status: MEDICATION_STATUSES.has(req.body.status) ? req.body.status : 'active',
        source,
        notes: String(req.body.notes || '').trim(),
        lastClinicalUpdateAt: new Date(),
    });

    await syncPatientCurrentMedicationStrings(patient._id);

    await logEhrAccess(req, {
        patientId: patient._id,
        doctorId: doctor?._id || medication.doctorId,
        action: 'medication_create',
        targetType: 'PatientMedication',
        targetId: medication._id,
    });

    res.status(201).json({ medication });
});

const updateMedication = asyncHandler(async (req, res) => {
    const medication = await PatientMedication.findById(req.params.id);
    if (!medication) {
        res.status(404);
        throw new Error('Medication not found');
    }

    const { doctor } = await assertEhrAccess(req, medication.patientId);
    const editableFields = ['name', 'dosage', 'frequency', 'route', 'notes'];
    editableFields.forEach((field) => {
        if (typeof req.body[field] === 'string') {
            medication[field] = req.body[field].trim();
        }
    });
    if (req.body.status && MEDICATION_STATUSES.has(req.body.status)) {
        medication.status = req.body.status;
    }
    if (req.body.source && MEDICATION_SOURCES.has(req.body.source)) {
        medication.source = req.body.source;
    }
    if ('startDate' in req.body) {
        medication.startDate = parseDate(req.body.startDate);
    }
    if ('endDate' in req.body) {
        medication.endDate = parseDate(req.body.endDate);
    }
    medication.lastClinicalUpdateAt = new Date();

    await medication.save();
    await syncPatientCurrentMedicationStrings(medication.patientId);

    await logEhrAccess(req, {
        patientId: medication.patientId,
        doctorId: doctor?._id || medication.doctorId,
        action: 'medication_update',
        targetType: 'PatientMedication',
        targetId: medication._id,
    });

    res.json({ medication });
});

module.exports = {
    appendEncounterNote,
    createEHRDocument,
    createEncounterWithPrescription,
    createMedication,
    dispensePrescription,
    downloadEHRDocumentFile,
    getEHRPatientList,
    getPatientSummary,
    getPatientTimeline,
    getPendingPrescriptions,
    listMedications,
    updateEHRDocument,
    updateMedication,
};
