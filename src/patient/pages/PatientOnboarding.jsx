import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { FaCheckCircle, FaArrowRight, FaArrowLeft } from "react-icons/fa";
import api from "@/shared/lib/api";
import { useToast } from "@/shared/context/ToastContext";
import FieldError from "@/shared/components/common/FieldError";
import { clearFieldError, validateRequiredFields } from "@/shared/lib/formValidation";

const PageContainer = styled.div`
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f0f2f5;
  padding: 20px;
  font-family: 'Inter', sans-serif;
`;

const Card = styled.div`
  background: white;
  width: 100%;
  max-width: 800px;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.05);
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  background: #683B93;
  padding: 30px;
  color: white;
  text-align: center;

  h2 { margin: 0 0 10px 0; font-size: 24px; }
  p { margin: 0; opacity: 0.8; font-size: 14px; }
`;

const ProgressBar = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 20px 40px;
  background: #f9f9f9;
  border-bottom: 1px solid #eee;
`;

const StepIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${props => props.$active ? '#683B93' : '#ccc'};
  font-weight: ${props => props.$active ? '600' : '400'};
  font-size: 14px;

  .circle {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: ${props => props.$active ? '#683B93' : (props.$completed ? '#48bb78' : '#e0e0e0')};
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
  }
`;

const Content = styled.div`
  padding: 40px;
  flex: 1;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;

  @media (max-width: 600px) { grid-template-columns: 1fr; }
`;

const FormGroup = styled.div`
  margin-bottom: 20px;

  label {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: #444;
    margin-bottom: 8px;
  }

  input, select, textarea {
    width: 100%;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 15px;
    transition: all 0.2s;

    &:focus {
      outline: none;
      border-color: #683B93;
      box-shadow: 0 0 0 3px rgba(104, 59, 147, 0.1);
    }
  }

  textarea { height: 100px; resize: vertical; }
`;

const Footer = styled.div`
  padding: 20px 40px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  background: white;
`;

const Button = styled.button`
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;

  &.secondary {
    background: white;
    border: 1px solid #ddd;
    color: #555;
    &:hover { background: #f5f5f5; }
  }

  &.primary {
    background: #683B93;
    border: none;
    color: white;
    &:hover { opacity: 0.9; }
  }
`;

const PatientOnboarding = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});

    const [formData, setFormData] = useState({
        dob: "",
        gender: "",
        phone: "",
        address: "",
        bloodGroup: "",
        height: "",
        weight: "",
        allergies: "",
        currentMedications: "",
        emergencyContactName: "",
        emergencyContactPhone: "",
        emergencyContactRelation: ""
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        clearFieldError(setFieldErrors, e.target.name);
    };

    const validateStep = (stepToValidate = step) => {
        if (stepToValidate === 1) {
            return validateRequiredFields(formData, {
                dob: "Date of birth",
                gender: "Gender",
                phone: "Phone number",
                address: "Address",
            });
        }

        if (stepToValidate === 3) {
            const emergencyFields = [
                formData.emergencyContactName,
                formData.emergencyContactRelation,
                formData.emergencyContactPhone,
            ];
            const hasPartialEmergencyContact = emergencyFields.some((value) => String(value || "").trim());
            return hasPartialEmergencyContact
                ? validateRequiredFields(formData, {
                    emergencyContactName: "Emergency contact name",
                    emergencyContactRelation: "Emergency contact relationship",
                    emergencyContactPhone: "Emergency contact phone",
                })
                : {};
        }

        return {};
    };

    const handleNext = () => {
        const nextErrors = validateStep(step);
        setFieldErrors(nextErrors);
        if (Object.keys(nextErrors).length) {
            return;
        }
        setStep(prev => prev + 1);
    };

    const handleBack = () => setStep(prev => prev - 1);

    const handleSubmit = async () => {
        const nextErrors = validateStep(3);
        setFieldErrors(nextErrors);
        if (Object.keys(nextErrors).length) {
            return;
        }

        setLoading(true);
        try {
            // Format data for API
            const payload = {
                dob: formData.dob,
                gender: formData.gender,
                phone: formData.phone,
                address: formData.address,
                bloodGroup: formData.bloodGroup,
                height: formData.height ? formData.height + " cm" : "",
                weight: formData.weight ? formData.weight + " kg" : "",
                allergies: formData.allergies ? formData.allergies.split(",").map(s => s.trim()) : [],
                currentMedications: formData.currentMedications ? formData.currentMedications.split(",").map(s => s.trim()) : [],
                emergencyContact: {
                    name: formData.emergencyContactName,
                    phone: formData.emergencyContactPhone,
                    relation: formData.emergencyContactRelation
                }
            };

            await api.post('/patient/onboarding', payload);
            toast.success("Profile setup complete!", "Welcome Aboard");
            navigate('/patient/profile'); // Or dashboard
        } catch (error) {
            toast.error(error.response?.data?.message || "Setup failed", "Error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageContainer>
            <Card>
                <Header>
                    <h2>Complete Your Health Profile</h2>
                    <p>Help us provide you with the best care by filling out your medical history.</p>
                </Header>

                <ProgressBar>
                    <StepIndicator $active={step === 1} $completed={step > 1}>
                        <div className="circle">{step > 1 ? <FaCheckCircle /> : 1}</div>
                        <span>Personal Info</span>
                    </StepIndicator>
                    <StepIndicator $active={step === 2} $completed={step > 2}>
                        <div className="circle">{step > 2 ? <FaCheckCircle /> : 2}</div>
                        <span>Health Stats</span>
                    </StepIndicator>
                    <StepIndicator $active={step === 3}>
                        <div className="circle">3</div>
                        <span>Final Details</span>
                    </StepIndicator>
                </ProgressBar>

                <Content>
                    {step === 1 && (
                        <FormGrid>
                            <FormGroup>
                                <label>Date of Birth</label>
                                <input type="date" name="dob" value={formData.dob} onChange={handleChange} aria-invalid={Boolean(fieldErrors.dob)} />
                                <FieldError message={fieldErrors.dob} />
                            </FormGroup>
                            <FormGroup>
                                <label>Gender</label>
                                <select name="gender" value={formData.gender} onChange={handleChange} aria-invalid={Boolean(fieldErrors.gender)}>
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                                <FieldError message={fieldErrors.gender} />
                            </FormGroup>
                            <FormGroup>
                                <label>Phone Number</label>
                                <input type="tel" name="phone" placeholder="Enter your phone number" value={formData.phone} onChange={handleChange} aria-invalid={Boolean(fieldErrors.phone)} />
                                <FieldError message={fieldErrors.phone} />
                            </FormGroup>
                            <FormGroup>
                                <label>Address</label>
                                <input type="text" name="address" placeholder="Enter your address" value={formData.address} onChange={handleChange} aria-invalid={Boolean(fieldErrors.address)} />
                                <FieldError message={fieldErrors.address} />
                            </FormGroup>
                        </FormGrid>
                    )}

                    {step === 2 && (
                        <FormGrid>
                            <FormGroup>
                                <label>Blood Group (Optional)</label>
                                <select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange}>
                                    <option value="">Select Group</option>
                                    <option value="A+">A+</option>
                                    <option value="A-">A-</option>
                                    <option value="B+">B+</option>
                                    <option value="B-">B-</option>
                                    <option value="AB+">AB+</option>
                                    <option value="AB-">AB-</option>
                                    <option value="O+">O+</option>
                                    <option value="O-">O-</option>
                                </select>
                            </FormGroup>
                            <FormGroup>
                            </FormGroup>
                            <FormGroup>
                                <label>Height (cm) (Optional)</label>
                                <input type="number" name="height" placeholder="175" value={formData.height} onChange={handleChange} />
                            </FormGroup>
                            <FormGroup>
                                <label>Weight (kg) (Optional)</label>
                                <input type="number" name="weight" placeholder="70" value={formData.weight} onChange={handleChange} />
                            </FormGroup>
                        </FormGrid>
                    )}

                    {step === 3 && (
                        <>
                            <FormGrid>
                                <FormGroup>
                                    <label>Allergies (Optional)</label>
                                    <textarea name="allergies" placeholder="Peanuts, Penicillin..." value={formData.allergies} onChange={handleChange} />
                                </FormGroup>
                                <FormGroup>
                                    <label>Current Medications (Optional)</label>
                                    <textarea name="currentMedications" placeholder="Insulin, Aspirin..." value={formData.currentMedications} onChange={handleChange} />
                                </FormGroup>
                            </FormGrid>
                            <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #eee' }} />
                            <h4 style={{ margin: '0 0 15px 0', color: '#5C4580' }}>Emergency Contact (Optional)</h4>
                            <FormGrid>
                                <FormGroup>
                                    <label>Contact Name</label>
                                    <input type="text" name="emergencyContactName" value={formData.emergencyContactName} onChange={handleChange} aria-invalid={Boolean(fieldErrors.emergencyContactName)} />
                                    <FieldError message={fieldErrors.emergencyContactName} />
                                </FormGroup>
                                <FormGroup>
                                    <label>Relationship</label>
                                    <input type="text" name="emergencyContactRelation" placeholder="Father, Spouse..." value={formData.emergencyContactRelation} onChange={handleChange} aria-invalid={Boolean(fieldErrors.emergencyContactRelation)} />
                                    <FieldError message={fieldErrors.emergencyContactRelation} />
                                </FormGroup>
                                <FormGroup>
                                    <label>Phone</label>
                                    <input type="tel" name="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={handleChange} aria-invalid={Boolean(fieldErrors.emergencyContactPhone)} />
                                    <FieldError message={fieldErrors.emergencyContactPhone} />
                                </FormGroup>
                            </FormGrid>
                        </>
                    )}
                </Content>

                <Footer>
                    {step > 1 ? (
                        <Button className="secondary" onClick={handleBack}><FaArrowLeft /> Back</Button>
                    ) : <div></div>}

                    {step < 3 ? (
                        <Button className="primary" onClick={handleNext}>Next <FaArrowRight /></Button>
                    ) : (
                        <Button className="primary" onClick={handleSubmit} disabled={loading}>
                            {loading ? "Completing..." : "Finish Onboarding"} <FaCheckCircle />
                        </Button>
                    )}
                </Footer>
            </Card>
        </PageContainer>
    );
};

export default PatientOnboarding;
