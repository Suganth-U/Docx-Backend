const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { prescriptionsDir, ensureUploadDirectories, normalizePublicPath } = require('./storagePaths');

const execFileAsync = promisify(execFile);

const CHROME_BINARIES = [
    process.env.CHROME_BIN,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
].filter(Boolean);

const escapeHtml = (value = '') =>
    String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const buildDataUri = (filePath) => {
    if (!filePath || !fs.existsSync(filePath)) return '';
    const extension = path.extname(filePath).toLowerCase();
    const mimeType = extension === '.png'
        ? 'image/png'
        : extension === '.webp'
            ? 'image/webp'
            : 'image/jpeg';

    const buffer = fs.readFileSync(filePath);
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
};

const findChromeBinary = () => CHROME_BINARIES.find((candidate) => candidate && fs.existsSync(candidate));

const renderPrescriptionHtml = ({
    prescriptionNumber,
    issueDateLabel,
    patientName,
    patientGender,
    patientAge,
    specialist,
    diagnosis,
    medicines,
    notes,
    doctorName,
    doctorSpecialty,
    hospitalName,
    signatureDataUri,
}) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>DocX Prescription</title>
  <style>
    @page { size: A4; margin: 22mm 16mm 22mm 16mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; margin: 0; }
    .sheet { border: 1px solid #e2e8f0; border-radius: 18px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #683B93, #7a4ca8); color: white; padding: 22px 26px; }
    .brand { font-size: 30px; font-weight: 700; margin-bottom: 6px; }
    .sub { font-size: 13px; opacity: 0.92; }
    .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 20px 26px 0; }
    .meta-card { background: #f8f5fc; border: 1px solid #eadff6; border-radius: 12px; padding: 12px 14px; }
    .meta-label { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: #7c3aed; font-weight: 700; margin-bottom: 6px; }
    .meta-value { font-size: 14px; font-weight: 600; color: #1f2937; }
    .content { padding: 22px 26px 26px; }
    .section { margin-bottom: 22px; }
    .section-title { font-size: 14px; font-weight: 700; color: #683B93; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px; }
    .text-block { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 14px 16px; font-size: 14px; line-height: 1.65; }
    table { width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden; }
    thead th { background: #f8f5fc; color: #4c1d95; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; padding: 12px; text-align: left; }
    tbody td { padding: 12px; border-top: 1px solid #e5e7eb; font-size: 13px; vertical-align: top; }
    .footer { display: grid; grid-template-columns: 1.2fr 1fr; gap: 18px; align-items: end; margin-top: 26px; }
    .signature-box { border: 1px solid #e5e7eb; border-radius: 14px; padding: 16px; min-height: 150px; }
    .signature-box img { max-height: 72px; max-width: 220px; object-fit: contain; display: block; margin-bottom: 10px; }
    .muted { color: #64748b; font-size: 12px; line-height: 1.6; }
    .doctor-name { font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 4px; }
    .chip { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #efe7f9; color: #5b2d88; font-size: 12px; font-weight: 700; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div class="brand">DocX Digital Prescription</div>
      <div class="sub">Specialist-reviewed prescription for secure in-portal delivery and pharmacy reference.</div>
    </div>

    <div class="meta">
      <div class="meta-card">
        <div class="meta-label">Prescription No</div>
        <div class="meta-value">${escapeHtml(prescriptionNumber)}</div>
      </div>
      <div class="meta-card">
        <div class="meta-label">Issue Date</div>
        <div class="meta-value">${escapeHtml(issueDateLabel)}</div>
      </div>
      <div class="meta-card">
        <div class="meta-label">Patient</div>
        <div class="meta-value">${escapeHtml(patientName)}</div>
      </div>
      <div class="meta-card">
        <div class="meta-label">Specialty</div>
        <div class="meta-value">${escapeHtml(specialist)}</div>
      </div>
    </div>

    <div class="content">
      <div class="section">
        <div class="section-title">Patient snapshot</div>
        <div class="text-block">
          ${escapeHtml(patientName)}
          ${patientGender ? ` • ${escapeHtml(patientGender)}` : ''}
          ${patientAge ? ` • ${escapeHtml(String(patientAge))} years` : ''}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Diagnosis / indication</div>
        <div class="text-block">${escapeHtml(diagnosis)}</div>
      </div>

      <div class="section">
        <div class="section-title">Medicines</div>
        <table>
          <thead>
            <tr>
              <th>Medicine</th>
              <th>Dosage</th>
              <th>Frequency</th>
              <th>Duration</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            ${medicines.map((medicine) => `
              <tr>
                <td>${escapeHtml(medicine.name)}</td>
                <td>${escapeHtml(medicine.dosage)}</td>
                <td>${escapeHtml(medicine.frequency)}</td>
                <td>${escapeHtml(medicine.duration || '-')}</td>
                <td>${escapeHtml(medicine.quantity || '-')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Doctor notes</div>
        <div class="text-block">${escapeHtml(notes || 'No additional notes were added.')}</div>
      </div>

      <div class="footer">
        <div class="text-block">
          <div style="font-weight:700; margin-bottom:8px;">Dispensing guidance</div>
          <div class="muted">
            Verify patient identity before dispensing. Keep this prescription available in the patient portal for future reference and refill review.
          </div>
        </div>
        <div class="signature-box">
          ${signatureDataUri ? `<img src="${signatureDataUri}" alt="Doctor signature" />` : ''}
          <div class="doctor-name">Dr. ${escapeHtml(doctorName)}</div>
          <div class="chip">${escapeHtml(doctorSpecialty)}</div>
          <div class="muted" style="margin-top:10px;">
            ${escapeHtml(hospitalName || 'DocX Specialist Network')}<br/>
            Signed digitally on ${escapeHtml(issueDateLabel)}
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`;

const generatePrescriptionDocument = async ({
    prescriptionId,
    patientName,
    patientGender,
    patientAge,
    specialist,
    diagnosis,
    medicines,
    notes,
    doctorName,
    doctorSpecialty,
    hospitalName,
    signatureImagePath,
}) => {
    ensureUploadDirectories();

    const chromeBinary = findChromeBinary();
    if (!chromeBinary) {
        throw new Error('Google Chrome is required to generate prescription PDFs on this server');
    }

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docx-prescription-'));
    const htmlPath = path.join(tempDir, `${prescriptionId}.html`);
    const pdfPath = path.join(prescriptionsDir, `${prescriptionId}.pdf`);
    const issueDateLabel = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const html = renderPrescriptionHtml({
        prescriptionNumber: String(prescriptionId).slice(-10).toUpperCase(),
        issueDateLabel,
        patientName,
        patientGender,
        patientAge,
        specialist,
        diagnosis,
        medicines,
        notes,
        doctorName,
        doctorSpecialty,
        hospitalName,
        signatureDataUri: buildDataUri(signatureImagePath),
    });

    fs.writeFileSync(htmlPath, html, 'utf8');

    try {
        await execFileAsync(chromeBinary, [
            '--headless=new',
            '--disable-gpu',
            '--allow-file-access-from-files',
            `--print-to-pdf=${pdfPath}`,
            `file://${htmlPath}`,
        ]);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }

    return {
        documentPath: pdfPath,
        documentUrl: normalizePublicPath(pdfPath),
    };
};

module.exports = {
    generatePrescriptionDocument,
};
