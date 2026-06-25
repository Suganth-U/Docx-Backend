const fs = require('fs');
const path = require('path');
const multer = require('multer');
const {
    doctorVerificationDocsDir,
    ehrPrivateDocumentsDir,
    prescriptionProofsDir,
    prescriptionsDir,
    signaturesDir,
    ensureUploadDirectories,
} = require('../utils/storagePaths');

ensureUploadDirectories();

const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024;
const MAX_EHR_FILE_SIZE = 10 * 1024 * 1024;
const allowedImageMimeTypes = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
]);
const allowedPrescriptionMimeTypes = new Set([
    ...allowedImageMimeTypes,
    'application/pdf',
]);
const allowedEhrDocumentMimeTypes = new Set([
    ...allowedPrescriptionMimeTypes,
]);

const signatureStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, signaturesDir);
    },
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname || '').toLowerCase() || '.png';
        const safeBase = String(req.user?._id || 'doctor').replace(/[^a-z0-9_-]/gi, '');
        cb(null, `${safeBase}-${Date.now()}${extension}`);
    },
});

const doctorVerificationStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, doctorVerificationDocsDir);
    },
    filename: (_req, file, cb) => {
        const extension = path.extname(file.originalname || '').toLowerCase() || '.png';
        const safeBase = String(file.fieldname || 'doctor-document').replace(/[^a-z0-9_-]/gi, '');
        cb(null, `${safeBase}-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
    },
});

const prescriptionStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, prescriptionsDir);
    },
    filename: (_req, file, cb) => {
        const extension = path.extname(file.originalname || '').toLowerCase() || '.pdf';
        cb(null, `patient-prescription-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
    },
});

const ehrDocumentStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, ehrPrivateDocumentsDir);
    },
    filename: (_req, file, cb) => {
        const extension = path.extname(file.originalname || '').toLowerCase() || '.bin';
        const safeBase = String(path.basename(file.originalname || 'ehr-file', extension))
            .replace(/[^a-z0-9_-]/gi, '-')
            .slice(0, 48) || 'ehr-file';
        cb(null, `${safeBase}-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
    },
});

const prescriptionIntakeProofStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, prescriptionProofsDir);
    },
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname || '').toLowerCase() || '.bin';
        const safeBase = String(req.user?._id || 'patient').replace(/[^a-z0-9_-]/gi, '');
        cb(null, `${safeBase}-rx-proof-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
    },
});

const getFieldLabel = (fieldName = '') => {
    switch (fieldName) {
        case 'medicalLicenseImage':
            return 'Medical license image';
        case 'nicImage':
            return 'NIC image';
        case 'signature':
            return 'Signature image';
        case 'prescription':
            return 'Prescription file';
        default:
            return 'Image';
    }
};

const cleanupUploadedFiles = (files = {}) => {
    Object.values(files)
        .flat()
        .forEach((file) => {
            if (file?.path && fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
        });
};

const imageFileFilter = (_req, file, cb) => {
    if (!file.mimetype || !allowedImageMimeTypes.has(file.mimetype.toLowerCase())) {
        return cb(new Error(`${getFieldLabel(file.fieldname)} must be a JPG, JPEG, PNG, or WEBP image`));
    }

    cb(null, true);
};

const prescriptionFileFilter = (_req, file, cb) => {
    if (!file.mimetype || !allowedPrescriptionMimeTypes.has(file.mimetype.toLowerCase())) {
        return cb(new Error('Prescription file must be a JPG, JPEG, PNG, WEBP, or PDF file'));
    }

    cb(null, true);
};

const ehrDocumentFileFilter = (_req, file, cb) => {
    if (!file.mimetype || !allowedEhrDocumentMimeTypes.has(file.mimetype.toLowerCase())) {
        return cb(new Error('EHR documents must be JPG, JPEG, PNG, WEBP, or PDF files'));
    }

    cb(null, true);
};

const uploadDoctorSignature = multer({
    storage: signatureStorage,
    fileFilter: imageFileFilter,
    limits: {
        fileSize: MAX_IMAGE_FILE_SIZE,
    },
});

const uploadDoctorVerificationDocuments = multer({
    storage: doctorVerificationStorage,
    fileFilter: imageFileFilter,
    limits: {
        fileSize: MAX_IMAGE_FILE_SIZE,
        files: 2,
    },
});

const uploadPrescriptionProofDocument = multer({
    storage: prescriptionStorage,
    fileFilter: prescriptionFileFilter,
    limits: {
        fileSize: MAX_IMAGE_FILE_SIZE,
        files: 1,
    },
});

const uploadEhrDocuments = multer({
    storage: ehrDocumentStorage,
    fileFilter: ehrDocumentFileFilter,
    limits: {
        fileSize: MAX_EHR_FILE_SIZE,
        files: 5,
    },
});

const uploadPrescriptionIntakeProof = multer({
    storage: prescriptionIntakeProofStorage,
    fileFilter: prescriptionFileFilter,
    limits: {
        fileSize: MAX_EHR_FILE_SIZE,
        files: 1,
    },
});

const parseEhrDocumentUpload = (req, res, next) => {
    return uploadEhrDocuments.array('files', 5)(req, res, (error) => {
        if (!error) {
            return next();
        }

        (req.files || []).forEach((file) => {
            if (file?.path && fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
        });

        if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
            res.status(400);
            return next(new Error('Each EHR file must be 10 MB or smaller'));
        }

        if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_COUNT') {
            res.status(400);
            return next(new Error('You can upload up to 5 EHR files at a time'));
        }

        if (error instanceof multer.MulterError && error.code === 'LIMIT_UNEXPECTED_FILE') {
            res.status(400);
            return next(new Error(`Unexpected upload field: ${error.field}`));
        }

        res.status(400);
        return next(error);
    });
};

const parsePrescriptionProofUpload = (req, res, next) => {
    return uploadPrescriptionProofDocument.single('prescription')(req, res, (error) => {
        if (!error) {
            return next();
        }

        if (req.file?.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
            res.status(400);
            return next(new Error('Prescription file must be 5 MB or smaller'));
        }

        if (error instanceof multer.MulterError && error.code === 'LIMIT_UNEXPECTED_FILE') {
            res.status(400);
            return next(new Error(`Unexpected upload field: ${error.field}`));
        }

        res.status(400);
        return next(error);
    });
};

const parsePrescriptionRequestUpload = (req, res, next) => {
    return uploadPrescriptionIntakeProof.single('proofFile')(req, res, (error) => {
        if (!error) {
            return next();
        }

        if (req.file?.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
            res.status(400);
            return next(new Error('Prescription proof must be 10 MB or smaller'));
        }

        if (error instanceof multer.MulterError && error.code === 'LIMIT_UNEXPECTED_FILE') {
            res.status(400);
            return next(new Error(`Unexpected upload field: ${error.field}`));
        }

        res.status(400);
        return next(error);
    });
};

const parseDoctorRegistrationDocuments = (req, res, next) => {
    if (!req.is('multipart/form-data')) {
        return next();
    }

    const existingUploads = new Set(
        fs.existsSync(doctorVerificationDocsDir)
            ? fs.readdirSync(doctorVerificationDocsDir)
            : []
    );

    return uploadDoctorVerificationDocuments.fields([
        { name: 'medicalLicenseImage', maxCount: 1 },
        { name: 'nicImage', maxCount: 1 },
    ])(req, res, (error) => {
        if (!error) {
            return next();
        }

        cleanupUploadedFiles(req.files);
        if (fs.existsSync(doctorVerificationDocsDir)) {
            for (const entry of fs.readdirSync(doctorVerificationDocsDir)) {
                if (!existingUploads.has(entry)) {
                    const entryPath = path.join(doctorVerificationDocsDir, entry);
                    if (fs.statSync(entryPath).isFile()) {
                        fs.unlinkSync(entryPath);
                    }
                }
            }
        }

        if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
            res.status(400);
            return next(new Error(`${getFieldLabel(error.field)} must be 5 MB or smaller`));
        }

        if (error instanceof multer.MulterError && error.code === 'LIMIT_UNEXPECTED_FILE') {
            res.status(400);
            return next(new Error(`Unexpected upload field: ${error.field}`));
        }

        res.status(400);
        return next(error);
    });
};

module.exports = {
    parseEhrDocumentUpload,
    parseDoctorRegistrationDocuments,
    parsePrescriptionProofUpload,
    parsePrescriptionRequestUpload,
    uploadEhrDocuments,
    uploadDoctorSignature,
    uploadDoctorVerificationDocuments,
    uploadPrescriptionProofDocument,
    uploadPrescriptionIntakeProof,
};
