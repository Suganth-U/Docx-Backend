import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Trash2, ShieldAlert, User, Mail, Phone, Lock, Building, Briefcase, MapPin, UserCircle, Key } from 'lucide-react';
import { assets } from "@/shared/lib/assets";
import useAxiosPrivate from "@/shared/hooks/useAxiosPrivate";
import FieldError from "@/shared/components/common/FieldError";
import { clearFieldError, validateRequiredFields } from "@/shared/lib/formValidation";
import "@/admin/Profile/Profile.css";

const AdminProfile = () => {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState("personal"); // personal, security, company
  
  // separate loading states for the two save buttons
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Form Data
  const [personalData, setPersonalData] = useState({
    name: "",
    username: "",
    bio: "",
    phone: "",
    address: "",
    dob: ""
  });

  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: ""
  });

  // UI state
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [feedback, setFeedback] = useState({ show: false, type: '', message: '' });
  const [personalErrors, setPersonalErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});

  const axiosPrivate = useAxiosPrivate();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data } = await axiosPrivate.get("/admin/profile");
      setProfile(data);
      setPersonalData({
        name: data.name || `${data.firstName || ""} ${data.lastName || ""}`.trim(),
        username: data.username || "",
        bio: data.bio || "",
        phone: data.phone || "",
        address: data.address || "",
        dob: data.dob || ""
      });
    } catch (error) {
      console.error("Failed to load profile", error);
      showFeedback('error', 'Could not load profile details.');
    } finally {
      setIsLoading(false);
    }
  };

  const showFeedback = (type, message) => {
    setFeedback({ show: true, type, message });
    setTimeout(() => setFeedback({ show: false, type: '', message: '' }), 5000);
  };

  const handlePersonalChange = (e) => {
    setPersonalData({ ...personalData, [e.target.name]: e.target.value });
    clearFieldError(setPersonalErrors, e.target.name);
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    clearFieldError(setPasswordErrors, e.target.name);
  };

  const handleSavePersonal = async (e) => {
    e.preventDefault();
    const nextErrors = validateRequiredFields(personalData, {
      name: "Name",
      username: "Email / Username",
    });
    setPersonalErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      return;
    }

    setIsSavingPersonal(true);

    try {
      await axiosPrivate.put("/admin/profile", personalData);
      setProfile({ ...profile, ...personalData });
      setPersonalErrors({});
      showFeedback('success', 'Personal info saved successfully.');
    } catch (error) {
      showFeedback('error', error.response?.data?.message || 'Failed to save personal info.');
    } finally {
      setIsSavingPersonal(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    
    const nextErrors = validateRequiredFields(passwordData, {
      oldPassword: "Old password",
      newPassword: "New password",
    });
    if (passwordData.newPassword.length < 6) {
      nextErrors.newPassword = 'New password must be at least 6 characters.';
    }
    setPasswordErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      return;
    }

    setIsSavingPassword(true);

    try {
      // We send the existing personal data + the password fields
      const payload = {
        ...personalData,
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword
      };

      await axiosPrivate.put("/admin/profile", payload);
      showFeedback('success', 'Password changed successfully.');
      setPasswordData({ oldPassword: "", newPassword: "" });
      setPasswordErrors({});
    } catch (error) {
      showFeedback('error', error.response?.data?.message || 'Failed to change password.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">
          <div className="profile-spinner"></div>
          <p>Loading your details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page w-full" style={{ padding: '0 12px', width: '100%', maxWidth: '100%', display: 'block', flex: 1 }}>
      
      {/* Page Header */}
      <div className="premium-header-block" style={{ marginBottom: "24px", width: '100%' }}>
        <div className="title-area">
          <div className="title-icon-wrapper bg-purple-solid">
            <ShieldAlert size={28} className="txt-white" />
          </div>
          <div>
            <h2 className="page-title">Admin Profile</h2>
            <p className="page-subtitle">Manage your personal information, security, and company details.</p>
          </div>
        </div>
      </div>

      {feedback.show && (
        <div className={`profile-feedback ${feedback.type}`}>
          {feedback.message}
        </div>
      )}

      <div className="enterprise-profile-layout" style={{ width: '100%' }}>
        
        {/* LEFT SIDEBAR: Summary Card */}
        <div className="profile-sidebar-col">
          <div className="profile-summary-card">
            <div className="profile-banner"></div>
            <div className="profile-avatar-wrapper">
              <img src={assets.ceo || assets.avatar} alt="Profile" />
            </div>
            
            <div className="profile-summary-info">
              <h2>{personalData.name || "Admin"}</h2>
              <p>System Administrator</p>
              <div className="badge-joined">Joined in 2024</div>
            </div>

            <div className="profile-sidebar-nav">
              <button 
                className={`sidebar-nav-btn ${activeTab === 'personal' ? 'active' : ''}`}
                onClick={() => setActiveTab('personal')}
              >
                <User size={18} /> Personal Details
              </button>
              <button 
                className={`sidebar-nav-btn ${activeTab === 'security' ? 'active' : ''}`}
                onClick={() => setActiveTab('security')}
              >
                <Key size={18} /> Security & Password
              </button>
              <button 
                className={`sidebar-nav-btn ${activeTab === 'company' ? 'active' : ''}`}
                onClick={() => setActiveTab('company')}
              >
                <Building size={18} /> Company Profile
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT CONTENT AREA */}
        <div className="profile-content-col">
          
          {/* TAB: Personal Details */}
          {activeTab === 'personal' && (
            <form className="admin-card" onSubmit={handleSavePersonal} noValidate>
              <div className="admin-card-header">
                <h3>Personal Details</h3>
                <p>Update your personal information and contact details.</p>
              </div>

              <div className="admin-card-body">
                <div className="company-form-grid">
                  <div className="pf-form-group">
                    <label>Full Name</label>
                    <div className="pf-input-wrapper">
                      <User size={16} className="pf-input-icon" />
                      <input 
                        type="text" 
                        name="name" 
                        value={personalData.name} 
                        onChange={handlePersonalChange} 
                        className="pf-input"
                        aria-invalid={Boolean(personalErrors.name)}
                        required 
                      />
                    </div>
                    <FieldError message={personalErrors.name} />
                  </div>

                  <div className="pf-form-group">
                    <label>Email Address</label>
                    <div className="pf-input-wrapper">
                      <Mail size={16} className="pf-input-icon" />
                      <input 
                        type="text" 
                        name="username" 
                        value={personalData.username} 
                        onChange={handlePersonalChange} 
                        className="pf-input"
                        aria-invalid={Boolean(personalErrors.username)}
                        required 
                      />
                    </div>
                    <FieldError message={personalErrors.username} />
                  </div>
                </div>

                <div className="pf-form-group">
                  <label>Bio & Role Description</label>
                  <div className="pf-input-wrapper" style={{ alignItems: 'flex-start' }}>
                    <UserCircle size={16} className="pf-input-icon" style={{ top: '16px' }} />
                    <textarea 
                      name="bio"
                      value={personalData.bio}
                      onChange={handlePersonalChange}
                      className="pf-textarea"
                      style={{ paddingLeft: '42px' }}
                      placeholder="A bit about yourself and your role"
                    ></textarea>
                  </div>
                </div>
              </div>

              <div className="admin-card-footer">
                <button type="submit" className="add-premium-btn" disabled={isSavingPersonal}>
                  {isSavingPersonal ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {/* TAB: Security & Password */}
          {activeTab === 'security' && (
            <div className="security-tab-container">
              <form className="admin-card" onSubmit={handleSavePassword} noValidate style={{ marginBottom: '24px' }}>
                <div className="admin-card-header">
                  <h3>Change Password</h3>
                  <p>Ensure your account is using a long, random password to stay secure.</p>
                </div>
                
                <div className="admin-card-body">
                  <div className="pf-form-group">
                    <label>Current Password</label>
                    <div className="pf-input-wrapper">
                      <Lock size={16} className="pf-input-icon" />
                      <input 
                        type={showOldPassword ? "text" : "password"} 
                        name="oldPassword"
                        value={passwordData.oldPassword}
                        onChange={handlePasswordChange}
                        className="pf-input"
                        aria-invalid={Boolean(passwordErrors.oldPassword)}
                      />
                      <button type="button" className="pw-eye-btn" onClick={() => setShowOldPassword(!showOldPassword)}>
                        {showOldPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <FieldError message={passwordErrors.oldPassword} />
                  </div>

                  <div className="pf-form-group">
                    <label>New Password</label>
                    <div className="pf-input-wrapper">
                      <Lock size={16} className="pf-input-icon" />
                      <input 
                        type={showNewPassword ? "text" : "password"} 
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        className="pf-input"
                        aria-invalid={Boolean(passwordErrors.newPassword)}
                      />
                      <button type="button" className="pw-eye-btn" onClick={() => setShowNewPassword(!showNewPassword)}>
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <FieldError message={passwordErrors.newPassword} />
                    <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>Password must be at least 6 characters long.</p>
                  </div>
                </div>

                <div className="admin-card-footer">
                  <button type="submit" className="add-premium-btn" disabled={isSavingPassword}>
                     {isSavingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>

              {/* Danger Zone */}
              <div className="admin-card">
                <div className="admin-card-header" style={{ borderBottom: 'none' }}>
                  <h3 style={{ color: '#ef4444' }}>Danger Zone</h3>
                  <p>Permanently delete your account and all associated data.</p>
                  
                  <div style={{ marginTop: '16px' }}>
                    <button type="button" className="btn-delete-account">
                      <Trash2 size={16} /> Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Company Profile */}
          {activeTab === 'company' && (
            <form className="admin-card" onSubmit={handleSavePersonal} noValidate>
              <div className="admin-card-header">
                <h3>Company Profile</h3>
                <p>Manage details about the hospital or clinic.</p>
              </div>

              <div className="admin-card-body">
                <div className="company-form-grid">
                  <div className="pf-form-group">
                    <label>Hospital / Clinic Name</label>
                    <div className="pf-input-wrapper">
                      <Building size={16} className="pf-input-icon" />
                      <input 
                        type="text" 
                        className="pf-input"
                        value="DocX Multi-Specialty"
                        disabled
                      />
                    </div>
                  </div>
                  <div className="pf-form-group">
                    <label>Role</label>
                    <div className="pf-input-wrapper">
                      <Briefcase size={16} className="pf-input-icon" />
                      <input 
                        type="text" 
                        className="pf-input"
                        value="System Administrator"
                        disabled
                      />
                    </div>
                  </div>
                  <div className="pf-form-group">
                    <label>Contact Phone</label>
                    <div className="pf-input-wrapper">
                      <Phone size={16} className="pf-input-icon" />
                      <input 
                        type="text" 
                        name="phone"
                        value={personalData.phone}
                        onChange={handlePersonalChange}
                        className="pf-input"
                      />
                    </div>
                  </div>
                  <div className="pf-form-group">
                    <label>Office Address</label>
                    <div className="pf-input-wrapper">
                      <MapPin size={16} className="pf-input-icon" />
                      <input 
                        type="text" 
                        name="address"
                        value={personalData.address}
                        onChange={handlePersonalChange}
                        className="pf-input"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="admin-card-footer">
                <button type="submit" className="add-premium-btn" disabled={isSavingPersonal}>
                  {isSavingPersonal ? 'Saving...' : 'Save Company Details'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
