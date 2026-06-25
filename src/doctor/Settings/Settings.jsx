import React from 'react';
import { Shield, Lock, Bell, Moon } from 'lucide-react';
import "@/doctor/Settings/Settings.css";

const Settings = () => {
    return (
        <div className="settings-page">
            <h2 className="page-title mb-6">Account Settings</h2>

            <div className="settings-card">
                <h3 className="card-title">Security</h3>
                <div className="setting-item">
                    <div className="s-info">
                        <Lock size={20} className="text-gray" />
                        <div>
                            <h4>Change Password</h4>
                            <p>Update your login password regularly</p>
                        </div>
                    </div>
                    <button className="btn-secondary">Update</button>
                </div>
                <div className="setting-item">
                    <div className="s-info">
                        <Shield size={20} className="text-gray" />
                        <div>
                            <h4>Two-Factor Authentication</h4>
                            <p>Add an extra layer of security</p>
                        </div>
                    </div>
                    <label className="switch">
                        <input type="checkbox" />
                        <span className="slider round"></span>
                    </label>
                </div>
            </div>

            <div className="settings-card mt-6">
                <h3 className="card-title">Preferences</h3>
                <div className="setting-item">
                    <div className="s-info">
                        <Bell size={20} className="text-gray" />
                        <div>
                            <h4>Notifications</h4>
                            <p>Receive email alerts for appointments</p>
                        </div>
                    </div>
                    <label className="switch">
                        <input type="checkbox" defaultChecked />
                        <span className="slider round"></span>
                    </label>
                </div>
            </div>
        </div>
    );
};
export default Settings;
