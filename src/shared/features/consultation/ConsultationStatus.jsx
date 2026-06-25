import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaCreditCard,
  FaExternalLinkAlt,
  FaSyncAlt,
  FaRegCalendarAlt,
  FaRegClock,
} from "react-icons/fa";
import {
  createConsultationStripeSession,
  fetchConsultationDetail,
  payConsultation,
  verifyConsultationStripeSession,
} from "@/shared/features/Consultations/consultationClient";
import { isDemoPaymentAvailable } from "@/shared/features/Appointments/appointmentClient";
import { getVirtualMeetingState } from "@/shared/features/booking/appointmentTimeline";
import { useToast } from "@/shared/context/ToastContext";
import { API_ORIGIN } from "@/shared/lib/apiBase";
import { getStoredAuthSession } from "@/shared/lib/authSession";
import { safeToLocaleDateString } from "@/shared/lib/intlDate";

// --- Helpers ---
const formatDateLabel = (value = "") => {
  if (!value) return "Pending";
  return safeToLocaleDateString(value, "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }, "Pending");
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

const formatDateTimeLabel = (value = "") => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${safeToLocaleDateString(value, "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }, "")} at ${date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })}`;
};

const statusConfig = {
  requested: {
    label: "Awaiting doctor review",
    background: "rgba(255, 255, 255, 0.15)",
    color: "#ffffff",
    border: "rgba(255, 255, 255, 0.3)",
  },
  approved: {
    label: "Payment Pending",
    background: "#3b82f6",
    color: "#ffffff",
    border: "#2563eb",
  },
  scheduled: {
    label: "Meeting Scheduled",
    background: "#10b981",
    color: "#ffffff",
    border: "#059669",
  },
  meeting_pending: {
    label: "Setting up Meeting",
    background: "#8b5cf6",
    color: "#ffffff",
    border: "#7c3aed",
  },
  rejected: {
    label: "Not Approved",
    background: "#ef4444",
    color: "#ffffff",
    border: "#dc2626",
  },
  completed: {
    label: "Completed",
    background: "#10b981",
    color: "#ffffff",
    border: "#059669",
  },
  cancelled: {
    label: "Cancelled",
    background: "#ef4444",
    color: "#ffffff",
    border: "#dc2626",
  },
  expired: {
    label: "Hold Expired",
    background: "#64748b",
    color: "#ffffff",
    border: "#475569",
  },
};

const paymentLabels = {
  awaiting_approval: "Waiting for doctor approval",
  pending: "Payment pending",
  paid: "Paid Successfully",
  failed: "Payment failed",
  canceled: "Payment canceled",
  expired: "Hold expired",
  refunded: "Refunded",
};

// --- Premium Styled Components ---
const Page = styled.div`
  min-height: 100vh;
  background: #ffff;
  padding: 40px 5% 64px;
  font-family: "Inter", "DM Sans", sans-serif;
`;

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 28px;
`;

const TopRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
`;

const GhostAction = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 16px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  color: #4b5563;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

  &:hover {
    color: #111827;
    border-color: #d1d5db;
    background: #f9fafb;
  }
`;

const Hero = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(300px, 0.8fr);
  gap: 32px;
  padding: 40px;
  border-radius: 24px;
  background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
  color: #ffffff;
  box-shadow: 0 20px 40px rgba(30, 27, 75, 0.15);

  @media (max-width: 920px) {
    grid-template-columns: 1fr;
    padding: 32px 24px;
  }
`;

const HeroText = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;

  h1 {
    margin: 16px 0 12px;
    font-size: clamp(2rem, 3.5vw, 2.5rem);
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.1;
  }

  p {
    margin: 0;
    color: #cbd5e1;
    font-size: 1.05rem;
    line-height: 1.6;
    max-width: 560px;
  }
`;

const StatusPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 100px;
  background: ${(props) => props.$background};
  color: ${(props) => props.$color};
  border: 1px solid ${(props) => props.$border};
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  align-self: flex-start;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const HeroMeta = styled.div`
  padding: 24px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  display: grid;
  gap: 20px;

  .meta-item {
    display: flex;
    flex-direction: column;
    gap: 4px;

    span {
      color: #94a3b8;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
    }

    strong {
      color: #ffffff;
      font-size: 1.1rem;
      font-weight: 500;
    }
  }
`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(340px, 0.8fr);
  gap: 28px;
  align-items: start;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const Column = styled.div`
  display: grid;
  gap: 28px;
`;

const Card = styled.section`
  padding: 32px;
  border-radius: 20px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);

  @media (max-width: 640px) {
    padding: 24px;
  }
`;

const SectionHeader = styled.div`
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f3f4f6;

  h2 {
    margin: 0 0 6px;
    color: #111827;
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  p {
    margin: 0;
    color: #6b7280;
    font-size: 0.95rem;
    line-height: 1.5;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const MetaCard = styled.div`
  padding: 16px 20px;
  border-radius: 12px;
  background: #f9fafb;
  border: 1px solid #f3f4f6;
  display: flex;
  flex-direction: column;
  gap: 4px;

  span {
    color: #6b7280;
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  strong {
    color: #111827;
    font-size: 1.05rem;
    font-weight: 600;
  }

  p {
    margin: 0;
    color: #4b5563;
    font-size: 0.9rem;
  }
`;

const Alert = styled.div`
  padding: 20px;
  border-radius: 12px;
  border-left: 4px solid ${(props) => props.$accent || "#e5e7eb"};
  background: ${(props) => props.$background || "#f9fafb"};
  color: ${(props) => props.$color || "#374151"};
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.95rem;
  line-height: 1.6;

  strong {
    color: #111827;
    font-size: 1rem;
    font-weight: 600;
  }
`;

const ActionButton = styled.button`
  height: 52px;
  border: none;
  border-radius: 12px;
  background: ${(props) => (props.$secondary ? "#f3f4f6" : "#4f46e5")};
  color: ${(props) => (props.$secondary ? "#111827" : "#ffffff")};
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  transition: all 0.2s ease;
  box-shadow: ${(props) => (props.$secondary ? "none" : "0 4px 14px rgba(79, 70, 229, 0.3)")};

  &:hover:not(:disabled) {
    background: ${(props) => (props.$secondary ? "#e5e7eb" : "#4338ca")};
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
  }
`;

const EmptyState = styled.div`
  padding: 40px;
  border-radius: 20px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  color: #4b5563;
  text-align: center;
  font-size: 1.1rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
`;

const ConsultationStatus = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [nowTick, setNowTick] = useState(() => new Date());
  const [error, setError] = useState("");
  const [gatewayVerified, setGatewayVerified] = useState(false);
  const demoPaymentEnabled = useMemo(() => isDemoPaymentAvailable(), []);

  const paymentQuery = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const isPaymentSubmitted = useMemo(() => {
    return paymentQuery.get("payment") === "submitted";
  }, [paymentQuery]);

  const paymentProvider = paymentQuery.get("provider");
  const stripeSessionId = paymentQuery.get("session_id");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("created") !== "1") return;

    const toastKey = `consultation-created-toast:${id}`;
    if (window.sessionStorage.getItem(toastKey) !== "shown") {
      toast.success("Your slot is held. Complete payment to confirm your booking.");
      window.sessionStorage.setItem(toastKey, "shown");
    }

    params.delete("created");
    navigate(
      {
        pathname: location.pathname,
        search: params.toString() ? `?${params.toString()}` : "",
      },
      { replace: true }
    );
  }, [id, location.pathname, location.search, navigate, toast]);

  const loadConsultation = useCallback(async (withSpinner = true) => {
    try {
      if (withSpinner) setLoading(true);
      else setRefreshing(true);

      const data = await fetchConsultationDetail(id);
      setConsultation(data);
      setError("");
      return data;
    } catch (loadError) {
      setError(
        loadError.response?.data?.message ||
          "We could not load the consultation status right now."
      );
      return null;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { loadConsultation(); }, [loadConsultation]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowTick(new Date()), 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let token = "";
    token = getStoredAuthSession().accessToken || "";
    if (!token) return undefined;

    const socket = io(API_ORIGIN || undefined, {
      path: "/socket.io", auth: { token }, transports: ["websocket", "polling"],
    });

    socket.on("consultation:updated", (payload) => {
      if (String(payload?.id || payload?.consultationId || "") === String(id)) {
        loadConsultation(false);
      }
    });

    return () => socket.disconnect();
  }, [id, loadConsultation]);

  useEffect(() => {
    if (!isPaymentSubmitted) return undefined;

    let attempts = 0;
    const interval = window.setInterval(async () => {
      attempts += 1;
      const data = await loadConsultation(false);

      if (
        !data ||
        data.status === "scheduled" ||
        data.status === "meeting_pending" ||
        data.paymentStatus === "failed" ||
        data.paymentStatus === "canceled" ||
        attempts >= 10
      ) {
        window.clearInterval(interval);
      }
    }, 4000);

    return () => window.clearInterval(interval);
  }, [isPaymentSubmitted, loadConsultation]);

  useEffect(() => {
    if (!isPaymentSubmitted || gatewayVerified) return;
    if (paymentProvider !== "stripe") return;

    const verifyGatewayPayment = async () => {
      setPaymentLoading(true);
      try {
        const data = await verifyConsultationStripeSession(id, stripeSessionId);
        setConsultation(data);
        setGatewayVerified(true);
        toast.success("Payment verified successfully.");
      } catch (err) {
        toast.error(err.response?.data?.message || err.message || "Payment verification is still pending.");
      } finally {
        setPaymentLoading(false);
      }
    };

    if (paymentProvider === "stripe" && stripeSessionId) {
      verifyGatewayPayment();
    }
  }, [
    gatewayVerified,
    id,
    isPaymentSubmitted,
    paymentProvider,
    stripeSessionId,
    toast,
  ]);

  const handlePay = async (provider = "stripe") => {
    if (!consultation?.canPay) return;

    setPaymentLoading(true);
    try {
      if (Number(consultation.amount || 0) <= 0) {
        const data = await payConsultation(consultation.id, {
          provider: "FREE", method: "free", status_message: "No payment required",
        });
        setConsultation(data);
        toast.success("Consultation confirmed without payment.");
        return;
      }

      if (demoPaymentEnabled) {
        const data = await confirmDemoConsultation(consultation.id);
        setConsultation(data);
        toast.success(
          data.status === "scheduled"
            ? "Demo payment complete. Video access scheduled."
            : "Demo payment complete. Meeting setup pending."
        );
        return;
      }

      const session = await createConsultationStripeSession(consultation.id);
      const checkoutUrl = session.checkoutUrl;
      if (!checkoutUrl) {
        throw new Error("Payment gateway did not return a checkout URL.");
      }
      window.location.assign(checkoutUrl);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Payment flow error.");
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading && !consultation) {
    return (
      <Page>
        <Container>
          <EmptyState>Securely loading your consultation status...</EmptyState>
        </Container>
      </Page>
    );
  }

  if (!consultation) {
    return (
      <Page>
        <Container>
          <EmptyState>{error || "Consultation record not found."}</EmptyState>
        </Container>
      </Page>
    );
  }

  const status = statusConfig[consultation.status] || statusConfig.requested;
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
    <Page>
      <Container>
        <TopRow>
          <GhostAction as={Link} to="/">
            <FaArrowLeft /> Dashboard
          </GhostAction>

          <GhostAction type="button" onClick={() => loadConsultation(false)}>
            <FaSyncAlt className={refreshing ? "fa-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </GhostAction>
        </TopRow>

        <Hero>
          <HeroText>
            <StatusPill $background={status.background} $color={status.color} $border={status.border}>
              <FaCheckCircle />
              {status.label}
            </StatusPill>
            <h1>Consultation Status</h1>
            <p>
              Track your payment, booking confirmation, and secure video room access from this portal.
            </p>
          </HeroText>

          <HeroMeta>
            <div className="meta-item">
              <span>Reference Number</span>
              <strong>{consultation.consultationNumber || "Generating..."}</strong>
            </div>
            <div className="meta-item">
              <span>Attending Physician</span>
              <strong>Dr. {consultation.doctor.name}</strong>
            </div>
            <div className="meta-item">
              <span>Schedule</span>
              <strong>
                <FaRegCalendarAlt style={{ marginRight: 6 }} />
                {consultation.approvedDate
                  ? formatDateLabel(consultation.approvedDate)
                  : formatDateLabel(consultation.requestedDate)}
              </strong>
              <strong style={{ fontSize: "0.95rem", color: "#cbd5e1", marginTop: 2 }}>
                <FaRegClock style={{ marginRight: 6 }} />
                {consultation.approvedTimeSlot
                  ? formatTimeLabel(consultation.approvedTimeSlot)
                  : consultation.requestedTimeSlot
                    ? formatTimeLabel(consultation.requestedTimeSlot)
                    : "Flexible Schedule"}
              </strong>
            </div>
          </HeroMeta>
        </Hero>

        <Layout>
          {/* Left Column */}
          <Column>
            <Card>
              <SectionHeader>
                <h2>Consultation Details</h2>
                <p>The information captured for this booking.</p>
              </SectionHeader>

              <Grid>
                <MetaCard>
                  <span>Patient</span>
                  <strong>{consultation.patient.name}</strong>
                  <p>{consultation.patient.email || "No email on file"}</p>
                </MetaCard>
                <MetaCard>
                  <span>Doctor</span>
                  <strong>{consultation.doctor.name}</strong>
                  <p>{consultation.doctor.specialty}</p>
                </MetaCard>
                <MetaCard>
                  <span>Requested</span>
                  <strong>{formatDateLabel(consultation.requestedDate)}</strong>
                  <p>
                    {consultation.requestedTimeSlot
                      ? formatTimeLabel(consultation.requestedTimeSlot)
                      : "Flexible request"}
                  </p>
                </MetaCard>
                <MetaCard>
                  <span>Approved Slot</span>
                  <strong>
                    {consultation.approvedDate
                      ? formatDateLabel(consultation.approvedDate)
                      : "Awaiting approval"}
                  </strong>
                  <p>
                    {consultation.approvedTimeSlot
                      ? formatTimeLabel(consultation.approvedTimeSlot)
                      : "Pending final schedule"}
                  </p>
                </MetaCard>
              </Grid>
            </Card>

            <Card>
              <SectionHeader>
                <h2>Status Timeline</h2>
                <p>Live updates on your consultation progress.</p>
              </SectionHeader>

              <div style={{ display: "grid", gap: 16 }}>
                {consultation.requestNote && (
                  <Alert $accent="#94a3b8" $background="#f8fafc">
                    <strong>Patient Note</strong>
                    {consultation.requestNote}
                  </Alert>
                )}

                {consultation.status === "requested" && (
                  <Alert $accent="#f59e0b" $background="#fffbeb" $color="#92400e">
                    <strong>Review in Progress</strong>
                    This older request is still waiting for a doctor-confirmed time. New virtual bookings require choosing an available slot before payment.
                  </Alert>
                )}

                {consultation.status === "approved" && (
                  <Alert $accent="#3b82f6" $background="#eff6ff" $color="#1e40af">
                    <strong>Slot Held for Payment</strong>
                    Your slot for {formatDateLabel(consultation.approvedDate)} at {formatTimeLabel(consultation.approvedTimeSlot)} is held for payment. Complete payment{consultation.holdExpiresAt ? ` before ${formatDateTimeLabel(consultation.holdExpiresAt)}` : ""} to confirm the booking.
                  </Alert>
                )}

                {consultation.status === "expired" && (
                  <Alert $accent="#64748b" $background="#f8fafc" $color="#334155">
                    <strong>Slot Hold Expired</strong>
                    This slot was released because payment was not completed in time. Please book again and choose an available slot.
                  </Alert>
                )}

                {consultation.status === "meeting_pending" && (
                  <Alert $accent="#8b5cf6" $background="#f5f3ff" $color="#5b21b6">
                    <strong>Payment Complete</strong>
                    We are generating your secure video link. This is usually instant—feel free to refresh the page.
                  </Alert>
                )}

                {consultation.status === "rejected" && (
                  <Alert $accent="#ef4444" $background="#fef2f2" $color="#991b1b">
                    <strong>Request Declined</strong>
                    The doctor was unable to approve this specific request. You can safely create a new request for a different date or physician.
                  </Alert>
                )}
              </div>
            </Card>
          </Column>

          {/* Right Column */}
          <Column>
            <Card>
              <SectionHeader>
                <h2>Payment Portal</h2>
                <p>Secure hosted checkout through Stripe.</p>
              </SectionHeader>

              <Grid style={{ gridTemplateColumns: "1fr", marginBottom: 20 }}>
                <MetaCard style={{ background: "#f8fafc" }}>
                  <span>Total Amount</span>
                  <strong style={{ fontSize: "1.25rem" }}>LKR {Number(consultation.amount || 0).toFixed(2)}</strong>
                  <p style={{ color: consultation.paymentStatus === 'paid' ? '#10b981' : '#6b7280', fontWeight: 600 }}>
                    {paymentLabels[consultation.paymentStatus] || consultation.paymentStatus}
                  </p>
                </MetaCard>
              </Grid>

              {consultation.canPay && (
                <div style={{ display: "grid", gap: 16 }}>
                  <ActionButton type="button" onClick={demoPaymentEnabled ? handlePay : () => handlePay("stripe")} disabled={paymentLoading}>
                    <FaCreditCard />
                    {paymentLoading
                      ? "Initializing Checkout..."
                      : demoPaymentEnabled
                        ? "Process Demo Payment"
                        : "Pay by Card"}
                  </ActionButton>

                  {demoPaymentEnabled && Number(consultation.amount || 0) > 0 && (
                    <>
                      <ActionButton
                        type="button"
                        onClick={() => handlePay("stripe")}
                        disabled={paymentLoading}
                        style={{ background: "#111827" }}
                      >
                        Use Stripe card payment
                      </ActionButton>
                    </>
                  )}
                  
                  {demoPaymentEnabled && (
                    <Alert $accent="#10b981" $background="#ecfdf5" $color="#065f46" style={{ padding: 14, fontSize: "0.85rem" }}>
                      <strong>Demo Environment</strong>
                      Active for viva prototype. Transactions will bypass live processing.
                    </Alert>
                  )}
                </div>
              )}
            </Card>

            <Card>
              <SectionHeader>
                <h2>Video Access</h2>
                <p>Join your secure consultation room.</p>
              </SectionHeader>

              {consultation.status === "scheduled" && consultation.paymentStatus === "paid" ? (
                <Alert $accent="#10b981" $background="#ecfdf5" $color="#065f46">
                  <strong>{meetingState.canJoin ? "Room is Open" : "Room Locked"}</strong>
                  <div style={{ marginTop: 12, marginBottom: 4 }}>
                    <ActionButton
                      type="button"
                      disabled={meetingState.disabled}
                      onClick={() => navigate(`/virtual-consultation/meeting/${consultation.id}`)}
                      style={{ background: meetingState.disabled ? '#d1d5db' : '#10b981', color: meetingState.disabled ? '#6b7280' : '#fff' }}
                    >
                      <FaExternalLinkAlt />
                      {meetingState.label}
                    </ActionButton>
                  </div>
                  <span style={{ fontSize: "0.85rem", marginTop: 8, display: "block" }}>
                    Access automatically unlocks 30 minutes prior to the scheduled start time.
                  </span>
                </Alert>
              ) : consultation.status === "meeting_pending" ? (
                <Alert $accent="#8b5cf6" $background="#f5f3ff" $color="#5b21b6">
                  <strong>Generating Secure Link</strong>
                  Payment confirmed. We are attaching the encrypted video room to your booking.
                </Alert>
              ) : (
                <Alert $accent="#e5e7eb" $background="#f9fafb">
                  <strong>Access Pending</strong>
                  The Join Video button will appear here once payment is finalized and the video room is ready.
                </Alert>
              )}

              {error && (
                <Alert $accent="#ef4444" $background="#fef2f2" $color="#991b1b" style={{ marginTop: 16 }}>
                  <strong>Sync Issue</strong> {error}
                </Alert>
              )}

              {consultation.zoom?.error && (
                <Alert $accent="#f59e0b" $background="#fffbeb" $color="#92400e" style={{ marginTop: 16 }}>
                  <strong>System Notice</strong>
                  We encountered a slight delay preparing your video room. It will resolve automatically shortly.
                </Alert>
              )}
            </Card>
          </Column>
        </Layout>
      </Container>
    </Page>
  );
};

export default ConsultationStatus;
