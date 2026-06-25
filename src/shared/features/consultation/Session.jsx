import React, { useEffect, useMemo, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
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
  FaTimesCircle,
  FaVideo,
  FaCommentDots,
  FaShieldAlt,
  FaStar,
  FaWifi,
  FaArrowRight,
  FaLock,
} from "react-icons/fa";
import {
  confirmDemoConsultation,
  createConsultationRequest,
  createConsultationStripeSession,
  fetchConsultationOptions,
  payConsultation,
} from "@/shared/features/Consultations/consultationClient";
import { isDemoPaymentAvailable } from "@/shared/features/Appointments/appointmentClient";
import { useToast } from "@/shared/context/ToastContext";
import api from "@/shared/lib/api";
import { getStoredAuthSession } from "@/shared/lib/authSession";
import { safeToLocaleDateString, safeToLocaleString } from "@/shared/lib/intlDate";
import { specialtyCatalog } from "@/shared/data/specialties";
import FieldError from "@/shared/components/common/FieldError";
import { clearFieldError, isValidEmail, validateRequiredFields } from "@/shared/lib/formValidation";

/* ─────────────────── Keyframes ─────────────────── */
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const shimmer = keyframes`
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
`;

const timerPulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.12); opacity: 0.7; }
`;

const holdFadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

/* ─────────────────── Page Shell ─────────────────── */
const Page = styled.div`
  min-height: 100vh;
  background: #f8f7fc;
  color: #111827;
  font-family: "Inter", -apple-system, sans-serif;
`;

/* ─────────────────── BROWSE VIEW ─────────────────── */
const BrowseWrapper = styled.div`
  min-height: 100vh;
  background: #ffffff;
`;

const BrowseHero = styled.section`
  position: relative;
  background: #8e7dbe;
  padding: 56px 0 0;
  overflow: hidden;
`;

const BrowseHeroGrid = styled.div`
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 60px;
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 48px;
  align-items: end;

  @media (max-width: 1080px) {
    grid-template-columns: 1fr;
    padding: 0 32px;
  }

  @media (max-width: 640px) {
    padding: 0 20px;
  }
`;

const BrowseHeroContent = styled.div`
  padding-bottom: 48px;
  animation: ${fadeUp} 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
`;

const HeroBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 20px;
`;

const BrowseHeroTitle = styled.h1`
  font-size: clamp(2.4rem, 5vw, 3.8rem);
  font-weight: 900;
  letter-spacing: -0.04em;
  color: #ffffff;
  margin: 0 0 16px;
  line-height: 1.05;

  span {
    color: #4c1d95;
  }
`;

const BrowseHeroSubtitle = styled.p`
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 32px;
  line-height: 1.65;
  max-width: 520px;
`;

const HeroStats = styled.div`
  display: flex;
  gap: 28px;
  flex-wrap: wrap;
`;

const HeroStat = styled.div`
  text-align: left;

  strong {
    display: block;
    font-size: 1.4rem;
    font-weight: 900;
    color: #ffffff;
    letter-spacing: -0.02em;
  }

  span {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.55);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
`;

const SearchPanel = styled.div`
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 24px;
  padding: 28px;
  margin-bottom: 24px;
  animation: ${fadeUp} 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;

  @media (max-width: 1080px) {
    border-radius: 24px;
    margin-bottom: 40px;
  }
`;

const SearchPanelTitle = styled.p`
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 18px;
`;

const SearchField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;

  label {
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: rgba(255, 255, 255, 0.65);
  }

  select, input {
    width: 100%;
    height: 52px;
    padding: 0 16px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
    font-size: 0.95rem;
    font-family: inherit;
    cursor: pointer;
    appearance: none;
    outline: none;
    transition: all 0.2s ease;
    box-sizing: border-box;

    &::placeholder { color: rgba(255, 255, 255, 0.4); }
    option { background: #2d1154; color: #ffffff; }

    &:focus {
      border-color: rgba(192, 132, 252, 0.7);
      background: rgba(255, 255, 255, 0.15);
      box-shadow: 0 0 0 4px rgba(192, 132, 252, 0.15);
    }
  }
`;

/* ─────────────────── Results section ─────────────────── */
const ResultsSection = styled.section`
  max-width: 1440px;
  margin: 0 auto;
  padding: 48px 60px 80px;

  @media (max-width: 1080px) { padding: 40px 32px 64px; }
  @media (max-width: 640px) { padding: 32px 20px 48px; }
`;

const ResultsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
  flex-wrap: wrap;
  gap: 12px;
`;

const ResultsTitle = styled.h2`
  font-size: 1.4rem;
  font-weight: 800;
  color: #111827;
  margin: 0;
  letter-spacing: -0.02em;

  span {
    color: #683b93;
  }
`;

const DirectoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

/* ─────────────────── Doctor Card ─────────────────── */
const DoctorCard = styled.article`
  border-radius: 22px;
  background: #ffffff;
  border: 1px solid #ede5f8;
  display: flex;
  flex-direction: column;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
  animation: ${fadeUp} 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  box-shadow: 0 2px 12px rgba(104, 59, 147, 0.05);

  &:hover {
    border-color: #c4a6e8;
    box-shadow: 0 12px 32px rgba(104, 59, 147, 0.12);
    transform: translateY(-4px);
  }
`;

const CardAccent = styled.div`
  height: 4px;
  background: #8e7dbe;
`;

const CardTop = styled.div`
  padding: 22px 22px 16px;
  display: flex;
  gap: 14px;
  align-items: center;
`;

const Avatar = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 18px;
  background: #683b93;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  color: #ffffff;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const CardNameBlock = styled.div`
  flex: 1;
  min-width: 0;

  h3 {
    margin: 0 0 4px;
    font-size: 1.05rem;
    font-weight: 800;
    color: #111827;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    letter-spacing: -0.02em;
  }

  p {
    margin: 0 0 6px;
    font-size: 0.82rem;
    color: #6b7280;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const FeePill = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  background: #f3e8fc;
  color: #683b93;
  font-size: 0.78rem;
  font-weight: 800;
`;

const CardBody = styled.div`
  padding: 0 22px 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const DetailRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.83rem;
  color: #6b7280;

  svg {
    flex-shrink: 0;
    color: #9ca3af;
    font-size: 11px;
  }
`;

const SlotSection = styled.div`
  margin-top: 6px;
  padding: 14px;
  border-radius: 14px;
  background: #faf7ff;
  border: 1px solid #f0e8fc;
`;

const SlotLabel = styled.p`
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #9ca3af;
  margin: 0 0 10px;
`;

const SlotGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const SlotButton = styled.button`
  background: ${(props) => (props.$selected ? "#683b93" : "#ffffff")};
  color: ${(props) => (props.$selected ? "#ffffff" : "#4b5563")};
  border: 1.5px solid ${(props) => (props.$selected ? "#683b93" : "#e5e7eb")};
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  opacity: ${(props) => (props.disabled ? 0.4 : 1)};
  transition: all 0.18s ease;
  font-family: inherit;

  &:hover:not(:disabled) {
    background: ${(props) => (props.$selected ? "#5a3180" : "#f3e8fc")};
    border-color: ${(props) => (props.$selected ? "#5a3180" : "#c084fc")};
    color: ${(props) => (props.$selected ? "#ffffff" : "#683b93")};
    transform: translateY(-1px);
  }
`;

/* ─────────────────── SPLIT LAYOUT (details/payment/selection) ─────────────────── */
const SplitPage = styled.div`
  display: grid;
  grid-template-columns: 420px 1fr;
  min-height: calc(100vh - 70px);
  animation: ${fadeIn} 0.4s ease forwards;

  @media (max-width: 1080px) {
    grid-template-columns: 1fr;
  }
`;

const SidePanel = styled.aside`
  background: #8e7dbe;
  padding: 48px 40px;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;

  @media (max-width: 1080px) {
    position: static;
    height: auto;
    padding: 36px 28px;
  }
`;

const SidePanelBrand = styled.div`
  margin-bottom: 40px;
`;

const SideBrandText = styled.p`
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #ffffff;
  margin: 0 0 8px;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
`;

const SideTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 900;
  color: #ffffff;
  margin: 0;
  letter-spacing: -0.03em;
  line-height: 1.2;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
`;

const DoctorSideCard = styled.div`
  padding: 22px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.22);
  margin-bottom: 20px;
  animation: ${fadeUp} 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
`;

const DoctorSideAvatar = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.18);
  border: 2px solid rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.95);
  font-size: 26px;
  margin-bottom: 14px;
`;

const DoctorSideName = styled.h3`
  font-size: 1.15rem;
  font-weight: 800;
  color: #ffffff;
  margin: 0 0 4px;
  letter-spacing: -0.02em;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.2);
`;

const DoctorSideSpecialty = styled.p`
  font-size: 0.85rem;
  color: #ffffff;
  margin: 0 0 14px;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
`;

const DoctorSideFee = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.25);

  span {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #ffffff;
  }

  strong {
    font-size: 1rem;
    font-weight: 900;
    color: #ffffff;
  }
`;

const SideDetailGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 24px;
  animation: ${fadeUp} 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both;
`;

const SideDetailItem = styled.div`
  display: flex;
  gap: 14px;
  align-items: center;
`;

const SideDetailIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  flex-shrink: 0;
  font-size: 14px;
`;

const SideDetailText = styled.div`
  span {
    display: block;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #ffffff;
    margin-bottom: 2px;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  }

  strong {
    display: block;
    font-size: 0.92rem;
    font-weight: 700;
    color: #ffffff;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  }
`;

const SideTrustSection = styled.div`
  margin-top: auto;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  animation: ${fadeUp} 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
`;

const TrustItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;

  svg {
    color: #ffffff;
    flex-shrink: 0;
    filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.2));
  }

  span {
    font-size: 0.82rem;
    color: #ffffff;
    font-weight: 500;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  }
`;

const SideChangeLink = styled.button`
  margin-top: 16px;
  padding: 0;
  border: none;
  background: transparent;
  color: #ffffff;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: inherit;
  transition: opacity 0.2s ease;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);

  &:hover { opacity: 0.75; }
`;

/* ─────────────────── Main Form Panel ─────────────────── */
const MainPanel = styled.main`
  background: #f8f7fc;
  padding: 48px 56px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;

  @media (max-width: 1280px) { padding: 40px 40px; }
  @media (max-width: 1080px) { padding: 32px 28px; }
  @media (max-width: 640px) { padding: 24px 20px; }
`;

const PanelTopBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
  flex-wrap: wrap;
  gap: 12px;
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #683b93;
  text-decoration: none;
  font-size: 0.88rem;
  font-weight: 700;
  transition: gap 0.2s ease;

  &:hover { gap: 12px; }
`;

const StepBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  background: ${(props) => (props.$warning ? "#fef3c7" : "#f3e8fc")};
  color: ${(props) => (props.$warning ? "#d97706" : "#683b93")};
  border: 1px solid ${(props) => (props.$warning ? "#fde68a" : "#e9d5ff")};
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

const PanelTitle = styled.h1`
  font-size: clamp(1.8rem, 3vw, 2.5rem);
  font-weight: 900;
  color: #111827;
  margin: 0 0 8px;
  letter-spacing: -0.04em;
  line-height: 1.1;
`;

const PanelSubtitle = styled.p`
  font-size: 1rem;
  color: #6b7280;
  margin: 0 0 36px;
  line-height: 1.65;
`;

/* ─────────────────── Form elements ─────────────────── */
const FormCard = styled.div`
  background: #ffffff;
  border-radius: 20px;
  border: 1px solid #f0e8fc;
  padding: 28px;
  margin-bottom: 20px;
  box-shadow: 0 2px 12px rgba(104, 59, 147, 0.05);
  animation: ${fadeUp} 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
`;

const FormCardTitle = styled.h3`
  font-size: 1rem;
  font-weight: 800;
  color: #111827;
  margin: 0 0 20px;
  letter-spacing: -0.01em;
  display: flex;
  align-items: center;
  gap: 10px;

  &::after {
    content: "";
    flex: 1;
    height: 1px;
    background: #f3e8fc;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;

  label {
    font-size: 0.82rem;
    font-weight: 700;
    color: #374151;
    letter-spacing: 0.01em;
  }

  input,
  select,
  textarea {
    width: 100%;
    padding: 13px 16px;
    border-radius: 12px;
    border: 1.5px solid #e5e7eb;
    background: #f9fafb;
    color: #111827;
    font-size: 0.95rem;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
    transition: all 0.2s ease;

    &:focus {
      border-color: #683b93;
      background: #ffffff;
      box-shadow: 0 0 0 4px rgba(104, 59, 147, 0.08);
    }

    &::placeholder { color: #9ca3af; }
  }

  textarea {
    min-height: 108px;
    resize: vertical;
    line-height: 1.6;
  }
`;

/* ─────────────────── Alert / Message ─────────────────── */
const Alert = styled.div`
  padding: 14px 16px;
  border-radius: 14px;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  border: 1px solid ${(props) => (props.$error ? "rgba(220, 38, 38, 0.16)" : "rgba(180, 83, 9, 0.18)")};
  background: ${(props) => (props.$error ? "#fee2e2" : "#fff7ed")};
  color: ${(props) => (props.$error ? "#b91c1c" : "#b45309")};
  font-size: 0.88rem;
  font-weight: 600;
  line-height: 1.6;
`;

/* ─────────────────── Payment Card ─────────────────── */
const PaymentCard = styled.div`
  background: #ffffff;
  border-radius: 20px;
  border: 1px solid #f0e8fc;
  padding: 28px;
  margin-bottom: 20px;
  box-shadow: 0 2px 12px rgba(104, 59, 147, 0.05);
`;

const PaymentRows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 16px;
  padding: 16px;
  background: #faf7ff;
  border-radius: 14px;
  border: 1px solid #f0e8fc;
`;

const PaymentRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-size: 0.92rem;
  color: #6b7280;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0e8fc;

  &:last-child {
    padding-bottom: 0;
    border-bottom: none;
    color: #111827;
    font-weight: 800;
    font-size: 1rem;
  }

  strong {
    color: #111827;
    font-weight: 700;
  }
`;

/* ─────────────────── Buttons ─────────────────── */
const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const PrimaryButton = styled.button`
  min-height: 52px;
  padding: 0 28px;
  border-radius: 14px;
  border: none;
  background: #683b93;
  color: #ffffff;
  font-size: 0.95rem;
  font-weight: 800;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 4px 16px rgba(104, 59, 147, 0.25);
  transition: all 0.2s ease;
  font-family: inherit;

  &:hover:not(:disabled) {
    background: #5a3180;
    box-shadow: 0 8px 22px rgba(104, 59, 147, 0.32);
    transform: translateY(-2px);
  }

  &:disabled {
    cursor: wait;
    opacity: 0.7;
    box-shadow: none;
    transform: none;
  }
`;

const SecondaryButton = styled.button`
  min-height: 52px;
  padding: 0 22px;
  border-radius: 14px;
  border: 1.5px solid #e5e7eb;
  background: #ffffff;
  color: #374151;
  font-size: 0.92rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;

  &:hover:not(:disabled) {
    border-color: #d8b4fe;
    color: #683b93;
    background: #faf7ff;
  }

  &:disabled { opacity: 0.6; cursor: wait; }
`;

/* ─────────────────── Empty / Loading States ─────────────────── */
const EmptyCard = styled.div`
  grid-column: 1 / -1;
  padding: 64px 40px;
  border-radius: 24px;
  background: #ffffff;
  border: 1px solid #f0e8fc;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  animation: ${fadeUp} 0.5s ease forwards;
  box-shadow: 0 2px 12px rgba(104, 59, 147, 0.05);
`;

const EmptyIcon = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 24px;
  background: #f3e8fc;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    font-size: 28px;
    color: #683b93;
  }
`;

const EmptyTitle = styled.h3`
  margin: 0;
  font-size: 1.3rem;
  font-weight: 800;
  color: #111827;
  letter-spacing: -0.02em;
`;

const EmptyText = styled.p`
  margin: 0;
  font-size: 0.95rem;
  color: #6b7280;
  max-width: 460px;
  line-height: 1.65;
`;

/* ─────────────────── Selection slot card ─────────────────── */
const SelectionSlotCard = styled.div`
  background: #ffffff;
  border-radius: 20px;
  border: 1px solid #f0e8fc;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 2px 12px rgba(104, 59, 147, 0.05);
`;

const SlotCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;

  h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 800;
    color: #111827;
    letter-spacing: -0.01em;
  }

  p {
    margin: 4px 0 0;
    font-size: 0.82rem;
    color: #6b7280;
    line-height: 1.5;
  }
`;

const SlotCountBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: ${(props) => (props.$loading ? "#fef3c7" : "#f3e8fc")};
  color: ${(props) => (props.$loading ? "#d97706" : "#683b93")};
  border: 1px solid ${(props) => (props.$loading ? "#fde68a" : "#e9d5ff")};
  font-size: 0.78rem;
  font-weight: 800;
  white-space: nowrap;
`;

/* ─────────────────── Hold Timer ─────────────────── */
const HOLD_DURATION_MS = 10 * 60 * 1000;
const RING_CIRCUMFERENCE = 2 * Math.PI * 19;

const TimerWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  border-radius: 14px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  margin-bottom: 18px;
  animation: ${holdFadeIn} 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
`;

const TimerRing = styled.div`
  position: relative;
  width: 44px;
  height: 44px;
  flex-shrink: 0;

  svg {
    width: 44px;
    height: 44px;
    transform: rotate(-90deg);
  }

  .timer-bg { fill: none; stroke: #fde68a; stroke-width: 3.5; }
  .timer-fg { fill: none; stroke: #d97706; stroke-width: 3.5; stroke-linecap: round; transition: stroke-dashoffset 1s linear; }
`;

const TimerClockIcon = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #b45309;
  font-size: 14px;
  animation: ${timerPulse} 2s ease-in-out infinite;
`;

const TimerText = styled.div`
  flex: 1;
  min-width: 0;

  .timer-title { font-size: 0.85rem; font-weight: 800; color: #92400e; margin: 0 0 2px; }
  .timer-subtitle { font-size: 0.78rem; color: #b45309; margin: 0; line-height: 1.5; }
`;

const SlotHoldTimer = ({ startedAt }) => {
  const [progress, setProgress] = useState(1);
  const frameRef = useRef(null);
  const startRef = useRef(startedAt || Date.now());

  useEffect(() => {
    startRef.current = startedAt || Date.now();
  }, [startedAt]);

  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, 1 - elapsed / HOLD_DURATION_MS);
      setProgress(remaining);
      if (remaining > 0) frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, []);

  const dashOffset = RING_CIRCUMFERENCE * (1 - progress);
  const isUrgent = progress < 0.3;
  const isExpired = progress <= 0;

  const label = isExpired
    ? "Your hold has expired"
    : isUrgent
      ? "Hurry — your slot hold is almost up"
      : "Your selected slot is temporarily held";

  const subtitle = isExpired
    ? "The slot may now be available for others. Please select again."
    : "Complete payment before the hold expires to secure your appointment.";

  return (
    <TimerWrapper style={isExpired ? { background: "#fef2f2", borderColor: "#fca5a5" } : undefined}>
      <TimerRing>
        <svg viewBox="0 0 44 44">
          <circle className="timer-bg" cx="22" cy="22" r="19" />
          <circle
            className="timer-fg"
            cx="22"
            cy="22"
            r="19"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            style={isExpired ? { stroke: "#dc2626" } : isUrgent ? { stroke: "#ea580c" } : undefined}
          />
        </svg>
        <TimerClockIcon style={isExpired ? { color: "#dc2626" } : undefined}>
          <FaClock />
        </TimerClockIcon>
      </TimerRing>
      <TimerText>
        <p className="timer-title" style={isExpired ? { color: "#991b1b" } : undefined}>{label}</p>
        <p className="timer-subtitle" style={isExpired ? { color: "#dc2626" } : undefined}>{subtitle}</p>
      </TimerText>
    </TimerWrapper>
  );
};

/* ─────────────────── Utility helpers ─────────────────── */
const padDatePart = (value) => String(value).padStart(2, "0");

const getLocalDateValue = (date = new Date()) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

const todayValue = getLocalDateValue();

const getBookableDateValue = (value = "") => {
  const normalized = String(value || "").trim();
  return normalized && normalized >= todayValue ? normalized : todayValue;
};

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
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

// eslint-disable-next-line no-unused-vars
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

const isPastSlotForClient = (dateKey = "", timeSlot = "") => {
  if (!dateKey || !timeSlot || !timeSlot.includes(":")) return true;
  const today = getLocalDateValue();
  if (dateKey < today) return true;
  if (dateKey > today) return false;
  const [hours = 0, minutes = 0] = timeSlot.split(":").map(Number);
  const now = new Date();
  return hours * 60 + minutes <= now.getHours() * 60 + now.getMinutes();
};

const parseBookingIntent = (search = "") => {
  const params = new URLSearchParams(search);
  return {
    appointmentId: params.get("appointmentId") || "",
    doctorId: params.get("doctorId") || params.get("id") || "",
    doctorName: params.get("doctorName") || params.get("doctor") || "",
    specialty: params.get("specialty") || "",
    consultationType: normalizeConsultationType(params.get("consultationType") || params.get("type") || "PHYSICAL"),
    date: params.get("date") || "",
    timeSlot: params.get("timeSlot") || "",
    hospitalId: params.get("hospitalId") || "",
    hospitalName: params.get("hospitalName") || params.get("hospital") || "",
  };
};

const hasCompleteIntent = (intent) =>
  Boolean(intent.doctorId && intent.hospitalId && intent.date && intent.timeSlot);

const getDoctorOptionSlots = (doctor, dateKey) =>
  (doctor?.availableSlots || [])
    .filter((slot) => !isPastSlotForClient(dateKey, slot))
    .sort((left, right) => left.localeCompare(right));

/* ─────────────────── Main Component ─────────────────── */
const Session = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const parsedIntent = parseBookingIntent(location.search);
  const initialDate = getBookableDateValue(parsedIntent.date);
  const [viewMode, setViewMode] = useState("browse");
  const [bookingIntent, setBookingIntent] = useState({ ...parsedIntent, date: initialDate });
  const [doctorSummary, setDoctorSummary] = useState({
    name: parsedIntent.doctorName,
    specialty: parsedIntent.specialty,
    fee: 0,
  });
  const [browseFilters, setBrowseFilters] = useState({
    specialty: parsedIntent.specialty,
    date: initialDate,
  });
  const [selectionDate, setSelectionDate] = useState(initialDate);
  const [doctorOptions, setDoctorOptions] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState("");
  const [totalDoctorsCount, setTotalDoctorsCount] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [appointmentId, setAppointmentId] = useState("");
  // eslint-disable-next-line no-unused-vars
  const [holdExpiresAt, setHoldExpiresAt] = useState("");
  const [amount, setAmount] = useState(0);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [holdTimerStart, setHoldTimerStart] = useState(null);
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

  const consultationType = "VIRTUAL";
  const demoPaymentEnabled = useMemo(() => isDemoPaymentAvailable(), []);
  const specialtyOptions = useMemo(
    () => specialtyCatalog.map((specialty) => specialty.name).sort((left, right) => left.localeCompare(right)),
    []
  );
  const visibleDoctorOptions = useMemo(
    () =>
      doctorOptions
        .map((doctor) => ({ ...doctor, visibleSlots: getDoctorOptionSlots(doctor, browseFilters.date) }))
        .filter((doctor) => doctor.visibleSlots.length > 0),
    [browseFilters.date, doctorOptions]
  );

  useEffect(() => {
    if (consultationType === "VIRTUAL") return;
    const params = new URLSearchParams(location.search);
    navigate(`/virtual-consultation?${params.toString()}`, { replace: true });
  }, [consultationType, location.search, navigate]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error, toast]);

  useEffect(() => {
    if (warning) toast.warning(warning);
  }, [toast, warning]);

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
      .map(([time, venues]) => ({ time, venues, isConflicted: venues.length !== 1 }))
      .sort((left, right) => left.time.localeCompare(right.time));
  }, [availability]);

  useEffect(() => {
    const parsed = parseBookingIntent(location.search);
    const nextDate = getBookableDateValue(parsed.date);
    const selectedSlotIsPast = hasCompleteIntent(parsed) && isPastSlotForClient(parsed.date, parsed.timeSlot);
    const nextIntent = selectedSlotIsPast
      ? { ...parsed, date: nextDate, timeSlot: "", hospitalId: "", hospitalName: "" }
      : { ...parsed, date: nextDate };

    setBookingIntent(nextIntent);
    setDoctorSummary({ name: parsed.doctorName, specialty: parsed.specialty });
    setBrowseFilters({ specialty: parsed.specialty || "", date: nextDate });
    setSelectionDate(nextDate);
    setAvailability([]);
    setAppointmentId(parsed.appointmentId || "");
    setError("");
    setWarning(selectedSlotIsPast ? "That time has already passed. Please choose another slot." : "");
    setHoldExpiresAt("");
    setAmount(0);

    if (hasCompleteIntent(nextIntent)) setViewMode("details");
    else if (nextIntent.doctorId) setViewMode("selection");
    else setViewMode("browse");
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
      if (!bookingIntent.doctorId || (doctorSummary.name && doctorSummary.specialty)) return;
      try {
        const { data } = await api.get("/doctor");
        const matchedDoctor = data.find((doctor) => String(doctor.id) === String(bookingIntent.doctorId));
        if (matchedDoctor) {
          setDoctorSummary((prev) => ({
            ...prev,
            name: matchedDoctor.name,
            specialty: matchedDoctor.specialty,
            fee: matchedDoctor.consultationFee || prev.fee || 0,
          }));
        }
      } catch (summaryError) {
        console.error("Failed to load doctor summary", summaryError);
      }
    };
    loadDoctorSummary();
  }, [bookingIntent.doctorId, doctorSummary.name, doctorSummary.specialty]);

  useEffect(() => {
    if (viewMode !== "selection" || !bookingIntent.doctorId || !selectionDate) return;
    let cancelled = false;

    const loadAvailability = async () => {
      setAvailabilityLoading(true);
      setError("");
      try {
        let data = [];
        if (consultationType === "VIRTUAL") {
          const options = await fetchConsultationOptions({
            date: selectionDate,
            specialty: doctorSummary.specialty || bookingIntent.specialty || undefined,
          });
          const selectedDoctor = options.find((doctor) => String(doctor.id) === String(bookingIntent.doctorId));
          const slots = getDoctorOptionSlots(selectedDoctor, selectionDate).map((time) => ({ time, status: "available" }));
          data = selectedDoctor
            ? [{
                id: `virtual-${selectedDoctor.id}-${selectionDate}`,
                doctorId: selectedDoctor.id,
                hospitalId: "virtual",
                hospitalName: "Secure video consultation",
                location: "Online",
                date: selectionDate,
                totalSlots: slots.length,
                slots,
              }]
            : [];
        } else {
          const response = await api.get(`/doctor/${bookingIntent.doctorId}/availability`, {
            params: { date: selectionDate, consultationType },
          });
          data = response.data;
        }
        if (!cancelled) setAvailability(data);
      } catch (availabilityError) {
        if (!cancelled) {
          setAvailability([]);
          setError(availabilityError.response?.data?.message || "We could not load real availability for this doctor right now.");
        }
      } finally {
        if (!cancelled) setAvailabilityLoading(false);
      }
    };

    loadAvailability();
    return () => { cancelled = true; };
  }, [bookingIntent.doctorId, bookingIntent.specialty, consultationType, doctorSummary.specialty, selectionDate, viewMode]);

  useEffect(() => {
    if (viewMode !== "browse" || !browseFilters.date) return;
    let cancelled = false;

    const loadConsultationOptions = async () => {
      setOptionsLoading(true);
      setOptionsError("");
      try {
        const options = await fetchConsultationOptions({
          date: browseFilters.date,
          specialty: browseFilters.specialty || undefined,
        });
        if (!cancelled) setDoctorOptions(Array.isArray(options) ? options : []);
      } catch (optionError) {
        if (!cancelled) {
          setDoctorOptions([]);
          setOptionsError(optionError.response?.data?.message || "We could not load virtual doctors for this date.");
        }
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    };

    loadConsultationOptions();
    return () => { cancelled = true; };
  }, [browseFilters.date, browseFilters.specialty, viewMode]);

  useEffect(() => {
    const fetchTotalDoctors = async () => {
      try {
        const response = await api.get('/doctor');
        if (response.data && Array.isArray(response.data.data)) {
          setTotalDoctorsCount(response.data.data.length);
        } else if (Array.isArray(response.data)) {
          setTotalDoctorsCount(response.data.length);
        }
      } catch (err) {
        console.error("Failed to fetch total doctors:", err);
      }
    };
    fetchTotalDoctors();
  }, []);

  const syncIntentToUrl = (intent) => {
    const params = new URLSearchParams({
      doctorId: intent.doctorId,
      doctorName: intent.doctorName || doctorSummary.name || "",
      specialty: intent.specialty || doctorSummary.specialty || "",
      consultationType: normalizeConsultationType(intent.consultationType),
      date: intent.date || "",
      timeSlot: intent.timeSlot || "",
      hospitalId: intent.hospitalId || "",
      hospitalName: intent.hospitalName || "",
    });
    navigate(`/virtual-consultation?${params.toString()}`, { replace: true });
  };

  const syncBrowseFiltersToUrl = (nextFilters) => {
    const params = new URLSearchParams();
    params.set("consultationType", consultationType);
    if (nextFilters.specialty) params.set("specialty", nextFilters.specialty);
    if (nextFilters.date) params.set("date", nextFilters.date);
    navigate(`/virtual-consultation?${params.toString()}`, { replace: true });
  };

  const updateBrowseFilter = (field, value) => {
    const nextFilters = { ...browseFilters, [field]: value };
    setBrowseFilters(nextFilters);
    setWarning("");
    setError("");
    syncBrowseFiltersToUrl(nextFilters);
  };

  const handleSelectDoctorSlot = (doctor, slot) => {
    if (isPastSlotForClient(browseFilters.date, slot)) {
      setWarning("That time has already passed. Please choose a later slot.");
      return;
    }
    const nextIntent = {
      ...bookingIntent,
      doctorId: doctor.id,
      doctorName: doctor.name,
      specialty: doctor.specialty,
      consultationType,
      date: browseFilters.date,
      timeSlot: slot,
      hospitalId: "virtual",
      hospitalName: "Secure video consultation",
    };
    setDoctorSummary({ name: doctor.name, specialty: doctor.specialty, fee: doctor.consultationFee || 0 });
    setSelectionDate(browseFilters.date);
    setWarning("");
    setError("");
    setBookingIntent(nextIntent);
    syncIntentToUrl(nextIntent);
    setHoldTimerStart(Date.now());
    setViewMode("details");
  };

  const handleSelectTime = (option) => {
    if (option.isConflicted) {
      setWarning("This time maps to more than one venue for the same doctor. The schedule needs to be corrected before booking.");
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
      doctorName: doctorSummary.name || bookingIntent.doctorName,
      specialty: doctorSummary.specialty || bookingIntent.specialty,
    };
    setWarning("");
    setBookingIntent(nextIntent);
    syncIntentToUrl(nextIntent);
    setHoldTimerStart(Date.now());
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
    if (Object.keys(nextErrors).length) return;

    setBookingLoading(true);
    try {
      const { consultation } = await createConsultationRequest({
        doctorId: bookingIntent.doctorId,
        specialty: doctorSummary.specialty || "",
        requestedDate: bookingIntent.date,
        requestedTimeSlot: bookingIntent.timeSlot,
        requestNote: formData.reasonForAppointment,
        fullName: formData.fullName,
        email: formData.email,
        mobileNumber: formData.mobileNumber,
        gender: formData.gender,
      });
      setAppointmentId(consultation.id);
      setHoldExpiresAt("");
      setAmount(Number(consultation.amount || 0));
      setViewMode("payment");
      window.scrollTo(0, 0);
    } catch (bookingError) {
      setError(bookingError.response?.data?.message || "We could not place a temporary hold on this appointment.");
    } finally {
      setBookingLoading(false);
    }
  };

  const handleStartPayment = async () => {
    if (!appointmentId) return;
    setPaymentLoading(true);
    setError("");
    setWarning("");
    try {
      if (amount <= 0) {
        await payConsultation(appointmentId, { provider: "FREE", method: "free", status_message: "No payment required" });
        navigate(`/virtual-consultation/status/${appointmentId}`);
        return;
      }
      const session = await createConsultationStripeSession(appointmentId);
      const checkoutUrl = session.checkoutUrl;
      if (!checkoutUrl) throw new Error("Payment gateway did not return a checkout URL.");
      window.location.assign(checkoutUrl);
    } catch (paymentError) {
      setPaymentLoading(false);
      setError(paymentError.response?.data?.message || paymentError.message || "We could not start secure payment right now.");
    }
  };

  const handleDemoPayment = async () => {
    if (!appointmentId) return;
    setPaymentLoading(true);
    setError("");
    setWarning("");
    try {
      if (amount <= 0) {
        await payConsultation(appointmentId, { provider: "FREE", method: "free", status_message: "No payment required" });
      } else {
        await confirmDemoConsultation(appointmentId);
      }
      navigate(`/virtual-consultation/status/${appointmentId}`);
    } catch (paymentError) {
      setError(paymentError.response?.data?.message || paymentError.message || "We could not complete the demo payment right now.");
    } finally {
      setPaymentLoading(false);
    }
  };

  /* ── Side panel (rendered in split layout) ── */
  const renderSidePanel = () => (
    <SidePanel>
      <SidePanelBrand>
        <SideBrandText>Virtual Consultation</SideBrandText>
        <SideTitle>
          {viewMode === "payment"
            ? "Secure your\nappointment"
            : viewMode === "details"
              ? "Almost there —\nadd your details"
              : "Choose your\ntime slot"}
        </SideTitle>
      </SidePanelBrand>

      {doctorSummary.name && (
        <DoctorSideCard>
          <DoctorSideAvatar>
            <FaUserMd />
          </DoctorSideAvatar>
          <DoctorSideName>{doctorSummary.name}</DoctorSideName>
          <DoctorSideSpecialty>{doctorSummary.specialty || "Virtual care specialist"}</DoctorSideSpecialty>
          {doctorSummary.fee > 0 && (
            <DoctorSideFee>
              <span>Fee</span>
              <strong>LKR {Number(doctorSummary.fee).toFixed(2)}</strong>
            </DoctorSideFee>
          )}
        </DoctorSideCard>
      )}

      <SideDetailGrid>
        {(bookingIntent.date || selectionDate) && (
          <SideDetailItem>
            <SideDetailIcon><FaCalendarAlt /></SideDetailIcon>
            <SideDetailText>
              <span>Date</span>
              <strong>{formatDateLabel(bookingIntent.date || selectionDate)}</strong>
            </SideDetailText>
          </SideDetailItem>
        )}

        {bookingIntent.timeSlot && (
          <SideDetailItem>
            <SideDetailIcon><FaClock /></SideDetailIcon>
            <SideDetailText>
              <span>Time</span>
              <strong>{formatTimeLabel(bookingIntent.timeSlot)}</strong>
            </SideDetailText>
          </SideDetailItem>
        )}

        {bookingIntent.hospitalName && (
          <SideDetailItem>
            <SideDetailIcon><FaVideo /></SideDetailIcon>
            <SideDetailText>
              <span>Session type</span>
              <strong>{bookingIntent.hospitalName}</strong>
            </SideDetailText>
          </SideDetailItem>
        )}

        {bookingIntent.specialty && (
          <SideDetailItem>
            <SideDetailIcon><FaStethoscope /></SideDetailIcon>
            <SideDetailText>
              <span>Specialty</span>
              <strong>{bookingIntent.specialty}</strong>
            </SideDetailText>
          </SideDetailItem>
        )}
      </SideDetailGrid>

      {viewMode !== "selection" && bookingIntent.timeSlot && (
        <SideChangeLink
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
          Change time slot <FaArrowRight size={10} />
        </SideChangeLink>
      )}

      <SideTrustSection>
        <TrustItem>
          <FaShieldAlt size={13} />
          <span>End-to-end encrypted video session</span>
        </TrustItem>
        <TrustItem>
          <FaWifi size={13} />
          <span>HD video connection guaranteed</span>
        </TrustItem>
        <TrustItem>
          <FaStar size={13} />
          <span>Verified & licensed professionals</span>
        </TrustItem>
        <TrustItem>
          <FaLock size={13} />
          <span>Secure PCI-compliant payments</span>
        </TrustItem>
      </SideTrustSection>
    </SidePanel>
  );

  /* ── Browse view ── */
  const renderBrowseView = () => (
    <BrowseWrapper>
      <BrowseHero>
        <BrowseHeroGrid>
          <BrowseHeroContent>
            <HeroBadge>
              <FaVideo size={10} /> Virtual Care Platform
            </HeroBadge>
            <BrowseHeroTitle>
              See a doctor{" "}
              <span>from anywhere,</span>{" "}
              anytime
            </BrowseHeroTitle>
            <BrowseHeroSubtitle>
              Book a confirmed video consultation directly with verified professionals. Real-time slots, secure payment, instant confirmation.
            </BrowseHeroSubtitle>
            <HeroStats>
              <HeroStat>
                <strong>{totalDoctorsCount !== null ? `${totalDoctorsCount}+` : "..."}</strong>
                <span>Verified doctors</span>
              </HeroStat>
              <HeroStat>
                <strong>24/7</strong>
                <span>Available daily</span>
              </HeroStat>
              <HeroStat>
                <strong>~5 min</strong>
                <span>Avg. wait time</span>
              </HeroStat>
            </HeroStats>
          </BrowseHeroContent>

          <SearchPanel>
            <SearchPanelTitle>Find available doctors</SearchPanelTitle>
            <SearchField>
              <label htmlFor="virtual-specialty">Specialty</label>
              <select
                id="virtual-specialty"
                value={browseFilters.specialty}
                onChange={(event) => updateBrowseFilter("specialty", event.target.value)}
              >
                <option value="">All specialties</option>
                {specialtyOptions.map((specialty) => (
                  <option key={specialty} value={specialty}>{specialty}</option>
                ))}
              </select>
            </SearchField>
            <SearchField>
              <label htmlFor="virtual-date">Date</label>
              <input
                id="virtual-date"
                min={todayValue}
                type="date"
                value={browseFilters.date}
                onChange={(event) => updateBrowseFilter("date", event.target.value || todayValue)}
              />
            </SearchField>
          </SearchPanel>
        </BrowseHeroGrid>
      </BrowseHero>

      <ResultsSection>
        {!browseFilters.specialty ? (
          <>
            <ResultsHeader>
              <ResultsTitle>Browse <span>All Doctors</span></ResultsTitle>
            </ResultsHeader>
            <EmptyCard>
              <EmptyIcon><FaStethoscope size={28} /></EmptyIcon>
              <EmptyTitle>Choose a Specialty</EmptyTitle>
              <EmptyText>Select a medical specialty and date from the panel above to view available doctors and time slots.</EmptyText>
            </EmptyCard>
          </>
        ) : optionsError ? (
          <EmptyCard>
            <EmptyIcon><FaTimesCircle size={28} /></EmptyIcon>
            <EmptyTitle>Unable to load doctors</EmptyTitle>
            <EmptyText>{optionsError}</EmptyText>
          </EmptyCard>
        ) : optionsLoading ? (
          <>
            <ResultsHeader>
              <ResultsTitle>Searching <span>{browseFilters.specialty}</span> doctors...</ResultsTitle>
            </ResultsHeader>
            <EmptyCard>
              <EmptyTitle>Loading available doctors...</EmptyTitle>
            </EmptyCard>
          </>
        ) : (
          <>
            <ResultsHeader>
              <ResultsTitle>
                {visibleDoctorOptions.length} <span>{browseFilters.specialty}</span> {visibleDoctorOptions.length === 1 ? "doctor" : "doctors"} available
              </ResultsTitle>
              <StepBadge>{formatDateLabel(browseFilters.date)}</StepBadge>
            </ResultsHeader>

            {visibleDoctorOptions.length ? (
              <DirectoryGrid>
                {visibleDoctorOptions.map((doctor, index) => (
                  <DoctorCard key={doctor.id} style={{ animationDelay: `${index * 0.06}s` }}>
                    <CardAccent />
                    <CardTop>
                      <Avatar>
                        <FaUserMd size={26} />
                      </Avatar>
                      <CardNameBlock>
                        <h3>{doctor.name}</h3>
                        <p>{doctor.specialty || "Virtual care"}</p>
                        <FeePill>LKR {Number(doctor.consultationFee || 0).toFixed(2)}</FeePill>
                      </CardNameBlock>
                    </CardTop>

                    <CardBody>
                      <DetailRow>
                        <FaVideo />
                        <span>Secure Video Consultation</span>
                      </DetailRow>
                      <DetailRow>
                        <FaCalendarAlt />
                        <span>{doctor.visibleSlots.length} open slot{doctor.visibleSlots.length !== 1 ? "s" : ""} on {browseFilters.date}</span>
                      </DetailRow>

                      <SlotSection>
                        <SlotLabel>Select Time Slot</SlotLabel>
                        <SlotGrid>
                          {doctor.visibleSlots.map((slot) => (
                            <SlotButton
                              key={`${doctor.id}-${slot}`}
                              type="button"
                              onClick={() => handleSelectDoctorSlot(doctor, slot)}
                            >
                              {formatTimeLabel(slot)}
                            </SlotButton>
                          ))}
                        </SlotGrid>
                      </SlotSection>
                    </CardBody>
                  </DoctorCard>
                ))}
              </DirectoryGrid>
            ) : (
              <EmptyCard>
                <EmptyIcon><FaCalendarAlt size={28} /></EmptyIcon>
                <EmptyTitle>No doctors available</EmptyTitle>
                <EmptyText>Try selecting a different specialty or date.</EmptyText>
                <div style={{ marginTop: "12px" }}>
                  <PrimaryButton type="button" onClick={openRequestPage}>
                    <FaCommentDots />
                    Make a request
                  </PrimaryButton>
                </div>
              </EmptyCard>
            )}
          </>
        )}
      </ResultsSection>
    </BrowseWrapper>
  );

  /* ── Selection fallback view ── */
  const renderSelectionFallback = () => (
    <>
      <Field style={{ marginBottom: "20px" }}>
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

      <SelectionSlotCard>
        <SlotCardHeader>
          <div>
            <h3>Available times</h3>
            <p>
              Pick one valid time and the correct {consultationType === "VIRTUAL" ? "hosted venue" : "venue"} will be applied automatically.
            </p>
          </div>
          <SlotCountBadge $loading={availabilityLoading}>
            {availabilityLoading ? "Loading..." : `${timeOptions.length} time option${timeOptions.length === 1 ? "" : "s"}`}
          </SlotCountBadge>
        </SlotCardHeader>

        {timeOptions.length ? (
          <SlotGrid>
            {timeOptions.map((option) => (
              <SlotButton
                key={option.time}
                $selected={bookingIntent.timeSlot === option.time}
                disabled={option.isConflicted}
                type="button"
                onClick={() => handleSelectTime(option)}
              >
                {formatTimeLabel(option.time)}
                {option.isConflicted ? " • Conflict" : ""}
              </SlotButton>
            ))}
          </SlotGrid>
        ) : (
          !availabilityLoading && (
            <EmptyCard style={{ gridColumn: "1", padding: "32px 24px" }}>
              <EmptyTitle style={{ fontSize: "1rem" }}>No bookable times yet</EmptyTitle>
              <EmptyText style={{ fontSize: "0.88rem" }}>
                This doctor does not have an open time on the selected date. Try another date or send a request.
              </EmptyText>
              <ButtonRow>
                <SecondaryButton type="button" onClick={openRequestPage}>Make request</SecondaryButton>
              </ButtonRow>
            </EmptyCard>
          )
        )}
      </SelectionSlotCard>
    </>
  );

  /* ── Details form ── */
  const renderDetailsForm = () => (
    <>
      {holdTimerStart && <SlotHoldTimer startedAt={holdTimerStart} />}

      <Form onSubmit={handleCreateHold} noValidate>
        <FormCard>
          <FormCardTitle>Patient Information</FormCardTitle>
          <Grid>
            <Field>
              <label htmlFor="fullName">Full name</label>
              <input
                id="fullName"
                name="fullName"
                required
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={handleInputChange}
                aria-invalid={Boolean(fieldErrors.fullName)}
              />
              <FieldError message={fieldErrors.fullName} />
            </Field>

            <Field>
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                required
                type="email"
                placeholder="Enter your email address"
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
                placeholder="Enter your phone number"
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

          <Field style={{ marginTop: "16px" }}>
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
        </FormCard>

        <ButtonRow>
          <PrimaryButton disabled={bookingLoading} type="submit">
            <FaCheckCircle size={14} />
            {bookingLoading ? "Holding your slot..." : "Continue to payment"}
          </PrimaryButton>
        </ButtonRow>
      </Form>
    </>
  );

  /* ── Payment view ── */
  const renderPaymentView = () => (
    <>
      {holdTimerStart && <SlotHoldTimer startedAt={holdTimerStart} />}

      <PaymentCard>
        <PanelTitle style={{ fontSize: "1.5rem", marginBottom: "6px" }}>Secure payment</PanelTitle>
        <p style={{ margin: "0 0 0", color: "#6b7280", fontSize: "0.92rem", lineHeight: "1.65" }}>
          Complete payment to confirm this exact doctor slot. The queue number is assigned after successful payment.
        </p>

        {demoPaymentEnabled && amount > 0 && (
          <Alert style={{ marginTop: 18 }}>
            <FaCheckCircle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              Demo payment mode is available on this prototype. It confirms the appointment,
              generates the receipt, and assigns the queue number without a live merchant account.
            </span>
          </Alert>
        )}

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
            <span>Amount due</span>
            <strong style={{ color: "#683b93", fontSize: "1.1rem" }}>LKR {Number(amount || 0).toFixed(2)}</strong>
          </PaymentRow>
        </PaymentRows>

        <ButtonRow style={{ marginTop: "24px" }}>
          <PrimaryButton
            disabled={paymentLoading}
            type="button"
            onClick={demoPaymentEnabled ? handleDemoPayment : () => handleStartPayment("stripe")}
          >
            <FaCreditCard size={14} />
            {paymentLoading
              ? demoPaymentEnabled ? "Confirming payment..." : "Opening payment..."
              : amount > 0 && demoPaymentEnabled
                ? "Complete demo payment"
                : amount > 0
                  ? "Pay by card"
                  : "Confirm appointment"}
          </PrimaryButton>

          {demoPaymentEnabled && amount > 0 && (
            <SecondaryButton type="button" onClick={() => handleStartPayment("stripe")} disabled={paymentLoading}>
              Use Stripe card payment
            </SecondaryButton>
          )}

          <SecondaryButton
            type="button"
            onClick={() => navigate(`/virtual-consultation/status/${appointmentId}`)}
          >
            Review status
          </SecondaryButton>
        </ButtonRow>
      </PaymentCard>
    </>
  );

  /* ─────────────────── Main render ─────────────────── */
  return (
    <Page>
      {viewMode === "browse" ? (
        renderBrowseView()
      ) : (
        <SplitPage>
          {renderSidePanel()}

          <MainPanel>
            <PanelTopBar>
              <BackLink to="/">
                <FaArrowLeft size={12} />
                Back to homepage
              </BackLink>
              <StepBadge $warning={viewMode === "selection"}>
                {viewMode === "payment"
                  ? "Payment step"
                  : viewMode === "details"
                    ? "Patient details"
                    : viewMode === "selection"
                      ? "Choose a time"
                      : "Find doctors"}
              </StepBadge>
            </PanelTopBar>

            <PanelTitle>
              {viewMode === "payment"
                ? "Complete payment"
                : viewMode === "details"
                  ? "Add patient details"
                  : viewMode === "selection"
                    ? "Select a valid time"
                    : "Book a virtual consultation"}
            </PanelTitle>

            <PanelSubtitle>
              {viewMode === "payment"
                ? "Use secure payment to confirm the held appointment and generate the final receipt."
                : viewMode === "details"
                  ? "We use these details to create the appointment hold before secure payment."
                  : viewMode === "selection"
                    ? "Choose a doctor, time, and venue to continue your booking."
                    : "Select a specialty and date, then pick a live doctor slot."}
            </PanelSubtitle>

            {viewMode === "selection" && renderSelectionFallback()}
            {viewMode === "details" && renderDetailsForm()}
            {viewMode === "payment" && renderPaymentView()}
          </MainPanel>
        </SplitPage>
      )}
    </Page>
  );
};

export default Session;
