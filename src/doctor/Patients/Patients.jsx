import React, { useState, useEffect } from 'react';
import { Search, User, MapPin, Phone, Calendar, MoreHorizontal, FileText, Activity, X } from 'lucide-react';
import "@/doctor/Patients/Patients.css";
import { useSearchParams } from 'react-router-dom';
import api from "@/shared/lib/api";
import { useToast } from "@/shared/context/ToastContext";
import PatientMedicalTimeline from "@/shared/components/common/PatientMedicalTimeline";
import { fetchEhrSummary } from "@/shared/lib/ehrApi";

const NOT_RECORDED = "Not recorded";

const formatDate = (value) => {
  if (!value) return NOT_RECORDED;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return NOT_RECORDED;

  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
};

const formatStatusClass = (value = "") =>
  String(value || "pending").toLowerCase().replace(/\s+/g, "-");

const Patients = () => {
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [selectedGender, setSelectedGender] = useState("all");

  const [patients, setPatients] = useState([]);
  const [, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showRecords, setShowRecords] = useState(false);
  const [patientRecords, setPatientRecords] = useState({ appointments: [], prescriptions: [] });
  const [ehrSummary, setEhrSummary] = useState(null);
  const [recordsLoading, setRecordsLoading] = useState(false);

  const [activeDropdown, setActiveDropdown] = useState(null);

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    setSearchTerm(searchParams.get("search") || "");
  }, [searchParams]);

  useEffect(() => {
    const patientId = searchParams.get("patient");
    if (!patientId || patients.length === 0) return;

    const matchedPatient = patients.find((patient) => String(patient.id) === String(patientId));
    if (matchedPatient) {
      handleOpenRecords(matchedPatient);
    }
  }, [patients, searchParams]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const fetchPatients = async () => {
    try {
      const { data } = await api.get('/doctor/patients');
      const normalizedPatients = data.map(p => ({
        ...p,
        age: p.age || NOT_RECORDED,
        gender: p.gender || NOT_RECORDED,
        bloodGroup: p.bloodGroup || NOT_RECORDED,
        address: p.address || NOT_RECORDED,
        phone: p.phone || NOT_RECORDED,
        latestBookingReason: p.latestBookingReason || "",
        latestAppointmentStatus: p.latestAppointmentStatus || p.status || "pending",
        latestPaymentStatus: p.latestPaymentStatus || "pending",
      }));
      setPatients(normalizedPatients);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const fetchPatientRecords = async (patientId) => {
    setRecordsLoading(true);
    try {
      const [{ data }, summary] = await Promise.all([
        api.get(`/doctor/patients/${patientId}/records`),
        fetchEhrSummary(patientId),
      ]);
      setPatientRecords(data);
      setEhrSummary(summary);
      setShowRecords(true);
    } catch (error) {
      console.error("Failed to records", error);
      toast.error("Failed to fetch patient records");
    } finally {
      setRecordsLoading(false);
    }
  };

  const handleOpenRecords = (patient) => {
    setSelectedPatient(patient);
    fetchPatientRecords(patient.id);
  };

  const filteredPatients = patients.filter(patient => {
    const normalizedSearch = searchTerm.toLowerCase();
    const searchableText = [
      patient.name,
      patient.id,
      patient.email,
      patient.phone,
      patient.latestBookingReason,
    ].join(" ").toLowerCase();
    const matchesSearch = searchableText.includes(normalizedSearch);
    const matchesGender = selectedGender === "all" || patient.gender.toLowerCase() === selectedGender;
    return matchesSearch && matchesGender;
  });

  return (
    <>
      <div className="patients-page">
        {/* Header */}
        <div className="page-header">
          <div>
            <h2 className="page-title">My Patients</h2>
            <p className="page-subtitle">Manage patient records and history</p>
          </div>
          <button className="btn-primary" onClick={() => toast.info("Add New Patient flow coming soon")}>
            <User size={18} />
            Add New Patient
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
          <div className="filter-controls">
            <select
              className="filter-select"
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
            >
              <option value="all">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>

        {/* Patient Cards Grid */}
        <div className="patients-grid">
          {filteredPatients.map((patient) => (
            <div key={patient.id} className="patient-card">
              <div className="patient-header">
                <div className="patient-info-head">
                  <div className="patient-avatar-lg">
                    {patient.name.charAt(0)}
                  </div>
                  <div className="patient-basic">
                    <h3>{patient.name}</h3>
                    <p>{patient.id}</p>
                  </div>
                </div>
                <div className="dropdown-container" style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                  <button className="btn-icon" onClick={() => setActiveDropdown(activeDropdown === patient.id ? null : patient.id)}>
                    <MoreHorizontal size={20} />
                  </button>
                  {activeDropdown === patient.id && (
                    <div className="dropdown-menu" style={{ position: 'absolute', right: 0, top: '100%', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 0', zIndex: 10, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', minWidth: '160px' }}>
                      <button style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#374151' }} onClick={() => { setActiveDropdown(null); handleOpenRecords(patient); }}>
                        <FileText size={14} /> View Records
                      </button>
                      <button style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#374151' }} onClick={() => { setActiveDropdown(null); toast.success(`Redirecting to messaging for ${patient.name}`); }}>
                        <Phone size={14} /> Message
                      </button>
                      <button style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#ef4444' }} onClick={() => { setActiveDropdown(null); toast.info(`Archiving patient ${patient.name}...`); }}>
                        <X size={14} /> Remove Patient
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="patient-details">
                <div className="detail-row">
                  <div className="detail-item">
                    <User size={14} className="icon-gray" />
                    <span>{patient.age === NOT_RECORDED ? NOT_RECORDED : `${patient.age} Years`}, {patient.gender}</span>
                  </div>
                  <div className="detail-item">
                    <Activity size={14} className="icon-gray" />
                    <span>{patient.bloodGroup}</span>
                  </div>
                </div>
                <div className="detail-row">
                  <div className="detail-item full-width">
                    <MapPin size={14} className="icon-gray" />
                    <span className="truncate">{patient.address}</span>
                  </div>
                </div>
                <div className="detail-row">
                  <div className="detail-item">
                    <Phone size={14} className="icon-gray" />
                    <span>{patient.phone}</span>
                  </div>
                </div>
                <div className="detail-row">
                  <div className="detail-item full-width">
                    <FileText size={14} className="icon-gray" />
                    <span className="truncate">{patient.latestBookingReason || "No booking reason provided"}</span>
                  </div>
                </div>
              </div>

              <div className="patient-divider"></div>

              <div className="patient-stats">
                <div className="stat-box">
                  <span className="stat-label">Latest Booking</span>
                  <span className="stat-value">{formatDate(patient.lastVisit)}</span>
                </div>
                <div className="stat-box">
                  <span className="stat-label">Status</span>
                  <span className={`status-badge-sm status-${formatStatusClass(patient.latestAppointmentStatus)}`}>
                    {patient.latestAppointmentStatus}
                  </span>
                </div>
              </div>

              <div className="patient-actions">
                <button className="btn-outline" onClick={() => handleOpenRecords(patient)}>
                  <FileText size={16} />
                  Records
                </button>
                <button className="btn-outline" onClick={() => toast.success(`Initiated booking flow for ${patient.name}`)}>
                  <Calendar size={16} />
                  Book
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>


      {/* Patient Records Modal */}
      {
        showRecords && selectedPatient && (
          <div className="modal-overlay">
            <div className="modal-content large-modal">
              <div className="modal-header">
                <h3>Patient Records: {selectedPatient.name}</h3>
                <button onClick={() => setShowRecords(false)}><X size={20} /></button>
              </div>

              <div className="modal-body-scroll">
                {recordsLoading ? <p>Loading records...</p> : (
                  <>
                    {ehrSummary && (
                      <div className="record-section">
                        <h4>EHR Snapshot</h4>
                        <div className="ehr-snapshot-grid">
                          <div><span>Allergies</span><strong>{ehrSummary.patient?.allergies?.join(', ') || 'None recorded'}</strong></div>
                          <div><span>Chronic</span><strong>{ehrSummary.patient?.chronicConditions?.join(', ') || 'None recorded'}</strong></div>
                          <div><span>Files</span><strong>{ehrSummary.counts?.documents || 0}</strong></div>
                          <div><span>Last update</span><strong>{formatDate(ehrSummary.latestUpdate)}</strong></div>
                        </div>
                        {ehrSummary.activeMedications?.length > 0 && (
                          <div className="ehr-med-list">
                            {ehrSummary.activeMedications.map((med) => (
                              <span key={med._id}>{med.name}{med.dosage ? ` ${med.dosage}` : ''}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="record-section">
                      <h4>Unified EHR Timeline</h4>
                      <PatientMedicalTimeline patientId={selectedPatient.id} showFilters allowNoteAdditions compact />
                    </div>

                    <div className="record-section">
                      <h4>Recent Prescriptions</h4>
                      {patientRecords.prescriptions.length > 0 ? (
                        <table className="mini-table">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Diagnosis</th>
                              <th>Medicines</th>
                            </tr>
                          </thead>
                          <tbody>
                            {patientRecords.prescriptions.map(p => (
                              <tr key={p.id}>
                                <td>{new Date(p.date).toLocaleDateString()}</td>
                                <td>{p.diagnosis}</td>
                                <td>{p.medicines.map(m => m.name).join(', ')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : <p className="text-muted">No prescriptions found.</p>}
                    </div>

                    <div className="record-section mt-4">
                      <h4>Appointment History</h4>
                      {patientRecords.appointments.length > 0 ? (
                        <table className="mini-table">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Time</th>
                              <th>Type</th>
                              <th>Need</th>
                              <th>Venue</th>
                              <th>Status</th>
                              <th>Payment</th>
                            </tr>
                          </thead>
                          <tbody>
                            {patientRecords.appointments.map(a => (
                              <tr key={a.id}>
                                <td>{formatDate(a.date)}</td>
                                <td>{a.time}</td>
                                <td>{a.type}</td>
                                <td>{a.reasonForAppointment || "No reason provided"}</td>
                                <td>{a.venueName || NOT_RECORDED}</td>
                                <td><span className={`status-badge-sm status-${formatStatusClass(a.status)}`}>{a.status}</span></td>
                                <td>{a.paymentStatus || NOT_RECORDED}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : <p className="text-muted">No appointments found.</p>}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      }

      <style>{`
        .modal-overlay { position: fixed; top: 0; left: 0; right:0; bottom:0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-content.large-modal { width: 800px; max-height: 80vh; background: white; border-radius: 8px; padding: 20px; display: flex; flex-direction: column; }
        .modal-body-scroll { overflow-y: auto; flex: 1; margin-top: 10px; }
        .record-section h4 { margin-top: 0; margin-bottom: 15px; color: #1f2937; border-bottom: 1px solid #eee; padding-bottom: 8px; }
        .mini-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .mini-table th { text-align: left; padding: 8px; background: #f9fafb; color: #6b7280; font-weight: 500; }
        .mini-table td { padding: 8px; border-bottom: 1px solid #eee; color: #374151; }
        .text-muted { color: #9ca3af; font-style: italic; }
        .mt-4 { margin-top: 1.5rem; }
        .ehr-snapshot-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 10px; }
        .ehr-snapshot-grid div { background: #f9fafb; border: 1px solid #eef2f7; border-radius: 8px; padding: 10px; display: grid; gap: 4px; }
        .ehr-snapshot-grid span { color: #6b7280; font-size: 11px; text-transform: uppercase; font-weight: 700; }
        .ehr-snapshot-grid strong { color: #1f2937; font-size: 13px; }
        .ehr-med-list { display: flex; flex-wrap: wrap; gap: 6px; }
        .ehr-med-list span { background: #ecfdf5; color: #047857; border: 1px solid #bbf7d0; border-radius: 999px; padding: 4px 9px; font-size: 12px; font-weight: 700; }
      `}</style>
    </>
  );
};

export default Patients;
