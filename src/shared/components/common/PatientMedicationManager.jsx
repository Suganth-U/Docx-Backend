import React, { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import {
  createEhrMedication,
  fetchEhrMedications,
  updateEhrMedication,
} from "@/shared/lib/ehrApi";
import FieldError from "@/shared/components/common/FieldError";
import { clearFieldError } from "@/shared/lib/formValidation";

const emptyForm = {
  name: "",
  dosage: "",
  frequency: "",
  route: "",
  notes: "",
};

const PatientMedicationManager = ({ patientId, canEdit = false, compact = false }) => {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});

  const loadMedications = async () => {
    if (!patientId) return;
    try {
      setLoading(true);
      const data = await fetchEhrMedications({ patientId, status: "active" });
      setMedications(data.medications || []);
    } catch (error) {
      console.error("Failed to load medications", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const updateForm = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    clearFieldError(setFieldErrors, name);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setFieldErrors({ name: "Medicine name is required." });
      return;
    }

    try {
      setSaving(true);
      await createEhrMedication({
        patientId,
        ...form,
        source: "patient_reported",
        status: "active",
      });
      setForm(emptyForm);
      setFieldErrors({});
      await loadMedications();
    } catch (error) {
      console.error("Failed to save medication", error);
    } finally {
      setSaving(false);
    }
  };

  const stopMedication = async (medicationId) => {
    try {
      await updateEhrMedication(medicationId, { status: "stopped" });
      await loadMedications();
    } catch (error) {
      console.error("Failed to update medication", error);
    }
  };

  return (
    <section className={`med-manager ${compact ? "compact" : ""}`}>
      <div className="med-manager-header">
        <h3>Current Medications</h3>
        {loading ? <span>Loading...</span> : <span>{medications.length} active</span>}
      </div>

      {canEdit && (
        <form className="med-manager-form" onSubmit={handleSubmit} noValidate>
          <div className="med-manager-field">
            <input
              value={form.name}
              onChange={(event) => updateForm("name", event.target.value)}
              placeholder="Medicine name"
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? "medication-name-error" : undefined}
            />
            <FieldError id="medication-name-error" message={fieldErrors.name} />
          </div>
          <input value={form.dosage} onChange={(event) => updateForm("dosage", event.target.value)} placeholder="Dosage" />
          <input value={form.frequency} onChange={(event) => updateForm("frequency", event.target.value)} placeholder="Frequency" />
          <input value={form.route} onChange={(event) => updateForm("route", event.target.value)} placeholder="Route" />
          <button type="submit" disabled={saving}><Plus size={14} /> {saving ? "Saving..." : "Add"}</button>
        </form>
      )}

      <div className="med-manager-list">
        {medications.length === 0 ? (
          <p>No active medications recorded.</p>
        ) : medications.map((medication) => (
          <div key={medication._id} className="med-manager-item">
            <div>
              <strong>{medication.name}</strong>
              <span>{[medication.dosage, medication.frequency, medication.route].filter(Boolean).join(" • ") || "No dosage recorded"}</span>
            </div>
            {canEdit && (
              <button type="button" onClick={() => stopMedication(medication._id)} title="Mark stopped">
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      <style>{`
        .med-manager { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; display: grid; gap: 12px; }
        .med-manager.compact { padding: 12px; }
        .med-manager-header { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
        .med-manager-header h3 { margin: 0; color: #2B3674; font-size: 16px; }
        .med-manager-header span { color: #64748b; font-size: 12px; font-weight: 700; }
        .med-manager-form { display: grid; grid-template-columns: repeat(4, minmax(100px, 1fr)) auto; gap: 8px; }
        .med-manager-field { display: grid; gap: 4px; }
        .med-manager-form input { min-height: 36px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 9px; color: #334155; }
        .med-manager-form button { display: inline-flex; align-items: center; justify-content: center; gap: 5px; min-height: 36px; border: none; border-radius: 8px; background: #683B93; color: #fff; font-weight: 800; padding: 0 12px; cursor: pointer; }
        .med-manager-list { display: grid; gap: 8px; }
        .med-manager-list p { margin: 0; color: #94a3b8; font-size: 13px; }
        .med-manager-item { display: flex; justify-content: space-between; align-items: center; gap: 10px; border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 8px; padding: 10px; }
        .med-manager-item div { display: grid; gap: 3px; }
        .med-manager-item strong { color: #1e293b; font-size: 14px; }
        .med-manager-item span { color: #64748b; font-size: 12px; }
        .med-manager-item button { width: 30px; height: 30px; border: 1px solid #fecaca; color: #dc2626; background: #fff; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
        @media (max-width: 860px) { .med-manager-form { grid-template-columns: 1fr; } }
      `}</style>
    </section>
  );
};

export default PatientMedicationManager;
