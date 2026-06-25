import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaCreditCard,
  FaExclamationCircle,
  FaMapMarkerAlt,
  FaPrint,
  FaReceipt,
  FaSyncAlt,
  FaUserMd,
} from "react-icons/fa";
import {
  confirmDemoAppointment,
  confirmFreeAppointment,
  createAppointmentStripeSession,
  fetchAppointmentReceipt,
  isDemoPaymentAvailable,
  verifyAppointmentStripeSession,
} from "@/shared/features/Appointments/appointmentClient";
import { safeToLocaleDateString, safeToLocaleString } from "@/shared/lib/intlDate";

const Page = styled.div`
  min-height: 100vh;
  background: #f8f7fb;
  padding: 40px 5%;
  font-family: "DM Sans", sans-serif;
`;

const Container = styled.div`
  max-width: 1180px;
  margin: 0 auto;
  display: grid;
  gap: 24px;
`;

const TopRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
`;

const GhostButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 46px;
  padding: 0 16px;
  border-radius: 14px;
  border: 1px solid rgba(104, 59, 147, 0.14);
  background: #ffffff;
  color: #683b93;
  font-size: 0.92rem;
  font-weight: 700;
  cursor: pointer;
`;

const Hero = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(260px, 0.85fr);
  gap: 20px;
  padding: 28px;
  border-radius: 28px;
  background: linear-gradient(135deg, #5f2f87 0%, #8c62c4 100%);
  color: #ffffff;

  @media (max-width: 920px) {
    grid-template-columns: 1fr;
  }
`;

const HeroText = styled.div`
  h1 {
    margin: 0 0 10px;
    font-size: clamp(2.1rem, 4vw, 2.8rem);
    line-height: 1.06;
  }

  p {
    margin: 0;
    color: rgba(255, 255, 255, 0.88);
    line-height: 1.72;
    max-width: 620px;
  }
`;

const StatusPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 999px;
  background: ${(props) => props.$background};
  color: ${(props) => props.$color};
  font-size: 0.84rem;
  font-weight: 700;
  align-self: flex-start;
`;

const HeroMeta = styled.div`
  padding: 20px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.12);
  display: grid;
  gap: 12px;

  strong {
    color: #ffffff;
    font-size: 1rem;
  }

  span {
    color: rgba(255, 255, 255, 0.88);
    line-height: 1.6;
  }
`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  gap: 24px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  padding: 24px;
  border-radius: 24px;
  background: #ffffff;
  border: 1px solid rgba(104, 59, 147, 0.1);
  box-shadow: 0 18px 32px rgba(36, 20, 60, 0.06);
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  flex-wrap: wrap;
  margin-bottom: 18px;

  h2 {
    margin: 0 0 6px;
    color: #281a43;
    font-size: 1.18rem;
  }

  p {
    margin: 0;
    color: #6d6283;
    line-height: 1.65;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const MetaCard = styled.div`
  padding: 16px;
  border-radius: 18px;
  background: #faf8fd;
  border: 1px solid rgba(104, 59, 147, 0.08);

  span {
    display: block;
    color: #7b6f92;
    font-size: 0.82rem;
    margin-bottom: 6px;
  }

  strong {
    display: block;
    color: #281a43;
    font-size: 1rem;
  }

  p {
    margin: 8px 0 0;
    color: #655b7b;
    line-height: 1.6;
    font-size: 0.9rem;
  }
`;

const DetailList = styled.div`
  display: grid;
  gap: 14px;
`;

const DetailRow = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
  color: #675d7f;
  line-height: 1.65;

  svg {
    color: #683b93;
    margin-top: 4px;
    flex-shrink: 0;
  }

  strong {
    display: block;
    color: #281a43;
    margin-bottom: 3px;
  }
`;

const SummaryRows = styled.div`
  display: grid;
  gap: 12px;
`;

const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  color: ${(props) => (props.$strong ? "#281a43" : "#675d7f")};
  font-size: ${(props) => (props.$strong ? "1rem" : "0.94rem")};
  font-weight: ${(props) => (props.$strong ? 700 : 500)};
`;

const Alert = styled.div`
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid
    ${(props) => (props.$error ? "rgba(220, 38, 38, 0.16)" : "rgba(180, 83, 9, 0.18)")};
  background: ${(props) => (props.$error ? "#fee2e2" : "#fff7ed")};
  color: ${(props) => (props.$error ? "#b91c1c" : "#b45309")};
  display: flex;
  gap: 10px;
  align-items: flex-start;
  line-height: 1.65;
  font-size: 0.92rem;
  font-weight: 600;
  margin-top: 16px;
`;

const ActionRow = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 18px;
`;

const PrimaryButton = styled.button`
  min-height: 52px;
  padding: 0 20px;
  border-radius: 16px;
  border: none;
  background: linear-gradient(135deg, #683b93 0%, #8d63c6 100%);
  color: #ffffff;
  font-size: 0.95rem;
  font-weight: 800;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;

  &:disabled {
    cursor: wait;
    opacity: 0.72;
  }
`;

const EmptyState = styled.div`
  padding: 30px;
  border-radius: 24px;
  background: #ffffff;
  border: 1px solid rgba(104, 59, 147, 0.1);
  text-align: center;

  h2 {
    margin: 0 0 8px;
    color: #281a43;
  }

  p {
    margin: 0;
    color: #6d6283;
    line-height: 1.7;
  }
`;

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

const formatCurrency = (value = 0) => `LKR ${Number(value || 0).toFixed(2)}`;

const formatPaymentMethod = (value = "") => {
  const normalized = String(value || "").trim().toLowerCase();

  if (!normalized) return "Awaiting payment";
  if (["stripe", "stripe_checkout", "card", "demo_card", "visa", "mastercard"].includes(normalized)) return "Card payment";
  if (normalized === "free") return "No payment required";
  if (normalized === "manual") return "Confirmed by staff";

  return String(value).replace(/_/g, " ");
};

const getTone = (receipt) => {
  if (!receipt) {
    return {
      label: "Loading",
      background: "rgba(255, 255, 255, 0.18)",
      color: "#ffffff",
    };
  }

  if (receipt.paymentStatus === "paid" && receipt.status === "confirmed") {
    return {
      label: "Confirmed and paid",
      background: "#e7f8ef",
      color: "#0f766e",
    };
  }

  if (receipt.paymentStatus === "pending") {
    return {
      label: "Waiting for payment verification",
      background: "#fff7e8",
      color: "#b7791f",
    };
  }

  return {
    label: "Booking not confirmed",
    background: "#fde8e8",
    color: "#b91c1c",
  };
};

const AppointmentReceipt = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [gatewayVerified, setGatewayVerified] = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const paymentSubmitted = searchParams.get("payment") === "submitted";
  const paymentProvider = searchParams.get("provider");
  const stripeSessionId = searchParams.get("session_id");
  const tone = useMemo(() => getTone(receipt), [receipt]);
  const demoPaymentEnabled = useMemo(() => isDemoPaymentAvailable(), []);

  const loadReceipt = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAppointmentReceipt(id);
      setReceipt(data);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Could not load this appointment receipt.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReceipt();
  }, [id]);

  useEffect(() => {
    if (!paymentSubmitted || gatewayVerified) return;
    if (paymentProvider !== "stripe") return;

    const verifyGatewayPayment = async () => {
      setPaymentLoading(true);
      setError("");
      try {
        const data = await verifyAppointmentStripeSession(id, stripeSessionId);
        setReceipt(data);
        setGatewayVerified(true);
      } catch (paymentError) {
        setError(
          paymentError.response?.data?.message ||
            paymentError.message ||
            "We could not verify this payment yet."
        );
      } finally {
        setPaymentLoading(false);
      }
    };

    if (stripeSessionId) {
      verifyGatewayPayment();
    }
  }, [gatewayVerified, id, paymentProvider, paymentSubmitted, stripeSessionId]);

  useEffect(() => {
    if (!paymentSubmitted || !receipt) return undefined;
    if (receipt.paymentStatus !== "pending") return undefined;

    const interval = window.setInterval(() => {
      loadReceipt();
    }, 4000);

    return () => window.clearInterval(interval);
  }, [paymentSubmitted, receipt]);

  const handlePayNow = async () => {
    if (!receipt) return;

    setPaymentLoading(true);
    setError("");

    try {
      if (Number(receipt.amount || 0) <= 0) {
        await confirmFreeAppointment(receipt.appointmentId);
        await loadReceipt();
        return;
      }

      const session = await createAppointmentStripeSession(receipt.appointmentId);
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
          "We could not restart payment right now."
      );
    }
  };

  const handleDemoPayNow = async () => {
    if (!receipt) return;

    setPaymentLoading(true);
    setError("");

    try {
      if (Number(receipt.amount || 0) <= 0) {
        await confirmFreeAppointment(receipt.appointmentId);
      } else {
        await confirmDemoAppointment(receipt.appointmentId);
      }

      await loadReceipt();
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

  if (loading) {
    return (
      <Page>
        <Container>
          <EmptyState>
            <h2>Loading receipt…</h2>
            <p>We are fetching the latest appointment and payment status for you.</p>
          </EmptyState>
        </Container>
      </Page>
    );
  }

  if (error || !receipt) {
    return (
      <Page>
        <Container>
          <EmptyState>
            <h2>Receipt unavailable</h2>
            <p>{error || "This appointment receipt could not be found."}</p>
            <ActionRow style={{ justifyContent: "center" }}>
              <PrimaryButton type="button" onClick={() => navigate("/")}>
                Back to homepage
              </PrimaryButton>
            </ActionRow>
          </EmptyState>
        </Container>
      </Page>
    );
  }

  return (
    <Page>
      <Container>
        <TopRow>
          <GhostButton type="button" onClick={() => navigate("/")}>
            <FaArrowLeft size={12} />
            Back to homepage
          </GhostButton>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <GhostButton type="button" onClick={loadReceipt}>
              <FaSyncAlt size={12} />
              Refresh status
            </GhostButton>
            <GhostButton type="button" onClick={() => window.print()}>
              <FaPrint size={12} />
              Print receipt
            </GhostButton>
          </div>
        </TopRow>

        <Hero>
          <HeroText>
            <StatusPill $background={tone.background} $color={tone.color}>
              {receipt.paymentStatus === "paid" ? <FaCheckCircle size={12} /> : <FaReceipt size={12} />}
              {tone.label}
            </StatusPill>
            <h1>Appointment receipt and queue status</h1>
            <p>
              Review the confirmed doctor, venue, payment state, and queue number below. This
              page stays valid after refresh and updates while payment confirmation is still in
              progress.
            </p>
          </HeroText>

          <HeroMeta>
            <strong>{receipt.receiptNumber || "Receipt pending"}</strong>
            <span>
              Appointment ID: {receipt.appointmentId}
              <br />
              Queue number: {receipt.queueNumber || "Assigned after successful payment"}
            </span>
          </HeroMeta>
        </Hero>

        <Layout>
          <div style={{ display: "grid", gap: 24 }}>
            <Card>
              <SectionHeader>
                <div>
                  <h2>Appointment details</h2>
                  <p>The doctor, date, time, and venue linked to this booking.</p>
                </div>
              </SectionHeader>

              <DetailList>
                <DetailRow>
                  <FaUserMd size={15} />
                  <div>
                    <strong>Doctor</strong>
                    <span>
                      {receipt.doctor.name} • {receipt.doctor.specialty}
                    </span>
                  </div>
                </DetailRow>

                <DetailRow>
                  <FaCalendarAlt size={15} />
                  <div>
                    <strong>Date</strong>
                    <span>{formatDateLabel(receipt.date)}</span>
                  </div>
                </DetailRow>

                <DetailRow>
                  <FaClock size={15} />
                  <div>
                    <strong>Time</strong>
                    <span>{formatTimeLabel(receipt.timeSlot)}</span>
                  </div>
                </DetailRow>

                <DetailRow>
                  <FaMapMarkerAlt size={15} />
                  <div>
                    <strong>{receipt.consultationType === "VIRTUAL" ? "Hosted venue" : "Venue"}</strong>
                    <span>
                      {receipt.venue.name}
                      {receipt.venue.location ? ` • ${receipt.venue.location}` : ""}
                    </span>
                  </div>
                </DetailRow>
              </DetailList>
            </Card>

            <Card>
              <SectionHeader>
                <div>
                  <h2>Receipt snapshot</h2>
                  <p>Patient, payment, and queue details captured for this appointment.</p>
                </div>
              </SectionHeader>

              <Grid>
                <MetaCard>
                  <span>Patient</span>
                  <strong>{receipt.patient.name}</strong>
                  <p>
                    {receipt.patient.email || "No email"} {receipt.patient.phone ? `· ${receipt.patient.phone}` : ""}
                  </p>
                </MetaCard>

                <MetaCard>
                  <span>Consultation type</span>
                  <strong>
                    {receipt.consultationType === "VIRTUAL" ? "Virtual consultation" : "Physical consultation"}
                  </strong>
                  <p>Queue numbering is assigned per doctor per day after payment.</p>
                </MetaCard>

                <MetaCard>
                  <span>Payment method</span>
                  <strong>{formatPaymentMethod(receipt.paymentProvider)}</strong>
                  <p>
                    {receipt.paymentStatus === "paid"
                      ? `Confirmed on ${formatDateTime(receipt.paidAt)}`
                      : receipt.paymentResult?.status_message || "Waiting for payment confirmation."}
                  </p>
                </MetaCard>

                <MetaCard>
                  <span>Queue number</span>
                  <strong>{receipt.queueNumber || "Pending payment"}</strong>
                  <p>
                    {receipt.queueNumber
                      ? "You are placed in the doctor’s queue according to successful payment order."
                      : "Queue assignment appears after payment is verified."}
                  </p>
                </MetaCard>
              </Grid>

              {paymentSubmitted && receipt.paymentStatus === "pending" && (
                <Alert>
                  <FaExclamationCircle size={15} />
                  <span>
                    We are waiting for the final payment confirmation. This page will update once
                    the payment status is confirmed.
                  </span>
                </Alert>
              )}

              {demoPaymentEnabled && receipt.canRetryPayment && receipt.paymentStatus !== "paid" ? (
                <Alert>
                  <FaCheckCircle size={15} />
                  <span>
                    Demo payment mode is active for this prototype, so you can still confirm the
                    appointment and queue assignment for the viva demo.
                  </span>
                </Alert>
              ) : null}

              {receipt.paymentStatus !== "paid" && !receipt.canRetryPayment && (
                <Alert $error>
                  <FaExclamationCircle size={15} />
                  <span>
                    This appointment is not confirmed. The hold may have expired or the payment did
                    not complete successfully.
                  </span>
                </Alert>
              )}
            </Card>
          </div>

          <Card>
            <SectionHeader>
              <div>
                <h2>Payment and confirmation</h2>
                <p>The current payment state and next available action.</p>
              </div>
            </SectionHeader>

            <SummaryRows>
              <SummaryRow>
                <span>Receipt number</span>
                <span>{receipt.receiptNumber || "Pending"}</span>
              </SummaryRow>
              <SummaryRow>
                <span>Payment status</span>
                <span>{receipt.paymentStatus}</span>
              </SummaryRow>
              <SummaryRow>
                <span>Status</span>
                <span>{receipt.status}</span>
              </SummaryRow>
              <SummaryRow>
                <span>Hold expires</span>
                <span>{formatDateTime(receipt.holdExpiresAt)}</span>
              </SummaryRow>
              <SummaryRow $strong>
                <span>Total</span>
                <span>{formatCurrency(receipt.amount)}</span>
              </SummaryRow>
            </SummaryRows>

            <ActionRow>
              {receipt.canRetryPayment && (
                <PrimaryButton
                  disabled={paymentLoading}
                  type="button"
                  onClick={demoPaymentEnabled ? handleDemoPayNow : handlePayNow}
                >
                  <FaCreditCard size={14} />
                  {paymentLoading
                    ? demoPaymentEnabled
                      ? "Confirming payment..."
                      : "Opening payment..."
                    : demoPaymentEnabled && Number(receipt.amount || 0) > 0
                      ? "Complete demo payment"
                      : "Pay by card"}
                </PrimaryButton>
              )}

              <GhostButton type="button" onClick={() => navigate("/")}>
                Book another appointment
              </GhostButton>
            </ActionRow>
          </Card>
        </Layout>
      </Container>
    </Page>
  );
};

export default AppointmentReceipt;
