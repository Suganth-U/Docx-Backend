import api from "@/shared/lib/api";

export const fetchPatientNotifications = async () => {
  const response = await api.get("/patient/notifications");
  return response.data;
};

export const markPatientNotificationRead = async (notificationId) => {
  const response = await api.put(`/patient/notifications/${notificationId}/read`);
  return response.data;
};

export const markAllPatientNotificationsRead = async () => {
  const response = await api.put("/patient/notifications/read-all");
  return response.data;
};
