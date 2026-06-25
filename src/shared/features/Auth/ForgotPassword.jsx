import React, { useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { FaArrowLeft, FaCheckCircle } from "react-icons/fa";
import { MdEmail } from "react-icons/md";
import api from "@/shared/lib/api";
import { assets } from "@/shared/lib/assets";
import {
  AuthLayout,
  FieldGroup,
  FieldHint,
  FieldLabel,
  FooterText,
  FormBlock,
  FormInput,
  InlineAlert,
  InputShell,
  LeadingIcon,
  MainSubtitle,
  MainTitle,
  PrimaryButton,
} from "@/shared/components/auth/AuthScaffold";
import {
  getEmailError,
  getFriendlyAuthError,
} from "@/shared/features/Auth/authValidation";

const SuccessCard = styled.div`
  display: grid;
  gap: 14px;
  padding: 20px;
  border-radius: 14px;
  background: #f5f5f5;
  border: 1px solid rgba(17, 17, 17, 0.08);
`;

const SuccessIcon = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(17, 17, 17, 0.08);
  color: #111111;
  font-size: 1.5rem;
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #111111;
  font-weight: 600;
  text-decoration: none;
  font-size: 0.88rem;

  &:hover {
    text-decoration: underline;
  }
`;

const GENERIC_RESET_MESSAGE =
  "If an account exists for this email, we sent a password reset link.";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [status, setStatus] = useState({ type: "", msg: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: "", msg: "" });

    const emailError = getEmailError(email);
    if (emailError) {
      setFieldErrors({ email: emailError });
      return;
    }
    setFieldErrors({});

    setLoading(true);

    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setSubmittedEmail(email);
      setIsSubmitted(true);
      setStatus({
        type: "success",
        msg: data?.message || GENERIC_RESET_MESSAGE,
      });
    } catch (err) {
      setStatus({
        type: "error",
        msg: getFriendlyAuthError(err, "We could not send the reset email right now."),
      });
    } finally {
      setLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <AuthLayout
        tone="purple"
        asideImage={assets.whyBlog}
        brand="DocX"
        brandTag="Account recovery"
        eyebrow="Check Your Email"
        title="Your secure reset link is on the way."
        description="Use the link from your inbox to open the secure password reset page, then choose a new password there."
        supportEyebrow="What happens next"
        supportTitle="Open the email and continue from the reset link."
        supportText="For security, password changes now happen only from the reset link. If you do not see the email, check spam or request another one."
        highlights={[
          "The reset link is sent only to the relevant email address",
          "Your password can be updated only after opening the secure link",
          "If the link expires, you can request a fresh one from this page",
        ]}
        quote="Recovery should feel simple without skipping the security checks that protect a patient account."
        quoteAuthor="DocX Support"
        quoteRole="Account recovery guidance"
        quoteInitials="DS"
        trustItems={[
          "Appointments",
          "Prescriptions",
          "Lab Reports",
          "Medical Records",
          "Pharmacy",
          "Follow-ups",
        ]}
        footnote="If an account exists for the address you entered, the reset email is already on its way."
        badge="Recovery Email Sent"
      >
        <div>
          <MainTitle>Check your inbox</MainTitle>
          <MainSubtitle>
            We sent reset instructions to <strong>{submittedEmail}</strong> if that address is linked
            to a DocX account.
          </MainSubtitle>
        </div>

        <SuccessCard>
          <SuccessIcon>
            <FaCheckCircle />
          </SuccessIcon>
          <div>
            <strong style={{ display: "block", color: "#374151", marginBottom: 6, fontSize: "0.9rem" }}>
              Reset link requested successfully
            </strong>
            <span style={{ color: "#6B7280", lineHeight: 1.6, fontSize: "0.85rem" }}>
              Open the email from DocX, click the reset link, and set your new password on the next screen.
            </span>
          </div>
        </SuccessCard>

        <InlineAlert $type="success">{status.msg || GENERIC_RESET_MESSAGE}</InlineAlert>

        <PrimaryButton
          as={Link}
          to="/login"
          $tone="purple"
          style={{ textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          Back to login
        </PrimaryButton>

        <FooterText>
          Didn&apos;t receive the email?{" "}
          <button
            type="button"
            onClick={() => {
              setIsSubmitted(false);
              setStatus({ type: "", msg: "" });
            }}
            style={{
              border: "none",
              background: "none",
              padding: 0,
              color: "#111111",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </FooterText>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      tone="purple"
      asideImage={assets.bookingAppointment}
      brand="DocX"
      brandTag="Account recovery"
      eyebrow="Password Recovery"
      title="Request a secure reset link for your DocX account."
      description="Enter the email connected to your account and we’ll send the recovery link there if the address is registered."
      supportEyebrow="Recovery support"
      supportTitle="Password updates happen from the email link only."
      supportText="This protects the account by making sure the new password can only be set from the inbox tied to the account."
      highlights={[
        "Request the reset link from one email field",
        "Open the secure link from that inbox to continue",
        "Set the new password only after the reset link is verified",
      ]}
      quote="A good recovery flow gets people back into care quickly without weakening the account along the way."
      quoteAuthor="DocX Care Team"
      quoteRole="Patient support"
      quoteInitials="DC"
      trustItems={[
        "Appointments",
        "Prescriptions",
        "Lab Reports",
        "Medical Records",
        "Pharmacy",
        "Follow-ups",
      ]}
      footnote="Use the same email address linked to your existing DocX account."
      badge="Account Recovery"
    >
      <div>
        <MainTitle>Forgot your password?</MainTitle>
        <MainSubtitle>
          Enter your email and we&apos;ll send a secure link to reset your password.
        </MainSubtitle>
      </div>

      <FormBlock onSubmit={handleSubmit} noValidate>
        <FieldGroup>
          <FieldLabel htmlFor="forgot-email">Email address</FieldLabel>
          <InputShell $tone="purple" $tint $error={Boolean(fieldErrors.email)}>
            <LeadingIcon>
              <MdEmail />
            </LeadingIcon>
            <FormInput
              id="forgot-email"
              type="email"
              name="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (status.type === "error") {
                  setStatus({ type: "", msg: "" });
                }
                if (fieldErrors.email) {
                  setFieldErrors((current) => ({ ...current, email: "" }));
                }
              }}
              $withIcon
              aria-invalid={Boolean(fieldErrors.email)}
            />
          </InputShell>
          {fieldErrors.email ? (
            <FieldHint $error>{fieldErrors.email}</FieldHint>
          ) : (
            <FieldHint>We&apos;ll send the reset link to this email if it belongs to a DocX account.</FieldHint>
          )}
        </FieldGroup>

        {status.msg ? <InlineAlert $type={status.type}>{status.msg}</InlineAlert> : null}

        <PrimaryButton type="submit" $tone="purple" disabled={loading}>
          {loading ? "Sending reset link..." : "Send reset link"}
        </PrimaryButton>
      </FormBlock>

      <FooterText>
        <BackLink to="/login">
          <FaArrowLeft />
          Back to login
        </BackLink>
      </FooterText>
    </AuthLayout>
  );
};

export default ForgotPassword;
