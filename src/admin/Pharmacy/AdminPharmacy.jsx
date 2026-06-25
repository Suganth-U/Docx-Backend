import React, { useState, useEffect, useMemo } from 'react';
import api from "@/shared/lib/api";
import { useSearchParams } from "react-router-dom";
import {
    Search, Package, AlertTriangle, FileText, Plus, Trash2, Edit2, X, Save,
    RefreshCw, Pill, ShieldCheck, ShoppingCart, Clock, CheckCircle, TrendingUp,
    Filter, ArrowUpDown
} from 'lucide-react';
import { useToast } from "@/shared/context/ToastContext";
import ConfirmModal from "@/shared/components/ui/ConfirmModal";
import FieldError from "@/shared/components/common/FieldError";
import { clearFieldError, validateRequiredFields } from "@/shared/lib/formValidation";
import "@/admin/Pharmacy/AdminPharmacy.css";

const TABS = [
    { id: 'inventory', label: 'Inventory', icon: <Package size={16} /> },
    { id: 'low-stock', label: 'Low Stock Alerts', icon: <AlertTriangle size={16} /> },
    { id: 'rx-verify', label: 'Rx Verification', icon: <ShieldCheck size={16} /> },
    { id: 'orders', label: 'Order History', icon: <ShoppingCart size={16} /> },
];

const AdminPharmacy = () => {
    const [searchParams] = useSearchParams();
    const initialTab = TABS.some((tab) => tab.id === searchParams.get('tab')) ? searchParams.get('tab') : 'inventory';
    const [activeTab, setActiveTab] = useState(initialTab);
    const toast = useToast();
    const [stats, setStats] = useState({});
    const [medicines, setMedicines] = useState([]);
    const [lowStock, setLowStock] = useState([]);
    const [orders, setOrders] = useState([]);
    const [rxOrders, setRxOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
    const [orderFilter, setOrderFilter] = useState(searchParams.get('status') || 'all');
    const [sortField, setSortField] = useState('name');
    const [sortDir, setSortDir] = useState('asc');
    const [refreshing, setRefreshing] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentMed, setCurrentMed] = useState(null);
    const [formData, setFormData] = useState({
        name: '', category: '', price: '', stock: '', manufacturer: '',
        description: '', image: '/assets/medicines/Paracetamol.png',
        requiresPrescription: false, isHighRisk: false, restrictedPrescriptionCategory: '',
        reorderLevel: 50, reorderQuantity: 100
    });
    const [fieldErrors, setFieldErrors] = useState({});

    // Refill Modal
    const [refillModal, setRefillModal] = useState(null);
    const [refillQty, setRefillQty] = useState('');
    const [refillErrors, setRefillErrors] = useState({});
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, onConfirm: () => {} });

    // Action states
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => { fetchAll(); }, []);

    useEffect(() => {
        const nextTab = searchParams.get('tab');
        if (TABS.some((tab) => tab.id === nextTab)) {
            setActiveTab(nextTab);
        }
        setSearchQuery(searchParams.get('search') || '');
        setOrderFilter(searchParams.get('status') || 'all');
    }, [searchParams]);

    const fetchAll = async () => {
        setRefreshing(true);
        try {
            // Fetch medicines first (public endpoint — always works)
            const medsRes = await api.get('/medicines');
            setMedicines(medsRes.data);
        } catch (err) {
            console.error('Failed to fetch medicines:', err);
        }

        // Fetch admin-protected endpoints individually so one failure doesn't block others
        try { const r = await api.get('/admin/pharmacy/stats'); setStats(r.data); }
        catch (e) { console.warn('Stats fetch skipped:', e.message); }

        try { const r = await api.get('/admin/pharmacy/low-stock'); setLowStock(r.data); }
        catch (e) { console.warn('Low-stock fetch skipped:', e.message); }

        try { const r = await api.get('/admin/pharmacy/orders'); setOrders(r.data); }
        catch (e) { console.warn('Orders fetch skipped:', e.message); }

        try { const r = await api.get('/admin/pharmacy/rx-verification'); setRxOrders(r.data); }
        catch (e) { console.warn('Rx verification fetch skipped:', e.message); }

        setLoading(false);
        setRefreshing(false);
    };

    // ─── Medicine CRUD ───
    const handleOpenModal = (med = null) => {
        if (med) {
            setCurrentMed(med);
            setFormData({
                name: med.name, category: med.category, price: med.price,
                stock: med.stock, manufacturer: med.manufacturer,
                description: med.description, image: med.image,
                requiresPrescription: med.requiresPrescription || false,
                isHighRisk: med.isHighRisk || false,
                restrictedPrescriptionCategory: med.restrictedPrescriptionCategory || '',
                reorderLevel: med.reorderLevel || 50,
                reorderQuantity: med.reorderQuantity || 100,
            });
        } else {
            setCurrentMed(null);
            setFormData({
                name: '', category: '', price: '', stock: '', manufacturer: '',
                description: '', image: '/assets/medicines/Paracetamol.png',
                requiresPrescription: false, isHighRisk: false, restrictedPrescriptionCategory: '',
                reorderLevel: 50, reorderQuantity: 100
            });
        }
        setFieldErrors({});
        setIsModalOpen(true);
    };

    const setMedicineField = (field, value) => {
        setFormData((current) => ({ ...current, [field]: value }));
        clearFieldError(setFieldErrors, field);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const nextErrors = validateRequiredFields(formData, {
            name: "Medicine name",
            category: "Category",
            manufacturer: "Manufacturer",
            price: "Price",
            stock: "Current stock",
        });
        setFieldErrors(nextErrors);
        if (Object.keys(nextErrors).length) {
            return;
        }

        try {
            if (currentMed) {
                await api.put(`/medicines/${currentMed._id}`, formData);
            } else {
                await api.post('/medicines', formData);
            }
            setFieldErrors({});
            setIsModalOpen(false);
            fetchAll();
        } catch (err) {
            console.error('Submit failed:', err);
            toast.error(err.response?.data?.message || 'Operation failed');
        }
    };

    const handleDelete = async (id) => {
        setConfirmModal({
            isOpen: true,
            onConfirm: async () => {
                try {
                    await api.delete(`/medicines/${id}`);
                    fetchAll();
                } catch { toast.error('Delete failed'); }
            }
        });
    };

    // ─── Refill ───
    const handleRefill = async () => {
        if (!refillModal) return;
        if (!String(refillQty || '').trim()) {
            setRefillErrors({ refillQty: "Quantity to add is required." });
            return;
        }
        if (Number(refillQty) <= 0) {
            setRefillErrors({ refillQty: "Quantity must be greater than zero." });
            return;
        }
        setActionLoading(refillModal._id);
        try {
            await api.put(`/admin/pharmacy/refill/${refillModal._id}`, {
                quantity: Number(refillQty) || refillModal.reorderQuantity || 100
            });
            setRefillModal(null);
            setRefillQty('');
            fetchAll();
        } catch { toast.error('Refill failed'); }
        finally { setActionLoading(null); }
    };

    const openRefillModal = (medicine) => {
        setRefillModal(medicine);
        setRefillQty(medicine.reorderQuantity || 100);
        setRefillErrors({});
    };

    // ─── Orders ───
    const handleDeliver = async (orderId) => {
        setActionLoading(orderId);
        try {
            await api.put(`/admin/pharmacy/orders/${orderId}/deliver`);
            fetchAll();
        } catch { toast.error('Failed to mark delivered'); }
        finally { setActionLoading(null); }
    };

    const handleVerify = async (orderId) => {
        setActionLoading(orderId);
        try {
            await api.put(`/admin/pharmacy/orders/${orderId}/verify`);
            fetchAll();
        } catch (err) { toast.error(err.response?.data?.message || 'Verification failed'); }
        finally { setActionLoading(null); }
    };

    // ─── Sorting & Filtering ───
    const sortedMedicines = useMemo(() => {
        let filtered = medicines.filter(m =>
            m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.manufacturer.toLowerCase().includes(searchQuery.toLowerCase())
        );
        return filtered.sort((a, b) => {
            const aVal = a[sortField], bVal = b[sortField];
            if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
        });
    }, [medicines, searchQuery, sortField, sortDir]);

    const filteredOrders = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        let filtered = orders;

        if (orderFilter === 'paid') filtered = filtered.filter(o => o.isPaid);
        else if (orderFilter === 'unpaid') filtered = filtered.filter(o => !o.isPaid);
        else if (orderFilter === 'delivered') filtered = filtered.filter(o => o.isDelivered);

        if (!query) return filtered;

        return filtered.filter((order) => {
            const haystack = [
                order._id,
                order.user?.name,
                order.user?.email,
                order.fullName,
                order.email,
                order.phone,
                order.paymentStatus,
                order.shippingAddress?.city,
                ...(order.orderItems || []).map((item) => item.name),
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return haystack.includes(query);
        });
    }, [orders, orderFilter, searchQuery]);

    const toggleSort = (field) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('asc'); }
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
    const formatCurrency = (v) => `LKR ${(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    if (loading) return <div className="pharm-loading"><div className="pharm-spinner"></div><p>Loading Pharmacy CRM...</p></div>;

    return (
        <>
        <div className="pharm-container">
            {/* Header */}
            <div className="pharm-header">
                <div>
                    <h1 className="pharm-title">Pharmacy Management</h1>
                    <p className="pharm-breadcrumb">Admin / Pharmacy CRM</p>
                </div>
                <div className="pharm-header-actions">
                    <button className="pharm-btn-ghost" onClick={fetchAll} disabled={refreshing}>
                        <RefreshCw size={16} className={refreshing ? 'spin-anim' : ''} />
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                    <button className="pharm-btn-primary" onClick={() => handleOpenModal()}>
                        <Plus size={16} /> Add Medicine
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="pharm-stats-grid">
                <div className="pharm-stat"><div className="pharm-stat-icon si-blue"><Package size={20} /></div><div><h3>{stats.totalMedicines || 0}</h3><p>Medications</p></div></div>
                <div className="pharm-stat"><div className="pharm-stat-icon si-green"><TrendingUp size={20} /></div><div><h3>{(stats.totalStock || 0).toLocaleString()}</h3><p>Total Stock</p></div></div>
                <div className="pharm-stat alert-stat" onClick={() => setActiveTab('low-stock')} style={{ cursor: 'pointer' }}><div className="pharm-stat-icon si-red"><AlertTriangle size={20} /></div><div><h3>{stats.lowStockCount || 0}</h3><p>Low Stock</p></div></div>
                <div className="pharm-stat"><div className="pharm-stat-icon si-purple"><Pill size={20} /></div><div><h3>{stats.prescriptionMeds || 0}</h3><p>Rx Required</p></div></div>
                <div className="pharm-stat" onClick={() => setActiveTab('orders')} style={{ cursor: 'pointer' }}><div className="pharm-stat-icon si-orange"><ShoppingCart size={20} /></div><div><h3>{stats.totalOrders || 0}</h3><p>Total Orders</p></div></div>
                <div className="pharm-stat" onClick={() => setActiveTab('rx-verify')} style={{ cursor: 'pointer' }}><div className="pharm-stat-icon si-amber"><ShieldCheck size={20} /></div><div><h3>{stats.pendingEPrescriptions || 0}</h3><p>Pending Rx</p></div></div>
            </div>

            {/* Tabs */}
            <div className="pharm-tabs">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        className={`pharm-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.icon} {tab.label}
                        {tab.id === 'low-stock' && stats.lowStockCount > 0 && (
                            <span className="tab-badge red">{stats.lowStockCount}</span>
                        )}
                        {tab.id === 'rx-verify' && rxOrders.length > 0 && (
                            <span className="tab-badge amber">{rxOrders.length}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* ═══ TAB: INVENTORY ═══ */}
            {activeTab === 'inventory' && (
                <div className="pharm-card">
                    <div className="card-toolbar">
                        <div className="search-box">
                            <Search size={16} />
                            <input placeholder="Search medicines, categories, manufacturers..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                        </div>
                    </div>
                    <div className="table-scroll">
                        <table className="pharm-table">
                            <thead>
                                <tr>
                                    <th onClick={() => toggleSort('name')} className="sortable">Name <ArrowUpDown size={12} /></th>
                                    <th onClick={() => toggleSort('category')} className="sortable">Category <ArrowUpDown size={12} /></th>
                                    <th onClick={() => toggleSort('price')} className="sortable">Price <ArrowUpDown size={12} /></th>
                                    <th onClick={() => toggleSort('stock')} className="sortable">Stock <ArrowUpDown size={12} /></th>
                                    <th>Rx</th>
                                    <th>Reorder Lvl</th>
                                    <th>Manufacturer</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedMedicines.length === 0 ? (
                                    <tr><td colSpan="8" className="empty-row">No medicines found.</td></tr>
                                ) : sortedMedicines.map(m => (
                                    <tr key={m._id} className={m.stock <= (m.reorderLevel || 50) ? 'row-alert' : ''}>
                                        <td className="med-name-cell">
                                            <span className="med-name">{m.name}</span>
                                        </td>
                                        <td><span className="cat-badge">{m.category}</span></td>
                                        <td>{formatCurrency(m.price)}</td>
                                        <td>
                                            <span className={`stock-badge ${m.stock <= (m.reorderLevel || 50) ? 'critical' : m.stock <= (m.reorderLevel || 50) * 2 ? 'warning' : 'good'}`}>
                                                {m.stock}
                                            </span>
                                        </td>
                                        <td>{m.requiresPrescription ? <span className="rx-tag">Rx</span> : <span className="otc-tag">OTC</span>}</td>
                                        <td>{m.reorderLevel || 50}</td>
                                        <td className="mfr-cell">{m.manufacturer}</td>
                                        <td>
                                            <div className="action-group">
                                                <button className="act-btn edit" title="Edit" onClick={() => handleOpenModal(m)}><Edit2 size={14} /></button>
                                                <button className="act-btn refill" title="Refill" onClick={() => openRefillModal(m)}><RefreshCw size={14} /></button>
                                                <button className="act-btn delete" title="Delete" onClick={() => handleDelete(m._id)}><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══ TAB: LOW STOCK ALERTS ═══ */}
            {activeTab === 'low-stock' && (
                <div className="pharm-card">
                    <div className="card-header-bar">
                        <h3><AlertTriangle size={18} /> Low Stock Alerts</h3>
                        <span className="alert-count">{lowStock.length} items need attention</span>
                    </div>
                    {lowStock.length === 0 ? (
                        <div className="empty-state">
                            <CheckCircle size={48} strokeWidth={1.5} />
                            <h3>All stocked up!</h3>
                            <p>No medicines are below their reorder level.</p>
                        </div>
                    ) : (
                        <div className="low-stock-grid">
                            {lowStock.map(m => (
                                <div key={m._id} className="low-stock-card">
                                    <div className="lsc-top">
                                        <div className="lsc-info">
                                            <h4>{m.name}</h4>
                                            <span className="lsc-cat">{m.category} · {m.manufacturer}</span>
                                        </div>
                                        {m.requiresPrescription && <span className="rx-tag">Rx</span>}
                                    </div>
                                    <div className="lsc-stock-bar">
                                        <div className="stock-track">
                                            <div
                                                className="stock-fill"
                                                style={{
                                                    width: `${Math.min(100, (m.stock / Math.max(m.reorderLevel * 3, 1)) * 100)}%`,
                                                    background: m.stock === 0 ? '#ef4444' : m.stock <= m.reorderLevel / 2 ? '#f97316' : '#eab308'
                                                }}
                                            ></div>
                                        </div>
                                        <div className="stock-numbers">
                                            <span className="current-stock">{m.stock} units</span>
                                            <span className="reorder-level">Reorder at {m.reorderLevel}</span>
                                        </div>
                                    </div>
                                    <div className="lsc-actions">
                                        <button
                                            className="refill-btn"
                                            onClick={() => openRefillModal(m)}
                                        >
                                            <RefreshCw size={14} /> Refill +{m.reorderQuantity || 100}
                                        </button>
                                        {m.lastRestockedAt && (
                                            <span className="last-restock">Last: {formatDate(m.lastRestockedAt)}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ═══ TAB: RX VERIFICATION ═══ */}
            {activeTab === 'rx-verify' && (
                <div className="pharm-card">
                    <div className="card-header-bar">
                        <h3><ShieldCheck size={18} /> Prescription Verification Queue</h3>
                        <span className="alert-count amber">{rxOrders.length} orders need verification</span>
                    </div>
                    {rxOrders.length === 0 ? (
                        <div className="empty-state">
                            <ShieldCheck size={48} strokeWidth={1.5} />
                            <h3>All clear!</h3>
                            <p>No orders currently require prescription verification.</p>
                        </div>
                    ) : (
                        <div className="rx-list">
                            {rxOrders.map(order => (
                                <div key={order._id} className="rx-card">
                                    <div className="rx-card-header">
                                        <div>
                                            <h4>{order.user?.name || order.fullName || 'Guest customer'}</h4>
                                            <span className="rx-email">{order.user?.email || order.email}</span>
                                        </div>
                                        <div className="rx-meta">
                                            <span className="rx-date">{formatDate(order.createdAt)}</span>
                                            <span className="rx-total">{formatCurrency(order.totalPrice)}</span>
                                        </div>
                                    </div>
                                    <div className="rx-items">
                                        <p className="rx-items-label">Prescription-required items:</p>
                                        {order.rxItems?.map((item, i) => (
                                            <div key={i} className="rx-item-chip">
                                                <Pill size={12} />
                                                <span>{item.medicineName || item.name}</span>
                                                <span className="rx-item-qty">×{item.qty}</span>
                                                {item.prescriptionUpload?.fileName && (
                                                    <a
                                                        className="rx-proof-file"
                                                        href={item.prescriptionUpload.fileUrl || undefined}
                                                        rel="noreferrer"
                                                        target="_blank"
                                                    >
                                                        <FileText size={11} /> {item.prescriptionUpload.fileName}
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="rx-card-actions">
                                        <button
                                            className="verify-btn"
                                            onClick={() => handleVerify(order._id)}
                                            disabled={actionLoading === order._id}
                                        >
                                            {actionLoading === order._id ? 'Verifying...' : <><CheckCircle size={14} /> Verify & Approve</>}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ═══ TAB: ORDER HISTORY ═══ */}
            {activeTab === 'orders' && (
                <div className="pharm-card">
                    <div className="card-toolbar">
                        <div className="search-box">
                            <Search size={16} />
                            <input placeholder="Search customers, order IDs, medicines..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                        </div>
                        <div className="search-box">
                            <Filter size={16} />
                            <select value={orderFilter} onChange={e => setOrderFilter(e.target.value)} className="filter-select">
                                <option value="all">All Orders</option>
                                <option value="paid">Paid</option>
                                <option value="unpaid">Unpaid</option>
                                <option value="delivered">Delivered</option>
                            </select>
                        </div>
                        <span className="result-count">{filteredOrders.length} orders</span>
                    </div>
                    {filteredOrders.length === 0 ? (
                        <div className="empty-state">
                            <ShoppingCart size={48} strokeWidth={1.5} />
                            <h3>No orders found</h3>
                            <p>No orders match the current filter.</p>
                        </div>
                    ) : (
                        <div className="table-scroll">
                            <table className="pharm-table">
                                <thead>
                                    <tr>
                                        <th>Customer</th>
                                        <th>Items</th>
                                        <th>Total</th>
                                        <th>Payment</th>
                                        <th>Delivery</th>
                                        <th>Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredOrders.map(order => (
                                        <tr key={order._id}>
                                            <td>
                                                <div className="customer-cell">
                                                    <span className="customer-name">{order.user?.name || 'N/A'}</span>
                                                    <span className="customer-email">{order.user?.email || ''}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="order-items-cell">
                                                    {order.orderItems?.slice(0, 2).map((item, i) => (
                                                        <span key={i} className="order-item-tag">{item.name} ×{item.qty}</span>
                                                    ))}
                                                    {order.orderItems?.length > 2 && (
                                                        <span className="order-item-more">+{order.orderItems.length - 2} more</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="price-cell">{formatCurrency(order.totalPrice)}</td>
                                            <td>{order.isPaid ?
                                                <span className="status-badge paid"><CheckCircle size={12} /> Paid</span> :
                                                <span className="status-badge unpaid"><Clock size={12} /> Unpaid</span>
                                            }</td>
                                            <td>{order.isDelivered ?
                                                <span className="status-badge delivered">Delivered</span> :
                                                <span className="status-badge pending">Pending</span>
                                            }</td>
                                            <td>{formatDate(order.createdAt)}</td>
                                            <td>
                                                {!order.isDelivered && order.isPaid && (
                                                    <button
                                                        className="deliver-btn"
                                                        onClick={() => handleDeliver(order._id)}
                                                        disabled={actionLoading === order._id}
                                                    >
                                                        {actionLoading === order._id ? '...' : 'Deliver'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ═══ ADD/EDIT MEDICINE MODAL ═══ */}
            {isModalOpen && (
                <div className="pharm-modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="pharm-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-top">
                            <h3>{currentMed ? 'Edit Medicine' : 'Add New Medicine'}</h3>
                            <button className="modal-close" onClick={() => setIsModalOpen(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-body" noValidate>
                            <div className="form-grid">
                                <div className="fg"><label>Medicine Name *</label><input value={formData.name} onChange={e => setMedicineField('name', e.target.value)} aria-invalid={Boolean(fieldErrors.name)} /><FieldError message={fieldErrors.name} /></div>
                                <div className="fg"><label>Category *</label><input list="cats" value={formData.category} onChange={e => setMedicineField('category', e.target.value)} aria-invalid={Boolean(fieldErrors.category)} />
                                    <datalist id="cats">{[...new Set(medicines.map(m => m.category))].map(c => <option key={c} value={c} />)}</datalist>
                                    <FieldError message={fieldErrors.category} />
                                </div>
                                <div className="fg"><label>Manufacturer *</label><input value={formData.manufacturer} onChange={e => setMedicineField('manufacturer', e.target.value)} aria-invalid={Boolean(fieldErrors.manufacturer)} /><FieldError message={fieldErrors.manufacturer} /></div>
                                <div className="fg"><label>Price (LKR) *</label><input type="number" step="0.01" value={formData.price} onChange={e => setMedicineField('price', e.target.value)} aria-invalid={Boolean(fieldErrors.price)} /><FieldError message={fieldErrors.price} /></div>
                                <div className="fg"><label>Current Stock *</label><input type="number" value={formData.stock} onChange={e => setMedicineField('stock', e.target.value)} aria-invalid={Boolean(fieldErrors.stock)} /><FieldError message={fieldErrors.stock} /></div>
                                <div className="fg"><label>Reorder Level</label><input type="number" value={formData.reorderLevel} onChange={e => setMedicineField('reorderLevel', Number(e.target.value))} /></div>
                                <div className="fg"><label>Reorder Quantity</label><input type="number" value={formData.reorderQuantity} onChange={e => setMedicineField('reorderQuantity', Number(e.target.value))} /></div>
                                <div className="fg fg-check">
                                    <label className="check-label">
                                        <input type="checkbox" checked={formData.requiresPrescription} onChange={e => setMedicineField('requiresPrescription', e.target.checked)} />
                                        <span>Requires Prescription</span>
                                    </label>
                                </div>
                                <div className="fg fg-check">
                                    <label className="check-label">
                                        <input type="checkbox" checked={formData.isHighRisk} onChange={e => setMedicineField('isHighRisk', e.target.checked)} />
                                        <span>Block Digital Rx</span>
                                    </label>
                                </div>
                                <div className="fg">
                                    <label>Restricted Category</label>
                                    <input
                                        value={formData.restrictedPrescriptionCategory}
                                        onChange={e => setMedicineField('restrictedPrescriptionCategory', e.target.value)}
                                        placeholder="Controlled, sedative, opioid"
                                    />
                                </div>
                            </div>
                            <div className="fg full"><label>Description</label><textarea rows="2" value={formData.description} onChange={e => setMedicineField('description', e.target.value)}></textarea></div>
                            <div className="fg full"><label>Image Path</label><input value={formData.image} onChange={e => setMedicineField('image', e.target.value)} /></div>
                            <div className="modal-footer">
                                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-save"><Save size={14} /> {currentMed ? 'Update' : 'Add'} Medicine</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ═══ REFILL MODAL ═══ */}
            {refillModal && (
                <div className="pharm-modal-overlay" onClick={() => setRefillModal(null)}>
                    <div className="pharm-modal refill-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-top">
                            <h3><RefreshCw size={18} /> Refill Stock</h3>
                            <button className="modal-close" onClick={() => setRefillModal(null)}><X size={18} /></button>
                        </div>
                        <div className="modal-body refill-body">
                            <div className="refill-info">
                                <h4>{refillModal.name}</h4>
                                <p>Current stock: <strong>{refillModal.stock}</strong> · Reorder level: {refillModal.reorderLevel || 50}</p>
                            </div>
                            <div className="fg">
                                <label>Quantity to add</label>
                                <input
                                    type="number"
                                    value={refillQty}
                                    onChange={e => {
                                        setRefillQty(e.target.value);
                                        clearFieldError(setRefillErrors, 'refillQty');
                                    }}
                                    min="1"
                                    autoFocus
                                    aria-invalid={Boolean(refillErrors.refillQty)}
                                />
                                <FieldError message={refillErrors.refillQty} />
                            </div>
                            <p className="refill-preview">New stock will be: <strong>{refillModal.stock + (Number(refillQty) || 0)}</strong></p>
                            <div className="modal-footer">
                                <button className="btn-cancel" onClick={() => setRefillModal(null)}>Cancel</button>
                                <button className="btn-save refill-confirm" onClick={handleRefill} disabled={actionLoading === refillModal._id}>
                                    <RefreshCw size={14} /> {actionLoading === refillModal._id ? 'Restocking...' : 'Confirm Refill'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
        <ConfirmModal
            isOpen={confirmModal.isOpen}
            onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
            onConfirm={confirmModal.onConfirm}
            title="Delete Medicine?"
            message="This medicine will be permanently removed from inventory."
            variant="danger"
        />
    </>
    );
};

export default AdminPharmacy;
