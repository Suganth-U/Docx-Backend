import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { io } from "socket.io-client";
import styled, { keyframes } from "styled-components";
import {
  FaCheckCircle,
  FaPlus,
  FaTrashAlt,
  FaVideo,
  FaRegCalendarAlt,
  FaRegClock,
  FaUserCircle,
  FaRegEnvelope,
  FaMoneyBillWave,
  FaAngleRight,
} from "react-icons/fa";
import useAxiosPrivate from "@/shared/hooks/useAxiosPrivate";
import { useToast } from "@/shared/context/ToastContext";
import { API_ORIGIN } from "@/shared/lib/apiBase";
import { getStoredAuthSession } from "@/shared/lib/authSession";
import { safeToLocaleDateString } from "@/shared/lib/intlDate";
import { getVirtualMeetingState } from "@/shared/features/booking/appointmentTimeline";

// --- Helpers ---
const dayOptions = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const formatDateLabel = (value = "") => {
  if (!value) return "Pending";
  return safeToLocaleDateString(
    value,
    "en-US",
    {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    },
    "Pending"
  );
};

const formatTimeLabel = (value = "") => {
  if (!value || !value.includes(":")) return value || "Pending";
  const [hourString = "0", minuteString = "00"] = value.split(":");
  const date = new Date();
  date.setHours(Number(hourString), Number(minuteString), 0, 0);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const statusConfig = {
  requested: { background: "#fffaf0", color: "#d97706", label: "Requested", border: "#fde68a" },
  approved: { background: "#eff6ff", color: "#2563eb", label: "Approved", border: "#bfdbfe" },
  scheduled: { background: "#f0fdf4", color: "#16a34a", label: "Scheduled", border: "#bbf7d0" },
  meeting_pending: { background: "#faf5ff", color: "#9333ea", label: "Meeting pending", border: "#e9d5ff" },
  rejected: { background: "#fef2f2", color: "#dc2626", label: "Rejected", border: "#fecaca" },
  completed: { background: "#f0fdf4", color: "#16a34a", label: "Completed", border: "#bbf7d0" },
  cancelled: { background: "#fef2f2", color: "#dc2626", label: "Cancelled", border: "#fecaca" },
  expired: { background: "#f8fafc", color: "#64748b", label: "Hold expired", border: "#e2e8f0" },
};

// --- Animations ---
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;

// --- Premium Styled Components ---
const PageWrapper = styled.div`
  min-height: 100vh;
  background: #fdfdfd;
  font-family: "Inter", "DM Sans", sans-serif;
  padding: 40px 0;
`;

const Shell = styled.div`
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 40px;
  display: grid;
  gap: 40px;
  color: #111827;
`;

const HeaderCard = styled.div`
  background: #ffffff;
  border-radius: 20px;
  padding: 40px 48px;
  color: #111827;
  border: 1px solid #e5e7eb;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 6px;
    height: 100%;
    background: linear-gradient(180deg, #683b93 0%, #a855f7 100%);
  }

  h1 {
    margin: 0;
    font-size: clamp(2rem, 4vw, 2.5rem);
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #111827;
  }

  p {
    margin: 0;
    color: #6b7280;
    line-height: 1.6;
    max-width: 800px;
    font-size: 1.05rem;
  }
`;

const Layout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 40px;
`;

const Card = styled.section`
  padding: 40px;
  border-radius: 20px;
  background: #ffffff;
  border: 1px solid #f3f4f6;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.03);
  display: grid;
  gap: 32px;
  animation: ${fadeIn} 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;

  @media (max-width: 640px) {
    padding: 24px;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  flex-wrap: wrap;

  h2 {
    margin: 0 0 8px;
    color: #111827;
    font-size: 1.4rem;
    font-weight: 800;
    letter-spacing: -0.01em;
  }

  p {
    margin: 0;
    color: #6b7280;
    line-height: 1.6;
    font-size: 0.95rem;
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
    letter-spacing: 0.06em;
  }

  textarea {
    width: 100%;
    min-height: 120px;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    background: #fdfdfd;
    padding: 16px;
    color: #111827;
    font-size: 0.95rem;
    font-family: inherit;
    transition: all 0.2s ease;
    resize: vertical;

    &:focus {
      outline: none;
      background: #ffffff;
      border-color: #683b93;
      box-shadow: 0 0 0 4px rgba(104, 59, 147, 0.08);
    }
  }
`;

const ActionButton = styled.button`
  min-height: 52px;
  border-radius: 12px;
  background: ${(props) => (props.$secondary ? "#ffffff" : "#111827")};
  color: ${(props) => (props.$secondary ? "#4b5563" : "#ffffff")};
  border: 1px solid ${(props) => (props.$secondary ? "#e5e7eb" : "transparent")};
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  padding: 0 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${(props) => (props.$secondary ? "#f9fafb" : "#000000")};
    color: ${(props) => (props.$secondary ? "#111827" : "#ffffff")};
    transform: translateY(-2px);
    box-shadow: ${(props) => (props.$secondary ? "0 4px 6px rgba(0,0,0,0.02)" : "0 8px 16px rgba(0,0,0,0.12)")};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
    transform: none;
    box-shadow: none;
  }
`;

const ConsultationCard = styled.div`
  padding: 28px;
  border-radius: 16px;
  border: 1px solid #f3f4f6;
  background: #ffffff;
  display: grid;
  gap: 24px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);

  &:hover {
    border-color: #e5e7eb;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
  }
`;

const MetaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  background: #fafafa;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid #f3f4f6;
`;

const MetaItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0; 

  span {
    color: #6b7280;
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  strong {
    color: #111827;
    font-size: 0.95rem;
    font-weight: 600;
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const SlotRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;

const SlotChip = styled.button`
  min-height: 44px;
  padding: 0 20px;
  border-radius: 8px;
  border: 1px solid ${(props) => (props.$selected ? "#683b93" : "#e5e7eb")};
  background: ${(props) => (props.$selected ? "#faf5ff" : "#ffffff")};
  color: ${(props) => (props.$selected ? "#683b93" : "#4b5563")};
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.2s ease;

  &:hover {
    border-color: #683b93;
    color: #683b93;
  }
`;

const StatusPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  padding: 6px 14px;
  border-radius: 100px;
  background: ${(props) => props.$background};
  color: ${(props) => props.$color};
  border: 1px solid ${(props) => props.$border};
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const EmptyState = styled.div`
  padding: 40px 24px;
  border-radius: 16px;
  border: 1px dashed #e5e7eb;
  background: #fafafa;
  color: #6b7280;
  text-align: center;
  font-size: 0.95rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;

  svg {
    font-size: 2.5rem;
    color: #d1d5db;
  }
`;

const ScrollableList = styled.div`
  display: grid;
  gap: 24px;
  max-height: 700px;
  overflow-y: auto;
  padding-right: 12px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: #e5e7eb;
    border-radius: 10px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #d1d5db;
  }
`;

const Sessions = () => {
  const axiosPrivate = useAxiosPrivate();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [selectionState, setSelectionState] = useState({});
  const [noteState, setNoteState] = useState({});
  const [nowTick, setNowTick] = useState(() => new Date());
  const searchTerm = searchParams.get("search") || "";

  const matchesConsultationSearch = (consultation) => {
    if (!searchTerm.trim()) return true;

    const haystack = [
      consultation.consultationNumber,
      consultation.patient?.name,
      consultation.patient?.email,
      consultation.doctor?.specialty,
      consultation.status,
      consultation.paymentStatus,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(searchTerm.trim().toLowerCase());
  };

  const pendingRequests = useMemo(
    () => consultations.filter((consultation) => consultation.status === "requested" && matchesConsultationSearch(consultation)),
    [consultations, searchTerm]
  );

  const activeConsultations = useMemo(
    () => consultations.filter((consultation) => consultation.status !== "requested" && matchesConsultationSearch(consultation)),
    [consultations, searchTerm]
  );

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: consultationData } = await axiosPrivate.get("/consultations");

      setConsultations(consultationData);
      setSelectionState((current) => {
        const next = { ...current };

        consultationData.forEach((consultation) => {
          if (!next[consultation.id]) {
            next[consultation.id] =
              consultation.approvalOptions?.availableSlots?.includes(
                consultation.requestedTimeSlot
              )
                ? consultation.requestedTimeSlot
                : consultation.approvalOptions?.availableSlots?.[0] || "";
          }
        });

        return next;
      });
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "We could not load the virtual consultation workspace."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowTick(new Date()), 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let token = "";
    token = getStoredAuthSession().accessToken || "";

    if (!token) return undefined;

    const socket = io(API_ORIGIN || undefined, {
      path: "/socket.io",
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socket.on("consultation:updated", () => {
      loadData();
    });

    return () => socket.disconnect();
  }, []);

  const handleRespond = async (consultation, action) => {
    setActionLoading(`${consultation.id}:${action}`);

    try {
      if (action === "approve" && !selectionState[consultation.id]) {
        toast.warning("Choose one available slot before approving the request.");
        return;
      }

      await axiosPrivate.put(`/consultations/${consultation.id}/respond`, {
        action,
        approvedDate: consultation.requestedDateKey,
        approvedTimeSlot: selectionState[consultation.id],
        note: noteState[consultation.id] || "",
      });

      toast.success(
        action === "approve"
          ? "Consultation approved and opened for payment."
          : "Consultation request rejected."
      );
      loadData();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          `We could not ${action} this consultation right now.`
      );
    } finally {
      setActionLoading("");
    }
  };

  return (
    <PageWrapper>
      <Shell>
        <HeaderCard>
          <h1>Consultation Workspace</h1>
          <p>
            Manage your recurring virtual hours, review patient requests, approve
            slots, and connect securely to scheduled video sessions—all from one clean dashboard.
          </p>
        </HeaderCard>

        <Layout>
          <div style={{ display: "grid", gap: 40 }}>
            
            {/* Pending Requests */}
            <Card>
              <SectionHeader>
                <div>
                  <h2>Pending Patient Requests</h2>
                  <p>Review patient details and assign a final 20-minute slot.</p>
                </div>
              </SectionHeader>

              {loading ? (
                <EmptyState>Loading requests...</EmptyState>
              ) : pendingRequests.length === 0 ? (
                <EmptyState>
                  <FaUserCircle />
                  You have no pending requests to review.
                </EmptyState>
              ) : (
                <ScrollableList>
                  {pendingRequests.map((consultation) => (
                    <ConsultationCard key={consultation.id}>
                      <SectionHeader>
                        <div style={{ minWidth: 0 }}>
                          <h2 style={{ fontSize: "1.4rem", margin: "0 0 6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: "700" }}>
                            {consultation.patient.name}
                          </h2>
                          <p style={{ fontSize: "0.85rem", color: "#9ca3af", fontWeight: "500" }}>Ref: {consultation.consultationNumber}</p>
                        </div>
                        <StatusPill
                          $background={statusConfig.requested.background}
                          $color={statusConfig.requested.color}
                          $border={statusConfig.requested.border}
                        >
                          {statusConfig.requested.label}
                        </StatusPill>
                      </SectionHeader>

                      <MetaGrid>
                        <MetaItem>
                          <span><FaRegCalendarAlt /> Date & Time</span>
                          <strong>
                            {formatDateLabel(consultation.requestedDate)}
                            {consultation.requestedTimeSlot ? ` at ${formatTimeLabel(consultation.requestedTimeSlot)}` : " (Flexible)"}
                          </strong>
                        </MetaItem>
                        <MetaItem title={consultation.patient.email}>
                          <span><FaRegEnvelope /> Contact</span>
                          <strong>{consultation.patient.email || "Not provided"}</strong>
                        </MetaItem>
                        <MetaItem>
                          <span><FaMoneyBillWave /> Fee</span>
                          <strong>LKR {Number(consultation.amount || 0).toFixed(2)}</strong>
                        </MetaItem>
                      </MetaGrid>

                      {consultation.requestNote && (
                        <div style={{ background: '#fffbeb', padding: '16px 20px', borderRadius: '12px', borderLeft: '4px solid #f59e0b', fontSize: '0.95rem', color: '#92400e', lineHeight: '1.6' }}>
                          <strong>Patient Note: </strong> {consultation.requestNote}
                        </div>
                      )}

                      <Field>
                        <label>Assign a Time Slot</label>
                        {consultation.approvalOptions?.availableSlots?.length ? (
                          <SlotRow>
                            {consultation.approvalOptions.availableSlots.map((slot) => (
                              <SlotChip
                                key={`${consultation.id}-${slot}`}
                                type="button"
                                $selected={selectionState[consultation.id] === slot}
                                onClick={() => setSelectionState((c) => ({ ...c, [consultation.id]: slot }))}
                              >
                                {formatTimeLabel(slot)}
                              </SlotChip>
                            ))}
                          </SlotRow>
                        ) : (
                          <EmptyState style={{ padding: '20px', fontSize: '0.9rem', color: '#6b7280' }}>
                            No open slots available on this date. Update your schedule blocks first.
                          </EmptyState>
                        )}
                      </Field>

                      <Field>
                        <label>Reply Note (Optional)</label>
                        <textarea
                          placeholder="Add instructions or a message for the patient..."
                          value={noteState[consultation.id] || ""}
                          onChange={(e) => setNoteState((c) => ({ ...c, [consultation.id]: e.target.value }))}
                        />
                      </Field>

                      <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                        <ActionButton
                          type="button"
                          style={{ flex: 1, background: '#111827', color: '#ffffff' }}
                          onClick={() => handleRespond(consultation, "approve")}
                          disabled={actionLoading === `${consultation.id}:approve`}
                        >
                          <FaCheckCircle />
                          {actionLoading === `${consultation.id}:approve` ? "Processing..." : "Approve & Open Payment"}
                        </ActionButton>
                        <ActionButton
                          type="button"
                          $secondary
                          onClick={() => handleRespond(consultation, "reject")}
                          disabled={actionLoading === `${consultation.id}:reject`}
                        >
                          Decline
                        </ActionButton>
                      </div>
                    </ConsultationCard>
                  ))}
                </ScrollableList>
              )}
            </Card>

            {/* Active Consultations */}
            <Card>
              <SectionHeader>
                <div>
                  <h2>Active Consultations</h2>
                  <p>Track payment status and join upcoming secure video sessions.</p>
                </div>
              </SectionHeader>

              {loading ? (
                <EmptyState>Loading active sessions...</EmptyState>
              ) : activeConsultations.length === 0 ? (
                <EmptyState>
                  <FaVideo />
                  You have no upcoming scheduled sessions.
                </EmptyState>
              ) : (
                <ScrollableList>
                  {activeConsultations.map((consultation) => {
                    const status = statusConfig[consultation.status] || statusConfig.approved;
                    const meetingState = getVirtualMeetingState(
                      {
                        source: "virtual",
                        status: consultation.status,
                        paymentStatus: consultation.paymentStatus,
                        canPay: consultation.canPay,
                        meetingJoinOpensAt: consultation.meeting?.joinOpensAt,
                        meetingJoinClosesAt: consultation.meeting?.joinClosesAt,
                      },
                      nowTick
                    );

                    return (
                      <ConsultationCard key={consultation.id}>
                        <SectionHeader>
                          <div style={{ minWidth: 0 }}>
                            <h2 style={{ fontSize: "1.4rem", margin: "0 0 6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: "700" }}>
                              {consultation.patient.name}
                            </h2>
                            <p style={{ fontSize: "0.85rem", color: "#9ca3af", fontWeight: "500" }}>Ref: {consultation.consultationNumber}</p>
                          </div>
                          <StatusPill
                            $background={status.background}
                            $color={status.color}
                            $border={status.border}
                          >
                            {status.label}
                          </StatusPill>
                        </SectionHeader>

                        <MetaGrid>
                          <MetaItem>
                            <span><FaRegCalendarAlt /> Scheduled For</span>
                            <strong>
                              {consultation.approvedDate ? formatDateLabel(consultation.approvedDate) : "Pending Date"}
                              {consultation.approvedTimeSlot ? ` • ${formatTimeLabel(consultation.approvedTimeSlot)}` : ""}
                            </strong>
                          </MetaItem>
                          <MetaItem>
                            <span><FaMoneyBillWave /> Payment Status</span>
                            <strong style={{ color: consultation.paymentStatus === 'paid' ? '#059669' : '#111827', textTransform: 'capitalize' }}>
                              {consultation.paymentStatus}
                            </strong>
                          </MetaItem>
                        </MetaGrid>

                        {consultation.status === "scheduled" && consultation.paymentStatus === "paid" ? (
                          <ActionButton
                            type="button"
                            style={{ 
                              background: meetingState.disabled ? '#f3f4f6' : '#10b981', 
                              color: meetingState.disabled ? '#9ca3af' : '#ffffff',
                              border: meetingState.disabled ? '1px solid #e5e7eb' : 'none',
                              boxShadow: meetingState.disabled ? 'none' : '0 8px 16px rgba(16, 185, 129, 0.2)'
                            }}
                            disabled={meetingState.disabled}
                            onClick={() => navigate(`/virtual-consultation/meeting/${consultation.id}`)}
                          >
                            <FaVideo />
                            {meetingState.label}
                          </ActionButton>
                        ) : (
                          <EmptyState style={{ padding: '20px', fontSize: '0.9rem', flexDirection: 'row', justifyContent: 'center', background: '#fafafa' }}>
                            {consultation.status === "meeting_pending"
                              ? "Meeting room generation in progress..."
                              : consultation.status === "expired"
                                ? "Payment window expired."
                              : "Join access unlocks after payment and within the meeting window."}
                          </EmptyState>
                        )}
                      </ConsultationCard>
                    );
                  })}
                </ScrollableList>
              )}
            </Card>
          </div>
        </Layout>
      </Shell>
    </PageWrapper>
  );
};

export default Sessions;
