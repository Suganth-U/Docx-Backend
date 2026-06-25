import React, { useEffect, useState } from "react";
import styled, { keyframes, css } from "styled-components";
import { useSearchParams, Link } from "react-router-dom";
import { Navigationbar } from "@/shared/components/layout/NavigationBar/Navigationbar";
import {
  FaLock,
  FaCreditCard,
  FaCheckCircle,
  FaPlayCircle,
  FaArrowLeft,
  FaShieldAlt,
  FaCheck,
  FaBolt,
  FaUsers,
  FaVideo,
  FaFlask,
  FaExclamationTriangle,
} from "react-icons/fa";
import api from "@/shared/lib/api";
import { getStoredAuthSession, setStoredAuthSession } from "@/shared/lib/authSession";

/* ─── Animations ─── */
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(15px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const popIn = keyframes`
  0%   { transform: scale(0) rotate(-10deg); opacity: 0; }
  70%  { transform: scale(1.12) rotate(3deg); }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
`;

/* ─── Layout ─── */
const Page = styled.div`
  min-height: 100vh;
  background: #f4f4f9;
  font-family: "Inter", -apple-system, sans-serif;
`;

const PurpleBanner = styled.div`
  background: #8e7dbe;
  padding: 50px 24px 140px;
  text-align: center;
  color: #ffffff;
`;

const BannerContent = styled.div`
  max-width: 680px;
  margin: 0 auto;
`;

const TopNav = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.9rem;
  font-weight: 700;
  text-decoration: none;
  transition: color 0.2s ease;

  &:hover { color: #ffffff; }
`;

const SecureBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.8rem;
  font-weight: 600;
  
  svg { color: #ffffff; }
`;

const BannerTitle = styled.h1`
  font-size: 2.2rem;
  font-weight: 900;
  margin: 0 0 10px;
  letter-spacing: -0.03em;
  text-shadow: 0 2px 8px rgba(0,0,0,0.1);
`;

const BannerSubtitle = styled.p`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.85);
  margin: 0;
  font-weight: 500;
`;

/* ─── Main Content ─── */
const MainContent = styled.main`
  max-width: 680px;
  margin: -80px auto 100px;
  padding: 0 24px;
  position: relative;
  z-index: 10;
`;

const CheckoutCard = styled.div`
  background: #ffffff;
  border-radius: 24px;
  box-shadow: 0 12px 36px rgba(104, 59, 147, 0.1);
  overflow: hidden;
  animation: ${fadeUp} 0.5s ease both;
`;

/* ─── Order Summary Section ─── */
const SummarySection = styled.div`
  padding: 40px;
  background: #ffffff;
  border-bottom: 1px solid #f0e8fb;

  @media (max-width: 600px) { padding: 32px 24px; }
`;

const PlanHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const PlanTitle = styled.h2`
  font-size: 1.6rem;
  font-weight: 900;
  color: #111827;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;

  span {
    font-size: 0.75rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #683b93;
    background: #f3e8fc;
    padding: 4px 10px;
    border-radius: 999px;
  }
`;

const PlanPrice = styled.div`
  font-size: 1.8rem;
  font-weight: 900;
  color: #111827;
  text-align: right;

  sup {
    font-size: 0.8rem;
    font-weight: 700;
    color: #9ca3af;
    vertical-align: top;
    margin-right: 4px;
  }
`;

const FeaturesList = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 30px;

  @media (max-width: 480px) { grid-template-columns: 1fr; }
`;

const FeatureItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.88rem;
  color: #4b5563;
  font-weight: 600;

  svg { color: #683b93; flex-shrink: 0; font-size: 14px; }
`;

const ReceiptBox = styled.div`
  background: #f9f8fc;
  border-radius: 16px;
  padding: 24px;
`;

const ReceiptLine = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.95rem;
  color: ${({ total }) => (total ? '#111827' : '#6b7280')};
  font-weight: ${({ total }) => (total ? '800' : '500')};
  margin-bottom: ${({ total }) => (total ? '0' : '12px')};
  
  ${({ total }) => total && css`
    padding-top: 16px;
    margin-top: 16px;
    border-top: 1px dashed #d1d5db;
    font-size: 1.15rem;
  `}

  .value {
    color: #111827;
    font-weight: ${({ total }) => (total ? '900' : '600')};
  }
`;

/* ─── Payment Section ─── */
const PaymentSection = styled.div`
  padding: 40px;
  background: #ffffff;

  @media (max-width: 600px) { padding: 32px 24px; }
`;

const SectionLabel = styled.h3`
  font-size: 1.05rem;
  font-weight: 800;
  color: #111827;
  margin: 0 0 20px;
`;

const PaymentOptions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const PayButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  padding: 18px;
  border-radius: 16px;
  font-size: 1.05rem;
  font-weight: 800;
  cursor: ${({ disabled }) => (disabled ? "wait" : "pointer")};
  transition: all 0.2s ease;
  border: none;

  ${({ primary }) => primary ? css`
    background: #683b93;
    color: #ffffff;
    box-shadow: 0 4px 14px rgba(104, 59, 147, 0.2);

    &:hover:not(:disabled) {
      background: #5a3180;
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(104, 59, 147, 0.25);
    }
  ` : css`
    background: #f0fdf4;
    color: #166534;
    border: 2px solid #86efac;

    &:hover:not(:disabled) {
      background: #dcfce7;
      transform: translateY(-2px);
    }
  `}

  &:disabled {
    opacity: 0.7;
    transform: none;
    box-shadow: none;
  }
`;

const TrustFooter = styled.div`
  margin-top: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  flex-wrap: wrap;

  div {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.8rem;
    color: #6b7280;
    font-weight: 600;

    svg { color: #9ca3af; }
  }
`;

/* ─── Alerts & Spinners ─── */
const ActiveNotice = styled.div`
  padding: 16px 20px;
  border-radius: 12px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.5;
  margin-bottom: 24px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  
  svg { flex-shrink: 0; margin-top: 2px; color: #16a34a; }
`;

const ErrorBanner = styled.div`
  padding: 16px 20px;
  border-radius: 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 24px;
  display: flex;
  align-items: flex-start;
  gap: 12px;

  svg { flex-shrink: 0; margin-top: 2px; }
`;

const SpinnerRing = styled.div`
  width: 20px;
  height: 20px;
  border: 2.5px solid rgba(255,255,255,0.3);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  @keyframes spin { to { transform: rotate(360deg); } }
`;

/* ─── Success Overlay ─── */
const SuccessOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.98);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  text-align: center;
  padding: 24px;
`;

const SuccessCard = styled.div`
  background: #ffffff;
  border: 1.5px solid #f0e8fb;
  border-radius: 28px;
  padding: 56px 48px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 24px 64px rgba(104, 59, 147, 0.12);
  animation: ${fadeUp} 0.5s ease both;
`;

const SuccessIconWrap = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #f0fdf4;
  border: 2px solid #86efac;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  font-size: 32px;
  color: #16a34a;
  animation: ${popIn} 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.2s both;
`;

const SuccessTitle = styled.h2`
  font-size: 2rem;
  font-weight: 900;
  color: #111827;
  margin: 0 0 10px;
  letter-spacing: -0.03em;
`;

const SuccessText = styled.p`
  font-size: 1rem;
  color: #6b7280;
  line-height: 1.6;
  margin: 0 0 32px;
  strong { color: #683b93; font-weight: 800; }
`;

const SuccessBtn = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 16px;
  border-radius: 14px;
  background: #683b93;
  color: #ffffff;
  font-size: 1rem;
  font-weight: 800;
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover { background: #5a3180; transform: translateY(-2px); }
`;

/* ─── Data ─── */
const PLAN_DATA = {
  general: {
    name: "General Care",
    price: 4900,
    features: [
      { icon: <FaVideo />, text: "1 virtual session" },
      { icon: <FaFlask />, text: "Basic labs" },
      { icon: <FaCheck />, text: "10% off pharmacy" },
      { icon: <FaCheck />, text: "Digital prescriptions" },
    ],
  },
  premium: {
    name: "Premium Care",
    price: 9900,
    features: [
      { icon: <FaVideo />, text: "3 virtual sessions" },
      { icon: <FaUsers />, text: "Family cover (2)" },
      { icon: <FaBolt />, text: "Priority booking" },
      { icon: <FaCheck />, text: "Advanced diagnostics" },
    ],
  },
  vip: {
    name: "VIP Care",
    price: 14900,
    features: [
      { icon: <FaVideo />, text: "Unlimited sessions" },
      { icon: <FaUsers />, text: "Family cover (4)" },
      { icon: <FaBolt />, text: "24/7 emergency" },
      { icon: <FaCheck />, text: "Dedicated concierge" },
    ],
  },
};

const formatMembershipDate = (value) => {
  if (!value) return "current period";
  try {
    return new Date(value).toLocaleDateString("en-LK", { month: "short", day: "numeric", year: "numeric" });
  } catch { return "current period"; }
};

const fmtLKR = (n) => `LKR ${Number(n).toLocaleString("en-LK")}`;

/* ═══════════════════════════════
   COMPONENT
═══════════════════════════════ */
const MembershipCheckout = () => {
  const [searchParams] = useSearchParams();
  const planType = searchParams.get("plan") || "general";
  const membershipId = searchParams.get("membershipId") || "";
  const [complete, setComplete] = useState(false);
  const [membership, setMembership] = useState(null);
  const [processingGateway, setProcessingGateway] = useState("");
  const [error, setError] = useState("");

  const plan = PLAN_DATA[planType] || PLAN_DATA.general;
  const total = plan.price;
  const isSelectedPlanActive = membership?.status === "active" && membership?.planType === planType;

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const storeMembership = (nextMembership) => {
    if (!nextMembership) return;
    setMembership(nextMembership);
    const session = getStoredAuthSession();
    if (session?.accessToken) {
      setStoredAuthSession({
        ...session,
        membership: {
          status: nextMembership.status,
          planType: nextMembership.planType,
          planName: nextMembership.planName,
          membershipId: nextMembership.id,
          paymentProvider: nextMembership.paymentProvider,
          startedAt: nextMembership.startedAt,
          currentPeriodEnd: nextMembership.currentPeriodEnd,
        },
      });
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadMembership = async () => {
      try {
        const { data } = await api.get("/membership-payments/me");
        if (!cancelled && data.membership) storeMembership(data.membership);
      } catch (e) {
        if (e.response?.status !== 404) console.error("Failed to load membership", e);
      }
    };
    loadMembership();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const verifyGatewayReturn = async () => {
      const payment = searchParams.get("payment");
      const provider = searchParams.get("provider");
      if (payment !== "submitted" || !provider || complete) return;

      setProcessingGateway(provider);
      setError("");
      try {
        let response;
        if (provider === "stripe") {
          response = await api.post("/membership-payments/stripe/verify", {
            planType,
            membershipId,
            sessionId: searchParams.get("session_id"),
          });
        } else {
          throw new Error("This payment gateway is no longer available.");
        }
        storeMembership(response?.data?.membership);
        setComplete(true);
      } catch (e) {
        setError(e.response?.data?.message || e.message || "Could not verify payment.");
      } finally {
        setProcessingGateway("");
      }
    };
    verifyGatewayReturn();
  }, [complete, membershipId, planType, searchParams]);

  const startStripeCheckout = async () => {
    setProcessingGateway("stripe");
    setError("");
    try {
      const { data } = await api.post("/membership-payments/stripe/session", { planType, origin: window.location.origin });
      if (!data.checkoutUrl) throw new Error("No checkout URL returned.");
      window.location.assign(data.checkoutUrl);
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Could not start checkout.");
      setProcessingGateway("");
    }
  };

  const startDemoPayment = async () => {
    setProcessingGateway("demo");
    setError("");
    try {
      const { data } = await api.post("/membership-payments/demo/activate", { planType });
      storeMembership(data.membership);
      setComplete(true);
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Could not complete demo payment.");
    } finally {
      setProcessingGateway("");
    }
  };

  const busy = Boolean(processingGateway);

  return (
    <Page>
      <Navigationbar />
      
      {/* ── SUCCESS OVERLAY ── */}
      {complete && (
        <SuccessOverlay>
          <SuccessCard>
            <SuccessIconWrap><FaCheckCircle /></SuccessIconWrap>
            <SuccessTitle>You&apos;re all set! 🎉</SuccessTitle>
            <SuccessText>
              Your <strong>{membership?.planName || plan.name}</strong> membership is now active.
              {membership?.currentPeriodEnd && ` Renews on ${formatMembershipDate(membership.currentPeriodEnd)}.`}
            </SuccessText>
            <SuccessBtn to="/">Go to Dashboard</SuccessBtn>
          </SuccessCard>
        </SuccessOverlay>
      )}

      {/* ── PURPLE HEADER FLOW ── */}
      <PurpleBanner>
        <BannerContent>
          <TopNav>
            <BackLink to="/plus"><FaArrowLeft size={12} /> Back to plans</BackLink>
            <SecureBadge><FaLock size={12} /> Secure Checkout</SecureBadge>
          </TopNav>
          
          <BannerTitle>Complete your order</BannerTitle>
          <BannerSubtitle>Review your plan details and select a payment method to begin.</BannerSubtitle>
        </BannerContent>
      </PurpleBanner>

      {/* ── MAIN CARD OVERLAY ── */}
      <MainContent>
        <CheckoutCard>
          
          <SummarySection>
            <PlanHeader>
              <PlanTitle>
                {plan.name} <span>Monthly</span>
              </PlanTitle>
              <PlanPrice>
                <sup>LKR</sup>{plan.price.toLocaleString("en-LK")}
              </PlanPrice>
            </PlanHeader>

            <FeaturesList>
              {plan.features.map((f, i) => (
                <FeatureItem key={i}>{f.icon} {f.text}</FeatureItem>
              ))}
            </FeaturesList>

            <ReceiptBox>
              <ReceiptLine>
                <span className="label">Monthly plan</span>
                <span className="value">{fmtLKR(plan.price)}</span>
              </ReceiptLine>
              <ReceiptLine total>
                <span className="label">Total to pay</span>
                <span className="value">{fmtLKR(total)}</span>
              </ReceiptLine>
            </ReceiptBox>
          </SummarySection>

          <PaymentSection>
            {isSelectedPlanActive && (
              <ActiveNotice>
                <FaCheckCircle size={16} />
                <span>Your {membership.planName} membership is active until {formatMembershipDate(membership.currentPeriodEnd)}. Paying again renews it for another month.</span>
              </ActiveNotice>
            )}

            {error && (
              <ErrorBanner>
                <FaExclamationTriangle size={16} />
                <span>{error}</span>
              </ErrorBanner>
            )}

            <SectionLabel>Choose a payment method</SectionLabel>
            <PaymentOptions>
              <PayButton primary disabled={busy} onClick={startStripeCheckout}>
                {processingGateway === "stripe" ? <SpinnerRing /> : <><FaCreditCard /> Pay {fmtLKR(total)} with Card</>}
              </PayButton>
              <PayButton disabled={busy} onClick={startDemoPayment}>
                {processingGateway === "demo" ? <SpinnerRing style={{ borderColor: "rgba(22,101,52,0.3)", borderTopColor: "currentColor" }} /> : <><FaPlayCircle /> Express Demo Checkout</>}
              </PayButton>
            </PaymentOptions>

            <TrustFooter>
              <div><FaShieldAlt size={14} /> 256-bit encryption</div>
              <div><FaLock size={14} /> Powered by Stripe</div>
            </TrustFooter>
          </PaymentSection>

        </CheckoutCard>
      </MainContent>

    </Page>
  );
};

export default MembershipCheckout;
