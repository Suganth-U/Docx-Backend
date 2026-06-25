import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import { assets } from "@/shared/lib/assets";
import api from "@/shared/lib/api";
import { useNavigate } from "react-router-dom";
import {
  FiHome, FiCalendar, FiFileText, FiMessageSquare, FiSettings, FiLogOut,
  FiBell, FiSearch, FiActivity, FiVideo,
  FiCheckSquare, FiX, FiSend, FiPaperclip, FiSmile,
  FiShoppingBag
} from "react-icons/fi";
import { BiPlusMedical } from "react-icons/bi";
import { useToast } from "@/shared/context/ToastContext";
import { clearAuthSessionStorage } from "@/shared/lib/authSession";
import { formatCurrency, formatDateTime, getOrderTone, getPaymentMethodLabel } from "@/shared/features/Epharmacy/pharmacyShared";
import { fetchMyAppointments } from "@/shared/features/Appointments/appointmentClient";
import {
  getVirtualMeetingState,
  mergeAppointmentTimeline,
} from "@/shared/features/booking/appointmentTimeline";
import { fetchMyConsultations } from "@/shared/features/Consultations/consultationClient";
import {
  fetchPatientNotifications,
  markAllPatientNotificationsRead,
  markPatientNotificationRead,
} from "@/patient/api/patientNotificationClient";
import PatientMedicalTimeline from "@/shared/components/common/PatientMedicalTimeline";
import PatientMedicationManager from "@/shared/components/common/PatientMedicationManager";
import FieldError from "@/shared/components/common/FieldError";
import { clearFieldError, validateRequiredFields } from "@/shared/lib/formValidation";

// --- Layout & Global Styles ---
const DashboardContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #F8F9FB;
  font-family: 'DM Sans', sans-serif;
  overflow-x: hidden;
`;

// --- TOP NAVBAR STYLES ---
const TopNavContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: white;
  padding: 0 16px;
  height: 70px;
  border-bottom: 1px solid #E5E7EB;
  box-shadow: 0 1px 2px rgba(0,0,0,0.02);
  @media (max-width: 1024px) { padding: 0 20px; }
`;
const NavLeft = styled.div` display: flex; align-items: center; gap: 30px; `;
const LogoBox = styled.button`
  display: flex; align-items: center; justify-content: center;
  width: 38px; height: 38px; background: #683B93; border-radius: 10px; color: white; font-weight: bold;
  border: none; padding: 0; cursor: pointer; transition: transform 0.15s ease, background 0.15s ease;
  &:hover { background: #5B3281; transform: translateY(-1px); }
  &:focus-visible { outline: 3px solid #D8B4FE; outline-offset: 2px; }
`;
const NavList = styled.div` display: flex; align-items: center; gap: 24px; height: 100%; @media (max-width: 1024px) { display: none; } `;
const NavItem = styled.div`
  font-size: 15px; font-weight: 500; cursor: pointer; position: relative; height: 70px; display: flex; align-items: center;
  color: ${props => props.$active ? '#111827' : '#6B7280'};
  border-bottom: 3px solid ${props => props.$active ? '#683B93' : 'transparent'};
  transition: all 0.2s;
  &:hover { color: #111827; }
`;
const NavRight = styled.div` display: flex; align-items: center; gap: 24px; `;
const IconButton = styled.div`
  color: #6B7280; font-size: 20px; cursor: pointer; display: flex; position: relative;
  &:hover { color: #111827; }
  .badge {
    position: absolute;
    top: -9px;
    right: -9px;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 999px;
    background: #EF4444;
    color: #fff;
    font-size: 10px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #fff;
  }
`;
const TopProfile = styled.div`
  display: flex; align-items: center; gap: 12px; cursor: pointer; padding-left: 20px; border-left: 1px solid #E5E7EB;
  img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
  .info { display: flex; flex-direction: column; @media (max-width: 768px) { display: none; } }
  h4 { margin: 0; font-size: 14px; font-weight: 600; color: #111827; }
  p { margin: 0; font-size: 12px; color: #6B7280; }
`;



// --- NEW PROFILE LAYOUT STYLES ---
const ProfileLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 32px;
  max-width: 1240px;
  margin: 0 auto;
  @media (max-width: 1024px) { display: flex; flex-direction: column; }
`;
const LeftCol = styled.div` display: flex; flex-direction: column; gap: 32px; `;
const RightCol = styled.div` display: flex; flex-direction: column; gap: 32px; `;

const TopProfileCard = styled.div`
  background: white;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 12px 32px -4px rgba(104, 59, 147, 0.05), 0 4px 12px -2px rgba(104, 59, 147, 0.03);
  border: 1px solid rgba(229, 231, 235, 0.5);
  transition: transform 0.2s, box-shadow 0.2s;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 40px -4px rgba(104, 59, 147, 0.08), 0 8px 16px -2px rgba(104, 59, 147, 0.04);
  }
`;

const HeroBanner = styled.div`
  height: 180px;
  background: radial-gradient(circle at 10% 20%, rgba(216, 180, 254, 0.4) 0%, transparent 40%),
              radial-gradient(circle at 90% 80%, rgba(104, 59, 147, 0.3) 0%, transparent 40%),
              linear-gradient(135deg, #F3E8FF 0%, #FAF5FF 100%);
`;

const ProfileContentInfo = styled.div`
  padding: 0 40px 40px; position: relative;
  .avatar-wrapper { position: relative; margin-top: -65px; margin-bottom: 24px; }
  .avatar-wrapper img { width: 130px; height: 130px; border-radius: 50%; border: 6px solid white; object-fit: cover; background: white; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
  h1 { margin: 0; font-size: 28px; font-weight: 800; color: #111827; letter-spacing: -0.02em; }
  .location { display: flex; align-items: center; gap: 6px; color: #4B5563; font-size: 15px; margin: 10px 0 16px; font-weight: 500; }
  .meta { color: #4B5563; font-size: 15px; margin-bottom: 28px; display: flex; flex-wrap: wrap; gap: 8px; font-weight: 500; }
  .actions { display: flex; gap: 16px; }
  .actions button { padding: 12px 24px; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s ease; }
  .btn-msg { background: white; color: #111827; border: 1px solid #E5E7EB; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
  .btn-msg:hover { background: #F9FAFB; border-color: #D1D5DB; box-shadow: 0 2px 4px rgba(0,0,0,0.04); }
  .btn-profile { background: linear-gradient(135deg, #683B93, #5B3281); color: white; border: none; box-shadow: 0 4px 12px rgba(104, 59, 147, 0.2); }
  .btn-profile:hover { opacity: 0.95; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(104, 59, 147, 0.3); }
`;

const SectionCard = styled.div`
  background: white;
  border-radius: 24px;
  padding: 36px;
  box-shadow: 0 12px 32px -4px rgba(104, 59, 147, 0.03), 0 4px 12px -2px rgba(104, 59, 147, 0.02);
  border: 1px solid rgba(229, 231, 235, 0.5);
  transition: transform 0.2s, box-shadow 0.2s;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 40px -4px rgba(104, 59, 147, 0.06), 0 8px 16px -2px rgba(104, 59, 147, 0.03);
  }
  h3 { margin: 0 0 24px; font-size: 20px; font-weight: 800; color: #111827; letter-spacing: -0.01em; display: flex; align-items: center; gap: 8px; }
`;

const ChipContainer = styled.div` display: flex; flex-wrap: wrap; gap: 12px; `;
const Chip = styled.span`
  background: #FAF5FF;
  border: 1px solid #E9D5FF;
  padding: 8px 18px;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 600;
  color: #683B93;
  transition: all 0.2s;
  &:hover { background: #F3E8FF; transform: translateY(-1px); box-shadow: 0 2px 8px rgba(104, 59, 147, 0.1); }
`;

const HistoryList = styled.div` display: flex; flex-direction: column; gap: 28px; `;
const HistoryItem = styled.div`
  display: flex; gap: 18px;
  .icon {
    width: 48px; height: 48px; border-radius: 14px; background: #FAF5FF; border: 1px solid #F3E8FF;
    display: flex; align-items: center; justify-content: center; color: #683B93; font-size: 22px; flex-shrink: 0;
  }
  .content { flex: 1; }
  .content h4 { margin: 0; font-size: 17px; font-weight: 700; color: #111827; letter-spacing: -0.01em; }
  .subtitle { margin: 4px 0 8px; font-size: 15px; font-weight: 500; color: #4B5563; }
  .date { font-size: 13px; color: #6B7280; margin-bottom: 10px; font-weight: 500; }
  .desc { font-size: 14px; color: #4B5563; line-height: 1.6; margin: 0; }
`;

const PersonItem = styled.div`
  display: flex; align-items: center; gap: 14px; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #F3F4F6;
  &:last-child { margin-bottom: 0; border-bottom: none; padding-bottom: 0; }
  .avatar { position: relative; }
  .avatar img.main { width: 52px; height: 52px; border-radius: 50%; object-fit: cover; border: 2px solid #F3F4F6; }
  .avatar div.badge { position: absolute; bottom: -2px; right: -2px; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; font-size: 11px; }
  .info h4 { margin: 0; font-size: 16px; font-weight: 700; color: #111827; letter-spacing: -0.01em; }
  .info p { margin: 4px 0 0; font-size: 14px; font-weight: 500; color: #6B7280; }
`;
const RightAction = styled.button`
  margin-left: auto;
  color: #683B93;
  background: #FAF5FF;
  border: 1px solid #E9D5FF;
  padding: 8px 16px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: #F3E8FF; transform: translateY(-1px); box-shadow: 0 2px 6px rgba(104, 59, 147, 0.1); }
`;

// --- MAIN CONTENT ---
const MainContent = styled.div`
  flex: 1;
  padding: 48px;
  overflow-y: auto;
  transition: all 0.3s ease;
  
  @media (max-width: 768px) {
    padding: 24px;
  }
`;

const Card = styled.div`
  background: white;
  border-radius: 24px;
  padding: 36px;
  box-shadow: 0 12px 32px -4px rgba(104, 59, 147, 0.03), 0 4px 12px -2px rgba(104, 59, 147, 0.02);
  border: 1px solid rgba(229, 231, 235, 0.5);
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
  
  h3 { margin: 0; font-size: 20px; font-weight: 800; color: #111827; letter-spacing: -0.01em; }
  button { color: #683B93; background: none; border: none; font-weight: 700; cursor: pointer; font-size: 14px; transition: color 0.2s; }
  button:hover { color: #4C1D95; }
`;

// --- NOTIFICATION DROPDOWN ---
const NotifDropBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 998;
`;

const NotifDropdown = styled.div`
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  width: 400px;
  max-height: 520px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.14), 0 0 0 1px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 999;
  animation: notifSlideIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);

  @keyframes notifSlideIn {
    from { opacity: 0; transform: translateY(-6px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  @media (max-width: 480px) {
    width: calc(100vw - 24px);
    right: -60px;
  }
`;

const NotifHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px 12px;
  border-bottom: 1px solid #F3F4F6;

  h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: #111827;
  }
`;

const MarkAllBtn = styled.button`
  border: none;
  background: none;
  color: #683B93;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.15s;

  &:hover {
    background: #F3E8FF;
  }
`;

const NotifBody = styled.div`
  overflow-y: auto;
  flex: 1;
  max-height: 400px;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 4px; }
`;

const NotifItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 18px;
  cursor: pointer;
  border-left: 3px solid ${(p) => (p.$unread ? '#683B93' : 'transparent')};
  background: ${(p) => (p.$unread ? '#FDFBFF' : 'transparent')};
  transition: background 0.15s;

  &:hover {
    background: #F9F5FF;
  }

  & + & {
    border-top: 1px solid #F9FAFB;
  }
`;

const NotifDot = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: ${(p) => p.$bg || '#F3E8FF'};
  color: ${(p) => p.$color || '#683B93'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  flex-shrink: 0;
  margin-top: 2px;
`;

const NotifContent = styled.div`
  flex: 1;
  min-width: 0;

  .notif-title {
    font-size: 13px;
    font-weight: 600;
    color: #111827;
    margin: 0 0 3px;
    line-height: 1.35;
  }

  .notif-msg {
    font-size: 12px;
    color: #6B7280;
    margin: 0;
    line-height: 1.45;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .notif-time {
    font-size: 11px;
    color: #9CA3AF;
    margin-top: 4px;
  }
`;

const NotifBadgeLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 6px;
  background: ${(p) => (p.$unread ? '#EDE9FE' : '#F3F4F6')};
  color: ${(p) => (p.$unread ? '#683B93' : '#9CA3AF')};
  white-space: nowrap;
  flex-shrink: 0;
  margin-top: 2px;
`;

const NotifEmpty = styled.div`
  padding: 40px 20px;
  text-align: center;
  color: #9CA3AF;

  svg { font-size: 28px; margin-bottom: 8px; opacity: 0.4; }
  p { margin: 0; font-size: 13px; }
`;

const NotifFooter = styled.div`
  padding: 10px 18px;
  border-top: 1px solid #F3F4F6;
  text-align: center;

  button {
    border: none;
    background: none;
    color: #683B93;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
    transition: background 0.15s;

    &:hover {
      background: #F3E8FF;
    }
  }
`;

// --- REMINDER MODAL (kept simpler) ---
const ModalBackdrop = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 999;
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: ${props => props.$isOpen ? '1' : '0'};
  pointer-events: ${props => props.$isOpen ? 'all' : 'none'};
  transition: opacity 0.3s ease;
`;

const ModalContainer = styled.div`
  background: white;
  width: 420px;
  max-width: 90vw;
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  transform: ${props => props.$isOpen ? 'translateY(0)' : 'translateY(20px)'};
  opacity: ${props => props.$isOpen ? '1' : '0'};
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  max-height: 85vh;
  overflow-y: auto;
`;

const RightHeader = styled.div`
    margin-bottom: 20px;
    display: flex; justify-content: space-between; align-items: center;
    h3 { margin: 0; color: #111827; font-size: 18px; font-weight: 700; }
    .close-btn { cursor: pointer; color: #6B7280; transition: 0.2s; &:hover { color: #111827; } }
`;

const TaskList = styled.div`
    display: flex; flex-direction: column; gap: 12px;
`;

const TaskItem = styled.div`
    display: flex; align-items: center; gap: 14px;
    background: white;
    border: 1px solid #F3F4F6;
    padding: 14px; border-radius: 14px;
    transition: 0.2s;
    cursor: pointer;
    
    &:hover { border-color: #D1D5DB; box-shadow: 0 2px 6px rgba(0,0,0,0.04); }

    .icon {
        width: 38px; height: 38px; background: #F9FAFB; border-radius: 10px;
        display: flex; align-items: center; justify-content: center;
        color: #683B93; font-size: 16px; border: 1px solid #F3F4F6;
    }
    
    .content {
        flex: 1;
        h5 { margin: 0; color: #111827; font-size: 14px; font-weight: 600; }
        p { margin: 2px 0 0; color: #6B7280; font-size: 12px; }
    }
    
    .action { font-size: 12px; color: #683B93; font-weight: 600; }
`;

const PanelSectionTitle = styled.div`
  margin: 4px 0 -2px;
  color: #9CA3AF;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

// --- CHAT COMPONENTS ---
const ChatContainer = styled.div`
    display: flex;
    height: calc(100vh - 140px); // Adjust based on header/padding
    background: white;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0,0,0,0.02);
    border: 1px solid #F4F4F5;
`;

const ChatSidebar = styled.div`
    width: 340px;
    background: white;
    border-right: 1px solid #F4F4F5;
    display: flex; 
    flex-direction: column;
    padding: 20px;
`;

const ChatHeader = styled.div`
    margin-bottom: 20px;
    display: flex;
    align-items: baseline;
    gap: 10px;
    h3 { margin: 0; color: #111827; font-size: 22px; font-weight: 700; }
    span { font-size: 12px; color: #111827; font-weight: 700; }
`;

const ChatSearch = styled.div`
    display: flex;
    align-items: center;
    background: #F9FAFC;
    border-radius: 12px;
    padding: 12px 15px;
    margin-bottom: 15px;
    
    svg { color: #111827; font-size: 18px; margin-right: 10px; }
    input { border: none; background: transparent; outline: none; width: 100%; color: #111827; font-weight: 500; }
`;

const BlockedUsersBtn = styled.button`
    width: 100%;
    padding: 12px;
    background: #F9FAFC;
    color: #111827;
    border: none;
    border-radius: 12px;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    margin-bottom: 20px;
    
    &:hover { background: #F4F4F5; }
`;

const ContactList = styled.div`
    flex: 1; overflow-y: auto;
    
    &::-webkit-scrollbar { width: 6px; }
    &::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
`;

const ContactItem = styled.div`
    display: flex; align-items: center; gap: 15px;
    padding: 15px; border-radius: 12px;
    cursor: pointer; transition: 0.2s;
    background: ${props => props.$active ? '#F9FAFC' : 'transparent'};
    
    &:hover { background: #F9FAFC; }
    
    img { width: 45px; height: 45px; border-radius: 50%; object-fit: cover; }
    div {
        flex: 1;
        h4 { margin: 0; font-size: 15px; color: #111827; font-weight: 600; }
        p { margin: 2px 0 0; font-size: 13px; color: #6B7280; }
    }
`;

const ChatArea = styled.div`
    flex: 1; display: flex; flex-direction: column; background: white;
`;

const EmptyChatState = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    
    h2 { color: #111827; font-size: 24px; font-weight: 700; margin: 0 0 10px 0; }
    p { color: #111827; font-size: 15px; margin: 0; }
`;

const MessageList = styled.div`
    flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 15px;
`;

const MessageBubble = styled.div`
    max-width: 70%;
    padding: 12px 18px;
    border-radius: 18px;
    font-size: 14px;
    align-self: ${props => props.$isMine ? 'flex-end' : 'flex-start'};
    background: ${props => props.$isMine ? '#683B93' : '#F4F7FE'};
    color: ${props => props.$isMine ? 'white' : '#2B3674'};
    border-bottom-right-radius: ${props => props.$isMine ? '4px' : '18px'};
    border-bottom-left-radius: ${props => props.$isMine ? '18px' : '4px'};
`;

const ChatInputArea = styled.div`
    padding: 20px;
    border-top: 1px solid #f0f0f0;
    display: flex; align-items: center; gap: 15px;
    
    input {
        flex: 1; padding: 12px 20px; border-radius: 30px; border: 1px solid #E0E5F2; outline: none;
        &:focus { border-color: #683B93; }
    }
    
    .icon-btn {
        width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
        color: #A3AED0; cursor: pointer; transition: 0.2s;
        &:hover { background: #F4F7FE; color: #683B93; }
    }
    
    .send-btn {
        background: #683B93; color: white; border: none; padding: 10px 20px; border-radius: 30px;
        font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 5px;
        &:hover { opacity: 0.9; }
    }
`;


// --- SETTINGS VIEW COMPONENTS ---
const FormGroup = styled.div`
  margin-bottom: 20px;
  label { display: block; margin-bottom: 8px; font-weight: 600; color: #2B3674; }
  input { 
      width: 100%; padding: 12px; border: 1px solid #E0E5F2; border-radius: 10px; 
      outline: none; color: #2B3674; font-weight: 500;
      &:focus { border-color: #683B93; }
  }
`;

const SaveBtn = styled.button`
    background: #683B93; color: white; border: none; padding: 12px 30px;
    border-radius: 12px; font-weight: 700; cursor: pointer;
    &:hover { opacity: 0.9; }
`;

// --- SEARCH OVERLAY STYLED COMPONENTS ---
const SearchOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(6px);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 12vh;
  animation: searchFadeIn 0.15s ease;
  @keyframes searchFadeIn { from { opacity: 0; } to { opacity: 1; } }
`;

const SearchModal = styled.div`
  background: #ffffff;
  border-radius: 16px;
  width: 600px;
  max-width: 92vw;
  max-height: 520px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.25);
  animation: searchSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
  @keyframes searchSlideIn { from { opacity: 0; transform: translateY(-8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
`;

const SearchInputBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid #E5E7EB;
  svg { color: #9CA3AF; font-size: 20px; flex-shrink: 0; }
  input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 16px;
    font-weight: 500;
    color: #111827;
    font-family: 'DM Sans', sans-serif;
    &::placeholder { color: #D1D5DB; }
  }
  .kbd {
    background: #F3F4F6;
    border: 1px solid #E5E7EB;
    border-radius: 6px;
    padding: 2px 8px;
    font-size: 12px;
    color: #9CA3AF;
    font-family: monospace;
    font-weight: 600;
  }
`;

const SearchResults = styled.div`
  overflow-y: auto;
  max-height: 400px;
  padding: 8px;
`;

const SearchCategory = styled.div`
  padding: 8px 12px 4px;
  font-size: 11px;
  font-weight: 700;
  color: #9CA3AF;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const SearchResultItem = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.12s;
  background: ${props => props.$active ? '#F3E8FF' : 'transparent'};
  &:hover { background: #F9F5FF; }
  .sr-icon {
    width: 36px; height: 36px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; font-size: 16px;
    background: ${props => props.$iconBg || '#F3E8FF'};
    color: ${props => props.$iconColor || '#683B93'};
  }
  .sr-info { flex: 1; min-width: 0; }
  .sr-info h4 { margin: 0; font-size: 14px; font-weight: 600; color: #1F2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sr-info p { margin: 2px 0 0; font-size: 12px; color: #6B7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sr-action { font-size: 12px; color: #683B93; font-weight: 600; white-space: nowrap; }
`;

const SearchEmpty = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #9CA3AF;
  p { margin: 8px 0 0; font-size: 14px; }
  svg { font-size: 40px; opacity: 0.3; }
`;

const SearchQuickLinks = styled.div`
  padding: 12px;
  border-top: 1px solid #F3F4F6;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const QuickLink = styled.button`
  background: #F3F4F6;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  color: #4B5563;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s;
  &:hover { background: #F3E8FF; border-color: #D8B4FE; color: #683B93; }
`;


const PatientProfile = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [showNotifDrop, setShowNotifDrop] = useState(false);
  const notifBellRef = useRef(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  // User Data State
  const [user, setUser] = useState({
    name: "Loading...",
    id: "...",
    patientId: "",
    email: "...",
    phone: "...",
    location: "...",
    blood: "Unknown",
    height: "0 cm",
    weight: "0 kg"
  });
  const [, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [nowTick, setNowTick] = useState(() => new Date());
  const [prescriptions, setPrescriptions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [patientNotifications, setPatientNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [profileFieldErrors, setProfileFieldErrors] = useState({});

  // --- CHAT STATE ---
  const [chatContacts, setChatContacts] = useState([]);
  const [activeChatUser, setActiveChatUser] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [chatSearchTerm, setChatSearchTerm] = useState(""); // Added Search State
  const chatIntervalRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Fetch Data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        // Fetch User Basic Info
        const { data: userData } = await api.get('/auth/me');

        // Fetch Patient Specific Info (Health Stats)
        let patientData = {};
        try {
          const { data } = await api.get('/patient/profile');
          patientData = data;
        } catch {
          console.warn("Patient profile stats not found yet.");
        }

        setUser(prev => ({
          ...prev,
          name: userData.name,
          email: userData.email,
          id: userData._id,
          patientId: patientData._id || "",
          phone: patientData.phone || userData.phone || "Not Set",
          location: patientData.address || userData.location || "Not Set",
          gender: patientData.gender || "Not Set",
          blood: patientData.bloodGroup || "Unknown",
          height: patientData.height || "Unknown",
          weight: patientData.weight || "Unknown"
        }));

      } catch (error) {
        console.error("Failed to fetch profile", error);
        if (error.response && error.response.status === 401) {
          window.location.href = '/login';
        } else {
          setUser(prev => ({ ...prev, name: "Student User" }));
        }
      } finally {
        setLoading(false);
      }
    };

    const fetchAppointments = async () => {
      try {
        const [physicalAppointments, virtualConsultations] = await Promise.all([
          fetchMyAppointments(),
          fetchMyConsultations(),
        ]);
        setAppointments(mergeAppointmentTimeline(physicalAppointments, virtualConsultations));
      } catch (error) {
        console.error("Failed to fetch appointments", error);
      }
    };

    const fetchPrescriptions = async () => {
      try {
        const { data } = await api.get('/prescriptions/my');
        setPrescriptions(data);
      } catch (error) {
        console.error("Failed to fetch prescriptions", error);
      }
    };

    const fetchOrders = async () => {
      try {
        const { data } = await api.get('/orders/myorders');
        setOrders(data);
      } catch (error) {
        console.error("Failed to fetch orders", error);
      }
    };

    const fetchChatContacts = async () => {
      try {
        const { data } = await api.get('/chat/contacts');
        setChatContacts(data);
      } catch (error) {
        console.error("Failed to fetch chat contacts", error);
      }
    };

    const fetchNotifications = async () => {
      try {
        setNotificationsLoading(true);
        const data = await fetchPatientNotifications();
        setPatientNotifications(data);
      } catch (error) {
        console.error("Failed to fetch patient notifications", error);
      } finally {
        setNotificationsLoading(false);
      }
    };

    fetchProfile();
    fetchAppointments();
    fetchPrescriptions();
    fetchOrders();
    fetchChatContacts();
    fetchNotifications();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowTick(new Date()), 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  const getNotifIcon = (type) => {
    switch (type) {
      case 'APPOINTMENT_UPDATE':
        return { icon: <FiCalendar />, bg: '#EDE9FE', color: '#683B93' };
      case 'CONSULTATION_UPDATE':
        return { icon: <FiVideo />, bg: '#E0F2FE', color: '#0284C7' };
      case 'PRESCRIPTION_REQUEST':
        return { icon: <FiFileText />, bg: '#FEF3C7', color: '#D97706' };
      default:
        return { icon: <FiBell />, bg: '#F3E8FF', color: '#683B93' };
    }
  };

  const formatNotifTime = (dateString) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const unreadNotificationCount = patientNotifications.filter((notification) => !notification.isRead).length;

  const openPatientNotification = async (notification) => {
    try {
      if (!notification.isRead) {
        const updated = await markPatientNotificationRead(notification._id);
        setPatientNotifications((current) =>
          current.map((item) => (item._id === updated._id ? updated : item))
        );
      }
    } catch (error) {
      console.error("Failed to mark patient notification as read", error);
    } finally {
      setShowNotifDrop(false);
      setShowRightPanel(false);
      if (notification.link) {
        navigate(notification.link);
      }
    }
  };

  const handleMarkAllPatientNotificationsRead = async () => {
    try {
      await markAllPatientNotificationsRead();
      setPatientNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    } catch (error) {
      console.error("Failed to mark patient notifications as read", error);
      toast.error("Could not mark notifications as read.");
    }
  };

  // Poll for messages when chat is active
  useEffect(() => {
    if (activeChatUser) {
      fetchMessages(activeChatUser);
      chatIntervalRef.current = setInterval(() => {
        fetchMessages(activeChatUser);
      }, 3000); // Poll every 3 seconds
    } else {
      if (chatIntervalRef.current) clearInterval(chatIntervalRef.current);
    }
    return () => {
      if (chatIntervalRef.current) clearInterval(chatIntervalRef.current);
    };
  }, [activeChatUser]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const fetchMessages = async (userId) => {
    try {
      const { data } = await api.get(`/chat/${userId}`);
      setChatMessages(data);
    } catch (error) {
      console.error("Failed to fetch messages", error);
    }
  };



  const handleContactSelect = (contact) => {
    setActiveChatUser(contact._id);
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeChatUser) return;

    try {
      const { data } = await api.post('/chat', {
        recipientId: activeChatUser,
        content: messageInput
      });
      setChatMessages(prev => [...prev, data]);
      setMessageInput("");
    } catch (error) {
      console.error("Failed to send message", error);
    }
  };

  const handleUpdateProfile = async () => {
    const nextErrors = validateRequiredFields(
      {
        phone: user.phone === "Not Set" ? "" : user.phone,
        location: user.location === "Not Set" ? "" : user.location,
      },
      {
        phone: "Phone number",
        location: "Home address",
      }
    );

    setProfileFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      return;
    }

    try {
      // Prepare payload - only send what's editable/needed
      const payload = {
        phone: user.phone,
        address: user.location,
        weight: user.weight,
        height: user.height,
        bloodGroup: user.blood
      };

      await api.put('/patient/profile', payload);
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Failed to update profile", error);
      toast.error("Failed to update profile.");
    }
  };

  const handleLogout = () => {
    clearAuthSessionStorage();
    navigate('/login');
  };

  // --- SEARCH LOGIC ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(prev => !prev);
      }
      if (e.key === 'Escape' && showSearch) {
        setShowSearch(false);
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearch]);

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [showSearch]);

  const getSearchResults = () => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    const results = [];

    // Search Appointments
    appointments.forEach(apt => {
      const doctorName = apt.doctorName || '';
      const spec = apt.specialty || '';
      const date = apt.dateLabel || '';
      const text = `${doctorName} ${spec} ${apt.typeLabel || ''} ${apt.statusLabel || ''} ${date} ${apt.timeLabel || ''}`;
      if (text.toLowerCase().includes(q)) {
        results.push({
          type: 'appointment',
          title: `${apt.typeLabel || 'Visit'} - ${doctorName}`,
          sub: `${date} at ${apt.timeLabel || 'TBD'} • ${apt.statusLabel}`,
          action: () => { setActiveTab('appointment'); setShowSearch(false); setSearchQuery(''); }
        });
      }
    });

    // Search Prescriptions
    prescriptions.forEach(rx => {
      const doctorName = rx.doctor_id?.fullName || '';
      const meds = rx.medicines?.map(m => m.name).join(', ') || '';
      const text = `${rx.diagnosis || ''} ${doctorName} ${meds}`;
      if (text.toLowerCase().includes(q)) {
        results.push({
          type: 'prescription',
          title: rx.diagnosis || 'Prescription',
          sub: `By Dr. ${doctorName} • ${meds.substring(0, 40)}`,
          action: () => { setActiveTab('record'); setShowSearch(false); setSearchQuery(''); }
        });
      }
    });

    // Search Orders
    orders.forEach(order => {
      const itemNames = order.orderItems?.map(item => item.name).join(', ') || '';
      const total = formatCurrency(order.totalPrice || 0);
      const city = order.shippingAddress?.city || '';
      const text = `${order._id || ''} ${order.paymentStatus || ''} ${order.paymentMethod || ''} ${itemNames} ${city} ${total}`;
      if (text.toLowerCase().includes(q)) {
        results.push({
          type: 'order',
          title: `Order #${(order._id || '').slice(-8).toUpperCase()}`,
          sub: `${itemNames || 'Pharmacy order'} • ${total}`,
          action: () => { setActiveTab('orders'); setShowSearch(false); setSearchQuery(''); }
        });
      }
    });

    // Search Doctors (from appointments data)
    const seenDoctors = new Set();
    appointments.forEach(apt => {
      const doctorKey = `${apt.doctorName}-${apt.specialty}`;
      if (!apt.doctorName || seenDoctors.has(doctorKey)) return;
      const text = `${apt.doctorName || ''} ${apt.specialty || ''} ${apt.venueName || ''}`;
      if (text.toLowerCase().includes(q)) {
        seenDoctors.add(doctorKey);
        results.push({
          type: 'doctor',
          title: apt.doctorName,
          sub: `${apt.specialty || 'General'} ${apt.venueName ? '• ' + apt.venueName : ''}`,
          action: () => { setActiveTab('appointment'); setShowSearch(false); setSearchQuery(''); }
        });
      }
    });

    // Search Chat Contacts
    chatContacts.forEach(c => {
      const text = (c.name || '');
      if (text.toLowerCase().includes(q)) {
        results.push({
          type: 'contact',
          title: c.name,
          sub: 'Message conversation',
          action: () => {
            navigate(`/patient/messages?participant=${encodeURIComponent(c._id)}`);
            setShowSearch(false);
            setSearchQuery('');
          }
        });
      }
    });

    // Search Dashboard Sections
    const sections = [
      { name: 'Overview', tab: 'dashboard', keywords: 'overview dashboard home profile' },
      { name: 'Appointments', tab: 'appointment', keywords: 'appointments booking schedule visit' },
      { name: 'Medical Records', tab: 'record', keywords: 'records prescriptions ehr medical health' },
      { name: 'Orders', tab: 'orders', keywords: 'orders pharmacy purchases delivery checkout medicines' },
      { name: 'Messages', route: '/patient/messages', keywords: 'messages chat conversation talk' },
      { name: 'Settings', tab: 'settings', keywords: 'settings profile edit account password' },
      { name: 'Reminders', tab: 'reminders', keywords: 'reminders notifications alerts tasks' },
    ];
    sections.forEach(s => {
      if (s.keywords.includes(q) || s.name.toLowerCase().includes(q)) {
        results.push({
          type: 'section',
          title: s.name,
          sub: 'Dashboard section',
          action: () => {
            if (s.tab === 'reminders') { setShowRightPanel(true); }
            else if (s.route) { navigate(s.route); }
            else { setActiveTab(s.tab); }
            setShowSearch(false); setSearchQuery('');
          }
        });
      }
    });

    return results.slice(0, 12);
  };

  const searchResults = showSearch ? getSearchResults() : [];

  const getResultIcon = (type) => {
    switch (type) {
      case 'appointment': return <FiCalendar />;
      case 'prescription': return <FiFileText />;
      case 'order': return <FiShoppingBag />;
      case 'doctor': return <FiActivity />;
      case 'contact': return <FiMessageSquare />;
      case 'section': return <FiHome />;
      default: return <FiSearch />;
    }
  };

  const getResultCategory = (type) => {
    switch (type) {
      case 'appointment': return 'Appointments';
      case 'prescription': return 'Prescriptions';
      case 'order': return 'Orders';
      case 'doctor': return 'Doctors';
      case 'contact': return 'Contacts';
      case 'section': return 'Sections';
      default: return 'Results';
    }
  };

  // --- RENDERING VIEWS ---

  const renderDashboard = () => {
    const uniqueDrs = Array.from(
      new Map(
        appointments
          .filter((appointment) => appointment.doctorName)
          .map((appointment) => [
            `${appointment.doctorName}-${appointment.specialty}`,
            appointment,
          ])
      ).values()
    );

    return (
      <ProfileLayout>
        <LeftCol>
          <TopProfileCard>
            <HeroBanner />
            <ProfileContentInfo>
              <div className="avatar-wrapper"><img src={assets.avatar} alt={user.name} /></div>
              
              <h1>{user.name}</h1>
              <div className="location">📍 {user.location}</div>
              <div className="meta">
                <strong>{user.email}</strong> • <span style={{color: '#683B93', fontWeight: '600'}}><FiActivity style={{marginRight: '4px', verticalAlign: 'middle', marginTop: '-2px'}}/> Registered Patient at DocX</span> • {user.blood} Blood
              </div>
              
              <div className="actions">
                <button className="btn-msg" onClick={() => setActiveTab('settings')}>Edit Profile</button>
                <button className="btn-profile" onClick={() => setActiveTab('appointment')}>View Appointments</button>
              </div>
            </ProfileContentInfo>
          </TopProfileCard>

          <SectionCard>
            <h3>Medical Tags</h3>
            <ChipContainer>
              {[user.blood + ' Blood Group', `${user.weight} Weight`, `${user.height} Height`, 'No Allergies Recorded', 'Healthy Basics'].map((tag, i) => (
                 <Chip key={i}>{tag}</Chip>
              ))}
            </ChipContainer>
          </SectionCard>

          <SectionCard>
            <h3>Recent Appointments</h3>
            <HistoryList>
              {appointments.slice(0, 3).map((apt, i) => (
                <HistoryItem key={i}>
                  <div className="icon"><FiCheckSquare /></div>
                  <div className="content">
                    <h4>{apt.typeLabel}</h4>
                    <div className="subtitle">{apt.doctorName} • {apt.specialty || 'General'}</div>
                    <div className="date">{apt.dateLabel} • {apt.timeLabel}</div>
                    <p className="desc">Status: {apt.statusLabel}. {apt.source === 'virtual' ? 'Check the status page for payment and secure video access.' : 'Keep your receipt and queue number ready for the visit.'}</p>
                  </div>
                </HistoryItem>
              ))}
              {appointments.length === 0 && <p style={{color: '#6B7280', margin: 0}}>No recent appointments to display.</p>}
            </HistoryList>
          </SectionCard>

          <SectionCard>
            <h3>Recent Orders</h3>
            <HistoryList>
              {orders.slice(0, 3).map((order) => {
                const tone = getOrderTone(order);
                const itemNames = order.orderItems?.slice(0, 2).map((item) => item.name).join(', ') || 'Pharmacy order';
                return (
                  <HistoryItem key={order._id}>
                    <div className="icon"><FiShoppingBag /></div>
                    <div className="content">
                      <h4>Order #{order._id.slice(-8).toUpperCase()}</h4>
                      <div className="subtitle">
                        {itemNames}
                        {order.orderItems?.length > 2 ? ` +${order.orderItems.length - 2} more` : ''}
                      </div>
                      <div className="date">{formatDateTime(order.createdAt)} • {formatCurrency(order.totalPrice)}</div>
                      <p className="desc">
                        Status: <span style={{ color: tone.color, fontWeight: 700 }}>{tone.label}</span>
                        {order.shippingAddress?.city ? ` • Delivery to ${order.shippingAddress.city}` : ''}
                      </p>
                    </div>
                  </HistoryItem>
                );
              })}
              {orders.length === 0 && <p style={{color: '#6B7280', margin: 0}}>No pharmacy orders to display yet.</p>}
            </HistoryList>
          </SectionCard>
        </LeftCol>

        <RightCol>
          <SectionCard>
            <h3>My Care Team</h3>
            {uniqueDrs.length > 0 ? uniqueDrs.map((dr, i) => (
              <PersonItem key={i}>
                 <div className="avatar">
                    <img src={assets.doctor} className="main" alt={dr.doctorName} />
                    <div className="badge" style={{background: '#683B93', color: 'white'}}><FiActivity /></div>
                 </div>
                 <div className="info">
                    <h4>{dr.doctorName}</h4>
                    <p>{dr.specialty}</p>
                 </div>
                 <RightAction onClick={() => navigate(`/patient/messages?participant=${encodeURIComponent(dr.doctorUserId || "")}`)}>
                    Contact
                 </RightAction>
              </PersonItem>
            )) : (
              <p style={{color: '#6B7280', margin: 0, fontSize: '14px'}}>No doctors in your care team yet.</p>
            )}
          </SectionCard>
        </RightCol>
      </ProfileLayout>
    );
  };

  const [aptStatusFilter, setAptStatusFilter] = useState('all');
  const [aptTypeFilter, setAptTypeFilter] = useState('all');

  const renderAppointments = () => {
    // Filter
    const filtered = appointments.filter(apt => {
      if (aptStatusFilter !== 'all') {
        const normalizedStatus = apt.status?.toLowerCase() || '';
        if (aptStatusFilter === 'pending') {
          if (!['requested', 'pending', 'meeting_pending', 'awaiting_approval'].includes(normalizedStatus)) return false;
        } else if (aptStatusFilter === 'confirmed') {
          if (!['confirmed', 'scheduled'].includes(normalizedStatus)) return false;
        } else if (aptStatusFilter === 'completed') {
          if (!['completed'].includes(normalizedStatus)) return false;
        } else if (aptStatusFilter === 'cancelled') {
          if (!['cancelled', 'rejected', 'expired'].includes(normalizedStatus)) return false;
        }
      }
      if (aptTypeFilter !== 'all') {
        if (aptTypeFilter === 'physical' && apt.source !== 'physical') return false;
        if (aptTypeFilter === 'virtual' && apt.source !== 'virtual') return false;
      }
      return true;
    });

    // Sort newest first
    const sorted = [...filtered].sort((a, b) => (b.sortDate || 0) - (a.sortDate || 0));

    // Group by date label
    const groups = [];
    const dateMap = new Map();
    sorted.forEach(apt => {
      const key = apt.dateLabel || 'Date pending';
      if (!dateMap.has(key)) {
        dateMap.set(key, []);
        groups.push(key);
      }
      dateMap.get(key).push(apt);
    });

    const statusBtnStyle = (value) => ({
      padding: '7px 16px',
      borderRadius: '999px',
      border: `1.5px solid ${aptStatusFilter === value ? '#683B93' : '#E5E7EB'}`,
      background: aptStatusFilter === value ? '#683B93' : '#fff',
      color: aptStatusFilter === value ? '#fff' : '#4B5563',
      fontSize: '13px',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.15s',
    });

    const typeBtnStyle = (value) => ({
      padding: '7px 16px',
      borderRadius: '999px',
      border: `1.5px solid ${aptTypeFilter === value ? '#683B93' : '#E5E7EB'}`,
      background: aptTypeFilter === value ? '#F3E8FF' : '#fff',
      color: aptTypeFilter === value ? '#683B93' : '#6B7280',
      fontSize: '13px',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.15s',
    });

    const getStatusColor = (status) => {
      const s = (status || '').toLowerCase();
      if (['confirmed', 'scheduled', 'completed'].includes(s))
        return { bg: '#ECFDF5', color: '#059669' };
      if (['requested', 'pending', 'meeting_pending', 'awaiting_approval'].includes(s))
        return { bg: '#FFF7ED', color: '#D97706' };
      if (['cancelled', 'rejected', 'expired'].includes(s))
        return { bg: '#FEF2F2', color: '#DC2626' };
      return { bg: '#F3F4F6', color: '#6B7280' };
    };

    return (
      <div style={{ padding: '0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ margin: 0, color: '#111827', fontSize: '22px', fontWeight: 700 }}>My Appointments</h2>
          <span style={{ fontSize: '13px', color: '#9CA3AF', fontWeight: 600 }}>
            {sorted.length} of {appointments.length} shown
          </span>
        </div>

        {/* Filters */}
        <div style={{ background: '#fff', borderRadius: '14px', padding: '16px 18px', border: '1px solid #F3F4F6', marginBottom: '20px', display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '4px' }}>Status</span>
            <button type="button" style={statusBtnStyle('all')} onClick={() => setAptStatusFilter('all')}>All</button>
            <button type="button" style={statusBtnStyle('pending')} onClick={() => setAptStatusFilter('pending')}>Pending</button>
            <button type="button" style={statusBtnStyle('confirmed')} onClick={() => setAptStatusFilter('confirmed')}>Confirmed</button>
            <button type="button" style={statusBtnStyle('completed')} onClick={() => setAptStatusFilter('completed')}>Completed</button>
            <button type="button" style={statusBtnStyle('cancelled')} onClick={() => setAptStatusFilter('cancelled')}>Cancelled</button>
          </div>
          <div style={{ width: '1px', height: '28px', background: '#E5E7EB' }} />
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '4px' }}>Type</span>
            <button type="button" style={typeBtnStyle('all')} onClick={() => setAptTypeFilter('all')}>All</button>
            <button type="button" style={typeBtnStyle('physical')} onClick={() => setAptTypeFilter('physical')}>
              <FiCalendar style={{ marginRight: '5px', verticalAlign: 'middle', fontSize: '13px' }} />Physical
            </button>
            <button type="button" style={typeBtnStyle('virtual')} onClick={() => setAptTypeFilter('virtual')}>
              <FiVideo style={{ marginRight: '5px', verticalAlign: 'middle', fontSize: '13px' }} />Virtual
            </button>
          </div>
        </div>

        {/* Appointment List */}
        {sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', background: 'white', borderRadius: '16px', border: '1px solid #F3F4F6' }}>
            <FiCalendar style={{ fontSize: '36px', color: '#D1D5DB', marginBottom: '12px' }} />
            <h3 style={{ color: '#374151', fontSize: '16px', fontWeight: 600, margin: '0 0 6px' }}>
              {appointments.length === 0 ? 'No appointments yet' : 'No appointments match these filters'}
            </h3>
            <p style={{ color: '#9CA3AF', fontSize: '14px', margin: 0 }}>
              {appointments.length === 0
                ? 'Book your first consultation to get started.'
                : 'Try adjusting the status or type filters above.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '24px' }}>
            {groups.map(dateLabel => (
              <div key={dateLabel}>
                {/* Date Group Header */}
                <div style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#9CA3AF',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '10px',
                  paddingLeft: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <FiCalendar style={{ fontSize: '13px' }} />
                  {dateLabel}
                  <span style={{ fontSize: '11px', color: '#D1D5DB', fontWeight: 600 }}>
                    ({dateMap.get(dateLabel).length})
                  </span>
                </div>

                <div style={{ display: 'grid', gap: '10px' }}>
                  {dateMap.get(dateLabel).map(apt => {
                    const meetingState = getVirtualMeetingState(apt, nowTick);
                    const statusColor = getStatusColor(apt.status);

                    return (
                      <div
                        key={apt.id}
                        style={{
                          background: '#fff',
                          borderRadius: '14px',
                          border: '1px solid #F3F4F6',
                          padding: '16px 18px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          cursor: 'pointer',
                          transition: 'box-shadow 0.15s, border-color 0.15s',
                        }}
                        onClick={() => navigate(apt.actionUrl)}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#D8B4FE'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(104,59,147,0.08)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#F3F4F6'; e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        {/* Type Icon */}
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '12px',
                          background: apt.source === 'virtual' ? '#EDE9FE' : '#F0FDF4',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          {apt.source === 'virtual'
                            ? <FiVideo style={{ color: '#7C3AED', fontSize: '18px' }} />
                            : <FiCalendar style={{ color: '#16A34A', fontSize: '18px' }} />}
                        </div>

                        {/* Main Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>
                              {apt.doctorName}
                            </span>
                            <span style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: 500 }}>
                              {apt.specialty}
                            </span>
                          </div>
                          <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span>{apt.timeLabel}</span>
                            <span style={{ color: '#D1D5DB' }}>·</span>
                            <span>{apt.typeLabel}</span>
                            {apt.source === 'physical' && apt.queueNumber && (
                              <>
                                <span style={{ color: '#D1D5DB' }}>·</span>
                                <span>Queue #{apt.queueNumber}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '999px',
                          background: statusColor.bg,
                          color: statusColor.color,
                          fontSize: '11px',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}>
                          {apt.statusLabel}
                        </span>

                        {/* Quick Actions */}
                        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                          {apt.source === 'virtual' && apt.paymentStatus === 'paid' && !meetingState.disabled && (
                            <button
                              type="button"
                              style={{
                                background: '#683B93',
                                color: '#fff',
                                padding: '7px 14px',
                                borderRadius: '8px',
                                border: 'none',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                              onClick={(e) => { e.stopPropagation(); navigate(apt.joinPath); }}
                            >
                              Join
                            </button>
                          )}
                          {apt.canPay && (
                            <button
                              type="button"
                              style={{
                                background: '#F3E8FF',
                                color: '#683B93',
                                padding: '7px 14px',
                                borderRadius: '8px',
                                border: '1px solid #E9D5FF',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                              onClick={(e) => { e.stopPropagation(); navigate(apt.actionUrl); }}
                            >
                              Pay now
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderRecords = () => (
    <div style={{ padding: '0px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
        <h2 style={{ color: '#2B3674', margin: 0 }}>Medical Records</h2>
        <button
          type="button"
          style={{ background: '#683B93', color: 'white', padding: '10px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '700' }}
          onClick={() => navigate('/patient/lab-reports')}
        >
          Upload files
        </button>
      </div>
      {user.patientId ? (
        <div style={{ display: 'grid', gap: '18px' }}>
          <PatientMedicationManager patientId={user.patientId} canEdit />
          <PatientMedicalTimeline patientId={user.patientId} showFilters />
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '8px' }}>
          <FiFileText style={{ fontSize: '40px', color: '#A3AED0', marginBottom: '10px' }} />
          <h3 style={{ color: '#2B3674' }}>No patient profile found</h3>
          <p style={{ color: '#A3AED0' }}>Complete your patient profile to view medical records.</p>
        </div>
      )}
    </div>
  );

  const renderOrders = () => (
    <div style={{ padding: '0px 0' }}>
      <h2 style={{ color: '#2B3674', marginBottom: '20px' }}>Order History</h2>
      {orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '20px' }}>
          <FiShoppingBag style={{ fontSize: '40px', color: '#A3AED0', marginBottom: '10px' }} />
          <h3 style={{ color: '#2B3674' }}>No orders found</h3>
          <p style={{ color: '#A3AED0' }}>Your pharmacy purchases will appear here once you place an order.</p>
          <button
            style={{ marginTop: '15px', background: '#683B93', color: 'white', padding: '10px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}
            onClick={() => navigate('/pharmacy')}
          >
            Go to Pharmacy
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {orders.map((order) => {
            const tone = getOrderTone(order);

            return (
              <Card key={order._id}>
                <CardHeader>
                  <div>
                    <h3 style={{ marginBottom: '6px' }}>Order #{order._id.slice(-8).toUpperCase()}</h3>
                    <p style={{ margin: 0, color: '#A3AED0', fontSize: '13px' }}>{formatDateTime(order.createdAt)}</p>
                  </div>
                  <span style={{
                    padding: '8px 12px',
                    borderRadius: '999px',
                    background: tone.background,
                    color: tone.color,
                    fontSize: '12px',
                    fontWeight: '700'
                  }}>
                    {tone.label}
                  </span>
                </CardHeader>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px', marginBottom: '18px' }}>
                  <div style={{ background: '#F9FAFC', borderRadius: '14px', padding: '14px' }}>
                    <div style={{ fontSize: '11px', color: '#A3AED0', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>Items</div>
                    <div style={{ color: '#2B3674', fontWeight: '700' }}>{order.orderItems?.length || 0}</div>
                  </div>
                  <div style={{ background: '#F9FAFC', borderRadius: '14px', padding: '14px' }}>
                    <div style={{ fontSize: '11px', color: '#A3AED0', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>Total</div>
                    <div style={{ color: '#2B3674', fontWeight: '700' }}>{formatCurrency(order.totalPrice)}</div>
                  </div>
                  <div style={{ background: '#F9FAFC', borderRadius: '14px', padding: '14px' }}>
                    <div style={{ fontSize: '11px', color: '#A3AED0', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>Payment</div>
                    <div style={{ color: '#2B3674', fontWeight: '700' }}>{getPaymentMethodLabel(order.paymentProvider, order.paymentMethod)}</div>
                  </div>
                  <div style={{ background: '#F9FAFC', borderRadius: '14px', padding: '14px' }}>
                    <div style={{ fontSize: '11px', color: '#A3AED0', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>Delivery city</div>
                    <div style={{ color: '#2B3674', fontWeight: '700' }}>{order.shippingAddress?.city || 'Pending'}</div>
                  </div>
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <h4 style={{ fontSize: '14px', color: '#683B93', marginBottom: '10px' }}>Order items</h4>
                  <div style={{ background: '#F9FAFC', padding: '15px', borderRadius: '10px' }}>
                    {order.orderItems?.map((item, idx) => (
                      <div key={`${order._id}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: idx === order.orderItems.length - 1 ? '0' : '8px', fontSize: '14px' }}>
                        <strong style={{ color: '#2B3674' }}>{item.name}</strong>
                        <span style={{ color: '#A3AED0' }}>Qty {item.qty} • {formatCurrency(item.price * item.qty)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <p style={{ margin: 0, color: '#6B7280', fontSize: '14px' }}>
                    {order.shippingAddress?.addressLine1 || 'Shipping address pending'}
                  </p>
                  <button
                    style={{ background: '#683B93', color: 'white', padding: '10px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                    onClick={() => navigate(`/orders/${order._id}`)}
                  >
                    View Details
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );


  // Filter Contacts
  const filteredContacts = chatContacts.filter(c =>
    (c.name || '').toLowerCase().includes((chatSearchTerm || '').toLowerCase())
  );

  const renderChat = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ChatContainer>
        {/* Sidebar */}
        <ChatSidebar>
          <ChatHeader>
            <h3>Messages</h3>
            <span>Realtime (connecting)</span>
          </ChatHeader>
          <ChatSearch>
            <FiSearch />
            <input
              placeholder="Search..."
              value={chatSearchTerm}
              onChange={(e) => setChatSearchTerm(e.target.value)}
            />
          </ChatSearch>
          <BlockedUsersBtn>Blocked Users (0)</BlockedUsersBtn>
          
          <ContactList>
            {filteredContacts.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '10px 0', color: '#111827', fontSize: '15px', fontWeight: '500' }}>
                <FiMessageSquare />
                <span>No conversations yet.</span>
              </div>
            ) : (
              filteredContacts.map(contact => (
                <ContactItem
                  key={contact._id}
                  $active={activeChatUser === contact._id}
                  onClick={() => handleContactSelect(contact)}
                >
                  <img src={assets.doctor} alt="Dr" />
                  <div>
                    <h4>{contact.name || 'Doctor'}</h4>
                    <p>{contact.specialization || 'General'}</p>
                  </div>
                </ContactItem>
              ))
            )}
          </ContactList>
        </ChatSidebar>

        {/* Chat Area */}
        <ChatArea>
          {activeChatUser ? (
            <>
              {/* Active Chat Header */}
              <div style={{ padding: '15px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <img src={assets.doctor} alt="Dr" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                <div>
                  <h4 style={{ margin: 0, color: '#2B3674' }}>
                    {chatContacts.find(c => c._id === activeChatUser)?.name || 'Doctor'}
                  </h4>
                  <span style={{ fontSize: '12px', color: '#22C55E', display: 'flex', alignItems: 'center', gap: '5px' }}>● Online</span>
                </div>
              </div>

              {/* Messages */}
              <MessageList>
                {chatMessages.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#A3AED0', marginTop: '20px' }}>No messages yet. Say hello!</p>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <MessageBubble key={idx} $isMine={(msg.sender?._id || msg.sender) === user.id}>
                      {msg.content}
                    </MessageBubble>
                  ))
                )}
                <div ref={messagesEndRef} />
              </MessageList>

              {/* Input */}
              <ChatInputArea>
                <div className="icon-btn"><FiSmile /></div>
                <div className="icon-btn"><FiPaperclip /></div>
                <input
                  placeholder="Type your message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button className="send-btn" onClick={handleSendMessage}>
                  Send <FiSend style={{ marginLeft: '5px' }} />
                </button>
              </ChatInputArea>
            </>
          ) : (
            <EmptyChatState>
              <h2>Select a conversation</h2>
              <p>Search for a doctor or choose a conversation.</p>
            </EmptyChatState>
          )}
        </ChatArea>
      </ChatContainer>
    </div>
  );

  const renderSettings = () => (
    <div style={{ padding: '0px 0', maxWidth: '600px' }}>
      <h2 style={{ color: '#2B3674', marginBottom: '30px' }}>Profile Settings</h2>
      <Card>
        <FormGroup>
          <label>Full Name</label>
          <input type="text" defaultValue={user.name} disabled title="Contact support to change name" style={{ background: '#f5f5f5' }} />
        </FormGroup>
        <FormGroup>
          <label>Email Address</label>
          <input type="email" defaultValue={user.email} disabled title="Contact support to change email" style={{ background: '#f5f5f5' }} />
        </FormGroup>
        <FormGroup>
          <label>Phone Number</label>
          <input
            type="text"
            value={user.phone}
            onChange={(e) => {
              setUser({ ...user, phone: e.target.value });
              clearFieldError(setProfileFieldErrors, "phone");
            }}
            aria-invalid={Boolean(profileFieldErrors.phone)}
          />
          <FieldError message={profileFieldErrors.phone} />
        </FormGroup>
        <FormGroup>
          <label>Home Address</label>
          <input
            type="text"
            value={user.location}
            onChange={(e) => {
              setUser({ ...user, location: e.target.value });
              clearFieldError(setProfileFieldErrors, "location");
            }}
            aria-invalid={Boolean(profileFieldErrors.location)}
          />
          <FieldError message={profileFieldErrors.location} />
        </FormGroup>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <FormGroup>
            <label>Weight (kg)</label>
            <input type="text" value={user.weight} onChange={(e) => setUser({ ...user, weight: e.target.value })} />
          </FormGroup>
          <FormGroup>
            <label>Height (cm)</label>
            <input type="text" value={user.height} onChange={(e) => setUser({ ...user, height: e.target.value })} />
          </FormGroup>
        </div>
        <FormGroup>
          <label>Blood Group</label>
          <select
            value={user.blood}
            onChange={(e) => setUser({ ...user, blood: e.target.value })}
            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #E0E5F2' }}
          >
            <option value="Unknown">Unknown</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </select>
        </FormGroup>
        <SaveBtn onClick={handleUpdateProfile}>Update Profile</SaveBtn>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'appointment': return renderAppointments();
      case 'record': return renderRecords();
      case 'orders': return renderOrders();
      case 'chat': return renderChat();
      case 'settings': return renderSettings();
      default: return renderDashboard();
    }
  };

  return (
    <DashboardContainer>
      {/* 1. TOP NAV */}
      <TopNavContainer>
        <NavLeft>
          <LogoBox type="button" onClick={() => navigate('/')} aria-label="Go to homepage" title="Go to homepage">
            <FiActivity size={20} />
          </LogoBox>
          <NavList>
            <NavItem $active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')}>Overview</NavItem>
            <NavItem $active={activeTab === 'appointment'} onClick={() => setActiveTab('appointment')}>Appointments</NavItem>
            <NavItem $active={activeTab === 'record'} onClick={() => setActiveTab('record')}>Records</NavItem>
            <NavItem $active={activeTab === 'orders'} onClick={() => setActiveTab('orders')}>Orders</NavItem>
            <NavItem onClick={() => navigate('/patient/messages')}>Messages</NavItem>
            <NavItem onClick={() => setShowRightPanel(true)}>Reminders</NavItem>
            <NavItem $active={activeTab === 'settings'} onClick={() => setActiveTab('settings')}>Settings</NavItem>
          </NavList>
        </NavLeft>

        <NavRight>
          <IconButton onClick={() => { setShowSearch(true); setSearchQuery(''); }} title="Search (⌘K)">
            <FiSearch />
          </IconButton>
          <IconButton
            ref={notifBellRef}
            onClick={() => setShowNotifDrop((v) => !v)}
            style={{ position: 'relative' }}
          >
            <FiBell />
            {unreadNotificationCount > 0 ? <span className="badge">{unreadNotificationCount}</span> : null}

            {/* NOTIFICATION DROPDOWN */}
            {showNotifDrop && (
              <>
                <NotifDropBackdrop onClick={(e) => { e.stopPropagation(); setShowNotifDrop(false); }} />
                <NotifDropdown onClick={(e) => e.stopPropagation()}>
                  <NotifHeader>
                    <h3>Notifications{unreadNotificationCount > 0 ? ` (${unreadNotificationCount})` : ''}</h3>
                    {unreadNotificationCount > 0 && (
                      <MarkAllBtn
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAllPatientNotificationsRead();
                        }}
                      >
                        Mark all read
                      </MarkAllBtn>
                    )}
                  </NotifHeader>

                  <NotifBody>
                    {notificationsLoading ? (
                      <NotifEmpty>
                        <FiBell />
                        <p>Loading notifications…</p>
                      </NotifEmpty>
                    ) : patientNotifications.length === 0 ? (
                      <NotifEmpty>
                        <FiBell />
                        <p>No notifications yet</p>
                      </NotifEmpty>
                    ) : (
                      patientNotifications.map((notification) => {
                        const iconProps = getNotifIcon(notification.type);
                        return (
                          <NotifItem
                            key={notification._id}
                            $unread={!notification.isRead}
                            onClick={() => openPatientNotification(notification)}
                          >
                            <NotifDot $bg={iconProps.bg} $color={iconProps.color}>
                              {iconProps.icon}
                            </NotifDot>
                            <NotifContent>
                              <p className="notif-title">{notification.title}</p>
                              <p className="notif-msg">{notification.message}</p>
                              {notification.createdAt && (
                                <div className="notif-time">{formatNotifTime(notification.createdAt)}</div>
                              )}
                            </NotifContent>
                            <NotifBadgeLabel $unread={!notification.isRead}>
                              {notification.isRead ? 'Read' : 'New'}
                            </NotifBadgeLabel>
                          </NotifItem>
                        );
                      })
                    )}
                  </NotifBody>

                  {patientNotifications.length > 0 && (
                    <NotifFooter>
                      <button type="button" onClick={() => { setShowNotifDrop(false); setShowRightPanel(true); }}>
                        View all & reminders
                      </button>
                    </NotifFooter>
                  )}
                </NotifDropdown>
              </>
            )}
          </IconButton>
          <TopProfile onClick={() => setActiveTab('settings')}>
            <img src={assets.avatar} alt="User" />
            <div className="info">
              <h4>{user.name.split(' ')[0]}</h4>
              <p>Patient</p>
            </div>
          </TopProfile>
          <IconButton onClick={handleLogout} title="Logout">
            <FiLogOut />
          </IconButton>
        </NavRight>
      </TopNavContainer>

      {/* 2. MAIN CONTENT */}
      <MainContent>
        {renderContent()}
      </MainContent>

      {/* 3. MODAL OVERLAY (Reminders) */}
      <ModalBackdrop $isOpen={showRightPanel} onClick={() => setShowRightPanel(false)}>
        <ModalContainer $isOpen={showRightPanel} onClick={(e) => e.stopPropagation()}>
          <RightHeader>
            <h3>Reminders</h3>
            <FiX className="close-btn" size={22} onClick={() => setShowRightPanel(false)} title="Close" />
          </RightHeader>

          <TaskList>
            <PanelSectionTitle>Upcoming appointments</PanelSectionTitle>
            {appointments.length > 0 ? appointments.map(apt => (
              <TaskItem key={apt.id} onClick={() => { setActiveTab('appointment'); setShowRightPanel(false); }}>
                <div className="icon"><FiCalendar /></div>
                <div className="content">
                  <h5>{apt.typeLabel}</h5>
                  <p>{apt.dateLabel} - {apt.timeLabel}</p>
                </div>
                <div className="action">View</div>
              </TaskItem>
            )) : (
              <TaskItem>
                <div className="icon"><FiCalendar /></div>
                <div className="content">
                  <h5>No upcoming appointments</h5>
                  <p>Your schedule is clear.</p>
                </div>
              </TaskItem>
            )}

            {prescriptions.length > 0 && (
              <>
                <PanelSectionTitle>Prescriptions</PanelSectionTitle>
                <TaskItem onClick={() => { setActiveTab('record'); setShowRightPanel(false); }}>
                  <div className="icon" style={{ color: '#F59E0B' }}><BiPlusMedical /></div>
                  <div className="content">
                    <h5>Refill Meds</h5>
                    <p>Check your active prescriptions</p>
                  </div>
                  <div className="action">View</div>
                </TaskItem>
              </>
            )}
          </TaskList>
        </ModalContainer>
      </ModalBackdrop>

      {/* 4. SEARCH OVERLAY */}
      {showSearch && (
        <SearchOverlay onClick={() => { setShowSearch(false); setSearchQuery(''); }}>
          <SearchModal onClick={(e) => e.stopPropagation()}>
            <SearchInputBar>
              <FiSearch />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search doctors, appointments, records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="kbd">ESC</span>
            </SearchInputBar>

            <SearchResults>
              {searchQuery.trim() === '' ? (
                <SearchEmpty>
                  <FiSearch />
                  <p>Start typing to search across your dashboard</p>
                </SearchEmpty>
              ) : searchResults.length === 0 ? (
                <SearchEmpty>
                  <FiSearch />
                  <p>No results found for &quot;{searchQuery}&quot;</p>
                </SearchEmpty>
              ) : (
                (() => {
                  const grouped = {};
                  searchResults.forEach(r => {
                    const cat = getResultCategory(r.type);
                    if (!grouped[cat]) grouped[cat] = [];
                    grouped[cat].push(r);
                  });
                  return Object.entries(grouped).map(([category, items]) => (
                    <div key={category}>
                      <SearchCategory>{category}</SearchCategory>
                      {items.map((item, idx) => (
                        <SearchResultItem key={idx} onClick={item.action}>
                          <div className="sr-icon">{getResultIcon(item.type)}</div>
                          <div className="sr-info">
                            <h4>{item.title}</h4>
                            <p>{item.sub}</p>
                          </div>
                          <span className="sr-action">Go →</span>
                        </SearchResultItem>
                      ))}
                    </div>
                  ));
                })()
              )}
            </SearchResults>

            {searchQuery.trim() === '' && (
              <SearchQuickLinks>
                <QuickLink onClick={() => { setActiveTab('appointment'); setShowSearch(false); }}>
                  <FiCalendar size={14} /> Appointments
                </QuickLink>
                <QuickLink onClick={() => { setActiveTab('record'); setShowSearch(false); }}>
                  <FiFileText size={14} /> Records
                </QuickLink>
                <QuickLink onClick={() => { setActiveTab('orders'); setShowSearch(false); }}>
                  <FiShoppingBag size={14} /> Orders
                </QuickLink>
                <QuickLink onClick={() => { navigate('/patient/messages'); setShowSearch(false); }}>
                  <FiMessageSquare size={14} /> Messages
                </QuickLink>
                <QuickLink onClick={() => { setActiveTab('settings'); setShowSearch(false); }}>
                  <FiSettings size={14} /> Settings
                </QuickLink>
              </SearchQuickLinks>
            )}
          </SearchModal>
        </SearchOverlay>
      )}

    </DashboardContainer>
  );
};

export default PatientProfile;
