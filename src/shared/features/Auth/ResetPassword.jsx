import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FaCheck, FaEye, FaEyeSlash, FaLock, FaTimes } from "react-icons/fa";
import api from "@/shared/lib/api";
import { assets } from "@/shared/lib/assets";
import { useToast } from "@/shared/context/ToastContext";
import {
  ActionIconButton,
  AuthLayout,
  FieldGroup,
  FieldHint,
  FieldLabel,
  FooterText,
  FormBlock,
  FormInput,
  InputShell,
  LeadingIcon,
  MainSubtitle,
  MainTitle,
  PrimaryButton,
} from "@/shared/components/auth/AuthScaffold";
import {
  getFriendlyAuthError,
  getPasswordError,
  getPasswordMatchError,
} from "@/shared/features/Auth/authValidation";

const MeterShell = styled.div`
  display: grid;
  gap: 8px;
`;

const MeterBar = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
`;

const MeterSegment = styled.div`
  height: 5px;
  border-radius: 999px;
  background: ${(props) => props.$background};
`;

const MeterMeta = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: #6b7280;
  font-size: 0.8rem;
`;

const GuidanceCard = styled.div`
  padding: 16px 18px;
  border-radius: 18px;
  background: linear-gradient(180deg, #f6f6f6 0%, #ffffff 100%);
  border: 1px solid rgba(17, 17, 17, 0.08);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.92);
  color: #5f6368;
  font-size: 0.9rem;
  line-height: 1.7;

  strong {
    display: block;
    color: #171717;
    margin-bottom: 6px;
  }
`;

const StatusCard = styled.div`
  display: grid;
  gap: 14px;
  padding: 20px;
  border-radius: 16px;
  background: #f5f5f5;
  border: 1px solid rgba(17, 17, 17, 0.08);
`;

const StatusIcon = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(17, 17, 17, 0.08);
  color: #111111;
  font-size: 1.4rem;
`;

const PASSWORD_MIN_LENGTH = 8;

const Meter = ({ password }) => {
  if (!password) return null;

  const segments = [
    password.length >= PASSWORD_MIN_LENGTH ? "#d97706" : "#e5e7eb",
    /[A-Z]/.test(password) && /[0-9]/.test(password) ? "#111111" : "#e5e7eb",
    /[^A-Za-z0-9]/.test(password) ? "#16a34a" : "#e5e7eb",
  ];

  const label =
    password.length < PASSWORD_MIN_LENGTH ? "Weak" : segments.includes("#e5e7eb") ? "Medium" : "Strong";

  return (
    <MeterShell>
      <MeterBar>
        {segments.map((background, index) => (
          <MeterSegment key={`${background}-${index}`} $background={background} />
        ))}
      </MeterBar>
      <MeterMeta>
        <span>Strength: {label}</span>
        <span>{password.length}/{PASSWORD_MIN_LENGTH}+ chars</span>
      </MeterMeta>
    </MeterShell>
  );
};

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [validation, setValidation] = useState({
    status: "loading",
    message: "We’re validating your reset link now.",
  });

  useEffect(() => {
    let isMounted = true;

    const validateToken = async () => {
      if (!token) {
        if (isMounted) {
          setValidation({
            status: "invalid",
            message: "This reset link is incomplete. Request a new one to continue.",
          });
        }
        return;
      }

      try {
        const { data } = await api.post("/auth/reset-password/validate", { token });

        if (isMounted) {
          setValidation({
            status: data?.status || "valid",
            message: data?.message || "Reset link is valid.",
          });
        }
      } catch (err) {
        if (isMounted) {
          setValidation({
            status: err.response?.data?.status || "invalid",
            message:
              err.response?.data?.message ||
              "This reset link is invalid or expired. Request a new one to continue.",
          });
        }
      }
    };

    validateToken();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const isMatch = password && confirmPassword && password === confirmPassword;
  const isMismatch = password && confirmPassword && password !== confirmPassword;

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (validation.status !== "valid") {
      return;
    }

    const nextErrors = {
      password: getPasswordError(password, { label: "New password" }),
      confirmPassword: getPasswordMatchError(password, confirmPassword),
    };

    Object.keys(nextErrors).forEach((key) => {
      if (!nextErrors[key]) delete nextErrors[key];
    });

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Please fix the highlighted password fields.", "Validation Error");
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/reset-password", {
        token,
        newPassword: password,
      });

      toast.success("Password reset successful. Redirecting to login...", "Success");
      setTimeout(() => navigate("/login"), 1800);
    } catch (err) {
      const nextStatus = err.response?.data?.status;

      if (nextStatus === "invalid" || nextStatus === "expired") {
        setValidation({
          status: nextStatus,
          message:
            err.response?.data?.message ||
            "This reset link is no longer valid. Request a new one to continue.",
        });
      }

      toast.error(getFriendlyAuthError(err, "Failed to reset password"), "Error");
    } finally {
      setLoading(false);
    }
  };

  const isValidLink = validation.status === "valid";
  const isCheckingLink = validation.status === "loading";

  return (
    <AuthLayout
      tone="purple"
      asideImage={assets.loginModel}
      brand="DocX"
      brandTag="Secure password reset"
      eyebrow={isValidLink ? "Set New Password" : isCheckingLink ? "Validating Reset Link" : "Reset Link Unavailable"}
      title="Reset your DocX password securely from the email link."
      description="This page becomes active only after the recovery link is verified, so your new password can be saved safely."
      supportEyebrow="Security guidance"
      supportTitle="Recovery works only after link verification."
      supportText="Open the reset link from the relevant email inbox, then choose a strong new password to continue back into DocX."
      highlights={[
        "The reset link is checked before the form is enabled",
        "A new password can be saved only from a verified reset link",
        "Expired or used links send you back to request a fresh email",
      ]}
      quote="A secure reset flow should still feel calm and straightforward when someone needs access back quickly."
      quoteAuthor="DocX Security"
      quoteRole="Account protection"
      quoteInitials="DS"
      trustItems={[
        "Appointments",
        "Prescriptions",
        "Lab Reports",
        "Medical Records",
        "Pharmacy",
        "Follow-ups",
      ]}
      footnote="Use the reset link exactly as it appears in your email. If it expires, request a new one from the recovery page."
      badge="Reset Password"
    >
      <div>
        <MainTitle>
          {isValidLink
            ? "Choose a new password"
            : isCheckingLink
              ? "Checking your reset link"
              : "This reset link cannot be used"}
        </MainTitle>
        <MainSubtitle>
          {isValidLink
            ? "Create a strong new password for your DocX account. Once saved, you can sign in again with the same email."
            : validation.message}
        </MainSubtitle>
      </div>

      {!isValidLink ? (
        <>
          <StatusCard>
            <StatusIcon>
              {isCheckingLink ? <FaLock /> : <FaTimes />}
            </StatusIcon>
            <div>
              <strong style={{ display: "block", color: "#374151", marginBottom: 6, fontSize: "0.9rem" }}>
                {isCheckingLink ? "Validating reset link" : "Reset link expired or invalid"}
              </strong>
              <span style={{ color: "#6B7280", lineHeight: 1.6, fontSize: "0.85rem" }}>
                {isCheckingLink
                  ? "Please wait a moment while we confirm that this recovery link is still active."
                  : validation.message}
              </span>
            </div>
          </StatusCard>

          {isCheckingLink ? (
            <PrimaryButton type="button" $tone="purple" disabled>
              Checking link...
            </PrimaryButton>
          ) : (
            <PrimaryButton
              as={Link}
              to="/forgot-password"
              $tone="purple"
              style={{ textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              Request a new reset link
            </PrimaryButton>
          )}

          <FooterText>
            Remembered your password? <Link to="/login">Back to login</Link>
          </FooterText>
        </>
      ) : (
        <>
          <GuidanceCard>
            <strong>Verified link detected</strong>
            This reset link is active. Choose a password with at least {PASSWORD_MIN_LENGTH} characters before saving it to your account.
          </GuidanceCard>

          <FormBlock onSubmit={handleSubmit} noValidate>
            <FieldGroup>
              <FieldLabel htmlFor="reset-password">New password</FieldLabel>
              <InputShell $tone="purple" $tint $error={Boolean(fieldErrors.password)}>
                <LeadingIcon>
                  <FaLock />
                </LeadingIcon>
                <FormInput
                  id="reset-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((current) => ({ ...current, password: "" }));
                    }
                  }}
                  $withIcon
                  $withAction
                  required
                />
                <ActionIconButton type="button" onClick={() => setShowPassword((current) => !current)}>
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </ActionIconButton>
              </InputShell>
              <Meter password={password} />
              {fieldErrors.password ? <FieldHint $error>{fieldErrors.password}</FieldHint> : null}
            </FieldGroup>

            <FieldGroup>
              <FieldLabel htmlFor="reset-confirm">Confirm password</FieldLabel>
              <InputShell $tone="purple" $tint $error={Boolean(fieldErrors.confirmPassword) || isMismatch}>
                <LeadingIcon>
                  {isMatch ? <FaCheck /> : isMismatch ? <FaTimes /> : <FaLock />}
                </LeadingIcon>
                <FormInput
                  id="reset-confirm"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    if (fieldErrors.confirmPassword) {
                      setFieldErrors((current) => ({ ...current, confirmPassword: "" }));
                    }
                  }}
                  $withIcon
                  required
                />
              </InputShell>
              {fieldErrors.confirmPassword ? (
                <FieldHint $error>{fieldErrors.confirmPassword}</FieldHint>
              ) : isMismatch ? (
                <FieldHint $error>Passwords do not match.</FieldHint>
              ) : isMatch ? (
                <FieldHint>Passwords match and are ready to save.</FieldHint>
              ) : null}
            </FieldGroup>

            <PrimaryButton type="submit" $tone="purple" disabled={loading}>
              {loading ? "Saving new password..." : "Save new password"}
            </PrimaryButton>
          </FormBlock>

          <FooterText>
            Need a fresh link? <Link to="/forgot-password">Request another reset email</Link>
          </FooterText>
        </>
      )}
    </AuthLayout>
  );
};

export default ResetPassword;
