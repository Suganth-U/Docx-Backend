import React, { useState, useEffect } from "react";
import { Search, CalendarDays, Stethoscope, Clock, Monitor, Building2, CreditCard, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useSearchParams } from "react-router-dom";
import useAxiosPrivate from "@/shared/hooks/useAxiosPrivate";
import "@/admin/Appointments/Appointments.css";

const AdminAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || '');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const axiosPrivate = useAxiosPrivate();
  const statusTabs = ['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'EXPIRED'];
  const lower = (value = '') => String(value || '').toLowerCase();

  useEffect(() => {
    fetchAppointments();
  }, []);

  useEffect(() => {
    setSearchQuery(searchParams.get("search") || "");
  }, [searchParams]);

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const { data } = await axiosPrivate.get("/admin/appointments");
      setAppointments(data);
    } catch (error) {
      console.error("Failed to fetch appointments", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAppointments = appointments.filter(app => {
    const search = searchQuery.toLowerCase();
    const matchesSearch =
      lower(app.doctorName).includes(search) ||
      lower(app.patientName).includes(search) ||
      lower(app.hospital).includes(search) ||
      lower(app.specialization).includes(search) ||
      lower(app.statusReason).includes(search);

    const matchesFilter = activeFilter === 'ALL' ? true : app.status === activeFilter.toLowerCase();

    return matchesSearch && matchesFilter;
  });

  const formatPaymentStatus = (status = "") => {
    const value = String(status || "").toLowerCase();
    if (value === "paid") return "Paid";
    if (value === "pending") return "Pending";
    if (value === "failed") return "Failed";
    if (value === "canceled") return "Canceled";
    if (value === "expired") return "Expired";
    return "Unknown";
  };

  const statusCounts = {
    pending: appointments.filter(a => a.status === 'pending').length,
    confirmed: appointments.filter(a => a.status === 'confirmed').length,
    completed: appointments.filter(a => a.status === 'completed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
    expired: appointments.filter(a => a.status === 'expired').length,
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed': return <CheckCircle size={13} />;
      case 'completed': return <CheckCircle size={13} />;
      case 'cancelled': return <XCircle size={13} />;
      case 'expired': return <AlertCircle size={13} />;
      default: return <Clock size={13} />;
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  return (
    <div className="admin-page-content premium-user-page">
      {/* Header Block */}
      <div className="premium-header-block">
        <div className="title-area">
          <div className="title-icon-wrapper appt-icon-wrapper">
            <CalendarDays size={28} className="appt-icon" />
          </div>
          <div>
            <h2 className="page-title">Appointment Management</h2>
            <p className="page-subtitle">Monitor, track, and manage all patient-doctor appointments across the platform.</p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="appt-stats-row">
        <div className="appt-stat-card">
          <span className="appt-stat-num">{appointments.length}</span>
          <span className="appt-stat-label">Total</span>
        </div>
        <div className="appt-stat-card st-pending">
          <span className="appt-stat-num">{statusCounts.pending}</span>
          <span className="appt-stat-label">Pending</span>
        </div>
        <div className="appt-stat-card st-confirmed">
          <span className="appt-stat-num">{statusCounts.confirmed}</span>
          <span className="appt-stat-label">Confirmed</span>
        </div>
        <div className="appt-stat-card st-completed">
          <span className="appt-stat-num">{statusCounts.completed}</span>
          <span className="appt-stat-label">Completed</span>
        </div>
        <div className="appt-stat-card st-cancelled">
          <span className="appt-stat-num">{statusCounts.cancelled}</span>
          <span className="appt-stat-label">Cancelled</span>
        </div>
        <div className="appt-stat-card st-expired">
          <span className="appt-stat-num">{statusCounts.expired}</span>
          <span className="appt-stat-label">Expired</span>
        </div>
      </div>

      {/* Control Bar */}
      <div className="premium-control-bar">
        <div className="search-pill-large">
          <Search size={18} className="search-icon-glass" />
          <input
            type="text"
            placeholder="Search by doctor, patient, hospital, or specialty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-tabs">
          {statusTabs.map(tab => (
            <button
              key={tab}
              className={`ftab ${activeFilter === tab ? 'active' : ''}`}
              onClick={() => setActiveFilter(tab)}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
              {tab !== 'ALL' && statusCounts[tab.toLowerCase()] > 0 && (
                <span className="tab-count">{statusCounts[tab.toLowerCase()]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="premium-table-container">
        {isLoading ? (
          <div className="loading-state">
            <div className="spinner-blue"></div>
            <p>Loading appointments...</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="empty-state">
            <CalendarDays size={48} className="empty-icon" />
            <h3>No appointments found</h3>
            <p>Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Hospital</th>
                  <th>Date & Slot</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map(app => (
                  <tr key={app._id} className="table-row">
                    <td>
                      <div className="user-cell">
                        <div className="avatar-circle appt-avatar">
                          {app.patientName.charAt(0).toUpperCase()}
                        </div>
                        <div className="user-meta">
                          <h4>{app.patientName}</h4>
                          <span>{app.patientEmail}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="appt-doc-cell">
                        <span className="appt-doc-name">{app.doctorName}</span>
                        <span className="appt-doc-spec">
                          <Stethoscope size={12} />
                          {app.specialization}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="appt-hospital-badge">
                        <Building2 size={12} />
                        {app.hospital}
                      </span>
                    </td>
                    <td>
                      <div className="appt-datetime">
                        <span className="appt-date">
                          <CalendarDays size={12} />
                          {formatDate(app.date)}
                        </span>
                        <span className="appt-time">
                          <Clock size={12} />
                          {app.timeSlot}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`appt-type-badge ${app.type?.toLowerCase()}`}>
                        {app.type === 'VIRTUAL' ? <Monitor size={12} /> : <Building2 size={12} />}
                        {app.type}
                        {app.type === 'PHYSICAL' && app.tokenNumber && (
                          <span className="token-num">#{app.tokenNumber}</span>
                        )}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill ${app.status}`}>
                        {getStatusIcon(app.status)}
                        {app.status}
                      </span>
                    </td>
                    <td>
                      <div className="appt-status-reason">
                        {app.statusReason || 'No status reason'}
                        {app.statusUpdatedAt && (
                          <span>{formatDate(app.statusUpdatedAt)} · {app.statusUpdatedByRole || 'system'}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`appt-payment-badge ${app.paymentStatus}`}>
                        <CreditCard size={12} />
                        {formatPaymentStatus(app.paymentStatus)}
                        {app.consultationFee > 0 && (
                          <span className="fee-amount">LKR {app.consultationFee}</span>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAppointments;
