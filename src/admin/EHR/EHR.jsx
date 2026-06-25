import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import useAxiosPrivate from "@/shared/hooks/useAxiosPrivate";
import PatientMedicalTimeline from "@/shared/components/common/PatientMedicalTimeline";
import {
    FileText, Search, Users, Clock, ChevronLeft, Pill,
    CheckCircle, AlertCircle, Activity
} from 'lucide-react';
import { useToast } from "@/shared/context/ToastContext";
import "@/admin/EHR/EHR.css";

const EHR = () => {
    const axiosPrivate = useAxiosPrivate();
    const toast = useToast();
    const [searchParams] = useSearchParams();
    const [patients, setPatients] = useState([]);
    const [pendingRx, setPendingRx] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [dispensing, setDispensing] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        setSearchQuery(searchParams.get("search") || "");
    }, [searchParams]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [patientsRes, pendingRes] = await Promise.all([
                axiosPrivate.get('/ehr/patients'),
                axiosPrivate.get('/ehr/pending')
            ]);
            setPatients(patientsRes.data);
            setPendingRx(pendingRes.data);
        } catch (error) {
            console.error("Failed to fetch EHR data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDispense = async (prescriptionId) => {
        try {
            setDispensing(prescriptionId);
            await axiosPrivate.put(`/ehr/dispense/${prescriptionId}`);
            // Refresh data
            await fetchData();
        } catch (error) {
            console.error("Failed to dispense:", error);
            toast.error(error.response?.data?.message || 'Failed to dispense prescription');
        } finally {
            setDispensing(null);
        }
    };

    const filteredPatients = patients.filter(p =>
        (p.fullName || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-US', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    };

    // ─── Patient Timeline Detail View ────────────────────────────────
    if (selectedPatient) {
        return (
            <div className="ehr-container">
                <div className="page-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            className="back-btn"
                            onClick={() => setSelectedPatient(null)}
                        >
                            <ChevronLeft size={18} /> Back
                        </button>
                        <div>
                            <h2 className="page-title">{`${selectedPatient.fullName}'s Medical Timeline`}</h2>
                            <ul className="breadcrumb">
                                <li><a href="#">EHR</a></li>
                                <li> / {selectedPatient.fullName}</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Patient Summary Bar */}
                <div className="admin-card patient-summary-bar">
                    <div className="summary-chips">
                        {selectedPatient.gender && (
                            <span className="summary-chip">{selectedPatient.gender}</span>
                        )}
                        {selectedPatient.bloodGroup && (
                            <span className="summary-chip blood">{selectedPatient.bloodGroup}</span>
                        )}
                        {selectedPatient.allergies?.length > 0 && (
                            <span className="summary-chip allergy">
                                Allergies: {selectedPatient.allergies.join(', ')}
                            </span>
                        )}
                        {selectedPatient.chronicConditions?.length > 0 && (
                            <span className="summary-chip chronic">
                                Chronic: {selectedPatient.chronicConditions.join(', ')}
                            </span>
                        )}
                        <span className="summary-chip visits">
                            {selectedPatient.encounterCount} visit{selectedPatient.encounterCount !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>

                <PatientMedicalTimeline patientId={selectedPatient._id} showFilters allowNoteAdditions />
            </div>
        );
    }

    // ─── Main EHR Overview (Patient List + Pending) ──────────────────
    return (
        <div className="ehr-container">
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h2 className="page-title">Electronic Health Records</h2>
                    <ul className="breadcrumb">
                        <li><a href="#">Dashboard</a></li>
                        <li> / EHR</li>
                    </ul>
                </div>
            </div>

            {/* Stats Row */}
            <div className="ehr-stats-row">
                <div className="ehr-stat-card">
                    <div className="ehr-stat-icon" style={{ background: '#ede9fe' }}>
                        <Users size={20} color="#683B93" />
                    </div>
                    <div>
                        <h3>{patients.length}</h3>
                        <p>Total Patients with Records</p>
                    </div>
                </div>
                <div className="ehr-stat-card">
                    <div className="ehr-stat-icon" style={{ background: '#fef3c7' }}>
                        <AlertCircle size={20} color="#d97706" />
                    </div>
                    <div>
                        <h3>{pendingRx.length}</h3>
                        <p>Pending Pharmacy Orders</p>
                    </div>
                </div>
                <div className="ehr-stat-card">
                    <div className="ehr-stat-icon" style={{ background: '#d1fae5' }}>
                        <Activity size={20} color="#059669" />
                    </div>
                    <div>
                        <h3>{patients.reduce((a, p) => a + (p.encounterCount || 0), 0)}</h3>
                        <p>Total Clinical Encounters</p>
                    </div>
                </div>
            </div>

            {/* Pending Pharmacy Prescriptions */}
            {pendingRx.length > 0 && (
                <div className="admin-card pending-section">
                    <div className="section-header">
                        <h3><Pill size={18} /> Pending Pharmacy Queue</h3>
                        <span className="pending-count">{pendingRx.length} awaiting</span>
                    </div>
                    <div className="pending-list">
                        {pendingRx.map((rx) => (
                            <div key={rx._id} className="pending-item">
                                <div className="pending-info">
                                    <strong>{rx.patientId?.fullName || 'Unknown Patient'}</strong>
                                    <span className="pending-doctor">
                                        Prescribed by Dr. {rx.doctorId?.user?.name || 'Unknown'}
                                    </span>
                                    <div className="pending-meds">
                                        {rx.medicines.map((m, i) => (
                                            <span key={i} className="med-tag">{m.name}</span>
                                        ))}
                                    </div>
                                </div>
                                <button
                                    className="dispense-btn"
                                    onClick={() => handleDispense(rx._id)}
                                    disabled={dispensing === rx._id}
                                >
                                    {dispensing === rx._id ? (
                                        'Dispensing...'
                                    ) : (
                                        <><CheckCircle size={14} /> Dispense</>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="admin-card filter-card">
                <div className="search-group">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Search patient records..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Patient Records Table */}
            <div className="admin-card">
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                        Loading EHR data...
                    </div>
                ) : filteredPatients.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                        <FileText size={40} strokeWidth={1.5} style={{ marginBottom: '12px' }} />
                        <p>No patient records found.</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Patient Name</th>
                                    <th>Blood Group</th>
                                    <th>Encounters</th>
                                    <th>Files</th>
                                    <th>Medications</th>
                                    <th>Last Visit</th>
                                    <th>Last Update</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPatients.map((patient) => (
                                    <tr key={patient._id}>
                                        <td>
                                            <div className="patient-cell">
                                                <div className="patient-avatar-sm">
                                                    {(patient.fullName || '?')[0]}
                                                </div>
                                                <div>
                                                    <span className="patient-name">{patient.fullName || 'Unknown'}</span>
                                                    {patient.gender && <span className="patient-meta">{patient.gender}</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            {patient.bloodGroup ? (
                                                <span className="blood-badge">{patient.bloodGroup}</span>
                                            ) : '—'}
                                        </td>
                                        <td>
                                            <span className="encounter-count">{patient.encounterCount}</span>
                                        </td>
                                        <td>
                                            <span className="encounter-count">{patient.documentCount || 0}</span>
                                        </td>
                                        <td>
                                            <span className="encounter-count">{patient.medicationCount || 0}</span>
                                        </td>
                                        <td>{formatDate(patient.lastVisit)}</td>
                                        <td>{formatDate(patient.lastUpdatedAt)}</td>
                                        <td>
                                            <button
                                                className="view-timeline-btn"
                                                onClick={() => setSelectedPatient(patient)}
                                            >
                                                <Clock size={14} /> View Timeline
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EHR;
