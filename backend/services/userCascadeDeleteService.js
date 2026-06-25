const fs = require('fs/promises');
const path = require('path');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const AdminProfile = require('../models/AdminProfile');
const Appointment = require('../models/Appointment');
const OnlineConsultation = require('../models/OnlineConsultation');
const Prescription = require('../models/Prescription');
const PrescriptionRequest = require('../models/PrescriptionRequest');
const ClinicalEncounter = require('../models/ClinicalEncounter');
const EHRAccessLog = require('../models/EHRAccessLog');
const EHRDocument = require('../models/EHRDocument');
const EPrescription = require('../models/EPrescription');
const PatientMedication = require('../models/PatientMedication');
const Order = require('../models/Order');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const DoctorSchedule = require('../models/DoctorSchedule');
const DoctorAvailability = require('../models/DoctorAvailability');
const DoctorVirtualSchedule = require('../models/DoctorVirtualSchedule');
const EmailNotificationLog = require('../models/EmailNotificationLog');
const { ehrPrivateDocumentsDir, privateUploadsRoot, uploadsRoot } = require('../utils/storagePaths');

const compactIds = (...lists) => {
    const map = new Map();

    lists.flat().filter(Boolean).forEach((id) => {
        map.set(String(id), id);
    });

    return Array.from(map.values());
};

const idList = (docs = []) => docs.map((doc) => doc?._id).filter(Boolean);

const buildOrQuery = (...conditions) => {
    const filtered = conditions.filter(Boolean);
    return filtered.length ? { $or: filtered } : null;
};

const findIds = async (Model, query) => {
    if (!query) return [];
    const docs = await Model.find(query).select('_id').lean();
    return idList(docs);
};

const deleteManyAndCount = async (Model, query) => {
    if (!query) return 0;
    const result = await Model.deleteMany(query);
    return result.deletedCount || 0;
};

const resolveUploadPath = (filePath) => {
    if (!filePath || /^https?:\/\//i.test(filePath)) return '';

    const rawPath = String(filePath);
    let absolutePath = rawPath;
    let normalizedRoot = path.resolve(uploadsRoot);

    if (rawPath.startsWith('ehr-private:')) {
        absolutePath = path.join(ehrPrivateDocumentsDir, rawPath.replace(/^ehr-private:/, ''));
        normalizedRoot = path.resolve(privateUploadsRoot);
    } else if (rawPath.startsWith('/uploads/')) {
        absolutePath = path.join(uploadsRoot, rawPath.replace(/^\/uploads\//, ''));
    } else if (rawPath.startsWith('uploads/')) {
        absolutePath = path.join(path.dirname(uploadsRoot), rawPath);
    } else if (!path.isAbsolute(rawPath)) {
        absolutePath = path.join(uploadsRoot, rawPath);
    }

    const normalizedPath = path.resolve(absolutePath);

    return normalizedPath.startsWith(normalizedRoot) ? normalizedPath : '';
};

const deleteFilesBestEffort = async (filePaths = []) => {
    let deleted = 0;

    for (const filePath of compactIds(filePaths)) {
        const resolvedPath = resolveUploadPath(filePath);
        if (!resolvedPath) continue;

        try {
            await fs.unlink(resolvedPath);
            deleted += 1;
        } catch (error) {
            if (error?.code !== 'ENOENT') {
                console.warn(`Unable to delete uploaded file ${resolvedPath}: ${error.message}`);
            }
        }
    }

    return deleted;
};

const releaseAppointmentSlots = async (appointmentIds = []) => {
    if (!appointmentIds.length) return 0;

    const availabilityDocs = await DoctorAvailability.find({
        $or: [
            { 'slots.heldByAppointment': { $in: appointmentIds } },
            { 'slots.bookedAppointment': { $in: appointmentIds } },
        ],
    });

    let releasedSlots = 0;

    for (const availability of availabilityDocs) {
        let changed = false;

        availability.slots = (availability.slots || []).map((slot) => {
            const heldMatch = slot.heldByAppointment && appointmentIds.some((id) => String(id) === String(slot.heldByAppointment));
            const bookedMatch = slot.bookedAppointment && appointmentIds.some((id) => String(id) === String(slot.bookedAppointment));

            if (!heldMatch && !bookedMatch) return slot;

            changed = true;
            releasedSlots += 1;
            const slotObject = typeof slot.toObject === 'function' ? slot.toObject() : { ...slot };

            return {
                ...slotObject,
                status: 'available',
                isBooked: false,
                heldByAppointment: undefined,
                holdExpiresAt: undefined,
                bookedAppointment: undefined,
                bookedBy: undefined,
                bookedAt: undefined,
            };
        });

        if (changed) {
            await availability.save();
        }
    }

    return releasedSlots;
};

const cascadeDeleteUser = async (userId) => {
    const user = await User.findById(userId);
    if (!user) return null;

    const [patient, doctor, adminProfile] = await Promise.all([
        Patient.findOne({ user_id: user._id }),
        Doctor.findOne({ user: user._id }),
        AdminProfile.findOne({ user: user._id }),
    ]);

    const patientId = patient?._id || null;
    const doctorId = doctor?._id || null;
    const role = String(user.role || '').toLowerCase();
    const filePaths = [
        doctor?.medicalLicenseImagePath,
        doctor?.nicImagePath,
        doctor?.signatureImagePath,
    ];

    const appointmentQuery = buildOrQuery(
        patientId ? { patient_id: patientId } : null,
        doctorId ? { doctor_id: doctorId } : null
    );
    const appointmentIds = await findIds(Appointment, appointmentQuery);

    const consultationQuery = buildOrQuery(
        patientId ? { patient: patientId } : null,
        doctorId ? { doctor: doctorId } : null
    );
    const consultationIds = await findIds(OnlineConsultation, consultationQuery);

    const encounterQuery = buildOrQuery(
        patientId ? { patientId } : null,
        doctorId ? { doctorId } : null,
        appointmentIds.length ? { appointmentId: { $in: appointmentIds } } : null,
        consultationIds.length ? { onlineConsultationId: { $in: consultationIds } } : null
    );
    const encounterIds = await findIds(ClinicalEncounter, encounterQuery);

    let prescriptionQuery = buildOrQuery(
        patientId ? { patient_id: patientId } : null,
        doctorId ? { doctor_id: doctorId } : null,
        appointmentIds.length ? { appointment_id: { $in: appointmentIds } } : null
    );
    let prescriptionIds = await findIds(Prescription, prescriptionQuery);

    let prescriptionRequestQuery = buildOrQuery(
        patientId ? { patientId } : null,
        { userId: user._id },
        doctorId ? { issuedBy: doctorId } : null,
        prescriptionIds.length ? { issuedPrescriptionId: { $in: prescriptionIds } } : null
    );
    let prescriptionRequestIds = await findIds(PrescriptionRequest, prescriptionRequestQuery);

    if (prescriptionRequestIds.length) {
        const requestPrescriptionIds = await findIds(Prescription, {
            request_id: { $in: prescriptionRequestIds },
        });
        prescriptionIds = compactIds(prescriptionIds, requestPrescriptionIds);
    }

    if (prescriptionIds.length) {
        const linkedRequestIds = await findIds(PrescriptionRequest, {
            issuedPrescriptionId: { $in: prescriptionIds },
        });
        prescriptionRequestIds = compactIds(prescriptionRequestIds, linkedRequestIds);
    }

    prescriptionQuery = buildOrQuery(
        patientId ? { patient_id: patientId } : null,
        doctorId ? { doctor_id: doctorId } : null,
        appointmentIds.length ? { appointment_id: { $in: appointmentIds } } : null,
        prescriptionRequestIds.length ? { request_id: { $in: prescriptionRequestIds } } : null
    );
    prescriptionRequestQuery = buildOrQuery(
        patientId ? { patientId } : null,
        { userId: user._id },
        doctorId ? { issuedBy: doctorId } : null,
        prescriptionIds.length ? { issuedPrescriptionId: { $in: prescriptionIds } } : null
    );

    const prescriptionsWithFiles = prescriptionIds.length
        ? await Prescription.find({ _id: { $in: prescriptionIds } }).select('documentPath').lean()
        : [];
    prescriptionsWithFiles.forEach((prescription) => filePaths.push(prescription.documentPath));

    const ePrescriptionQuery = buildOrQuery(
        patientId ? { patientId } : null,
        doctorId ? { doctorId } : null,
        encounterIds.length ? { encounterId: { $in: encounterIds } } : null
    );
    const ehrDocumentQuery = buildOrQuery(
        patientId ? { patientId } : null,
        doctorId ? { doctorId } : null,
        encounterIds.length ? { encounterId: { $in: encounterIds } } : null,
        appointmentIds.length ? { appointmentId: { $in: appointmentIds } } : null,
        consultationIds.length ? { onlineConsultationId: { $in: consultationIds } } : null
    );
    const ehrDocumentsWithFiles = ehrDocumentQuery
        ? await EHRDocument.find(ehrDocumentQuery).select('files.storedName').lean()
        : [];
    ehrDocumentsWithFiles.forEach((document) => {
        (document.files || []).forEach((file) => filePaths.push(`ehr-private:${file.storedName}`));
    });
    const patientMedicationQuery = buildOrQuery(
        patientId ? { patientId } : null,
        doctorId ? { doctorId } : null,
        encounterIds.length ? { encounterId: { $in: encounterIds } } : null
    );
    const ehrAccessLogQuery = buildOrQuery(
        { userId: user._id },
        patientId ? { patientId } : null,
        doctorId ? { doctorId } : null
    );

    const conversationQuery = buildOrQuery(
        { participants: user._id },
        { patientUser: user._id },
        { doctorUser: user._id }
    );
    const conversationIds = await findIds(Conversation, conversationQuery);

    const messageQuery = buildOrQuery(
        { sender: user._id },
        { recipient: user._id },
        conversationIds.length ? { conversationId: { $in: conversationIds } } : null
    );

    const notificationQuery = { recipientUser: user._id };
    const orderQuery = buildOrQuery(
        { user: user._id },
        prescriptionRequestIds.length ? { 'orderItems.prescriptionRequest': { $in: prescriptionRequestIds } } : null,
        prescriptionIds.length ? { 'orderItems.prescription': { $in: prescriptionIds } } : null
    );
    const emailLogQuery = buildOrQuery(
        user.email ? { recipient: String(user.email).toLowerCase() } : null,
        appointmentIds.length ? { relatedEntity: { $in: appointmentIds } } : null,
        consultationIds.length ? { relatedEntity: { $in: consultationIds } } : null,
        prescriptionIds.length ? { relatedEntity: { $in: prescriptionIds } } : null,
        prescriptionRequestIds.length ? { relatedEntity: { $in: prescriptionRequestIds } } : null,
        encounterIds.length ? { relatedEntity: { $in: encounterIds } } : null
    );

    const deletedCounts = {
        releasedAppointmentSlots: role === 'doctor' ? 0 : await releaseAppointmentSlots(appointmentIds),
        ePrescriptions: await deleteManyAndCount(EPrescription, ePrescriptionQuery),
        ehrDocuments: await deleteManyAndCount(EHRDocument, ehrDocumentQuery),
        ehrAccessLogs: await deleteManyAndCount(EHRAccessLog, ehrAccessLogQuery),
        patientMedications: await deleteManyAndCount(PatientMedication, patientMedicationQuery),
        prescriptions: await deleteManyAndCount(Prescription, prescriptionQuery),
        prescriptionRequests: await deleteManyAndCount(PrescriptionRequest, prescriptionRequestQuery),
        clinicalEncounters: await deleteManyAndCount(ClinicalEncounter, encounterQuery),
        onlineConsultations: await deleteManyAndCount(OnlineConsultation, consultationQuery),
        appointments: await deleteManyAndCount(Appointment, appointmentQuery),
        messages: await deleteManyAndCount(Message, messageQuery),
        conversations: await deleteManyAndCount(Conversation, conversationQuery),
        notifications: await deleteManyAndCount(Notification, notificationQuery),
        orders: await deleteManyAndCount(Order, orderQuery),
        emailNotificationLogs: await deleteManyAndCount(EmailNotificationLog, emailLogQuery),
        doctorSchedules: doctorId ? await deleteManyAndCount(DoctorSchedule, { doctor: doctorId }) : 0,
        doctorAvailability: doctorId ? await deleteManyAndCount(DoctorAvailability, { doctor: doctorId }) : 0,
        doctorVirtualSchedules: doctorId ? await deleteManyAndCount(DoctorVirtualSchedule, { doctor: doctorId }) : 0,
        patientProfiles: patientId ? await deleteManyAndCount(Patient, { _id: patientId }) : 0,
        doctorProfiles: doctorId ? await deleteManyAndCount(Doctor, { _id: doctorId }) : 0,
        adminProfiles: adminProfile?._id ? await deleteManyAndCount(AdminProfile, { _id: adminProfile._id }) : 0,
        users: await deleteManyAndCount(User, { _id: user._id }),
        uploadedFiles: await deleteFilesBestEffort(filePaths),
    };

    return {
        user: {
            id: user._id,
            role: user.role,
            email: user.email,
        },
        patientId,
        doctorId,
        deletedCounts,
    };
};

module.exports = {
    cascadeDeleteUser,
    releaseAppointmentSlots,
};
