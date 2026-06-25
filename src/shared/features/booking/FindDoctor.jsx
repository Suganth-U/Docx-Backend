import React, { useEffect, useMemo, useState } from "react";
import styled, { keyframes } from "styled-components";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaArrowRight,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaSearch,
  FaSlidersH,
  FaStar,
  FaStethoscope,
  FaSyncAlt,
  FaUser,
  FaCommentDots,
  FaRegBuilding,
  FaRegCalendarAlt,
  FaRegCommentDots,
  FaVideo,
  FaClock,
  FaChevronRight,
  FaTimes,
} from "react-icons/fa";
import { Navigationbar } from "@/shared/components/layout/NavigationBar/Navigationbar";
import Footer from "@/shared/components/layout/Footer/Footer";
import api from "@/shared/lib/api";
import {
  findSpecialtyByQuery,
  matchesSpecialtyValue,
  specialtyCatalog,
} from "@/shared/data/specialties";

/* ───── constants ───── */
const AVAILABILITY_DEFAULT = "open";
const SORT_DEFAULT = "next-available";
const AVAILABILITY_OPTIONS = [
  { value: "open", label: "Open slots only" },
  { value: "all", label: "All doctors" },
];
const SORT_OPTIONS = [
  { value: "next-available", label: "Sort by next available" },
  { value: "name", label: "Sort by doctor name" },
];
const APPOINTMENT_METHOD_OPTIONS = [
  { value: "PHYSICAL", label: "Physical visit" },
  { value: "VIRTUAL", label: "Virtual consultation" },
];
const WEEKDAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

/* ───── utility functions ───── */
const normalizeLabel = (value = "") =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const parseDoctorSearch = (search = "") => {
  const params = new URLSearchParams(search);
  const specialtyQuery = params.get("specialty") || "";
  const matchedSpecialty = findSpecialtyByQuery(specialtyQuery);
  const availability = params.get("availability");
  const sort = params.get("sort");
  const appointmentMethod = String(
    params.get("appointmentMethod") || params.get("consultationType") || ""
  ).toUpperCase();

  return {
    keyword: params.get("keyword") || "",
    specialty: matchedSpecialty ? matchedSpecialty.slug : specialtyQuery,
    appointmentMethod: APPOINTMENT_METHOD_OPTIONS.some(
      (option) => option.value === appointmentMethod
    )
      ? appointmentMethod
      : "",
    appointmentDate: params.get("date") || "",
    availability:
      availability === "all" || availability === "open"
        ? availability
        : AVAILABILITY_DEFAULT,
    sort: SORT_OPTIONS.some((option) => option.value === sort)
      ? sort
      : SORT_DEFAULT,
  };
};

const buildDoctorSearchParams = ({
  keyword = "",
  specialty = "",
  appointmentMethod = "",
  appointmentDate = "",
  availability = AVAILABILITY_DEFAULT,
  sort = SORT_DEFAULT,
}) => {
  const params = new URLSearchParams();

  if (normalizeLabel(keyword)) {
    params.set("keyword", normalizeLabel(keyword));
  }

  if (specialty) {
    params.set("specialty", specialty);
  }

  if (appointmentMethod) {
    params.set("appointmentMethod", appointmentMethod);
  }

  if (appointmentDate) {
    params.set("date", appointmentDate);
  }

  if (availability) {
    params.set("availability", availability);
  }

  if (sort) {
    params.set("sort", sort);
  }

  return params;
};

const getDoctorId = (doctor = {}) => doctor._id || doctor.id || doctor.name;

const getDoctorImage = (doctor = {}) =>
  doctor.image ||
  `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.name || "Doctor")}&background=E8DDF8&color=52267F`;

const getInitials = (name = "") => {
  const cleanName = String(name || "")
    .replace(/^Dr\.\s*/i, "")
    .trim();
  const parts = cleanName.split(" ").filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  return cleanName.slice(0, 2).toUpperCase() || "DR";
};

const hasOpenAvailability = (doctor = {}) =>
  Array.isArray(doctor.availableSlots) && doctor.availableSlots.length > 0;

const getPrimaryHospital = (doctor = {}) =>
  doctor.hospitals?.[0] || doctor.location || "Hospital shared during booking";

const todayValue = new Date().toISOString().split("T")[0];

const parseSlotRank = (slotLabel = "") => {
  const twentyFourHourMatch = String(slotLabel || "").match(/^(\d{1,2}):(\d{2})$/);

  if (twentyFourHourMatch) {
    return Number(twentyFourHourMatch[1] || 0) * 60 + Number(twentyFourHourMatch[2] || 0);
  }

  const match = String(slotLabel || "").match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);

  if (!match) {
    return 999;
  }

  let hour = Number(match[1] || 0);
  const minute = Number(match[2] || 0);
  const meridian = String(match[3] || "").toUpperCase();

  if (meridian === "PM" && hour !== 12) {
    hour += 12;
  }

  if (meridian === "AM" && hour === 12) {
    hour = 0;
  }

  return hour * 60 + minute;
};

const formatTimeLabel = (value = "") => {
  if (!value || !String(value).includes(":")) return value || "Time confirmed during booking";

  const [hourString = "0", minuteString = "00"] = String(value).split(":");
  const date = new Date();
  date.setHours(Number(hourString), Number(minuteString), 0, 0);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const getAvailabilityRank = (doctor = {}) => {
  if (!hasOpenAvailability(doctor)) {
    return Number.MAX_SAFE_INTEGER;
  }

  const availabilityLabel = String(
    doctor.nextAvailableDate || doctor.nextAvailableSlot || ""
  ).toLowerCase();
  const firstSlot = doctor.availableSlots?.[0] || doctor.nextAvailableSlot || "";

  if (availabilityLabel.startsWith("today")) {
    return parseSlotRank(firstSlot);
  }

  if (availabilityLabel.startsWith("tomorrow")) {
    return 1440 + parseSlotRank(firstSlot);
  }

  const weekdayRank =
    WEEKDAY_ORDER.findIndex((weekday) => availabilityLabel.includes(weekday)) + 2;

  return (weekdayRank > 1 ? weekdayRank : 10) * 1440 + parseSlotRank(firstSlot);
};

/* ───── animations ───── */
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const shimmer = keyframes`
  0%   { background-position: -800px 0; }
  100% { background-position: 800px 0; }
`;

/* ───── styled components ───── */
const Page = styled.div`
  min-height: 100vh;
  background: #ffffff;
  color: #111827;
  font-family: "Inter", -apple-system, sans-serif;
`;

const HeroSection = styled.section`
  position: relative;
  padding: 48px 0 0;
  background: #ffffff;
  overflow: hidden;

  &::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, #e5e7eb, transparent);
  }
`;

const Shell = styled.div`
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 40px;

  @media (max-width: 768px) {
    padding: 0 20px;
  }
`;

const HeroContent = styled.div`
  max-width: 680px;
  margin-bottom: 40px;
  animation: ${fadeIn} 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
`;

const PageTitle = styled.h1`
  font-size: clamp(2.2rem, 4vw, 3rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #111827;
  margin: 0 0 12px;
  line-height: 1.1;
`;

const PageSubtitle = styled.p`
  font-size: 1.1rem;
  color: #6b7280;
  margin: 0;
  line-height: 1.65;
  max-width: 540px;
`;

/* ── Search Toolbar ── */
const ToolbarWrapper = styled.div`
  padding-bottom: 32px;
`;

const ToolbarCard = styled.div`
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  padding: 24px 28px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
`;

const ToolbarGrid = styled.div`
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr 1fr auto;
  gap: 16px;
  align-items: end;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const InputLabel = styled.span`
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #9ca3af;
`;

const InputField = styled.div`
  position: relative;

  input {
    width: 100%;
    height: 52px;
    padding: 0 16px 0 46px;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    background: #f9fafb;
    color: #111827;
    font-size: 0.95rem;
    font-family: inherit;
    transition: all 0.2s ease;

    &:focus {
      outline: none;
      background: #ffffff;
      border-color: #683b93;
      box-shadow: 0 0 0 4px rgba(104, 59, 147, 0.08);
    }

    &::placeholder {
      color: #9ca3af;
    }
  }

  svg {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    color: #683b93;
    font-size: 14px;
  }
`;

const StyledSelect = styled.select`
  width: 100%;
  height: 52px;
  padding: 0 16px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #f9fafb;
  color: #111827;
  font-size: 0.95rem;
  font-family: inherit;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  padding-right: 36px;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    background-color: #ffffff;
    border-color: #683b93;
    box-shadow: 0 0 0 4px rgba(104, 59, 147, 0.08);
  }
`;

const StyledDateInput = styled.input`
  width: 100%;
  height: 52px;
  padding: 0 16px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #f9fafb;
  color: #111827;
  font-size: 0.95rem;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    background: #ffffff;
    border-color: #683b93;
    box-shadow: 0 0 0 4px rgba(104, 59, 147, 0.08);
  }
`;

const ClearBtn = styled.button`
  height: 52px;
  padding: 0 22px;
  border: none;
  border-radius: 14px;
  background: #111827;
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: #000000;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`;

/* ── Active Filters ── */
const ActiveFiltersBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 16px;
`;

const FilterChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 14px;
  border-radius: 100px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  color: #4b5563;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  svg {
    font-size: 10px;
    color: #9ca3af;
  }

  &:hover {
    background: #fef2f2;
    border-color: #fecaca;
    color: #dc2626;

    svg {
      color: #dc2626;
    }
  }
`;

const ResultsCount = styled.span`
  font-size: 0.85rem;
  color: #6b7280;
  font-weight: 500;
`;

/* ── Results Section ── */
const ResultsSection = styled.section`
  padding: 40px 0 64px;
`;

const DirectoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;

  @media (max-width: 1080px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

/* ── Doctor Card ── */
const DoctorCard = styled.article`
  border-radius: 20px;
  background: #ffffff;
  border: 1px solid #f3f4f6;
  padding: 0;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  overflow: hidden;
  animation: ${fadeIn} 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: ${(props) => props.$delay || "0s"};

  &:hover {
    border-color: #e5e7eb;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.06);
    transform: translateY(-4px);
  }
`;

const CardTop = styled.div`
  padding: 24px 24px 20px;
  display: flex;
  gap: 16px;
  align-items: center;
`;

const Avatar = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: linear-gradient(135deg, #f3e8fc 0%, #ede5fd 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid #f3f4f6;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  span {
    font-size: 1rem;
    font-weight: 700;
    color: #683b93;
  }
`;

const CardNameBlock = styled.div`
  flex: 1;
  min-width: 0;

  h3 {
    margin: 0 0 4px;
    font-size: 1.05rem;
    font-weight: 700;
    color: #111827;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    letter-spacing: -0.01em;
  }

  p {
    margin: 0;
    font-size: 0.85rem;
    color: #6b7280;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const CardBody = styled.div`
  padding: 0 24px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const DetailRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 0.88rem;
  color: #4b5563;
  line-height: 1.5;

  svg {
    flex-shrink: 0;
    margin-top: 3px;
    color: #9ca3af;
    font-size: 13px;
  }
`;

const DetailHighlight = styled.span`
  color: #683b93;
  font-weight: 600;
`;

const CardFooter = styled.div`
  padding: 16px 24px;
  border-top: 1px solid #f3f4f6;
  background: #fafafa;
`;

const BookButton = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  height: 48px;
  border-radius: 12px;
  background: #683b93;
  color: #ffffff;
  font-weight: 600;
  font-size: 0.95rem;
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    background: #5a3180;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(104, 59, 147, 0.25);
  }

  svg {
    font-size: 12px;
    transition: transform 0.2s;
  }

  &:hover svg {
    transform: translateX(3px);
  }
`;

/* ── Empty / Loading States ── */
const EmptyCard = styled.div`
  grid-column: 1 / -1;
  padding: 64px 40px;
  border-radius: 24px;
  background: #ffffff;
  border: 1px solid #f3f4f6;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  animation: ${fadeIn} 0.5s ease forwards;
`;

const EmptyIcon = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 24px;
  background: #f3e8fc;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;

  svg {
    font-size: 28px;
    color: #683b93;
  }
`;

const EmptyTitle = styled.h3`
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.01em;
`;

const EmptyText = styled.p`
  margin: 0;
  font-size: 1rem;
  color: #6b7280;
  max-width: 480px;
  line-height: 1.65;
`;

const EmptyAction = styled.button`
  margin-top: 8px;
  border: none;
  height: 48px;
  padding: 0 28px;
  border-radius: 12px;
  background: #683b93;
  color: #ffffff;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;

  &:hover {
    background: #5a3180;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(104, 59, 147, 0.25);
  }
`;

/* ── Skeleton Loader ── */
const SkeletonCard = styled.div`
  border-radius: 20px;
  background: #ffffff;
  border: 1px solid #f3f4f6;
  overflow: hidden;
`;

const SkeletonBar = styled.div`
  height: ${(props) => props.$h || "14px"};
  width: ${(props) => props.$w || "100%"};
  border-radius: 8px;
  background: linear-gradient(
    90deg,
    #f3f4f6 0%,
    #e5e7eb 40%,
    #f3f4f6 80%
  );
  background-size: 800px 100%;
  animation: ${shimmer} 1.6s infinite linear;
`;

const SkeletonLoader = () => (
  <>
    {[0, 1, 2].map((i) => (
      <SkeletonCard key={i}>
        <div style={{ padding: "24px 24px 20px", display: "flex", gap: 16, alignItems: "center" }}>
          <SkeletonBar $h="56px" $w="56px" style={{ borderRadius: 16, flexShrink: 0 }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <SkeletonBar $h="16px" $w="70%" />
            <SkeletonBar $h="12px" $w="50%" />
          </div>
        </div>
        <div style={{ padding: "0 24px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          <SkeletonBar $h="12px" $w="90%" />
          <SkeletonBar $h="12px" $w="80%" />
          <SkeletonBar $h="12px" $w="70%" />
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid #f3f4f6", background: "#fafafa" }}>
          <SkeletonBar $h="48px" style={{ borderRadius: 12 }} />
        </div>
      </SkeletonCard>
    ))}
  </>
);

/* ── Doctor Card Component ── */
const DoctorCardComponent = ({
  doctor,
  doctorId,
  doctorSpecialty,
  doctorImage,
  getPrimaryHospital,
  appointmentMethod,
  appointmentDate,
  index = 0,
}) => {
  const availableTime =
    doctor.availableSlots?.length > 0
      ? formatTimeLabel(doctor.availableSlots[0])
      : doctor.nextAvailableDate || doctor.nextAvailableSlot || "Time confirmed during booking";
  const bookingPath = appointmentMethod === "VIRTUAL" ? "/virtual-consultation" : "/appointment";
  const bookingParams = new URLSearchParams({
    doctorId: String(doctorId || ""),
    doctorName: doctor.name || "",
    specialty: doctorSpecialty?.slug || doctor.specialty || "",
    consultationType: appointmentMethod,
    date: appointmentDate,
  });

  return (
    <DoctorCard $delay={`${index * 0.06}s`}>
      <CardTop>
        <Avatar>
          {doctorImage ? (
            <img src={doctorImage} alt={doctor.name} />
          ) : (
            <span>{getInitials(doctor.name)}</span>
          )}
        </Avatar>
        <CardNameBlock>
          <h3>{doctor.name}</h3>
          <p>{doctorSpecialty?.name || doctor.specialty || "General care"}</p>
        </CardNameBlock>
      </CardTop>

      <CardBody>
        <DetailRow>
          <FaRegCalendarAlt />
          <span>
            <strong style={{ color: "#111827" }}>Date: </strong>
            {appointmentDate || "Not selected"}
          </span>
        </DetailRow>
        <DetailRow>
          <FaClock />
          <span>
            <strong style={{ color: "#111827" }}>Next slot: </strong>
            <DetailHighlight>{availableTime}</DetailHighlight>
          </span>
        </DetailRow>
        <DetailRow>
          {appointmentMethod === "VIRTUAL" ? <FaVideo /> : <FaRegBuilding />}
          <span>
            {appointmentMethod === "VIRTUAL" ? "Virtual consultation" : "Physical visit"}
          </span>
        </DetailRow>
        <DetailRow>
          <FaMapMarkerAlt />
          <span>{getPrimaryHospital(doctor)}</span>
        </DetailRow>
      </CardBody>

      <CardFooter>
        <BookButton to={`${bookingPath}?${bookingParams.toString()}`}>
          {appointmentMethod === "VIRTUAL" ? "Book Consultation" : "Book Appointment"}
          <FaChevronRight />
        </BookButton>
      </CardFooter>
    </DoctorCard>
  );
};

/* ═══════ Main Component ═══════ */
const FindDoctor = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const initialFilters = useMemo(
    () => parseDoctorSearch(location.search),
    [location.search]
  );
  const [searchTerm, setSearchTerm] = useState(initialFilters.keyword);
  const [specialty, setSpecialty] = useState(initialFilters.specialty);
  const [appointmentMethod, setAppointmentMethod] = useState(initialFilters.appointmentMethod);
  const [appointmentDate, setAppointmentDate] = useState(initialFilters.appointmentDate);
  const [availability, setAvailability] = useState(initialFilters.availability);
  const [sort, setSort] = useState(initialFilters.sort);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const urlFilters = parseDoctorSearch(location.search);

    const fetchDoctors = async () => {
      setLoading(true);
      setError("");

      try {
        if (urlFilters.appointmentMethod === "VIRTUAL" && urlFilters.appointmentDate) {
          const matchedSpecialty = findSpecialtyByQuery(urlFilters.specialty);
          const { data } = await api.get("/consultations/options", {
            params: {
              date: urlFilters.appointmentDate,
              specialty: matchedSpecialty?.name || urlFilters.specialty || undefined,
            },
          });

          const virtualDoctors = Array.isArray(data)
            ? data.map((doctor) => ({
                ...doctor,
                _id: doctor.id,
                name: String(doctor.name || "").startsWith("Dr.")
                  ? doctor.name
                  : `Dr. ${doctor.name || "Doctor"}`,
                hospitals: ["Secure video consultation"],
                location: "Secure video consultation",
                nextAvailableDate: doctor.requestedDateKey || urlFilters.appointmentDate,
                nextAvailableSlot: doctor.nextAvailableSlot
                  ? formatTimeLabel(doctor.nextAvailableSlot)
                  : "",
                available: doctor.availableSlotCount > 0,
              }))
            : [];

          if (!cancelled) {
            setDoctors(virtualDoctors);
          }

          return;
        }

        const { data } = await api.get("/doctor", {
          params: {
            keyword: urlFilters.keyword || undefined
          }
        });

        if (!cancelled) {
          setDoctors(Array.isArray(data) ? data : []);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setDoctors([]);
          setError(
            fetchError.response?.data?.message ||
              "We could not load the doctor directory right now. Retry in a moment."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchDoctors();

    return () => {
      cancelled = true;
    };
  }, [retryToken, location.search]);

  useEffect(() => {
    const nextFilters = parseDoctorSearch(location.search);

    setSearchTerm((current) =>
      current === nextFilters.keyword ? current : nextFilters.keyword
    );
    setSpecialty((current) =>
      current === nextFilters.specialty ? current : nextFilters.specialty
    );
    setAppointmentMethod((current) =>
      current === nextFilters.appointmentMethod ? current : nextFilters.appointmentMethod
    );
    setAppointmentDate((current) =>
      current === nextFilters.appointmentDate ? current : nextFilters.appointmentDate
    );
    setAvailability((current) =>
      current === nextFilters.availability ? current : nextFilters.availability
    );
    setSort((current) => (current === nextFilters.sort ? current : nextFilters.sort));
  }, [location.search]);

  const syncFiltersToUrl = ({
    keyword = searchTerm,
    specialty: nextSpecialty = specialty,
    appointmentMethod: nextAppointmentMethod = appointmentMethod,
    appointmentDate: nextAppointmentDate = appointmentDate,
    availability: nextAvailability = availability,
    sort: nextSort = sort,
  } = {}) => {
    const nextSearch = buildDoctorSearchParams({
      keyword,
      specialty: nextSpecialty,
      appointmentMethod: nextAppointmentMethod,
      appointmentDate: nextAppointmentDate,
      availability: nextAvailability,
      sort: nextSort,
    }).toString();
    const currentSearch = location.search.startsWith("?")
      ? location.search.slice(1)
      : location.search;

    if (nextSearch === currentSearch) {
      return;
    }

    navigate(
      {
        pathname: "/find-doctors",
        search: nextSearch ? `?${nextSearch}` : "",
      },
      { replace: true }
    );
  };

  useEffect(() => {
    const nextFilters = parseDoctorSearch(location.search);
    const timer = window.setTimeout(() => {
      if (searchTerm !== nextFilters.keyword) {
        syncFiltersToUrl({ keyword: searchTerm });
      }
    }, 260);

    return () => window.clearTimeout(timer);
  }, [location.search, searchTerm, specialty, appointmentMethod, appointmentDate, availability, sort]);

  const discoveredSpecialties = useMemo(
    () =>
      [
        ...new Map(
          doctors
            .map((doctor) => {
              const match = findSpecialtyByQuery(doctor.specialty);
              if (match) {
                return [match.slug, match.name];
              }

              return [doctor.specialty, doctor.specialty];
            })
            .filter((entry) => Boolean(entry[0]))
        ).entries(),
      ],
    [doctors]
  );

  const filteredDoctors = useMemo(() => {
    const normalizedKeyword = searchTerm.toLowerCase().trim();
    const hasRequiredBookingFilters = Boolean(appointmentMethod && appointmentDate);

    if (!hasRequiredBookingFilters) {
      return [];
    }

    return doctors
      .filter((doctor) => {
        const matchesKeyword =
          !normalizedKeyword ||
          doctor.name?.toLowerCase().includes(normalizedKeyword);
        const matchesSpecialty = matchesSpecialtyValue(doctor.specialty, specialty);
        const matchesAvailability =
          availability === "all" || hasOpenAvailability(doctor);

        return matchesKeyword && matchesSpecialty && matchesAvailability;
      })
      .sort((left, right) => {
        if (sort === "name") {
          return String(left.name || "").localeCompare(String(right.name || ""));
        }

        const availabilityRankDifference =
          getAvailabilityRank(left) - getAvailabilityRank(right);

        if (availabilityRankDifference !== 0) {
          return availabilityRankDifference;
        }

        return String(left.name || "").localeCompare(String(right.name || ""));
      });
  }, [appointmentDate, appointmentMethod, availability, doctors, searchTerm, sort, specialty]);

  const selectedSpecialty = specialtyCatalog.find((item) => item.slug === specialty);
  const activeFilters = [
    selectedSpecialty
      ? {
          id: "specialty",
          label: selectedSpecialty.name,
          onRemove: () => {
            setSpecialty("");
            syncFiltersToUrl({ specialty: "" });
          },
        }
      : null,
    searchTerm.trim()
      ? {
          id: "keyword",
          label: `Name: ${searchTerm.trim()}`,
          onRemove: () => setSearchTerm(""),
        }
      : null,
    appointmentMethod
      ? {
          id: "appointmentMethod",
          label:
            APPOINTMENT_METHOD_OPTIONS.find((option) => option.value === appointmentMethod)
              ?.label || appointmentMethod,
          onRemove: () => {
            setAppointmentMethod("");
            syncFiltersToUrl({ appointmentMethod: "" });
          },
        }
      : null,
    appointmentDate
      ? {
          id: "appointmentDate",
          label: `Date: ${appointmentDate}`,
          onRemove: () => {
            setAppointmentDate("");
            syncFiltersToUrl({ appointmentDate: "" });
          },
        }
      : null,
    availability === "open"
      ? {
          id: "availability",
          label: "Open slots only",
          onRemove: () => {
            setAvailability("all");
            syncFiltersToUrl({ availability: "all" });
          },
        }
      : null,
    sort !== SORT_DEFAULT
      ? {
          id: "sort",
          label: SORT_OPTIONS.find((option) => option.value === sort)?.label || sort,
          onRemove: () => {
            setSort(SORT_DEFAULT);
            syncFiltersToUrl({ sort: SORT_DEFAULT });
          },
        }
      : null,
  ].filter(Boolean);

  const availableDoctorCount = filteredDoctors.filter(hasOpenAvailability).length;
  const hasRequiredBookingFilters = Boolean(appointmentMethod && appointmentDate);

  const handleClearAll = () => {
    setSearchTerm("");
    setSpecialty("");
    setAppointmentMethod("");
    setAppointmentDate("");
    setAvailability(AVAILABILITY_DEFAULT);
    setSort(SORT_DEFAULT);
    navigate("/find-doctors", { replace: true });
  };

  return (
    <Page>
      <Navigationbar />

      <HeroSection>
        <Shell>
          <HeroContent>
            <PageTitle>Find a Doctor</PageTitle>
            <PageSubtitle>
              Search our directory to find the right specialist and book your appointment directly.
            </PageSubtitle>
          </HeroContent>

          <ToolbarWrapper>
            <ToolbarCard>
              <ToolbarGrid>
                <InputGroup>
                  <InputLabel>Doctor Name</InputLabel>
                  <InputField>
                    <FaSearch />
                    <input
                      type="text"
                      placeholder="Search by doctor name"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                    />
                  </InputField>
                </InputGroup>

                <InputGroup>
                  <InputLabel>Specialty</InputLabel>
                  <StyledSelect
                    value={specialty}
                    onChange={(event) => {
                      setSpecialty(event.target.value);
                      syncFiltersToUrl({ specialty: event.target.value });
                    }}
                  >
                    <option value="">All specialties</option>
                    {specialtyCatalog.map((item) => (
                      <option key={item.slug} value={item.slug}>
                        {item.name}
                      </option>
                    ))}
                    {discoveredSpecialties
                      .filter(
                        ([slug]) =>
                          !specialtyCatalog.some((item) => item.slug === slug)
                      )
                      .map(([slug, label]) => (
                        <option key={slug} value={slug}>
                          {label}
                        </option>
                      ))}
                  </StyledSelect>
                </InputGroup>

                <InputGroup>
                  <InputLabel>Appointment Method</InputLabel>
                  <StyledSelect
                    value={appointmentMethod}
                    onChange={(event) => {
                      setAppointmentMethod(event.target.value);
                      syncFiltersToUrl({ appointmentMethod: event.target.value });
                    }}
                  >
                    <option value="">Choose method</option>
                    {APPOINTMENT_METHOD_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </StyledSelect>
                </InputGroup>

                <InputGroup>
                  <InputLabel>Date</InputLabel>
                  <StyledDateInput
                    min={todayValue}
                    type="date"
                    value={appointmentDate}
                    onChange={(event) => {
                      setAppointmentDate(event.target.value);
                      syncFiltersToUrl({ appointmentDate: event.target.value });
                    }}
                  />
                </InputGroup>

                <ClearBtn type="button" onClick={handleClearAll}>
                  <FaTimes style={{ fontSize: 12 }} />
                  Clear
                </ClearBtn>
              </ToolbarGrid>

              {activeFilters.length > 0 && (
                <ActiveFiltersBar>
                  <ResultsCount>
                    {hasRequiredBookingFilters
                      ? `${filteredDoctors.length} doctor${filteredDoctors.length !== 1 ? "s" : ""} found`
                      : "Select filters to search"}
                  </ResultsCount>
                  {activeFilters.map((filter) => (
                    <FilterChip key={filter.id} type="button" onClick={filter.onRemove}>
                      {filter.label}
                      <FaTimes />
                    </FilterChip>
                  ))}
                </ActiveFiltersBar>
              )}
            </ToolbarCard>
          </ToolbarWrapper>
        </Shell>
      </HeroSection>

      <ResultsSection>
        <Shell>
          <DirectoryGrid>
            {loading ? (
              <SkeletonLoader />
            ) : error ? (
              <EmptyCard>
                <EmptyIcon>
                  <FaSyncAlt />
                </EmptyIcon>
                <EmptyTitle>Doctor directory is temporarily unavailable</EmptyTitle>
                <EmptyText>{error}</EmptyText>
                <EmptyAction type="button" onClick={() => setRetryToken((value) => value + 1)}>
                  <FaSyncAlt /> Retry directory
                </EmptyAction>
              </EmptyCard>
            ) : !hasRequiredBookingFilters ? (
              <EmptyCard>
                <EmptyIcon>
                  <FaStethoscope />
                </EmptyIcon>
                <EmptyTitle>Choose appointment method and date</EmptyTitle>
                <EmptyText>
                  Select both from the filters above. We'll then list matching doctors and carry
                  those choices into the booking flow automatically.
                </EmptyText>
              </EmptyCard>
            ) : filteredDoctors.length === 0 ? (
              <EmptyCard>
                <EmptyIcon>
                  <FaSearch />
                </EmptyIcon>
                <EmptyTitle>No doctors match these filters</EmptyTitle>
                <EmptyText>
                  Keep the specialty if it came from the assistant, or clear one filter
                  at a time to widen the search without losing your current context.
                </EmptyText>
                <EmptyAction type="button" onClick={handleClearAll}>
                  Reset search
                </EmptyAction>
              </EmptyCard>
            ) : (
              filteredDoctors.map((doctor, index) => {
                const doctorId = getDoctorId(doctor);
                const doctorSpecialty = findSpecialtyByQuery(doctor.specialty);
                const doctorImage = getDoctorImage(doctor);

                return (
                  <DoctorCardComponent
                    key={doctorId}
                    doctor={doctor}
                    doctorId={doctorId}
                    doctorSpecialty={doctorSpecialty}
                    doctorImage={doctorImage}
                    getPrimaryHospital={getPrimaryHospital}
                    appointmentMethod={appointmentMethod}
                    appointmentDate={appointmentDate}
                    index={index}
                  />
                );
              })
            )}
          </DirectoryGrid>
        </Shell>
      </ResultsSection>

      <Footer />
    </Page>
  );
};

export default FindDoctor;
