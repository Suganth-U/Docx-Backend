import React, { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Edit2, Trash2, X, Save, MessageSquareText, HelpCircle, CheckCircle, XCircle } from "lucide-react";
import ConfirmModal from "@/shared/components/ui/ConfirmModal";
import FieldError from "@/shared/components/common/FieldError";
import { clearFieldError, validateRequiredFields } from "@/shared/lib/formValidation";
import "@/admin/AdminModules.css";
import "@/admin/CMS/AdminFaqs.css";

const API_BASE = "http://localhost:5001/api/cms";

const AdminFaqs = () => {
    const [faqs, setFaqs] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ question: "", answer: "", isActive: true });
    const [fieldErrors, setFieldErrors] = useState({});
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, onConfirm: () => {} });

    const fetchFaqs = async () => {
        const { data } = await axios.get(`${API_BASE}/faqs`);
        setFaqs(data);
    };

    useEffect(() => { fetchFaqs(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const nextErrors = validateRequiredFields(form, {
            question: "Question",
            answer: "Answer",
        });
        setFieldErrors(nextErrors);
        if (Object.keys(nextErrors).length) {
            return;
        }

        if (editingId) {
            await axios.put(`${API_BASE}/faqs/${editingId}`, form);
        } else {
            await axios.post(`${API_BASE}/faqs`, form);
        }
        closeDrawer();
        fetchFaqs();
    };

    const handleEdit = (faq) => {
        setForm({ question: faq.question, answer: faq.answer, isActive: faq.isActive });
        setEditingId(faq._id);
        setFieldErrors({});
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        setConfirmModal({
            isOpen: true,
            onConfirm: async () => {
                await axios.delete(`${API_BASE}/faqs/${id}`);
                fetchFaqs();
            }
        });
    };

    const closeDrawer = () => {
        setShowForm(false);
        setEditingId(null);
        setForm({ question: "", answer: "", isActive: true });
        setFieldErrors({});
    }

    const setFormField = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
        clearFieldError(setFieldErrors, field);
    };

    const toggleActive = async (faq) => {
        await axios.put(`${API_BASE}/faqs/${faq._id}`, { isActive: !faq.isActive });
        fetchFaqs();
    };

    return (
        <div className="admin-page-container">
            <div className="admin-page-header">
                <div>
                    <h1 className="page-title">Manage FAQs</h1>
                    <p className="page-breadcrumb">Content Management / Frequently Asked Questions</p>
                </div>
                <button className="admin-btn-primary" onClick={() => setShowForm(true)}>
                    <Plus size={18} /> Add New FAQ
                </button>
            </div>

            {showForm && (
                <>
                    <div className="cms-drawer-overlay" onClick={closeDrawer} />
                    <div className="cms-drawer">
                        <div className="cms-drawer-header">
                            <h3>{editingId ? "Edit FAQ" : "Create New FAQ"}</h3>
                            <button onClick={closeDrawer} className="close-btn"><X size={20} /></button>
                        </div>

                        <div className="cms-drawer-body">
                            <form id="faq-form" onSubmit={handleSubmit} className="cms-form" noValidate>
                                <div className="form-group full-width">
                                    <label>Question</label>
                                    <div className="input-with-icon">
                                        <HelpCircle size={18} className="input-icon" />
                                        <input
                                            type="text"
                                            placeholder="Enter the question"
                                            value={form.question}
                                            onChange={(e) => setFormField("question", e.target.value)}
                                            aria-invalid={Boolean(fieldErrors.question)}
                                        />
                                    </div>
                                    <FieldError message={fieldErrors.question} />
                                </div>

                                <div className="form-group full-width">
                                    <label>Answer</label>
                                    <div className="textarea-wrapper">
                                        <MessageSquareText size={18} className="textarea-icon" />
                                        <textarea
                                            rows={8}
                                            placeholder="Provide a detailed and helpful response..."
                                            value={form.answer}
                                            onChange={(e) => setFormField("answer", e.target.value)}
                                            aria-invalid={Boolean(fieldErrors.answer)}
                                        />
                                    </div>
                                    <FieldError message={fieldErrors.answer} />
                                </div>
                            </form>
                        </div>

                        <div className="cms-drawer-footer">
                            <div className="status-toggle">
                                <label className="toggle-label">Active & Visible?</label>
                                <label className="switch">
                                    <input type="checkbox" checked={form.isActive} onChange={(e) => setFormField("isActive", e.target.checked)} />
                                    <span className="slider"></span>
                                </label>
                            </div>
                            <div className="footer-actions">
                                <button type="button" className="btn-secondary" onClick={closeDrawer}>Cancel</button>
                                <button type="submit" form="faq-form" className="admin-btn-primary">
                                    <Save size={16} /> {editingId ? "Update FAQ" : "Publish FAQ"}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <div className="faqs-list">
                {faqs.length === 0 ? (
                    <div className="empty-state-card">
                        <MessageSquareText size={48} className="empty-state-icon" />
                        <h4>No FAQs found</h4>
                        <p>Create your first frequently asked question to help guide your users.</p>
                        <button className="admin-btn-primary" onClick={() => setShowForm(true)}>
                            <Plus size={18} /> Add New FAQ
                        </button>
                    </div>
                ) : faqs.map((faq) => (
                    <div key={faq._id} className="faq-card">
                        <div className="faq-content-area">
                            <h4 className="faq-card-question">
                                <span className="faq-q-icon"><HelpCircle size={16} /></span>
                                {faq.question}
                            </h4>
                            <p className="faq-card-answer">{faq.answer}</p>
                            
                            <div className="faq-card-meta">
                                <span className="faq-card-date">
                                    Last Updated: {new Date(faq.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                            </div>
                        </div>

                        <div className="faq-actions-area">
                            <button
                                className={`status-pill ${faq.isActive ? "published" : "draft"}`}
                                onClick={() => toggleActive(faq)}
                                title="Click to toggle status"
                            >
                                {faq.isActive ? <><CheckCircle size={14} /> Active</> : <><XCircle size={14} /> Inactive</>}
                            </button>
                            
                            <div className="action-btns">
                                <button className="icon-action-btn edit" onClick={() => handleEdit(faq)} title="Edit"><Edit2 size={16} /></button>
                                <button className="icon-action-btn delete" onClick={() => handleDelete(faq._id)} title="Delete"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title="Delete FAQ?"
                message="This FAQ will be permanently removed from the system."
                variant="danger"
            />
        </div>
    );
};

export default AdminFaqs;
