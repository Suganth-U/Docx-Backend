import React, { useCallback, useState, useEffect } from "react";
import { Search, Trash2, User, Phone, CheckCircle, XCircle, Ban, Unlock } from 'lucide-react';
import { useNavigate, useSearchParams } from "react-router-dom";
import useAxiosPrivate from "@/shared/hooks/useAxiosPrivate";
import { useToast } from "@/shared/context/ToastContext";
import ConfirmModal from "@/shared/components/ui/ConfirmModal";
import "@/admin/Patients/AdminPatientManagement.css";

const getStatusIcon = (status) => {
  const normalized = String(status || 'pending').toLowerCase();

  if (normalized === 'active') return <CheckCircle size={14} />;
  if (normalized === 'blocked') return <Ban size={14} />;
  return <XCircle size={14} />;
};

const AdminPatientManagement = () => {
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || '');
  const [filter, setFilter] = useState('ALL'); // ALL, ACTIVE, PENDING
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const toast = useToast();

  const axiosPrivate = useAxiosPrivate();
  const navigate = useNavigate();

  const fetchPatients = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await axiosPrivate.get("/admin/patients");
      setPatients(data);
    } catch (error) {
      console.error("Failed to fetch patients", error);
    } finally {
      setIsLoading(false);
    }
  }, [axiosPrivate]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  useEffect(() => {
    setSearchQuery(searchParams.get("search") || "");
  }, [searchParams]);

  const handleDelete = async (id, name) => {
    setConfirmModal({
      isOpen: true,
      title: `Delete ${name}?`,
      message: "This permanently removes the patient account plus related appointments, prescriptions, pharmacy orders, messages, notifications, and patient records. This cannot be undone.",
      onConfirm: async () => {
        try {
          await axiosPrivate.delete(`/admin/users/${id}`);
          setPatients(prev => prev.filter(p => p._id !== id));
        } catch (error) {
          console.error("Failed to delete patient", error);
          toast.error("Failed to delete patient.");
        }
      }
    });
  };

  const handleBlockToggle = (patient) => {
    const isBlocked = patient.status?.toLowerCase() === 'blocked';

    setConfirmModal({
      isOpen: true,
      title: isBlocked ? `Restore ${patient.name}?` : `Block ${patient.name}?`,
      message: isBlocked
        ? 'This restores the patient to their previous account status so they can sign in again if their account was active before blocking.'
        : 'This immediately blocks the patient from signing in and clears active refresh sessions.',
      confirmText: isBlocked ? 'Restore account' : 'Block account',
      variant: isBlocked ? 'success' : 'warning',
      onConfirm: async () => {
        try {
          const endpoint = isBlocked ? 'unblock' : 'block';
          const { data } = await axiosPrivate.put(`/admin/users/${patient._id}/${endpoint}`);
          toast.success(data?.message || (isBlocked ? 'Patient account restored.' : 'Patient account blocked.'));
          fetchPatients();
        } catch (error) {
          console.error("Failed to update patient account status", error);
          toast.error(error.response?.data?.message || "Failed to update patient account status.");
        }
      }
    });
  };

  // Filter and Search Logic
  const filteredPatients = patients.filter(patient => {
    const statusMatch = filter === 'ALL' ? true : patient.status?.toUpperCase() === filter;
    const searchMatch = (patient.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (patient.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    return statusMatch && searchMatch;
  });

  return (
    <div className="admin-page-content premium-user-page">

      {/* Header */}
      <div className="premium-header-block">
        <div className="title-area">
          <div className="title-icon-wrapper bg-purple-solid">
            <User size={28} className="txt-white" />
          </div>
          <div>
            <h2 className="page-title">Patient Records</h2>
            <p className="page-subtitle">Manage, view, and organize registered patient profiles.</p>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="premium-control-bar">
        <div className="search-pill-large">
          <Search size={18} className="search-icon-glass" />
          <input
            type="text"
            placeholder="Search patients by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-tabs">
          <button className={`ftab ${filter === 'ALL' ? 'active' : ''}`} onClick={() => setFilter('ALL')}>All</button>
          <button className={`ftab ${filter === 'ACTIVE' ? 'active' : ''}`} onClick={() => setFilter('ACTIVE')}>Active</button>
          <button className={`ftab ${filter === 'PENDING' ? 'active' : ''}`} onClick={() => setFilter('PENDING')}>Pending</button>
          <button className={`ftab ${filter === 'BLOCKED' ? 'active' : ''}`} onClick={() => setFilter('BLOCKED')}>Blocked</button>
        </div>
      </div>

      {/* Main Table */}
      <div className="premium-table-container">
        {isLoading ? (
          <div className="loading-state">
            <div className="spinner-purple"></div>
            <p>Loading patient records...</p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="empty-state">
            <User size={48} className="empty-icon" />
            <h3>No patients found</h3>
            <p>Try adjusting your search filters.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Contact</th>
                  <th>Registration Date</th>
                  <th>Blood Group</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map(patient => (
                  <tr
                    key={patient._id}
                    className="table-row clickable-row"
                    onClick={() => navigate(`/admin/patients/${patient.patientId}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div className="user-cell">
                        <div className="avatar-circle black-theme">
                          {patient.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="user-meta">
                          <h4>{patient.name}</h4>
                          <span>ID: {patient.patientId.substring(0, 8).toUpperCase()}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="contact-cell">
                        <span className="contact-email font-bold txt-purple-dark">{patient.email}</span>
                        <span className="contact-phone"><Phone size={12} /> {patient.phone}</span>
                      </div>
                    </td>
                    <td>
                      <span className="date-badge">
                        {new Date(patient.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </td>
                    <td>
                      <span className="blood-badge">{patient.bloodGroup}</span>
                    </td>
                    <td>
                      <span className={`status-pill ${patient.status?.toLowerCase() || 'pending'}`}>
                        {getStatusIcon(patient.status)}
                        {patient.status || 'Pending'}
                      </span>
                    </td>
                    <td>
                      <div className="action-cell">
                        <button
                          className={`action-btn ${patient.status?.toLowerCase() === 'blocked' ? 'restore-btn' : 'block-btn'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBlockToggle(patient);
                          }}
                          title={patient.status?.toLowerCase() === 'blocked' ? 'Restore Patient' : 'Block Patient'}
                        >
                          {patient.status?.toLowerCase() === 'blocked' ? <Unlock size={16} /> : <Ban size={16} />}
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(patient._id, patient.name);
                          }}
                          title="Delete Patient"
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

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title || "Delete Patient?"}
        message={confirmModal.message || "This patient record will be permanently removed. This cannot be undone."}
        confirmText={confirmModal.confirmText}
        variant={confirmModal.variant || "danger"}
      />
    </div>
  );
};

export default AdminPatientManagement;
