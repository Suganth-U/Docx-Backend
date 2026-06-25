import React, { useState, useEffect } from 'react';
import {
    Save, Shield, Bell, Settings, Building2, Globe,
    Lock, KeyRound, Monitor, Mail, CalendarClock,
    HardDrive, CheckCircle2, XCircle, Loader2, Wrench,
    Smartphone, MapPin, Search
} from 'lucide-react';
import useAxiosPrivate from "@/shared/hooks/useAxiosPrivate";
import "@/admin/AdminModules.css";
import "@/admin/Settings/AdminSettings.css";

const TAB_CONFIG = [
    { key: 'general', label: 'Organization Info', icon: Building2 },
    { key: 'security', label: 'Security & Access', icon: Shield },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'maintenance', label: 'System & Data', icon: Wrench },
];

const AdminSettings = () => {
    const axiosPrivate = useAxiosPrivate();
    const [activeTab, setActiveTab] = useState('general');
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });

    // ─── Fetch settings on mount ───
    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const { data } = await axiosPrivate.get('/admin/settings');
            setSettings(data);
        } catch (err) {
            console.error('Failed to load settings:', err);
            setFeedback({ type: 'error', message: 'Failed to load settings' });
        } finally {
            setLoading(false);
        }
    };

    // ─── Save handler ───
    const handleSave = async () => {
        try {
            setSaving(true);
            setFeedback({ type: '', message: '' });
            const { data } = await axiosPrivate.put('/admin/settings', settings);
            setSettings(data.settings);
            setFeedback({ type: 'success', message: 'Settings saved successfully!' });
            setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
        } catch (err) {
            console.error('Failed to save settings:', err);
            setFeedback({ type: 'error', message: 'Failed to save settings. Please try again.' });
        } finally {
            setSaving(false);
        }
    };

    // ─── Generic updater ───
    const updateField = (field, value) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    // ─── Toggle component ───
    const Toggle = ({ field, label, description }) => (
        <div className="toggle-row">
            <div className="toggle-label">
                <span>{label}</span>
                {description && <small>{description}</small>}
            </div>
            <label className="toggle-switch">
                <input
                    type="checkbox"
                    checked={settings?.[field] ?? false}
                    onChange={(e) => updateField(field, e.target.checked)}
                />
                <span className="toggle-slider" />
            </label>
        </div>
    );

    // ─── Loading state ───
    if (loading) {
        return (
            <div className="settings-page w-full">
                <div className="settings-skeleton">
                    <div className="skeleton-block" style={{height: '100px'}} />
                    <div className="enterprise-settings-layout">
                        <div className="skeleton-block" style={{height: '400px'}} />
                        <div className="skeleton-block" style={{height: '600px'}} />
                    </div>
                </div>
            </div>
        );
    }

    // ─── Tab content renderers ───
    const renderGeneral = () => (
        <div className="settings-inner-grid">
            <div className="admin-card">
                <div className="admin-card-header">
                    <h3>Organization Details</h3>
                    <p>Primary contact information and branding details.</p>
                </div>
                <div className="admin-card-body">
                    <div className="pf-form-group">
                        <label>Hospital / Clinic Name</label>
                        <div className="pf-input-wrapper">
                            <Building2 size={16} className="pf-input-icon" />
                            <input
                                className="pf-input"
                                value={settings?.hospitalName || ''}
                                onChange={(e) => updateField('hospitalName', e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="pf-form-group">
                        <label>Email Address</label>
                        <div className="pf-input-wrapper">
                            <Mail size={16} className="pf-input-icon" />
                            <input
                                className="pf-input"
                                type="email"
                                value={settings?.hospitalEmail || ''}
                                onChange={(e) => updateField('hospitalEmail', e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="pf-form-group">
                        <label>Phone Number</label>
                        <div className="pf-input-wrapper">
                            <Smartphone size={16} className="pf-input-icon" />
                            <input
                                className="pf-input"
                                value={settings?.hospitalPhone || ''}
                                onChange={(e) => updateField('hospitalPhone', e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="pf-form-group">
                        <label>Address</label>
                        <div className="pf-input-wrapper">
                            <MapPin size={16} className="pf-input-icon" />
                            <input
                                className="pf-input"
                                value={settings?.hospitalAddress || ''}
                                onChange={(e) => updateField('hospitalAddress', e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="pf-form-group">
                        <label>Website</label>
                        <div className="pf-input-wrapper">
                            <Search size={16} className="pf-input-icon" />
                            <input
                                className="pf-input"
                                value={settings?.hospitalWebsite || ''}
                                onChange={(e) => updateField('hospitalWebsite', e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="admin-card">
                <div className="admin-card-header">
                    <h3>Regional Preferences</h3>
                    <p>Localization, language, and date configurations.</p>
                </div>
                <div className="admin-card-body">
                    <div className="pf-form-group">
                        <label>Timezone</label>
                        <div className="pf-input-wrapper">
                            <Globe size={16} className="pf-input-icon" />
                            <select
                                className="pf-select"
                                value={settings?.timezone || 'Asia/Kolkata'}
                                onChange={(e) => updateField('timezone', e.target.value)}
                            >
                                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                                <option value="America/New_York">America/New_York (EST)</option>
                                <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                                <option value="Europe/London">Europe/London (GMT)</option>
                                <option value="Europe/Berlin">Europe/Berlin (CET)</option>
                                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                                <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                                <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
                            </select>
                        </div>
                    </div>
                    <div className="pf-form-group">
                        <label>Date Format</label>
                        <div className="pf-input-wrapper">
                            <CalendarClock size={16} className="pf-input-icon" />
                            <select
                                className="pf-select"
                                value={settings?.dateFormat || 'DD/MM/YYYY'}
                                onChange={(e) => updateField('dateFormat', e.target.value)}
                            >
                                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                            </select>
                        </div>
                    </div>
                    <div className="pf-form-group">
                        <label>Language</label>
                        <select
                            className="pf-select"
                            value={settings?.language || 'English'}
                            onChange={(e) => updateField('language', e.target.value)}
                        >
                            <option value="English">English</option>
                            <option value="Hindi">Hindi</option>
                            <option value="Tamil">Tamil</option>
                            <option value="Spanish">Spanish</option>
                            <option value="French">French</option>
                            <option value="Arabic">Arabic</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderSecurity = () => (
        <div className="settings-inner-grid">
            <div className="admin-card">
                <div className="admin-card-header">
                    <h3>Authentication Rules</h3>
                    <p>Enforce strong security protocols for staff access.</p>
                </div>
                <div className="admin-card-body">
                    <Toggle field="twoFactorAuth" label="Two-Factor Authentication" description="Require 2FA for all admin accounts" />
                    <Toggle field="forcePasswordReset" label="Force Password Reset" description="Mandatory password reset periodically" />
                    
                    {settings?.forcePasswordReset && (
                        <div className="pf-form-group" style={{ marginTop: '24px' }}>
                            <label>Reset Interval</label>
                            <div className="inline-number-group">
                                <span>Every</span>
                                <input
                                    className="pf-input"
                                    type="number"
                                    min={7}
                                    max={365}
                                    value={settings?.passwordResetDays || 90}
                                    onChange={(e) => updateField('passwordResetDays', parseInt(e.target.value) || 90)}
                                />
                                <span>days</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="admin-card">
                <div className="admin-card-header">
                    <h3>Session & Environment Access</h3>
                    <p>Control timeouts and IP whitelisting settings.</p>
                </div>
                <div className="admin-card-body">
                    <div className="pf-form-group">
                        <label>Session Timeout (minutes)</label>
                        <div className="pf-input-wrapper">
                            <ClockIcon /> 
                            <input
                                className="pf-input"
                                type="number"
                                min={5}
                                max={480}
                                value={settings?.sessionTimeout || 30}
                                onChange={(e) => updateField('sessionTimeout', parseInt(e.target.value) || 30)}
                                style={{ paddingLeft: '42px' }}
                            />
                        </div>
                    </div>
                    <div className="pf-form-group">
                        <label>Max Login Attempts</label>
                        <div className="pf-input-wrapper">
                            <KeyRound size={16} className="pf-input-icon" />
                            <input
                                className="pf-input"
                                type="number"
                                min={1}
                                max={20}
                                value={settings?.maxLoginAttempts || 5}
                                onChange={(e) => updateField('maxLoginAttempts', parseInt(e.target.value) || 5)}
                            />
                        </div>
                    </div>
                    <Toggle field="ipWhitelisting" label="IP Whitelisting" description="Restrict admin panel access to specific IPs" />
                </div>
            </div>
        </div>
    );

    const renderNotifications = () => (
        <div className="settings-inner-grid">
            <div className="admin-card">
                <div className="admin-card-header">
                    <h3>Communication Channels</h3>
                    <p>Enable or disable major notification delivery channels.</p>
                </div>
                <div className="admin-card-body">
                    <Toggle field="emailNotifications" label="Email Notifications" description="Master switch for transactional, security, reminder, and operational emails" />
                    <Toggle field="smsNotifications" label="SMS Notifications" description="Send notifications via SMS" />
                </div>
            </div>

            <div className="admin-card">
                <div className="admin-card-header">
                    <h3>System Alerts & Reminders</h3>
                    <p>Configure automated system reminders.</p>
                </div>
                <div className="admin-card-body">
                    <Toggle field="appointmentReminders" label="Appointment Reminders" description="Send timed reminders for upcoming appointments and virtual consultations" />
                    {settings?.appointmentReminders && (
                        <div className="pf-form-group" style={{ marginTop: '24px', paddingLeft: '16px' }}>
                            <label>Reminder Lead Time</label>
                            <div className="inline-number-group">
                                <input
                                    className="pf-input"
                                    type="number"
                                    min={1}
                                    max={72}
                                    value={settings?.reminderHours || 24}
                                    onChange={(e) => updateField('reminderHours', parseInt(e.target.value) || 24)}
                                />
                                <span>hours before</span>
                            </div>
                        </div>
                    )}
                    <Toggle field="lowStockAlerts" label="Low Stock Alerts" description="Email pharmacy and admin contacts when medicines fall below reorder level" />
                    <Toggle field="systemAlerts" label="System Alerts" description="Email internal workflow alerts like doctor approvals, consultation queues, and verification tasks" />
                </div>
            </div>
        </div>
    );

    const renderMaintenance = () => (
        <div className="settings-inner-grid">
            <div className="admin-card">
                <div className="admin-card-header">
                    <h3>Maintenance Mode</h3>
                    <p>Take the system offline for upgrades.</p>
                </div>
                <div className="admin-card-body">
                    <Toggle field="maintenanceMode" label="Enable Maintenance Mode" description="Temporarily disable public access" />
                    {settings?.maintenanceMode && (
                        <div className="pf-form-group" style={{ marginTop: '24px' }}>
                            <label>Maintenance Message</label>
                            <textarea
                                className="pf-textarea"
                                value={settings?.maintenanceMessage || ''}
                                onChange={(e) => updateField('maintenanceMessage', e.target.value)}
                                rows={3}
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="admin-card">
                <div className="admin-card-header">
                    <h3>Backup & Data Retention</h3>
                    <p>Manage how long data is stored and automated backups.</p>
                </div>
                <div className="admin-card-body">
                    <Toggle field="autoBackup" label="Automatic Backups" description="Schedule protected system backups" />
                    {settings?.autoBackup && (
                        <div className="pf-form-group" style={{ marginTop: '24px' }}>
                            <label>Backup Frequency</label>
                            <select
                                className="pf-select"
                                value={settings?.backupFrequency || 'daily'}
                                onChange={(e) => updateField('backupFrequency', e.target.value)}
                            >
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                            </select>
                        </div>
                    )}
                    <div className="pf-form-group" style={{ marginTop: '24px' }}>
                        <label>Data Retention Period</label>
                        <div className="inline-number-group">
                            <input
                                className="pf-input"
                                type="number"
                                min={30}
                                max={3650}
                                value={settings?.dataRetentionDays || 365}
                                onChange={(e) => updateField('dataRetentionDays', parseInt(e.target.value) || 365)}
                            />
                            <span>days</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const tabContent = {
        general: renderGeneral,
        security: renderSecurity,
        notifications: renderNotifications,
        maintenance: renderMaintenance,
    };

    return (
        <div className="settings-page" style={{ padding: '0 12px', width: '100%', maxWidth: '100%', display: 'block', flex: 1 }}>
            
            {/* Page Header */}
            <div className="premium-header-block" style={{ marginBottom: "24px", width: '100%' }}>
                <div className="title-area">
                    <div className="title-icon-wrapper bg-purple-solid">
                        <Settings size={28} className="txt-white" />
                    </div>
                    <div>
                        <h2 className="page-title">System Settings</h2>
                        <p className="page-subtitle">Configure core platform behaviors, security rules, and system limits.</p>
                    </div>
                </div>
            </div>

            <div className="enterprise-settings-layout" style={{ width: '100%' }}>
                
                {/* LEFT SIDEBAR: Navigation Menu */}
                <div className="settings-sidebar-col">
                    <div className="settings-sidebar-card">
                        <h3>Configuration</h3>
                        {TAB_CONFIG.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.key}
                                    className={`sidebar-nav-btn ${activeTab === tab.key ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab.key)}
                                >
                                    <Icon size={18} /> {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT CONTENT AREA */}
                <div className="settings-content-col" style={{ width: '100%', minWidth: 0 }}>
                    {tabContent[activeTab]()}
                </div>
            </div>

            {/* Save Bar Pinned at Bottom */}
            <div className="settings-save-bar">
                {feedback.message && (
                    <div className={`save-msg ${feedback.type}`}>
                        {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                        {feedback.message}
                    </div>
                )}
                <button
                    className="add-premium-btn"
                    onClick={handleSave}
                    disabled={saving}
                    style={{ minWidth: '180px', justifyContent: 'center' }}
                >
                    {saving ? (
                        <>
                            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                            Saving Configuration...
                        </>
                    ) : (
                        <>
                            <Save size={16} />
                            Save Settings
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

// ClockIcon wrapper for custom missing lucide-react import without breaking existing logic
const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pf-input-icon"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>

export default AdminSettings;
