import React, { useState, useEffect } from 'react';
import "@/admin/Dashboard/Dashboard.css";

const PatientEditModal = ({ isOpen, onClose, patient, onSave }) => {
  const [editedPatient, setEditedPatient] = useState(patient);

  useEffect(() => {
    if (patient) {
      setEditedPatient({ ...patient });
    }
  }, [patient]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditedPatient(prevPatient => ({
      ...prevPatient,
      [name]: value,
    }));
  };

  const handleSave = () => {
    onSave(editedPatient);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="patient-edit-modal-overlay">
      <div className="patient-edit-modal">
        <div className="modal-header">
          <h3>Edit Patient Details</h3>
          <button onClick={onClose} className="close-button">
            &times;
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="name">Patient Name:</label>
            <input type="text" id="name" name="name" value={editedPatient?.name || ''} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="age">Age:</label>
            <input type="number" id="age" name="age" value={editedPatient?.age || ''} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="patientId">ID:</label>
            <input type="text" id="patientId" name="patientId" value={editedPatient?.patientId || ''} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="address">Address:</label>
            <input type="text" id="address" name="address" value={editedPatient?.address || ''} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="mobileNo">Mobile No:</label>
            <input type="text" id="mobileNo" name="mobileNo" value={editedPatient?.mobileNo || ''} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="lastVisit">Last Visit:</label>
            <input type="text" id="lastVisit" name="lastVisit" value={editedPatient?.lastVisit || ''} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="disease">Diseases:</label>
            <input type="text" id="disease" name="disease" value={editedPatient?.disease || ''} onChange={handleChange} />
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={handleSave} className="save-button">Save</button>
          <button onClick={onClose} className="cancel-button">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default PatientEditModal;