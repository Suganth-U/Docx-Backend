import api from "@/shared/lib/api";

export const EHR_CATEGORIES = [
  { value: "all", label: "All records" },
  { value: "doctor_note", label: "Doctor notes" },
  { value: "lab_report", label: "Lab reports" },
  { value: "imaging", label: "Images" },
  { value: "prescription_record", label: "Prescriptions" },
  { value: "discharge_summary", label: "Discharge" },
  { value: "vaccination", label: "Vaccination" },
  { value: "old_record", label: "Old records" },
  { value: "medication", label: "Medications" },
  { value: "other", label: "Other" },
];

export const fetchEhrSummary = async (patientId) => {
  const response = await api.get(`/ehr/summary/${patientId}`);
  return response.data;
};

export const fetchEhrTimeline = async (patientId, params = {}) => {
  const response = await api.get(`/ehr/timeline/${patientId}`, { params });
  return response.data;
};

export const uploadEhrDocument = async (formData) => {
  const response = await api.post("/ehr/documents", formData);
  return response.data;
};

export const updateEhrDocument = async (documentId, payload) => {
  const response = await api.patch(`/ehr/documents/${documentId}`, payload);
  return response.data;
};

export const appendEncounterNote = async (encounterId, payload) => {
  const response = await api.patch(`/ehr/encounters/${encounterId}/notes`, payload);
  return response.data;
};

export const fetchEhrMedications = async (params = {}) => {
  const response = await api.get("/ehr/medications", { params });
  return response.data;
};

export const createEhrMedication = async (payload) => {
  const response = await api.post("/ehr/medications", payload);
  return response.data;
};

export const updateEhrMedication = async (medicationId, payload) => {
  const response = await api.patch(`/ehr/medications/${medicationId}`, payload);
  return response.data;
};
