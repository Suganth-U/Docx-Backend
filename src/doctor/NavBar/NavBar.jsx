import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  Bell,
  ChevronDown,
  FileText,
  Info,
  LogOut,
  Settings,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { assets } from "@/shared/lib/assets";
import useAxiosPrivate from "@/shared/hooks/useAxiosPrivate";
import useAuth from "@/shared/hooks/useAuth";
import { clearAuthSessionStorage } from "@/shared/lib/authSession";
import GlobalSearchBox from "@/shared/components/search/GlobalSearchBox";
import "@/doctor/NavBar/NavBar.css";

const navItems = [
  {
    name: "Dashboard",
    path: "/doctor/dashboard",
    activePaths: ["/doctor/dashboard"],
  },
  {
    name: "Clinical",
    path: "/doctor/appointments",
    activePaths: ["/doctor/appointments", "/doctor/schedule", "/doctor/patients"],
    items: [
      { name: "Appointments", path: "/doctor/appointments" },
      { name: "Online Sessions", path: "/doctor/schedule" },
      { name: "Patient Records", path: "/doctor/patients" },
    ],
  },
  {
    name: "Prescriptions",
    path: "/doctor/prescription",
    activePaths: ["/doctor/prescription", "/doctor/requests"],
    items: [
      { name: "My Prescriptions", path: "/doctor/prescription" },
      { name: "Patient Requests", path: "/doctor/requests" },
    ],
  },
  {
    name: "Availability",
    path: "/doctor/my-schedule",
    activePaths: ["/doctor/my-schedule"],
  },
  {
    name: "Messages",
    path: "/doctor/messages",
    activePaths: ["/doctor/messages"],
  },
];

const DoctorNavBar = () => {
  const [doctor, setDoctor] = useState({ name: "Doctor" });
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const axiosPrivate = useAxiosPrivate();
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const fetchDoctorProfile = async () => {
      try {
        const { data } = await axiosPrivate.get("/auth/me");
        setDoctor(data);
      } catch (error) {
        console.error("Failed to fetch doctor profile", error);
      }
    };

    const fetchNotifications = async () => {
      try {
        const { data } = await axiosPrivate.get("/doctor/notifications");
        setNotifications(data);
      } catch (error) {
        console.error("Failed to fetch doctor notifications", error);
      }
    };

    fetchDoctorProfile();
    fetchNotifications();

    const intervalId = setInterval(fetchNotifications, 30000);
    return () => clearInterval(intervalId);
  }, [axiosPrivate]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  const handleNotificationClick = async (notification) => {
    navigate(notification.link || "/doctor/notifications");
    setShowDropdown(false);

    if (!notification.isRead) {
      try {
        await axiosPrivate.put(`/doctor/notifications/${notification._id}/read`);
        setNotifications((current) =>
          current.map((item) =>
            item._id === notification._id ? { ...item, isRead: true } : item
          )
        );
      } catch (error) {
        console.error("Failed to mark doctor notification as read", error);
      }
    }
  };

  const handleMarkAllRead = async (event) => {
    event.stopPropagation();

    try {
      await axiosPrivate.put("/doctor/notifications/read-all");
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    } catch (error) {
      console.error("Failed to mark all doctor notifications as read", error);
    }
  };

  const clearDoctorAuthState = () => {
    setAuth({});
    clearAuthSessionStorage();
  };

  const handleLogout = async () => {
    try {
      await axiosPrivate.post("/auth/logout");
    } catch (error) {
      console.error("Doctor logout failed", error);
    } finally {
      clearDoctorAuthState();
      navigate("/login?role=doctor", { replace: true });
    }
  };

  const getIconForType = (type) => {
    switch (type) {
      case "APPOINTMENT_UPDATE":
        return <div className="brand-icon-box bg-green-light-subtle"><Activity size={16} className="text-green-main" /></div>;
      case "PRESCRIPTION_REQUEST":
        return <div className="brand-icon-box bg-amber-subtle"><FileText size={16} className="text-amber-main" /></div>;
      case "CONSULTATION_UPDATE":
        return <div className="brand-icon-box bg-blue-subtle"><Stethoscope size={16} className="text-blue-main" /></div>;
      case "DOCTOR_STATUS_UPDATE":
        return <div className="brand-icon-box bg-indigo-subtle"><ShieldCheck size={16} className="text-indigo-main" /></div>;
      default:
        return <div className="brand-icon-box bg-gray-subtle"><Info size={16} className="text-gray-main" /></div>;
    }
  };

  const isItemActive = (item) =>
    item.activePaths?.some((path) => location.pathname.startsWith(path));

  return (
    <div className="premium-admin-nav doctor-nav-shell">
      <GlobalSearchBox
        endpoint="/doctor/search"
        placeholder="Search patients, appointments, prescriptions..."
        shortcutLabel="⌘K"
        navigate={navigate}
        fallbackPath="/doctor/patients"
      />

      <div className="doctor-nav-links">
        {navItems.map((item) => {
          const active = isItemActive(item);

          return (
            <div key={item.name} className="nav-item-dropdown-wrapper">
              <NavLink
                to={item.path}
                className={`top-nav-item ${active ? "active" : ""}`}
                style={{
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: active ? "#683B93" : "#6B7280",
                  padding: "10px 5px",
                  borderBottom: active ? "3px solid #683B93" : "3px solid transparent",
                  display: "flex",
                  alignItems: "center",
                  height: "70px",
                  transition: "all 0.2s",
                  whiteSpace: "nowrap",
                }}
              >
                {item.name}
                {item.items && <ChevronDown size={14} className="dropdown-arrow" />}
              </NavLink>

              {item.items && (
                <div className="nav-dropdown-menu">
                  {item.items.map((subItem) => (
                    <NavLink
                      key={subItem.path}
                      to={subItem.path}
                      className={({ isActive }) => `dropdown-link ${isActive ? "active" : ""}`}
                    >
                      {subItem.name}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="nav-tools-section">
        <button
          className="tool-btn icon-only"
          aria-label="Doctor settings"
          onClick={() => navigate("/doctor/settings")}
          style={{ cursor: "pointer" }}
        >
          <Settings size={20} />
        </button>

        <div className="notif-wrapper" ref={dropdownRef}>
          <button
            className={`tool-btn icon-only notif-trigger ${unreadCount > 0 ? "has-unread" : ""}`}
            onClick={() => setShowDropdown((current) => !current)}
            aria-label="View doctor notifications"
          >
            <Bell size={20} className={unreadCount > 0 ? "bell-shake" : ""} />
            {unreadCount > 0 && (
              <span className="notif-red-dot">
                <span className="ping-animate"></span>
                <span className="dot-core"></span>
              </span>
            )}
          </button>

          <div className={`premium-dropdown ${showDropdown ? "visible" : ""}`}>
            <div className="pd-header">
              <div>
                <h3 className="pd-title">Notifications</h3>
                <span className="pd-subtitle">You have {unreadCount} unread doctor alerts</span>
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
                notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`pd-item ${!notification.isRead ? "is-unread" : ""}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {getIconForType(notification.type)}
                    <div className="pd-item-content">
                      <div className="pd-item-header">
                        <h4>{notification.title}</h4>
                        {!notification.isRead && <span className="read-indicator"></span>}
                      </div>
                      <p>{notification.message}</p>
                      <span className="pd-item-time">
                        {new Date(notification.createdAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div
                className="pd-footer"
                onClick={() => {
                  setShowDropdown(false);
                  navigate("/doctor/notifications");
                }}
              >
                View doctor notification history
              </div>
            )}
          </div>
        </div>

        <div className="nav-divider"></div>

        <div className="profile-dropdown-wrapper doctor-profile-dropdown">
          <button
            className="identity-chip doctor-avatar-trigger"
            onClick={() => navigate("/doctor/profile")}
            aria-label="Open doctor profile"
            type="button"
          >
            <img
              src={doctor?.image || doctor?.profileImage || assets.avatar}
              alt="Doctor profile"
              className="identity-avatar"
            />
          </button>

          <div className="profile-dropdown-menu doctor-profile-menu">
            <button className="dropdown-logout-btn" onClick={handleLogout} type="button">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorNavBar;
