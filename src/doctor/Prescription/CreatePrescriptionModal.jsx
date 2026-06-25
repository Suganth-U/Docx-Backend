import React, { useState } from 'react';
import { X, Plus, Trash } from 'lucide-react';
import api from "@/shared/lib/api";
import "@/doctor/Prescription/CreatePrescriptionModal.css"; // We'll create this or reuse standard styles
import FieldError from "@/shared/components/common/FieldError";
import { clearFieldError, validateRequiredFields } from "@/shared/lib/formValidation";

const CreatePrescriptionModal = ({ onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        patientId: '', // Ideally a search/select
        diagnosis: '',
        medicines: [{ name: '', dosage: '', frequency: '', duration: '' }],
        notes: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});

    const handleMedChange = (index, field, value) => {
        const newMeds = [...formData.medicines];
        newMeds[index][field] = value;
        setFormData({ ...formData, medicines: newMeds });
        clearFieldError(setFieldErrors, `medicines.${index}.${field}`);
    };

    const addMed = () => {
        setFormData({
            ...formData,
            medicines: [...formData.medicines, { name: '', dosage: '', frequency: '', duration: '' }]
        });
    };

    const removeMed = (index) => {
        const newMeds = formData.medicines.filter((_, i) => i !== index);
        setFormData({ ...formData, medicines: newMeds });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const nextErrors = validateRequiredFields(formData, {
            patientId: "Patient ID",
            diagnosis: "Diagnosis",
        });
        formData.medicines.forEach((medicine, index) => {
            ["name", "dosage", "frequency"].forEach((field) => {
                if (!String(medicine[field] || "").trim()) {
                    nextErrors[`medicines.${index}.${field}`] = `${field[0].toUpperCase()}${field.slice(1)} is required.`;
                }
            });
        });
        setFieldErrors(nextErrors);
        if (Object.keys(nextErrors).length) {
            setLoading(false);
            return;
        }

        try {
            // In a real app we'd validate patientId exists or select from a list
            // For MVP we just send what we have. 
            // Note: Backend expects 'patient' ObjectId. 
            // Since we don't have a patient picker yet, we might fail if we send a string name as ID.
            // We need a way to get a valid patient ID.
            // For now, I will assume the user enters a valid ID or we mock it.
            // Actually, let's just ask for Patient Name and let backend find/create or error?
            // Backend expects 'patient' which is an ObjectId ref.

            // Let's HARDCODE a valid patient ID from the DB if possible or just fail if invalid.
            // Better: Fetch patients list for a dropdown?
            // Lets add a simple "Patient ID" input and assume user knows it (or copier from list).

            await api.post('/prescriptions', {
                patientId: formData.patientId,
                // We'll need to modify backend if we want to pass Name, or ensure we pass an ID.
                // Assuming we pass ID for now.
                diagnosis: formData.diagnosis,
                medicines: formData.medicines,
                notes: formData.notes
            });

            onSuccess();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create prescription');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h3>New Prescription</h3>
                    <button onClick={onClose} className="btn-icon"><X size={20} /></button>
                </div>

                {error && <div className="error-banner">{error}</div>}

                <form onSubmit={handleSubmit} noValidate>
                    <div className="form-group">
                        <label>Patient ID</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.patientId}
                            onChange={(e) => {
                                setFormData({ ...formData, patientId: e.target.value });
                                clearFieldError(setFieldErrors, "patientId");
                            }}
                            aria-invalid={Boolean(fieldErrors.patientId)}
                            required
                        />
                        <FieldError message={fieldErrors.patientId} />
                    </div>

                    <div className="form-group">
                        <label>Diagnosis</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.diagnosis}
                            onChange={(e) => {
                                setFormData({ ...formData, diagnosis: e.target.value });
                                clearFieldError(setFieldErrors, "diagnosis");
                            }}
                            aria-invalid={Boolean(fieldErrors.diagnosis)}
                            required
                        />
                        <FieldError message={fieldErrors.diagnosis} />
                    </div>

                    <div className="meds-section">
                        <label>Medications</label>
                        {formData.medicines.map((med, index) => (
                            <div key={index} className="med-row">
                                <input
                                    value={med.name}
                                    onChange={(e) => handleMedChange(index, 'name', e.target.value)}
                                    className="form-input med-name"
                                    aria-invalid={Boolean(fieldErrors[`medicines.${index}.name`])}
                                    required
                                />
                                <input
                                    value={med.dosage}
                                    onChange={(e) => handleMedChange(index, 'dosage', e.target.value)}
                                    className="form-input med-short"
                                    aria-invalid={Boolean(fieldErrors[`medicines.${index}.dosage`])}
                                    required
                                />
                                <input
                                    value={med.frequency}
                                    onChange={(e) => handleMedChange(index, 'frequency', e.target.value)}
                                    className="form-input med-short"
                                    aria-invalid={Boolean(fieldErrors[`medicines.${index}.frequency`])}
                                    required
                                />
                                <button type="button" onClick={() => removeMed(index)} className="btn-icon-red">
                                    <Trash size={16} />
                                </button>
                            </div>
                        ))}
                        {formData.medicines.map((_, index) => (
                            <div key={`med-errors-${index}`} className="med-row-errors">
                                <FieldError message={fieldErrors[`medicines.${index}.name`]} />
                                <FieldError message={fieldErrors[`medicines.${index}.dosage`]} />
                                <FieldError message={fieldErrors[`medicines.${index}.frequency`]} />
                            </div>
                        ))}
                        <button type="button" onClick={addMed} className="btn-text-primary">
                            <Plus size={16} /> Add Medicine
                        </button>
                    </div>

                    <div className="form-group">
                        <label>Notes</label>
                        <textarea
                            className="form-input"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={3}
                        />
                    </div>

                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                        <button type="submit" disabled={loading} className="btn-primary">
                            {loading ? 'Creating...' : 'Issue Prescription'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreatePrescriptionModal;
