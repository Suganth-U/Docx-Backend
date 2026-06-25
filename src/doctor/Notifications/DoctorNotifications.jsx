import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Bell,
  CheckCircle2,
  Clock,
  FileText,
  Info,
  Search,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import useAxiosPrivate from "@/shared/hooks/useAxiosPrivate";
import "@/admin/Notifications/AdminNotifications.css";

const DoctorNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const axiosPrivate = useAxiosPrivate();
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const { data } = await axiosPrivate.get("/doctor/notifications");
      setNotifications(data);
    } catch (error) {
      console.error("Failed to fetch doctor notification history", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    navigate(notification.link || "/doctor/notifications");

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

  const handleMarkAllRead = async () => {
    try {
      await axiosPrivate.put("/doctor/notifications/read-all");
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    } catch (error) {
      console.error("Failed to mark all doctor notifications as read", error);
    }
  };

  const getIconForType = (type) => {
    switch (type) {
      case "APPOINTMENT_UPDATE":
        return <div className="hist-icon bg-green-light"><Activity size={20} className="txt-green" /></div>;
      case "PRESCRIPTION_REQUEST":
        return <div className="hist-icon bg-amber-light"><FileText size={20} className="txt-amber" /></div>;
      case "CONSULTATION_UPDATE":
        return <div className="hist-icon bg-blue-light"><Stethoscope size={20} className="txt-blue" /></div>;
      case "DOCTOR_STATUS_UPDATE":
        return <div className="hist-icon bg-indigo-light"><ShieldCheck size={20} className="txt-indigo" /></div>;
      case "SYSTEM_ALERT":
        return <div className="hist-icon bg-red-light"><ShieldAlert size={20} className="txt-red" /></div>;
      default:
        return <div className="hist-icon bg-gray-light"><Info size={20} className="txt-gray" /></div>;
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case "APPOINTMENT_UPDATE":
        return <span className="type-badge appointment">Appointment</span>;
      case "PRESCRIPTION_REQUEST":
        return <span className="type-badge stock">Prescription</span>;
      case "CONSULTATION_UPDATE":
        return <span className="type-badge patient">Consultation</span>;
      case "DOCTOR_STATUS_UPDATE":
        return <span className="type-badge doctor">Account</span>;
      case "SYSTEM_ALERT":
        return <span className="type-badge system">System</span>;
      default:
        return <span className="type-badge default">General</span>;
    }
  };

  const formatTimeAgo = (dateStr) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: diffDays > 365 ? "numeric" : undefined,
    });
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      const matchesFilter =
        filter === "ALL" ? true : filter === "UNREAD" ? !notification.isRead : notification.isRead;
      const matchesSearch =
        notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notification.message.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [filter, notifications, searchQuery]);

  const stats = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter((item) => !item.isRead).length;
    const appointments = notifications.filter((item) => item.type === "APPOINTMENT_UPDATE").length;
    const clinical = notifications.filter((item) =>
      ["PRESCRIPTION_REQUEST", "CONSULTATION_UPDATE"].includes(item.type)
    ).length;

    return { total, unread, appointments, clinical };
  }, [notifications]);

  return (
    <div className="admin-page-content notif-history-page">
      <div className="notif-header-block">
        <div className="notif-title-area">
          <div className="title-icon-wrapper">
            <Bell size={24} className="title-icon" />
            {stats.unread > 0 && <span className="title-badge">{stats.unread}</span>}
          </div>
          <div>
            <h2 className="page-title">Doctor Notifications</h2>
            <p className="page-subtitle">Track new bookings, clinical requests, and account updates in one place.</p>
          </div>
        </div>

        <div className="notif-header-actions">
          {stats.unread > 0 && (
            <button className="mark-all-btn" onClick={handleMarkAllRead}>
              <CheckCircle2 size={16} />
              Mark all as read
            </button>
          )}
        </div>
      </div>

      <div className="notif-stats-strip">
        <div className="notif-stat-card">
          <div className="stat-icon-box all"><Bell size={20} /></div>
          <div className="stat-text">
            <h4>{stats.total}</h4>
            <p>Total Alerts</p>
          </div>
        </div>
        <div className="notif-stat-card">
          <div className="stat-icon-box unread"><Clock size={20} /></div>
          <div className="stat-text">
            <h4>{stats.unread}</h4>
            <p>Unread</p>
          </div>
        </div>
        <div className="notif-stat-card">
          <div className="stat-icon-box stock"><Activity size={20} /></div>
          <div className="stat-text">
            <h4>{stats.appointments}</h4>
            <p>Appointments</p>
          </div>
        </div>
        <div className="notif-stat-card">
          <div className="stat-icon-box system"><Stethoscope size={20} /></div>
          <div className="stat-text">
            <h4>{stats.clinical}</h4>
            <p>Clinical</p>
          </div>
        </div>
      </div>

      <div className="notif-control-bar">
        <div className="search-pill-large">
          <Search size={18} className="search-icon-glass" />
          <input
            type="text"
            placeholder="Search notifications by title or message..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>

        <div className="filter-tabs">
          {["ALL", "UNREAD", "READ"].map((tab) => (
            <button
              key={tab}
              className={`ftab ${filter === tab ? "active" : ""}`}
              onClick={() => setFilter(tab)}
            >
              {tab === "ALL" ? "All Alerts" : tab === "UNREAD" ? `Unread (${stats.unread})` : "Read"}
            </button>
          ))}
        </div>
      </div>

      <div className="notif-timeline-container">
        {isLoading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading doctor notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="empty-state">
            <Bell size={48} className="empty-icon" />
            <h3>No notifications found</h3>
            <p>
              {filter !== "ALL"
                ? `No ${filter.toLowerCase()} doctor notifications right now.`
                : "You're all caught up. New bookings and requests will appear here."}
            </p>
          </div>
        ) : (
          <div className="timeline-wrapper">
            {filteredNotifications.map((notification, index) => (
              <div
                key={notification._id}
                className={`timeline-card ${!notification.isRead ? "is-unread" : ""} type-${notification.type}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="timeline-connector">
                  <div className={`timeline-dot ${!notification.isRead ? "pulsing-dot" : ""}`} />
                  {index !== filteredNotifications.length - 1 && <div className="timeline-line" />}
                </div>

                <div className="tcard-body">
                  <div className="tcard-icon-slot">
                    {getIconForType(notification.type)}
                  </div>
                  <div className="tcard-info">
                    <div className="tcard-header">
                      <h4>{notification.title}</h4>
                      <span className="tcard-time">{formatTimeAgo(notification.createdAt)}</span>
                    </div>
                    <p>{notification.message}</p>
                    <div className="tcard-footer">
                      <div className="tcard-footer-left">
                        {getTypeBadge(notification.type)}
                        <span className="click-prompt">Open linked workspace →</span>
                      </div>
                      {!notification.isRead && <span className="status-badge new">New</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorNotifications;
