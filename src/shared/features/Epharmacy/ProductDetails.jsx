import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import {
  FaArrowRight,
  FaBoxOpen,
  FaCheckCircle,
  FaChevronRight,
  FaFileMedical,
  FaHeadset,
  FaHeart,
  FaInfoCircle,
  FaLeaf,
  FaRegHeart,
  FaShieldAlt,
  FaShoppingBag,
  FaTruck,
  FaStar,
  FaStarHalfAlt,
  FaRegStar,
  FaThermometerHalf,
  FaIndustry,
  FaPills,
  FaFacebookF,
  FaWhatsapp,
  FaEnvelope,
} from "react-icons/fa";
import { Navigationbar } from "@/shared/components/layout/NavigationBar/Navigationbar";
import Footer from "@/shared/components/layout/Footer/Footer";
import PrescriptionUploadModal from "@/shared/features/Epharmacy/PrescriptionUploadModal";
import StatusModal from "@/shared/components/common/StatusModal";
import { fetchMedicineById, fetchMedicines } from "@/shared/features/Epharmacy/pharmacyClient";
import {
  FALLBACK_MEDICINE_IMAGE,
  PHARMACY_THEME,
  clampQuantity,
  formatCurrency,
  getDeliveryCopy,
} from "@/shared/features/Epharmacy/pharmacyShared";
import { addToCart, isInWishlist, toggleWishlist } from "@/shared/lib/storage";
import { requirePatientSessionForNavigation } from "@/shared/lib/authSession";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Page = styled.div`
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@600;700&family=Public+Sans:wght@400;500;600;700&display=swap');
  min-height: 100vh;
  background: #ffffff;
  color: #0b1c30;
  font-family: "Public Sans", sans-serif;
`;

const Container = styled.section`
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 24px 64px;

  @media (max-width: 640px) {
    padding: 24px 16px 52px;
  }
`;

const StatePanel = styled.div`
  margin-top: 20px;
  background: #ffffff;
  border: 1px solid ${PHARMACY_THEME.line};
  border-radius: 28px;
  padding: 72px 24px;
  text-align: center;
  box-shadow: ${PHARMACY_THEME.shadowSoft};

  h2 {
    margin: 0 0 10px;
    font-size: 1.8rem;
    color: #0f172a;
  }

  p {
    margin: 0;
    color: ${PHARMACY_THEME.inkMuted};
    line-height: 1.75;
  }
`;

const Breadcrumbs = styled.nav`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 28px;
  color: ${PHARMACY_THEME.inkMuted};
  font-size: 0.92rem;
  font-weight: 600;

  a {
    color: inherit;
    text-decoration: none;
  }

  a:hover {
    color: ${PHARMACY_THEME.brand};
  }

  .separator {
    color: #c2ccdc;
    font-size: 0.78rem;
  }

  .current {
    color: ${PHARMACY_THEME.ink};
  }
`;

const HeroGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 450px;
  gap: 48px;
  align-items: start;
  animation: ${fadeIn} 0.45s ease-out;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 40px;
  }
`;

const GalleryColumn = styled.div`
  display: flex;
  flex-direction: row;
  gap: 20px;
  align-items: start;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const GalleryStage = styled.div`
  position: relative;
  overflow: hidden;
  min-height: 500px;
  flex: 1;
  padding: 40px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: none;
  display: grid;
  place-items: center;

  @media (max-width: 768px) {
    min-height: 360px;
    padding: 22px;
  }
`;

const BadgeRow = styled.div`
  position: absolute;
  top: 22px;
  left: 22px;
  right: 22px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  z-index: 2;
`;

const ProductBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 999px;
  background: ${(props) =>
    props.$variant === "rx" ? "rgba(254, 226, 226, 0.96)" : "rgba(237, 250, 244, 0.96)"};
  color: ${(props) => (props.$variant === "rx" ? "#991b1b" : "#0f8b5f")};
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(8px);
`;

const StageImage = styled.img`
  width: min(100%, 520px);
  height: 500px;
  object-fit: contain;
  filter: drop-shadow(0 28px 36px rgba(15, 23, 42, 0.12));
  transition: transform 0.28s ease;
  z-index: 1;

  &:hover {
    transform: translateY(-6px) scale(1.02);
  }

  @media (max-width: 768px) {
    height: 290px;
  }
`;

const ThumbnailRail = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
  padding-right: 4px;
  max-height: 500px;
  flex: 0 0 92px;

  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(107, 92, 165, 0.25);
    border-radius: 999px;
  }

  @media (max-width: 768px) {
    flex-direction: row;
    overflow-x: auto;
    overflow-y: hidden;
    max-height: none;
    padding-right: 0;
    padding-bottom: 4px;
  }
`;

const ThumbnailButton = styled.button`
  flex: 0 0 92px;
  height: 92px;
  border-radius: 20px;
  border: 1.5px solid
    ${(props) => (props.$active ? PHARMACY_THEME.accentStrong : "rgba(201, 211, 228, 0.9)")};
  background: ${(props) => (props.$active ? "rgba(239, 234, 251, 0.72)" : "#ffffff")};
  box-shadow: ${(props) => (props.$active ? "0 12px 28px rgba(107, 92, 165, 0.18)" : "none")};
  padding: 12px;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: ${PHARMACY_THEME.accentStrong};
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`;

const PurchaseRail = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const CategoryLabel = styled.span`
  color: #6b5ca5;
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const ProductTitle = styled.h1`
  margin: 0;
  font-family: "Manrope", sans-serif;
  font-size: clamp(1.8rem, 2.5vw, 2.2rem);
  line-height: 1.2;
  letter-spacing: -0.01em;
  color: #0f172a;
  font-weight: 700;
`;

const MetaInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  color: #64748b;
  font-size: 0.95rem;
  margin-bottom: 8px;
`;

const PriceRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin: 12px 0 16px 0;

  strong {
    font-size: 1.8rem;
    color: #0f172a;
    font-weight: 800;
  }
  
  .old-price {
    font-size: 1.2rem;
    color: #94a3b8;
    text-decoration: line-through;
  }
`;

const ShortDescription = styled.p`
  margin: 0 0 20px 0;
  color: #475569;
  line-height: 1.6;
  font-size: 1rem;
`;

const InfoRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 0.95rem;

  .label {
    font-weight: 700;
    color: #0f172a;
    min-width: 80px;
  }

  .value {
    color: #475569;
  }
`;

const ModelTagRow = styled(InfoRow)`
  align-items: center;
  margin-bottom: 20px;
`;

const ModelTag = styled.button`
  background: ${(props) => (props.$active ? "#6b5ca5" : "#f1f5f9")};
  color: ${(props) => (props.$active ? "#ffffff" : "#475569")};
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${(props) => (props.$active ? "#5a4d8c" : "#e2e8f0")};
  }
`;

const AddToCartRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 10px;
  flex-wrap: wrap;
`;

const QtySelector = styled.div`
  display: inline-flex;
  align-items: center;
  background: #ffffff;
  border-radius: 8px;
  height: 48px;
  padding: 0 4px;
  border: 1px solid #e2e8f0;

  button {
    background: transparent;
    border: none;
    width: 40px;
    height: 100%;
    font-size: 1.2rem;
    color: #0b1c30;
    cursor: pointer;
    display: grid;
    place-items: center;
    border-radius: 4px;
    transition: background 0.2s;
    
    &:hover {
      background: #eff4ff;
    }
  }

  span {
    min-width: 40px;
    text-align: center;
    font-weight: 600;
    font-size: 1rem;
    color: #0b1c30;
  }
`;

const PrimaryButton = styled.button`
  flex: 1;
  min-width: 200px;
  height: 48px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #6b5ca5 0%, #5a4d8c 100%);
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #5a4d8c 0%, #383053 100%);
    box-shadow: 0 10px 28px rgba(107, 92, 165, 0.35);
  }

  &:disabled {
    background: #c2c6d4;
    cursor: not-allowed;
  }
`;

const SecondaryButton = styled(PrimaryButton)`
  background: #ffffff;
  color: #6b5ca5;
  border: 1px solid #6b5ca5;

  &:hover:not(:disabled) {
    background: #eff4ff;
    box-shadow: none;
  }
`;

const SecondaryActionRail = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  margin-top: 10px;
`;

const RailActionButton = styled.button`
  background: transparent;
  border: none;
  color: #0f172a;
  font-size: 0.95rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 0;

  svg {
    color: ${(props) => (props.$active ? "#dc2626" : "#64748b")};
    font-size: 1.1rem;
  }

  &:hover {
    color: #6b5ca5;
    svg {
      color: ${(props) => (props.$active ? "#dc2626" : "#6b5ca5")};
    }
  }
`;

const FulfilmentList = styled.div`
  margin-top: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
`;

const FulfilmentItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  color: #475569;
  font-size: 0.9rem;
  border-bottom: 1px solid #e2e8f0;

  &:last-child {
    border-bottom: none;
  }

  svg {
    color: #94a3b8;
    font-size: 1.1rem;
  }
`;

const DetailsShell = styled.section`
  margin-top: 48px;
  border-top: 1px solid #e2e8f0;
  padding-top: 32px;
`;

const DetailTabs = styled.div`
  display: flex;
  gap: 32px;
  border-bottom: 1px solid #e2e8f0;
`;

const DetailTab = styled.button`
  border: none;
  background: transparent;
  padding: 0 0 12px 0;
  color: ${(props) => (props.$active ? "#0b1c30" : "#727783")};
  font-family: "Public Sans", sans-serif;
  font-size: 1.05rem;
  font-weight: ${(props) => (props.$active ? "600" : "400")};
  cursor: pointer;
  position: relative;
  transition: color 0.2s ease;

  &:hover {
    color: #0b1c30;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    width: 100%;
    height: 3px;
    background: ${(props) => (props.$active ? "#6b5ca5" : "transparent")};
    border-radius: 3px 3px 0 0;
  }
`;

const DetailContent = styled.div`
  padding-top: 28px;
  color: ${PHARMACY_THEME.inkSoft};
  line-height: 1.82;
  font-size: 1rem;
  animation: ${fadeIn} 0.24s ease;

  h3 {
    margin: 0 0 16px;
    color: #0f172a;
    font-size: 1.22rem;
  }

  p {
    margin: 0 0 18px;
  }
`;

const DescriptionPanel = styled.div`
  display: grid;
  gap: 16px;
`;

const DescriptionHint = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  width: fit-content;
  padding: 10px 14px;
  border-radius: 14px;
  background: rgba(239, 234, 251, 0.7);
  color: ${PHARMACY_THEME.accentStrong};
  font-size: 0.92rem;
  font-weight: 700;
`;

const SpecsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const SpecCard = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: none;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 94, 184, 0.05);
  }

  .icon-wrapper {
    width: 48px;
    height: 48px;
    border-radius: 8px;
    background: rgba(107, 92, 165, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6b5ca5;
    font-size: 1.2rem;
  }

  .content {
    flex: 1;
  }

  .label {
    display: block;
    margin-bottom: 4px;
    color: #424752;
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .value {
    display: block;
    color: #0b1c30;
    font-size: 1.05rem;
    font-weight: 600;
    line-height: 1.4;
  }
`;

const RatingSummary = styled.div`
  display: flex;
  align-items: center;
  gap: 40px;
  padding: 32px;
  background: #ffffff;
  border-radius: 16px;
  margin-bottom: 32px;
  border: 1px solid #e2e8f0;
  box-shadow: none;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 24px;
  }

  .average-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 140px;
    
    .average {
      font-family: "Manrope", sans-serif;
      font-size: 4rem;
      font-weight: 700;
      color: #0b1c30;
      line-height: 1;
      letter-spacing: -0.02em;
    }
    
    .stars {
      display: flex;
      gap: 4px;
      font-size: 1.4rem;
      margin: 12px 0 8px;
    }

    .count {
      font-size: 0.95rem;
      color: #727783;
      font-weight: 500;
    }
  }
  
  .progress-bars {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  .progress-row {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 0.9rem;
    font-weight: 600;
    color: #424752;
  }
  
  .progress-track {
    flex: 1;
    height: 8px;
    background: #e2e8f0;
    border-radius: 999px;
    overflow: hidden;
  }
  
  .progress-fill {
    height: 100%;
    background: #6b5ca5;
    border-radius: 999px;
  }
`;

const ReviewList = styled.div`
  display: grid;
  gap: 16px;
`;

const ReviewCard = styled.div`
  padding: 24px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: none;

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .reviewer-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(107, 92, 165, 0.08);
    color: #6b5ca5;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 1.1rem;
  }

  .name {
    font-weight: 600;
    color: #0b1c30;
    font-size: 1rem;
  }

  .date {
    font-size: 0.85rem;
    color: #727783;
  }

  .stars {
    display: flex;
    gap: 2px;
    font-size: 0.9rem;
  }

  .comment {
    margin: 0;
    color: #424752;
    line-height: 1.6;
  }
`;

const BulletList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  
  li {
    margin-bottom: 12px;
    line-height: 1.6;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    
    svg {
      flex-shrink: 0;
      margin-top: 4px;
      color: #6b5ca5;
      font-size: 1.1rem;
    }
  }
`;

const ReviewEmptyState = styled.div`
  display: grid;
  gap: 12px;
  place-items: start;
  padding: 22px;
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.96));
  border: 1px dashed rgba(201, 211, 228, 0.96);

  strong {
    color: #0f172a;
    font-size: 1rem;
  }

  p {
    margin: 0;
    color: ${PHARMACY_THEME.inkMuted};
  }
`;

const RecommendationSection = styled.section`
  margin-top: 54px;
`;

const SectionHeading = styled.div`
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 22px;

  h2 {
    margin: 0;
    color: #0f172a;
    font-size: clamp(1.9rem, 3vw, 2.45rem);
    line-height: 1.08;
    letter-spacing: -0.04em;
  }

  p {
    margin: 0;
    color: ${PHARMACY_THEME.inkMuted};
    line-height: 1.6;
    max-width: 44ch;
  }

  @media (max-width: 768px) {
    align-items: start;
    flex-direction: column;
  }
`;

const ProductShelf = styled.div`
  width: 100%;

  .slick-list {
    margin: 0 -11px;
  }
  .slick-slide > div {
    padding: 0 11px;
  }
  
  .slick-prev:before, .slick-next:before {
    color: ${PHARMACY_THEME.accentStrong};
  }
`;

const ShelfCard = styled.article`
  display: grid;
  gap: 0;
  border-radius: 30px;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.92);
  box-shadow: ${PHARMACY_THEME.shadowSoft};
`;

const ShelfCardButton = styled.button`
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  text-align: left;
`;

const ShelfMedia = styled.div`
  position: relative;
  min-height: 230px;
  padding: 20px;
  background:
    radial-gradient(circle at top left, rgba(107, 92, 165, 0.12), transparent 34%),
    linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  display: grid;
  place-items: center;

  img {
    width: 100%;
    max-width: 210px;
    height: 190px;
    object-fit: contain;
  }
`;

const ShelfBadge = styled.span`
  position: absolute;
  top: 18px;
  left: 18px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  background: ${(props) => props.$background};
  color: ${(props) => props.$color};
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

const ShelfBody = styled.div`
  display: grid;
  gap: 14px;
  padding: 22px 20px 20px;

  .eyebrow {
    color: ${PHARMACY_THEME.accentStrong};
    font-size: 0.74rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h3 {
    margin: 0;
    color: #0f172a;
    font-size: 1.12rem;
    line-height: 1.45;
  }

  p {
    margin: 0;
    color: ${PHARMACY_THEME.inkMuted};
    line-height: 1.6;
  }
`;

const ShelfMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;

  span {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 999px;
    background: rgba(248, 250, 252, 0.9);
    color: ${PHARMACY_THEME.inkSoft};
    font-size: 0.8rem;
    font-weight: 700;
  }
`;

const ShelfPriceRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-top: 10px;

  strong {
    color: #ef4444; // Red for the current price in the image? Or use purple/default
    font-size: 1.2rem;
    font-weight: 700;
  }

  .old-price {
    color: #94a3b8;
    font-size: 0.9rem;
    text-decoration: line-through;
  }
`;

const ShelfStars = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  color: #6b5ca5;
  font-size: 0.85rem;
  margin-bottom: 8px;

  .review-count {
    color: #64748b;
    margin-left: 6px;
  }
`;

const AvailabilityBar = styled.div`
  margin-top: 16px;
  margin-bottom: 12px;
  
  .avail-text {
    font-size: 0.8rem;
    color: #475569;
    font-weight: 600;
    margin-bottom: 8px;
    display: block;
  }

  .progress-bg {
    height: 4px;
    background: #e2e8f0;
    border-radius: 2px;
    width: 100%;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: #6b5ca5;
    border-radius: 2px;
    width: ${(props) => Math.min(props.$percent || 0, 100)}%;
  }
`;

const ShelfActions = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;

  button {
    border: none;
    cursor: pointer;
    border-radius: 16px;
    font-size: 0.92rem;
    font-weight: 800;
    padding: 13px 14px;
    transition: transform 0.2s ease;
  }

  button:hover {
    transform: translateY(-1px);
  }

  .primary {
    background: ${PHARMACY_THEME.ink};
    color: white;
  }

  .secondary {
    background: #f8fafc;
    color: #0f172a;
    border: 1px solid rgba(226, 232, 240, 0.95);
  }
`;





const DESCRIPTION_FALLBACK =
  "Comprehensive details regarding this medication are maintained per pharmaceutical standards. It is surfaced with clear manufacturer detail and pharmacist guidance to help you make informed decisions.";

const getProductCanonicalKey = (product = {}) =>
  [
    String(product.name || "").trim().toLowerCase(),
    String(product.category || "").trim().toLowerCase(),
    String(product.subCategory || "").trim().toLowerCase(),
    String(product.manufacturer || "").trim().toLowerCase(),
  ].join("::");

const sortRecommendationItems = (items = []) =>
  [...items].sort((left, right) => {
    if ((left.stock > 0) !== (right.stock > 0)) {
      return Number(right.stock > 0) - Number(left.stock > 0);
    }

    const leftDate = left.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightDate = right.createdAt ? new Date(right.createdAt).getTime() : 0;
    if (leftDate !== rightDate) {
      return rightDate - leftDate;
    }

    return String(left.name || "").localeCompare(String(right.name || ""));
  });

const collectGalleryImages = (product) => {
  const galleryCandidates = [
    ...(Array.isArray(product?.images) ? product.images : []),
    ...(Array.isArray(product?.galleryImages) ? product.galleryImages : []),
    product?.image,
  ]
    .filter(Boolean)
    .map((image) => image || FALLBACK_MEDICINE_IMAGE);

  const uniqueImages = [...new Set(galleryCandidates)];
  return uniqueImages.length > 0 ? uniqueImages : [FALLBACK_MEDICINE_IMAGE];
};

const takeUniqueRecommendations = (items = [], limit = 4, initialIds = new Set()) => {
  const selected = [];
  const seenIds = new Set(initialIds);

  for (const item of items) {
    const canonicalKey = getProductCanonicalKey(item);

    if (!item?.medicineId || seenIds.has(item.medicineId) || seenIds.has(canonicalKey)) {
      continue;
    }

    seenIds.add(item.medicineId);
    seenIds.add(canonicalKey);
    selected.push(item);

    if (selected.length >= limit) {
      break;
    }
  }

  return selected;
};

const buildQuickFacts = (product, inStock) => [
  {
    icon: FaBoxOpen,
    label: "Category",
    value: product.subCategory || product.category,
  },
  {
    icon: FaShieldAlt,
    label: "Access",
    value: product.requiresPrescription ? "Prescription review required" : "Over-the-counter purchase",
  },
  {
    icon: FaTruck,
    label: "Delivery",
    value: getDeliveryCopy(product),
  },
  {
    icon: FaLeaf,
    label: "Availability",
    value: inStock ? `${product.stock} units currently in stock` : "Temporarily out of stock",
  },
];

const buildSpecifications = (product, inStock) => [
  { label: "Category", value: product.category || "General wellness" },
  { label: "Subcategory", value: product.subCategory || "Not specified" },
  { label: "Manufacturer", value: product.manufacturer || "DocX Pharmacy" },
  { label: "Purchase type", value: product.requiresPrescription ? "Prescription product" : "Over-the-counter product" },
  { label: "Stock status", value: inStock ? `${product.stock} units available` : "Out of stock" },
  { label: "Delivery guidance", value: getDeliveryCopy(product) },
];

const buildPromoContent = (product) =>
  product?.requiresPrescription
    ? {
        eyebrow: "Prescription Care",
        title: "Keep Your Treatment On Track",
        body:
          "Upload your prescription once, get pharmacist-reviewed delivery guidance, and stay ready for your next refill without guesswork.",
        ctaLabel: "Request prescription support",
        ctaPath: "/request-prescription",
      }
    : {
        eyebrow: "Care Plan",
        title: "Build A Smarter Home Care Shelf",
        body:
          "Pair your everyday medicines with the right next-step guidance from DocX so home care stays simple, safe, and easy to reorder.",
        ctaLabel: "Find the right doctor",
        ctaPath: "/find-doctor",
      };

const renderStars = (rating) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  return (
    <>
      {[...Array(fullStars)].map((_, i) => <FaStar key={`full-${i}`} color="#6b5ca5" />)}
      {hasHalfStar && <FaStarHalfAlt color="#6b5ca5" />}
      {[...Array(emptyStars)].map((_, i) => <FaRegStar key={`empty-${i}`} color="#e2e8f0" />)}
    </>
  );
};

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("description");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showSticky, setShowSticky] = useState(false);
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    type: "success",
    message: "",
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    const loadPage = async () => {
      setLoading(true);
      setError("");
      setQuantity(1);
      setActiveTab("description");
      setActiveImageIndex(0);

      const [productResult, catalogResult] = await Promise.allSettled([
        fetchMedicineById(id),
        fetchMedicines(),
      ]);

      if (cancelled) {
        return;
      }

      if (productResult.status === "fulfilled") {
        setProduct(productResult.value);
        setWishlisted(
          isInWishlist(productResult.value.medicineId) || isInWishlist(productResult.value.name)
        );
      } else {
        setError(
          productResult.reason?.response?.data?.message ||
            "We couldn’t load this medicine right now. Please refresh or try again later."
        );
        setProduct(null);
      }

      if (catalogResult.status === "fulfilled") {
        setCatalog(catalogResult.value);
      } else {
        setCatalog([]);
      }

      setLoading(false);
    };

    loadPage();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    const handleScroll = () => {
      setShowSticky(window.scrollY > 560);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const syncWishlist = () => {
      if (!product) {
        return;
      }

      setWishlisted(isInWishlist(product.medicineId) || isInWishlist(product.name));
    };

    window.addEventListener("wishlistUpdated", syncWishlist);
    return () => window.removeEventListener("wishlistUpdated", syncWishlist);
  }, [product]);

  const galleryImages = useMemo(() => collectGalleryImages(product), [product]);
  const inStock = (product?.stock ?? 0) > 0;

  const quickFacts = useMemo(() => {
    if (!product) {
      return [];
    }

    return buildQuickFacts(product, inStock);
  }, [product, inStock]);

  const specifications = useMemo(() => {
    if (!product) {
      return [];
    }

    return buildSpecifications(product, inStock);
  }, [product, inStock]);

  const promoContent = useMemo(() => buildPromoContent(product), [product]);

  const { youMayAlsoLike, relatedProducts } = useMemo(() => {
    if (!product) {
      return { youMayAlsoLike: [], relatedProducts: [] };
    }

    const currentProductCanonicalKey = getProductCanonicalKey(product);
    const filteredCatalog = sortRecommendationItems(
      catalog.filter(
        (item) =>
          item?.medicineId &&
          String(item.medicineId) !== String(product.medicineId) &&
          getProductCanonicalKey(item) !== currentProductCanonicalKey
      )
    );

    const youMayAlsoLikeItems = takeUniqueRecommendations(
      [
        ...filteredCatalog.filter((item) => item.category === product.category),
        ...filteredCatalog.filter((item) => item.manufacturer === product.manufacturer),
        ...filteredCatalog.filter((item) => item.stock > 0),
        ...filteredCatalog,
      ],
      4
    );

    const excludedIds = new Set(youMayAlsoLikeItems.map((item) => item.medicineId));
    const remaining = filteredCatalog.filter((item) => !excludedIds.has(item.medicineId));

    const relatedItems = takeUniqueRecommendations(
      [
        ...remaining.filter((item) => item.category === product.category),
        ...remaining.filter(
          (item) => item.requiresPrescription === product.requiresPrescription
        ),
        ...remaining.filter((item) => item.stock > 0),
        ...remaining,
      ],
      4
    );

    return {
      youMayAlsoLike: youMayAlsoLikeItems,
      relatedProducts: relatedItems,
    };
  }, [catalog, product]);

  const handleAddToCart = (selectedProduct = product, redirectToCart = false, qty = quantity) => {
    if (!selectedProduct) {
      return;
    }

    addToCart(selectedProduct, qty);
    setStatusModal({
      isOpen: true,
      type: "success",
      message: `${selectedProduct.name} added to your cart.`,
    });

    if (redirectToCart) {
      navigate("/cart");
    }
  };

  const buildPrescriptionRequestPath = (selectedProduct = product, qty = quantity) => {
    if (!selectedProduct?.medicineId) {
      return "/request-prescription";
    }

    const params = new URLSearchParams({
      medicineId: selectedProduct.medicineId,
      qty: String(Math.max(1, Number(qty || 1))),
      returnTo: `/product/${selectedProduct.medicineId}`,
    });

    return `/request-prescription?${params.toString()}`;
  };

  const handleToggleWishlist = () => {
    if (!product) {
      return;
    }

    toggleWishlist(product);
    setWishlisted((current) => !current);
    setStatusModal({
      isOpen: true,
      type: "info",
      message: `${product.name} wishlist updated.`,
    });
  };

  const handleHelpAction = () => {
    if (product?.requiresPrescription) {
      requirePatientSessionForNavigation(navigate, buildPrescriptionRequestPath());
      return;
    }

    navigate("/contact-us");
  };

  const handleRecommendationPrimaryAction = (recommendedProduct) => {
    if (recommendedProduct.requiresPrescription) {
      navigate(`/product/${recommendedProduct.medicineId}`);
      return;
    }

    handleAddToCart(recommendedProduct, false, 1);
  };

  if (loading || error || !product) {
    return (
      <Page>
        <Navigationbar />
        <Container>
          <Breadcrumbs>
            <Link to="/pharmacy">Pharmacy</Link>
            <span className="separator">
              <FaChevronRight />
            </span>
            <span className="current">{loading ? "Loading" : "Product unavailable"}</span>
          </Breadcrumbs>
          <StatePanel>
            <h2>{loading ? "Loading product details..." : "Product unavailable"}</h2>
            <p>{error}</p>
          </StatePanel>
        </Container>
        <Footer />
      </Page>
    );
  }

  const selectedImage = galleryImages[activeImageIndex] || galleryImages[0] || FALLBACK_MEDICINE_IMAGE;
  const descriptionCopy = product.description || DESCRIPTION_FALLBACK;
  const helpLabel = product.requiresPrescription ? "Ask pharmacist" : "Need help?";
  const availabilityTone = inStock
    ? { background: "rgba(237, 250, 244, 0.96)", color: "#0f8b5f", label: "In stock" }
    : { background: "rgba(254, 226, 226, 0.96)", color: "#991b1b", label: "Out of stock" };

  return (
    <Page>
      <StatusModal
        isOpen={statusModal.isOpen}
        onClose={() => setStatusModal((current) => ({ ...current, isOpen: false }))}
        type={statusModal.type}
        message={statusModal.message}
      />

      <Navigationbar />

      <Container>
        <Breadcrumbs>
          <Link to="/pharmacy">Pharmacy</Link>
          <span className="separator">
            <FaChevronRight />
          </span>
          <Link to="/pharmacy">{product.category}</Link>
          <span className="separator">
            <FaChevronRight />
          </span>
          <span className="current">{product.name}</span>
        </Breadcrumbs>

        <HeroGrid>
          <GalleryColumn>
            <GalleryStage>
              <BadgeRow>
                <ProductBadge $variant={product.requiresPrescription ? "rx" : "otc"}>
                  {product.requiresPrescription ? <FaShieldAlt /> : <FaCheckCircle />}
                  {product.requiresPrescription ? "Prescription required" : "OTC product"}
                </ProductBadge>
              </BadgeRow>

              <StageImage
                alt={product.name}
                onError={(event) => {
                  event.currentTarget.src = FALLBACK_MEDICINE_IMAGE;
                }}
                src={selectedImage}
              />
            </GalleryStage>

            {galleryImages.length > 1 ? (
              <ThumbnailRail>
                {galleryImages.map((image, index) => (
                  <ThumbnailButton
                    key={`${product.medicineId}-thumb-${index}`}
                    $active={index === activeImageIndex}
                    onClick={() => setActiveImageIndex(index)}
                    type="button"
                  >
                    <img
                      alt={`${product.name} view ${index + 1}`}
                      onError={(event) => {
                        event.currentTarget.src = FALLBACK_MEDICINE_IMAGE;
                      }}
                      src={image}
                    />
                  </ThumbnailButton>
                ))}
              </ThumbnailRail>
            ) : null}
          </GalleryColumn>          <PurchaseRail>
              <ProductTitle>{product.name}</ProductTitle>
              
              <MetaInfo>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {product.averageRating ? renderStars(product.averageRating) : "★★★★☆"}
                  <span style={{ marginLeft: '4px', color: '#64748b' }}>
                    ({product.reviewCount || 2} Customer review)
                  </span>
                </span>
              </MetaInfo>

              <PriceRow>
                <strong>{formatCurrency(product.price)}</strong>
                <span className="old-price">{formatCurrency(product.price * 1.25)}</span>
              </PriceRow>

              <ShortDescription>
                {product.description
                  ? (product.description.length > 250 ? product.description.substring(0, 250) + '...' : product.description)
                  : "Detailed product description is currently unavailable for this item. Please consult your pharmacist for more information."}
              </ShortDescription>

              <InfoRow>
                <span className="label">Categories:</span>
                <span className="value">{product.category}, Health, Pharmacy</span>
              </InfoRow>

              <InfoRow>
                <span className="label">Tags:</span>
                <span className="value">Medicine, Care, Wellness</span>
              </InfoRow>

              <InfoRow>
                <span className="label">Share:</span>
                <div style={{ display: 'flex', gap: '16px', color: '#64748b', fontSize: '1.2rem' }}>
                  <FaFacebookF style={{ cursor: 'pointer' }} onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${window.location.href}`, '_blank')} /> 
                  <FaWhatsapp style={{ cursor: 'pointer' }} onClick={() => window.open(`https://api.whatsapp.com/send?text=Check out ${product.name} on DocX: ${window.location.href}`, '_blank')} /> 
                  <FaEnvelope style={{ cursor: 'pointer' }} onClick={() => window.location.href = `mailto:?subject=Check out ${product.name}&body=I thought you might be interested in ${product.name}. Check it out here: ${window.location.href}`} />
                </div>
              </InfoRow>

              <AddToCartRow>
                <QtySelector>
                  <button onClick={() => setQuantity((current) => clampQuantity(current - 1))} type="button">−</button>
                  <span>{quantity}</span>
                  <button onClick={() => setQuantity((current) => clampQuantity(current + 1))} type="button">+</button>
                </QtySelector>
                
                {product.requiresPrescription ? (
                  <>
                    <PrimaryButton onClick={() => setUploadOpen(true)} type="button">
                      <FaFileMedical /> Upload Rx
                    </PrimaryButton>
                    <SecondaryButton
                      onClick={() => requirePatientSessionForNavigation(navigate, buildPrescriptionRequestPath())}
                      type="button"
                    >
                      Request Rx
                    </SecondaryButton>
                  </>
                ) : (
                  <>
                    <SecondaryButton disabled={!inStock} onClick={() => handleAddToCart(product, false, quantity)} type="button">
                      <FaShoppingBag /> ADD TO CART
                    </SecondaryButton>
                    <PrimaryButton disabled={!inStock} onClick={() => handleAddToCart(product, true, quantity)} type="button">
                      BUY NOW
                    </PrimaryButton>
                  </>
                )}
              </AddToCartRow>
            </PurchaseRail>
        </HeroGrid>

        <DetailsShell>
          <DetailTabs>
            <DetailTab $active={activeTab === "description"} onClick={() => setActiveTab("description")} type="button">
              Description
            </DetailTab>
            <DetailTab $active={activeTab === "specifications"} onClick={() => setActiveTab("specifications")} type="button">
              Product Specifications
            </DetailTab>
            <DetailTab $active={activeTab === "reviews"} onClick={() => setActiveTab("reviews")} type="button">
              Reviews
            </DetailTab>
          </DetailTabs>

          <DetailContent>
            {activeTab === "description" ? (
              <DescriptionPanel>
                {product.longDescription ? (
                  <>
                    <div>
                      <h3>Overview</h3>
                      <p>{product.longDescription.overview}</p>
                    </div>
                    <div>
                      <h3>Key Benefits</h3>
                      <BulletList>
                        {product.longDescription.benefits.map((benefit, i) => (
                          <li key={i}>
                            <FaCheckCircle />
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </BulletList>
                    </div>
                    {product.longDescription.usage && (
                      <div>
                        <h3>How to Use</h3>
                        <p>{product.longDescription.usage}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p>{descriptionCopy}</p>
                    <p>{product.manufacturer} ensures high quality standards for {product.name}.</p>
                  </>
                )}
              </DescriptionPanel>
            ) : null}

            {activeTab === "specifications" ? (
              <SpecsGrid>
                {(product.advancedSpecifications || specifications).map((specification) => {
                  let Icon = FaInfoCircle;
                  const label = specification.label.toLowerCase();
                  if (label.includes("ingredient")) Icon = FaLeaf;
                  else if (label.includes("form")) Icon = FaPills;
                  else if (label.includes("storage")) Icon = FaThermometerHalf;
                  else if (label.includes("manufacturer")) Icon = FaIndustry;
                  
                  return (
                    <SpecCard key={specification.label}>
                      <div className="icon-wrapper">
                        <Icon />
                      </div>
                      <div className="content">
                        <span className="label">{specification.label}</span>
                        <span className="value">{specification.value}</span>
                      </div>
                    </SpecCard>
                  );
                })}
              </SpecsGrid>
            ) : null}

            {activeTab === "reviews" ? (
              product.reviews && product.reviews.length > 0 ? (
                <div>
                  <RatingSummary>
                    <div className="average-box">
                      <div className="average">{product.averageRating}</div>
                      <div className="stars">{renderStars(product.averageRating)}</div>
                      <div className="count">Based on {product.reviewCount} reviews</div>
                    </div>
                    <div className="progress-bars">
                      {[5, 4, 3, 2, 1].map(stars => {
                        let percentage = 0;
                        if (stars === 5) percentage = 75;
                        else if (stars === 4) percentage = 15;
                        else if (stars === 3) percentage = 5;
                        else if (stars === 2) percentage = 3;
                        else percentage = 2;
                        
                        return (
                          <div key={stars} className="progress-row">
                            <span style={{ width: '12px' }}>{stars}</span>
                            <FaStar color="#6b5ca5" size={12} />
                            <div className="progress-track">
                              <div className="progress-fill" style={{ width: `${percentage}%` }}></div>
                            </div>
                            <span style={{ width: '32px', textAlign: 'right' }}>{percentage}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </RatingSummary>
                  <ReviewList>
                    {product.reviews.map(review => (
                      <ReviewCard key={review.id}>
                        <div className="header">
                          <div className="reviewer-info">
                            <div className="avatar">
                              {review.reviewerName.charAt(0)}
                            </div>
                            <div>
                              <div className="name">{review.reviewerName}</div>
                              <div className="stars">{renderStars(review.rating)}</div>
                            </div>
                          </div>
                          <div className="date">{review.date}</div>
                        </div>
                        <p className="comment">{review.comment}</p>
                      </ReviewCard>
                    ))}
                  </ReviewList>
                </div>
              ) : (
                <ReviewEmptyState>
                  <strong>Reviews are not available yet.</strong>
                  <p>We will show verified medicine feedback here soon.</p>
                </ReviewEmptyState>
              )
            ) : null}
          </DetailContent>
        </DetailsShell>



        {youMayAlsoLike.length > 0 ? (
          <RecommendationSection>
            <SectionHeading>
              <div>
                <h2>You may also like</h2>
                <p>
                  Similar picks chosen from the current catalog using this product’s
                  category, manufacturer, and in-stock availability.
                </p>
              </div>
            </SectionHeading>

            <ProductShelf>
              <Slider
                dots={true}
                infinite={false}
                speed={500}
                slidesToShow={4}
                slidesToScroll={1}
                responsive={[
                  { breakpoint: 1180, settings: { slidesToShow: 3 } },
                  { breakpoint: 900, settings: { slidesToShow: 2 } },
                  { breakpoint: 560, settings: { slidesToShow: 1 } }
                ]}
              >
                {youMayAlsoLike.map((recommendedProduct) => (
                  <ShelfCard key={`ymal-${recommendedProduct.medicineId}`}>
                    <ShelfCardButton
                      onClick={() => navigate(`/product/${recommendedProduct.medicineId}`)}
                      type="button"
                    >
                      <ShelfMedia>
                        <ShelfBadge
                          $background={
                            recommendedProduct.requiresPrescription
                              ? PHARMACY_THEME.dangerSoft
                              : PHARMACY_THEME.accentSoft
                          }
                          $color={
                            recommendedProduct.requiresPrescription
                              ? PHARMACY_THEME.danger
                              : PHARMACY_THEME.accentStrong
                          }
                        >
                          {recommendedProduct.requiresPrescription ? "Rx Required" : "OTC Ready"}
                        </ShelfBadge>
                        <img
                          alt={recommendedProduct.name}
                          onError={(event) => {
                            event.currentTarget.src = FALLBACK_MEDICINE_IMAGE;
                          }}
                          src={recommendedProduct.image}
                        />
                      </ShelfMedia>
                    </ShelfCardButton>

                    <ShelfBody>
                      <ShelfStars>
                        {renderStars(recommendedProduct.averageRating || 4)}
                        <span className="review-count">({recommendedProduct.reviewCount || 126} Review)</span>
                      </ShelfStars>
                      <h3>{recommendedProduct.name}</h3>

                      <AvailabilityBar $percent={recommendedProduct.stock > 0 ? (recommendedProduct.stock / 500) * 100 : 0}>
                        <span className="avail-text">
                          Available: {recommendedProduct.stock > 0 ? recommendedProduct.stock : 0}
                        </span>
                        <div className="progress-bg">
                          <div className="progress-fill" />
                        </div>
                      </AvailabilityBar>

                      <ShelfPriceRow>
                        <strong>{formatCurrency(recommendedProduct.price)}</strong>
                        <span className="old-price">
                          {formatCurrency(recommendedProduct.price * 1.15)}
                        </span>
                      </ShelfPriceRow>
                    </ShelfBody>
                  </ShelfCard>
                ))}
              </Slider>
            </ProductShelf>
          </RecommendationSection>
        ) : null}



        {relatedProducts.length > 0 ? (
          <RecommendationSection>
            <SectionHeading>
              <div>
                <h2>Related products</h2>
                <p>
                  More catalog options grouped by similar category and pharmacy access
                  rules, without repeating the shelf above.
                </p>
              </div>
            </SectionHeading>

            <ProductShelf>
              <Slider
                dots={true}
                infinite={false}
                speed={500}
                slidesToShow={4}
                slidesToScroll={1}
                responsive={[
                  { breakpoint: 1180, settings: { slidesToShow: 3 } },
                  { breakpoint: 900, settings: { slidesToShow: 2 } },
                  { breakpoint: 560, settings: { slidesToShow: 1 } }
                ]}
              >
                {relatedProducts.map((recommendedProduct) => (
                  <ShelfCard key={`related-${recommendedProduct.medicineId}`}>
                    <ShelfCardButton
                      onClick={() => navigate(`/product/${recommendedProduct.medicineId}`)}
                      type="button"
                    >
                      <ShelfMedia>
                        <ShelfBadge
                          $background={
                            recommendedProduct.requiresPrescription
                              ? PHARMACY_THEME.dangerSoft
                              : PHARMACY_THEME.accentSoft
                          }
                          $color={
                            recommendedProduct.requiresPrescription
                              ? PHARMACY_THEME.danger
                              : PHARMACY_THEME.accentStrong
                          }
                        >
                          {recommendedProduct.requiresPrescription ? "Rx Required" : "OTC Ready"}
                        </ShelfBadge>
                        <img
                          alt={recommendedProduct.name}
                          onError={(event) => {
                            event.currentTarget.src = FALLBACK_MEDICINE_IMAGE;
                          }}
                          src={recommendedProduct.image}
                        />
                      </ShelfMedia>
                    </ShelfCardButton>

                    <ShelfBody>
                      <ShelfStars>
                        {renderStars(recommendedProduct.averageRating || 4)}
                        <span className="review-count">({recommendedProduct.reviewCount || 126} Review)</span>
                      </ShelfStars>
                      <h3>{recommendedProduct.name}</h3>

                      <AvailabilityBar $percent={recommendedProduct.stock > 0 ? (recommendedProduct.stock / 500) * 100 : 0}>
                        <span className="avail-text">
                          Available: {recommendedProduct.stock > 0 ? recommendedProduct.stock : 0}
                        </span>
                        <div className="progress-bg">
                          <div className="progress-fill" />
                        </div>
                      </AvailabilityBar>

                      <ShelfPriceRow>
                        <strong>{formatCurrency(recommendedProduct.price)}</strong>
                        <span className="old-price">
                          {formatCurrency(recommendedProduct.price * 1.15)}
                        </span>
                      </ShelfPriceRow>
                    </ShelfBody>
                  </ShelfCard>
                ))}
              </Slider>
            </ProductShelf>
          </RecommendationSection>
        ) : null}
      </Container>



      <PrescriptionUploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        product={product}
        qty={quantity}
      />
      <Footer />
    </Page>
  );
};

export default ProductDetails;
