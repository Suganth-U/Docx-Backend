import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth"; // Added Firebase imports
import {
  FaEnvelopeOpenText,
  FaEye,
  FaEyeSlash,
  FaGoogle,
  FaHome,
  FaLock,
  FaUserShield,
} from "react-icons/fa";
import api from "@/shared/lib/api";
import { assets } from "@/shared/lib/assets";
import {
  clearAuthSessionStorage,
  setStoredAuthSession,
} from "@/shared/lib/authSession";
import AuthPolicyDisclosure from "@/shared/components/auth/AuthPolicyDisclosure";
import { useToast } from "@/shared/context/ToastContext";
import useAuth from "@/shared/hooks/useAuth";
import {
  getGoogleAuthErrorMessage,
  verifyGoogleRedirectResult,
} from "@/shared/features/Auth/googleEmailVerification";
import {
  ActionIconButton,
  AuthLayout,
  CompactInner,
  Divider,
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
  SecondaryButton,
  SocialButton,
} from "@/shared/components/auth/AuthScaffold";
import {
  getEmailError,
  getFriendlyAuthError,
  getPasswordError,
} from "@/shared/features/Auth/authValidation";

const ForgotLink = styled.button`
  padding: 0;
  border: none;
  background: none;
  color: #111111;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  text-align: left;

  &:hover {
    text-decoration: underline;
  }
`;

const AdminHint = styled.div`
  padding: 14px 16px;
  border-radius: 12px;
  background: #F5F5F5;
  border: 1px solid rgba(17, 17, 17, 0.08);
  color: #6B7280;
  font-size: 0.85rem;
  line-height: 1.6;

  strong {
    display: block;
    color: #374151;
    margin-bottom: 4px;
    font-size: 0.85rem;
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(17, 10, 33, 0.55);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
`;

const ModalCard = styled.div`
  width: 100%;
  max-width: 480px;
  border-radius: 20px;
  background: #ffffff;
  border: 1px solid #F3F4F6;
  box-shadow: 0 24px 60px rgba(30, 16, 53, 0.18);
  padding: 28px 24px;
`;

const ModalTitle = styled.h3`
  margin: 0 0 6px;
  color: #111827;
  font-size: 1.25rem;
  font-weight: 600;
`;

const ModalText = styled.p`
  margin: 0 0 20px;
  color: #6B7280;
  line-height: 1.6;
  font-size: 0.9rem;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 16px;

  > * {
    flex: 1;
  }
`;

const PORTAL_AUTH_ERROR_MESSAGE =
  "We couldn't sign you in on this portal. Check your credentials or use the correct login page.";

const AdminLogin = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { auth, setAuth } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [verifyingGoogle, setVerifyingGoogle] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetEmailError, setResetEmailError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const googleRedirectHandled = useRef(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((current) => ({ ...current, [name]: "" }));
    }
    if (error) setError("");
  };

  const clearAuthState = useCallback(() => {
    setAuth({});
    clearAuthSessionStorage();
  }, [setAuth]);

  useEffect(() => {
    const currentRole = auth?.roles?.[0] || auth?.role;

    if (currentRole && currentRole !== "admin") {
      clearAuthState();
    }
  }, [auth, clearAuthState]);

  const completeGoogleAdminLogin = useCallback(async (verification) => {
    try {
      const { data } = await api.post("/auth/google", {
        credential: verification.token,
        expectedRole: "admin",
        intent: "login",
      });

      if (data.role !== "admin") {
        await api.post("/auth/logout").catch(() => {});
        clearAuthState();
        setError(PORTAL_AUTH_ERROR_MESSAGE);
        toast.error(PORTAL_AUTH_ERROR_MESSAGE, "Authentication Failed");
        return;
      }

      const minimalUser = {
        _id: data._id,
        role: data.role,
        roles: [data.role],
        accessToken: data.accessToken,
        name: data.name,
        email: data.email,
      };

      setAuth(minimalUser);
      setStoredAuthSession(minimalUser);
      navigate("/admin/dashboard");
    } catch (err) {
       console.error("Google login API error:", err);
       const message = getGoogleAuthErrorMessage(err) || "Failed to verify admin account.";
       setError(message);
       toast.error(message, "Authentication Failed");
    }
  }, [clearAuthState, navigate, setAuth, toast]);

  useEffect(() => {
    if (googleRedirectHandled.current) return;
    googleRedirectHandled.current = true;

    let active = true;

    const completeRedirectLogin = async () => {
      try {
        const verification = await verifyGoogleRedirectResult();
        if (!verification || verification.context?.source !== "admin-login") return;

        if (active) setVerifyingGoogle(true);
        await completeGoogleAdminLogin(verification);
      } catch (err) {
        console.error("Google admin redirect verification error:", err);
        const message = getGoogleAuthErrorMessage(err);
        setError(message);
        toast.error(message, "Authentication Failed");
      } finally {
        if (active) setVerifyingGoogle(false);
      }
    };

    completeRedirectLogin();

    return () => {
      active = false;
    };
  }, [completeGoogleAdminLogin, toast]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const nextErrors = {
      email: getEmailError(formData.email, "Administrator email"),
      password: getPasswordError(formData.password),
    };

    Object.keys(nextErrors).forEach((key) => {
      if (!nextErrors[key]) delete nextErrors[key];
    });

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);

    try {
      const { data } = await api.post("/auth/admin/login", {
        email: formData.email,
        password: formData.password,
      });

      if (data.role !== "admin") {
        await api.post("/auth/logout").catch(() => {});
        clearAuthState();
        setError(PORTAL_AUTH_ERROR_MESSAGE);
        toast.error(PORTAL_AUTH_ERROR_MESSAGE, "Authentication Failed");
        return;
      }

      const minimalUser = {
        _id: data._id,
        role: data.role,
        roles: [data.role],
        accessToken: data.accessToken,
      };

      setAuth(minimalUser);
      setStoredAuthSession(minimalUser);
      navigate("/admin/dashboard");
    } catch (err) {
      const message = getFriendlyAuthError(err, "Admin login failed. Please check your details.");
      setError(message);
      toast.error(message, "Authentication Failed");
    } finally {
      setLoading(false);
    }
  };

  // UPDATED: Now opens Google modal directly without asking for an email first
  const handleGoogleLogin = async () => {
    setVerifyingGoogle(true);
    setError("");

    try {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      
      // Forces the account selection overlay to appear
      provider.setCustomParameters({ prompt: 'select_account' }); 

      // Opens the Google authentication modal
      const result = await signInWithPopup(auth, provider);
      const token = await result.user.getIdToken();

      // Pass the generated token directly to your existing completion function.
      await completeGoogleAdminLogin({ token });

    } catch (err) {
      // Fail silently if the user simply closes the modal
      if (err.code === 'auth/popup-closed-by-user') {
        setVerifyingGoogle(false);
        return; 
      }

      const message = getGoogleAuthErrorMessage(err) || "Authentication Failed";
      setError(message);
      toast.error(message, "Authentication Failed");
    } finally {
      setVerifyingGoogle(false);
    }
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    const emailError = getEmailError(resetEmail, "Administrator email");

    if (emailError) {
      setResetEmailError(emailError);
      return;
    }

    setResetLoading(true);

    try {
      const { data } = await api.post("/auth/forgot-password", { email: resetEmail });
      toast.success(
        data?.message || "If an account exists for this email, we sent a password reset link.",
        "Check Your Inbox"
      );
      setShowModal(false);
      setResetEmail("");
    } catch (err) {
      toast.error(getFriendlyAuthError(err, "Failed to send reset email"));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <AuthLayout
      tone="admin"
      asideImage={assets.auth_admin_workspace}
      brand="DocX Admin"
      brandTag="Platform control"
      eyebrow="Administrator Access"
      title="Manage the DocX platform from one protected operational workspace."
      description="Administrator access keeps user management, appointments, clinical operations, pharmacy workflows, and platform oversight behind a verified control layer."
      supportEyebrow="Operational security"
      supportTitle="Reserved for verified DocX administrators."
      supportText="This workspace is designed for sensitive platform controls, so the sign-in experience stays strict, role-based, and recovery-enabled without mixing with patient or clinician access."
      highlights={[
        "Restricted dashboard access for verified operational users only",
        "Central oversight across doctors, patients, appointments, and platform workflows",
        "Password recovery remains available directly from the admin sign-in experience",
      ]}
      quote="Administrative work moves faster when access, oversight, and recovery tools all live inside one disciplined entry point."
      quoteAuthor="DocX Operations"
      quoteRole="Platform administration"
      quoteInitials="DO"
      trustItems={[
        "User Oversight",
        "Appointments",
        "Doctors",
        "Patients",
        "Pharmacy Ops",
        "Platform Settings",
      ]}
      footnote="Use a verified administrator account only. All sensitive actions remain protected behind role-based access and dedicated operational safeguards."
      badge="Admin Login"
    >
      <div>
        <MainTitle>Admin dashboard</MainTitle>
        <MainSubtitle>
          Enter your administrator credentials to access the platform management workspace.
        </MainSubtitle>
      </div>

      <AdminHint>
        <strong>Restricted environment</strong>
        This login is reserved for DocX administrators managing operational and platform controls.
      </AdminHint>

      {error ? <InlineAlert $type="error">{error}</InlineAlert> : null}

      <FormBlock onSubmit={handleSubmit} noValidate>
        <FieldGroup>
          <FieldLabel htmlFor="admin-email">Administrator email</FieldLabel>
          <InputShell $tone="admin" $tint $error={Boolean(fieldErrors.email)}>
            <LeadingIcon>
              <FaUserShield />
            </LeadingIcon>
            <FormInput
              id="admin-email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              $withIcon
              required
            />
          </InputShell>
          {fieldErrors.email ? <FieldHint $error>{fieldErrors.email}</FieldHint> : null}
        </FieldGroup>

        <FieldGroup>
          <FieldLabel htmlFor="admin-password">Password</FieldLabel>
          <InputShell $tone="admin" $tint $error={Boolean(fieldErrors.password)}>
            <LeadingIcon>
              <FaLock />
            </LeadingIcon>
            <FormInput
              id="admin-password"
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              $withIcon
              $withAction
              required
            />
            <ActionIconButton type="button" onClick={() => setShowPassword((current) => !current)}>
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </ActionIconButton>
          </InputShell>
          {fieldErrors.password ? <FieldHint $error>{fieldErrors.password}</FieldHint> : null}
        </FieldGroup>

        <ForgotLink type="button" onClick={() => setShowModal(true)}>
          Forgot password?
        </ForgotLink>

        <PrimaryButton type="submit" $tone="admin" disabled={loading}>
          {loading ? "Authenticating..." : "Enter admin workspace"}
        </PrimaryButton>
      </FormBlock>

      <Divider>or continue with</Divider>
      <SocialButton
        type="button"
        onClick={handleGoogleLogin}
        disabled={verifyingGoogle || loading}
        style={{ width: "100%" }}
      >
        <FaGoogle />
        {verifyingGoogle ? "Continuing with Google..." : "Continue with Google"}
      </SocialButton>

      <FooterText $tone="admin" style={{ textAlign: "left" }}>
        <AuthPolicyDisclosure
          prefix="By accessing the admin workspace, you accept DocX's "
          between=" and the "
          suffix=" that govern protected operational access."
        />
      </FooterText>

      <FooterText>
        <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <FaHome />
          Return to home
        </Link>
      </FooterText>

      {showModal ? (
        <ModalOverlay onClick={() => setShowModal(false)}>
          <ModalCard onClick={(event) => event.stopPropagation()}>
            <CompactInner>
              <div>
                <ModalTitle>Reset administrator password</ModalTitle>
                <ModalText>
                  Enter the administrator email address to generate a password reset link.
                </ModalText>
              </div>

              <FormBlock onSubmit={handleForgotPassword} noValidate>
                <FieldGroup>
                  <FieldLabel htmlFor="admin-reset-email">Administrator email</FieldLabel>
                  <InputShell $tone="admin" $tint $error={Boolean(resetEmailError)}>
                    <LeadingIcon>
                      <FaEnvelopeOpenText />
                    </LeadingIcon>
                    <FormInput
                      id="admin-reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(event) => {
                        setResetEmail(event.target.value);
                        if (resetEmailError) setResetEmailError("");
                      }}
                      $withIcon
                      required
                    />
                  </InputShell>
                  {resetEmailError ? <FieldHint $error>{resetEmailError}</FieldHint> : null}
                </FieldGroup>

                <ButtonRow>
                  <PrimaryButton type="submit" $tone="admin" disabled={resetLoading}>
                    {resetLoading ? "Sending reset link..." : "Send reset link"}
                  </PrimaryButton>
                  <SecondaryButton type="button" onClick={() => setShowModal(false)} disabled={resetLoading}>
                    Cancel
                  </SecondaryButton>
                </ButtonRow>
              </FormBlock>
            </CompactInner>
          </ModalCard>
        </ModalOverlay>
      ) : null}
    </AuthLayout>
  );
};

export default AdminLogin;
