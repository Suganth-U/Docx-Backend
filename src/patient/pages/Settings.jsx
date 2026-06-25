import React, { useState } from "react";
import styled from "styled-components";
import { Navigationbar } from "@/shared/components/layout/NavigationBar/Navigationbar";
import { FaUserCog, FaLock, FaBell, FaShieldAlt, FaToggleOn, FaToggleOff, FaSave } from "react-icons/fa";

const PageContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  background-color: #f8f9fa;
  padding-bottom: 50px;
`;

const ContentWrapper = styled.div`
  max-width: var(--page-max-width);
  margin: 0 auto;
  padding: 100px var(--page-padding-x) 20px;
  display: flex;
  gap: 40px;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const Sidebar = styled.div`
  width: 250px;
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.05);

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  li {
    padding: 12px 15px;
    margin-bottom: 5px;
    cursor: pointer;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 12px;
    color: #555;
    font-weight: 500;
    transition: all 0.2s;

    &:hover {
      background: #f0f7ff;
      color: #297fb9;
    }

    &.active {
      background: #297fb9;
      color: white;
    }
  }
`;

const SettingsPanel = styled.div`
  flex: 1;
  background: white;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.05);

  h2 {
    font-size: 24px;
    color: #333;
    margin-bottom: 30px;
    border-bottom: 1px solid #eee;
    padding-bottom: 15px;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 25px;

  label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: #333;
  }

  input {
    width: 100%;
    padding: 12px 15px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 14px;
    transition: border-color 0.2s;

    &:focus {
      border-color: #297fb9;
      outline: none;
    }
  }
`;

const ToggleRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #f9f9f9;

  div {
    strong { display: block; margin-bottom: 5px; color: #333; }
    p { margin: 0; font-size: 13px; color: #888; }
  }

  .toggle {
    font-size: 35px;
    cursor: pointer;
    color: #ddd;
    
    &.on {
      color: #297fb9;
    }
  }
`;

const SaveButton = styled.button`
  background: #297fb9;
  color: white;
  border: none;
  padding: 12px 30px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
  transition: background 0.2s;

  &:hover {
    background: #1f6a9c;
  }
`;

const Settings = () => {
    const [activeTab, setActiveTab] = useState('account');
    const [notifications, setNotifications] = useState(true);
    const [twoFactor, setTwoFactor] = useState(false);

    return (
        <PageContainer>
            <Navigationbar />
            <ContentWrapper>
                <Sidebar>
                    <ul>
                        <li className={activeTab === 'account' ? 'active' : ''} onClick={() => setActiveTab('account')}>
                            <FaUserCog /> Account Settings
                        </li>
                        <li className={activeTab === 'security' ? 'active' : ''} onClick={() => setActiveTab('security')}>
                            <FaLock /> Security
                        </li>
                        <li className={activeTab === 'notifications' ? 'active' : ''} onClick={() => setActiveTab('notifications')}>
                            <FaBell /> Notifications
                        </li>
                        <li className={activeTab === 'privacy' ? 'active' : ''} onClick={() => setActiveTab('privacy')}>
                            <FaShieldAlt /> Privacy
                        </li>
                    </ul>
                </Sidebar>

                <SettingsPanel>
                    {activeTab === 'account' && (
                        <>
                            <h2>Account Settings</h2>
                            <FormGroup>
                                <label>Full Name</label>
                                <input type="text" defaultValue="Alex Johnson" />
                            </FormGroup>
                            <FormGroup>
                                <label>Email Address</label>
                                <input type="email" defaultValue="alex.johnson@example.com" />
                            </FormGroup>
                            <FormGroup>
                                <label>Phone Number</label>
                                <input type="text" defaultValue="+1 (555) 123-4567" />
                            </FormGroup>
                            <SaveButton><FaSave /> Save Changes</SaveButton>
                        </>
                    )}

                    {activeTab === 'notifications' && (
                        <>
                            <h2>Notification Preferences</h2>
                            <ToggleRow>
                                <div>
                                    <strong>Email Notifications</strong>
                                    <p>Receive updates about appointments and reports.</p>
                                </div>
                                <div onClick={() => setNotifications(!notifications)} className={`toggle ${notifications ? 'on' : ''}`}>
                                    {notifications ? <FaToggleOn /> : <FaToggleOff />}
                                </div>
                            </ToggleRow>
                            <ToggleRow>
                                <div>
                                    <strong>SMS Alerts</strong>
                                    <p>Get text messages for urgent reminders.</p>
                                </div>
                                <div className="toggle on"><FaToggleOn /></div>
                            </ToggleRow>
                        </>
                    )}

                    {activeTab === 'security' && (
                        <>
                            <h2>Security Settings</h2>
                            <FormGroup>
                                <label>Current Password</label>
                                <input type="password" />
                            </FormGroup>
                            <FormGroup>
                                <label>New Password</label>
                                <input type="password" />
                            </FormGroup>
                            <ToggleRow>
                                <div>
                                    <strong>Two-Factor Authentication</strong>
                                    <p>Enable an extra layer of security.</p>
                                </div>
                                <div onClick={() => setTwoFactor(!twoFactor)} className={`toggle ${twoFactor ? 'on' : ''}`}>
                                    {twoFactor ? <FaToggleOn /> : <FaToggleOff />}
                                </div>
                            </ToggleRow>
                            <SaveButton><FaSave /> Update Security</SaveButton>
                        </>
                    )}
                </SettingsPanel>
            </ContentWrapper>
        </PageContainer>
    );
};

export default Settings;
