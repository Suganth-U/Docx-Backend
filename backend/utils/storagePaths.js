const fs = require('fs');
const path = require('path');

const uploadsRoot = path.join(__dirname, '..', 'uploads');
const signaturesDir = path.join(uploadsRoot, 'signatures');
const prescriptionsDir = path.join(uploadsRoot, 'prescriptions');
const doctorVerificationDocsDir = path.join(uploadsRoot, 'doctor-verification');
const privateUploadsRoot = path.join(__dirname, '..', 'private-uploads');
const ehrPrivateDocumentsDir = path.join(privateUploadsRoot, 'ehr-documents');
const prescriptionProofsDir = path.join(privateUploadsRoot, 'prescription-proofs');

const ensureDir = (dirPath) => {
    fs.mkdirSync(dirPath, { recursive: true });
    return dirPath;
};

const ensureUploadDirectories = () => {
    ensureDir(uploadsRoot);
    ensureDir(signaturesDir);
    ensureDir(prescriptionsDir);
    ensureDir(doctorVerificationDocsDir);
    ensureDir(privateUploadsRoot);
    ensureDir(ehrPrivateDocumentsDir);
    ensureDir(prescriptionProofsDir);
};

const normalizePublicPath = (absolutePath) =>
    String(absolutePath || '')
        .replace(uploadsRoot, '/uploads')
        .replace(/\\/g, '/');

const toAbsoluteUrl = (req, publicPath) => {
    if (!publicPath) return '';
    if (/^https?:\/\//i.test(publicPath)) return publicPath;
    const origin = `${req.protocol}://${req.get('host')}`;
    return `${origin}${publicPath}`;
};

module.exports = {
    uploadsRoot,
    signaturesDir,
    prescriptionsDir,
    doctorVerificationDocsDir,
    privateUploadsRoot,
    ehrPrivateDocumentsDir,
    prescriptionProofsDir,
    ensureUploadDirectories,
    normalizePublicPath,
    toAbsoluteUrl,
};
