import React, { useEffect, useState } from "react";
import styled, { keyframes, css } from "styled-components";
import { Link } from "react-router-dom";
import { Navigationbar } from "@/shared/components/layout/NavigationBar/Navigationbar";
import Footer from "@/shared/components/layout/Footer/Footer";
import {
  FaUserShield,
  FaClock,
  FaPercentage,
  FaMobileAlt,
  FaChevronDown,
  FaLock,
  FaAward,
  FaCheck,
  FaTimes,
  FaVideo,
  FaFlask,
  FaPills,
  FaHeartbeat,
  FaStar,
  FaArrowRight,
  FaShieldAlt,
  FaBolt,
  FaInfinity,
  FaUsers,
} from "react-icons/fa";

/* ─── Animations ─── */
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(142, 125, 190, 0.4); }
  50%       { box-shadow: 0 0 0 10px rgba(142, 125, 190, 0); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-8px); }
`;

/* ─── Page Shell ─── */
const Page = styled.div`
  background: #ffffff;
  font-family: "Inter", -apple-system, sans-serif;
  color: #111827;
  overflow-x: hidden;
`;

/* ══════════════════════════════
   HERO
══════════════════════════════ */
const Hero = styled.section`
  background: #8e7dbe;
  padding: 96px 24px 0;
  text-align: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: -120px;
    left: 50%;
    transform: translateX(-50%);
    width: 800px;
    height: 800px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.06);
    pointer-events: none;
  }

  &::after {
    content: "";
    position: absolute;
    bottom: -2px;
    left: 0;
    right: 0;
    height: 80px;
    background: #ffffff;
    clip-path: ellipse(60% 100% at 50% 100%);
  }
`;

const HeroBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #ffffff;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 24px;
  animation: ${fadeUp} 0.5s ease both;
`;

const HeroTitle = styled.h1`
  font-size: clamp(2.8rem, 6vw, 5rem);
  font-weight: 900;
  color: #ffffff;
  margin: 0 0 20px;
  letter-spacing: -0.04em;
  line-height: 1.05;
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.15);
  animation: ${fadeUp} 0.55s ease 0.05s both;

  span {
    position: relative;
    display: inline-block;
    color: #f3e8ff;
  }
`;

const HeroSubtitle = styled.p`
  font-size: 1.15rem;
  color: rgba(255, 255, 255, 0.85);
  max-width: 580px;
  margin: 0 auto 40px;
  line-height: 1.7;
  animation: ${fadeUp} 0.6s ease 0.1s both;
`;

const HeroCta = styled.div`
  display: flex;
  justify-content: center;
  gap: 14px;
  flex-wrap: wrap;
  animation: ${fadeUp} 0.65s ease 0.15s both;
  margin-bottom: 64px;
`;

const BtnPrimary = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 16px 32px;
  border-radius: 14px;
  background: #ffffff;
  color: #683b93;
  font-size: 1rem;
  font-weight: 800;
  text-decoration: none;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  transition: all 0.22s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
  }
`;

const BtnOutline = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 16px 28px;
  border-radius: 14px;
  border: 2px solid rgba(255, 255, 255, 0.45);
  color: #ffffff;
  font-size: 1rem;
  font-weight: 700;
  text-decoration: none;
  transition: all 0.22s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.7);
  }
`;

/* ─── Social Proof bar ─── */
const ProofBar = styled.div`
  background: #f9f7ff;
  border-top: 1px solid #ede8f8;
  border-bottom: 1px solid #ede8f8;
  padding: 22px 24px;
`;

const ProofInner = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 48px;
  flex-wrap: wrap;
`;

const ProofStat = styled.div`
  text-align: center;

  strong {
    display: block;
    font-size: 1.6rem;
    font-weight: 900;
    color: #683b93;
    letter-spacing: -0.03em;
  }

  span {
    font-size: 0.82rem;
    color: #6b7280;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
`;

const ProofDivider = styled.div`
  width: 1px;
  height: 40px;
  background: #e5daf5;

  @media (max-width: 640px) { display: none; }
`;

/* ══════════════════════════════
   BENEFITS
══════════════════════════════ */
const Section = styled.section`
  max-width: 1160px;
  margin: 0 auto;
  padding: ${({ pad }) => pad || "80px 24px"};
`;

const SectionLabel = styled.p`
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #8e7dbe;
  text-align: center;
  margin: 0 0 12px;
`;

const SectionTitle = styled.h2`
  font-size: clamp(1.8rem, 4vw, 2.8rem);
  font-weight: 900;
  color: #111827;
  text-align: center;
  margin: 0 0 16px;
  letter-spacing: -0.04em;
  line-height: 1.15;

  span { color: #683b93; }
`;

const SectionSubtitle = styled.p`
  font-size: 1rem;
  color: #6b7280;
  text-align: center;
  max-width: 520px;
  margin: 0 auto 56px;
  line-height: 1.7;
`;

const BenefitsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;

  @media (max-width: 1024px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 560px) { grid-template-columns: 1fr; }
`;

const BenefitCard = styled.div`
  padding: 28px 24px;
  border-radius: 20px;
  background: #ffffff;
  border: 1.5px solid #f0e8fb;
  box-shadow: 0 2px 14px rgba(104, 59, 147, 0.05);
  transition: all 0.25s ease;
  animation: ${fadeUp} 0.5s ease ${({ delay }) => delay || "0s"} both;

  &:hover {
    border-color: #c4a6e8;
    box-shadow: 0 12px 32px rgba(104, 59, 147, 0.1);
    transform: translateY(-4px);
  }
`;

const BenefitIconWrap = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: #f3e8fc;
  color: #683b93;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  margin-bottom: 18px;
`;

const BenefitTitle = styled.h3`
  font-size: 1rem;
  font-weight: 800;
  color: #111827;
  margin: 0 0 8px;
  letter-spacing: -0.01em;
`;

const BenefitText = styled.p`
  font-size: 0.88rem;
  color: #6b7280;
  line-height: 1.65;
  margin: 0;
`;

/* ══════════════════════════════
   PRICING
══════════════════════════════ */
const PricingSection = styled.section`
  background: #f9f7ff;
  padding: 80px 24px 100px;
`;

const PricingInner = styled.div`
  max-width: 1160px;
  margin: 0 auto;
`;

const PricingToggle = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin-bottom: 52px;
`;

const ToggleLabel = styled.span`
  font-size: 0.92rem;
  font-weight: 700;
  color: ${({ active }) => (active ? "#111827" : "#9ca3af")};
`;

const ToggleTrack = styled.button`
  position: relative;
  width: 52px;
  height: 28px;
  border-radius: 999px;
  border: none;
  background: ${({ on }) => (on ? "#683b93" : "#d1d5db")};
  cursor: pointer;
  transition: background 0.25s ease;
  padding: 0;
`;

const ToggleThumb = styled.div`
  position: absolute;
  top: 3px;
  left: ${({ on }) => (on ? "25px" : "3px")};
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #ffffff;
  transition: left 0.25s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
`;

const SaveBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  background: #f3e8fc;
  color: #683b93;
  font-size: 0.75rem;
  font-weight: 800;
`;

const PlansGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  align-items: start;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
    max-width: 440px;
    margin: 0 auto;
  }
`;

const PlanCard = styled.div`
  border-radius: 24px;
  background: #ffffff;
  border: 2px solid ${({ featured }) => (featured ? "#8e7dbe" : "#f0e8fb")};
  padding: 36px 28px;
  position: relative;
  transition: all 0.25s ease;
  box-shadow: ${({ featured }) =>
    featured
      ? "0 20px 48px rgba(104, 59, 147, 0.18)"
      : "0 2px 16px rgba(104, 59, 147, 0.05)"};
  transform: ${({ featured }) => (featured ? "scale(1.03)" : "scale(1)")};

  &:hover {
    box-shadow: 0 20px 48px rgba(104, 59, 147, 0.14);
    transform: ${({ featured }) => (featured ? "scale(1.05)" : "translateY(-4px)")};
  }

  @media (max-width: 860px) {
    transform: none !important;
    &:hover { transform: translateY(-4px) !important; }
  }
`;

const PopularBadge = styled.div`
  position: absolute;
  top: -14px;
  left: 50%;
  transform: translateX(-50%);
  background: #683b93;
  color: #ffffff;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 5px 18px;
  border-radius: 999px;
  white-space: nowrap;
  animation: ${pulse} 2.5s ease infinite;
`;

const PlanName = styled.h3`
  font-size: 1rem;
  font-weight: 800;
  color: ${({ featured }) => (featured ? "#683b93" : "#6b7280")};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 0 0 14px;
`;

const PlanPrice = styled.div`
  margin-bottom: 6px;
  display: flex;
  align-items: baseline;
  gap: 6px;

  strong {
    font-size: 3rem;
    font-weight: 900;
    color: #111827;
    letter-spacing: -0.05em;
    line-height: 1;
  }

  sup {
    font-size: 0.78rem;
    font-weight: 800;
    color: #9ca3af;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    vertical-align: baseline;
    margin-right: -2px;
  }

  sub {
    font-size: 0.88rem;
    font-weight: 600;
    color: #9ca3af;
  }
`;

const PlanAnnualNote = styled.p`
  font-size: 0.8rem;
  color: #9ca3af;
  margin: 0 0 22px;
`;

const PlanDescription = styled.p`
  font-size: 0.88rem;
  color: #6b7280;
  line-height: 1.65;
  margin: 0 0 26px;
  padding-bottom: 26px;
  border-bottom: 1px solid #f3e8fc;
`;

const PlanFeatureList = styled.ul`
  list-style: none;
  margin: 0 0 30px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const PlanFeatureItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 0.88rem;
  color: ${({ muted }) => (muted ? "#9ca3af" : "#374151")};
  text-decoration: ${({ muted }) => (muted ? "none" : "none")};
`;

const CheckIcon = styled.span`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: ${({ on }) => (on ? "#f3e8fc" : "#f9fafb")};
  color: ${({ on }) => (on ? "#683b93" : "#d1d5db")};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
  font-size: 10px;
`;

const PlanCta = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 800;
  text-decoration: none;
  transition: all 0.22s ease;
  border: 2px solid transparent;

  ${({ featured }) =>
    featured
      ? css`
          background: #683b93;
          color: #ffffff;
          box-shadow: 0 6px 18px rgba(104, 59, 147, 0.3);
          &:hover {
            background: #5a3180;
            transform: translateY(-2px);
            box-shadow: 0 10px 24px rgba(104, 59, 147, 0.36);
          }
        `
      : css`
          background: #f9f7ff;
          color: #683b93;
          border-color: #e9d5ff;
          &:hover {
            background: #f3e8fc;
            border-color: #c4a6e8;
          }
        `}
`;

/* ══════════════════════════════
   COMPARISON TABLE
══════════════════════════════ */
const CompareSection = styled.section`
  max-width: 1000px;
  margin: 0 auto;
  padding: 80px 24px 100px;
  overflow-x: auto;
`;

const CompareTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 640px;
`;

const CompareTh = styled.th`
  padding: 14px 20px;
  text-align: ${({ left }) => (left ? "left" : "center")};
  font-size: 0.82rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: ${({ featured }) => (featured ? "#683b93" : "#9ca3af")};
  border-bottom: 2px solid ${({ featured }) => (featured ? "#e9d5ff" : "#f3f4f6")};
  background: ${({ featured }) => (featured ? "#faf7ff" : "transparent")};
`;

const CompareTr = styled.tr`
  &:hover td { background: #faf7ff; }
`;

const CompareTd = styled.td`
  padding: 15px 20px;
  text-align: ${({ left }) => (left ? "left" : "center")};
  font-size: 0.88rem;
  color: ${({ label }) => (label ? "#374151" : "#6b7280")};
  font-weight: ${({ label }) => (label ? "600" : "400")};
  border-bottom: 1px solid #f3f4f6;
  background: ${({ featured }) => (featured ? "rgba(243,232,252,0.15)" : "transparent")};
  transition: background 0.15s ease;
`;

const GroupRow = styled.tr`
  td {
    padding: 20px 20px 8px;
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #9ca3af;
    border-bottom: none;
  }
`;

/* ══════════════════════════════
   FAQ
══════════════════════════════ */
const FaqSection = styled.section`
  background: #f9f7ff;
  padding: 80px 24px 100px;
`;

const FaqInner = styled.div`
  max-width: 760px;
  margin: 0 auto;
`;

const FaqItem = styled.div`
  background: #ffffff;
  border-radius: 16px;
  margin-bottom: 12px;
  border: 1.5px solid ${({ open }) => (open ? "#c4a6e8" : "#f0e8fb")};
  overflow: hidden;
  transition: border-color 0.2s ease;
  box-shadow: ${({ open }) => (open ? "0 4px 20px rgba(104,59,147,0.08)" : "0 1px 6px rgba(0,0,0,0.03)")};
`;

const FaqHeader = styled.button`
  width: 100%;
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  border: none;
  background: transparent;
  text-align: left;
  gap: 16px;
  font-family: inherit;

  h4 {
    margin: 0;
    font-size: 0.97rem;
    font-weight: 700;
    color: ${({ open }) => (open ? "#683b93" : "#111827")};
    line-height: 1.45;
  }
`;

const FaqChevron = styled.span`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: ${({ open }) => (open ? "#f3e8fc" : "#f9fafb")};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: ${({ open }) => (open ? "#683b93" : "#9ca3af")};
  transition: all 0.25s ease;
  transform: ${({ open }) => (open ? "rotate(180deg)" : "rotate(0deg)")};
`;

const FaqBody = styled.div`
  max-height: ${({ open }) => (open ? "300px" : "0")};
  overflow: hidden;
  transition: max-height 0.3s ease;

  p {
    margin: 0;
    padding: 0 24px 22px;
    font-size: 0.9rem;
    color: #6b7280;
    line-height: 1.7;
    border-top: 1px solid #f3e8fc;
    padding-top: 16px;
  }
`;

/* ══════════════════════════════
   TRUST FOOTER BAR
══════════════════════════════ */
const TrustBar = styled.section`
  background: #683b93;
  padding: 48px 24px;
`;

const TrustGrid = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  justify-content: space-around;
  align-items: center;
  flex-wrap: wrap;
  gap: 36px;
`;

const TrustItem = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;

  svg {
    font-size: 26px;
    color: rgba(255, 255, 255, 0.85);
    flex-shrink: 0;
  }
`;

const TrustText = styled.div`
  h4 {
    margin: 0 0 2px;
    font-size: 0.95rem;
    font-weight: 800;
    color: #ffffff;
    text-shadow: 0 1px 4px rgba(0,0,0,0.2);
  }

  p {
    margin: 0;
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.72);
    text-shadow: 0 1px 3px rgba(0,0,0,0.15);
  }
`;

/* ══════════════════════════════
   CTA BANNER
══════════════════════════════ */
const CtaBanner = styled.section`
  background: #ffffff;
  padding: 80px 24px;
  text-align: center;
`;

const CtaCard = styled.div`
  max-width: 680px;
  margin: 0 auto;
  background: #8e7dbe;
  border-radius: 28px;
  padding: 56px 48px;
  box-shadow: 0 20px 60px rgba(142, 125, 190, 0.3);
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: -60px;
    right: -60px;
    width: 200px;
    height: 200px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.08);
  }

  &::after {
    content: "";
    position: absolute;
    bottom: -40px;
    left: -40px;
    width: 160px;
    height: 160px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.06);
  }

  @media (max-width: 560px) { padding: 40px 28px; }
`;

const CtaTitle = styled.h2`
  font-size: clamp(1.6rem, 4vw, 2.4rem);
  font-weight: 900;
  color: #ffffff;
  margin: 0 0 14px;
  letter-spacing: -0.04em;
  text-shadow: 0 2px 10px rgba(0,0,0,0.15);
  position: relative;
  z-index: 1;
`;

const CtaSubtitle = styled.p`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.82);
  margin: 0 0 32px;
  line-height: 1.65;
  position: relative;
  z-index: 1;
  text-shadow: 0 1px 4px rgba(0,0,0,0.1);
`;

const CtaButtonRow = styled.div`
  display: flex;
  justify-content: center;
  gap: 14px;
  flex-wrap: wrap;
  position: relative;
  z-index: 1;
`;

/* ══════════════════════════════
   DATA
══════════════════════════════ */
const BENEFITS = [
  { icon: <FaBolt />, title: "Priority Booking", text: "Skip the waitlist. Get instant booking with top specialists, any time." },
  { icon: <FaPercentage />, title: "Exclusive Discounts", text: "Save up to 20% on labs, medicines, and consultation fees." },
  { icon: <FaClock />, title: "24/7 Support", text: "Round-the-clock access to our medical support team." },
  { icon: <FaMobileAlt />, title: "Unlimited Health Records", text: "Cloud storage for all prescriptions, history, and lab reports." },
  { icon: <FaVideo />, title: "Free Video Sessions", text: "Monthly free virtual consultations included in every plan." },
  { icon: <FaFlask />, title: "Lab Test Discounts", text: "Priority access to partner labs with member-only rates." },
  { icon: <FaPills />, title: "Pharmacy Benefits", text: "Exclusive pharmacy discounts and free home delivery." },
  { icon: <FaUsers />, title: "Family Coverage", text: "Cover your entire family under one DocX Plus membership." },
];

const PLANS = [
  {
    id: "general",
    name: "General Care",
    monthly: 4900,
    annual: 3900,
    desc: "Ideal for individuals seeking essential healthcare services and preventive care.",
    features: [
      { text: "1 consultation per month", on: true },
      { text: "Basic diagnostics & lab tests", on: true },
      { text: "Digital prescriptions", on: true },
      { text: "24/7 chat support", on: true },
      { text: "10% pharmacy discount", on: true },
      { text: "Family coverage", on: false },
      { text: "Priority booking", on: false },
      { text: "Specialist access", on: false },
    ],
    featured: false,
    cta: "Start with General",
  },
  {
    id: "premium",
    name: "Premium Care",
    monthly: 9900,
    annual: 7900,
    desc: "For patients requiring frequent consultations, specialist access and family care.",
    features: [
      { text: "3 consultations per month", on: true },
      { text: "Advanced diagnostics & labs", on: true },
      { text: "Digital prescriptions", on: true },
      { text: "24/7 priority support", on: true },
      { text: "15% pharmacy discount", on: true },
      { text: "Family coverage (2 members)", on: true },
      { text: "Priority booking", on: true },
      { text: "Specialist consultations", on: true },
    ],
    featured: true,
    cta: "Start with Premium",
  },
  {
    id: "vip",
    name: "VIP Care",
    monthly: 14900,
    annual: 11900,
    desc: "All-inclusive care with unlimited access, comprehensive monitoring and VIP perks.",
    features: [
      { text: "Unlimited consultations", on: true },
      { text: "Full diagnostics panel", on: true },
      { text: "Digital prescriptions", on: true },
      { text: "Dedicated care concierge", on: true },
      { text: "20% pharmacy discount", on: true },
      { text: "Family coverage (4 members)", on: true },
      { text: "Immediate emergency access", on: true },
      { text: "Comprehensive health monitoring", on: true },
    ],
    featured: false,
    cta: "Start with VIP",
  },
];

const COMPARE_FEATURES = [
  { group: "Consultations", rows: [
    { label: "Monthly consultations", general: "1", premium: "3", vip: "Unlimited" },
    { label: "Specialist access", general: false, premium: true, vip: true },
    { label: "Emergency access", general: false, premium: false, vip: true },
    { label: "Video consultations", general: true, premium: true, vip: true },
  ]},
  { group: "Coverage & Benefits", rows: [
    { label: "Family members covered", general: "1", premium: "2", vip: "4" },
    { label: "Pharmacy discount", general: "10%", premium: "15%", vip: "20%" },
    { label: "Lab test discount", general: "5%", premium: "12%", vip: "20%" },
    { label: "Free home delivery", general: false, premium: true, vip: true },
  ]},
  { group: "Digital & Support", rows: [
    { label: "Digital prescriptions", general: true, premium: true, vip: true },
    { label: "Cloud health records", general: true, premium: true, vip: true },
    { label: "24/7 support", general: "Chat", premium: "Priority", vip: "Dedicated" },
    { label: "Health monitoring", general: false, premium: false, vip: true },
  ]},
];

const FAQS = [
  { q: "Can I cancel my subscription anytime?", a: "Yes. Cancel anytime from your dashboard — your benefits continue until the end of the billing cycle. No hidden fees, no questions asked." },
  { q: "Is family coverage included in all plans?", a: "Family coverage is available in Premium (up to 2 members) and VIP (up to 4 members) plans. General Care is for individuals only." },
  { q: "Are the doctors on DocX verified?", a: "Every doctor on DocX is thoroughly vetted, verified, and certified. We require up-to-date credentials and conduct ongoing quality reviews." },
  { q: "How do digital prescriptions work?", a: "After your consultation, the doctor uploads a digital prescription to your account. Use it to order directly from our pharmacy or any local store." },
  { q: "What happens if I miss my monthly consultations?", a: "Unused consultations on General and Premium plans do not roll over. VIP members enjoy unlimited consultations so there's nothing to miss." },
  { q: "Is there a free trial?", a: "We offer a 7-day free trial on the Premium plan. No credit card required to start. You can upgrade, downgrade, or cancel at any time." },
];

/* ══════════════════════════════
   COMPONENT
══════════════════════════════ */
const Membership = () => {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const renderCheck = (val) => {
    if (val === true)
      return <CheckIcon on><FaCheck /></CheckIcon>;
    if (val === false)
      return <CheckIcon><FaTimes style={{ fontSize: 9, color: "#d1d5db" }} /></CheckIcon>;
    return <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "#374151" }}>{val}</span>;
  };

  return (
    <Page>
      <Navigationbar />

      {/* ── HERO ── */}
      <Hero>
        <HeroBadge><FaStar size={10} /> DocX Plus Membership</HeroBadge>
        <HeroTitle>
          Healthcare that works<br />
          <span>as hard as you do</span>
        </HeroTitle>
        <HeroSubtitle>
          Priority access to top doctors, exclusive discounts, family coverage, and 24/7 support — all in one membership built around you.
        </HeroSubtitle>
        <HeroCta>
          <BtnPrimary to="#pricing" onClick={e => { e.preventDefault(); document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" }); }}>
            View plans <FaArrowRight size={13} />
          </BtnPrimary>
          <BtnOutline to="/find-doctors">
            Explore doctors
          </BtnOutline>
        </HeroCta>
      </Hero>

      {/* ── PROOF BAR ── */}
      <ProofBar>
        <ProofInner>
          <ProofStat><strong>12,000+</strong><span>Active members</span></ProofStat>
          <ProofDivider />
          <ProofStat><strong>500+</strong><span>Verified doctors</span></ProofStat>
          <ProofDivider />
          <ProofStat><strong>4.9 ★</strong><span>Member rating</span></ProofStat>
          <ProofDivider />
          <ProofStat><strong>97%</strong><span>Satisfaction rate</span></ProofStat>
          <ProofDivider />
          <ProofStat><strong>30-day</strong><span>Money-back guarantee</span></ProofStat>
        </ProofInner>
      </ProofBar>

      {/* ── BENEFITS ── */}
      <Section pad="88px 24px 80px">
        <SectionLabel>Why DocX Plus</SectionLabel>
        <SectionTitle>Everything you need,<br /><span>nothing you don't</span></SectionTitle>
        <SectionSubtitle>One membership unlocks a full suite of healthcare benefits designed around your real-world needs.</SectionSubtitle>
        <BenefitsGrid>
          {BENEFITS.map((b, i) => (
            <BenefitCard key={b.title} delay={`${i * 0.06}s`}>
              <BenefitIconWrap>{b.icon}</BenefitIconWrap>
              <BenefitTitle>{b.title}</BenefitTitle>
              <BenefitText>{b.text}</BenefitText>
            </BenefitCard>
          ))}
        </BenefitsGrid>
      </Section>

      {/* ── PRICING ── */}
      <PricingSection id="pricing">
        <PricingInner>
          <SectionLabel>Simple pricing</SectionLabel>
          <SectionTitle>Choose your <span>plan</span></SectionTitle>
          <SectionSubtitle>All plans include a 7-day free trial. Switch or cancel anytime.</SectionSubtitle>

          <PricingToggle>
            <ToggleLabel active={!annual}>Monthly</ToggleLabel>
            <ToggleTrack on={annual} onClick={() => setAnnual(!annual)}>
              <ToggleThumb on={annual} />
            </ToggleTrack>
            <ToggleLabel active={annual}>Annual</ToggleLabel>
            {annual && <SaveBadge>Save up to 20%</SaveBadge>}
          </PricingToggle>

          <PlansGrid>
            {PLANS.map((plan) => (
              <PlanCard key={plan.id} featured={plan.featured}>
                {plan.featured && <PopularBadge>⭐ Most popular</PopularBadge>}

                <PlanName featured={plan.featured}>{plan.name}</PlanName>

                <PlanPrice>
                  <sup>LKR</sup>
                  <strong>{(annual ? plan.annual : plan.monthly).toLocaleString("en-LK")}</strong>
                  <sub>&nbsp;/ month</sub>
                </PlanPrice>

                <PlanAnnualNote>
                  {annual
                    ? `Billed LKR ${(plan.annual * 12).toLocaleString("en-LK")}/year`
                    : "Billed monthly · cancel anytime"}
                </PlanAnnualNote>

                <PlanDescription>{plan.desc}</PlanDescription>

                <PlanFeatureList>
                  {plan.features.map((f) => (
                    <PlanFeatureItem key={f.text} muted={!f.on}>
                      <CheckIcon on={f.on}>
                        {f.on ? <FaCheck /> : <FaTimes style={{ fontSize: 9 }} />}
                      </CheckIcon>
                      {f.text}
                    </PlanFeatureItem>
                  ))}
                </PlanFeatureList>

                <PlanCta
                  featured={plan.featured}
                  to={`/membership-checkout?plan=${plan.id}`}
                >
                  {plan.cta} <FaArrowRight size={12} />
                </PlanCta>
              </PlanCard>
            ))}
          </PlansGrid>
        </PricingInner>
      </PricingSection>

      {/* ── COMPARISON TABLE ── */}
      <CompareSection>
        <SectionLabel>Detailed comparison</SectionLabel>
        <SectionTitle style={{ marginBottom: 8 }}>Compare <span>all features</span></SectionTitle>
        <SectionSubtitle>See exactly what's included in every plan before you decide.</SectionSubtitle>

        <CompareTable>
          <thead>
            <tr>
              <CompareTh left style={{ width: "40%" }}>Feature</CompareTh>
              <CompareTh>General</CompareTh>
              <CompareTh featured>Premium</CompareTh>
              <CompareTh>VIP</CompareTh>
            </tr>
          </thead>
          <tbody>
            {COMPARE_FEATURES.map((group) => (
              <React.Fragment key={group.group}>
                <GroupRow>
                  <td colSpan={4}>{group.group}</td>
                </GroupRow>
                {group.rows.map((row) => (
                  <CompareTr key={row.label}>
                    <CompareTd left label>{row.label}</CompareTd>
                    <CompareTd>{renderCheck(row.general)}</CompareTd>
                    <CompareTd featured>{renderCheck(row.premium)}</CompareTd>
                    <CompareTd>{renderCheck(row.vip)}</CompareTd>
                  </CompareTr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </CompareTable>
      </CompareSection>

      {/* ── FAQ ── */}
      <FaqSection>
        <FaqInner>
          <SectionLabel>FAQ</SectionLabel>
          <SectionTitle style={{ marginBottom: 8 }}>Common <span>questions</span></SectionTitle>
          <SectionSubtitle>Everything you need to know about DocX Plus membership.</SectionSubtitle>

          {FAQS.map((faq, i) => (
            <FaqItem key={i} open={openFaq === i}>
              <FaqHeader open={openFaq === i} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <h4>{faq.q}</h4>
                <FaqChevron open={openFaq === i}><FaChevronDown size={12} /></FaqChevron>
              </FaqHeader>
              <FaqBody open={openFaq === i}>
                <p>{faq.a}</p>
              </FaqBody>
            </FaqItem>
          ))}
        </FaqInner>
      </FaqSection>

      {/* ── TRUST BAR ── */}
      <TrustBar>
        <TrustGrid>
          <TrustItem>
            <FaLock />
            <TrustText>
              <h4>Secure Payments</h4>
              <p>256-bit SSL encryption</p>
            </TrustText>
          </TrustItem>
          <TrustItem>
            <FaAward />
            <TrustText>
              <h4>Money-back Guarantee</h4>
              <p>30 days, no questions asked</p>
            </TrustText>
          </TrustItem>
          <TrustItem>
            <FaUserShield />
            <TrustText>
              <h4>Verified Doctors</h4>
              <p>100% certified specialists</p>
            </TrustText>
          </TrustItem>
          <TrustItem>
            <FaShieldAlt />
            <TrustText>
              <h4>HIPAA Compliant</h4>
              <p>Your health data is protected</p>
            </TrustText>
          </TrustItem>
        </TrustGrid>
      </TrustBar>

      {/* ── CTA BANNER ── */}
      <CtaBanner>
        <CtaCard>
          <CtaTitle>Ready to take control<br />of your health?</CtaTitle>
          <CtaSubtitle>
            Join 12,000+ members who trust DocX Plus for priority care, prescriptions, and family health management.
          </CtaSubtitle>
          <CtaButtonRow>
            <BtnPrimary to="/membership-checkout?plan=premium" style={{ background: "#ffffff", color: "#683b93" }}>
              Start free trial <FaArrowRight size={13} />
            </BtnPrimary>
            <BtnOutline to="/find-doctors">
              Browse doctors
            </BtnOutline>
          </CtaButtonRow>
        </CtaCard>
      </CtaBanner>

      <Footer />
    </Page>
  );
};

export default Membership;
