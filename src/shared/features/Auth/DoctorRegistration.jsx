import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { FaCloudUploadAlt, FaEye, FaEyeSlash, FaTimes } from "react-icons/fa";
import api from "@/shared/lib/api";
import { assets } from "@/shared/lib/assets";
import AuthPolicyDisclosure from "@/shared/components/auth/AuthPolicyDisclosure";
import { useToast } from "@/shared/context/ToastContext";
import { specialtyCatalog } from "@/shared/data/specialties";
import { sriLankanHospitals } from "@/shared/data/hospitals";
import {
  AuthLayout,
  ContextEyebrow,
  FieldGrid,
  FieldGroup,
  FieldHint,
  FieldLabel,
  FormBlock,
  FormInput,
  FormSelect,
  InputShell,
  InlineAlert,
  MainSubtitle,
  MainTitle,
  PrimaryButton,
  ActionIconButton,
  FooterText,
} from "@/shared/components/auth/AuthScaffold";
import {
  getEmailError,
  getFriendlyAuthError,
  getPasswordError,
  getPasswordMatchError,
  getPositiveNumberError,
  getRequiredError,
} from "@/shared/features/Auth/authValidation";

const StrengthBar = styled.div`
  display: flex;
  gap: 4px;
  height: 4px;
  width: 100%;
  margin-top: 6px;
`;

const StrengthSegment = styled.div`
  flex: 1;
  border-radius: 999px;
  background: ${(props) => props.$color || "#E5E7EB"};
  transition: background 0.2s ease;
`;

const StrengthHint = styled.div`
  font-size: 0.72rem;
  color: #9CA3AF;
  margin-top: 4px;
`;

const PasswordMeta = styled.div`
  min-height: 30px;
`;

const DoctorFormShell = styled.div`
  width: 75%;
  max-width: 920px;
  margin: 0 auto;

  @media (max-width: 960px) {
    width: 100%;
  }
`;

const UploadGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const UploadArea = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
  border-radius: 12px;
  background-color: #FAFAFA;
  border: 2px dashed ${(props) => (props.$error ? "#EF4444" : "#E5E7EB")};
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 160px;

  &:hover {
    background-color: #F3F4F6;
    border-color: #D1D5DB;
  }
`;

const CloudIcon = styled.div`
  color: #111827;
  font-size: 3rem;
  margin-bottom: 16px;
`;

const UploadText = styled.div`
  color: #111827;
  font-size: 0.9rem;
  font-weight: 500;
  text-align: center;
`;

const UploadFileName = styled.div`
  margin-top: 12px;
  color: #4B5563;
  font-size: 0.85rem;
  font-weight: 600;
  text-align: center;
  word-break: break-all;
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const validateDocumentFile = (file, label) => {
  if (!file) {
    return `${label} is required`;
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return `${label} must be a JPG, JPEG, PNG, or WEBP image`;
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return `${label} must be 5 MB or smaller`;
  }

  return "";
};



const feeOptions = [
  "MBBS - 1000 LKR",
  "MBBS - 1500 LKR",
  "MBBS - 2000 LKR",
  "MBBS - 2500 LKR",
  "MD - 3000 LKR",
  "MD - 3500 LKR",
  "MD - 4000 LKR",
  "PhD/Specialist - 4500 LKR",
  "PhD/Specialist - 5000 LKR (Max)",
];

const DoctorRegistration = () => {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const [formData, setFormData] = useState({
    title: "Dr.",
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "doctor",
    medicalLicenseId: "",
    specialization: "",
    hospitalName: "",
    experience: "",
    fees: "",
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [documents, setDocuments] = useState({
    medicalLicenseImage: null,
    nicImage: null,
  });
  const [fileErrors, setFileErrors] = useState({
    medicalLicenseImage: "",
    nicImage: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (fieldErrors[name]) {
      setFieldErrors((current) => ({ ...current, [name]: "" }));
    }
    if (error) setError("");
  };

  const handleFileChange = (fieldName, label) => (e) => {
    const file = e.target.files?.[0] || null;
    const validationMessage = file ? validateDocumentFile(file, label) : "";

    setDocuments((prev) => ({
      ...prev,
      [fieldName]: validationMessage ? null : file,
    }));
    setFileErrors((prev) => ({
      ...prev,
      [fieldName]: validationMessage,
    }));

    if (error) setError("");
  };

  const validateForm = () => {
    const nextFieldErrors = {
      name: getRequiredError(formData.name, "Full name"),
      email: getEmailError(formData.email),
      medicalLicenseId: getRequiredError(formData.medicalLicenseId, "Medical license ID"),
      specialization: getRequiredError(formData.specialization, "Specialization"),
      experience: getPositiveNumberError(formData.experience, "Experience"),
      hospitalName: getRequiredError(formData.hospitalName, "Hospital name"),
      fees: getRequiredError(formData.fees, "Consultation fee"),
      password: getPasswordError(formData.password, { requireStrong: true }),
      confirmPassword: getPasswordMatchError(formData.password, formData.confirmPassword),
    };

    Object.keys(nextFieldErrors).forEach((key) => {
      if (!nextFieldErrors[key]) delete nextFieldErrors[key];
    });

    setFieldErrors(nextFieldErrors);
    return nextFieldErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const nextFieldErrors = validateForm();

    const nextFileErrors = {
      medicalLicenseImage: validateDocumentFile(documents.medicalLicenseImage, "Medical license image"),
      nicImage: validateDocumentFile(documents.nicImage, "NIC image"),
    };

    setFileErrors(nextFileErrors);

    if (Object.keys(nextFieldErrors).length > 0) {
      setError("Please fix the highlighted fields before submitting your doctor application.");
      return;
    }

    if (nextFileErrors.medicalLicenseImage || nextFileErrors.nicImage) {
      const uploadError = nextFileErrors.medicalLicenseImage || nextFileErrors.nicImage;
      setError(uploadError);
      return;
    }

    try {
      const payload = new FormData();
      payload.append("name", `${formData.title} ${formData.name}`);
      payload.append("email", formData.email);
      payload.append("password", formData.password);
      payload.append("confirmPassword", formData.confirmPassword);
      payload.append("role", "doctor");
      payload.append("medicalLicenseId", formData.medicalLicenseId);
      payload.append("specialization", formData.specialization);
      payload.append("hospitalName", formData.hospitalName);
      payload.append("experience", formData.experience);
      payload.append("fees", formData.fees);
      payload.append("medicalLicenseImage", documents.medicalLicenseImage);
      payload.append("nicImage", documents.nicImage);

      await api.post("/auth/register", payload);

      success("Registration Successful! Please wait for Admin Approval.", "Success");

      setTimeout(() => {
        navigate("/login?role=doctor");
      }, 3000);
    } catch (err) {
      console.error(err);
      const errorMsg = getFriendlyAuthError(err, "Registration failed. Please check the highlighted fields.");
      setError(errorMsg);
      toastError(errorMsg, "Error");
    }
  };

  const pwdHasLength = formData.password.length >= 8;
  const pwdHasUpperAndNum = /[A-Z]/.test(formData.password) && /[0-9]/.test(formData.password);
  const pwdHasSpecial = /[^A-Za-z0-9]/.test(formData.password);

  return (
    <AuthLayout
      asideImage={assets.loginModel}
      innerStyle={{ width: "100%", maxWidth: "100%" }}
      gridTemplate="60% 40%"
    >
      <DoctorFormShell>
        <div style={{ marginBottom: 24 }}>
          <ContextEyebrow>Doctor registration</ContextEyebrow>
          <MainTitle>Welcome doctor</MainTitle>
          <MainSubtitle>
            Provide your professional details for verification and complete your DocX onboarding.
          </MainSubtitle>
          <FooterText style={{ textAlign: "left", marginTop: 12 }}>
            Already registered? <Link to="/login?role=doctor">Doctor login</Link>
          </FooterText>
        </div>

        {error ? <InlineAlert $type="error"><FaTimes style={{ flexShrink: 0 }} /> {error}</InlineAlert> : null}

        <FormBlock onSubmit={handleSubmit} style={{ width: "100%" }} noValidate>
          <FieldGroup>
            <FieldLabel htmlFor="doc-name">Full Name</FieldLabel>
            <div style={{ display: "flex", gap: "12px" }}>
              <InputShell $error={false} style={{ width: "110px" }}>
                <FormSelect
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                >
                  <option value="Dr.">Dr.</option>
                  <option value="Prof.">Prof.</option>
                  <option value="Mr.">Mr.</option>
                  <option value="Mrs.">Mrs.</option>
                  <option value="Ms.">Ms.</option>
                </FormSelect>
              </InputShell>
              <InputShell $error={Boolean(fieldErrors.name)} style={{ flex: 1 }}>
                <FormInput
                  id="doc-name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your name"
                  required
                />
              </InputShell>
            </div>
            {fieldErrors.name ? <FieldHint $error>{fieldErrors.name}</FieldHint> : null}
          </FieldGroup>

        <FieldGrid>
          <FieldGroup>
            <FieldLabel htmlFor="doc-email">Email Address</FieldLabel>
            <InputShell $error={Boolean(fieldErrors.email)}>
              <FormInput
                id="doc-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </InputShell>
            {fieldErrors.email ? <FieldHint $error>{fieldErrors.email}</FieldHint> : null}
          </FieldGroup>

          <FieldGroup>
            <FieldLabel htmlFor="doc-license">Medical License ID</FieldLabel>
            <InputShell $error={Boolean(fieldErrors.medicalLicenseId)}>
              <FormInput
                id="doc-license"
                type="text"
                name="medicalLicenseId"
                value={formData.medicalLicenseId}
                onChange={handleChange}
                required
              />
            </InputShell>
            {fieldErrors.medicalLicenseId ? <FieldHint $error>{fieldErrors.medicalLicenseId}</FieldHint> : null}
          </FieldGroup>
        </FieldGrid>

        <FieldGrid>
          <FieldGroup>
            <FieldLabel htmlFor="doc-spec">Specialization</FieldLabel>
            <InputShell $error={Boolean(fieldErrors.specialization)}>
              <FormSelect
                id="doc-spec"
                name="specialization"
                value={formData.specialization}
                onChange={handleChange}
                required
              >
                <option value="">Select Specialization</option>
                {specialtyCatalog.map((spec) => (
                  <option key={spec.slug} value={spec.name}>
                    {spec.name}
                  </option>
                ))}
              </FormSelect>
            </InputShell>
            {fieldErrors.specialization ? <FieldHint $error>{fieldErrors.specialization}</FieldHint> : null}
          </FieldGroup>

          <FieldGroup>
            <FieldLabel htmlFor="doc-exp">Experience (Years)</FieldLabel>
            <InputShell $error={Boolean(fieldErrors.experience)}>
              <FormInput
                id="doc-exp"
                type="number"
                name="experience"
                value={formData.experience}
                onChange={handleChange}
              />
            </InputShell>
            {fieldErrors.experience ? <FieldHint $error>{fieldErrors.experience}</FieldHint> : null}
          </FieldGroup>
        </FieldGrid>

        <FieldGrid>
          <FieldGroup>
            <FieldLabel htmlFor="doc-hospital">Hospital Name</FieldLabel>
            <InputShell $error={Boolean(fieldErrors.hospitalName)}>
              <FormInput
                id="doc-hospital"
                type="text"
                name="hospitalName"
                list="hospital-list"
                value={formData.hospitalName}
                onChange={handleChange}
                placeholder="Search hospital..."
              />
              <datalist id="hospital-list">
                {sriLankanHospitals.map((hospital) => (
                  <option key={hospital} value={hospital} />
                ))}
              </datalist>
            </InputShell>
            {fieldErrors.hospitalName ? <FieldHint $error>{fieldErrors.hospitalName}</FieldHint> : null}
          </FieldGroup>

          <FieldGroup>
            <FieldLabel htmlFor="doc-fees">Consultation Fee & Level</FieldLabel>
            <InputShell $error={Boolean(fieldErrors.fees)}>
              <FormSelect
                id="doc-fees"
                name="fees"
                value={formData.fees}
                onChange={handleChange}
              >
                <option value="">Select Qualification & Fee</option>
                {feeOptions.map((fee) => (
                  <option key={fee} value={fee}>{fee}</option>
                ))}
              </FormSelect>
            </InputShell>
            {fieldErrors.fees ? <FieldHint $error>{fieldErrors.fees}</FieldHint> : null}
          </FieldGroup>
        </FieldGrid>

        <UploadGrid>
          <FieldGroup>
            <FieldLabel htmlFor="doc-license-image">Medical License Image</FieldLabel>
            <UploadArea htmlFor="doc-license-image" $error={Boolean(fileErrors.medicalLicenseImage)}>
              <CloudIcon><FaCloudUploadAlt /></CloudIcon>
              <UploadText>Drag and drop or browse to choose a file</UploadText>
              {documents.medicalLicenseImage && (
                <UploadFileName>Selected: {documents.medicalLicenseImage.name}</UploadFileName>
              )}
              <HiddenFileInput
                id="doc-license-image"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={handleFileChange("medicalLicenseImage", "Medical license image")}
              />
            </UploadArea>
            {fileErrors.medicalLicenseImage ? (
              <FieldHint $error>{fileErrors.medicalLicenseImage}</FieldHint>
            ) : null}
          </FieldGroup>

          <FieldGroup>
            <FieldLabel htmlFor="doc-nic-image">NIC Image</FieldLabel>
            <UploadArea htmlFor="doc-nic-image" $error={Boolean(fileErrors.nicImage)}>
              <CloudIcon><FaCloudUploadAlt /></CloudIcon>
              <UploadText>Drag and drop or browse to choose a file</UploadText>
              {documents.nicImage && (
                <UploadFileName>Selected: {documents.nicImage.name}</UploadFileName>
              )}
              <HiddenFileInput
                id="doc-nic-image"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={handleFileChange("nicImage", "NIC image")}
              />
            </UploadArea>
            {fileErrors.nicImage ? (
              <FieldHint $error>{fileErrors.nicImage}</FieldHint>
            ) : null}
          </FieldGroup>
        </UploadGrid>

        <FieldGrid>
          <FieldGroup>
            <FieldLabel htmlFor="doc-password">Password</FieldLabel>
            <InputShell $error={Boolean(fieldErrors.password)}>
              <FormInput
                id="doc-password"
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                $withAction
                required
              />
              <ActionIconButton type="button" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </ActionIconButton>
            </InputShell>
            <PasswordMeta>
              {formData.password ? (
                <>
                <StrengthBar>
                  <StrengthSegment $color={pwdHasLength ? "#F59E0B" : "#E5E7EB"} />
                  <StrengthSegment $color={pwdHasUpperAndNum ? "#111111" : "#E5E7EB"} />
                  <StrengthSegment $color={pwdHasSpecial ? "#10B981" : "#E5E7EB"} />
                </StrengthBar>
                <StrengthHint>Min 8 chars, 1 uppercase, 1 number, 1 symbol</StrengthHint>
                </>
              ) : null}
              {fieldErrors.password ? <FieldHint $error>{fieldErrors.password}</FieldHint> : null}
            </PasswordMeta>
          </FieldGroup>

          <FieldGroup>
            <FieldLabel htmlFor="doc-confirm">Confirm Password</FieldLabel>
            <InputShell $error={Boolean(fieldErrors.confirmPassword) || Boolean(formData.confirmPassword && formData.password !== formData.confirmPassword)}>
              <FormInput
                id="doc-confirm"
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                $withAction
                required
              />
              <ActionIconButton type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </ActionIconButton>
            </InputShell>
            <PasswordMeta>
              {fieldErrors.confirmPassword ? (
                <FieldHint $error>{fieldErrors.confirmPassword}</FieldHint>
              ) : formData.confirmPassword && formData.password !== formData.confirmPassword ? (
                <FieldHint $error>Passwords do not match. Type the same password again.</FieldHint>
              ) : null}
            </PasswordMeta>
          </FieldGroup>
        </FieldGrid>

          <div style={{ marginTop: "16px" }}>
            <PrimaryButton type="submit" style={{ width: "100%" }}>
              Submit Application
            </PrimaryButton>
          </div>
        </FormBlock>

        <FooterText style={{ textAlign: "left", marginTop: 16 }}>
          <AuthPolicyDisclosure
            prefix="By submitting your application, you agree to DocX's "
            between=" and acknowledge the "
            suffix=" used for account verification and platform access."
          />
        </FooterText>
        
        <div style={{ marginTop: 24 }}>
          <FooterText style={{ textAlign: "center", marginBottom: 12 }}>
            Need a patient account instead? <Link to="/signup">User registration</Link>
          </FooterText>
        </div>
      </DoctorFormShell>
    </AuthLayout>
  );
};

export default DoctorRegistration;
