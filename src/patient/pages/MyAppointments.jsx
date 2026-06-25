import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaCreditCard,
  FaMapMarkerAlt,
  FaReceipt,
  FaUserMd,
  FaVideo,
} from "react-icons/fa";
import { Navigationbar } from "@/shared/components/layout/NavigationBar/Navigationbar";
import Footer from "@/shared/components/layout/Footer/Footer";
import { fetchMyAppointments } from "@/shared/features/Appointments/appointmentClient";
import {
  getVirtualMeetingState,
  mergeAppointmentTimeline,
} from "@/shared/features/booking/appointmentTimeline";
import { fetchMyConsultations } from "@/shared/features/Consultations/consultationClient";
import { getStoredAuthSession } from "@/shared/lib/authSession";

const PageWrapper = styled.div`
  background-color: #f8f9fb;
  min-height: 100vh;
  font-family: "DM Sans", sans-serif;
`;

const Container = styled.div`
  max-width: 1120px;
  margin: 0 auto;
  padding: 40px 20px 64px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-end;
  flex-wrap: wrap;
  margin-bottom: 28px;

  h1 {
    margin: 0;
    font-size: 30px;
    color: #2b3674;
    font-weight: 800;
  }

  p {
    color: #6b7280;
    margin: 8px 0 0;
  }
`;

const Tabs = styled.div`
  display: flex;
  gap: 12px;
`;

const Tab = styled.button`
  padding: 10px 16px;
  border-radius: 999px;
  border: 1px solid ${(props) => (props.$active ? "#683b93" : "#e5e7eb")};
  background: ${(props) => (props.$active ? "#683b93" : "#ffffff")};
  color: ${(props) => (props.$active ? "#ffffff" : "#6b7280")};
  font-weight: 700;
  cursor: pointer;
`;

const AppointmentList = styled.div`
  display: grid;
  gap: 18px;
`;

const AppointmentCard = styled.div`
  background: #ffffff;
  border-radius: 18px;
  padding: 24px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 20px;
  align-items: center;
  border: 1px solid #eef0f6;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.05);

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const IconBox = styled.div`
  width: 58px;
  height: 58px;
  border-radius: 16px;
  background: #f4f0fb;
  color: #683b93;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 23px;
`;

const InfoSection = styled.div`
  min-width: 0;

  h3 {
    margin: 0;
    font-size: 18px;
    color: #111827;
  }

  .doctor {
    margin: 6px 0 0;
    color: #683b93;
    font-weight: 700;
  }

  .details {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    margin-top: 12px;
    color: #6b7280;
    font-size: 14px;
  }

  .details span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
`;

const StatusStack = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;

  @media (max-width: 760px) {
    align-items: flex-start;
  }
`;

const StatusBadge = styled.span`
  padding: 7px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  background: ${(props) => props.$background};
  color: ${(props) => props.$color};
`;

const ActionRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;

  @media (max-width: 760px) {
    justify-content: flex-start;
  }
`;

const ActionButton = styled.button`
  min-height: 40px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid ${(props) => (props.$primary ? "#683b93" : "#e5e7eb")};
  background: ${(props) => (props.$primary ? "#683b93" : "#ffffff")};
  color: ${(props) => (props.$primary ? "#ffffff" : "#683b93")};
  font-weight: 800;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.62;
    border-color: #e5e7eb;
    background: #f8fafc;
    color: #64748b;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 56px 24px;
  background: #ffffff;
  border-radius: 20px;
  border: 1px solid #eef0f6;
  color: #6b7280;

  svg {
    font-size: 42px;
    color: #a3aed0;
    margin-bottom: 12px;
  }

  h3 {
    color: #2b3674;
    margin: 0 0 8px;
  }
`;

const getStatusTone = (appointment) => {
  if (["confirmed", "scheduled", "completed"].includes(appointment.status)) {
    return { background: "#e8f8f5", color: "#16735f" };
  }

  if (appointment.status === "meeting_pending" || appointment.canPay) {
    return { background: "#f3e8ff", color: "#683b93" };
  }

  return { background: "#fff1f2", color: "#be123c" };
};

const MyAppointments = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [appointments, setAppointments] = useState([]);
  const [nowTick, setNowTick] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const user = useMemo(() => {
    return getStoredAuthSession();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowTick(new Date()), 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadAppointments = async () => {
      try {
        setLoading(true);
        setError("");
        const [physicalAppointments, virtualConsultations] = await Promise.all([
          fetchMyAppointments(),
          fetchMyConsultations(),
        ]);

        if (!cancelled) {
          setAppointments(mergeAppointmentTimeline(physicalAppointments, virtualConsultations));
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.response?.data?.message || "Could not load appointments.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadAppointments();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredAppointments = appointments.filter((appointment) =>
    activeTab === "upcoming" ? !appointment.isHistory : appointment.isHistory
  );

  return (
    <PageWrapper>
      <Navigationbar />
      <Container>
        <Header>
          <div>
            <h1>My Appointments</h1>
            <p>
              {user.name ? `${user.name}, ` : ""}your physical visits and virtual consultations.
            </p>
          </div>
          <Tabs>
            <Tab $active={activeTab === "upcoming"} onClick={() => setActiveTab("upcoming")}>
              Upcoming
            </Tab>
            <Tab $active={activeTab === "history"} onClick={() => setActiveTab("history")}>
              History
            </Tab>
          </Tabs>
        </Header>

        {loading ? (
          <EmptyState>
            <FaCalendarAlt />
            <h3>Loading appointments</h3>
            <p>Fetching the latest booking and consultation status.</p>
          </EmptyState>
        ) : error ? (
          <EmptyState>
            <FaCalendarAlt />
            <h3>Appointments unavailable</h3>
            <p>{error}</p>
          </EmptyState>
        ) : filteredAppointments.length === 0 ? (
          <EmptyState>
            <FaCalendarAlt />
            <h3>No appointments found</h3>
            <p>{activeTab === "upcoming" ? "Book your first consultation today." : "Past consultations will appear here."}</p>
          </EmptyState>
        ) : (
          <AppointmentList>
            {filteredAppointments.map((appointment) => {
              const tone = getStatusTone(appointment);
              const meetingState = getVirtualMeetingState(appointment, nowTick);

              return (
                <AppointmentCard key={appointment.id}>
                  <IconBox>
                    {appointment.source === "virtual" ? <FaVideo /> : <FaCalendarAlt />}
                  </IconBox>

                  <InfoSection>
                    <h3>{appointment.typeLabel}</h3>
                    <p className="doctor">
                      <FaUserMd /> {appointment.doctorName}
                    </p>
                    <div className="details">
                      <span>
                        <FaClock /> {appointment.dateLabel} at {appointment.timeLabel}
                      </span>
                      <span>
                        {appointment.source === "virtual" ? <FaVideo /> : <FaMapMarkerAlt />}
                        {appointment.source === "virtual" ? "Secure video" : appointment.venueName}
                      </span>
                      {appointment.queueNumber ? (
                        <span>
                          <FaReceipt /> Queue {appointment.queueNumber}
                        </span>
                      ) : null}
                    </div>
                  </InfoSection>

                  <StatusStack>
                    <StatusBadge $background={tone.background} $color={tone.color}>
                      {appointment.statusLabel}
                    </StatusBadge>
                    <StatusBadge $background="#f8fafc" $color="#475569">
                      {appointment.paymentLabel}
                    </StatusBadge>
                    <ActionRow>
                      {appointment.source === "virtual" && appointment.paymentStatus === "paid" ? (
                        <ActionButton
                          $primary
                          type="button"
                          disabled={meetingState.disabled}
                          onClick={() => navigate(appointment.joinPath)}
                        >
                          <FaVideo /> {meetingState.label}
                        </ActionButton>
                      ) : null}
                      <ActionButton
                        $primary={appointment.canPay}
                        type="button"
                        onClick={() => navigate(appointment.actionUrl)}
                      >
                        {appointment.canPay ? <FaCreditCard /> : <FaCheckCircle />}
                        {appointment.canPay ? "Pay now" : "View status"}
                      </ActionButton>
                    </ActionRow>
                  </StatusStack>
                </AppointmentCard>
              );
            })}
          </AppointmentList>
        )}
      </Container>
      <Footer />
    </PageWrapper>
  );
};

export default MyAppointments;
