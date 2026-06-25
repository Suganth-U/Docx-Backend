import React, { useState } from "react";
import styled from "styled-components";
import { FaCloudUploadAlt, FaPaperPlane, FaFileAlt, FaCheckCircle, FaTimes } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { addToCart } from "@/shared/lib/storage";
import { uploadPrescriptionProof } from "@/shared/features/Epharmacy/pharmacyClient";
import { useToast } from "@/shared/context/ToastContext";
import FieldError from "@/shared/components/common/FieldError";
import { clearFieldError, validateRequiredFields } from "@/shared/lib/formValidation";

// --- Theme ---
const THEME = {
  primary: "#683B93",
  primaryHover: "#55307a",
  secondary: "#9F72CA",
  bg: "#f8f9fa",
  white: "#ffffff",
  text: "#3D2660",
  textLight: "#777",
  border: "#e0e0e0",
  success: "#2ecc71",
  error: "#e74c3c",
};

const MAX_PRESCRIPTION_FILE_SIZE = 5 * 1024 * 1024;

// --- Styled Components ---

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  padding: 20px;
  backdrop-filter: blur(5px);
`;

const ModalContent = styled.div`
  background: ${THEME.white};
  border-radius: 20px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  padding: 40px;
  animation: slideUp 0.3s ease-out;

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (max-width: 768px) {
    padding: 25px;
  }
`;

const CloseButton = styled.button`
    position: absolute;
    top: 20px;
    right: 20px;
    background: transparent;
    border: none;
    font-size: 20px;
    color: ${THEME.textLight};
    cursor: pointer;
    transition: color 0.2s;
    z-index: 10;
    
    &:hover { color: ${THEME.error}; }
`;

const ModalHeader = styled.div`
    text-align: center;
    margin-bottom: 30px;

    h2 {
        font-size: 24px;
        font-weight: 700;
        color: ${THEME.text};
        margin-bottom: 10px;
    }

    p {
        font-size: 14px;
        color: ${THEME.textLight};
    }
`;

const FormGroup = styled.div`
  margin-bottom: 20px;

  label {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: ${THEME.text};
    margin-bottom: 8px;
  }

  input, textarea {
    width: 100%;
    padding: 12px 15px;
    border: 1px solid ${THEME.border};
    border-radius: 8px;
    font-size: 15px;
    color: ${THEME.text};
    transition: all 0.2s;
    background: #FAFAFA;

    &:focus {
      outline: none;
      border-color: ${THEME.primary};
      background: ${THEME.white};
      box-shadow: 0 0 0 3px rgba(104, 59, 147, 0.1);
    }
  }

  textarea {
    resize: vertical;
    min-height: 100px;
  }
`;

const UploadArea = styled.div`
  border: 2px dashed ${props => props.isDragActive ? THEME.primary : THEME.border};
  background: ${props => props.isDragActive ? 'rgba(104, 59, 147, 0.05)' : '#FAFAFA'};
  border-radius: 12px;
  padding: 30px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  margin-bottom: 25px;

  &:hover {
    border-color: ${THEME.primary};
    background: rgba(104, 59, 147, 0.02);
  }

  input {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    opacity: 0;
    cursor: pointer;
  }

  .icon-circle {
    width: 50px;
    height: 50px;
    background: ${THEME.secondary}20; // 20% opacity
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 15px;
    
    svg {
      color: ${THEME.primary};
      font-size: 24px;
    }
  }

  h3 {
    font-size: 15px;
    font-weight: 600;
    color: ${THEME.text};
    margin-bottom: 6px;
  }

  p {
    font-size: 12px;
    color: ${THEME.textLight};
    margin: 0;
  }
`;

const FilePreview = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: ${THEME.bg};
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 25px;
  border: 1px solid ${THEME.border};

  .file-info {
    display: flex;
    align-items: center;
    gap: 15px;

    .icon {
      color: ${THEME.primary};
      font-size: 24px;
    }

    div {
      display: flex;
      flex-direction: column;

      span.name {
        font-weight: 500;
        color: ${THEME.text};
        font-size: 14px;
      }

      span.size {
        font-size: 12px;
        color: ${THEME.textLight};
      }
    }
  }

  button {
    background: none;
    border: none;
    color: ${THEME.textLight};
    cursor: pointer;
    padding: 5px;
    transition: color 0.2s;

    &:hover {
      color: ${THEME.error};
    }
  }
`;

const SubmitButton = styled.button`
  background: ${THEME.primary};
  color: white;
  width: 100%;
  padding: 15px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.2s;

  &:hover {
    background: ${THEME.primaryHover};
    transform: translateY(-2px);
  }

  &:disabled {
    background: ${THEME.border};
    cursor: not-allowed;
    transform: none;
  }
`;

const SuccessMessage = styled.div`
  text-align: center;
  padding: 20px 0;

  .icon {
    font-size: 60px;
    color: ${THEME.success};
    margin-bottom: 20px;
  }

  h2 {
    color: ${THEME.text};
    margin-bottom: 10px;
  }

  p {
    color: ${THEME.textLight};
    margin-bottom: 30px;
  }

  button {
    background: ${THEME.primary};
    color: white;
    padding: 12px 30px;
    border-radius: 8px;
    border: none;
    font-weight: 600;
    cursor: pointer;
    margin: 0 5px;
  }
`;

const PrescriptionUploadModal = ({ isOpen, onClose, product, qty }) => {
  const [file, setFile] = useState(null);
  const toast = useToast();
  const [isDragActive, setIsDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [uploadedProof, setUploadedProof] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState({
    fullName: "",
    mobileNumber: "",
    notes: ""
  });

  if (!isOpen) return null;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      clearFieldError(setFieldErrors, "file");
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      clearFieldError(setFieldErrors, "file");
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    clearFieldError(setFieldErrors, e.target.name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validateRequiredFields(formData, {
      fullName: "Full name",
      mobileNumber: "Mobile number",
    });
    if (!file) {
      nextErrors.file = "Please upload a prescription file.";
    }

    if (file?.size > MAX_PRESCRIPTION_FILE_SIZE) {
      nextErrors.file = "Prescription file must be 5 MB or smaller.";
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      return;
    }

    setLoading(true);
    try {
      const prescriptionUpload = await uploadPrescriptionProof(file, {
        patientName: formData.fullName,
        patientPhone: formData.mobileNumber,
        notes: formData.notes,
      });
      setUploadedProof(prescriptionUpload);
      setIsSuccess(true);
    } catch (error) {
      toast.error(error.response?.data?.message || "Prescription upload failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Overlay onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()}>
        <CloseButton onClick={onClose}><FaTimes /></CloseButton>

        {isSuccess ? (
          <SuccessMessage>
            <FaCheckCircle className="icon" />
            <h2>Prescription Uploaded!</h2>
            {product ? (
              <>
                <p>Your prescription for <strong>{product.name}</strong> has been uploaded.<br />Item added to cart.</p>
                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button onClick={() => {
                    addToCart({
                      _id: product._id,
                      MedicineName: product.name,
                      Price: product.price,
                      ImagePath: product.image,
                      ...product,
                      prescriptionUpload: uploadedProof,
                    }, qty || 1);
                    navigate('/cart');
                  }}>Proceed to Checkout</button>
                  <button style={{ background: '#f5f5f5', color: '#3D2660' }} onClick={onClose}>Continue Shopping</button>
                </div>
              </>
            ) : (
              <p>Prescription uploaded successfully.</p>
            )}
          </SuccessMessage>
        ) : (
          <>
            <ModalHeader>
              <h2>Upload Prescription</h2>
              <p>Please upload a clear image. Our pharmacists will review it.</p>
            </ModalHeader>

            <form onSubmit={handleSubmit} noValidate>
              {product && (
                <div style={{ padding: '15px', background: '#f3e5f5', borderLeft: '4px solid #683B93', borderRadius: '4px', marginBottom: '25px' }}>
                  <p style={{ margin: 0, fontWeight: '600', color: '#683B93' }}>Uploading for: {product.name}</p>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <FormGroup>
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    aria-invalid={Boolean(fieldErrors.fullName)}
                  />
                  <FieldError message={fieldErrors.fullName} />
                </FormGroup>
                <FormGroup>
                  <label>Mobile Number</label>
                  <input
                    type="tel"
                    name="mobileNumber"
                    required
                    value={formData.mobileNumber}
                    onChange={handleChange}
                    aria-invalid={Boolean(fieldErrors.mobileNumber)}
                  />
                  <FieldError message={fieldErrors.mobileNumber} />
                </FormGroup>
              </div>

              {!file ? (
                <UploadArea
                  isDragActive={isDragActive}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input type="file" accept="image/*,.pdf" onChange={handleFileSelect} />
                  <div className="icon-circle">
                    <FaCloudUploadAlt />
                  </div>
                  <h3>Click or Drag & Drop to Upload</h3>
                  <p>Supported formats: JPEG, PNG, PDF (Max 5MB)</p>
                </UploadArea>
              ) : (
                <FilePreview>
                  <div className="file-info">
                    <FaFileAlt className="icon" />
                    <div>
                      <span className="name">{file.name}</span>
                      <span className="size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  </div>
                  <button type="button" onClick={() => setFile(null)}>
                    <FaTimes />
                  </button>
                </FilePreview>
              )}
              <FieldError message={fieldErrors.file} style={{ marginTop: "-16px", marginBottom: 16 }} />

              <FormGroup>
                <label>Additional Notes (Optional)</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                ></textarea>
              </FormGroup>

              <SubmitButton type="submit" disabled={loading}>
                {loading ? "Uploading..." : "Submit Prescription"}
                {!loading && <FaPaperPlane />}
              </SubmitButton>
            </form>
          </>
        )}
      </ModalContent>
    </Overlay>
  );
};

export default PrescriptionUploadModal;
