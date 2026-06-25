import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { FaArrowRight, FaCalendarAlt, FaUserMd } from "react-icons/fa";
import api from "@/shared/lib/api";
import { useToast } from "@/shared/context/ToastContext";
import { matchesSpecialtyValue, specialtyCatalog } from "@/shared/data/specialties";
import { safeToLocaleDateString } from "@/shared/lib/intlDate";

/* --- Premium Styled Components --- */

const Wrapper = styled.div`
  width: 100%;
  position: relative;
  z-index: 2;
  font-family: "Inter", "DM Sans", sans-serif;
`;

const Card = styled.div`
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding: 36px;
  border-radius: 24px;
  background: #ffffff;
  border: 1px solid rgba(104, 59, 147, 0.08);
  box-shadow: 0 20px 40px rgba(39, 17, 68, 0.06), 0 1px 3px rgba(0, 0, 0, 0.02);

  @media (max-width: 768px) {
    padding: 24px;
    border-radius: 20px;
    gap: 24px;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-start;
  flex-wrap: wrap;

  h4 {
    margin: 0 0 8px;
    color: #111827;
    font-size: clamp(1.5rem, 3vw, 2rem);
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  p {
    margin: 0;
    color: #6b7280;
    max-width: 500px;
    line-height: 1.6;
    font-size: 0.95rem;
  }
`;

const HeaderTools = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 100px;
  background: rgba(104, 59, 147, 0.06);
  color: #683b93;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.02em;
`;

const SecondaryButton = styled.button`
  height: 38px;
  padding: 0 16px;
  border-radius: 100px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  color: #4b5563;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: #111827;
    border-color: #d1d5db;
    background: #f9fafb;
  }
`;

const ToggleContainer = styled.div`
  display: inline-flex;
  padding: 4px;
  border-radius: 12px;
  background: #f3f4f6;
  gap: 4px;
  align-self: flex-start;

  @media (max-width: 768px) {
    width: 100%;
  }
`;

const ToggleButton = styled.button`
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  background: ${(props) => (props.$selected ? "#ffffff" : "transparent")};
  color: ${(props) => (props.$selected ? "#111827" : "#6b7280")};
  font-size: 0.9rem;
  font-weight: ${(props) => (props.$selected ? "700" : "600")};
  cursor: pointer;
  box-shadow: ${(props) => (props.$selected ? "0 2px 4px rgba(0,0,0,0.04)" : "none")};
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    color: ${(props) => (props.$selected ? "#111827" : "#374151")};
  }

  @media (max-width: 768px) {
    flex: 1;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 1140px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    color: #4b5563;
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
`;

const sharedFieldStyles = `
  width: 100%;
  height: 52px;
  border: 1.5px solid #e5e7eb;
  border-radius: 12px;
  background: #f9fafb;
  color: #111827;
  font-size: 0.95rem;
  font-weight: 500;
  outline: none;
  box-sizing: border-box;
  transition: all 0.2s ease;

  &:focus {
    background: #ffffff;
    border-color: #683b93;
    box-shadow: 0 0 0 4px rgba(104, 59, 147, 0.1);
  }

  &:disabled {
    background: #f3f4f6;
    color: #9ca3af;
    border-color: #f3f4f6;
    cursor: not-allowed;
  }
`;

const SelectInput = styled.select`
  ${sharedFieldStyles}
  appearance: none;
  padding: 0 42px 0 16px;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right 16px center;
  background-size: 10px auto;
`;

const DateInput = styled.input`
  ${sharedFieldStyles}
  padding: 0 16px;
`;

const ActionRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 8px;
  padding-top: 24px;
  border-top: 1px solid #f3f4f6;
`;

const CompactSummary = styled.div`
  flex: 1;
  min-width: 240px;
  color: #4b5563;
  font-size: 0.95rem;
  line-height: 1.5;
  display: flex;
  align-items: center;
  gap: 10px;

  svg {
    color: #683b93;
    font-size: 1.2rem;
  }

  strong {
    color: #111827;
    font-weight: 700;
  }
`;

const RequestCard = styled.div`
  padding: 20px 24px;
  border-radius: 16px;
  border: 1px dashed #d1d5db;
  background: #f9fafb;
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 8px;

  h5 {
    margin: 0 0 6px;
    color: #111827;
    font-size: 1.05rem;
    font-weight: 700;
  }

  p {
    margin: 0;
    color: #6b7280;
    line-height: 1.5;
    font-size: 0.95rem;
    max-width: 600px;
  }
`;

const RequestButton = styled.button`
  height: 44px;
  padding: 0 20px;
  border-radius: 10px;
  border: 1.5px solid #e5e7eb;
  background: #ffffff;
  color: #111827;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;

  &:hover {
    border-color: #683b93;
    color: #683b93;
  }
`;

const ContinueButton = styled.button`
  height: 52px;
  min-width: 220px;
  border: none;
  border-radius: 12px;
  background: #683b93;
  color: #ffffff;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.2s ease;
  box-shadow: 0 4px 14px rgba(104, 59, 147, 0.25);

  &:hover {
    background: #552f78;
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(104, 59, 147, 0.3);
  }

  &:disabled {
    cursor: not-allowed;
    background: #9ca3af;
    box-shadow: none;
    transform: none;
  }
`;

/* --- Helpers & Logic --- */

const todayValue = new Date().toISOString().split("T")[0];

const formatDateLabel = (value = "") => {
  if (!value) return "Choose a date";

  return safeToLocaleDateString(`${value}T00:00:00`, "en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }, "Choose a date");
};

const formatTimeLabel = (value = "") => {
  if (!value || !value.includes(":")) return value || "Choose a time";

  const [hourString = "0", minuteString = "00"] = value.split(":");
  const date = new Date();
  date.setHours(Number(hourString), Number(minuteString), 0, 0);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const normalizeConsultationType = (value = "PHYSICAL") =>
  value === "VIRTUAL" ? "VIRTUAL" : "PHYSICAL";

const Hero = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [consultationType, setConsultationType] = useState("PHYSICAL");
  const [specialty, setSpecialty] = useState("");
  const [date, setDate] = useState(todayValue);
  const [doctorId, setDoctorId] = useState("");
  const [doctorOptions, setDoctorOptions] = useState([]);
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [availability, setAvailability] = useState([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedVenue, setSelectedVenue] = useState(null);

  const selectedSpecialty = useMemo(
    () => specialtyCatalog.find((item) => item.slug === specialty) || null,
    [specialty]
  );

  const selectedDoctor = useMemo(
    () => doctorOptions.find((doctor) => String(doctor.id) === String(doctorId)) || null,
    [doctorId, doctorOptions]
  );

  const timeOptions = useMemo(() => {
    const grouped = new Map();

    availability.forEach((entry) => {
      (entry.slots || []).forEach((slot) => {
        const current = grouped.get(slot.time) || [];
        current.push(entry);
        grouped.set(slot.time, current);
      });
    });

    return Array.from(grouped.entries())
      .map(([time, venues]) => ({
        time,
        venues,
        isConflicted: venues.length !== 1,
      }))
      .sort((left, right) => left.time.localeCompare(right.time));
  }, [availability]);

  const noDoctorsAvailable = Boolean(
    specialty && date && !doctorLoading && doctorOptions.length === 0
  );
  const noTimesAvailable = Boolean(
    doctorId && !availabilityLoading && timeOptions.length === 0 && !selectedTime
  );

  const loadDoctorsFromFallback = async () => {
    const { data } = await api.get("/doctor");
    const filteredDoctors = data.filter((doctor) =>
      matchesSpecialtyValue(doctor.specialty, selectedSpecialty?.name || specialty)
    );

    if (!filteredDoctors.length) {
      return [];
    }

    const availabilityResponses = await Promise.all(
      filteredDoctors.map(async (doctor) => {
        try {
          const { data: doctorAvailability } = await api.get(`/doctor/${doctor.id}/availability`, {
            params: { date, consultationType },
          });

          const slotCount = (doctorAvailability || []).reduce(
            (total, entry) => total + (entry.slots || []).length,
            0
          );

          if (!slotCount) {
            return null;
          }

          return {
            ...doctor,
            slotCount,
          };
        } catch {
          return null;
        }
      })
    );

    return availabilityResponses
      .filter(Boolean)
      .sort((left, right) => right.slotCount - left.slotCount);
  };

  useEffect(() => {
    if (!specialty || !date) {
      setDoctorOptions([]);
      return;
    }

    let cancelled = false;

    const loadDoctors = async () => {
      setDoctorLoading(true);

      try {
        const { data } = await api.get("/doctor/booking/options", {
          params: {
            specialty: selectedSpecialty?.name || specialty,
            date,
            consultationType,
          },
        });

        if (!cancelled) {
          setDoctorOptions(data);
        }
      } catch (loadError) {
        try {
          const fallbackDoctors = await loadDoctorsFromFallback();

          if (!cancelled) {
            setDoctorOptions(fallbackDoctors);
          }

          if (fallbackDoctors.length) {
            toast.info(
              "Doctor search is temporarily limited. Showing available doctors we can load right now."
            );
          }
        } catch {
          if (!cancelled) {
            setDoctorOptions([]);
          }
          toast.error(
            loadError.response?.data?.message ||
              "We could not load available doctors right now. Please try again."
          );
        }
      } finally {
        if (!cancelled) {
          setDoctorLoading(false);
        }
      }
    };

    loadDoctors();

    return () => {
      cancelled = true;
    };
  }, [consultationType, date, selectedSpecialty, specialty]);

  useEffect(() => {
    if (!doctorId || !date) {
      setAvailability([]);
      return;
    }

    let cancelled = false;

    const loadAvailability = async () => {
      setAvailabilityLoading(true);

      try {
        const { data } = await api.get(`/doctor/${doctorId}/availability`, {
          params: { date, consultationType },
        });

        if (!cancelled) {
          setAvailability(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setAvailability([]);
        }
        toast.error(
          loadError.response?.data?.message ||
            "We could not load doctor times right now. Please try again."
        );
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
  }, [consultationType, date, doctorId]);

  useEffect(() => {
    if (!selectedTime) {
      setSelectedVenue(null);
      return;
    }

    const matchedVenues = availability.filter((entry) =>
      (entry.slots || []).some((slot) => slot.time === selectedTime)
    );

    if (matchedVenues.length === 1) {
      setSelectedVenue(matchedVenues[0]);
      return;
    }

    setSelectedVenue(null);
  }, [availability, selectedTime]);

  const resetAll = () => {
    setConsultationType("PHYSICAL");
    setSpecialty("");
    setDate(todayValue);
    setDoctorId("");
    setDoctorOptions([]);
    setAvailability([]);
    setSelectedTime("");
    setSelectedVenue(null);
  };

  const openRequestPage = () => {
    const params = new URLSearchParams({
      type: "appointment-request",
      consultationType,
      specialty: selectedSpecialty?.name || "",
      doctor: selectedDoctor?.name || "",
      date,
    });

    navigate(`/contact-us?${params.toString()}`);
  };

  const handleConsultationTypeChange = (value) => {
    const normalized = normalizeConsultationType(value);

    if (normalized === "VIRTUAL") {
      const params = new URLSearchParams({
        specialty: selectedSpecialty?.slug || specialty || "",
        date,
        doctorId,
      });

      navigate(`/virtual-consultation?${params.toString()}`);
      return;
    }

    setConsultationType(normalized);
    setDoctorId("");
    setAvailability([]);
    setSelectedTime("");
    setSelectedVenue(null);
  };

  const handleSpecialtyChange = (event) => {
    setSpecialty(event.target.value);
    setDoctorId("");
    setAvailability([]);
    setSelectedTime("");
    setSelectedVenue(null);
  };

  const handleDateChange = (event) => {
    setDate(event.target.value);
    setDoctorId("");
    setAvailability([]);
    setSelectedTime("");
    setSelectedVenue(null);
  };

  const handleDoctorChange = (event) => {
    setDoctorId(event.target.value);
    setSelectedTime("");
    setSelectedVenue(null);
  };

  const handleTimeChange = (event) => {
    const nextTime = event.target.value;
    const option = timeOptions.find((item) => item.time === nextTime);

    setSelectedTime(nextTime);

    if (option?.isConflicted) {
      setSelectedVenue(null);
      toast.warning(
        "This doctor has multiple venues published for this time. Please contact support to resolve the schedule before booking."
      );
      return;
    }
  };

  const continueToBooking = () => {
    if (!selectedDoctor || !selectedVenue || !selectedTime) {
      return;
    }

    const params = new URLSearchParams({
      doctorId: selectedDoctor.id,
      doctorName: selectedDoctor.name,
      specialty: selectedDoctor.specialty,
      consultationType,
      date,
      timeSlot: selectedTime,
      hospitalId: selectedVenue.hospitalId,
      hospitalName: selectedVenue.hospitalName,
    });

    navigate(`/appointment?${params.toString()}`);
  };

  return (
    <Wrapper id="booking-hero">
      <Card>
        <Header>
          <div>
            <h4>Book an Appointment</h4>
            <p>
              Schedule your next visit with ease. Choose a specialty, pick a date, and select an available specialist to confirm your booking.
            </p>
          </div>

          <HeaderTools>
            <Badge>
              <FaCalendarAlt size={12} />
              {consultationType === "VIRTUAL" ? "Online Consultation" : "In-Person Clinic"}
            </Badge>
            <SecondaryButton type="button" onClick={resetAll}>
              Clear selection
            </SecondaryButton>
          </HeaderTools>
        </Header>

        <ToggleContainer>
          <ToggleButton
            type="button"
            $selected={consultationType === "PHYSICAL"}
            onClick={() => handleConsultationTypeChange("PHYSICAL")}
          >
            Physical Visit
          </ToggleButton>
          <ToggleButton
            type="button"
            $selected={consultationType === "VIRTUAL"}
            onClick={() => handleConsultationTypeChange("VIRTUAL")}
          >
            Virtual Visit
          </ToggleButton>
        </ToggleContainer>

        <Grid>
          <Field>
            <label htmlFor="hero-specialty">Specialty</label>
            <SelectInput id="hero-specialty" value={specialty} onChange={handleSpecialtyChange}>
              <option value="">Select a specialty...</option>
              {specialtyCatalog.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </SelectInput>
          </Field>

          <Field>
            <label htmlFor="hero-date">Date</label>
            <DateInput
              id="hero-date"
              min={todayValue}
              type="date"
              value={date}
              onChange={handleDateChange}
            />
          </Field>

          <Field>
            <label htmlFor="hero-doctor">Specialist</label>
            <SelectInput
              id="hero-doctor"
              disabled={!specialty || !date || doctorLoading}
              value={doctorId}
              onChange={handleDoctorChange}
            >
              <option value="">
                {!specialty
                  ? "Choose a specialty first"
                  : doctorLoading
                    ? "Loading available doctors..."
                    : doctorOptions.length
                      ? "Select an available doctor"
                      : "No doctors available"}
              </option>
              {doctorOptions.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name} • {doctor.slotCount} slot{doctor.slotCount === 1 ? "" : "s"}
                </option>
              ))}
            </SelectInput>
          </Field>

          <Field>
            <label htmlFor="hero-time">Time</label>
            <SelectInput
              id="hero-time"
              disabled={!doctorId || availabilityLoading}
              value={selectedTime}
              onChange={handleTimeChange}
            >
              <option value="">
                {!doctorId
                  ? "Choose a doctor first"
                  : availabilityLoading
                    ? "Loading time slots..."
                    : timeOptions.length
                      ? "Select a time slot"
                      : "No times available"}
              </option>
              {timeOptions.map((option) => (
                <option key={option.time} disabled={option.isConflicted} value={option.time}>
                  {formatTimeLabel(option.time)}
                  {option.isConflicted ? " (Venue conflict)" : ""}
                </option>
              ))}
            </SelectInput>
          </Field>
        </Grid>

        {noDoctorsAvailable && (
          <RequestCard>
            <div>
              <h5>No specialists found for this date</h5>
              <p>
                Can't find an available doctor? Send us a request and our team will help arrange a suitable alternative.
              </p>
            </div>
            <RequestButton type="button" onClick={openRequestPage}>
              Make a request <FaArrowRight size={12} />
            </RequestButton>
          </RequestCard>
        )}

        {noTimesAvailable && (
          <RequestCard>
            <div>
              <h5>No available time slots</h5>
              <p>
                The selected specialist is fully booked for this day. You can request help to find an alternate time.
              </p>
            </div>
            <RequestButton type="button" onClick={openRequestPage}>
              Make a request <FaArrowRight size={12} />
            </RequestButton>
          </RequestCard>
        )}

        {selectedVenue && selectedDoctor && selectedTime && (
          <ActionRow>
            <CompactSummary>
              <FaUserMd />
              <div>
                <strong>{selectedDoctor.name}</strong> • {formatDateLabel(date)} at{" "}
                {formatTimeLabel(selectedTime)}
                <br />
                {selectedVenue?.hospitalName && <span>{selectedVenue.hospitalName}</span>}
                {selectedVenue?.location && <span> ({selectedVenue.location})</span>}
              </div>
            </CompactSummary>

            <ContinueButton type="button" onClick={continueToBooking}>
              Continue to Booking <FaArrowRight size={14} />
            </ContinueButton>
          </ActionRow>
        )}
      </Card>
    </Wrapper>
  );
};

export default Hero;