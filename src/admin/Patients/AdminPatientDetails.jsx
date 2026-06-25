import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
    ArrowLeft, User, Mail, Phone, MapPin, Droplet,
    Calendar, FileText, ShoppingBag, MessageSquare,
    Clock, Activity, Heart, Contact, Tag, ShieldCheck, CheckCircle,
    Stethoscope, Monitor, Building2, Package, CreditCard, ArrowUpRight, ArrowDownLeft,
    Download
} from 'lucide-react';
import useAxiosPrivate from "@/shared/hooks/useAxiosPrivate";
import "@/admin/Patients/AdminPatientDetails.css";

const AdminPatientDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const axiosPrivate = useAxiosPrivate();
    const [searchParams] = useSearchParams();

    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
    const [isLoading, setIsLoading] = useState(true);
    const [patientData, setPatientData] = useState(null);

    useEffect(() => {
        fetchPatientData();
    }, [id]);

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (['overview', 'appointments', 'ehr', 'orders', 'chat'].includes(tab)) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    const fetchPatientData = async () => {
        setIsLoading(true);
        try {
            const { data } = await axiosPrivate.get(`/admin/patients/${id}`);
            setPatientData(data);
        } catch (error) {
            console.error("Failed to fetch comprehensive patient data", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="admin-page-content split-layout-loading">
                <div className="spinner-blue"></div>
                <p>Loading Patient Profile...</p>
            </div>
        );
    }

    if (!patientData) {
        return (
            <div className="admin-page-content split-layout-loading">
                <h3 className="text-red">Error: Patient Record Not Found</h3>
                <button className="back-btn" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Return</button>
            </div>
        );
    }

    const { profile, metrics, appointments, prescriptions, orders, messages } = patientData;

    return (
        <div className="admin-page-content enterprise-split-layout">
            
            {/* Left Sidebar: Sticky Profile Core */}
            <aside className="patient-sidebar">
                <div className="sidebar-header">
                    <button className="back-link" onClick={() => navigate('/admin/patients')}>
                        <ArrowLeft size={16} />
                        Back to Patients
                    </button>
                </div>
                
                <div className="sidebar-profile">
                    <div className="sidebar-avatar">
                        {profile.name.charAt(0).toUpperCase()}
                    </div>
                    <h2>{profile.name}</h2>
                    <span className="sidebar-id">ID: {profile.patientId.substring(0, 8).toUpperCase()}</span>
                    <span className={`status-badge ${profile.status === 'active' ? 'active' : 'pending'}`}>
                        {profile.status === 'active' ? <CheckCircle size={14} /> : <ShieldCheck size={14} />} 
                        {profile.status === 'active' ? 'Verified Account' : 'Pending Verification'}
                    </span>
                </div>

                <div className="sidebar-section">
                    <h3>Contact Information</h3>
                    <div className="sidebar-info-item">
                        <Mail size={16} className="icon-subtle" />
                        <span>{profile.email}</span>
                    </div>
                    <div className="sidebar-info-item">
                        <Phone size={16} className="icon-subtle" />
                        <span>{profile.phone || 'N/A'}</span>
                    </div>
                    <div className="sidebar-info-item">
                        <MapPin size={16} className="icon-subtle" />
                        <span>{profile.address || 'N/A'}</span>
                    </div>
                </div>

                <div className="sidebar-section">
                    <h3>Physical Vitals</h3>
                    <div className="vitals-grid">
                        <div className="vital-box">
                            <span className="vital-label">Gender</span>
                            <strong className="vital-value">{profile.gender || '--'}</strong>
                        </div>
                        <div className="vital-box">
                            <span className="vital-label">Height</span>
                            <strong className="vital-value">{profile.height || '--'}</strong>
                        </div>
                        <div className="vital-box">
                            <span className="vital-label">Weight</span>
                            <strong className="vital-value">{profile.weight || '--'}</strong>
                        </div>
                        <div className="vital-box">
                            <span className="vital-label">Blood</span>
                            <strong className="vital-value text-rose">{profile.bloodGroup || '--'}</strong>
                        </div>
                    </div>
                </div>

                <div className="sidebar-actions">
                    <button className="action-btn primary">
                        <ShieldCheck size={16} /> Verify Account
                    </button>
                    <button className="action-btn secondary">
                        <Download size={16} /> Export Data
                    </button>
                </div>
            </aside>

            {/* Right Content Area */}
            <main className="patient-main-content">
                <div className="main-tabs-wrapper">
                    <div className="main-tabs">
                        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
                        <button className={`tab-btn ${activeTab === 'appointments' ? 'active' : ''}`} onClick={() => setActiveTab('appointments')}>Appointments <span className="tab-count">{metrics.totalAppointments}</span></button>
                        <button className={`tab-btn ${activeTab === 'ehr' ? 'active' : ''}`} onClick={() => setActiveTab('ehr')}>EHR <span className="tab-count">{prescriptions.length}</span></button>
                        <button className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>Orders <span className="tab-count">{metrics.totalOrders}</span></button>
                        <button className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>Chat Logs <span className="tab-count">{messages.length}</span></button>
                    </div>
                </div>

                <div className="main-content-area">
                    {activeTab === 'overview' && (
                        <div className="tab-overview fade-in">
                            <h2 className="section-title">Key Metrics</h2>
                            <div className="metrics-grid">
                                <div className="metric-card">
                                    <span className="metric-label">Total Appointments</span>
                                    <span className="metric-value">{metrics.totalAppointments}</span>
                                </div>
                                <div className="metric-card">
                                    <span className="metric-label">Pharmacy Spent</span>
                                    <span className="metric-value">₹{metrics.totalSpent.toLocaleString()}</span>
                                </div>
                                <div className="metric-card">
                                    <span className="metric-label">Age / DOB</span>
                                    <span className="metric-value">{profile.dob ? new Date(profile.dob).toLocaleDateString() : 'N/A'}</span>
                                </div>
                                <div className="metric-card">
                                    <span className="metric-label">Joined</span>
                                    <span className="metric-value">{new Date(profile.createdAt).getFullYear()}</span>
                                </div>
                            </div>
                            
                            <h2 className="section-title" style={{marginTop: '40px'}}>Recent Activity Summary</h2>
                            <div className="empty-sub">
                                <Activity size={24} color="#9CA3AF" style={{marginBottom: '10px'}} />
                                <p>Detailed activity timeline is being aggregated.</p>
                                <span>Check the specific tabs for appointments and orders.</span>
                            </div>
                        </div>
                    )}

                    {activeTab === 'appointments' && (
                        <div className="tab-appointments fade-in enterprise-table-wrapper">
                            {appointments.length === 0 ? <p className="empty-sub">No appointments on record.</p> : (
                                <table className="enterprise-table">
                                    <thead>
                                        <tr>
                                            <th>Date & Time</th>
                                            <th>Doctor</th>
                                            <th>Type</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {appointments.map(apt => (
                                            <tr key={apt._id}>
                                                <td>
                                                    <div className="td-flex">
                                                        <Calendar size={14} className="icon-subtle" /> 
                                                        <span>{new Date(apt.date).toLocaleDateString()} &middot; <span className="text-muted">{apt.timeSlot || 'TBD'}</span></span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="td-flex">
                                                        <Stethoscope size={14} className="icon-subtle" /> 
                                                        <span>{apt.doctor_id?.fullName || 'Unknown'}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`pill-badge ${apt.type === 'VIRTUAL' ? 'pill-blue' : 'pill-gray'}`}>
                                                        {apt.type === 'VIRTUAL' ? <Monitor size={12} /> : <Building2 size={12} />}
                                                        {apt.type === 'VIRTUAL' ? 'Virtual' : 'Physical'}
                                                    </span>
                                                </td>
                                                <td><span className="pill-badge pill-outline">{apt.status}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {activeTab === 'ehr' && (
                        <div className="tab-ehr fade-in">
                            {prescriptions.length === 0 ? <p className="empty-sub">No electronic health records found.</p> : (
                                <div className="ehr-cards-grid">
                                    {prescriptions.map(fx => (
                                        <div key={fx._id} className="ehr-record-card">
                                            <div className="ehr-card-header">
                                                <h4>{fx.diagnosis}</h4>
                                                <span className="ehr-date">{new Date(fx.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <p className="ehr-doc">Dr. {fx.doctor_id?.fullName || 'Unknown'}</p>
                                            <div className="ehr-meds-list">
                                                {fx.medicines.map((med, i) => (
                                                    <div key={i} className="med-item">
                                                        <div className="med-name">{med.name}</div>
                                                        <div className="med-details">{med.dosage} &middot; {med.frequency} &middot; {med.duration}</div>
                                                    </div>
                                                ))}
                                            </div>
                                            {fx.notes && <div className="ehr-notes"><p>{fx.notes}</p></div>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'orders' && (
                        <div className="tab-orders fade-in enterprise-table-wrapper">
                            {orders.length === 0 ? <p className="empty-sub">No pharmacy orders made.</p> : (
                                <table className="enterprise-table">
                                    <thead>
                                        <tr>
                                            <th>Order ID</th>
                                            <th>Date</th>
                                            <th>Amount</th>
                                            <th>Payment</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orders.map(ord => (
                                            <tr key={ord._id}>
                                                <td className="mono text-muted">{ord._id.substring(0, 8).toUpperCase()}</td>
                                                <td>
                                                    <div className="td-flex">
                                                        <Calendar size={14} className="icon-subtle" /> 
                                                        {new Date(ord.createdAt).toLocaleDateString()}
                                                    </div>
                                                </td>
                                                <td>₹{ord.totalPrice}</td>
                                                <td>
                                                    <span className={`pill-badge ${ord.isPaid ? 'pill-green' : 'pill-outline'}`}>
                                                        {ord.isPaid ? 'Paid' : 'Unpaid'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`pill-badge ${ord.isDelivered ? 'pill-gray' : 'pill-amber'}`}>
                                                        {ord.isDelivered ? 'Delivered' : 'Processing'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {activeTab === 'chat' && (
                        <div className="tab-chat fade-in enterprise-table-wrapper">
                            {messages.length === 0 ? <p className="empty-sub">No chat interactions logged.</p> : (
                                <table className="enterprise-table">
                                    <thead>
                                        <tr>
                                            <th>Timestamp</th>
                                            <th>Direction</th>
                                            <th>Preview</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {messages.map(msg => {
                                            const isOutgoing = msg.sender?._id === profile._id;
                                            return (
                                                <tr key={msg._id}>
                                                    <td><span className="text-muted">{new Date(msg.createdAt).toLocaleString()}</span></td>
                                                    <td>
                                                        <span className={`pill-badge ${isOutgoing ? 'pill-indigo' : 'pill-gray'}`}>
                                                            {isOutgoing ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                                                            {isOutgoing ? `To: ${msg.recipient?.name}` : `From: ${msg.sender?.name}`}
                                                        </span>
                                                    </td>
                                                    <td className="msg-preview">{msg.content}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminPatientDetails;
