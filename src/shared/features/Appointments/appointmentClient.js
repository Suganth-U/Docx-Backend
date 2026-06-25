import api from "@/shared/lib/api";

const PAYHERE_SCRIPT = "https://www.payhere.lk/lib/payhere.js";

export const createAppointmentHold = async (payload) => {
  const response = await api.post("/appointments", payload);
  return response.data;
};

export const createAppointmentPayHereSession = async (appointmentId, payload = {}) => {
  const response = await api.post(`/appointments/${appointmentId}/payhere/session`, payload);
  return response.data;
};

export const createAppointmentStripeSession = async (appointmentId, payload = {}) => {
  const response = await api.post(`/appointments/${appointmentId}/stripe/session`, {
    ...payload,
    origin: window.location.origin,
  });
  return response.data;
};

export const verifyAppointmentStripeSession = async (appointmentId, sessionId) => {
  const response = await api.post(`/appointments/${appointmentId}/stripe/verify`, { sessionId });
  return response.data;
};

export const fetchAppointmentReceipt = async (appointmentId) => {
  const response = await api.get(`/appointments/${appointmentId}/receipt`);
  return response.data;
};

export const fetchMyAppointments = async () => {
  const response = await api.get("/appointments/my");
  return response.data;
};

export const confirmDemoAppointment = async (appointmentId) => {
  const response = await api.put(`/appointments/${appointmentId}/pay`, {
    provider: "CARD",
    method: "demo_card",
    status_message: "Demo card payment approved for prototype presentation",
  });
  return response.data;
};

export const confirmFreeAppointment = async (appointmentId) => {
  const response = await api.put(`/appointments/${appointmentId}/pay`, {
    provider: "FREE",
    method: "free",
    status_message: "No payment required",
  });
  return response.data;
};

export const isDemoPaymentAvailable = () => {
  const explicitFlag = String(import.meta.env.VITE_DEMO_PAYMENTS_ENABLED || "").toLowerCase();
  return explicitFlag === "true";
};

export const ensurePayHereLoaded = () => {
  if (window.payhere) {
    return Promise.resolve(window.payhere);
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${PAYHERE_SCRIPT}"]`);

    if (existing) {
      existing.addEventListener("load", () => resolve(window.payhere), { once: true });
      existing.addEventListener("error", () => reject(new Error("Secure payment could not load.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = PAYHERE_SCRIPT;
    script.async = true;
    script.onload = () => resolve(window.payhere);
    script.onerror = () => reject(new Error("Secure payment could not load."));
    document.body.appendChild(script);
  });
};
