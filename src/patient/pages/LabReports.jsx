import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { FileUp, Image, Loader2, Upload } from "lucide-react";
import { Navigationbar } from "@/shared/components/layout/NavigationBar/Navigationbar";
import PatientMedicalTimeline from "@/shared/components/common/PatientMedicalTimeline";
import FieldError from "@/shared/components/common/FieldError";
import api from "@/shared/lib/api";
import { EHR_CATEGORIES, uploadEhrDocument } from "@/shared/lib/ehrApi";
import { useToast } from "@/shared/context/ToastContext";
import { clearFieldError, validateRequiredFields } from "@/shared/lib/formValidation";

const PageContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  background-color: #f8f9fa;
  padding-bottom: 50px;
`;

const ContentWrapper = styled.div`
  max-width: var(--page-max-width);
  margin: 0 auto;
  padding: 40px var(--page-padding-x) 20px;
`;

const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 24px;

  h1 {
    font-size: 30px;
    color: #1f2937;
    font-family: "Inter", sans-serif;
    font-weight: 800;
    margin: 0;
  }

  p {
    color: #64748b;
    margin-top: 6px;
  }
`;

const UploadPanel = styled.form`
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 18px;
  display: grid;
  gap: 14px;
  margin-bottom: 22px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
`;

const UploadGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(180px, 1fr) 180px 180px;
  gap: 12px;

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.label`
  display: grid;
  gap: 6px;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: #64748b;

  input,
  select,
  textarea {
    width: 100%;
    min-height: 40px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 9px 10px;
    font-size: 14px;
    color: #334155;
    outline: none;
  }

  textarea {
    min-height: 78px;
    resize: vertical;
  }
`;

const FileDrop = styled.label`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px dashed ${(props) => (props.$error ? "#dc2626" : "#cbd5e1")};
  border-radius: 8px;
  padding: 14px;
  color: #475569;
  cursor: pointer;

  input {
    display: none;
  }

  strong {
    color: #1f2937;
  }
`;

const SubmitButton = styled.button`
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #683b93;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`;

const LabReports = () => {
  const toast = useToast();
  const [patientId, setPatientId] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "lab_report",
    recordDate: new Date().toISOString().slice(0, 10),
    files: [],
  });

  useEffect(() => {
    const loadPatient = async () => {
      try {
        const { data } = await api.get("/patient/profile");
        setPatientId(data._id);
      } catch (error) {
        console.error("Failed to load patient profile", error);
      }
    };

    loadPatient();
  }, []);

  const fileLabel = form.files.length
    ? Array.from(form.files).map((file) => file.name).join(", ")
    : "Choose PDF or image files";

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    clearFieldError(setFieldErrors, field);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateRequiredFields(form, {
      category: "Category",
      recordDate: "Record date",
    });
    if (!form.files.length) {
      nextErrors.files = "Please choose at least one file.";
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      return;
    }

    const payload = new FormData();
    payload.append("title", form.title || "Medical record");
    payload.append("description", form.description || "");
    payload.append("category", form.category);
    payload.append("recordDate", form.recordDate);
    Array.from(form.files).forEach((file) => payload.append("files", file));

    try {
      setUploading(true);
      await uploadEhrDocument(payload);
      toast.success("Medical record uploaded.");
      setForm({
        title: "",
        description: "",
        category: "lab_report",
        recordDate: new Date().toISOString().slice(0, 10),
        files: [],
      });
      setFieldErrors({});
      setRefreshKey((current) => current + 1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not upload that record.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <PageContainer>
      <Navigationbar />
      <ContentWrapper>
        <HeaderSection>
          <div>
            <h1>Medical Files</h1>
            <p>Upload lab reports, scans, PDFs, and older paper records.</p>
          </div>
          <Image color="#683B93" />
        </HeaderSection>

        <UploadPanel onSubmit={handleSubmit} noValidate>
          <UploadGrid>
            <Field>
              Title
              <input
                value={form.title}
                onChange={(event) => setField("title", event.target.value)}
                placeholder="CBC report, X-ray chest, old prescription"
              />
            </Field>
            <Field>
              Category
              <select
                value={form.category}
                onChange={(event) => setField("category", event.target.value)}
                aria-invalid={Boolean(fieldErrors.category)}
                aria-describedby={fieldErrors.category ? "lab-category-error" : undefined}
              >
                {EHR_CATEGORIES.filter((category) => category.value !== "all" && category.value !== "medication").map((category) => (
                  <option key={category.value} value={category.value}>{category.label}</option>
                ))}
              </select>
              <FieldError id="lab-category-error" message={fieldErrors.category} />
            </Field>
            <Field>
              Record date
              <input
                type="date"
                value={form.recordDate}
                onChange={(event) => setField("recordDate", event.target.value)}
                aria-invalid={Boolean(fieldErrors.recordDate)}
                aria-describedby={fieldErrors.recordDate ? "lab-record-date-error" : undefined}
              />
              <FieldError id="lab-record-date-error" message={fieldErrors.recordDate} />
            </Field>
          </UploadGrid>
          <Field>
            Description
            <textarea
              value={form.description}
              onChange={(event) => setField("description", event.target.value)}
              placeholder="Short note about this record"
            />
          </Field>
          <FileDrop $error={Boolean(fieldErrors.files)}>
            <span><strong><FileUp size={16} /> Files</strong> {fileLabel}</span>
            <Upload size={18} />
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              multiple
              onChange={(event) => setField("files", event.target.files || [])}
              aria-invalid={Boolean(fieldErrors.files)}
              aria-describedby={fieldErrors.files ? "lab-files-error" : undefined}
            />
          </FileDrop>
          <FieldError id="lab-files-error" message={fieldErrors.files} />
          <SubmitButton type="submit" disabled={uploading}>
            {uploading ? <Loader2 size={16} /> : <Upload size={16} />}
            {uploading ? "Uploading..." : "Upload record"}
          </SubmitButton>
        </UploadPanel>

        {patientId ? (
          <PatientMedicalTimeline
            patientId={patientId}
            showFilters
            refreshKey={refreshKey}
            filters={{ sortBy: "lastUpdatedAt" }}
          />
        ) : null}
      </ContentWrapper>
    </PageContainer>
  );
};

export default LabReports;
