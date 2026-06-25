import React, { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "@/admin/NavBar/NavBar.css";
import { assets } from "@/shared/lib/assets";
import { Bell, Info, AlertTriangle, UserPlus, PackageSearch, Activity, Settings, LogOut, ChevronDown } from 'lucide-react';
import useAxiosPrivate from "@/shared/hooks/useAxiosPrivate";
import useAuth from "@/shared/hooks/useAuth";
import GlobalSearchBox from "@/shared/components/search/GlobalSearchBox";
import { clearAuthSessionStorage } from "@/shared/lib/authSession";

const AdminNavBar = () => {
  const [admin, setAdmin] = useState({ name: "Admin", role: "Administrator" });
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const axiosPrivate = useAxiosPrivate();
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const fetchAdminProfile = async () => {
      try {
        const { data } = await axiosPrivate.get("/auth/me");
        setAdmin(data);
      } catch (error) {
        console.error("Failed to fetch admin profile", error);
      }
    };

    const fetchNotifications = async () => {
      try {
        const { data } = await axiosPrivate.get("/admin/notifications");
        setNotifications(data);
      } catch (error) {
        console.error("Failed to fetch notifications", error);
      }
    };

    fetchAdminProfile();
    fetchNotifications();

    // Polling every 30 seconds for new notifications
    const intervalId = setInterval(fetchNotifications, 30000);
    return () => clearInterval(intervalId);
  }, [axiosPrivate]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleNotificationClick = async (notif) => {
    navigate(notif.link);
    setShowDropdown(false);

    if (!notif.isRead) {
      try {
        await axiosPrivate.put(`/admin/notifications/${notif._id}/read`);
        setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
      } catch (error) {
        console.error("Failed to mark notification as read", error);
      }
    }
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    try {
      await axiosPrivate.put("/admin/notifications/read-all");
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error("Failed to mark all as read", error);
    }
  };

  const handleLogout = async () => {
    try {
      await axiosPrivate.post("/auth/logout");
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      setAuth({});
      clearAuthSessionStorage();
      setAdmin({ name: "Admin", role: "Administrator" });
      setNotifications([]);
      setShowDropdown(false);
      navigate("/admin/login", { replace: true });
    }
  };

  const getIconForType = (type) => {
    switch (type) {
      case 'PATIENT_REGISTRATION': return <div className="brand-icon-box bg-blue-subtle"><UserPlus size={16} className="text-blue-main" /></div>;
      case 'DOCTOR_APPROVAL': return <div className="brand-icon-box bg-indigo-subtle"><Activity size={16} className="text-indigo-main" /></div>;
      case 'LOW_STOCK_ALERT': return <div className="brand-icon-box bg-red-subtle"><PackageSearch size={16} className="text-red-main" /></div>;
      case 'APPOINTMENT_UPDATE': return <div className="brand-icon-box bg-amber-subtle"><AlertTriangle size={16} className="text-amber-main" /></div>;
      default: return <div className="brand-icon-box bg-gray-subtle"><Info size={16} className="text-gray-main" /></div>;
    }
  };

  return (
    <div className="premium-admin-nav">

      {/* Search Header Area */}
      <GlobalSearchBox
        endpoint="/admin/search"
        placeholder="Search patients, doctors, appointments, orders..."
        shortcutLabel="⌘K"
        navigate={navigate}
        fallbackPath="/admin/patients"
      />

      {/* Main Navigation Links */}
      <div className="admin-top-nav-links" style={{ display: 'flex', gap: '20px', alignItems: 'center', marginLeft: '30px', flex: 1, position: 'relative' }}>
        {[
            { name: 'Overview', path: '/admin/dashboard' },
            { name: 'Users', path: '/admin/doctors', items: [
                { name: 'Manage Doctors', path: '/admin/doctors' },
                { name: 'Manage Patients', path: '/admin/patients' }
            ]},
            { name: 'Appointments', path: '/admin/appointments' },
            { name: 'Pharmacy', path: '/admin/pharmacy' },
            { name: 'Finance', path: '/admin/payments', items: [
                { name: 'Payments & Revenue', path: '/admin/payments' }
            ]},
            { name: 'Clinical', path: '/admin/ehr', items: [
                { name: 'EHR Records', path: '/admin/ehr' },
                { name: 'Online Consultations', path: '/admin/online-consultation' }
            ]},
            { name: 'Content', path: '/admin/blogs', items: [
                { name: 'Manage Blogs', path: '/admin/blogs' },
                { name: 'Manage FAQs', path: '/admin/faqs' }
            ]}
        ].map(item => (
            <div key={item.name} className="nav-item-dropdown-wrapper">
                <NavLink
                    to={item.path}
                    className={({ isActive }) => `top-nav-item ${isActive ? 'active' : ''}`}
                    style={({ isActive }) => ({
                        textDecoration: 'none',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: isActive ? '#683B93' : '#6B7280',
                        padding: '10px 5px',
                        borderBottom: isActive ? '3px solid #683B93' : '3px solid transparent',
                        display: 'flex',
                        alignItems: 'center',
                        height: '70px', // Match navbar height
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap'
                    })}
                >
                    {item.name}
                    {item.items && <ChevronDown size={14} className="dropdown-arrow" />}
                </NavLink>
                
                {item.items && (
                    <div className="nav-dropdown-menu">
                        {item.items.map(subItem => (
                            <NavLink
                                key={subItem.path}
                                to={subItem.path}
                                className={({ isActive }) => `dropdown-link ${isActive ? 'active' : ''}`}
                            >
                                {subItem.name}
                            </NavLink>
                        ))}
                    </div>
                )}
            </div>
        ))}
      </div>

      {/* Trailing Tools */}
      <div className="nav-tools-section">

        {/* Settings Stub */}
        <button className="tool-btn icon-only" aria-label="Settings" onClick={() => navigate('/admin/settings')} style={{ cursor: 'pointer' }}>
          <Settings size={20} />
        </button>

        {/* Notifications Hub */}
        <div className="notif-wrapper" ref={dropdownRef}>
          <button
            className={`tool-btn icon-only notif-trigger ${unreadCount > 0 ? 'has-unread' : ''}`}
            onClick={() => setShowDropdown(!showDropdown)}
            aria-label="View notifications"
          >
            <Bell size={20} className={unreadCount > 0 ? "bell-shake" : ""} />
            {unreadCount > 0 && (
              <span className="notif-red-dot">
                <span className="ping-animate"></span>
                <span className="dot-core"></span>
              </span>
            )}
          </button>

          {/* Premium Dropdown */}
          <div className={`premium-dropdown ${showDropdown ? 'visible' : ''}`}>
            <div className="pd-header">
              <div>
                <h3 className="pd-title">Notifications</h3>
                <span className="pd-subtitle">You have {unreadCount} unread alerts</span>
              </div>
              {unreadCount > 0 && (
                <button className="pd-mark-all" onClick={handleMarkAllRead}>
                  Mark all read
                </button>
              )}
            </div>

            <div className="pd-body">
              {notifications.length === 0 ? (
                <div className="pd-empty">
                  <div className="empty-sparkle">✨</div>
                  <p>You&apos;re all caught up!</p>
                </div>
              ) : (
                notifications.map(notif => (
                  <div
                    key={notif._id}
                    className={`pd-item ${!notif.isRead ? 'is-unread' : ''}`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    {getIconForType(notif.type)}
                    <div className="pd-item-content">
                      <div className="pd-item-header">
                        <h4>{notif.title}</h4>
                        {!notif.isRead && <span className="read-indicator"></span>}
                      </div>
                      <p>{notif.message}</p>
                      <span className="pd-item-time">
                        {new Date(notif.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="pd-footer" onClick={() => {
                setShowDropdown(false);
                navigate('/admin/notifications');
              }}>
                View comprehensive alert history
              </div>
            )}
          </div>
        </div>

        <div className="nav-divider"></div>

        {/* Identity Chip with Dropdown */}
        <div className="profile-dropdown-wrapper">
          <div className="identity-chip" onClick={() => navigate('/admin/profile')} style={{ cursor: 'pointer' }}>
            <div className="identity-text">
              <span className="identity-name">{admin.name}</span>
              <span className="identity-role">{admin.role}</span>
            </div>
            <img src={assets.ceo || assets.avatar} alt="Admin" className="identity-avatar" />
          </div>

          <div className="profile-dropdown-menu">
            <button type="button" className="dropdown-logout-btn" onClick={handleLogout}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminNavBar;
