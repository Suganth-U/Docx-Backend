import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaCloudUploadAlt,
  FaDownload,
  FaExclamationTriangle,
  FaFilePrescription,
  FaNotesMedical,
  FaShieldAlt,
  FaShoppingBag,
  FaUserMd,
} from "react-icons/fa";
import api from "@/shared/lib/api";
import { useToast } from "@/shared/context/ToastContext";
import { fetchMedicineById } from "@/shared/features/Epharmacy/pharmacyClient";
import { addToCart } from "@/shared/lib/storage";
import FieldError from "@/shared/components/common/FieldError";
import { clearFieldError } from "@/shared/lib/formValidation";
import { specialtyCatalog } from "@/shared/data/specialties";

const MAX_PROOF_SIZE = 10 * 1024 * 1024;

const Page = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
  font-family: "DM Sans", sans-serif;
`;

const HeaderBlock = styled.header`
  background: #383053;
  color: white;
  padding: 40px 24px;
`;

const HeaderContent = styled.div`
  max-width: 1120px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
`;

const BackLink = styled(Link)`
  color: white;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  margin-bottom: 36px;
`;

const HeroText = styled.div`
  h1 {
    margin: 0 0 14px;
    font-family: "Philosopher", sans-serif;
    font-size: clamp(34px, 4vw, 48px);
    line-height: 1.05;
  }

  p {
    margin: 0;
    max-width: 540px;
    color: #d3ecec;
    line-height: 1.7;
    font-size: 15px;
  }
`;


const SafetyStack = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const SafetyCard = styled.div`
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 16px;

  strong {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 7px;
    color: #ffffff;
  }

  p {
    margin: 0;
    color: #d7e5e6;
    font-size: 13px;
    line-height: 1.6;
  }
`;

const Main = styled.main`
  padding: 36px;
  max-width: 1120px;
  width: 100%;
  margin: 0 auto;

  @media (max-width: 760px) {
    padding: 20px 14px 34px;
  }
`;

const Card = styled.section`
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.05);
  margin-bottom: 22px;
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;

  h2,
  h3 {
    margin: 0 0 7px;
    color: #0f172a;
  }

  p {
    margin: 0;
    color: #64748b;
    line-height: 1.6;
    font-size: 14px;
  }
`;

const StepRow = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 20px;

  @media (max-width: 700px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const StepPill = styled.div`
  border: 1px solid ${({ $active }) => ($active ? "#6b5ca5" : "#e2e8f0")};
  background: ${({ $active }) => ($active ? "#f4f2fa" : "#f8fafc")};
  color: ${({ $active }) => ($active ? "#6b5ca5" : "#64748b")};
  border-radius: 8px;
  padding: 10px;
  font-size: 12px;
  font-weight: 800;
  text-align: center;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 7px;
  color: #334155;
  font-size: 13px;
  font-weight: 800;

  input,
  textarea,
  select {
    width: 100%;
    border: 1px solid #dbe3ee;
    border-radius: 8px;
    padding: 12px 13px;
    font: inherit;
    font-weight: 500;
    color: #0f172a;
    background: white;
    outline: none;

    &:focus {
      border-color: #6b5ca5;
      box-shadow: 0 0 0 4px rgba(107, 92, 165, 0.1);
    }
  }

  textarea {
    min-height: 112px;
    resize: vertical;
  }
`;

const MetaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const MetaItem = styled.div`
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  padding: 13px;

  span {
    display: block;
    color: #64748b;
    font-size: 11px;
    text-transform: uppercase;
    font-weight: 800;
    margin-bottom: 5px;
  }

  strong {
    display: block;
    color: #0f172a;
    font-size: 14px;
    overflow-wrap: anywhere;
  }
`;

const MedicinePanel = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 13px;
  border: 1px solid #bbf7d0;
  background: #f0fdf4;
  color: #14532d;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 18px;

  h3 {
    margin: 0 0 5px;
    font-size: 15px;
  }

  p {
    margin: 0;
    color: #166534;
    font-size: 14px;
    line-height: 1.6;
  }
`;

const TriageBox = styled.div`
  border: 1px solid ${({ $status }) =>
    $status === "ready_for_doctor" ? "#bbf7d0" : $status === "urgent_care" || $status === "blocked" ? "#fecaca" : "#fde68a"};
  background: ${({ $status }) =>
    $status === "ready_for_doctor" ? "#f0fdf4" : $status === "urgent_care" || $status === "blocked" ? "#fff1f2" : "#fffbeb"};
  border-radius: 8px;
  padding: 16px;
  margin: 18px 0;

  strong {
    display: flex;
    align-items: center;
    gap: 8px;
    color: ${({ $status }) =>
      $status === "ready_for_doctor" ? "#166534" : $status === "urgent_care" || $status === "blocked" ? "#be123c" : "#92400e"};
    margin-bottom: 8px;
  }

  p {
    margin: 0;
    color: #334155;
    line-height: 1.65;
    font-size: 14px;
  }
`;

const UploadBox = styled.label`
  display: block;
  border: 2px dashed #9ccdc6;
  background: #f8fffe;
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  cursor: pointer;

  input {
    display: none;
  }

  svg {
    color: #6b5ca5;
    font-size: 30px;
    margin-bottom: 10px;
  }

  strong {
    display: block;
    color: #0f172a;
    margin-bottom: 6px;
  }

  span {
    color: #64748b;
    font-size: 13px;
  }
`;

const CheckGroup = styled.label`
  display: flex;
  gap: 10px;
  align-items: flex-start;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  padding: 13px;
  border-radius: 8px;
  color: #334155;
  line-height: 1.5;
  font-size: 14px;

  input {
    margin-top: 3px;
  }
`;

const ActionRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 18px;
`;

const Button = styled.button`
  border: 1px solid ${({ $variant }) => ($variant === "ghost" ? "#cbd5e1" : "#6b5ca5")};
  background: ${({ $variant }) => ($variant === "ghost" ? "white" : "#6b5ca5")};
  color: ${({ $variant }) => ($variant === "ghost" ? "#6b5ca5" : "white")};
  border-radius: 8px;
  padding: 12px 16px;
  font-weight: 800;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const DetailBox = styled.div`
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 8px;
  padding: 14px;

  h4,
  h5 {
    margin: 0 0 8px;
    color: #475569;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  p,
  li {
    margin: 0;
    color: #334155;
    font-size: 14px;
    line-height: 1.6;
  }

  ul {
    margin: 0;
    padding-left: 18px;
  }
`;

const RequestList = styled.div`
  display: grid;
  gap: 14px;
`;

const RequestCard = styled.div`
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  background: #fff;
`;

const RequestHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 13px;

  h4 {
    margin: 0 0 5px;
    color: #0f172a;
  }

  p {
    margin: 0;
    color: #64748b;
    font-size: 13px;
  }
`;

const StatusPill = styled.span`
  border-radius: 999px;
  padding: 7px 10px;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
  background: ${({ $tone }) =>
    $tone === "issued" ? "#dcfce7" : $tone === "rejected" ? "#ffe4e6" : "#fef3c7"};
  color: ${({ $tone }) =>
    $tone === "issued" ? "#166534" : $tone === "rejected" ? "#be123c" : "#92400e"};
`;

const EmptyState = styled.div`
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  padding: 26px;
  text-align: center;
  color: #64748b;

  h3 {
    margin: 10px 0 6px;
    color: #0f172a;
  }
`;



const PHARMACY_SPECIALTY_BY_CATEGORY = {
  "cardiac care": "Cardiology",
  "respiratory care": "Pulmonology",
  "diabetic care": "General Physician",
  infection: "General Physician",
  "stomach care": "General Physician",
  others: "General Physician",
};

const initialClinicalIntake = {
  requestType: "refill",
  requestedMedicationName: "",
  conditionOrReason: "",
  symptomDuration: "",
  previousDiagnosis: "",
  previousPrescriber: "",
  currentMedications: "",
  allergies: "",
  chronicConditions: "",
  pregnancyStatus: "",
  additionalContext: "",
  questionAnswers: [],
  patientAttestation: {
    truthfulInfo: false,
    notEmergency: false,
    consentToDoctorReview: false,
  },
};

const inferSpecialtyFromCategory = (category = "") =>
  PHARMACY_SPECIALTY_BY_CATEGORY[String(category).toLowerCase().trim()] ||
  "General Physician";

const sanitizeReturnPath = (path = "") => {
  const value = String(path || "").trim();
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("://")) {
    return "/pharmacy";
  }
  return value;
};

const formatDate = (value) => {
  if (!value) return "Pending";
  return new Date(value).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getTone = (status) => {
  if (status === "Issued") return "issued";
  if (status === "Rejected") return "rejected";
  return "pending";
};

const getRequestedItems = (request = {}) =>
  Array.isArray(request.pharmacyIntent?.requestedItems)
    ? request.pharmacyIntent.requestedItems
    : [];

const getIssuedPrescriptionId = (request = {}) =>
  request.issuedPrescriptionId?._id || request.issuedPrescriptionId || "";

const RequestPrescription = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const linkedMedicineId = searchParams.get("medicineId") || "";
  const linkedQty = Math.max(1, Number.parseInt(searchParams.get("qty") || "1", 10) || 1);
  const returnPath = sanitizeReturnPath(searchParams.get("returnTo") || "/pharmacy");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkingIntake, setCheckingIntake] = useState(false);
  const [requests, setRequests] = useState([]);
  const [issuedPrescriptions, setIssuedPrescriptions] = useState([]);
  const [pharmacyMedicine, setPharmacyMedicine] = useState(null);
  const [specialist, setSpecialist] = useState("General Physician");
  const [clinicalIntake, setClinicalIntake] = useState(initialClinicalIntake);
  const [aiTriage, setAiTriage] = useState(null);
  const [dynamicAnswers, setDynamicAnswers] = useState({});
  const [proofFile, setProofFile] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [patientSummary, setPatientSummary] = useState({
    name: "",
    email: "",
    gender: "Not set",
    blood: "Unknown",
    allergies: [],
    chronicConditions: [],
    currentMedications: [],
  });

  const requestType = pharmacyMedicine ? "pharmacy_rx_item" : "refill";
  const isBlocked = ["blocked", "urgent_care"].includes(aiTriage?.status);
  const isReady = aiTriage?.status === "ready_for_doctor" && !isBlocked;
  const attestation = clinicalIntake.patientAttestation || {};
  const canSubmit =
    isReady &&
    proofFile &&
    attestation.truthfulInfo &&
    attestation.notEmergency &&
    attestation.consentToDoctorReview;

  const pharmacyIntent = useMemo(() => {
    if (!pharmacyMedicine) return null;
    return {
      source: "pharmacy_product",
      returnPath,
      requestedItems: [
        {
          medicine: pharmacyMedicine.medicineId || pharmacyMedicine._id,
          qty: linkedQty,
        },
      ],
    };
  }, [linkedQty, pharmacyMedicine, returnPath]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const medicinePromise = linkedMedicineId
        ? fetchMedicineById(linkedMedicineId).catch((error) => {
            console.error("Failed to load linked pharmacy medicine", error);
            toast.error("We could not load the requested pharmacy item.");
            return null;
          })
        : Promise.resolve(null);

      const [
        { data: userData },
        patientResponse,
        requestsResponse,
        prescriptionsResponse,
        linkedMedicine,
      ] = await Promise.all([
        api.get("/auth/me"),
        api.get("/patient/profile").catch(() => ({ data: {} })),
        api.get("/prescriptions/requests/my"),
        api.get("/prescriptions/my"),
        medicinePromise,
      ]);

      const patientData = patientResponse.data || {};
      const nextSummary = {
        name: patientData.fullName || userData.name || "",
        email: userData.email || "",
        gender: patientData.gender || "Not set",
        blood: patientData.bloodGroup || "Unknown",
        allergies: Array.isArray(patientData.allergies) ? patientData.allergies : [],
        chronicConditions: Array.isArray(patientData.chronicConditions) ? patientData.chronicConditions : [],
        currentMedications: Array.isArray(patientData.currentMedications) ? patientData.currentMedications : [],
      };

      setPatientSummary(nextSummary);
      setRequests(Array.isArray(requestsResponse.data) ? requestsResponse.data : []);
      setIssuedPrescriptions(Array.isArray(prescriptionsResponse.data) ? prescriptionsResponse.data : []);
      setPharmacyMedicine(linkedMedicine);
      setSpecialist(linkedMedicine ? inferSpecialtyFromCategory(linkedMedicine.category) : "General Physician");
      setClinicalIntake((prev) => ({
        ...prev,
        requestType: linkedMedicine ? "pharmacy_rx_item" : "refill",
        requestedMedicationName: linkedMedicine ? linkedMedicine.name : prev.requestedMedicationName,
        allergies: nextSummary.allergies.join(", "),
        chronicConditions: nextSummary.chronicConditions.join(", "),
        currentMedications: nextSummary.currentMedications.join(", "),
      }));
    } catch (error) {
      console.error("Failed to load prescription workspace", error);
      toast.error("We could not load your prescription workspace right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [linkedMedicineId]);

  const setField = (field, value) => {
    setClinicalIntake((prev) => ({
      ...prev,
      [field]: value,
      requestType,
    }));
    clearFieldError(setFieldErrors, field);
    setAiTriage(null);
  };

  const setAttestation = (field, value) => {
    setClinicalIntake((prev) => ({
      ...prev,
      patientAttestation: {
        ...prev.patientAttestation,
        [field]: value,
      },
    }));
    clearFieldError(setFieldErrors, field);
  };

  const buildQuestionAnswers = () => {
    const questions = Array.isArray(aiTriage?.questions) ? aiTriage.questions : [];
    const merged = new Map(
      (Array.isArray(clinicalIntake.questionAnswers) ? clinicalIntake.questionAnswers : [])
        .filter((item) => item?.id && item?.answer)
        .map((item) => [item.id, item])
    );

    questions.forEach((question) => {
      const answer = dynamicAnswers[question.id] || "";
      if (answer) {
        merged.set(question.id, {
          id: question.id,
          question: question.label,
          answer,
          answeredAt: new Date().toISOString(),
        });
      }
    });

    return Array.from(merged.values());
  };

  const runIntake = async () => {
    const nextErrors = {};
    if (!clinicalIntake.conditionOrReason.trim()) {
      nextErrors.conditionOrReason = "Add the medical reason before checking safety questions.";
    }
    if (!pharmacyMedicine && !clinicalIntake.requestedMedicationName.trim()) {
      nextErrors.requestedMedicationName = "Add the medicine name for a refill request.";
    }
    setFieldErrors((current) => ({ ...current, ...nextErrors }));
    if (Object.keys(nextErrors).length) {
      return;
    }

    setCheckingIntake(true);
    try {
      const payload = {
        specialist,
        clinicalIntake: {
          ...clinicalIntake,
          requestType,
          requestedMedicationName: pharmacyMedicine?.name || clinicalIntake.requestedMedicationName,
          questionAnswers: buildQuestionAnswers(),
        },
        ...(pharmacyIntent ? { pharmacyIntent } : {}),
      };
      const { data } = await api.post("/prescriptions/requests/intake", payload);
      setAiTriage(data.aiTriage);
      setClinicalIntake((prev) => ({
        ...prev,
        ...data.clinicalIntake,
        patientAttestation: prev.patientAttestation,
        questionAnswers: data.clinicalIntake?.questionAnswers || buildQuestionAnswers(),
      }));
    } catch (error) {
      console.error("Failed to run prescription intake", error);
      toast.error(error.response?.data?.message || "We could not complete the safety check.");
    } finally {
      setCheckingIntake(false);
    }
  };

  const handleProofChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PROOF_SIZE) {
      setFieldErrors((current) => ({
        ...current,
        proofFile: "Proof file must be 10 MB or smaller.",
      }));
      event.target.value = "";
      return;
    }
    setProofFile(file);
    clearFieldError(setFieldErrors, "proofFile");
  };

  const resetForm = () => {
    setClinicalIntake({
      ...initialClinicalIntake,
      requestType,
      requestedMedicationName: pharmacyMedicine?.name || "",
      allergies: patientSummary.allergies.join(", "),
      chronicConditions: patientSummary.chronicConditions.join(", "),
      currentMedications: patientSummary.currentMedications.join(", "),
    });
    setAiTriage(null);
    setDynamicAnswers({});
    setProofFile(null);
    setFieldErrors({});
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) {
      setFieldErrors((current) => ({
        ...current,
        proofFile: proofFile ? current.proofFile : "Upload prior prescription or medical proof.",
        truthfulInfo: attestation.truthfulInfo ? current.truthfulInfo : "Confirm the information and proof are accurate.",
        notEmergency: attestation.notEmergency ? current.notEmergency : "Confirm this is not an emergency.",
        consentToDoctorReview: attestation.consentToDoctorReview
          ? current.consentToDoctorReview
          : "Consent to doctor review is required.",
      }));
      return;
    }

    setSubmitting(true);
    try {
      const finalIntake = {
        ...clinicalIntake,
        requestType,
        requestedMedicationName: pharmacyMedicine?.name || clinicalIntake.requestedMedicationName,
        questionAnswers: buildQuestionAnswers(),
      };
      const payload = new FormData();
      payload.append("proofFile", proofFile);
      payload.append("specialist", specialist);
      payload.append("symptoms", finalIntake.conditionOrReason);
      payload.append("history", finalIntake.previousDiagnosis || "");
      payload.append("requestNotes", finalIntake.additionalContext || "");
      payload.append("clinicalIntake", JSON.stringify(finalIntake));
      payload.append("aiTriage", JSON.stringify(aiTriage));
      if (pharmacyIntent) {
        payload.append("pharmacyIntent", JSON.stringify(pharmacyIntent));
      }

      await api.post("/prescriptions/request", payload);
      toast.success("Request submitted for doctor review.");
      resetForm();
      await fetchData();
    } catch (error) {
      console.error("Failed to submit request", error);
      toast.error(error.response?.data?.message || "We could not submit the request.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinuePharmacyOrder = async (request) => {
    const prescriptionId = getIssuedPrescriptionId(request);
    const requestedItems = getRequestedItems(request);
    if (!prescriptionId || !requestedItems.length) {
      toast.error("This request is missing pharmacy order details.");
      return;
    }

    try {
      const medicines = await Promise.all(
        requestedItems.map(async (item) => {
          const medicineId = item.medicine?._id || item.medicine || "";
          const medicine = await fetchMedicineById(medicineId);
          return { medicine, qty: Math.max(1, Number(item.qty || 1)) };
        })
      );

      medicines.forEach(({ medicine, qty }) => {
        addToCart({ ...medicine, prescriptionRequestId: request._id, prescriptionId }, qty);
      });

      toast.success("Prescription item added to your pharmacy cart.");
      navigate(sanitizeReturnPath(request.pharmacyIntent?.returnPath || returnPath || "/cart"));
    } catch (error) {
      console.error("Failed to resume pharmacy order", error);
      toast.error("We could not add that prescription item to your cart.");
    }
  };

  const openPrescriptionDocument = async (prescriptionId, download = false) => {
    try {
      const response = await api.get(`/prescriptions/${prescriptionId}/document`, {
        params: download ? { download: 1 } : {},
        responseType: "blob",
      });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      if (download) {
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `docx-prescription-${prescriptionId.slice(-8).toUpperCase()}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        window.open(blobUrl, "_blank", "noopener,noreferrer");
      }
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 3000);
    } catch (error) {
      console.error("Failed to open prescription document", error);
      toast.error("We could not open that prescription document.");
    }
  };

  const renderQuestion = (question) => {
    const value = dynamicAnswers[question.id] || "";
    if (question.type === "select" || question.type === "yes_no") {
      const options = question.type === "yes_no" ? ["Yes", "No"] : question.options || [];
      return (
        <Field key={question.id}>
          {question.label}
          <select
            value={value}
            onChange={(event) => {
              setDynamicAnswers((prev) => ({ ...prev, [question.id]: event.target.value }));
              clearFieldError(setFieldErrors, question.id);
            }}
          >
            <option value="">Select an answer</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>
      );
    }

    return (
      <Field key={question.id}>
        {question.label}
        <textarea
          value={value}
          onChange={(event) => {
            setDynamicAnswers((prev) => ({ ...prev, [question.id]: event.target.value }));
            clearFieldError(setFieldErrors, question.id);
          }}
        />
      </Field>
    );
  };

  if (loading) {
    return (
      <Page>
        <HeaderBlock>
        <HeaderContent>
          <BackLink to="/pharmacy"><FaArrowLeft /> Back to Pharmacy</BackLink>
          <HeroText>
            <h1>Digital prescription review</h1>
            <p>Loading your patient details and prescription history.</p>
          </HeroText>
        </HeaderContent>
      </HeaderBlock>
        <Main>
          <Card>Loading prescription workspace...</Card>
        </Main>
      </Page>
    );
  }

  return (
    <Page>
      <HeaderBlock>
        <HeaderContent>
        <BackLink to="/pharmacy"><FaArrowLeft /> Back to Pharmacy</BackLink>
        <HeroText>
          <h1>{pharmacyMedicine ? "Request doctor review for this Rx item" : "Request a refill review"}</h1>
          <p>
            DocX collects safety context and proof first. Gemini only prepares intake questions;
            a verified doctor makes the final prescription decision.
          </p>
        </HeroText>
        
        <SafetyStack>
          <SafetyCard>
            <strong><FaShieldAlt /> Doctor-gated</strong>
            <p>No AI output becomes a prescription. A doctor must approve, reject, or redirect to consultation.</p>
          </SafetyCard>
          <SafetyCard>
            <strong><FaFilePrescription /> Proof required</strong>
            <p>Upload a previous prescription, clinic note, or record so the doctor can verify the refill need.</p>
          </SafetyCard>
          <SafetyCard>
            <strong><FaExclamationTriangle /> High-risk blocked</strong>
            <p>Restricted or urgent requests are redirected away from digital prescription review.</p>
          </SafetyCard>
        </SafetyStack>
      </HeaderContent>
      </HeaderBlock>

      <Main>
        <Card>
          <CardHeader>
            <div>
              <h2>Prescription request</h2>
              <p>Answer the intake, upload proof, and submit only after the safety check is ready for doctor review.</p>
            </div>
          </CardHeader>

          <StepRow>
            <StepPill $active>1. Details</StepPill>
            <StepPill $active={Boolean(aiTriage)}>2. Safety</StepPill>
            <StepPill $active={Boolean(proofFile)}>3. Proof</StepPill>
            <StepPill $active={canSubmit}>4. Submit</StepPill>
          </StepRow>

          <MetaGrid>
            <MetaItem><span>Patient</span><strong>{patientSummary.name}</strong></MetaItem>
            <MetaItem><span>Email</span><strong>{patientSummary.email}</strong></MetaItem>
            <MetaItem><span>Health snapshot</span><strong>{patientSummary.gender} · {patientSummary.blood}</strong></MetaItem>
          </MetaGrid>

          {pharmacyMedicine && (
            <MedicinePanel>
              <FaFilePrescription />
              <div>
                <h3>{pharmacyMedicine.name}</h3>
                <p>Quantity {linkedQty}. The doctor will see this pharmacy item with your intake answers.</p>
              </div>
            </MedicinePanel>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <Grid>
              {!pharmacyMedicine && (
                <Field>
                  Medicine requested for refill
                  <input
                    value={clinicalIntake.requestedMedicationName}
                    onChange={(event) => setField("requestedMedicationName", event.target.value)}
                    placeholder="Name from your previous prescription"
                    aria-invalid={Boolean(fieldErrors.requestedMedicationName)}
                  />
                  <FieldError message={fieldErrors.requestedMedicationName} />
                </Field>
              )}
              <Field>
                Doctor specialty
                <select value={specialist} onChange={(event) => setSpecialist(event.target.value)}>
                  {specialtyCatalog.map((option) => (
                    <option key={option.name} value={option.name}>{option.name}</option>
                  ))}
                </select>
              </Field>
              <Field>
                How long have you used this medicine or had this condition?
                <input
                  value={clinicalIntake.symptomDuration}
                  onChange={(event) => setField("symptomDuration", event.target.value)}
                  placeholder="Enter previous duration"
                />
              </Field>
              <Field>
                Pregnancy or breastfeeding status
                <select
                  value={clinicalIntake.pregnancyStatus}
                  onChange={(event) => setField("pregnancyStatus", event.target.value)}
                >
                  <option value="">Not applicable / prefer not to say</option>
                  <option value="Not pregnant or breastfeeding">Not pregnant or breastfeeding</option>
                  <option value="Pregnant">Pregnant</option>
                  <option value="Breastfeeding">Breastfeeding</option>
                  <option value="Planning pregnancy">Planning pregnancy</option>
                </select>
              </Field>
              <Field>
                Previous prescriber or clinic
                <input
                  value={clinicalIntake.previousPrescriber}
                  onChange={(event) => setField("previousPrescriber", event.target.value)}
                  placeholder="Doctor, clinic, or hospital name"
                />
              </Field>
            </Grid>

            <Field style={{ marginTop: 16 }}>
              Medical condition or reason
              <textarea
                value={clinicalIntake.conditionOrReason}
                onChange={(event) => setField("conditionOrReason", event.target.value)}
                placeholder="Tell the doctor why you need this medicine and whether anything has changed."
                aria-invalid={Boolean(fieldErrors.conditionOrReason)}
              />
              <FieldError message={fieldErrors.conditionOrReason} />
            </Field>

            <Grid style={{ marginTop: 16 }}>
              <Field>
                Prior diagnosis or last review
                <textarea
                  value={clinicalIntake.previousDiagnosis}
                  onChange={(event) => setField("previousDiagnosis", event.target.value)}
                  placeholder="Mention diagnosis, last review date, or why this is a refill."
                />
              </Field>
              <Field>
                Current medicines
                <textarea
                  value={clinicalIntake.currentMedications}
                  onChange={(event) => setField("currentMedications", event.target.value)}
                  placeholder="Include tablets, supplements, inhalers, injections, or treatments."
                />
              </Field>
              <Field>
                Allergies or previous reactions
                <textarea
                  value={clinicalIntake.allergies}
                  onChange={(event) => setField("allergies", event.target.value)}
                  placeholder="List medicine allergies, side effects, or write none."
                />
              </Field>
              <Field>
                Chronic conditions
                <textarea
                  value={clinicalIntake.chronicConditions}
                  onChange={(event) => setField("chronicConditions", event.target.value)}
                  placeholder="Diabetes, kidney disease, asthma, heart disease, etc."
                />
              </Field>
            </Grid>

            <Field style={{ marginTop: 16 }}>
              Extra context for the doctor
              <textarea
                value={clinicalIntake.additionalContext}
                onChange={(event) => setField("additionalContext", event.target.value)}
                placeholder="Anything else the doctor should know before deciding."
              />
            </Field>

            <ActionRow>
              <Button type="button" onClick={runIntake} disabled={checkingIntake}>
                <FaShieldAlt /> {checkingIntake ? "Checking..." : aiTriage ? "Update safety check" : "Check safety questions"}
              </Button>
            </ActionRow>

            {aiTriage && (
              <TriageBox $status={aiTriage.status}>
                <strong>
                  {isReady ? <FaCheckCircle /> : <FaExclamationTriangle />}
                  {isReady ? "Ready for doctor review" : isBlocked ? "Digital request blocked" : "More information needed"}
                </strong>
                <p>{aiTriage.patientMessage || "Answer the follow-up questions before submitting."}</p>
                {aiTriage.redFlags?.length > 0 && (
                  <p style={{ marginTop: 8 }}>Flags: {aiTriage.redFlags.join(", ")}</p>
                )}
              </TriageBox>
            )}

            {aiTriage?.questions?.length > 0 && !isBlocked && (
              <Grid style={{ marginTop: 16 }}>
                {aiTriage.questions.map(renderQuestion)}
              </Grid>
            )}

            <div style={{ marginTop: 20 }}>
              <UploadBox>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleProofChange}
                  aria-invalid={Boolean(fieldErrors.proofFile)}
                />
                <FaCloudUploadAlt />
                <strong>{proofFile ? proofFile.name : "Upload prior prescription or medical proof"}</strong>
                <span>PDF or image, up to 10 MB. This stays private for doctor review.</span>
              </UploadBox>
              <FieldError message={fieldErrors.proofFile} />
            </div>

            <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
              <CheckGroup>
                <input
                  type="checkbox"
                  checked={attestation.truthfulInfo}
                  onChange={(event) => setAttestation("truthfulInfo", event.target.checked)}
                />
                <span>I confirm the information and uploaded proof are accurate.</span>
              </CheckGroup>
              <FieldError message={fieldErrors.truthfulInfo} />
              <CheckGroup>
                <input
                  type="checkbox"
                  checked={attestation.notEmergency}
                  onChange={(event) => setAttestation("notEmergency", event.target.checked)}
                />
                <span>This is not an emergency or a severe worsening condition.</span>
              </CheckGroup>
              <FieldError message={fieldErrors.notEmergency} />
              <CheckGroup>
                <input
                  type="checkbox"
                  checked={attestation.consentToDoctorReview}
                  onChange={(event) => setAttestation("consentToDoctorReview", event.target.checked)}
                />
                <span>I consent for a verified doctor to review these details and reject or request consultation if needed.</span>
              </CheckGroup>
              <FieldError message={fieldErrors.consentToDoctorReview} />
            </div>

            <ActionRow>
              <Button type="submit" disabled={!canSubmit || submitting}>
                <FaNotesMedical /> {submitting ? "Submitting..." : "Submit for doctor review"}
              </Button>
              <Button type="button" $variant="ghost" onClick={resetForm} disabled={submitting}>
                Reset
              </Button>
            </ActionRow>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <h3>Request history</h3>
              <p>Every submitted request stays visible with doctor decision, safety status, and signed PDF when issued.</p>
            </div>
          </CardHeader>

          {requests.length === 0 ? (
            <EmptyState>
              <FaFilePrescription style={{ fontSize: 32, color: "#64748b" }} />
              <h3>No prescription requests yet</h3>
              <p>Submitted digital prescription reviews will appear here.</p>
            </EmptyState>
          ) : (
            <RequestList>
              {requests.map((request) => {
                const requestedItems = getRequestedItems(request);
                const issuedPrescriptionId = getIssuedPrescriptionId(request);
                return (
                  <RequestCard key={request._id}>
                    <RequestHead>
                      <div>
                        <h4>
                          {requestedItems.length
                            ? "Pharmacy prescription request"
                            : request.clinicalIntake?.requestedMedicationName || request.specialist}
                        </h4>
                        <p>Submitted {formatDate(request.createdAt)} · {request.specialist}</p>
                      </div>
                      <StatusPill $tone={getTone(request.status)}>{request.status}</StatusPill>
                    </RequestHead>

                    <Grid>
                      <DetailBox>
                        <h5>Reason</h5>
                        <p>{request.clinicalIntake?.conditionOrReason || request.symptoms}</p>
                      </DetailBox>
                      <DetailBox>
                        <h5>Safety status</h5>
                        <p>{request.aiTriage?.status?.replaceAll("_", " ") || "Not recorded"} · {request.aiTriage?.riskLevel || "routine"}</p>
                      </DetailBox>
                      {requestedItems.length > 0 && (
                        <DetailBox>
                          <h5>Requested medicine</h5>
                          <ul>
                            {requestedItems.map((item) => (
                              <li key={item._id || item.medicine?._id || item.medicineName}>
                                {item.medicineName || item.medicine?.name} · Qty {item.qty || 1}
                              </li>
                            ))}
                          </ul>
                        </DetailBox>
                      )}
                      <DetailBox>
                        <h5>Doctor response</h5>
                        <p>
                          {request.status === "Issued"
                            ? request.doctorNote || "Signed prescription issued."
                            : request.status === "Rejected"
                            ? request.rejectionReason || "This request was rejected."
                            : "Waiting for doctor review."}
                        </p>
                      </DetailBox>
                    </Grid>

                    {issuedPrescriptionId && (
                      <ActionRow>
                        <Button type="button" $variant="ghost" onClick={() => openPrescriptionDocument(issuedPrescriptionId, false)}>
                          <FaFilePrescription /> View signed PDF
                        </Button>
                        <Button type="button" $variant="ghost" onClick={() => openPrescriptionDocument(issuedPrescriptionId, true)}>
                          <FaDownload /> Download PDF
                        </Button>
                        {request.status === "Issued" && requestedItems.length > 0 && (
                          <Button type="button" $variant="ghost" onClick={() => handleContinuePharmacyOrder(request)}>
                            <FaShoppingBag /> Continue pharmacy order
                          </Button>
                        )}
                      </ActionRow>
                    )}
                  </RequestCard>
                );
              })}
            </RequestList>
          )}
        </Card>

        {issuedPrescriptions.length > 0 && (
          <Card>
            <CardHeader>
              <div>
                <h3>Recently issued prescriptions</h3>
                <p>Open your latest signed prescription documents.</p>
              </div>
            </CardHeader>
            <RequestList>
              {issuedPrescriptions.slice(0, 3).map((prescription) => (
                <RequestCard key={prescription._id}>
                  <RequestHead>
                    <div>
                      <h4>{prescription.diagnosis}</h4>
                      <p>
                        <FaUserMd style={{ marginRight: 6 }} />
                        Dr. {prescription.doctor_id?.fullName || prescription.doctor_id?.user?.name || "Doctor"}
                      </p>
                    </div>
                    <StatusPill $tone="issued">Issued</StatusPill>
                  </RequestHead>
                  <DetailBox>
                    <h5>Medicines</h5>
                    <p>
                      {Array.isArray(prescription.medicines) && prescription.medicines.length
                        ? prescription.medicines.map((item) => item.name).join(", ")
                        : "Prescription file available"}
                    </p>
                  </DetailBox>
                  <ActionRow>
                    <Button type="button" $variant="ghost" onClick={() => openPrescriptionDocument(prescription._id, false)}>
                      <FaFilePrescription /> Open document
                    </Button>
                    <Button type="button" $variant="ghost" onClick={() => openPrescriptionDocument(prescription._id, true)}>
                      <FaDownload /> Download
                    </Button>
                  </ActionRow>
                </RequestCard>
              ))}
            </RequestList>
          </Card>
        )}
      </Main>
    </Page>
  );
};

export default RequestPrescription;
