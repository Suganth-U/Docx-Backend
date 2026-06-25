import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Clock, 
  MapPin, 
  Stethoscope, 
  ReceiptText,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
  Phone,
  Mail,
  FileText,
  Activity,
  History,
  X
} from "lucide-react";
import { format } from "date-fns";
import api from "@/shared/lib/api";
import "./AppointmentDetails.css";

const CANCELLATION_REASONS = [
  "Doctor unavailable",
  "Emergency schedule change",
  "Clinic unavailable",
  "Patient requested cancellation",
  "Duplicate booking",
  "Other",
];

const AppointmentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Cancel Modal State
  const [cancelModal, setCancelModal] = useState({
    isOpen: false,
    reason: CANCELLATION_REASONS[0],
    customReason: "",
  });

  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/doctor/appointments');
        if (data.success && data.appointments) {
          const found = data.appointments.find(apt => apt.id === id);
          if (found) {
            setAppointment(found);
          } else {
            setError("Appointment not found. It might have been deleted.");
          }
        } else {
          setError("Failed to load appointments");
        }
      } catch (err) {
        console.error("Error fetching appointment:", err);
        setError("Error loading appointment details. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };

    fetchAppointment();
  }, [id]);

  const formatDate = (dateString, formatStr = "MMMM dd, yyyy") => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), formatStr);
    } catch (e) {
      return "Invalid Date";
    }
  };

  const markCompleted = async () => {
    try {
      setActionLoading(true);
      const { data } = await api.put(`/doctor/appointments/${id}`, {
        status: "completed",
      });
      setAppointment(data.appointment);
      setNotice("Appointment successfully marked as completed.");
      setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to complete appointment");
      setTimeout(() => setError(null), 4000);
    } finally {
      setActionLoading(false);
    }
  };

  const openCancelModal = () => {
    setCancelModal({
      isOpen: true,
      reason: CANCELLATION_REASONS[0],
      customReason: "",
    });
  };

  const closeCancelModal = () => {
    setCancelModal({ ...cancelModal, isOpen: false });
  };

  const submitCancellation = async () => {
    const reasonText = cancelModal.reason === "Other" 
      ? cancelModal.customReason.trim() 
      : cancelModal.reason;

    if (!reasonText) {
      alert("Please provide a reason for cancellation.");
      return;
    }

    try {
      setActionLoading(true);
      const { data } = await api.put(`/doctor/appointments/${id}`, {
        status: "cancelled",
        reason: cancelModal.reason,
        customReason: cancelModal.customReason,
      });
      setAppointment(data.appointment);
      setNotice("Appointment cancelled. The patient has been notified via email, and the admin has been alerted to initiate any necessary refunds.");
      closeCancelModal();
      setTimeout(() => setNotice(null), 6000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to cancel appointment");
      setTimeout(() => setError(null), 4000);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="appt-details-loading">
        <div className="spinner"></div>
        <p>Loading comprehensive details...</p>
      </div>
    );
  }

  if (error && !appointment) {
    return (
      <div className="appt-details-error">
        <AlertCircle size={48} color="#ef4444" />
        <h2>{error}</h2>
        <button onClick={() => navigate('/doctor/appointments')} className="btn-back">
          Back to Appointments
        </button>
      </div>
    );
  }

  const isConfirmed = String(appointment.status || "").toLowerCase() === "confirmed";
  const canCancel = ["pending", "confirmed"].includes(String(appointment.status || "").toLowerCase());
  const isCancelled = String(appointment.status || "").toLowerCase() === "cancelled";

  return (
    <div className="appt-details-full-page">
      {/* Toast Notifications */}
      {notice && (
        <div className="toast-notification success">
          <CheckCircle size={20} />
          <span>{notice}</span>
        </div>
      )}
      {error && (
        <div className="toast-notification error">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="appt-details-hero">
        <div className="hero-top-bar">
          <button onClick={() => navigate('/doctor/appointments')} className="btn-icon-back">
            <ArrowLeft size={20} />
            <span>Back to Appointments List</span>
          </button>
          <div className="appt-actions">
            {isConfirmed && (
              <button 
                className="btn-complete" 
                onClick={markCompleted}
                disabled={actionLoading}
              >
                <CheckCircle size={18} /> {actionLoading ? "Processing..." : "Complete Visit"}
              </button>
            )}
            {canCancel && (
              <button 
                className="btn-cancel-appt" 
                onClick={openCancelModal}
                disabled={actionLoading}
              >
                <XCircle size={18} /> Cancel Booking
              </button>
            )}
          </div>
        </div>

        <div className="hero-content">
          <div className="hero-patient">
            <div className="hero-avatar">
              {appointment.patientName?.charAt(0).toUpperCase()}
            </div>
            <div className="hero-patient-meta">
              <h1>{appointment.patientName}</h1>
              <div className="hero-contact-row">
                {appointment.patientEmail && (
                  <span className="contact-chip"><Mail size={14}/> {appointment.patientEmail}</span>
                )}
                <span className="contact-chip"><Phone size={14}/> Patient Contact</span>
              </div>
            </div>
          </div>
          <div className="hero-status">
            <div className="status-banner">
              <span className={`status-dot dot-${appointment.status?.toLowerCase()}`}></span>
              <span className="status-text">{appointment.status?.toUpperCase()}</span>
            </div>
            {isCancelled && (
              <p className="refund-notice">
                <AlertCircle size={14}/> Admin review pending for refund processing
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Layout - Full Width */}
      <div className="appt-content-layout">
        
        {/* Left Column - Clinical & Vitals */}
        <div className="content-left">
          <div className="detail-card">
            <div className="card-header-clean">
              <Stethoscope size={22} className="icon-purple" />
              <h2>Clinical Overview</h2>
            </div>
            <div className="card-body">
              <div className="data-group">
                <label>Primary Reason for Visit</label>
                <div className="reason-box">
                  {appointment.reason_for_appointment || appointment.specialty || "General physical consultation"}
                </div>
              </div>
              
              <div className="data-grid-2">
                <div className="data-item">
                  <span className="data-icon"><Activity size={16}/></span>
                  <div>
                    <label>Consultation Type</label>
                    <p>{appointment.type === "PHYSICAL" ? "In-Person Visit" : "Virtual Consultation"}</p>
                  </div>
                </div>
                <div className="data-item">
                  <span className="data-icon"><History size={16}/></span>
                  <div>
                    <label>Last Updated</label>
                    <p>{appointment.statusUpdatedAt ? formatDate(appointment.statusUpdatedAt, "MMM dd, hh:mm a") : "Recently"}</p>
                  </div>
                </div>
              </div>

              {appointment.statusReason && (
                <div className="status-reason-alert">
                  <strong>Notes:</strong> {appointment.statusReason}
                </div>
              )}
            </div>
          </div>

          <div className="detail-card">
            <div className="card-header-clean">
              <FileText size={22} className="icon-blue" />
              <h2>Pre-Visit Notes & History</h2>
            </div>
            <div className="card-body">
              <p className="empty-text">No pre-visit documents or past consultation notes found for this appointment.</p>
              <button className="btn-secondary-outline mt-4">
                View Full Patient Record
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Logistics & Admin */}
        <div className="content-right">
          <div className="detail-card">
            <div className="card-header-clean">
              <Calendar size={22} className="icon-green" />
              <h2>Schedule & Venue</h2>
            </div>
            <div className="card-body list-style">
              <div className="list-item">
                <Calendar size={18} className="text-gray" />
                <div>
                  <label>Date of Appointment</label>
                  <p>{formatDate(appointment.date, "EEEE, MMMM dd, yyyy")}</p>
                </div>
              </div>
              <div className="list-item">
                <Clock size={18} className="text-gray" />
                <div>
                  <label>Reserved Time Slot</label>
                  <p className="highlight-text">{appointment.timeSlot}</p>
                </div>
              </div>
              {appointment.type === 'PHYSICAL' && (
                <div className="list-item">
                  <MapPin size={18} className="text-gray" />
                  <div>
                    <label>Clinic Location</label>
                    <p>{appointment.venueName || "Main Hospital Branch"}</p>
                  </div>
                </div>
              )}
              {appointment.queueNumber && (
                <div className="list-item">
                  <Users size={18} className="text-gray" />
                  <div>
                    <label>Queue Position</label>
                    <p className="queue-badge">Token #{appointment.queueNumber}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="detail-card">
            <div className="card-header-clean">
              <ReceiptText size={22} className="icon-orange" />
              <h2>Administrative & Billing</h2>
            </div>
            <div className="card-body list-style">
              <div className="list-item">
                <CreditCard size={18} className="text-gray" />
                <div>
                  <label>Payment Status</label>
                  <div style={{marginTop: '4px'}}>
                    <span className={`payment-pill pay-${appointment.paymentStatus?.toLowerCase()}`}>
                      {appointment.paymentStatus || "Pending"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="list-item">
                <ReceiptText size={18} className="text-gray" />
                <div>
                  <label>Receipt Reference</label>
                  <p className="mono-text">{appointment.receiptNumber || "Pending Generation"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Cancellation Modal */}
      {cancelModal.isOpen && (
        <div className="appt-modal-backdrop">
          <div className="appt-modal">
            <div className="appt-modal-header">
              <div>
                <h3>Cancel Appointment</h3>
                <p>Notify patient and alert admin for refund processing.</p>
              </div>
              <button onClick={closeCancelModal} className="btn-close-modal">
                <X size={20} />
              </button>
            </div>

            <div className="appt-modal-body">
              <div className="form-group">
                <label>Reason for Cancellation</label>
                <select
                  className="form-select"
                  value={cancelModal.reason}
                  onChange={(e) => setCancelModal({ ...cancelModal, reason: e.target.value })}
                >
                  {CANCELLATION_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {cancelModal.reason === "Other" && (
                <div className="form-group slide-down">
                  <label>Please specify the reason</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Provide details for the patient and administration..."
                    rows={4}
                    value={cancelModal.customReason}
                    onChange={(e) => setCancelModal({ ...cancelModal, customReason: e.target.value })}
                  />
                </div>
              )}
              
              <div className="cancellation-warning">
                <AlertCircle size={16} />
                <p>Once cancelled, this action cannot be undone. Admin will automatically receive a request to process refunds for paid bookings.</p>
              </div>
            </div>

            <div className="appt-modal-footer">
              <button className="btn-modal-cancel" onClick={closeCancelModal}>
                Keep Appointment
              </button>
              <button 
                className="btn-modal-confirm-danger" 
                onClick={submitCancellation}
                disabled={actionLoading}
              >
                {actionLoading ? "Processing..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Users icon component for queue
const Users = ({size, className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

export default AppointmentDetails;
