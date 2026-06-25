import React, { useState } from "react";
import styled, { keyframes } from "styled-components";
import {
  BadgeCheck,
  Mail,
  MapPin,
  Phone,
  Send,
} from "lucide-react";
import FieldError from "@/shared/components/common/FieldError";
import { clearFieldError, isValidEmail, validateRequiredFields } from "@/shared/lib/formValidation";

const THEME = {
  ink: "#1A0B2E",
  inkSoft: "#6A5D7B",
  inkMuted: "#9CA3AF",
  border: "rgba(26, 11, 46, 0.08)",
  white: "#ffffff",
  plum: "#5D3A9B",
  mint: "#00E59B",
  mintText: "#005C3E",
  shadow: "0 14px 32px rgba(26, 11, 46, 0.06)",
};

const fadeUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(24px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const pulse = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(104, 59, 147, 0.2);
  }

  70% {
    box-shadow: 0 0 0 12px rgba(104, 59, 147, 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(104, 59, 147, 0);
  }
`;

const Section = styled.section`
  width: min(1240px, calc(100% - 48px));
  margin: 84px auto 0;
  animation: ${fadeUp} 0.7s ease-out;

  @media (max-width: 768px) {
    width: min(1240px, calc(100% - 32px));
    margin-top: 72px;
  }
`;

const Header = styled.div`
  max-width: 720px;
  margin: 0 auto 24px;
  text-align: center;

  h2 {
    margin: 0 0 14px;
    color: ${THEME.ink};
    font-family: "Barlow", sans-serif;
    font-size: clamp(2.2rem, 5vw, 3.7rem);
    line-height: 0.98;
    letter-spacing: -0.05em;
  }

  p {
    margin: 0 auto;
    max-width: 640px;
    color: ${THEME.inkSoft};
    font-size: 1.04rem;
    line-height: 1.8;
  }
`;

const Shell = styled.div`
  display: grid;
  grid-template-columns: minmax(280px, 0.85fr) minmax(0, 1.15fr);
  border: 1px solid ${THEME.border};
  border-radius: 28px;
  overflow: hidden;
  background: ${THEME.white};
  box-shadow: ${THEME.shadow};
  gap: 0;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const InfoPanel = styled.div`
  padding: 34px;
  background: ${THEME.white};
  color: ${THEME.ink};

  @media (max-width: 768px) {
    padding: 28px 24px;
  }
`;

const PanelTitle = styled.h3`
  margin: 0 0 12px;
  font-family: "Barlow", sans-serif;
  font-size: clamp(1.8rem, 3vw, 2.3rem);
  line-height: 1.05;
  letter-spacing: -0.04em;
`;

const PanelText = styled.p`
  margin: 0;
  max-width: 420px;
  color: ${THEME.inkSoft};
  line-height: 1.75;
`;

const ContactList = styled.div`
  display: grid;
  gap: 12px;
  margin-top: 24px;
`;

const ContactCard = styled.div`
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  padding: 16px;
  border-radius: 18px;
  background: ${THEME.white};
  border: 1px solid ${THEME.border};

  .icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 14px;
    background: #fafafa;
    color: ${THEME.plum};
    border: 1px solid rgba(93, 58, 155, 0.1);
  }

  h4 {
    margin: 0 0 4px;
    font-size: 1rem;
    color: ${THEME.ink};
  }

  p {
    margin: 0;
    color: ${THEME.ink};
    line-height: 1.6;
  }

  small {
    display: block;
    margin-top: 5px;
    color: ${THEME.inkSoft};
    line-height: 1.5;
  }
`;

const EmergencyNote = styled.div`
  margin-top: 16px;
  padding: 14px 16px;
  border-radius: 18px;
  background: ${THEME.white};
  border: 1px solid ${THEME.border};
  color: ${THEME.inkSoft};
  font-size: 0.9rem;
  line-height: 1.65;
`;

const FormPanel = styled.div`
  padding: 34px;
  background: ${THEME.white};
  border-left: 1px solid rgba(26, 11, 46, 0.08);

  @media (max-width: 768px) {
    padding: 28px 24px;
    border-left: none;
    border-top: 1px solid rgba(26, 11, 46, 0.08);
  }
`;

const FormHeader = styled.div`
  display: grid;
  gap: 10px;
  margin-bottom: 22px;

  h3 {
    margin: 0 0 8px;
    color: ${THEME.ink};
    font-family: "Barlow", sans-serif;
    font-size: clamp(1.7rem, 3vw, 2.3rem);
    line-height: 1;
    letter-spacing: -0.03em;
  }

  p {
    margin: 0;
    max-width: 520px;
    color: ${THEME.inkSoft};
    line-height: 1.7;
  }
`;

const FormSurface = styled.form`
  display: grid;
  gap: 18px;
`;

const LabelRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;

  label {
    color: ${THEME.ink};
    font-size: 0.9rem;
    font-weight: 700;
  }

  span {
    color: ${THEME.inkMuted};
    font-size: 0.82rem;
    font-weight: 600;
  }
`;

const InputGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
`;

const Field = styled.label`
  display: grid;
  gap: 10px;

  span {
    color: ${THEME.ink};
    font-size: 0.9rem;
    font-weight: 700;
  }
`;

const FieldShell = styled.div`
  position: relative;
  border-radius: 16px;
  border: ${(props) => (props.$focused ? "1px solid rgba(93, 58, 155, 0.45)" : "1px solid rgba(26, 11, 46, 0.12)")};
  background: ${THEME.white};
  box-shadow: ${(props) =>
    props.$focused ? `0 0 0 4px rgba(93, 58, 155, 0.08)` : "none"};
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease, background 0.2s ease;

  &:focus-within {
    transform: translateY(-1px);
  }

  input,
  textarea {
    width: 100%;
    border: none;
    outline: none;
    padding: 16px 18px;
    border-radius: inherit;
    background: transparent;
    color: ${THEME.ink};
    font-family: inherit;
    font-size: 0.98rem;
    line-height: 1.5;
  }

  textarea {
    min-height: 170px;
    resize: vertical;
  }

  input::placeholder,
  textarea::placeholder {
    color: #8c93a1;
  }
`;

const FooterRow = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
`;

const PrivacyNote = styled.p`
  margin: 0;
  max-width: 430px;
  color: ${THEME.inkSoft};
  font-size: 0.85rem;
  line-height: 1.7;
`;

const SubmitButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-width: 170px;
  padding: 15px 20px;
  border: none;
  border-radius: 14px;
  background: ${THEME.plum};
  color: ${THEME.white};
  font-size: 1rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 14px 24px rgba(93, 58, 155, 0.18);
  transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;

  svg {
    transition: transform 0.2s ease;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 18px 28px rgba(93, 58, 155, 0.24);
    filter: brightness(1.04);
  }

  &:hover svg {
    transform: translateX(2px);
  }

  &:disabled {
    cursor: wait;
    opacity: 0.9;
    animation: ${pulse} 1.6s infinite;
  }
`;

const SuccessBanner = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 15px 16px;
  border-radius: 18px;
  background: rgba(0, 229, 155, 0.12);
  color: ${THEME.mintText};
  border: 1px solid rgba(0, 92, 62, 0.12);

  strong {
    display: block;
    margin-bottom: 3px;
    color: #155b42;
  }

  p {
    margin: 0;
    line-height: 1.6;
    color: ${THEME.mintText};
  }
`;

const ContactUs = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
    clearFieldError(setFieldErrors, name);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validateRequiredFields(formData, {
      fullName: "Full name",
      email: "Email address",
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

    window.setTimeout(() => {
      setIsSubmitting(false);
      setShowSuccess(true);
      setFormData({
        fullName: "",
        email: "",
        phone: "",
        message: "",
      });
      setFieldErrors({});
    }, 1300);
  };

  return (
    <Section id="contact" data-aos="fade-up">
      <Header>
        <h2>Contact us</h2>
        <p>
          Share a few details and the DocX team will get back to you.
        </p>
      </Header>

      <Shell>
        <InfoPanel>
          <PanelTitle>We are here to help.</PanelTitle>
          <PanelText>
            Use this form for appointments, reports, prescriptions, or general
            support.
          </PanelText>

          <ContactList>
            <ContactCard>
              <div className="icon">
                <Phone size={22} />
              </div>
              <div>
                <h4>Phone</h4>
                <p>(+94) 70 179 6765</p>
                <small>For urgent appointment coordination during support hours.</small>
              </div>
            </ContactCard>

            <ContactCard>
              <div className="icon">
                <Mail size={22} />
              </div>
              <div>
                <h4>Email</h4>
                <p>support@docxhospital.com</p>
                <small>For records, reports, and general support.</small>
              </div>
            </ContactCard>

            <ContactCard>
              <div className="icon">
                <MapPin size={22} />
              </div>
              <div>
                <h4>Location</h4>
                <p>Angulana, Colombo</p>
                <small>Hospital-connected care and digital support.</small>
              </div>
            </ContactCard>
          </ContactList>

          <EmergencyNote>
            For medical emergencies, contact local emergency services immediately.
          </EmergencyNote>
        </InfoPanel>

        <FormPanel>
          <FormHeader>
            <div>
              <h3>Send a message</h3>
              <p>
                Fill out the form below and we will reach out to you.
              </p>
            </div>
          </FormHeader>

          <FormSurface onSubmit={handleSubmit} noValidate>
            {showSuccess ? (
              <SuccessBanner>
                <BadgeCheck size={20} />
                <div>
                  <strong>Message sent successfully.</strong>
                  <p>
                    Thanks for reaching out. Our team will review your message and
                    get back to you.
                  </p>
                </div>
              </SuccessBanner>
            ) : null}

            <InputGrid>
              <Field>
                <span>Full name</span>
                <FieldShell $focused={focusedField === "fullName"}>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    onFocus={() => setFocusedField("fullName")}
                    onBlur={() => setFocusedField("")}
                    aria-invalid={Boolean(fieldErrors.fullName)}
                  />
                </FieldShell>
                <FieldError message={fieldErrors.fullName} />
              </Field>

              <Field>
                <span>Email address</span>
                <FieldShell $focused={focusedField === "email"}>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField("")}
                    aria-invalid={Boolean(fieldErrors.email)}
                  />
                </FieldShell>
                <FieldError message={fieldErrors.email} />
              </Field>

              <Field>
                <span>Phone number <small style={{ color: "#8c93a1", fontWeight: 600 }}>(optional)</small></span>
                <FieldShell $focused={focusedField === "phone"}>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    onFocus={() => setFocusedField("phone")}
                    onBlur={() => setFocusedField("")}
                  />
                </FieldShell>
              </Field>
            </InputGrid>

            <div>
              <LabelRow>
                <label htmlFor="contact-message">Your message</label>
                <span>Keep it short and clear</span>
              </LabelRow>
              <FieldShell $focused={focusedField === "message"}>
                <textarea
                  id="contact-message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  onFocus={() => setFocusedField("message")}
                  onBlur={() => setFocusedField("")}
                  maxLength={600}
                  aria-invalid={Boolean(fieldErrors.message)}
                />
              </FieldShell>
              <FieldError message={fieldErrors.message} />
            </div>

            <FooterRow>
              <PrivacyNote>
                Please do not share emergency information in this form.
              </PrivacyNote>

              <SubmitButton type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Sending message..." : "Send message"}
                <Send size={18} />
              </SubmitButton>
            </FooterRow>
          </FormSurface>
        </FormPanel>
      </Shell>
    </Section>
  );
};

export default ContactUs;
