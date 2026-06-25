import React, { useState, useEffect } from 'react';
import api from "@/shared/lib/api";
import { useSearchParams } from "react-router-dom";
import { Search, Plus, Printer, Eye, Trash2, FileText, Pill, Calendar, Download } from 'lucide-react';
import CreatePrescriptionModal from "@/doctor/Prescription/CreatePrescriptionModal";
import "@/doctor/Prescription/DoctorPrescription.css";
import { useToast } from "@/shared/context/ToastContext";

const DoctorPrescription = () => {
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");

  // Mock Data
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const toast = useToast();

  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/prescriptions');

      // Format for UI
      const formatted = data.map(rx => ({
        id: rx._id.substring(0, 8).toUpperCase(), // Short ID for display
        fullId: rx._id,
        patientName: rx.patient_id?.fullName || "Unknown",
        patientId: "P-" + (rx.patient_id?._id?.substring(0, 4) || "000"),
        date: new Date(rx.createdAt).toLocaleDateString(),
        diagnosis: rx.diagnosis,
        medications: rx.medicines.map(m => m.name).join(", "),
        status: rx.documentUrl ? "Signed" : "Active",
        documentUrl: rx.documentUrl || "",
      }));

      setPrescriptions(formatted);
    } catch (error) {
      console.error("Error fetching prescriptions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  useEffect(() => {
    setSearchTerm(searchParams.get("search") || "");
  }, [searchParams]);

  const handleCreateSuccess = () => {
    fetchPrescriptions();
  };

  const openPrescriptionDocument = async (prescriptionId, download = false) => {
    try {
      const response = await api.get(`/prescriptions/${prescriptionId}/document`, {
        params: download ? { download: 1 } : {},
        responseType: "blob",
      });

      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));

      if (download) {
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `docx-prescription-${prescriptionId.slice(-8).toUpperCase()}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        window.open(blobUrl, "_blank", "noopener,noreferrer");
      }

      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 3000);
    } catch (error) {
      console.error("Failed to open prescription document", error);
      toast.error("We couldn’t open that prescription document.");
    }
  };

  const filteredPrescriptions = prescriptions.filter(item =>
    item.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="prescription-page">
        {/* Header */}
        <div className="page-header">
          <div>
            <h2 className="page-title">Prescriptions</h2>
            <p className="page-subtitle">Manage and issue digital prescriptions</p>
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} />
            New Prescription
          </button>
        </div>

        {/* Filters */}
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

          <button className="btn-filter-icon">
            <Printer size={18} />
            Print List
          </button>
        </div>

        {/* Table */}
        <div className="card-table">
          {/* ... table ... */}
          <table className="modern-table">
            <thead>
              <tr>
                <th>Prescription ID</th>
                <th>Patient</th>
                <th>Date</th>
                <th>Diagnosis</th>
                <th>Medications</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPrescriptions.map((item) => (
                <tr key={item.id}>
                  <td className="id-cell">{item.id}</td>
                  <td>
                    <div className="patient-info-cell">
                      <div className="patient-initial">
                        {item.patientName.charAt(0)}
                      </div>
                      <div>
                        <span className="info-name">{item.patientName}</span>
                        <span className="info-id">{item.patientId}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="icon-text">
                      <Calendar size={14} />
                      {item.date}
                    </div>
                  </td>
                  <td>
                    <span className="diagnosis-tag">{item.diagnosis}</span>
                  </td>
                  <td>
                    <div className="meds-cell">
                      <Pill size={14} className="meds-icon" />
                      <span className="truncate-text">{item.medications}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`status-pill status-${item.status.toLowerCase()}`}>
                      {item.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-action-sm view"
                        title="View details"
                        onClick={() => openPrescriptionDocument(item.fullId, false)}
                        disabled={!item.documentUrl}
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        className="btn-action-sm download"
                        title="Download PDF"
                        onClick={() => openPrescriptionDocument(item.fullId, true)}
                        disabled={!item.documentUrl}
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showModal && (
          <CreatePrescriptionModal
            onClose={() => setShowModal(false)}
            onSuccess={handleCreateSuccess}
          />
        )}
    </div>
  );
};

export default DoctorPrescription;
