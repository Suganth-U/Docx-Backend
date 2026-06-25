import React, { useEffect, useMemo, useState } from 'react';
import {
    Activity,
    AlertCircle,
    CalendarDays,
    CheckCircle,
    ChevronDown,
    ChevronUp,
    Clock,
    Download,
    FileImage,
    FileText,
    Heart,
    Pill,
    Plus,
    Stethoscope,
    Thermometer,
    Weight,
} from 'lucide-react';
import api from "@/shared/lib/api";
import { appendEncounterNote, EHR_CATEGORIES, fetchEhrTimeline } from "@/shared/lib/ehrApi";
import FieldError from "@/shared/components/common/FieldError";
import "@/shared/components/common/PatientMedicalTimeline.css";

const TYPE_META = {
    doctor_note: { label: 'Doctor note', icon: Stethoscope, className: 'note' },
    document: { label: 'Document', icon: FileText, className: 'document' },
    medication: { label: 'Medication', icon: Pill, className: 'medication' },
    prescription: { label: 'Prescription', icon: FileText, className: 'prescription' },
};

const CATEGORY_LABELS = EHR_CATEGORIES.reduce((acc, item) => {
    acc[item.value] = item.label;
    return acc;
}, {});

const formatDate = (dateStr) => {
    if (!dateStr) return 'Not dated';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return 'Not dated';
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const formatFileSize = (value = 0) => {
    const size = Number(value || 0);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const getItemDate = (item) => item.recordDate || item.lastUpdatedAt || item.encounter?.timestamp || item.medication?.createdAt;

const PatientMedicalTimeline = ({
    patientId,
    filters = {},
    showFilters = false,
    allowNoteAdditions = false,
    compact = false,
    refreshKey = 0,
    onLoaded,
}) => {
    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [localFilters, setLocalFilters] = useState({
        category: 'all',
        doctor: '',
        specialty: '',
        sortBy: 'lastUpdatedAt',
        sortOrder: 'desc',
    });
    const [noteDrafts, setNoteDrafts] = useState({});
    const [noteErrors, setNoteErrors] = useState({});
    const [savingNoteId, setSavingNoteId] = useState('');

    const effectiveFilters = useMemo(
        () => ({
            limit: 100,
            ...(showFilters ? localFilters : {}),
            ...filters,
        }),
        [filters, localFilters, showFilters]
    );

    const loadTimeline = async () => {
        if (!patientId) return;
        try {
            setLoading(true);
            const data = await fetchEhrTimeline(patientId, effectiveFilters);
            const items = Array.isArray(data) ? data : data.items || data.timeline || [];
            setTimeline(items);
            onLoaded?.(data);
        } catch (error) {
            console.error('Failed to fetch patient timeline:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTimeline();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patientId, refreshKey, JSON.stringify(effectiveFilters)]);

    const toggleExpand = (id) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    const handleFilterChange = (name, value) => {
        setLocalFilters((current) => ({ ...current, [name]: value }));
    };

    const handleDownload = async (file) => {
        try {
            const response = await api.get(file.downloadUrl, { responseType: 'blob' });
            const url = URL.createObjectURL(response.data);
            window.open(url, '_blank', 'noopener,noreferrer');
            window.setTimeout(() => URL.revokeObjectURL(url), 30000);
        } catch (error) {
            console.error('Failed to open EHR file', error);
        }
    };

    const handleSaveNote = async (encounterId) => {
        const draft = noteDrafts[encounterId] || {};
        if (!draft.note?.trim()) {
            setNoteErrors((current) => ({
                ...current,
                [encounterId]: { ...(current[encounterId] || {}), note: 'Follow-up note is required.' },
            }));
            return;
        }

        try {
            setSavingNoteId(encounterId);
            await appendEncounterNote(encounterId, {
                note: draft.note,
                reason: draft.reason || '',
            });
            setNoteDrafts((current) => ({ ...current, [encounterId]: { note: '', reason: '' } }));
            setNoteErrors((current) => ({ ...current, [encounterId]: {} }));
            await loadTimeline();
        } catch (error) {
            console.error('Failed to append EHR note', error);
        } finally {
            setSavingNoteId('');
        }
    };

    const renderFilters = () => showFilters ? (
        <div className="timeline-filter-bar">
            <select value={localFilters.category} onChange={(event) => handleFilterChange('category', event.target.value)}>
                {EHR_CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>{category.label}</option>
                ))}
            </select>
            <input
                value={localFilters.doctor}
                onChange={(event) => handleFilterChange('doctor', event.target.value)}
                placeholder="Doctor name"
            />
            <input
                value={localFilters.specialty}
                onChange={(event) => handleFilterChange('specialty', event.target.value)}
                placeholder="Specialty"
            />
            <select value={localFilters.sortBy} onChange={(event) => handleFilterChange('sortBy', event.target.value)}>
                <option value="lastUpdatedAt">Last updated</option>
                <option value="recordDate">Record date</option>
            </select>
        </div>
    ) : null;

    const renderVitals = (vitals) => {
        if (!vitals || !Object.keys(vitals).some((key) => vitals[key])) return null;

        return (
            <div className="detail-section">
                <h5><Activity size={15} /> Vitals</h5>
                <div className="vitals-grid">
                    {vitals.bloodPressure && <div className="vital-chip"><Heart size={14} className="vital-icon bp" /><span>{vitals.bloodPressure}</span></div>}
                    {vitals.heartRate && <div className="vital-chip"><Activity size={14} className="vital-icon hr" /><span>{vitals.heartRate} bpm</span></div>}
                    {vitals.temperature && <div className="vital-chip"><Thermometer size={14} className="vital-icon temp" /><span>{vitals.temperature}°F</span></div>}
                    {vitals.weight && <div className="vital-chip"><Weight size={14} className="vital-icon wt" /><span>{vitals.weight} kg</span></div>}
                    {vitals.oxygenSaturation && <div className="vital-chip"><Activity size={14} className="vital-icon spo" /><span>SpO₂ {vitals.oxygenSaturation}%</span></div>}
                </div>
            </div>
        );
    };

    const renderEncounterDetails = (item) => {
        const enc = item.encounter || {};
        const rx = item.prescription;
        const isDispensed = rx?.status === 'DISPENSED';

        return (
            <>
                {renderVitals(enc.vitals)}
                {enc.symptoms && (
                    <div className="detail-section">
                        <h5><AlertCircle size={15} /> Symptoms</h5>
                        <p>{enc.symptoms}</p>
                    </div>
                )}
                {enc.doctorNotes && (
                    <div className="detail-section">
                        <h5><FileText size={15} /> Doctor notes</h5>
                        <p className="doctor-notes-text">{enc.doctorNotes}</p>
                    </div>
                )}
                {enc.noteAddenda?.length > 0 && (
                    <div className="detail-section">
                        <h5><Plus size={15} /> Updates</h5>
                        <div className="timeline-addenda">
                            {enc.noteAddenda.map((entry) => (
                                <div key={entry._id || `${enc._id}-${entry.addedAt}`} className="timeline-addendum">
                                    <strong>{formatDate(entry.addedAt)} {formatTime(entry.addedAt)}</strong>
                                    {entry.reason ? <span>{entry.reason}</span> : null}
                                    <p>{entry.note}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {rx?.medicines?.length > 0 && (
                    <div className="detail-section">
                        <h5><Pill size={15} /> Prescribed medicines</h5>
                        <div className="medicines-table-wrapper">
                            <table className="medicines-table">
                                <thead>
                                    <tr>
                                        <th>Medicine</th>
                                        <th>Dosage</th>
                                        <th>Frequency</th>
                                        <th>Duration</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rx.medicines.map((med, index) => (
                                        <tr key={`${med.name}-${index}`}>
                                            <td className="med-name">{med.name}</td>
                                            <td>{med.dosage}</td>
                                            <td>{med.frequency}</td>
                                            <td>{med.duration || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {rx && isDispensed && rx.dispenseTimestamp && (
                    <div className="dispense-info">
                        <Clock size={14} />
                        <span>Dispensed on {formatDate(rx.dispenseTimestamp)} at {formatTime(rx.dispenseTimestamp)}</span>
                    </div>
                )}
                {allowNoteAdditions && enc._id && (
                    <div className="timeline-note-editor">
                        <input
                            value={noteDrafts[enc._id]?.reason || ''}
                            onChange={(event) => setNoteDrafts((current) => ({
                                ...current,
                                [enc._id]: { ...(current[enc._id] || {}), reason: event.target.value },
                            }))}
                            placeholder="Update reason"
                        />
                        <textarea
                            value={noteDrafts[enc._id]?.note || ''}
                            onChange={(event) => setNoteDrafts((current) => ({
                                ...current,
                                [enc._id]: { ...(current[enc._id] || {}), note: event.target.value },
                            }))}
                            onInput={() => setNoteErrors((current) => ({
                                ...current,
                                [enc._id]: { ...(current[enc._id] || {}), note: '' },
                            }))}
                            placeholder="Add follow-up note"
                            aria-invalid={Boolean(noteErrors[enc._id]?.note)}
                        />
                        <FieldError message={noteErrors[enc._id]?.note} />
                        <button type="button" onClick={() => handleSaveNote(enc._id)} disabled={savingNoteId === enc._id}>
                            {savingNoteId === enc._id ? 'Saving...' : 'Add note update'}
                        </button>
                    </div>
                )}
            </>
        );
    };

    const renderDocumentDetails = (item) => (
        <div className="detail-section">
            <h5><FileImage size={15} /> Files</h5>
            <div className="timeline-files">
                {(item.files || []).map((file) => (
                    <button key={file._id} type="button" className="timeline-file" onClick={() => handleDownload(file)}>
                        <Download size={14} />
                        <span>{file.originalName}</span>
                        <small>{formatFileSize(file.size)}</small>
                    </button>
                ))}
            </div>
        </div>
    );

    const renderMedicationDetails = (item) => {
        const med = item.medication || {};
        return (
            <div className="detail-section">
                <h5><Pill size={15} /> Medication details</h5>
                <div className="timeline-field-grid">
                    <span><strong>Status</strong>{med.status || '-'}</span>
                    <span><strong>Source</strong>{String(med.source || '').replace(/_/g, ' ') || '-'}</span>
                    <span><strong>Start</strong>{formatDate(med.startDate)}</span>
                    <span><strong>End</strong>{med.endDate ? formatDate(med.endDate) : '-'}</span>
                </div>
                {med.notes ? <p className="doctor-notes-text">{med.notes}</p> : null}
            </div>
        );
    };

    const renderPrescriptionDetails = (item) => {
        const prescription = item.prescription || {};
        return prescription.medicines?.length ? (
            <div className="detail-section">
                <h5><Pill size={15} /> Medicines</h5>
                <div className="medicines-table-wrapper">
                    <table className="medicines-table">
                        <thead>
                            <tr>
                                <th>Medicine</th>
                                <th>Dosage</th>
                                <th>Frequency</th>
                                <th>Duration</th>
                            </tr>
                        </thead>
                        <tbody>
                            {prescription.medicines.map((med, index) => (
                                <tr key={`${med.name}-${index}`}>
                                    <td className="med-name">{med.name}</td>
                                    <td>{med.dosage}</td>
                                    <td>{med.frequency}</td>
                                    <td>{med.duration || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        ) : null;
    };

    const renderDetails = (item) => {
        if (item.type === 'doctor_note') return renderEncounterDetails(item);
        if (item.type === 'document') return renderDocumentDetails(item);
        if (item.type === 'medication') return renderMedicationDetails(item);
        if (item.type === 'prescription') return renderPrescriptionDetails(item);
        return null;
    };

    if (loading) {
        return (
            <div className="timeline-loading">
                <div className="timeline-spinner"></div>
                <p>Loading medical history...</p>
            </div>
        );
    }

    return (
        <div className={`medical-timeline ${compact ? 'compact' : ''}`}>
            {renderFilters()}
            {timeline.length === 0 ? (
                <div className="timeline-empty">
                    <FileText size={48} strokeWidth={1.5} />
                    <h3>No Medical Records</h3>
                    <p>No records match the current view.</p>
                </div>
            ) : (
                <div className="timeline-track">
                    {timeline.map((item, index) => {
                        const isExpanded = expandedId === item.id;
                        const itemDate = getItemDate(item);
                        const meta = TYPE_META[item.type] || TYPE_META.document;
                        const Icon = meta.icon;
                        const doctorName = item.doctor?.name || (item.type === 'medication' ? 'Medication record' : 'Patient upload');
                        const specialization = item.doctor?.specialization || CATEGORY_LABELS[item.category] || meta.label;

                        return (
                            <div key={`${item.type}-${item.id}`} className={`timeline-node ${index === 0 ? 'latest' : ''}`}>
                                <div className="timeline-date-marker">
                                    <div className="date-dot"></div>
                                    <span className="date-label">{formatDate(itemDate)}</span>
                                    <span className="time-label">{formatTime(itemDate)}</span>
                                    {item.lastUpdatedAt && (
                                        <span className="updated-label">Updated {formatDate(item.lastUpdatedAt)}</span>
                                    )}
                                </div>
                                <div className={`timeline-card ${isExpanded ? 'expanded' : ''} type-${meta.className}`}>
                                    <div className="tcard-header" onClick={() => toggleExpand(item.id)}>
                                        <div className="tcard-header-left">
                                            <div className="doctor-avatar">
                                                <Icon size={18} />
                                            </div>
                                            <div>
                                                <h4 className="doctor-name">{item.title || meta.label}</h4>
                                                <span className="doctor-spec">{doctorName} {specialization ? `• ${specialization}` : ''}</span>
                                            </div>
                                        </div>
                                        <div className="tcard-header-right">
                                            {item.prescription?.status && (
                                                <span className={`rx-badge ${item.prescription.status === 'DISPENSED' ? 'dispensed' : 'pending'}`}>
                                                    {item.prescription.status === 'DISPENSED' ? <><CheckCircle size={14} /> Dispensed</> : <><AlertCircle size={14} /> Pending</>}
                                                </span>
                                            )}
                                            {item.status && <span className={`timeline-status status-${item.status}`}>{item.status}</span>}
                                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </div>
                                    </div>
                                    {item.summary && (
                                        <div className="tcard-diagnosis">
                                            <strong>{CATEGORY_LABELS[item.category] || meta.label}:</strong> {item.summary}
                                        </div>
                                    )}
                                    {isExpanded && (
                                        <div className="tcard-details">
                                            {renderDetails(item)}
                                            <div className="dispense-info neutral">
                                                <CalendarDays size={14} />
                                                <span>Last updated {formatDate(item.lastUpdatedAt)} {formatTime(item.lastUpdatedAt)}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default PatientMedicalTimeline;
