const formatDate = (value) => {
  if (!value) return "Date pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date pending";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTime = (value = "") => {
  if (!value || !String(value).includes(":")) return value || "Time pending";

  const [hour = "0", minute = "00"] = String(value).split(":");
  const date = new Date();
  date.setHours(Number(hour), Number(minute), 0, 0);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const sortTimestamp = (date, timeSlot = "") => {
  if (!date) return 0;

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return 0;

  const dateKey = parsedDate.toISOString().slice(0, 10);
  const parsedTimestamp = new Date(`${dateKey}T${timeSlot || "00:00"}:00`).getTime();
  return Number.isNaN(parsedTimestamp) ? parsedDate.getTime() : parsedTimestamp;
};

const titleCase = (value = "") =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const parseDateTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const getVirtualMeetingState = (appointment = {}, now = new Date()) => {
  if (appointment.source !== "virtual") {
    return {
      canJoin: false,
      label: "",
      disabled: true,
    };
  }

  const opensAt = parseDateTime(appointment.meetingJoinOpensAt);
  const closesAt = parseDateTime(appointment.meetingJoinClosesAt);
  const nowTime = now.getTime();
  const opensTime = opensAt?.getTime();
  const closesTime = closesAt?.getTime();

  if (appointment.status === "completed") {
    return { canJoin: false, label: "Completed", disabled: true };
  }

  if (appointment.paymentStatus !== "paid") {
    return { canJoin: false, label: appointment.canPay ? "Pay first" : "Payment pending", disabled: true };
  }

  if (appointment.status === "meeting_pending") {
    return { canJoin: false, label: "Meeting setup pending", disabled: true };
  }

  if (appointment.status !== "scheduled") {
    return { canJoin: false, label: "Not scheduled", disabled: true };
  }

  if (!opensAt || !closesAt) {
    return { canJoin: false, label: "Join time pending", disabled: true };
  }

  if (nowTime < opensTime) {
    return {
      canJoin: false,
      label: `Opens ${formatDate(opensAt)} at ${formatTime(
        `${opensAt.getHours()}:${String(opensAt.getMinutes()).padStart(2, "0")}`
      )}`,
      disabled: true,
    };
  }

  if (nowTime > closesTime) {
    return { canJoin: false, label: "Join window closed", disabled: true };
  }

  return { canJoin: true, label: "Join Now", disabled: false };
};

const withDoctorPrefix = (name = "") => {
  const cleanName = String(name || "").trim();
  if (!cleanName) return "Dr. Unknown";
  return cleanName.toLowerCase().startsWith("dr.") ? cleanName : `Dr. ${cleanName}`;
};

const getPhysicalDoctorName = (appointment = {}) =>
  appointment.receipt?.doctor?.name ||
  appointment.doctorNameSnapshot ||
  appointment.doctor_id?.fullName ||
  appointment.doctor_id?.user?.name ||
  appointment.doctor_id?.user_id?.name ||
  "";

const getPhysicalSpecialty = (appointment = {}) =>
  appointment.receipt?.doctor?.specialty ||
  appointment.specialtySnapshot ||
  appointment.doctor_id?.specialization ||
  "General care";

const getPhysicalVenue = (appointment = {}) =>
  appointment.receipt?.venue?.name ||
  appointment.hospitalNameSnapshot ||
  appointment.hospital?.name ||
  "Venue pending";

export const normalizePhysicalAppointment = (appointment = {}) => {
  const receipt = appointment.receipt || {};
  const status = String(receipt.status || appointment.status || "pending").toLowerCase();
  const paymentStatus = String(receipt.paymentStatus || appointment.paymentStatus || "pending").toLowerCase();
  const date = receipt.date || appointment.date;
  const timeSlot = receipt.timeSlot || appointment.timeSlot || "";

  return {
    _id: appointment._id || receipt.appointmentId,
    id: appointment._id || receipt.appointmentId,
    source: "physical",
    type: "PHYSICAL",
    typeLabel: "Physical consultation",
    doctorName: withDoctorPrefix(getPhysicalDoctorName(appointment)),
    specialty: getPhysicalSpecialty(appointment),
    venueName: getPhysicalVenue(appointment),
    date,
    dateLabel: formatDate(date),
    timeSlot,
    timeLabel: formatTime(timeSlot),
    status,
    statusLabel: titleCase(status),
    paymentStatus,
    paymentLabel: titleCase(paymentStatus),
    queueNumber: receipt.queueNumber || appointment.queueNumber || null,
    receiptNumber: receipt.receiptNumber || appointment.receiptNumber || "",
    actionUrl: `/appointment/receipt/${appointment._id || receipt.appointmentId}`,
    joinUrl: "",
    doctorUserId: appointment.doctor_id?.user?._id || appointment.doctor_id?.user || "",
    sortDate: sortTimestamp(date, timeSlot),
    isHistory: ["completed", "cancelled", "expired"].includes(status),
  };
};

export const normalizeVirtualConsultation = (consultation = {}) => {
  const status = String(consultation.status || "requested").toLowerCase();
  const paymentStatus = String(consultation.paymentStatus || "awaiting_approval").toLowerCase();
  const date = consultation.approvedDate || consultation.requestedDate;
  const timeSlot = consultation.approvedTimeSlot || consultation.requestedTimeSlot || "";

  return {
    _id: consultation.id || consultation._id,
    id: consultation.id || consultation._id,
    source: "virtual",
    type: "VIRTUAL",
    typeLabel: "Virtual consultation",
    doctorName: withDoctorPrefix(consultation.doctor?.name || consultation.doctorNameSnapshot || ""),
    specialty: consultation.doctor?.specialty || consultation.specialtySnapshot || "Virtual care",
    venueName: "Secure video",
    date,
    dateLabel: formatDate(date),
    timeSlot,
    timeLabel: formatTime(timeSlot),
    status,
    statusLabel: status === "meeting_pending" ? "Meeting pending" : titleCase(status),
    paymentStatus,
    paymentLabel: paymentStatus === "awaiting_approval" ? "Awaiting approval" : titleCase(paymentStatus),
    queueNumber: null,
    receiptNumber: consultation.consultationNumber || "",
    actionUrl: `/virtual-consultation/status/${consultation.id || consultation._id}`,
    joinUrl: "",
    joinPath: `/virtual-consultation/meeting/${consultation.id || consultation._id}`,
    meetingJoinOpensAt: consultation.meeting?.joinOpensAt || "",
    meetingJoinClosesAt: consultation.meeting?.joinClosesAt || "",
    meetingScheduledStartAt: consultation.meeting?.scheduledStartAt || "",
    meetingError: consultation.meeting?.error || consultation.zoom?.error || "",
    doctorUserId: consultation.doctor?.userId || consultation.doctor?.user?._id || "",
    canPay: Boolean(consultation.canPay),
    sortDate: sortTimestamp(date, timeSlot),
    isHistory: ["completed", "cancelled", "rejected"].includes(status),
  };
};

export const mergeAppointmentTimeline = (physicalAppointments = [], virtualConsultations = []) =>
  [
    ...physicalAppointments.map(normalizePhysicalAppointment),
    ...virtualConsultations.map(normalizeVirtualConsultation),
  ].sort((left, right) => {
    if (left.isHistory !== right.isHistory) {
      return left.isHistory ? 1 : -1;
    }

    return (left.sortDate || 0) - (right.sortDate || 0);
  });

export const formatAppointmentDate = formatDate;
export const formatAppointmentTime = formatTime;
