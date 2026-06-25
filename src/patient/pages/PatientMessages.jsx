import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { FiActivity, FiSearch, FiBell, FiLogOut } from "react-icons/fi";
import MessagingInbox from "@/shared/features/Messaging/MessagingInbox";
import { clearAuthSessionStorage, getStoredAuthSession } from "@/shared/lib/authSession";

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
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
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
const IconButton = styled.div` color: #6B7280; font-size: 20px; cursor: pointer; display: flex; &:hover { color: #111827; } `;
const TopProfile = styled.div`
  display: flex; align-items: center; gap: 12px; cursor: pointer; padding-left: 20px; border-left: 1px solid #E5E7EB;
  .avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; background: #683B93; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; }
  .info { display: flex; flex-direction: column; @media (max-width: 768px) { display: none; } }
  h4 { margin: 0; font-size: 14px; font-weight: 600; color: #111827; text-transform: capitalize; }
  p { margin: 0; font-size: 12px; color: #6B7280; }
`;

const PatientMessages = () => {
  const navigate = useNavigate();
  const user = useMemo(() => {
    return getStoredAuthSession();
  }, []);

  const handleLogout = () => {
    clearAuthSessionStorage();
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const navToProfile = () => navigate('/patient/profile');

  return (
    <>
      <TopNavContainer>
        <NavLeft>
          <LogoBox type="button" onClick={() => navigate('/')} aria-label="Go to homepage" title="Go to homepage">
            <FiActivity size={20} />
          </LogoBox>
          <NavList>
            <NavItem onClick={navToProfile}>Overview</NavItem>
            <NavItem onClick={navToProfile}>Appointments</NavItem>
            <NavItem onClick={navToProfile}>Records</NavItem>
            <NavItem onClick={navToProfile}>Orders</NavItem>
            <NavItem $active>Messages</NavItem>
            <NavItem onClick={navToProfile}>Reminders</NavItem>
            <NavItem onClick={navToProfile}>Settings</NavItem>
          </NavList>
        </NavLeft>

        <NavRight>
          <IconButton onClick={navToProfile}>
            <FiSearch />
          </IconButton>
          <IconButton onClick={navToProfile}>
            <FiBell />
          </IconButton>
          <TopProfile onClick={navToProfile}>
            <div className="avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="info">
              <h4>{user?.name ? user.name.split(' ')[0] : 'User'}</h4>
              <p>Patient</p>
            </div>
          </TopProfile>
          <IconButton onClick={handleLogout} title="Logout">
            <FiLogOut />
          </IconButton>
        </NavRight>
      </TopNavContainer>

      <MessagingInbox
        viewerRole="patient"
        title="Your care conversations, kept clear and easy to continue."
        description="Talk to your doctors in one reliable inbox with faster search, unread tracking, and live updates when the care team replies."
      />
    </>
  );
};

export default PatientMessages;
