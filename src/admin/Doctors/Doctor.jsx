import React, { useCallback, useState, useEffect } from "react";
import {
  Search,
  Plus,
  Trash2,
  X,
  Activity,
  CheckCircle,
  Eye,
  Clock,
  BadgeCheck,
  AlertTriangle,
  Ban,
  Unlock,
} from 'lucide-react';
import { useSearchParams } from "react-router-dom";
import useAxiosPrivate from "@/shared/hooks/useAxiosPrivate";
import StatusModal from "@/shared/components/common/StatusModal";
import ConfirmModal from "@/shared/components/ui/ConfirmModal";
import FieldError from "@/shared/components/common/FieldError";
import { clearFieldError, isValidEmail, validateRequiredFields } from "@/shared/lib/formValidation";
import "@/admin/Doctors/Doctor.css"; // We will inject premium styles here

const getDoctorBaseName = (name) =>
  String(name || "Unknown")
    .trim()
    .replace(/^(dr\.?\s+)+/i, "")
    .trim() || "Unknown";

const formatDoctorName = (name) => `Dr. ${getDoctorBaseName(name)}`;

const DECLINE_REASONS = [
  "License document is unclear",
  "License ID could not be verified",
  "NIC details do not match",
  "Specialization or facility details need correction",
  "Other",
];

const getStatusIcon = (status) => {
  const normalized = String(status || 'pending').toLowerCase();

  if (normalized === 'active') return <CheckCircle size={14} />;
  if (normalized === 'blocked') return <Ban size={14} />;
  if (normalized === 'rejected') return <AlertTriangle size={14} />;
  return <Clock size={14} />;
};

const AdminDoctorManagement = () => {
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, ACTIVE, PENDING
  const [doctors, setDoctors] = useState([]);
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || '');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [declineForm, setDeclineForm] = useState({ reason: "", details: "" });
  const [isDeclining, setIsDeclining] = useState(false);

  const [statusModal, setStatusModal] = useState({ isOpen: false, type: 'success', message: '' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [formData, setFormData] = useState({ name: "", email: "", password: "", specialization: "", hospitalName: "", experience: "", fees: "" });
  const [fieldErrors, setFieldErrors] = useState({});

  const axiosPrivate = useAxiosPrivate();

  const fetchDoctors = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await axiosPrivate.get("/admin/doctors");
      setDoctors(data);
    } catch (error) {
      console.error("Failed to fetch doctors", error);
    } finally {
      setIsLoading(false);
    }
  }, [axiosPrivate]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  useEffect(() => {
    setSearchQuery(searchParams.get("search") || "");
  }, [searchParams]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    clearFieldError(setFieldErrors, e.target.name);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validateRequiredFields(formData, {
      name: "Full name",
      email: "Email address",
      password: "Temporary password",
      specialization: "Specialization",
      hospitalName: "Facility affiliation",
      experience: "Years of practice",
      fees: "Consultation base fee",
    });
    if (formData.email && !isValidEmail(formData.email)) {
      nextErrors.email = "Enter a valid email address.";
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      return;
    }

    try {
      await axiosPrivate.post('/doctor', formData);
      setShowAddModal(false);
      fetchDoctors();
      setFormData({ name: "", email: "", password: "", specialization: "", hospitalName: "", experience: "", fees: "" });
      setFieldErrors({});
      setStatusModal({ isOpen: true, type: 'success', message: "Doctor added successfully." });
    } catch {
      setStatusModal({ isOpen: true, type: 'error', message: "Failed to add doctor." });
    }
  };

  const handleDelete = async (id, name) => {
    setConfirmModal({
      isOpen: true,
      title: `Remove ${formatDoctorName(name)}?`,
      message: 'This permanently removes the doctor account plus related appointments, schedules, consultations, prescriptions, messages, notifications, and verification files. This action cannot be undone.',
      onConfirm: async () => {
        try {
          await axiosPrivate.delete(`/admin/users/${id}`);
          setDoctors(prev => prev.filter(d => d._id !== id));
        } catch {
          setStatusModal({ isOpen: true, type: 'error', message: "Failed to delete completely." });
        }
      }
    });
  };

  const handleApprove = async (id) => {
    try {
      await axiosPrivate.put(`/admin/approve-doctor/${id}`);
      setStatusModal({ isOpen: true, type: 'success', message: 'Doctor Approved Successfully!' });
      setShowDetailsModal(false);
      fetchDoctors();
    } catch {
      setStatusModal({ isOpen: true, type: 'error', message: 'Failed to approve doctor.' });
    }
  };

  const openDeclineModal = () => {
    setDeclineForm({ reason: "", details: "" });
    setShowDeclineModal(true);
  };

  const closeDeclineModal = () => {
    if (isDeclining) return;
    setShowDeclineModal(false);
    setDeclineForm({ reason: "", details: "" });
  };

  const buildDeclineReason = () => {
    const reason = declineForm.reason.trim();
    const details = declineForm.details.trim();

    if (reason === "Other") {
      return details;
    }

    return [reason, details].filter(Boolean).join(" - ");
  };

  const handleReject = async () => {
    if (!selectedDoctor?._id) return;

    const rejectionReason = buildDeclineReason();

    if (!declineForm.reason || !rejectionReason) {
      setStatusModal({
        isOpen: true,
        type: 'error',
        message: 'Choose a decline reason or add a note before sending.',
      });
      return;
    }

    setIsDeclining(true);
    try {
      await axiosPrivate.put(`/admin/reject-doctor/${selectedDoctor._id}`, { rejectionReason });
      setStatusModal({
        isOpen: true,
        type: 'success',
        message: 'Doctor application declined and email sent.',
      });
      setShowDeclineModal(false);
      setShowDetailsModal(false);
      setDeclineForm({ reason: "", details: "" });
      fetchDoctors();
    } catch {
      setStatusModal({ isOpen: true, type: 'error', message: 'Failed to decline doctor.' });
    } finally {
      setIsDeclining(false);
    }
  };

  const handleBlockToggle = (doctor) => {
    const isBlocked = doctor.status?.toLowerCase() === 'blocked';

    setConfirmModal({
      isOpen: true,
      title: isBlocked ? `Restore ${formatDoctorName(doctor.name)}?` : `Block ${formatDoctorName(doctor.name)}?`,
      message: isBlocked
        ? 'This restores the doctor to their previous account status. If they were active before blocking, they can sign in again.'
        : 'This immediately blocks the doctor from signing in, clears active refresh sessions, and removes them from patient booking options.',
      confirmText: isBlocked ? 'Restore account' : 'Block account',
      variant: isBlocked ? 'success' : 'warning',
      onConfirm: async () => {
        try {
          const endpoint = isBlocked ? 'unblock' : 'block';
          const { data } = await axiosPrivate.put(`/admin/users/${doctor._id}/${endpoint}`);
          setStatusModal({
            isOpen: true,
            type: 'success',
            message: data?.message || (isBlocked ? 'Doctor account restored.' : 'Doctor account blocked.'),
          });
          fetchDoctors();
        } catch (error) {
          setStatusModal({
            isOpen: true,
            type: 'error',
            message: error.response?.data?.message || 'Could not update doctor account status.',
          });
        }
      },
    });
  };

  // derived lists
  const filteredDoctors = doctors.filter(doc => {
    // Both user status and 'pending' string checks
    const s = doc.status?.toLowerCase() || 'pending';
    const matchesTab = activeTab === 'ALL' ? true : s === activeTab.toLowerCase();
    const searchMatch = (doc.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.specialization || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && searchMatch;
  });

  const pendingCount = doctors.filter(d => d.status?.toLowerCase() === 'pending').length;
  const blockedCount = doctors.filter(d => d.status?.toLowerCase() === 'blocked').length;

  return (
    <div className="admin-page-content premium-user-page">
      {/* Header Block */}
      <div className="premium-header-block">
        <div className="title-area">
          <div className="title-icon-wrapper bg-purple-solid">
            <Activity size={28} className="txt-white" />
          </div>
          <div>
            <h2 className="page-title">Doctor Directory</h2>
            <p className="page-subtitle">Manage medical personnel, approve clinical applications, and verify licenses.</p>
          </div>
        </div>
        <button className="add-premium-btn" onClick={() => setShowAddModal(true)}>
          <Plus size={18} /> Add New Doctor
        </button>
      </div>

      {/* Control Bar */}
      <div className="premium-control-bar">
        <div className="search-pill-large">
          <Search size={18} className="search-icon-glass" />
          <input
            type="text"
            placeholder="Search doctors by name, email, or specialty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-tabs">
          <button className={`ftab ${activeTab === 'ALL' ? 'active' : ''}`} onClick={() => setActiveTab('ALL')}>
            All Doctors
          </button>
          <button className={`ftab ${activeTab === 'ACTIVE' ? 'active' : ''}`} onClick={() => setActiveTab('ACTIVE')}>
            Active
          </button>
          <button className={`ftab ${activeTab === 'PENDING' ? 'active' : ''}`} onClick={() => setActiveTab('PENDING')}>
            Pending Approvals {pendingCount > 0 && <span className="urgent-badge">{pendingCount}</span>}
          </button>
          <button className={`ftab ${activeTab === 'BLOCKED' ? 'active' : ''}`} onClick={() => setActiveTab('BLOCKED')}>
            Blocked {blockedCount > 0 && <span className="urgent-badge neutral">{blockedCount}</span>}
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="premium-table-container">
        {isLoading ? (
          <div className="loading-state">
            <div className="spinner-blue"></div>
            <p>Loading medical directory...</p>
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="empty-state">
            <Activity size={48} className="empty-icon" />
            <h3>No doctors found</h3>
            <p>Try adjusting your search criteria or tabs.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Medical Professional</th>
                  <th>Clinical Data</th>
                  <th>Facility Link</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDoctors.map(doc => (
                  <tr key={doc._id} className="table-row">
                    <td>
                      <div className="user-cell">
                        <div className="avatar-circle doctor-avatar black-theme">
                          {getDoctorBaseName(doc.name).charAt(0).toUpperCase()}
                        </div>
                        <div className="user-meta">
                          <h4>{formatDoctorName(doc.name)}</h4>
                          <span>{doc.email || "No email"}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="contact-cell">
                        <span className="contact-email font-bold txt-indigo-dark">{doc.specialization || "N/A"}</span>
                        <span className="contact-phone">{doc.experience || "0"} Years Exp.</span>
                      </div>
                    </td>
                    <td>
                      <span className="blood-badge hospital-badge">{doc.hospitalName || "N/A"}</span>
                    </td>
                    <td>
                      <span className={`status-pill ${doc.status?.toLowerCase() || 'pending'}`}>
                        {getStatusIcon(doc.status)}
                        {doc.status || 'Pending'}
                      </span>
                    </td>
                    <td>
                      <div className="action-cell">
                        <button
                          className="action-btn doc-view-btn"
                          onClick={() => { setSelectedDoctor(doc); setShowDetailsModal(true); }}
                          title="View Verification Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className={`action-btn ${doc.status?.toLowerCase() === 'blocked' ? 'restore-btn' : 'block-btn'}`}
                          onClick={() => handleBlockToggle(doc)}
                          title={doc.status?.toLowerCase() === 'blocked' ? 'Restore Account' : 'Block Account'}
                        >
                          {doc.status?.toLowerCase() === 'blocked' ? <Unlock size={16} /> : <Ban size={16} />}
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDelete(doc._id, doc.name)}
                          title="Revoke and Purge Account"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Doctor Modal Overlay */}
      {showAddModal && (
        <div className="admin-doc-modal-overlay">
          <div className="admin-doc-modal-content add-modal">
            <div className="modal-header">
              <h3>Create Doctor Record</h3>
              <button onClick={() => setShowAddModal(false)} className="close-x"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddSubmit} className="modal-form" noValidate>
              <div className="form-group-grid">
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} aria-invalid={Boolean(fieldErrors.name)} />
                  <FieldError message={fieldErrors.name} />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} aria-invalid={Boolean(fieldErrors.email)} />
                  <FieldError message={fieldErrors.email} />
                </div>
                <div className="form-group">
                  <label>Temporary Password</label>
                  <input type="password" name="password" value={formData.password} onChange={handleInputChange} aria-invalid={Boolean(fieldErrors.password)} />
                  <FieldError message={fieldErrors.password} />
                </div>
                <div className="form-group">
                  <label>Specialization</label>
                  <input type="text" name="specialization" value={formData.specialization} onChange={handleInputChange} aria-invalid={Boolean(fieldErrors.specialization)} />
                  <FieldError message={fieldErrors.specialization} />
                </div>
                <div className="form-group">
                  <label>Facility Affiliation</label>
                  <input type="text" name="hospitalName" value={formData.hospitalName} onChange={handleInputChange} aria-invalid={Boolean(fieldErrors.hospitalName)} />
                  <FieldError message={fieldErrors.hospitalName} />
                </div>
                <div className="form-group">
                  <label>Years of Practice</label>
                  <input type="number" name="experience" value={formData.experience} onChange={handleInputChange} aria-invalid={Boolean(fieldErrors.experience)} />
                  <FieldError message={fieldErrors.experience} />
                </div>
                <div className="form-group">
                  <label>Consultation Base Fee (LKR)</label>
                  <input type="number" name="fees" value={formData.fees} onChange={handleInputChange} aria-invalid={Boolean(fieldErrors.fees)} />
                  <FieldError message={fieldErrors.fees} />
                </div>
              </div>
              <button type="submit" className="add-premium-btn w-full mt-4">Generate Credentials & Profile</button>
            </form>
          </div>
        </div>
      )}

      {/* Detailed Verification Modal */}
      {showDetailsModal && selectedDoctor && (
        <div className="admin-doc-modal-overlay">
          <div className="admin-doc-modal-content verify-modal">
            {/* ── Hero Header ── */}
            <div className="modal-header verification-header">
              <div className="vh-group">
                <div className="avatar-circle doctor-avatar black-theme large">
                  {getDoctorBaseName(selectedDoctor.name).charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3>{formatDoctorName(selectedDoctor.name)}</h3>
                  <p>{selectedDoctor.email || "No email"}</p>
                  <span className={`vm-status-chip ${selectedDoctor.status?.toLowerCase() || 'pending'}`}>
                    {selectedDoctor.status?.toLowerCase() === 'active' ? <BadgeCheck size={12} /> : selectedDoctor.status?.toLowerCase() === 'blocked' ? <Ban size={12} /> : selectedDoctor.status?.toLowerCase() === 'rejected' ? <AlertTriangle size={12} /> : <Clock size={12} />}
                    {selectedDoctor.status || 'Pending'}
                  </span>
                </div>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="close-x"><X size={24} /></button>
            </div>

            <div className="vm-body">
              {/* ── Section: Identity ── */}
              <div className="vm-section">
                <h4 className="simple-section-title">Identity Information</h4>
                <div className="simple-info-list">
                  <div className="simple-info-row">
                    <span className="simple-label">Full Name</span>
                    <span className="simple-value">{formatDoctorName(selectedDoctor.name)}</span>
                  </div>
                  <div className="simple-info-row">
                    <span className="simple-label">Email Address</span>
                    <span className="simple-value">{selectedDoctor.email || "N/A"}</span>
                  </div>
                  <div className="simple-info-row">
                    <span className="simple-label">Phone Number</span>
                    <span className="simple-value">{selectedDoctor.phone || 'Not Provided'}</span>
                  </div>
                  <div className="simple-info-row">
                    <span className="simple-label">Application Date</span>
                    <span className="simple-value">{selectedDoctor.createdAt ? new Date(selectedDoctor.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* ── Section: Medical Credentials ── */}
              <div className="vm-section">
                <h4 className="simple-section-title">Medical Credentials</h4>
                <div className="simple-info-list">
                  <div className="simple-info-row">
                    <span className="simple-label">Medical License ID</span>
                    <span className="simple-value mono">{selectedDoctor.medicalLicenseId || 'Not Submitted'}</span>
                  </div>
                  <div className="simple-info-row">
                    <span className="simple-label">Specialization</span>
                    <span className="simple-value">{selectedDoctor.specialization || "N/A"}</span>
                  </div>
                  <div className="simple-info-row">
                    <span className="simple-label">Verification Status</span>
                    <span className="simple-value">{selectedDoctor.isVerified ? '✅ Verified' : '⏳ Not Verified'}</span>
                  </div>
                </div>
              </div>

              <div className="vm-section">
                <h4 className="simple-section-title">Verification Documents</h4>
                <div className="simple-doc-grid">
                  {[
                    {
                      key: "medicalLicenseImageUrl",
                      label: "Medical License",
                      url: selectedDoctor.medicalLicenseImageUrl,
                    },
                    {
                      key: "nicImageUrl",
                      label: "National ID",
                      url: selectedDoctor.nicImageUrl,
                    },
                  ].map((document) => (
                    <div className="simple-doc-card" key={document.key}>
                      <div className="simple-doc-card-header">
                        <span className="simple-doc-title">{document.label}</span>
                        {document.url ? (
                          <a
                            className="simple-doc-open-btn"
                            href={document.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Eye size={14} /> Open
                          </a>
                        ) : null}
                      </div>

                      {document.url ? (
                        <a
                          href={document.url}
                          target="_blank"
                          rel="noreferrer"
                          className="simple-doc-preview-link"
                        >
                          <img
                            src={document.url}
                            alt={`${document.label} preview`}
                            className="simple-doc-preview"
                          />
                        </a>
                      ) : (
                        <div className="simple-doc-empty">Not provided</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Section: Professional Details ── */}
              <div className="vm-section">
                <h4 className="simple-section-title">Professional Details</h4>
                <div className="simple-info-list">
                  <div className="simple-info-row">
                    <span className="simple-label">Hospital Affiliation</span>
                    <span className="simple-value">{selectedDoctor.hospitalName || "N/A"}</span>
                  </div>
                  <div className="simple-info-row">
                    <span className="simple-label">Years of Experience</span>
                    <span className="simple-value">{selectedDoctor.experience || "0"} Years</span>
                  </div>
                  <div className="simple-info-row">
                    <span className="simple-label">Consultation Fee</span>
                    <span className="simple-value">LKR {selectedDoctor.fees || "N/A"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="ftab" onClick={() => setShowDetailsModal(false)}>Close</button>
              {['pending', 'rejected'].includes(selectedDoctor.status?.toLowerCase()) && (
                <>
                  <button className="reject-btn" onClick={openDeclineModal}>Decline License</button>
                  <button className="approve-btn" onClick={() => handleApprove(selectedDoctor._id)}>Verify & Approve</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showDeclineModal && selectedDoctor && (
        <div className="admin-doc-modal-overlay">
          <div className="admin-doc-modal-content decline-modal">
            <div className="decline-modal-header">
              <div>
                <h3>Decline license verification</h3>
                <p>{formatDoctorName(selectedDoctor.name)} will receive this reason by email.</p>
              </div>
              <button onClick={closeDeclineModal} className="close-x simple-close" type="button">
                <X size={20} />
              </button>
            </div>

            <div className="decline-modal-body">
              <label className="decline-label">Reason</label>
              <div className="decline-reason-list">
                {DECLINE_REASONS.map((reason) => (
                  <label className="decline-reason-option" key={reason}>
                    <input
                      checked={declineForm.reason === reason}
                      name="declineReason"
                      onChange={() => setDeclineForm((current) => ({ ...current, reason }))}
                      type="radio"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>

              <label className="decline-label" htmlFor="decline-details">
                {declineForm.reason === "Other" ? "Other reason" : "Additional note"}
              </label>
              <textarea
                id="decline-details"
                placeholder={
                  declineForm.reason === "Other"
                    ? "Write the reason for declining this license..."
                    : "Optional note for the doctor..."
                }
                value={declineForm.details}
                onChange={(event) =>
                  setDeclineForm((current) => ({ ...current, details: event.target.value }))
                }
              />
            </div>

            <div className="decline-modal-footer">
              <button className="ftab" onClick={closeDeclineModal} type="button">
                Cancel
              </button>
              <button className="reject-btn" disabled={isDeclining} onClick={handleReject} type="button">
                {isDeclining ? "Sending..." : "Decline and email doctor"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Banner / Status Modal */}
      <StatusModal
        isOpen={statusModal.isOpen}
        onClose={() => setStatusModal({ ...statusModal, isOpen: false })}
        type={statusModal.type}
        message={statusModal.message}
      />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        variant={confirmModal.variant || "danger"}
      />
    </div>
  );
};

export default AdminDoctorManagement;
