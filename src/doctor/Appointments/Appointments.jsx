import React, { useState, useEffect } from "react";
import { Search, Calendar, Clock, User, X, ReceiptText, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { useSearchParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import "@/doctor/Appointments/Appointments.css";
import api from "@/shared/lib/api";

const CANCELLATION_REASONS = [
  "Doctor unavailable",
  "Emergency schedule change",
  "Clinic unavailable",
  "Patient requested cancellation",
  "Duplicate booking",
  "Other",
];

const DoctorAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [filterStatus, setFilterStatus] = useState("all");
  const [cancelModal, setCancelModal] = useState({
    isOpen: false,
    appointment: null,
    reason: CANCELLATION_REASONS[0],
    customReason: "",
  });

  const fetchDoctorAppointments = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await api.get('/doctor/appointments');
      if (data.success && data.appointments) {
        setAppointments(data.appointments);
      } else {
        setAppointments([]);
      }
    } catch (err) {
      console.error("Error fetching doctor appointments:", err);
      // setError("Failed to fetch appointments"); // Optional: display error
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorAppointments();
  }, []);

  useEffect(() => {
    setSearchTerm(searchParams.get("search") || "");
  }, [searchParams]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch (e) {
      console.error("Error formatting date:", e);
      return "Invalid Date";
    }
  };

  // Filter appointments
  const filteredAppointments = appointments.filter(apt => {
    const matchesSearch = apt.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.reason_for_appointment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.receiptNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || apt.status?.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  const updateAppointmentInList = (updatedAppointment) => {
    if (!updatedAppointment?.id) return;
    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id === updatedAppointment.id ? updatedAppointment : appointment
      )
    );
  };

  const markCompleted = async (appointment) => {
    setActionLoading(`${appointment.id}:completed`);
    setError(null);
    setNotice("");

    try {
      const { data } = await api.put(`/doctor/appointments/${appointment.id}`, {
        status: "completed",
      });
      updateAppointmentInList(data.appointment);
      setNotice("Appointment marked as completed.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update appointment.");
    } finally {
      setActionLoading("");
    }
  };

  const openCancelModal = (appointment) => {
    setCancelModal({
      isOpen: true,
      appointment,
      reason: CANCELLATION_REASONS[0],
      customReason: "",
    });
  };

  const closeCancelModal = () => {
    setCancelModal({
      isOpen: false,
      appointment: null,
      reason: CANCELLATION_REASONS[0],
      customReason: "",
    });
  };

  const submitCancellation = async () => {
    const appointment = cancelModal.appointment;
    if (!appointment) return;

    const reasonText =
      cancelModal.reason === "Other"
        ? cancelModal.customReason.trim()
        : cancelModal.reason;

    if (!reasonText) {
      setError("Please select or enter a cancellation reason.");
      return;
    }

    setActionLoading(`${appointment.id}:cancelled`);
    setError(null);
    setNotice("");

    try {
      const { data } = await api.put(`/doctor/appointments/${appointment.id}`, {
        status: "cancelled",
        reason: cancelModal.reason,
        customReason: cancelModal.customReason,
      });
      updateAppointmentInList(data.appointment);
      setNotice("Appointment cancelled and patient notified.");
      closeCancelModal();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to cancel appointment.");
    } finally {
      setActionLoading("");
    }
  };

  const canCancel = (appointment) =>
    ["pending", "confirmed"].includes(String(appointment.status || "").toLowerCase());

  const canComplete = (appointment) =>
    String(appointment.status || "").toLowerCase() === "confirmed";

  return (
    <div className="appointments-page">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <h2 className="page-title">Appointments</h2>
            <p className="page-subtitle">Manage your patient appointments</p>
          </div>
          <button
            type="button"
            className="appointments-refresh-btn"
            onClick={fetchDoctorAppointments}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? "spin-icon" : ""} />
            Refresh
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="alert alert-error">
            <X size={20} />
            <span>{error}</span>
          </div>
        )}
        {notice && (
          <div className="alert alert-success">
            <CheckCircle size={20} />
            <span>{notice}</span>
          </div>
        )}

        {/* Search and Filter */}
        <div className="filter-section">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder=""
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-controls">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>

        {/* Appointments Table */}
        <div className="appointments-card">
          <div className="table-container">
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading appointments...</p>
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="empty-state">
                <Calendar size={48} color="#9ca3af" />
                <h3>No appointments found</h3>
                <p>
                  {searchTerm || filterStatus !== "all"
                    ? "Try adjusting your filters"
                    : "You don't have any appointments yet"}
                </p>
              </div>
            ) : (
              <table className="appointments-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Visit</th>
                    <th>Queue</th>
                    <th>Receipt</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.map((appointment) => (
                    <tr 
                      key={appointment.id} 
                      onClick={() => navigate(`/doctor/appointments/${appointment.id}`)}
                      style={{ cursor: 'pointer' }}
                      className="clickable-row"
                    >
                      <td>
                        <div className="patient-cell">
                          <div className="patient-avatar">
                            <User size={16} />
                          </div>
                          <span className="patient-name">{appointment.patientName}</span>
                        </div>
                      </td>
                      <td>
                        <div className="date-cell">
                          <Calendar size={14} />
                          <span>{formatDate(appointment.date)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="time-cell">
                          <Clock size={14} />
                          <span>{appointment.timeSlot}</span>
                        </div>
                      </td>
                      <td className="reason-cell">
                        {appointment.specialty || appointment.reason_for_appointment || 'Physical consultation'}
                        {appointment.venueName ? <small>{appointment.venueName}</small> : null}
                      </td>
                      <td>
                        <span className="queue-pill">#{appointment.queueNumber || 'Pending'}</span>
                      </td>
                      <td>
                        <div className="receipt-cell">
                          <ReceiptText size={14} />
                          <span>{appointment.receiptNumber || 'Pending'}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge status-${appointment.status?.toLowerCase()}`}>
                          {appointment.status}
                        </span>
                        {appointment.statusReason ? (
                          <small className="status-reason">{appointment.statusReason}</small>
                        ) : null}
                      </td>
                      <td>
                        <div className="appointment-actions" onClick={(e) => e.stopPropagation()}>
                          {canComplete(appointment) && (
                            <button
                              className="btn-confirm"
                              disabled={actionLoading === `${appointment.id}:completed`}
                              onClick={() => markCompleted(appointment)}
                              type="button"
                            >
                              <CheckCircle size={14} />
                              {actionLoading === `${appointment.id}:completed` ? "Saving" : "Complete"}
                            </button>
                          )}
                          {canCancel(appointment) && (
                            <button
                              className="btn-cancel"
                              disabled={actionLoading === `${appointment.id}:cancelled`}
                              onClick={() => openCancelModal(appointment)}
                              type="button"
                            >
                              <XCircle size={14} />
                              Cancel
                            </button>
                          )}
                          {!canComplete(appointment) && !canCancel(appointment) && (
                            <span className="text-gray">No action</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        {cancelModal.isOpen && (
          <div className="appointment-modal-backdrop">
            <div className="appointment-modal">
              <div className="appointment-modal-header">
                <div>
                  <h3>Cancel booking</h3>
                  <p>{cancelModal.appointment?.patientName} · {formatDate(cancelModal.appointment?.date)} at {cancelModal.appointment?.timeSlot}</p>
                </div>
                <button onClick={closeCancelModal} type="button">
                  <X size={18} />
                </button>
              </div>

              <label className="modal-field">
                Reason
                <select
                  value={cancelModal.reason}
                  onChange={(event) =>
                    setCancelModal((current) => ({ ...current, reason: event.target.value }))
                  }
                >
                  {CANCELLATION_REASONS.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </label>

              {cancelModal.reason === "Other" && (
                <label className="modal-field">
                  Custom reason
                  <textarea
                    maxLength={240}
                    onChange={(event) =>
                      setCancelModal((current) => ({ ...current, customReason: event.target.value }))
                    }
                    placeholder="Briefly explain why this booking is being cancelled"
                    value={cancelModal.customReason}
                  />
                </label>
              )}

              <div className="appointment-modal-actions">
                <button className="modal-secondary" onClick={closeCancelModal} type="button">
                  Keep booking
                </button>
                <button
                  className="modal-danger"
                  disabled={actionLoading === `${cancelModal.appointment?.id}:cancelled`}
                  onClick={submitCancellation}
                  type="button"
                >
                  {actionLoading === `${cancelModal.appointment?.id}:cancelled`
                    ? "Cancelling..."
                    : "Cancel and notify patient"}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default DoctorAppointments;
