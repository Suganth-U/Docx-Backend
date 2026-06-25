import api from "@/shared/lib/api";

export const fetchConsultationOptions = async (params) => {
  const response = await api.get("/consultations/options", { params });
  return response.data;
};

export const createConsultationRequest = async (payload) => {
  const response = await api.post("/consultations/requests", payload);
  return response.data;
};

export const fetchConsultationDetail = async (consultationId) => {
  const response = await api.get(`/consultations/${consultationId}`);
  return response.data;
};

export const fetchMyConsultations = async () => {
  const response = await api.get("/consultations/my");
  return response.data;
};

export const createConsultationPayHereSession = async (consultationId, payload = {}) => {
  const response = await api.post(`/consultations/${consultationId}/payhere/session`, payload);
  return response.data;
};

export const createConsultationStripeSession = async (consultationId, payload = {}) => {
  const response = await api.post(`/consultations/${consultationId}/stripe/session`, {
    ...payload,
    origin: window.location.origin,
  });
  return response.data;
};

export const verifyConsultationStripeSession = async (consultationId, sessionId) => {
  const response = await api.post(`/consultations/${consultationId}/stripe/verify`, { sessionId });
  return response.data;
};

export const payConsultation = async (consultationId, payload = {}) => {
  const response = await api.put(`/consultations/${consultationId}/pay`, payload);
  return response.data;
};

export const confirmDemoConsultation = async (consultationId) => {
  const response = await api.put(`/consultations/${consultationId}/pay`, {
    provider: "CARD",
    method: "demo_card",
    status_message: "Demo card payment approved for virtual consultation prototype",
  });
  return response.data;
};

export const fetchMeetingAccess = async (consultationId) => {
  const response = await api.get(`/consultations/${consultationId}/meeting/access`);
  return response.data;
};

export const recordMeetingEvent = async (consultationId, event) => {
  const response = await api.post(`/consultations/${consultationId}/meeting/events`, { event });
  return response.data;
};

export const completeConsultation = async (consultationId, payload) => {
  const response = await api.post(`/consultations/${consultationId}/complete`, payload);
  return response.data;
};
