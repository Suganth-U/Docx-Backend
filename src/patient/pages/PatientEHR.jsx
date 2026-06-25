import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { Activity, FileText, FileUp, Loader2, Pill, Upload, X } from "lucide-react";
import { Navigationbar } from "@/shared/components/layout/NavigationBar/Navigationbar";
import PatientMedicalTimeline from "@/shared/components/common/PatientMedicalTimeline";
import PatientMedicationManager from "@/shared/components/common/PatientMedicationManager";
import FieldError from "@/shared/components/common/FieldError";
import api from "@/shared/lib/api";
import { EHR_CATEGORIES, fetchEhrSummary, uploadEhrDocument } from "@/shared/lib/ehrApi";
import { useToast } from "@/shared/context/ToastContext";
import { clearFieldError, validateRequiredFields } from "@/shared/lib/formValidation";

const Page = styled.div`
  min-height: 100vh;
  background: #f8f9fb;
`;

const Shell = styled.main`
  max-width: var(--page-max-width);
  margin: 0 auto;
  padding: 34px var(--page-padding-x) 48px;
  display: grid;
  gap: 20px;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18px;

  h1 {
    margin: 0;
    color: #1f2937;
    font-size: 30px;
    font-weight: 800;
  }

  p {
    margin: 6px 0 0;
    color: #64748b;
  }
`;

const StatGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;

  .icon {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    display: grid;
    place-items: center;
    background: #f4f0f9;
    color: #683b93;
    flex: 0 0 auto;
  }

  strong {
    display: block;
    color: #1e293b;
    font-size: 22px;
  }

  span {
    color: #64748b;
    font-size: 12px;
    font-weight: 700;
  }
`;

const InfoBand = styled.section`
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;

  div {
    display: grid;
    gap: 4px;
    background: #f8fafc;
    border: 1px solid #eef2f7;
    border-radius: 8px;
    padding: 12px;
  }

  span {
    color: #64748b;
    font-size: 11px;
    text-transform: uppercase;
    font-weight: 800;
    letter-spacing: 0.4px;
  }

  strong {
    color: #1f2937;
    font-size: 13px;
    line-height: 1.5;
  }
`;

const UploadPanel = styled.form`
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 20px;
  display: grid;
  gap: 16px;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04);

  h2 {
    color: #1f2937;
    font-size: 18px;
    margin: 0;
  }

  p {
    margin: 4px 0 0;
    color: #64748b;
    font-size: 13px;
    line-height: 1.5;
  }
`;

const UploadHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;

  .icon {
    width: 42px;
    height: 42px;
    border-radius: 8px;
    background: #f4f0f9;
    color: #683b93;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
  }

  @media (max-width: 560px) {
    flex-direction: column-reverse;
  }
`;

const UploadGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(180px, 220px) minmax(160px, 200px);
  gap: 12px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.label`
  display: grid;
  gap: 6px;
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.4px;

  input,
  select,
  textarea {
    width: 100%;
    min-height: 38px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 8px 10px;
    color: #334155;
    font-size: 13px;
    outline: none;
  }

  textarea {
    min-height: 86px;
    resize: vertical;
  }
`;

const FileDrop = styled.label`
  border: 1px dashed ${(props) => (props.$error ? "#dc2626" : "#cbd5e1")};
  background: #f8fafc;
  border-radius: 8px;
  padding: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;

  &:hover {
    border-color: #683b93;
    background: #fbf8ff;
  }

  input {
    display: none;
  }

  .copy {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .file-icon {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    background: #fff;
    border: 1px solid #e2e8f0;
    color: #683b93;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
  }

  strong {
    display: block;
    color: #1f2937;
    font-size: 14px;
  }

  span {
    display: block;
    color: #64748b;
    font-size: 12px;
    margin-top: 2px;
  }

  .action {
    color: #683b93;
    font-weight: 800;
    font-size: 13px;
    white-space: nowrap;
  }

  @media (max-width: 560px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

const SelectedFiles = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const FilePill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: min(100%, 360px);
  padding: 7px 10px;
  border-radius: 8px;
  background: #eef2ff;
  color: #334155;
  font-size: 12px;
  font-weight: 700;

  strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  small {
    color: #64748b;
    font-weight: 700;
    white-space: nowrap;
  }
`;

const UploadActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  flex-wrap: wrap;
`;

const SubmitButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 40px;
  border: none;
  border-radius: 8px;
  background: #683b93;
  color: #fff;
  font-weight: 800;
  cursor: pointer;
  padding: 0 16px;
  min-width: 150px;

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`;

const ClearFilesButton = styled.button`
  border: none;
  background: transparent;
  color: #64748b;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  padding: 8px 0;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const TimelineSection = styled.section`
  min-width: 0;
`;

const formatFileSize = (size = 0) => {
  if (!size) return "0 KB";
  const units = ["B", "KB", "MB"];
  let value = size;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const PatientEHR = () => {
  const toast = useToast();
  const [patient, setPatient] = useState(null);
  const [summary, setSummary] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [fileInputKey, setFileInputKey] = useState(0);
  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    category: "old_record",
    recordDate: new Date().toISOString().slice(0, 10),
    files: [],
  });

  const patientId = patient?._id || "";
  const selectedFiles = useMemo(() => Array.from(uploadForm.files || []), [uploadForm.files]);

  const latestUpdate = useMemo(() => {
    if (!summary?.latestUpdate) return "No updates yet";
    return new Date(summary.latestUpdate).toLocaleString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [summary?.latestUpdate]);

  const loadPatientAndSummary = async () => {
    try {
      const { data: profile } = await api.get("/patient/profile");
      setPatient(profile);
      const ehrSummary = await fetchEhrSummary(profile._id);
      setSummary(ehrSummary);
    } catch (error) {
      console.error("Failed to load patient EHR", error);
      toast.error("Could not load your medical records.");
    }
  };

  useEffect(() => {
    loadPatientAndSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const setField = (field, value) => {
    setUploadForm((current) => ({ ...current, [field]: value }));
    clearFieldError(setFieldErrors, field);
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    const nextErrors = validateRequiredFields(uploadForm, {
      category: "Category",
      recordDate: "Record date",
    });
    if (!uploadForm.files.length) {
      nextErrors.files = "Choose at least one PDF or image.";
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      return;
    }

    const payload = new FormData();
    payload.append("title", uploadForm.title || "Medical record");
    payload.append("description", uploadForm.description || "");
    payload.append("category", uploadForm.category);
    payload.append("recordDate", uploadForm.recordDate);
    Array.from(uploadForm.files).forEach((file) => payload.append("files", file));

    try {
      setUploading(true);
      await uploadEhrDocument(payload);
      toast.success("Medical record uploaded.");
      setUploadForm({
        title: "",
        description: "",
        category: "old_record",
        recordDate: new Date().toISOString().slice(0, 10),
        files: [],
      });
      setFieldErrors({});
      setFileInputKey((current) => current + 1);
      setRefreshKey((current) => current + 1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not upload that record.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Page>
      <Navigationbar />
      <Shell>
        <Header>
          <div>
            <h1>My Health Records</h1>
            <p>Doctor notes, lab files, images, prescriptions, and current medicines in one timeline.</p>
          </div>
        </Header>

        <StatGrid>
          <StatCard><div className="icon"><Activity size={18} /></div><div><strong>{summary?.counts?.encounters || 0}</strong><span>Doctor notes</span></div></StatCard>
          <StatCard><div className="icon"><FileText size={18} /></div><div><strong>{summary?.counts?.documents || 0}</strong><span>Files</span></div></StatCard>
          <StatCard><div className="icon"><Pill size={18} /></div><div><strong>{summary?.counts?.activeMedications || 0}</strong><span>Active meds</span></div></StatCard>
          <StatCard><div className="icon"><FileText size={18} /></div><div><strong>{summary?.counts?.prescriptions || 0}</strong><span>Prescriptions</span></div></StatCard>
        </StatGrid>

        <InfoBand>
          <div><span>Patient</span><strong>{patient?.fullName || "Loading..."}</strong></div>
          <div><span>Blood group</span><strong>{patient?.bloodGroup || "Not recorded"}</strong></div>
          <div><span>Allergies</span><strong>{summary?.patient?.allergies?.join(", ") || "None recorded"}</strong></div>
          <div><span>Chronic conditions</span><strong>{summary?.patient?.chronicConditions?.join(", ") || "None recorded"}</strong></div>
          <div><span>Last update</span><strong>{latestUpdate}</strong></div>
        </InfoBand>

        {patientId ? <PatientMedicationManager patientId={patientId} canEdit /> : null}

        <UploadPanel onSubmit={handleUpload} noValidate>
          <UploadHeader>
            <div>
              <h2>Upload a record</h2>
              <p>Attach PDFs or images from older reports, scans, prescriptions, and discharge records.</p>
            </div>
            <div className="icon">
              <FileUp size={20} />
            </div>
          </UploadHeader>

          <UploadGrid>
            <Field>
              Title
              <input value={uploadForm.title} onChange={(event) => setField("title", event.target.value)} placeholder="Report, scan, discharge note" />
            </Field>
            <Field>
              Category
              <select
                value={uploadForm.category}
                onChange={(event) => setField("category", event.target.value)}
                aria-invalid={Boolean(fieldErrors.category)}
                aria-describedby={fieldErrors.category ? "ehr-category-error" : undefined}
              >
                {EHR_CATEGORIES.filter((category) => category.value !== "all" && category.value !== "medication").map((category) => (
                  <option key={category.value} value={category.value}>{category.label}</option>
                ))}
              </select>
              <FieldError id="ehr-category-error" message={fieldErrors.category} />
            </Field>
            <Field>
              Record date
              <input
                type="date"
                value={uploadForm.recordDate}
                onChange={(event) => setField("recordDate", event.target.value)}
                aria-invalid={Boolean(fieldErrors.recordDate)}
                aria-describedby={fieldErrors.recordDate ? "ehr-record-date-error" : undefined}
              />
              <FieldError id="ehr-record-date-error" message={fieldErrors.recordDate} />
            </Field>
          </UploadGrid>

          <Field>
            Description
            <textarea value={uploadForm.description} onChange={(event) => setField("description", event.target.value)} placeholder="Short note for doctors" />
          </Field>

          <FileDrop htmlFor="ehr-record-files" $error={Boolean(fieldErrors.files)}>
            <div className="copy">
              <div className="file-icon">
                <FileText size={18} />
              </div>
              <div>
                <strong>{selectedFiles.length ? `${selectedFiles.length} file${selectedFiles.length === 1 ? "" : "s"} selected` : "Choose medical files"}</strong>
                <span>PDF, JPG, PNG, or WEBP files</span>
              </div>
            </div>
            <span className="action">Browse files</span>
            <input
              key={fileInputKey}
              id="ehr-record-files"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              multiple
              onChange={(event) => setField("files", event.target.files || [])}
              aria-invalid={Boolean(fieldErrors.files)}
              aria-describedby={fieldErrors.files ? "ehr-files-error" : undefined}
            />
          </FileDrop>
          <FieldError id="ehr-files-error" message={fieldErrors.files} />

          {selectedFiles.length ? (
            <SelectedFiles>
              {selectedFiles.map((file) => (
                <FilePill key={`${file.name}-${file.lastModified}`}>
                  <FileText size={14} />
                  <strong>{file.name}</strong>
                  <small>{formatFileSize(file.size)}</small>
                </FilePill>
              ))}
            </SelectedFiles>
          ) : null}

          <UploadActions>
            <SubmitButton type="submit" disabled={uploading}>
              {uploading ? <Loader2 size={16} /> : <Upload size={16} />}
              {uploading ? "Uploading..." : "Upload record"}
            </SubmitButton>
            {selectedFiles.length ? (
              <ClearFilesButton
                type="button"
                disabled={uploading}
                onClick={() => {
                  setField("files", []);
                  setFileInputKey((current) => current + 1);
                }}
              >
                <X size={14} />
                Clear files
              </ClearFilesButton>
            ) : null}
          </UploadActions>
        </UploadPanel>

        <TimelineSection>
          {patientId ? (
            <PatientMedicalTimeline
              patientId={patientId}
              showFilters
              refreshKey={refreshKey}
              onLoaded={() => loadPatientAndSummary()}
            />
          ) : null}
        </TimelineSection>
      </Shell>
    </Page>
  );
};

export default PatientEHR;
