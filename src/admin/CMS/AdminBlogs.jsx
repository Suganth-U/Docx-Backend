import React, { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Edit2, Trash2, X, Save, Image as ImageIcon, Layout, CheckCircle, XCircle, FileText, User } from "lucide-react";
import ConfirmModal from "@/shared/components/ui/ConfirmModal";
import FieldError from "@/shared/components/common/FieldError";
import { clearFieldError, validateRequiredFields } from "@/shared/lib/formValidation";
import "@/admin/AdminModules.css";
import "@/admin/CMS/AdminBlogs.css";

const API_BASE = "http://localhost:5001/api/cms";

const AdminBlogs = () => {
    const [blogs, setBlogs] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ title: "", category: "", content: "", authorName: "", image: "", isPublished: true });
    const [fieldErrors, setFieldErrors] = useState({});
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, onConfirm: () => {} });

    const fetchBlogs = async () => {
        const { data } = await axios.get(`${API_BASE}/blogs`);
        setBlogs(data);
    };

    useEffect(() => { fetchBlogs(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const nextErrors = validateRequiredFields(form, {
            title: "Article title",
            category: "Category",
            authorName: "Author name",
            content: "Article body",
        });
        setFieldErrors(nextErrors);
        if (Object.keys(nextErrors).length) {
            return;
        }

        if (editingId) {
            await axios.put(`${API_BASE}/blogs/${editingId}`, form);
        } else {
            await axios.post(`${API_BASE}/blogs`, form);
        }
        closeDrawer();
        fetchBlogs();
    };

    const handleEdit = (blog) => {
        setForm({ title: blog.title, category: blog.category, content: blog.content, authorName: blog.authorName, image: blog.image || "", isPublished: blog.isPublished });
        setEditingId(blog._id);
        setFieldErrors({});
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        setConfirmModal({
            isOpen: true,
            onConfirm: async () => {
                await axios.delete(`${API_BASE}/blogs/${id}`);
                fetchBlogs();
            }
        });
    };

    const closeDrawer = () => {
        setShowForm(false);
        setEditingId(null);
        setForm({ title: "", category: "", content: "", authorName: "", image: "", isPublished: true });
        setFieldErrors({});
    }

    const setFormField = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
        clearFieldError(setFieldErrors, field);
    };

    const togglePublishStatus = async (blog) => {
        await axios.put(`${API_BASE}/blogs/${blog._id}`, { isPublished: !blog.isPublished });
        fetchBlogs();
    };

    const categories = ["INNOVATION", "MENTAL HEALTH", "NUTRITION", "LIFESTYLE", "CARDIOLOGY", "TECHNOLOGY", "WELLNESS"];

    return (
        <div className="admin-page-container">
            <div className="admin-page-header">
                <div>
                    <h1 className="page-title">Manage Blogs</h1>
                    <p className="page-breadcrumb">Content Management / Blogs</p>
                </div>
                <button className="admin-btn-primary" onClick={() => setShowForm(true)}>
                    <Plus size={18} /> Add New Blog
                </button>
            </div>

            {showForm && (
                <>
                    <div className="cms-drawer-overlay" onClick={closeDrawer} />
                    <div className="cms-drawer">
                        <div className="cms-drawer-header">
                            <h3>{editingId ? "Edit Blog Post" : "Create New Blog Post"}</h3>
                            <button onClick={closeDrawer} className="close-btn"><X size={20} /></button>
                        </div>

                        <div className="cms-drawer-body">
                            <form id="blog-form" onSubmit={handleSubmit} className="cms-form" noValidate>
                                <div className="form-group full-width">
                                    <label>Article Title</label>
                                    <div className="input-with-icon">
                                        <FileText size={18} className="input-icon" />
                                        <input type="text" placeholder="Enter an engaging title..." value={form.title} onChange={(e) => setFormField("title", e.target.value)} aria-invalid={Boolean(fieldErrors.title)} />
                                    </div>
                                    <FieldError message={fieldErrors.title} />
                                </div>

                                <div className="form-row">
                                    <div className="form-group flex-1">
                                        <label>Category</label>
                                        <div className="select-wrapper">
                                            <Layout size={16} className="input-icon" />
                                            <select value={form.category} onChange={(e) => setFormField("category", e.target.value)} aria-invalid={Boolean(fieldErrors.category)}>
                                                <option value="" disabled>Select Category</option>
                                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <FieldError message={fieldErrors.category} />
                                    </div>
                                    <div className="form-group flex-1">
                                        <label>Author Name</label>
                                        <div className="input-with-icon">
                                            <User size={16} className="input-icon" />
                                            <input type="text" placeholder="Enter author name" value={form.authorName} onChange={(e) => setFormField("authorName", e.target.value)} aria-invalid={Boolean(fieldErrors.authorName)} />
                                        </div>
                                        <FieldError message={fieldErrors.authorName} />
                                    </div>
                                </div>

                                <div className="form-group full-width">
                                    <label>Cover Image URL (Optional)</label>
                                    <div className="input-with-icon">
                                        <ImageIcon size={16} className="input-icon" />
                                        <input type="text" placeholder="https://example.com/image.jpg" value={form.image} onChange={(e) => setFormField("image", e.target.value)} />
                                    </div>
                                </div>

                                <div className="form-group full-width">
                                    <label>Article Body</label>
                                    <textarea rows={12} placeholder="Write your blog content here..." value={form.content} onChange={(e) => setFormField("content", e.target.value)} aria-invalid={Boolean(fieldErrors.content)} />
                                    <FieldError message={fieldErrors.content} />
                                </div>
                            </form>
                        </div>

                        <div className="cms-drawer-footer">
                            <div className="status-toggle">
                                <label className="toggle-label">Publish immediately?</label>
                                <label className="switch">
                                    <input type="checkbox" checked={form.isPublished} onChange={(e) => setFormField("isPublished", e.target.checked)} />
                                    <span className="slider"></span>
                                </label>
                            </div>
                            <div className="footer-actions">
                                <button type="button" className="btn-secondary" onClick={closeDrawer}>Cancel</button>
                                <button type="submit" form="blog-form" className="admin-btn-primary">
                                    <Save size={16} /> {editingId ? "Save Changes" : "Publish Article"}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <div className="blogs-grid">
                {blogs.length === 0 ? (
                    <div className="empty-state-card">
                        <FileText size={48} className="empty-state-icon" />
                        <h4>No blogs published yet</h4>
                        <p>Share your knowledge and insights. Click the button below to create your first engaging blog post.</p>
                        <button className="admin-btn-primary" onClick={() => setShowForm(true)}>
                            <Plus size={18} /> Add New Blog
                        </button>
                    </div>
                ) : blogs.map((blog) => (
                    <div key={blog._id} className="blog-card">
                        {blog.image ? (
                            <img src={blog.image} alt={blog.title} className="blog-card-image" />
                        ) : (
                            <div className="blog-card-image placeholder">
                                <ImageIcon size={32} />
                            </div>
                        )}
                        <div className="blog-card-content">
                            <div className="blog-card-meta">
                                <span className="blog-badge">{blog.category}</span>
                                <span className="blog-date">{new Date(blog.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                            <h3 className="blog-card-title" title={blog.title}>{blog.title}</h3>
                            <div className="blog-card-author">
                                <User size={14} /> {blog.authorName}
                            </div>
                            
                            <div className="blog-card-footer">
                                <button 
                                    className={`status-indicator ${blog.isPublished ? 'published' : 'draft'}`}
                                    style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                                    onClick={() => togglePublishStatus(blog)}
                                    title="Toggle Publish Status"
                                >
                                    {blog.isPublished ? <><CheckCircle size={14} /> Published</> : <><XCircle size={14} /> Draft</>}
                                </button>
                                <div className="blog-card-actions">
                                    <button className="action-icon-btn edit" onClick={() => handleEdit(blog)} title="Edit"><Edit2 size={16} /></button>
                                    <button className="action-icon-btn delete" onClick={() => handleDelete(blog._id)} title="Delete"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title="Delete Blog Post?"
                message="This blog post will be permanently removed. This action cannot be undone."
                variant="danger"
            />
        </div>
    );
};

export default AdminBlogs;
