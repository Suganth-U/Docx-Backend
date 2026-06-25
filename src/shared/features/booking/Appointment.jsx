import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaCreditCard,
  FaMapMarkerAlt,
  FaStethoscope,
  FaUserMd,
} from "react-icons/fa";
import {
  confirmDemoAppointment,
  confirmFreeAppointment,
  createAppointmentHold,
  createAppointmentStripeSession,
  isDemoPaymentAvailable,
} from "@/shared/features/Appointments/appointmentClient";
import { useToast } from "@/shared/context/ToastContext";
import { getStoredAuthSession } from "@/shared/lib/authSession";
import api from "@/shared/lib/api";
import { safeToLocaleDateString, safeToLocaleString } from "@/shared/lib/intlDate";
import FieldError from "@/shared/components/common/FieldError";
import { clearFieldError, isValidEmail, validateRequiredFields } from "@/shared/lib/formValidation";

const Page = styled.div`
  height: 100vh;
  width: 100vw;
  max-height: 100vh;
  display: flex;
  align-items: stretch;
  background: #ffffff;
  font-family: "DM Sans", sans-serif;
  overflow: hidden;

  @media (max-width: 1024px) {
    flex-direction: column;
    height: auto;
    max-height: none;
    min-height: 100vh;
    overflow: visible;
  }
`;

const LeftPanel = styled.div`
  flex: 0 0 40%;
  height: 100%;
  max-height: 100vh;
  background: linear-gradient(135deg, #9481ff 0%, #683B93 100%);
  color: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 40px 50px;
  position: relative;
  overflow: hidden;

  /* Premium watermark pattern */
  &::before {
    content: '';
    position: absolute;
    width: 150%;
    height: 150%;
    top: -25%;
    left: -25%;
    background-image: radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0);
    background-size: 32px 32px;
    transform: rotate(-15deg);
    pointer-events: none;
  }

  /* Soft glowing orb behind text */
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 60%);
    transform: translate(-50%, -50%);
    pointer-events: none;
    border-radius: 50%;
  }

  @media (max-width: 1024px) {
    padding: 40px 30px;
    flex: none;
  }
`;

const Eyebrow = styled.span`
  display: inline-flex;
  align-self: flex-start;
  padding: 10px 18px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 24px;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
`;

const LeftContent = styled.div`
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 12px;

  h1 {
    margin: 0;
    font-size: clamp(1.8rem, 2.5vw, 2.2rem);
    line-height: 1.2;
    font-weight: 800;
    letter-spacing: -0.02em;
    text-shadow: 0 2px 10px rgba(0,0,0,0.2);
  }

  p {
    margin: 0;
    color: rgba(255, 255, 255, 0.85);
    line-height: 1.5;
    font-size: 0.95rem;
    max-width: 500px;
  }
`;

const LeftMeta = styled.div`
  display: grid;
  gap: 12px;
  margin-top: 28px;
  position: relative;
  z-index: 2;
`;

const LeftMetaItem = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.4;
  font-size: 0.9rem;
  padding: 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid transparent;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    transform: translateX(8px);
  }

  svg {
    background: rgba(255, 255, 255, 0.15);
    padding: 8px;
    border-radius: 10px;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    color: #ffffff;
    transition: all 0.3s ease;
  }

  &:hover svg {
    background: rgba(255, 255, 255, 0.25);
    transform: scale(1.05);
  }

  div {
    display: flex;
    flex-direction: column;
  }

  strong {
    color: #ffffff;
    font-weight: 700;
    font-size: 0.95rem;
    letter-spacing: -0.01em;
  }
`;

const RightPanel = styled.div`
  flex: 1 1 auto;
  height: 100%;
  max-height: 100vh;
  background: #ffffff;
  padding: 60px 80px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-thumb {
    background: #E2E8F0;
    border-radius: 4px;
  }

  @media (max-width: 1024px) {
    padding: 40px 30px;
  }
`;

const FormShell = styled.div`
  width: 100%;
  max-width: 700px;
`;

const TopBar = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 40px;
  padding-bottom: 20px;
  border-bottom: 1px solid #F1F5F9;
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #6B7280;
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 700;
  padding: 8px 16px;
  border-radius: 12px;
  background: #F8FAFC;
  transition: all 0.3s ease;

  &:hover {
    color: #4C1D95;
    background: #EDE9FE;
    transform: translateX(-4px);
  }
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 12px;
  background: ${(props) => (props.$warning ? "#FEF3C7" : "#EDE9FE")};
  color: ${(props) => (props.$warning ? "#D97706" : "#6D28D9")};
  font-size: 0.85rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  box-shadow: 0 2px 8px ${(props) => (props.$warning ? "rgba(217, 119, 6, 0.15)" : "rgba(109, 40, 217, 0.15)")};
`;

const Title = styled.h2`
  margin: 0 0 12px;
  color: #111827;
  font-size: clamp(2rem, 3vw, 2.5rem);
  font-weight: 800;
  letter-spacing: -0.03em;
`;

const Subtitle = styled.p`
  margin: 0 0 40px;
  color: #6B7280;
  line-height: 1.6;
  font-size: 1.05rem;
`;

const Alert = styled.div`
  padding: 16px 20px;
  margin-bottom: 30px;
  border-radius: 16px;
  display: flex;
  gap: 14px;
  align-items: flex-start;
  border: 1px solid ${(props) => (props.$error ? "#FECACA" : "#FDE68A")};
  background: ${(props) => (props.$error ? "#FEF2F2" : "#FFFBEB")};
  color: ${(props) => (props.$error ? "#B91C1C" : "#B45309")};
  line-height: 1.6;
  font-size: 0.95rem;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0,0,0,0.02);
`;

const SummaryCard = styled.div`
  padding: 32px;
  border-radius: 24px;
  background: linear-gradient(145deg, #ffffff, #F8FAFC);
  border: 1px solid #E2E8F0;
  margin-bottom: 40px;
  box-shadow: 0 10px 30px -10px rgba(0,0,0,0.05);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 6px;
    height: 100%;
    background: #6D28D9;
  }
`;

const SummaryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  flex-wrap: wrap;
  margin-bottom: 24px;

  h3 {
    margin: 0 0 6px;
    color: #111827;
    font-size: 1.25rem;
    font-weight: 800;
    letter-spacing: -0.01em;
  }

  p {
    margin: 0;
    color: #6B7280;
    font-size: 0.95rem;
  }
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const SummaryLine = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
  color: #4B5563;
  font-size: 0.95rem;
  padding: 12px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #F1F5F9;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
    border-color: #E2E8F0;
  }

  svg {
    background: #F3F4F6;
    padding: 8px;
    border-radius: 8px;
    width: 32px;
    height: 32px;
    color: #6D28D9;
    flex-shrink: 0;
    transition: all 0.3s;
  }

  &:hover svg {
    background: #EDE9FE;
    transform: scale(1.1);
  }
  
  div {
      display: flex;
      flex-direction: column;
  }

  strong {
    display: block;
    margin-bottom: 2px;
    color: #111827;
    font-size: 1rem;
    font-weight: 700;
  }
`;

const InlineButton = styled.button`
  margin-top: 20px;
  padding: 10px 16px;
  border-radius: 8px;
  border: none;
  background: #F3F4F6;
  color: #4C1D95;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #E5E7EB;
    color: #3B0764;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 28px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;

  label {
    font-size: 0.9rem;
    font-weight: 800;
    color: #374151;
  }

  input,
  select,
  textarea {
    width: 100%;
    padding: 16px 20px;
    border-radius: 16px;
    border: 2px solid #E2E8F0;
    background: #F8FAFC;
    color: #111827;
    font-size: 1rem;
    font-weight: 500;
    outline: none;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    &:focus {
      background: #ffffff;
      border-color: #6D28D9;
      box-shadow: 0 4px 12px rgba(109, 40, 217, 0.1);
    }
  }

  textarea {
    min-height: 140px;
    resize: vertical;
  }
`;

const SlotCard = styled.div`
  padding: 32px;
  border-radius: 24px;
  border: 1px solid #E2E8F0;
  background: #ffffff;
  box-shadow: 0 4px 20px rgba(0,0,0,0.02);
`;

const SlotGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 20px;
`;

const SlotButton = styled.button`
  padding: 14px 24px;
  border-radius: 14px;
  border: 2px solid ${(props) => (props.$selected ? "#6D28D9" : "#E2E8F0")};
  background: ${(props) => (props.$selected ? "#6D28D9" : props.$isBooked ? "#F3F4F6" : "#ffffff")};
  color: ${(props) => (props.$selected ? "#ffffff" : props.$isBooked ? "#9CA3AF" : "#4B5563")};
  text-decoration: ${(props) => (props.$isBooked ? "line-through" : "none")};
  font-size: 0.95rem;
  font-weight: 800;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  opacity: ${(props) => (props.disabled ? 0.6 : 1)};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover:not(:disabled) {
    border-color: #6D28D9;
    color: ${(props) => (props.$selected ? "#ffffff" : "#6D28D9")};
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(109, 40, 217, 0.15);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

const EmptyState = styled.div`
  padding: 40px 30px;
  border-radius: 20px;
  background: #F8FAFC;
  border: 2px dashed #CBD5E1;
  color: #64748B;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;

  h3 {
    margin: 0 0 10px;
    color: #1E293B;
    font-size: 1.2rem;
    font-weight: 800;
  }

  p {
    margin: 0;
    font-size: 1rem;
    max-width: 400px;
  }
`;

const PaymentCard = styled.div`
  padding: 32px;
  border-radius: 24px;
  border: 1px solid #E2E8F0;
  background: #ffffff;
  box-shadow: 0 10px 40px -10px rgba(0,0,0,0.08);
`;

const PaymentRows = styled.div`
  display: grid;
  gap: 20px;
  margin-top: 28px;
  padding-top: 28px;
  border-top: 2px dashed #E2E8F0;
`;

const PaymentRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #64748B;
  font-size: 1.05rem;
  font-weight: 500;

  strong {
    color: #111827;
    font-size: 1.2rem;
    font-weight: 800;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  margin-top: 40px;
`;

const PrimaryButton = styled.button`
  flex: 1;
  min-height: 60px;
  padding: 0 32px;
  border-radius: 16px;
  border: none;
  background: linear-gradient(135deg, #6D28D9 0%, #4C1D95 100%);
  color: #ffffff;
  font-size: 1.1rem;
  font-weight: 800;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  box-shadow: 0 8px 24px rgba(109, 40, 217, 0.25);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(109, 40, 217, 0.35);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    cursor: wait;
    opacity: 0.8;
    background: #9CA3AF;
    box-shadow: none;
    transform: none;
  }
`;

const SecondaryButton = styled.button`
  min-height: 60px;
  padding: 0 32px;
  border-radius: 16px;
  border: 2px solid #E2E8F0;
  background: #ffffff;
  color: #4B5563;
  font-size: 1.1rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: #F8FAFC;
    border-color: #CBD5E1;
    color: #111827;
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0,0,0,0.05);
  }
`;

const todayValue = new Date().toISOString().split("T")[0];

const formatDateLabel = (value = "") => {
  if (!value) return "Date pending";

  return safeToLocaleDateString(`${value}T00:00:00`, "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }, "Date pending");
};

const formatTimeLabel = (value = "") => {
  if (!value || !value.includes(":")) return value || "Time pending";

  const [hourString = "0", minuteString = "00"] = value.split(":");
  const date = new Date();
  date.setHours(Number(hourString), Number(minuteString), 0, 0);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatDateTime = (value = "") => {
  if (!value) return "Pending";
  return safeToLocaleString(value, "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }, "Pending");
};

const normalizeConsultationType = (value = "") =>
  String(value).toUpperCase() === "VIRTUAL" ? "VIRTUAL" : "PHYSICAL";

const parseBookingIntent = (search = "") => {
  const params = new URLSearchParams(search);

  return {
    appointmentId: params.get("appointmentId") || "",
    doctorId: params.get("doctorId") || params.get("id") || "",
    doctorName: params.get("doctorName") || params.get("doctor") || "",
    specialty: params.get("specialty") || "",
    consultationType: normalizeConsultationType(
      params.get("consultationType") || params.get("type") || "PHYSICAL"
    ),
    date: params.get("date") || "",
    timeSlot: params.get("timeSlot") || "",
    hospitalId: params.get("hospitalId") || "",
    hospitalName: params.get("hospitalName") || params.get("hospital") || "",
  };
};

const hasCompleteIntent = (intent) =>
  Boolean(intent.doctorId && intent.hospitalId && intent.date && intent.timeSlot);

const Appointment = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const [viewMode, setViewMode] = useState("missing");
  const [bookingIntent, setBookingIntent] = useState(parseBookingIntent(location.search));
  const [doctorSummary, setDoctorSummary] = useState({
    name: parseBookingIntent(location.search).doctorName,
    specialty: parseBookingIntent(location.search).specialty,
  });
  const [selectionDate, setSelectionDate] = useState(
    parseBookingIntent(location.search).date || todayValue
  );
  const [availability, setAvailability] = useState([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [appointmentId, setAppointmentId] = useState("");
  const [holdExpiresAt, setHoldExpiresAt] = useState("");
  const [amount, setAmount] = useState(0);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    mobileNumber: "",
    gender: "Other",
    reasonForAppointment: "",
  });

  const consultationType = normalizeConsultationType(bookingIntent.consultationType);
  const demoPaymentEnabled = useMemo(() => isDemoPaymentAvailable(), []);

  useEffect(() => {
    if (consultationType !== "VIRTUAL") {
      return;
    }

    const params = new URLSearchParams(location.search);
    navigate(`/virtual-consultation?${params.toString()}`, { replace: true });
  }, [consultationType, location.search, navigate]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error, toast]);

  useEffect(() => {
    if (warning) {
      toast.warning(warning);
    }
  }, [toast, warning]);

  const timeOptions = useMemo(() => {
    const grouped = new Map();

    availability.forEach((entry) => {
      (entry.slots || []).forEach((slot) => {
        const current = grouped.get(slot.time) || [];
        current.push({ ...entry, slotDetail: slot });
        grouped.set(slot.time, current);
      });
    });

    return Array.from(grouped.entries())
      .map(([time, venues]) => {
        const isBooked = venues.some(
          (v) => v.slotDetail.isBooked || v.slotDetail.status === "booked" || v.slotDetail.status === "held"
        );
        const status = venues[0].slotDetail.status;
        return {
          time,
          venues,
          isConflicted: venues.length !== 1,
          isBooked,
          status,
        };
      })
      .sort((left, right) => left.time.localeCompare(right.time));
  }, [availability]);

  useEffect(() => {
    const parsed = parseBookingIntent(location.search);
    setBookingIntent(parsed);
    setDoctorSummary({
      name: parsed.doctorName,
      specialty: parsed.specialty,
    });
    setSelectionDate(parsed.date || todayValue);
    setAvailability([]);
    setAppointmentId(parsed.appointmentId || "");
    setError("");
    setWarning("");
    setHoldExpiresAt("");
    setAmount(0);

    if (hasCompleteIntent(parsed)) {
      setViewMode("details");
    } else if (parsed.doctorId) {
      setViewMode("selection");
    } else {
      setViewMode("missing");
    }
  }, [location.search]);

  useEffect(() => {
    const userInfo = getStoredAuthSession();
    if (!userInfo?.accessToken) return;

    setFormData((current) => ({
      ...current,
      fullName: current.fullName || userInfo.name || "",
      email: current.email || userInfo.email || "",
    }));
  }, []);

  useEffect(() => {
    const loadDoctorSummary = async () => {
      if (!bookingIntent.doctorId || (doctorSummary.name && doctorSummary.specialty)) {
        return;
      }

      try {
        const { data } = await api.get("/doctor");
        const matchedDoctor = data.find((doctor) => String(doctor.id) === String(bookingIntent.doctorId));

        if (matchedDoctor) {
          setDoctorSummary({
            name: matchedDoctor.name,
            specialty: matchedDoctor.specialty,
          });
        }
      } catch (summaryError) {
        console.error("Failed to load doctor summary", summaryError);
      }
    };

    loadDoctorSummary();
  }, [bookingIntent.doctorId, doctorSummary.name, doctorSummary.specialty]);

  useEffect(() => {
    if (viewMode !== "selection" || !bookingIntent.doctorId || !selectionDate) {
      return;
    }

    let cancelled = false;

    const loadAvailability = async () => {
      setAvailabilityLoading(true);
      setError("");

      try {
        const { data } = await api.get(`/doctor/${bookingIntent.doctorId}/availability`, {
          params: {
            date: selectionDate,
            consultationType,
          },
        });

        if (!cancelled) {
          setAvailability(data);
        }
      } catch (availabilityError) {
        if (!cancelled) {
          setAvailability([]);
          setError(
            availabilityError.response?.data?.message ||
              "We could not load real availability for this doctor right now."
          );
        }
      } finally {
        if (!cancelled) {
          setAvailabilityLoading(false);
        }
      }
    };

    loadAvailability();

    return () => {
      cancelled = true;
    };
  }, [bookingIntent.doctorId, consultationType, selectionDate, viewMode]);

  const syncIntentToUrl = (intent) => {
    const params = new URLSearchParams({
      doctorId: intent.doctorId,
      doctorName: doctorSummary.name || intent.doctorName || "",
      specialty: doctorSummary.specialty || intent.specialty || "",
      consultationType: normalizeConsultationType(intent.consultationType),
      date: intent.date || "",
      timeSlot: intent.timeSlot || "",
      hospitalId: intent.hospitalId || "",
      hospitalName: intent.hospitalName || "",
    });

    navigate(`/appointment?${params.toString()}`, { replace: true });
  };

  const handleSelectTime = (option) => {
    if (option.isConflicted) {
      setWarning(
        "This time maps to more than one venue for the same doctor. The schedule needs to be corrected before booking."
      );
      return;
    }

    const venue = option.venues[0];
    const nextIntent = {
      ...bookingIntent,
      consultationType,
      date: selectionDate,
      timeSlot: option.time,
      hospitalId: venue.hospitalId,
      hospitalName: venue.hospitalName,
    };

    setWarning("");
    setBookingIntent(nextIntent);
    syncIntentToUrl(nextIntent);
    setViewMode("details");
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    clearFieldError(setFieldErrors, name);
  };

  const openRequestPage = () => {
    const params = new URLSearchParams({
      type: "appointment-request",
      consultationType,
      specialty: doctorSummary.specialty || "",
      doctor: doctorSummary.name || "",
      date: bookingIntent.date || selectionDate || "",
    });

    navigate(`/contact-us?${params.toString()}`);
  };

  const handleCreateHold = async (event) => {
    event.preventDefault();
    setError("");
    setWarning("");

    if (!hasCompleteIntent(bookingIntent)) {
      setError("Please choose a real doctor time and resolved venue before continuing.");
      setViewMode("selection");
      return;
    }

    const nextErrors = validateRequiredFields(formData, {
      fullName: "Full name",
      email: "Email",
      mobileNumber: "Mobile number",
      reasonForAppointment: "Reason for appointment",
    });
    if (formData.email && !isValidEmail(formData.email)) {
      nextErrors.email = "Enter a valid email address.";
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      return;
    }

    setBookingLoading(true);

    try {
      const response = await createAppointmentHold({
        doctorId: bookingIntent.doctorId,
        hospitalId: bookingIntent.hospitalId,
        date: bookingIntent.date,
        timeSlot: bookingIntent.timeSlot,
        consultationType,
        fullName: formData.fullName,
        email: formData.email,
        mobileNumber: formData.mobileNumber,
        gender: formData.gender,
        reasonForAppointment: formData.reasonForAppointment,
      });

      setAppointmentId(response.appointmentId);
      setHoldExpiresAt(response.holdExpiresAt);
      setAmount(Number(response.amount || 0));
      setViewMode("payment");
      window.scrollTo(0, 0);
    } catch (bookingError) {
      setError(
        bookingError.response?.data?.message ||
          "We could not place a temporary hold on this appointment."
      );
    } finally {
      setBookingLoading(false);
    }
  };

  const handleStartPayment = async (provider = "stripe") => {
    if (!appointmentId) return;

    setPaymentLoading(true);
    setError("");
    setWarning("");

    try {
      if (amount <= 0) {
        await confirmFreeAppointment(appointmentId);
        navigate(`/appointment/receipt/${appointmentId}`);
        return;
      }

      const session = await createAppointmentStripeSession(appointmentId);
      const checkoutUrl = session.checkoutUrl;
      if (!checkoutUrl) {
        throw new Error("Payment gateway did not return a checkout URL.");
      }
      window.location.assign(checkoutUrl);
    } catch (paymentError) {
      setPaymentLoading(false);
      setError(
        paymentError.response?.data?.message ||
          paymentError.message ||
          "We could not start secure payment right now."
      );
    }
  };

  const handleDemoPayment = async () => {
    if (!appointmentId) return;

    setPaymentLoading(true);
    setError("");
    setWarning("");

    try {
      if (amount <= 0) {
        await confirmFreeAppointment(appointmentId);
      } else {
        await confirmDemoAppointment(appointmentId);
      }

      navigate(`/appointment/receipt/${appointmentId}`);
    } catch (paymentError) {
      setError(
        paymentError.response?.data?.message ||
          paymentError.message ||
          "We could not complete the demo payment right now."
      );
    } finally {
      setPaymentLoading(false);
    }
  };

  const renderSummaryCard = () => (
    <SummaryCard>
      <SummaryHeader>
        <div>
          <h3>{doctorSummary.name || "Selected doctor"}</h3>
          <p>{doctorSummary.specialty || "Specialty confirmed during booking"}</p>
        </div>

        <StatusBadge>
          {consultationType === "VIRTUAL" ? "Virtual consultation" : "Physical consultation"}
        </StatusBadge>
      </SummaryHeader>

      <SummaryGrid>
        <SummaryLine>
          <FaCalendarAlt size={14} />
          <div>
            <strong>Date</strong>
            <span>{formatDateLabel(bookingIntent.date || selectionDate)}</span>
          </div>
        </SummaryLine>

        <SummaryLine>
          <FaClock size={14} />
          <div>
            <strong>Time</strong>
            <span>{formatTimeLabel(bookingIntent.timeSlot)}</span>
          </div>
        </SummaryLine>

        <SummaryLine>
          <FaMapMarkerAlt size={14} />
          <div>
            <strong>{consultationType === "VIRTUAL" ? "Hosted venue" : "Venue"}</strong>
            <span>{bookingIntent.hospitalName || "Select a venue-backed slot first"}</span>
          </div>
        </SummaryLine>
      </SummaryGrid>

      {viewMode !== "selection" && (
        <InlineButton
          type="button"
          onClick={() => {
            const nextIntent = {
              ...bookingIntent,
              date: bookingIntent.date || selectionDate,
              timeSlot: "",
              hospitalId: "",
              hospitalName: "",
            };

            setBookingIntent(nextIntent);
            setAppointmentId("");
            setHoldExpiresAt("");
            setAmount(0);
            setViewMode("selection");
            syncIntentToUrl(nextIntent);
          }}
        >
          Choose another time
        </InlineButton>
      )}
    </SummaryCard>
  );

  const renderSelectionFallback = () => (
    <>
      {renderSummaryCard()}

      <Field>
        <label htmlFor="selection-date">Choose date</label>
        <input
          id="selection-date"
          min={todayValue}
          type="date"
          value={selectionDate}
          onChange={(event) => {
            setSelectionDate(event.target.value);
            setWarning("");
            setError("");
          }}
        />
      </Field>

      <SlotCard>
        <SummaryHeader>
          <div>
            <h3>Available times</h3>
            <p>
              Pick one valid time and the correct {consultationType === "VIRTUAL" ? "hosted venue" : "venue"} will
              be applied automatically.
            </p>
          </div>
          <StatusBadge $warning={availabilityLoading}>
            {availabilityLoading ? "Loading" : `${timeOptions.length} time option${timeOptions.length === 1 ? "" : "s"}`}
          </StatusBadge>
        </SummaryHeader>

        {timeOptions.length ? (
          <SlotGrid>
            {timeOptions.map((option) => (
              <SlotButton
                key={option.time}
                $selected={bookingIntent.timeSlot === option.time}
                disabled={option.isConflicted || option.isBooked}
                $isBooked={option.isBooked}
                type="button"
                onClick={() => handleSelectTime(option)}
              >
                {formatTimeLabel(option.time)}
                {option.isConflicted ? " • Conflict" : ""}
                {option.isBooked ? (option.status === "held" ? " • Pending" : " • Booked") : ""}
              </SlotButton>
            ))}
          </SlotGrid>
        ) : (
          <EmptyState>
            <h3>No bookable times yet</h3>
            <p>
              This doctor does not have an open time on the selected date. You can try another
              date or send a request and let the team help arrange an alternative.
            </p>
            <ButtonRow>
              <SecondaryButton type="button" onClick={openRequestPage}>
                Make request
              </SecondaryButton>
            </ButtonRow>
          </EmptyState>
        )}
      </SlotCard>
    </>
  );

  const renderDetailsForm = () => (
    <>
      {renderSummaryCard()}

      <Form onSubmit={handleCreateHold} noValidate>
        <Grid>
          <Field>
            <label htmlFor="fullName">Full name</label>
            <input
              id="fullName"
              name="fullName"
              required
              value={formData.fullName}
              onChange={handleInputChange}
              aria-invalid={Boolean(fieldErrors.fullName)}
            />
            <FieldError message={fieldErrors.fullName} />
          </Field>

          <Field>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              required
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              aria-invalid={Boolean(fieldErrors.email)}
            />
            <FieldError message={fieldErrors.email} />
          </Field>

          <Field>
            <label htmlFor="mobileNumber">Mobile number</label>
            <input
              id="mobileNumber"
              name="mobileNumber"
              required
              value={formData.mobileNumber}
              onChange={handleInputChange}
              aria-invalid={Boolean(fieldErrors.mobileNumber)}
            />
            <FieldError message={fieldErrors.mobileNumber} />
          </Field>

          <Field>
            <label htmlFor="gender">Gender</label>
            <select id="gender" name="gender" value={formData.gender} onChange={handleInputChange}>
              <option value="Other">Other</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </Field>
        </Grid>

        <Field>
          <label htmlFor="reasonForAppointment">Reason for appointment</label>
          <textarea
            id="reasonForAppointment"
            name="reasonForAppointment"
            placeholder="Share the main concern so the doctor has context before the visit."
            value={formData.reasonForAppointment}
            onChange={handleInputChange}
            aria-invalid={Boolean(fieldErrors.reasonForAppointment)}
          />
          <FieldError message={fieldErrors.reasonForAppointment} />
        </Field>

        <PrimaryButton disabled={bookingLoading} type="submit">
          <FaCheckCircle size={14} />
          {bookingLoading ? "Holding your slot..." : "Continue to payment"}
        </PrimaryButton>
      </Form>
    </>
  );

  const renderPaymentView = () => (
    <>
      {renderSummaryCard()}

      <PaymentCard>
        <Title style={{ fontSize: "1.5rem", marginBottom: 8 }}>Secure payment</Title>
        <Subtitle style={{ marginBottom: 0 }}>
          Complete payment to confirm this exact doctor slot. The queue number is assigned
          after successful payment.
        </Subtitle>

        {demoPaymentEnabled && amount > 0 ? (
          <Alert style={{ marginTop: 18, marginBottom: 0 }}>
            <FaCheckCircle size={15} />
            <span>
              Demo payment mode is available on this prototype. It confirms the appointment,
              generates the receipt, and assigns the queue number without needing a live merchant
              account.
            </span>
          </Alert>
        ) : null}

        <PaymentRows>
          <PaymentRow>
            <span>Consultation type</span>
            <strong>{consultationType === "VIRTUAL" ? "Virtual consultation" : "Physical consultation"}</strong>
          </PaymentRow>
          <PaymentRow>
            <span>Venue</span>
            <strong>{bookingIntent.hospitalName}</strong>
          </PaymentRow>
          <PaymentRow>
            <span>Hold expires</span>
            <strong>{formatDateTime(holdExpiresAt)}</strong>
          </PaymentRow>
          <PaymentRow>
            <span>Amount</span>
            <strong>LKR {Number(amount || 0).toFixed(2)}</strong>
          </PaymentRow>
        </PaymentRows>

        <ButtonRow>
          <PrimaryButton
            disabled={paymentLoading}
            type="button"
            onClick={demoPaymentEnabled ? handleDemoPayment : () => handleStartPayment("stripe")}
          >
            <FaCreditCard size={14} />
            {paymentLoading
              ? demoPaymentEnabled
                ? "Confirming payment..."
                  : "Opening payment..."
              : amount > 0 && demoPaymentEnabled
                ? "Complete demo payment"
                : amount > 0
                  ? "Pay by card"
                : "Confirm appointment"}
          </PrimaryButton>

          {demoPaymentEnabled && amount > 0 ? (
            <SecondaryButton type="button" onClick={() => handleStartPayment("stripe")} disabled={paymentLoading}>
              Use Stripe card payment
            </SecondaryButton>
          ) : null}

          <SecondaryButton
            type="button"
            onClick={() => navigate(`/appointment/receipt/${appointmentId}`)}
          >
            Review status
          </SecondaryButton>
        </ButtonRow>
      </PaymentCard>
    </>
  );

  const leftTitle =
    consultationType === "VIRTUAL"
      ? "Confirm the doctor, pay securely, and receive your queue-backed online consultation receipt."
      : "Confirm the doctor, pay securely, and receive your appointment receipt with queue number.";

  return (
    <Page>
      <LeftPanel>
        <LeftContent>
          <Eyebrow>{consultationType === "VIRTUAL" ? "Hosted Virtual Care" : "Professional Appointment Booking"}</Eyebrow>
          <h1>{leftTitle}</h1>
          <p>
            This booking flow keeps the doctor, time, and venue linked together so the
            confirmation, payment, and queue number all reflect the same published
            availability.
          </p>

          <LeftMeta>
            <LeftMetaItem>
              <FaUserMd size={15} />
              <div>
                <strong>Doctor-managed availability</strong>
                <span>Only real doctor schedules and open slots appear in the booking flow.</span>
              </div>
            </LeftMetaItem>

            <LeftMetaItem>
              <FaCreditCard size={15} />
              <div>
                <strong>Payment before confirmation</strong>
                <span>Your slot is held first, then payment confirms the appointment.</span>
              </div>
            </LeftMetaItem>

            <LeftMetaItem>
              <FaStethoscope size={15} />
              <div>
                <strong>Receipt with queue number</strong>
                <span>After payment, DocX generates a printable confirmation and queue assignment.</span>
              </div>
            </LeftMetaItem>
          </LeftMeta>
        </LeftContent>
      </LeftPanel>

      <RightPanel>
        <FormShell>
          <TopBar>
            <BackLink to="/">
              <FaArrowLeft size={12} />
              Back to homepage
            </BackLink>

            <StatusBadge $warning={viewMode === "selection"}>
              {viewMode === "payment"
                ? "Payment step"
                : viewMode === "details"
                  ? "Patient details"
                  : viewMode === "selection"
                    ? "Choose a time"
                    : "Booking unavailable"}
            </StatusBadge>
          </TopBar>

          <Title>
            {viewMode === "payment"
              ? "Complete payment"
              : viewMode === "details"
                ? "Add patient details"
                : viewMode === "selection"
                  ? "Select a valid time"
                  : "Booking details missing"}
          </Title>

          <Subtitle>
            {viewMode === "payment"
              ? "Use secure payment to confirm the held appointment and generate the final receipt."
              : viewMode === "details"
                ? "We use these details to create the appointment hold before secure payment."
                : viewMode === "selection"
                  ? "Choose a doctor, time, and venue to continue your booking."
                  : "Start from the homepage hero booking section so we can match you with a real doctor time and venue."}
          </Subtitle>

          {viewMode === "selection" && renderSelectionFallback()}
          {viewMode === "details" && renderDetailsForm()}
          {viewMode === "payment" && renderPaymentView()}

          {viewMode === "missing" && (
            <EmptyState>
              <h3>This page needs a selected doctor slot</h3>
              <p>
                Return to the homepage and use the doctor-centric booking section to choose the
                specialty, available doctor, time, and venue first.
              </p>
              <ButtonRow>
                <PrimaryButton as={Link} to="/" type="button">
                  Back to homepage
                </PrimaryButton>
              </ButtonRow>
            </EmptyState>
          )}
        </FormShell>
      </RightPanel>
    </Page>
  );
};

export default Appointment;
