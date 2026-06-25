import React, { useCallback, useEffect, useState } from 'react';
import { Edit2, Camera, User, Mail, Phone, MapPin, Stethoscope, Award, PenTool } from 'lucide-react';
import { assets } from "@/shared/lib/assets";
import "@/doctor/Profile/DocProfile.css";
import api from "@/shared/lib/api";
import { useToast } from "@/shared/context/ToastContext";
import { sriLankanHospitals } from "@/shared/data/hospitals";

const emptyDoctorProfile = {
  name: "",
  email: "",
  phone: "",
  specialty: "",
  experience: "",
  fees: "",
  hospitalName: "",
  rating: "Not rated",
  patients: 0,
  availability: "No schedules set",
  about: "",
  education: [],
  educationText: "",
  profileImageUrl: "",
  signatureImageUrl: "",
  signatureUpdatedAt: null,
};

const normalizeEducation = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeDoctorProfile = (data = {}) => {
  const education = normalizeEducation(data.education);

  return {
    ...emptyDoctorProfile,
    ...data,
    specialty: data.specialty || data.specialization || "",
    experience: data.experience ?? "",
    fees: data.fees ?? "",
    rating: data.rating || "Not rated",
    patients: Number(data.patients ?? data.totalPatients ?? 0),
    availability: data.availability || "No schedules set",
    about: data.about || "",
    education,
    educationText: education.join("\n"),
  };
};

const DocProfile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const toast = useToast();

  const [doctor, setDoctor] = useState(emptyDoctorProfile);

  const fetchProfile = useCallback(async () => {
    try {
      const { data } = await api.get('/doctor/profile');
      setDoctor(normalizeDoctorProfile(data));
    } catch (error) {
      console.error("Failed to fetch profile", error);
      toast.error(error.response?.data?.message || "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleChange = (e) => {
    setDoctor({ ...doctor, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      const { data } = await api.put('/doctor/profile', {
        name: doctor.name,
        specialization: doctor.specialty,
        hospitalName: doctor.hospitalName,
        experience: doctor.experience,
        fees: doctor.fees,
        phone: doctor.phone,
        about: doctor.about,
        education: normalizeEducation(doctor.educationText),
      });
      setDoctor(normalizeDoctorProfile(data));
      setIsEditing(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Failed to update", error);
      toast.error("Failed to update profile.");
    }
  };

  const handleSignatureUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("signature", file);

    setUploadingSignature(true);
    try {
      const { data } = await api.post("/doctor/profile/signature", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setDoctor((prev) => ({
        ...prev,
        signatureImageUrl: data.signatureImageUrl,
        signatureUpdatedAt: data.signatureUpdatedAt,
      }));
      toast.success("Signature uploaded successfully.");
    } catch (error) {
      console.error("Failed to upload signature", error);
      toast.error(error.response?.data?.message || "Failed to upload signature.");
    } finally {
      setUploadingSignature(false);
      event.target.value = "";
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  const profileImage =
    doctor.profileImageUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.name || "Doctor")}&background=9481ff&color=fff`;
  const hasAvailability = doctor.availability === "Available";

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="page-title">My Profile</h2>
          <p className="page-subtitle">Manage your personal information</p>
        </div>
        <button className="btn-secondary" onClick={() => isEditing ? handleSave() : setIsEditing(true)}>
          <Edit2 size={16} />
          {isEditing ? 'Save Changes' : 'Edit Profile'}
        </button>
      </div>

      <div className="profile-container">
        {/* Left Column - Image & Quick Stats */}
        <div className="profile-sidebar">
          <div className="profile-card text-center">
            <div className="profile-image-container">
              <img src={profileImage || assets.avatar} alt="Doctor" className="profile-img-lg" />
              <button className="camera-btn" type="button" title="Profile photo upload is not enabled yet">
                <Camera size={16} />
              </button>
            </div>
            <h3 className="profile-name">{doctor.name || "Doctor"}</h3>
            <p className="profile-specialty">{doctor.specialty || "Specialization not added"}</p>

            <div className="profile-stats-row">
              <div className="p-stat">
                <span className="p-val">{doctor.experience ? `${doctor.experience} yrs` : "0 yrs"}</span>
                <span className="p-lbl">Experience</span>
              </div>
              <div className="p-divider"></div>
              <div className="p-stat">
                <span className="p-val">{doctor.rating}</span>
                <span className="p-lbl">Rating</span>
              </div>
              <div className="p-divider"></div>
              <div className="p-stat">
                <span className="p-val">{doctor.patients}</span>
                <span className="p-lbl">Patients</span>
              </div>
            </div>
          </div>

          <div className="profile-card mt-4">
            <h4 className="card-title-sm">Availability Status</h4>
            <div className="status-toggle">
              <span className={`status-dot ${hasAvailability ? "active" : "inactive"}`}></span>
              <span className="status-text">{doctor.availability}</span>
              <label className="switch">
                <input type="checkbox" checked={hasAvailability} readOnly disabled />
                <span className="slider round"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column - Details */}
        <div className="profile-content">
          <div className="profile-card">
            <h4 className="card-title">Personal Information</h4>

            <div className="form-grid">
              <div className="form-group">
                <label>Full Name</label>
                <div className="input-with-icon">
                  <User size={18} />
                  <input type="text" name="name" value={doctor.name} onChange={handleChange} disabled={!isEditing} />
                </div>
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <div className="input-with-icon">
                  <Mail size={18} />
                  <input type="email" name="email" value={doctor.email} disabled={true} />
                </div>
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <div className="input-with-icon">
                  <Phone size={18} />
                  <input type="tel" name="phone" value={doctor.phone} onChange={handleChange} disabled={!isEditing} />
                </div>
              </div>
              <div className="form-group">
                <label>Hospital / Location</label>
                <div className="input-with-icon">
                  <MapPin size={18} />
                  <input type="text" name="hospitalName" list="hospital-list" value={doctor.hospitalName} onChange={handleChange} disabled={!isEditing} />
                  <datalist id="hospital-list">
                    {sriLankanHospitals.map(h => <option key={h} value={h} />)}
                  </datalist>
                </div>
              </div>
            </div>

            <div className="form-group mt-4">
              <label>About Me</label>
              <textarea
                rows="4"
                name="about"
                value={doctor.about}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="Add a short professional bio"
              ></textarea>
            </div>
          </div>

          <div className="profile-card mt-4">
            <h4 className="card-title">Professional Details</h4>

            <div className="form-grid">
              <div className="form-group">
                <label>Specialization</label>
                <div className="input-with-icon">
                  <Stethoscope size={18} />
                  <input type="text" name="specialty" value={doctor.specialty} onChange={handleChange} disabled={!isEditing} />
                </div>
              </div>
              <div className="form-group">
                <label>Consultation Fee</label>
                <div className="input-with-icon">
                  <span className="currency">LKR</span>
                  <input type="text" name="fees" value={doctor.fees} onChange={handleChange} disabled={!isEditing} />
                </div>
              </div>
            </div>

            <div className="form-group mt-4">
              <label>Education</label>
              {isEditing ? (
                <textarea
                  rows="4"
                  name="educationText"
                  value={doctor.educationText}
                  onChange={handleChange}
                  placeholder="Add one qualification per line"
                ></textarea>
              ) : doctor.education.length ? (
                doctor.education.map((edu, idx) => (
                  <div key={`${edu}-${idx}`} className="edu-item">
                    <Award size={16} className="edu-icon" />
                    <span>{edu}</span>
                  </div>
                ))
              ) : (
                <div className="edu-item">
                  <Award size={16} className="edu-icon" />
                  <span>No education details added</span>
                </div>
              )}
            </div>
          </div>

          <div className="profile-card mt-4">
            <h4 className="card-title">Digital Prescription Signature</h4>
            <p style={{ color: '#6B7280', marginTop: 0, lineHeight: 1.6 }}>
              This signature is used on every signed digital prescription PDF you issue from the doctor request workspace.
            </p>

            <div style={{
              border: '1px solid #E9DFF4',
              borderRadius: '16px',
              padding: '18px',
              background: '#FAF8FC',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '18px',
              alignItems: 'center'
            }}>
              <div style={{
                width: '220px',
                minHeight: '110px',
                background: 'white',
                border: '1px dashed #CDB8E5',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px'
              }}>
                {doctor.signatureImageUrl ? (
                  <img
                    src={doctor.signatureImageUrl}
                    alt="Doctor signature"
                    style={{ maxWidth: '100%', maxHeight: '80px', objectFit: 'contain' }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', color: '#7B6695' }}>
                    <PenTool size={22} style={{ marginBottom: '8px' }} />
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>No signature uploaded</div>
                  </div>
                )}
              </div>

              <div style={{ flex: 1, minWidth: '240px' }}>
                <div style={{ color: '#1F2937', fontWeight: 700, marginBottom: '6px' }}>
                  {doctor.signatureImageUrl ? 'Signature ready' : 'Upload a signature image'}
                </div>
                <div style={{ color: '#6B7280', fontSize: '14px', lineHeight: 1.7, marginBottom: '14px' }}>
                  PNG, JPG, or WEBP files work best. A clean handwritten signature on a plain background gives the best result on the prescription PDF.
                </div>
                {doctor.signatureUpdatedAt && (
                  <div style={{ color: '#8F79A9', fontSize: '13px', marginBottom: '14px' }}>
                    Last updated: {new Date(doctor.signatureUpdatedAt).toLocaleString()}
                  </div>
                )}
                <label className="btn-secondary" style={{ display: 'inline-flex', cursor: uploadingSignature ? 'not-allowed' : 'pointer', opacity: uploadingSignature ? 0.7 : 1 }}>
                  <PenTool size={16} />
                  {uploadingSignature ? 'Uploading...' : 'Upload Signature'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleSignatureUpload}
                    style={{ display: 'none' }}
                    disabled={uploadingSignature}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DocProfile;
