import React, { useState } from 'react';
import "@/admin/Dashboard/Dashboard.css";
import { assets } from "@/shared/lib/assets";
import PatientEditModal from "@/admin/Dashboard/PatientEditModal";
import ConfirmModal from "@/shared/components/ui/ConfirmModal"; 

const NewPatientsTable = ({ patients, onDeletePatient, onUpdatePatient }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, onConfirm: () => {} });

  const handleEditClick = (patient) => {
    setEditingPatient(patient);
    setIsEditModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsEditModalOpen(false);
    setEditingPatient(null);
  };

  const handleSavePatient = (updatedPatient) => {
    onUpdatePatient(updatedPatient); 
    handleCloseModal();
  };

  const handleDeleteClick = (patientId) => {
    setConfirmModal({
      isOpen: true,
      onConfirm: () => {
        onDeletePatient(patientId);
      }
    });
  };

  return (
    <div className="new-patients-table-card">
      <div className="card-header">
        <h3>New Patients</h3>
        <button className="view-all-button">View All</button>
      </div>
      <table className="patients-table">
        <thead>
          <tr>
            <th>Patient Name</th>
            <th>ID</th>
            <th>Address</th>
            <th>Mobile No</th>
            <th>Last Visit</th>
            <th>Diseases</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((patient) => (
            <tr key={patient.id}>
              <td>
                <div className="patient-info">
                  <img
                    src={patient.image || assets.avatar}
                    alt={patient.name}
                    className="patient-avatar"
                  />
                  <span>{patient.name}</span>
                </div>
              </td>
              <td>{patient.patientId}</td>
              <td>{patient.address}</td>
              <td>{patient.mobileNo}</td>
              <td>{patient.lastVisit}</td>
              <td>
                <span className={`disease-tag ${patient.disease.toLowerCase().replace(/\s+/g, '-')}`}>
                  {patient.disease}
                </span>
              </td>
              <td className="action-icons">
                <button title="View Details">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="icon">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                  </svg>
                </button>
                <button title="Edit" onClick={() => handleEditClick(patient)}>
                  <svg viewBox="0 0 24 24" fill="currentColor" className="icon">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0L15.19 8.15l3.75 3.75 2.83-2.83z" />
                  </svg>
                </button>
                <button title="Delete" onClick={() => handleDeleteClick(patient.id)}>
                  <svg viewBox="0 0 24 24" fill="currentColor" className="icon">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isEditModalOpen && editingPatient && (
        <PatientEditModal
          isOpen={isEditModalOpen}
          onClose={handleCloseModal}
          patient={editingPatient}
          onSave={handleSavePatient}
        />
      )}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title="Delete Patient?"
        message="This permanently removes the patient account plus related appointments, prescriptions, orders, messages, notifications, and patient records. This cannot be undone."
        variant="danger"
      />
    </div>
  );
};

export default NewPatientsTable;
