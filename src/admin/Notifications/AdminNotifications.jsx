import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    Bell, AlertTriangle, UserPlus, PackageSearch, Activity, Info,
    CheckCircle2, Search, Clock, ShieldAlert, Stethoscope
} from 'lucide-react';
import useAxiosPrivate from "@/shared/hooks/useAxiosPrivate";
import "@/admin/Notifications/AdminNotifications.css";

const AdminNotifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    const axiosPrivate = useAxiosPrivate();
    const navigate = useNavigate();

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        setIsLoading(true);
        try {
            const { data } = await axiosPrivate.get("/admin/notifications");
            setNotifications(data);
        } catch (error) {
            console.error("Failed to fetch notification history", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleNotificationClick = async (notif) => {
        navigate(notif.link);
        if (!notif.isRead) {
            try {
                await axiosPrivate.put(`/admin/notifications/${notif._id}/read`);
                setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
            } catch (error) {
                console.error("Failed to mark notification as read", error);
            }
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await axiosPrivate.put("/admin/notifications/read-all");
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (error) {
            console.error("Failed to mark all as read", error);
        }
    };

    const getIconForType = (type) => {
        switch (type) {
            case 'PATIENT_REGISTRATION':
                return <div className="hist-icon bg-blue-light"><UserPlus size={20} className="txt-blue" /></div>;
            case 'DOCTOR_APPROVAL':
                return <div className="hist-icon bg-indigo-light"><Stethoscope size={20} className="txt-indigo" /></div>;
            case 'LOW_STOCK_ALERT':
                return <div className="hist-icon bg-amber-light"><PackageSearch size={20} className="txt-amber" /></div>;
            case 'APPOINTMENT_UPDATE':
                return <div className="hist-icon bg-green-light"><Activity size={20} className="txt-green" /></div>;
            case 'SYSTEM_ALERT':
                return <div className="hist-icon bg-red-light"><ShieldAlert size={20} className="txt-red" /></div>;
            default:
                return <div className="hist-icon bg-gray-light"><Info size={20} className="txt-gray" /></div>;
        }
    };

    const getTypeBadge = (type) => {
        switch (type) {
            case 'PATIENT_REGISTRATION':
                return <span className="type-badge patient">Patient</span>;
            case 'DOCTOR_APPROVAL':
                return <span className="type-badge doctor">Doctor</span>;
            case 'LOW_STOCK_ALERT':
                return <span className="type-badge stock">Low Stock</span>;
            case 'APPOINTMENT_UPDATE':
                return <span className="type-badge appointment">Appointment</span>;
            case 'SYSTEM_ALERT':
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

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: diffDays > 365 ? 'numeric' : undefined });
    };

    // ─── Derived data ───
    const filteredNotifications = useMemo(() => {
        return notifications.filter(notif => {
            const matchesFilter = filter === 'ALL' ? true : filter === 'UNREAD' ? !notif.isRead : notif.isRead;
            const matchesSearch = notif.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                notif.message.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesFilter && matchesSearch;
        });
    }, [notifications, filter, searchQuery]);

    const stats = useMemo(() => {
        const total = notifications.length;
        const unread = notifications.filter(n => !n.isRead).length;
        const lowStock = notifications.filter(n => n.type === 'LOW_STOCK_ALERT').length;
        const system = notifications.filter(n => n.type === 'SYSTEM_ALERT').length;
        return { total, unread, lowStock, system };
    }, [notifications]);

    return (
        <div className="admin-page-content notif-history-page">

            {/* ─── Header ─── */}
            <div className="notif-header-block">
                <div className="notif-title-area">
                    <div className="title-icon-wrapper">
                        <Bell size={24} className="title-icon" />
                        {stats.unread > 0 && <span className="title-badge">{stats.unread}</span>}
                    </div>
                    <div>
                        <h2 className="page-title">Alert History</h2>
                        <p className="page-subtitle">Track and manage all system events and notifications.</p>
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

            {/* ─── Stats Strip ─── */}
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
                    <div className="stat-icon-box stock"><PackageSearch size={20} /></div>
                    <div className="stat-text">
                        <h4>{stats.lowStock}</h4>
                        <p>Stock Alerts</p>
                    </div>
                </div>
                <div className="notif-stat-card">
                    <div className="stat-icon-box system"><ShieldAlert size={20} /></div>
                    <div className="stat-text">
                        <h4>{stats.system}</h4>
                        <p>System Alerts</p>
                    </div>
                </div>
            </div>

            {/* ─── Control Bar ─── */}
            <div className="notif-control-bar">
                <div className="search-pill-large">
                    <Search size={18} className="search-icon-glass" />
                    <input
                        type="text"
                        placeholder="Search alerts by title or message..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="filter-tabs">
                    {['ALL', 'UNREAD', 'READ'].map(f => (
                        <button
                            key={f}
                            className={`ftab ${filter === f ? 'active' : ''}`}
                            onClick={() => setFilter(f)}
                        >
                            {f === 'ALL' ? 'All Alerts' : f === 'UNREAD' ? `Unread (${stats.unread})` : 'Read'}
                        </button>
                    ))}
                </div>
            </div>

            {/* ─── Timeline ─── */}
            <div className="notif-timeline-container">
                {isLoading ? (
                    <div className="loading-state">
                        <div className="spinner" />
                        <p>Loading alert history...</p>
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="empty-state">
                        <Bell size={48} className="empty-icon" />
                        <h3>No alerts found</h3>
                        <p>
                            {filter !== 'ALL'
                                ? `No ${filter.toLowerCase()} notifications at the moment.`
                                : "You're all caught up. No system notifications right now."}
                        </p>
                    </div>
                ) : (
                    <div className="timeline-wrapper">
                        {filteredNotifications.map((notif, index) => (
                            <div
                                key={notif._id}
                                className={`timeline-card ${!notif.isRead ? 'is-unread' : ''} type-${notif.type}`}
                                onClick={() => handleNotificationClick(notif)}
                            >
                                {/* Timeline Connector */}
                                <div className="timeline-connector">
                                    <div className={`timeline-dot ${!notif.isRead ? 'pulsing-dot' : ''}`} />
                                    {index !== filteredNotifications.length - 1 && <div className="timeline-line" />}
                                </div>

                                {/* Card Body */}
                                <div className="tcard-body">
                                    <div className="tcard-icon-slot">
                                        {getIconForType(notif.type)}
                                    </div>
                                    <div className="tcard-info">
                                        <div className="tcard-header">
                                            <h4>{notif.title}</h4>
                                            <span className="tcard-time">{formatTimeAgo(notif.createdAt)}</span>
                                        </div>
                                        <p>{notif.message}</p>
                                        <div className="tcard-footer">
                                            <div className="tcard-footer-left">
                                                {getTypeBadge(notif.type)}
                                                <span className="click-prompt">View details →</span>
                                            </div>
                                            {!notif.isRead && <span className="status-badge new">New</span>}
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

export default AdminNotifications;
