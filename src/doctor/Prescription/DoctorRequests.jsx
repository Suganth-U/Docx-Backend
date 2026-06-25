import React, { useEffect, useState } from "react";
import styled from "styled-components";
import {
  FaCheck,
  FaFilePrescription,
  FaDownload,
  FaExclamationTriangle,
  FaPlus,
  FaShieldAlt,
  FaSignature,
  FaTimes,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { assets } from "@/shared/lib/assets";
import api from "@/shared/lib/api";
import { useToast } from "@/shared/context/ToastContext";

const DashboardContainer = styled.div`
  display: flex;
  background-color: #f8f9fc;
  min-height: 100vh;
`;

const Content = styled.div`
  flex: 1;
  padding: 28px;
  max-width: 1280px;
  margin: 0 auto;
  width: 100%;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-start;
  margin-bottom: 26px;

  h1 {
    font-size: 30px;
    color: #1f2937;
    margin-bottom: 8px;
  }

  p {
    color: #6b7280;
    margin: 0;
    line-height: 1.7;
  }
`;

const SignatureNotice = styled.div`
  background: ${({ $ready }) => ($ready ? "#ecfdf3" : "#fff7ed")};
  color: ${({ $ready }) => ($ready ? "#0f766e" : "#c2410c")};
  border: 1px solid ${({ $ready }) => ($ready ? "#ccefe4" : "#fed7aa")};
  border-radius: 18px;
  padding: 18px 20px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  margin-bottom: 22px;

  strong {
    display: block;
    margin-bottom: 6px;
    font-size: 15px;
  }

  p {
    margin: 0;
    line-height: 1.6;
    font-size: 14px;
  }
`;

const GhostButton = styled.button`
  border: 1px solid #d9cbe9;
  background: white;
  color: #683b93;
  border-radius: 999px;
  padding: 11px 16px;
  font-weight: 700;
  cursor: pointer;
`;

const FilterRow = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

const FilterButton = styled.button`
  border: 1px solid ${({ $active }) => ($active ? "#683b93" : "#e4dcec")};
  background: ${({ $active }) => ($active ? "#683b93" : "#fff")};
  color: ${({ $active }) => ($active ? "#fff" : "#683b93")};
  border-radius: 999px;
  padding: 10px 14px;
  font-weight: 700;
  cursor: pointer;
`;

const RequestList = styled.div`
  display: grid;
  gap: 18px;
`;

const RequestCard = styled.div`
  background: white;
  border-radius: 24px;
  padding: 24px;
  border: 1px solid #ece8f3;
  box-shadow: 0 16px 40px rgba(73, 31, 106, 0.05);
`;

const PatientInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 18px;

  img {
    width: 58px;
    height: 58px;
    border-radius: 50%;
    object-fit: cover;
    background: #f7f4fb;
  }

  .info {
    h3 {
      font-size: 18px;
      color: #1f2937;
      margin: 0 0 5px;
    }

    p {
      color: #6b7280;
      font-size: 14px;
      margin: 0;
    }
  }
`;

const StatusBadge = styled.span`
  margin-left: auto;
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  background: ${({ $tone }) =>
    $tone === "Issued" ? "#eaf8ef" : $tone === "Rejected" ? "#fff1f2" : "#fff7ed"};
  color: ${({ $tone }) =>
    $tone === "Issued" ? "#166534" : $tone === "Rejected" ? "#be123c" : "#b45309"};
`;

const RequestDetails = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }

  .detail-group {
    background: #faf8fc;
    padding: 15px 16px;
    border-radius: 16px;
    border: 1px solid #ede7f4;

    label {
      display: block;
      color: #7b6695;
      font-size: 12px;
      margin-bottom: 7px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 700;
    }

    p, li {
      color: #374151;
      font-size: 14px;
      font-weight: 500;
      margin: 0;
      line-height: 1.7;
    }

    ul {
      margin: 0;
      padding-left: 18px;
    }
  }
`;

const SafetyPanel = styled.div`
  border: 1px solid ${({ $status }) =>
    $status === "ready_for_doctor" ? "#bbf7d0" : $status === "urgent_care" || $status === "blocked" ? "#fecaca" : "#fde68a"};
  background: ${({ $status }) =>
    $status === "ready_for_doctor" ? "#f0fdf4" : $status === "urgent_care" || $status === "blocked" ? "#fff1f2" : "#fffbeb"};
  border-radius: 16px;
  padding: 15px 16px;
  margin: 16px 0;

  strong {
    color: ${({ $status }) =>
      $status === "ready_for_doctor" ? "#166534" : $status === "urgent_care" || $status === "blocked" ? "#be123c" : "#92400e"};
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 7px;
  }

  p {
    margin: 0;
    color: #374151;
    line-height: 1.6;
    font-size: 14px;
  }
`;

const InlineList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;

  span,
  button {
    border: 1px solid #d9cbe9;
    background: #fff;
    color: #683b93;
    border-radius: 999px;
    padding: 8px 11px;
    font-weight: 700;
    font-size: 12px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  button {
    cursor: pointer;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  border-top: 1px solid #ede7f4;
  padding-top: 18px;
  margin-top: 18px;
  flex-wrap: wrap;
`;

const Button = styled.button`
  padding: 11px 18px;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: none;
  transition: all 0.16s ease;

  &.approve {
    background: #683b93;
    color: white;
  }

  &.reject {
    background: #fff1f2;
    color: #c43a59;
  }

  &.secondary {
    background: #f8f5fc;
    color: #683b93;
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const EmptyCard = styled.div`
  background: white;
  border: 1px dashed #d7cde4;
  border-radius: 24px;
  padding: 36px;
  text-align: center;
  color: #6b7280;
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.46);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContent = styled.div`
  background: white;
  width: 100%;
  max-width: 900px;
  border-radius: 24px;
  padding: 28px;
  max-height: 90vh;
  overflow: auto;

  h2 {
    color: #1f2937;
    margin: 0 0 8px;
  }

  p {
    color: #6b7280;
    margin: 0 0 20px;
    line-height: 1.7;
  }
`;

const ModalGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-size: 13px;
    font-weight: 700;
    color: #2d3748;
  }

  input,
  textarea {
    padding: 13px 15px;
    border: 1px solid #e6deef;
    border-radius: 14px;
    font-size: 14px;
    color: #1f2937;
    transition: all 0.18s ease;
    outline: none;
    background: white;
    font-family: inherit;
    width: 100%;

    &:focus {
      border-color: #683b93;
      box-shadow: 0 0 0 4px rgba(104, 59, 147, 0.08);
    }
  }

  textarea {
    min-height: 110px;
    resize: vertical;
  }
`;

const MedicineCard = styled.div`
  border: 1px solid #ede7f4;
  border-radius: 18px;
  padding: 16px;
  background: #faf8fc;
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 22px;
  flex-wrap: wrap;
`;

const defaultMedicine = {
  name: "",
  dosage: "",
  frequency: "",
  duration: "",
  quantity: "",
};

const statusFilters = ["Pending", "Issued", "Rejected"];

const getRequestedItems = (request = {}) =>
  Array.isArray(request.pharmacyIntent?.requestedItems)
    ? request.pharmacyIntent.requestedItems
    : [];

const buildRequestedMedicineRows = (request = {}) => {
  const requestedItems = getRequestedItems(request);

  if (!requestedItems.length) {
    return [{ ...defaultMedicine }];
  }

  return requestedItems.map((item) => ({
    ...defaultMedicine,
    name: item.medicineName || item.medicine?.name || "",
    quantity: item.qty ? String(item.qty) : "",
  }));
};

const isSafetyBlocked = (request = {}) =>
  ["blocked", "urgent_care"].includes(request.aiTriage?.status) ||
  request.aiTriage?.riskLevel === "blocked";

const formatSafetyStatus = (value = "") =>
  String(value || "not recorded").replaceAll("_", " ");

const getProofFiles = (request = {}) =>
  Array.isArray(request.proofFiles) ? request.proofFiles : [];

const getQuestionAnswers = (request = {}) =>
  Array.isArray(request.clinicalIntake?.questionAnswers)
    ? request.clinicalIntake.questionAnswers
    : [];

const DoctorRequests = () => {
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectingRequest, setRejectingRequest] = useState(null);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [issueForm, setIssueForm] = useState({
    diagnosis: "",
    notes: "",
    medicines: [{ ...defaultMedicine }],
  });
  const [rejectReason, setRejectReason] = useState("");
  const [saving, setSaving] = useState(false);

  const toast = useToast();
  const navigate = useNavigate();

  const fetchPageData = async () => {
    try {
      const [{ data: requestData }, { data: profileData }] = await Promise.all([
        api.get("/prescriptions/requests", { params: { status: statusFilter } }),
        api.get("/doctor/profile"),
      ]);

      setRequests(Array.isArray(requestData) ? requestData : []);
      setDoctorProfile(profileData);
    } catch (error) {
      console.error("Failed to fetch doctor requests", error);
      toast.error("We couldn’t load prescription requests right now.");
    }
  };

  useEffect(() => {
    fetchPageData();
  }, [statusFilter]);

  const handleMedicineChange = (index, field, value) => {
    setIssueForm((prev) => ({
      ...prev,
      medicines: prev.medicines.map((medicine, medicineIndex) =>
        medicineIndex === index ? { ...medicine, [field]: value } : medicine
      ),
    }));
  };

  const addMedicineRow = () => {
    setIssueForm((prev) => ({
      ...prev,
      medicines: [...prev.medicines, { ...defaultMedicine }],
    }));
  };

  const removeMedicineRow = (index) => {
    setIssueForm((prev) => ({
      ...prev,
      medicines:
        prev.medicines.length === 1
          ? prev.medicines
          : prev.medicines.filter((_, medicineIndex) => medicineIndex !== index),
    }));
  };

  const openIssueModal = (request) => {
    setSelectedRequest(request);
    setIssueForm({
      diagnosis: "",
      notes: "",
      medicines: buildRequestedMedicineRows(request),
    });
  };

  const closeIssueModal = () => {
    setSelectedRequest(null);
    setIssueForm({
      diagnosis: "",
      notes: "",
      medicines: [{ ...defaultMedicine }],
    });
  };

  const handleIssue = async () => {
    if (!selectedRequest) return;

    setSaving(true);
    try {
      const { data } = await api.put(
        `/prescriptions/requests/${selectedRequest._id}/issue`,
        issueForm
      );

      toast.success("Signed prescription issued successfully.");
      setRequests((prev) =>
        prev.map((request) => (request._id === data._id ? data : request))
      );
      closeIssueModal();
      fetchPageData();
    } catch (error) {
      console.error("Error issuing prescription", error);
      toast.error(
        error.response?.data?.message || "We couldn’t issue the prescription."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectingRequest) return;

    setSaving(true);
    try {
      const { data } = await api.put(
        `/prescriptions/requests/${rejectingRequest._id}/reject`,
        { reason: rejectReason }
      );

      toast.success("Request rejected.");
      setRequests((prev) =>
        prev.map((request) => (request._id === data._id ? data : request))
      );
      setRejectingRequest(null);
      setRejectReason("");
      fetchPageData();
    } catch (error) {
      console.error("Error rejecting prescription request", error);
      toast.error(
        error.response?.data?.message || "We couldn’t reject the request."
      );
    } finally {
      setSaving(false);
    }
  };

  const downloadProofFile = async (request, file) => {
    try {
      const response = await api.get(
        `/prescriptions/requests/${request._id}/proof/${file._id}`,
        {
          params: { download: 1 },
          responseType: "blob",
        }
      );
      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: file.mimeType || "application/octet-stream" }));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = file.originalName || `prescription-proof-${request._id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 3000);
    } catch (error) {
      console.error("Failed to download proof", error);
      toast.error(error.response?.data?.message || "We could not open the proof file.");
    }
  };

  return (
    <DashboardContainer>
      <Content>
        <Header>
          <div>
            <h1>Digital prescription requests</h1>
            <p>
              Review specialty-matched requests, issue structured signed
              prescriptions, or reject with a documented reason for the patient
              portal.
            </p>
          </div>
        </Header>

        <SignatureNotice $ready={Boolean(doctorProfile?.signatureImageUrl)}>
          <div>
            <strong>
              {doctorProfile?.signatureImageUrl
                ? "Signature ready for digital prescriptions"
                : "Signature setup required"}
            </strong>
            <p>
              {doctorProfile?.signatureImageUrl
                ? "Your uploaded signature will be placed on every issued digital prescription PDF."
                : "Upload your signature in the doctor profile before issuing any signed prescription."}
            </p>
          </div>
          <GhostButton type="button" onClick={() => navigate("/doctor/profile")}>
            <FaSignature /> Manage signature
          </GhostButton>
        </SignatureNotice>

        <FilterRow>
          {statusFilters.map((status) => (
            <FilterButton
              key={status}
              $active={statusFilter === status}
              onClick={() => setStatusFilter(status)}
            >
              {status}
            </FilterButton>
          ))}
        </FilterRow>

        {requests.length === 0 ? (
          <EmptyCard>
            <FaFilePrescription style={{ fontSize: 34, color: "#8f79a9" }} />
            <h3 style={{ color: "#1f2937" }}>No {statusFilter.toLowerCase()} requests</h3>
            <p>New prescription requests will appear here when patients submit them.</p>
          </EmptyCard>
        ) : (
          <RequestList>
            {requests.map((request) => (
              <RequestCard key={request._id}>
                {(() => {
                  const requestedItems = getRequestedItems(request);
                  const proofFiles = getProofFiles(request);
                  const answers = getQuestionAnswers(request);
                  const patient = request.patientId || {};

                  return (
                    <>
                <PatientInfo>
                  <img src={assets.patientAvatar} alt="Patient" />
                  <div className="info">
                    <h3>{request.patientName}</h3>
                    <p>
                      {request.age ? `${request.age} years • ` : ""}
                      {request.gender || "Patient"} • {request.specialist}
                    </p>
                  </div>
                  <StatusBadge $tone={request.status}>{request.status}</StatusBadge>
                </PatientInfo>

                <SafetyPanel $status={request.aiTriage?.status}>
                  <strong>
                    {isSafetyBlocked(request) ? <FaExclamationTriangle /> : <FaShieldAlt />}
                    Safety intake: {formatSafetyStatus(request.aiTriage?.status)}
                    {request.aiTriage?.riskLevel ? ` · ${request.aiTriage.riskLevel}` : ""}
                  </strong>
                  <p>
                    {request.aiTriage?.summaryForDoctor ||
                      request.aiTriage?.patientMessage ||
                      "No structured safety summary was attached to this legacy request."}
                  </p>
                  {request.aiTriage?.redFlags?.length > 0 && (
                    <p style={{ marginTop: 8 }}>
                      Flags: {request.aiTriage.redFlags.join(", ")}
                    </p>
                  )}
                  <InlineList>
                    {proofFiles.length ? proofFiles.map((file) => (
                      <button
                        key={file._id || file.storedName}
                        type="button"
                        onClick={() => downloadProofFile(request, file)}
                      >
                        <FaDownload /> {file.originalName || "Proof file"}
                      </button>
                    )) : <span>No proof file attached</span>}
                  </InlineList>
                </SafetyPanel>

                <RequestDetails>
                  <div className="detail-group">
                    <label>Reason / condition</label>
                    <p>{request.clinicalIntake?.conditionOrReason || request.symptoms}</p>
                  </div>
                  <div className="detail-group">
                    <label>Prior diagnosis / last review</label>
                    <p>{request.clinicalIntake?.previousDiagnosis || request.history || "No prior review context added."}</p>
                  </div>
                  <div className="detail-group">
                    <label>Patient EHR snapshot</label>
                    <p>
                      Allergies: {(patient.allergies || []).join(", ") || request.clinicalIntake?.allergies || "Not recorded"}
                    </p>
                    <p>
                      Current medicines: {(patient.currentMedications || []).join(", ") || request.clinicalIntake?.currentMedications || "Not recorded"}
                    </p>
                    <p>
                      Chronic conditions: {(patient.chronicConditions || []).join(", ") || request.clinicalIntake?.chronicConditions || "Not recorded"}
                    </p>
                  </div>
                  {requestedItems.length > 0 && (
                    <div className="detail-group">
                      <label>Requested pharmacy medicine</label>
                      <ul>
                        {requestedItems.map((item) => (
                          <li key={item._id || item.medicine?._id || item.medicineName}>
                            {item.medicineName || item.medicine?.name} · Qty {item.qty || 1}
                            {item.category ? ` · ${item.category}` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {!requestedItems.length && request.clinicalIntake?.requestedMedicationName && (
                    <div className="detail-group">
                      <label>Requested refill medicine</label>
                      <p>{request.clinicalIntake.requestedMedicationName}</p>
                    </div>
                  )}
                  {answers.length > 0 && (
                    <div className="detail-group">
                      <label>Intake answers</label>
                      <ul>
                        {answers.map((item) => (
                          <li key={item._id || item.id || item.question}>
                            <strong>{item.question}</strong> · {item.answer}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="detail-group">
                    <label>Status timeline</label>
                    <ul>
                      {(request.statusHistory || []).map((item, index) => (
                        <li key={`${request._id}-${index}`}>
                          <strong>{item.status}</strong> •{" "}
                          {new Date(item.changedAt).toLocaleString()}
                          {item.note ? ` • ${item.note}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="detail-group">
                    <label>Doctor response</label>
                    <p>
                      {request.status === "Issued"
                        ? request.doctorNote || "Signed prescription issued."
                        : request.status === "Rejected"
                        ? request.rejectionReason || "This request was rejected."
                        : "Awaiting your review."}
                    </p>
                  </div>
                </RequestDetails>

                {request.status === "Pending" && (
                  <ActionButtons>
                    <Button
                      type="button"
                      className="reject"
                      onClick={() => {
                        setRejectingRequest(request);
                        setRejectReason("");
                      }}
                    >
                      <FaTimes /> Reject
                    </Button>
                    <Button
                      type="button"
                      className="approve"
                      disabled={isSafetyBlocked(request) || proofFiles.length === 0}
                      onClick={() => openIssueModal(request)}
                    >
                      <FaFilePrescription /> Issue signed prescription
                    </Button>
                  </ActionButtons>
                )}

                {request.status === "Issued" && (
                  <ActionButtons>
                    <Button
                      type="button"
                      className="secondary"
                      onClick={() => navigate("/doctor/prescription")}
                    >
                      <FaCheck /> View issued prescriptions
                    </Button>
                  </ActionButtons>
                )}
                    </>
                  );
                })()}
              </RequestCard>
            ))}
          </RequestList>
        )}
      </Content>

      {selectedRequest && (
        <ModalOverlay>
          <ModalContent>
            <h2>Issue signed prescription</h2>
            <p>
              Build the final structured prescription for {selectedRequest.patientName}.
              The issued PDF will include your signature and return to the patient portal.
            </p>

            <SafetyPanel $status={selectedRequest.aiTriage?.status}>
              <strong>
                <FaShieldAlt />
                Safety summary: {formatSafetyStatus(selectedRequest.aiTriage?.status)}
                {selectedRequest.aiTriage?.riskLevel ? ` · ${selectedRequest.aiTriage.riskLevel}` : ""}
              </strong>
              <p>
                {selectedRequest.aiTriage?.summaryForDoctor ||
                  "Review the patient's intake and proof before issuing."}
              </p>
              <InlineList>
                {getProofFiles(selectedRequest).map((file) => (
                  <button
                    key={file._id || file.storedName}
                    type="button"
                    onClick={() => downloadProofFile(selectedRequest, file)}
                  >
                    <FaDownload /> {file.originalName || "Proof file"}
                  </button>
                ))}
              </InlineList>
            </SafetyPanel>

            <ModalGrid>
              <InputGroup style={{ gridColumn: "1 / -1" }}>
                <label>Diagnosis / indication</label>
                <textarea
                  value={issueForm.diagnosis}
                  onChange={(event) =>
                    setIssueForm((prev) => ({ ...prev, diagnosis: event.target.value }))
                  }
                />
              </InputGroup>

              <InputGroup style={{ gridColumn: "1 / -1" }}>
                <label>Doctor notes</label>
                <textarea
                  value={issueForm.notes}
                  onChange={(event) =>
                    setIssueForm((prev) => ({ ...prev, notes: event.target.value }))
                  }
                />
              </InputGroup>
            </ModalGrid>

            <div style={{ marginTop: 20, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, color: "#1f2937" }}>Medicines</h3>
              <GhostButton type="button" onClick={addMedicineRow}>
                <FaPlus /> Add medicine
              </GhostButton>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              {issueForm.medicines.map((medicine, index) => (
                <MedicineCard key={`medicine-${index}`}>
                  <ModalGrid>
                    <InputGroup>
                      <label>Medicine name</label>
                      <input
                        value={medicine.name}
                        onChange={(event) =>
                          handleMedicineChange(index, "name", event.target.value)
                        }
                      />
                    </InputGroup>
                    <InputGroup>
                      <label>Dosage</label>
                      <input
                        value={medicine.dosage}
                        onChange={(event) =>
                          handleMedicineChange(index, "dosage", event.target.value)
                        }
                      />
                    </InputGroup>
                    <InputGroup>
                      <label>Frequency</label>
                      <input
                        value={medicine.frequency}
                        onChange={(event) =>
                          handleMedicineChange(index, "frequency", event.target.value)
                        }
                      />
                    </InputGroup>
                    <InputGroup>
                      <label>Duration</label>
                      <input
                        value={medicine.duration}
                        onChange={(event) =>
                          handleMedicineChange(index, "duration", event.target.value)
                        }
                      />
                    </InputGroup>
                    <InputGroup>
                      <label>Quantity</label>
                      <input
                        value={medicine.quantity}
                        onChange={(event) =>
                          handleMedicineChange(index, "quantity", event.target.value)
                        }
                      />
                    </InputGroup>
                  </ModalGrid>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                    <GhostButton type="button" onClick={() => removeMedicineRow(index)}>
                      <FaTimes /> Remove
                    </GhostButton>
                  </div>
                </MedicineCard>
              ))}
            </div>

            <ModalActions>
              <GhostButton type="button" onClick={closeIssueModal}>
                Cancel
              </GhostButton>
              <Button type="button" className="approve" onClick={handleIssue} disabled={saving}>
                <FaFilePrescription />
                {saving ? "Issuing..." : "Issue signed prescription"}
              </Button>
            </ModalActions>
          </ModalContent>
        </ModalOverlay>
      )}

      {rejectingRequest && (
        <ModalOverlay>
          <ModalContent style={{ maxWidth: 620 }}>
            <h2>Reject request</h2>
            <p>
              Add a clear reason so the patient can understand why this prescription
              was not issued.
            </p>

            <InputGroup>
              <label>Rejection reason</label>
              <textarea
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
              />
            </InputGroup>

            <ModalActions>
              <GhostButton
                type="button"
                onClick={() => {
                  setRejectingRequest(null);
                  setRejectReason("");
                }}
              >
                Cancel
              </GhostButton>
              <Button type="button" className="reject" onClick={handleReject} disabled={saving}>
                <FaTimes /> {saving ? "Rejecting..." : "Confirm rejection"}
              </Button>
            </ModalActions>
          </ModalContent>
        </ModalOverlay>
      )}
    </DashboardContainer>
  );
};

export default DoctorRequests;
