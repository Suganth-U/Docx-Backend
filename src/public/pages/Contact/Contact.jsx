import React, { useEffect, useState } from "react";
import styled from "styled-components";
import AOS from "aos";
import "aos/dist/aos.css";
import {
  MapPin,
  PhoneCall,
  Mail,
  Send,
  CheckCircle2,
  Building,
  Sparkles
} from "lucide-react";
import { Navigationbar } from "@/shared/components/layout/NavigationBar/Navigationbar";
import Footer from "@/shared/components/layout/Footer/Footer";
import FieldError from "@/shared/components/common/FieldError";
import { clearFieldError, isValidEmail, validateRequiredFields } from "@/shared/lib/formValidation";

// Colors (Light Enterprise)
const primaryColor = "#683b93";
const primaryHover = "#522e75";
const surfaceColor = "#ffffff";
const textMain = "#111827";
const textMuted = "#6b7280";

const Page = styled.div`
  min-height: 100vh;
  background-color: #fcfcfc;
  font-family: 'Inter', sans-serif;
  overflow-x: hidden;
`;

const HeaderBackground = styled.div`
  background: linear-gradient(135deg, #f8f6fb 0%, #ffffff 100%);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -10%;
    width: 60%;
    height: 200%;
    background: radial-gradient(circle, rgba(104, 59, 147, 0.04) 0%, transparent 60%);
    z-index: 0;
  }
`;

const PageHeader = styled.section`
  padding: 140px 5% 80px;
  text-align: center;
  position: relative;
  z-index: 1;
`;

const HeaderBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background-color: rgba(104, 59, 147, 0.08);
  color: ${primaryColor};
  padding: 8px 16px;
  border-radius: 100px;
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 24px;

  svg {
    width: 16px;
    height: 16px;
  }
`;

const HeaderContent = styled.div`
  max-width: 800px;
  margin: 0 auto;

  h1 {
    font-size: 56px;
    font-weight: 800;
    color: ${textMain};
    margin-bottom: 24px;
    letter-spacing: -1.5px;
    font-family: 'Inter', sans-serif;
    line-height: 1.1;

    span {
      background: linear-gradient(135deg, ${primaryColor}, #9d4edd);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
  }

  p {
    font-size: 18px;
    color: ${textMuted};
    line-height: 1.7;
    max-width: 600px;
    margin: 0 auto;
  }
  
  @media (max-width: 768px) {
    h1 {
      font-size: 40px;
    }
  }
`;

const ContactContainer = styled.div`
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 5% 120px;
  display: grid;
  grid-template-columns: 5fr 7fr;
  gap: 60px;
  position: relative;
  z-index: 2;
  margin-top: -30px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    margin-top: 0;
  }
`;

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 32px;
`;

const InfoCard = styled.div`
  background: ${surfaceColor};
  border-radius: 20px;
  padding: 32px;
  border: 1px solid rgba(0,0,0,0.04);
  box-shadow: 0 10px 40px -10px rgba(0,0,0,0.04);
  display: flex;
  align-items: flex-start;
  gap: 24px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px -10px rgba(104, 59, 147, 0.08);
  }

  .icon-wrapper {
    width: 56px;
    height: 56px;
    border-radius: 16px;
    background: linear-gradient(135deg, rgba(104, 59, 147, 0.1) 0%, rgba(104, 59, 147, 0.04) 100%);
    color: ${primaryColor};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    
    svg {
      width: 24px;
      height: 24px;
    }
  }

  .info-content {
    h4 {
      font-size: 18px;
      font-weight: 700;
      color: ${textMain};
      margin: 0 0 8px 0;
    }

    p {
      margin: 0;
      color: ${textMuted};
      font-size: 15px;
      line-height: 1.6;
    }

    a {
      color: ${primaryColor};
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      margin-top: 12px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      
      &:hover {
        text-decoration: underline;
      }
    }
  }
`;

const MapCard = styled.div`
  background: ${surfaceColor};
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid rgba(0,0,0,0.04);
  box-shadow: 0 10px 40px -10px rgba(0,0,0,0.04);
  height: 320px;
  position: relative;
  
  iframe {
    width: 100%;
    height: 100%;
    border: 0;
    filter: grayscale(0.2) contrast(1.1);
  }
`;

const RightColumn = styled.div`
  background: ${surfaceColor};
  border-radius: 24px;
  border: 1px solid rgba(0,0,0,0.04);
  padding: 48px;
  box-shadow: 0 20px 60px -15px rgba(0,0,0,0.08);

  @media (max-width: 768px) {
    padding: 32px 24px;
  }
`;

const FormHeader = styled.div`
  margin-bottom: 40px;

  h3 {
    font-size: 32px;
    font-weight: 800;
    color: ${textMain};
    margin-bottom: 12px;
    letter-spacing: -0.5px;
  }

  p {
    color: ${textMuted};
    font-size: 16px;
    line-height: 1.6;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const FormGroup = styled.div`
  display: grid;
  grid-template-columns: ${(props) => (props.$split ? "1fr 1fr" : "1fr")};
  gap: 24px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const InputField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-size: 14px;
    font-weight: 600;
    color: #374151;
  }

  input, select, textarea {
    width: 100%;
    padding: 16px 18px;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    background-color: #f9fafb;
    font-size: 15px;
    color: ${textMain};
    transition: all 0.2s ease;
    font-family: inherit;

    &::placeholder {
      color: #9ca3af;
    }

    &:focus {
      outline: none;
      border-color: ${primaryColor};
      background-color: ${surfaceColor};
      box-shadow: 0 0 0 4px rgba(104, 59, 147, 0.1);
    }
  }

  textarea {
    min-height: 160px;
    resize: vertical;
  }
`;

const SubmitButton = styled.button`
  padding: 18px 32px;
  background-color: ${primaryColor};
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  transition: all 0.2s ease;
  margin-top: 16px;
  width: 100%;

  &:hover {
    background-color: ${primaryHover};
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(104, 59, 147, 0.2);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    background-color: #d1d5db;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
  }
`;

const SuccessMessage = styled.div`
  background-color: #f0fdf4;
  color: #166534;
  padding: 20px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 600;
  margin-bottom: 32px;
  border: 1px solid #bbf7d0;
  animation: slideIn 0.3s ease-out;

  @keyframes slideIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const Contact = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    topic: "",
    message: "",
  });

  useEffect(() => {
    window.scrollTo(0, 0);
    AOS.init({ duration: 800, once: true, offset: 50 });
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextErrors = validateRequiredFields(formData, {
      firstName: "First name",
      lastName: "Last name",
      email: "Work email",
      topic: "Topic of inquiry",
      message: "Message",
    });
    if (formData.email && !isValidEmail(formData.email)) {
      nextErrors.email = "Enter a valid email address.";
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 6000);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        topic: "",
        message: "",
      });
      setFieldErrors({});
    }, 1200);
  };

  const setField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
    clearFieldError(setFieldErrors, field);
  };

  return (
    <Page>
      <Navigationbar />
      
      <HeaderBackground>
        <PageHeader>
          <HeaderContent data-aos="fade-up">
            <HeaderBadge>
              <Sparkles /> We&apos;re here to help
            </HeaderBadge>
            <h1>Contact our <span>care team</span></h1>
            <p>Need medical assistance, have a question about our enterprise services, or want to provide feedback? Our dedicated team is ready to assist you.</p>
          </HeaderContent>
        </PageHeader>
      </HeaderBackground>

      <ContactContainer>
        <LeftColumn>
          <InfoCard data-aos="fade-up" data-aos-delay="100">
            <div className="icon-wrapper">
              <Building />
            </div>
            <div className="info-content">
              <h4>Headquarters</h4>
              <p>123 Health Tech Park<br />Angulana, Colombo</p>
              <a href="https://maps.google.com" target="_blank" rel="noreferrer">Get Directions <MapPin size={14}/></a>
            </div>
          </InfoCard>

          <InfoCard data-aos="fade-up" data-aos-delay="200">
            <div className="icon-wrapper">
              <PhoneCall />
            </div>
            <div className="info-content">
              <h4>Phone Support</h4>
              <p>Available Mon-Fri, 9am - 6pm</p>
              <a href="tel:+94701796765">(+94) 70 179 6765</a>
            </div>
          </InfoCard>

          <InfoCard data-aos="fade-up" data-aos-delay="300">
            <div className="icon-wrapper">
              <Mail />
            </div>
            <div className="info-content">
              <h4>Email Inquiry</h4>
              <p>We typically reply within 2 hours during business days.</p>
              <a href="mailto:support@docxhospital.com">support@docxhospital.com</a>
            </div>
          </InfoCard>

          <MapCard data-aos="fade-up" data-aos-delay="400">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d126743.63162586739!2d79.77380261313364!3d6.921833527218698!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae253d10f7a7003%3A0x320b2e4d32d3838d!2sColombo%2C%20Sri%20Lanka!5e0!3m2!1sen!2sus!4v1714571020050!5m2!1sen!2sus" 
              allowFullScreen="" 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
              title="DocX Headquarters"
            ></iframe>
          </MapCard>
        </LeftColumn>

        <RightColumn data-aos="fade-up" data-aos-delay="200">
          <FormHeader>
            <h3>Send us a message</h3>
            <p>Please fill out the form below. Our support team will get back to you shortly.</p>
          </FormHeader>

          {showSuccess && (
            <SuccessMessage>
              <CheckCircle2 size={22} /> 
              Your message has been received successfully!
            </SuccessMessage>
          )}

          <Form onSubmit={handleSubmit} noValidate>
            <FormGroup $split>
              <InputField>
                <label>First Name</label>
                <input type="text" placeholder="Enter your first name" value={formData.firstName} onChange={(event) => setField("firstName", event.target.value)} aria-invalid={Boolean(fieldErrors.firstName)} />
                <FieldError message={fieldErrors.firstName} />
              </InputField>
              <InputField>
                <label>Last Name</label>
                <input type="text" placeholder="Enter your last name" value={formData.lastName} onChange={(event) => setField("lastName", event.target.value)} aria-invalid={Boolean(fieldErrors.lastName)} />
                <FieldError message={fieldErrors.lastName} />
              </InputField>
            </FormGroup>

            <FormGroup $split>
              <InputField>
                <label>Work Email</label>
                <input type="email" placeholder="Enter your email address" value={formData.email} onChange={(event) => setField("email", event.target.value)} aria-invalid={Boolean(fieldErrors.email)} />
                <FieldError message={fieldErrors.email} />
              </InputField>
              <InputField>
                <label>Phone Number</label>
                <input type="tel" placeholder="+94 70 000 0000" value={formData.phone} onChange={(event) => setField("phone", event.target.value)} />
              </InputField>
            </FormGroup>

            <InputField>
              <label>Topic of Inquiry</label>
              <select value={formData.topic} onChange={(event) => setField("topic", event.target.value)} aria-invalid={Boolean(fieldErrors.topic)}>
                <option value="" disabled>Select a topic...</option>
                <option value="appointment">Appointment Booking</option>
                <option value="enterprise">Enterprise Solutions</option>
                <option value="prescription">Prescription Support</option>
                <option value="lab">Lab Reports</option>
                <option value="general">General Inquiry</option>
              </select>
              <FieldError message={fieldErrors.topic} />
            </InputField>

            <InputField>
              <label>Message</label>
              <textarea placeholder="How can our team assist you today?" value={formData.message} onChange={(event) => setField("message", event.target.value)} aria-invalid={Boolean(fieldErrors.message)}></textarea>
              <FieldError message={fieldErrors.message} />
            </InputField>

            <SubmitButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending message..." : "Send Message"} <Send size={18} />
            </SubmitButton>
          </Form>
        </RightColumn>
      </ContactContainer>

      <Footer />
    </Page>
  );
};

export default Contact;
