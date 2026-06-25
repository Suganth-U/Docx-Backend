import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { FaEye, FaEyeSlash, FaGoogle } from "react-icons/fa";
import api from "@/shared/lib/api";
import { assets } from "@/shared/lib/assets";
import {
  clearAuthSessionStorage,
  setStoredAuthSession,
} from "@/shared/lib/authSession";
import { migrateGuestCartToPatient } from "@/shared/lib/storage";
import StatusModal from "@/shared/components/common/StatusModal";
import AuthPolicyDisclosure from "@/shared/components/auth/AuthPolicyDisclosure";
import useAuth from "@/shared/hooks/useAuth";
import {
  getGoogleAuthErrorMessage,
  verifyGoogleRedirectResult,
} from "@/shared/features/Auth/googleEmailVerification";
import {
  AuthLayout,
  ContextEyebrow,
  Divider,
  FieldGroup,
  FieldHint,
  FieldLabel,
  FooterText,
  FormBlock,
  FormInput,
  InputShell,
  MainSubtitle,
  MainTitle,
  PrimaryButton,
  SocialButton,
  TextLinkRow,
  ActionIconButton,
} from "@/shared/components/auth/AuthScaffold";
import {
  getEmailError,
  getFriendlyAuthError,
  getPasswordError,
} from "@/shared/features/Auth/authValidation";

const TermsText = styled.p`
  margin: 16px 0 24px;
  color: #6B7280;
  font-size: 0.8rem;
  line-height: 1.5;

  a {
    color: #111827;
    font-weight: 600;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const getRoleFromSearch = (search) =>
  new URLSearchParams(search).get("role") === "doctor" ? "doctor" : "patient";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuth();
  const role = getRoleFromSearch(location.search);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [verifyingGoogle, setVerifyingGoogle] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const googleRedirectHandled = useRef(false);
  const [modal, setModal] = useState({
    isOpen: false,
    type: "success",
    title: "",
    message: "",
    actionText: "Continue",
    onAction: null,
    duration: 3000,
  });

  const closeModal = () => setModal((current) => ({ ...current, isOpen: false }));

  const showModal = useCallback((type, title, message, actionText, onAction) => {
    setModal({
      isOpen: true,
      type,
      title,
      message,
      actionText,
      onAction,
      duration: type === "success" ? 1500 : 3000,
    });
  }, []);

  const clearAuthState = useCallback(() => {
    setAuth({});
    clearAuthSessionStorage();
  }, [setAuth]);

  const resetExistingSession = useCallback(async () => {
    await api.post("/auth/logout").catch(() => {});
    clearAuthState();
  }, [clearAuthState]);

  const handleNavigation = useCallback((data) => {
    const redirectPath = location.state?.from?.pathname || "";
    const redirectSearch = location.state?.from?.search || "";

    if (data.role === "doctor") {
      navigate(redirectPath.startsWith("/doctor") ? `${redirectPath}${redirectSearch}` : "/doctor/dashboard");
      return;
    }

    if (data.role === "admin") {
      navigate(redirectPath.startsWith("/admin") ? `${redirectPath}${redirectSearch}` : "/admin/dashboard");
      return;
    }

    if (redirectPath && !redirectPath.startsWith("/doctor") && !redirectPath.startsWith("/admin")) {
      navigate(`${redirectPath}${redirectSearch}`);
      return;
    }

    navigate("/");
  }, [location.state?.from?.pathname, location.state?.from?.search, navigate]);

  const completeGoogleLogin = useCallback(async (verification, expectedRole = role) => {
    try {
      const { data } = await api.post("/auth/google", {
        credential: verification.token,
        expectedRole,
        intent: "login",
      });

      const minimalUser = {
        _id: data._id,
        role: data.role,
        roles: [data.role],
        status: data.status,
        isVerified: data.isVerified,
        accessToken: data.accessToken,
        name: data.name,
        email: data.email,
      };

      setAuth(minimalUser);
      setStoredAuthSession(minimalUser);
      if (minimalUser.role === "patient") {
        migrateGuestCartToPatient(minimalUser);
      }

      showModal(
        "success",
        "Google Sign-In Successful",
        `Welcome${data.name ? `, ${data.name}` : ""}!`,
        "Open dashboard",
        () => handleNavigation(data)
      );
    } catch (err) {
      console.error("Google API sign-in error:", err);
      showModal("error", "Google Sign-In Failed", getGoogleAuthErrorMessage(err) || "Authentication Failed", "Try Again");
    }
  }, [handleNavigation, role, setAuth, showModal]);

  useEffect(() => {
    if (googleRedirectHandled.current) return;
    googleRedirectHandled.current = true;

    let active = true;

    const completeRedirectLogin = async () => {
      try {
        const verification = await verifyGoogleRedirectResult();
        if (!verification || verification.context?.source !== "login") return;

        if (active) setVerifyingGoogle(true);
        await resetExistingSession();
        await completeGoogleLogin(verification, verification.context?.expectedRole || role);
      } catch (err) {
        console.error("Google redirect sign-in verification error:", err);
        showModal(
          "error",
          "Google Sign-In Failed",
          getGoogleAuthErrorMessage(err),
          "Try Again"
        );
      } finally {
        if (active) setVerifyingGoogle(false);
      }
    };

    completeRedirectLogin();

    return () => {
      active = false;
    };
  }, [completeGoogleLogin, resetExistingSession, role, showModal]);

  // UPDATED: Directly opens the Google popup without validating form email
  const handleGoogleLogin = async () => {
    setVerifyingGoogle(true);
    
    try {
      await resetExistingSession();

      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      
      // Forces the account selection overlay to appear
      provider.setCustomParameters({ prompt: 'select_account' }); 

      // Opens the Google authentication modal
      const result = await signInWithPopup(auth, provider);
      const token = await result.user.getIdToken();

      // Pass the generated token directly to your completion function
      await completeGoogleLogin({ token }, role);

    } catch (err) {
      // Fail silently if the user simply closes the modal
      if (err.code === 'auth/popup-closed-by-user') {
        setVerifyingGoogle(false);
        return; 
      }

      console.error("Google sign-in verification error:", err);
      showModal("error", "Google Sign-In Failed", getGoogleAuthErrorMessage(err) || "Authentication Failed", "Try Again");
    } finally {
      setVerifyingGoogle(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((current) => ({ ...current, [name]: "" }));
    }
  };

  const validate = () => {
    const errors = {
      email: getEmailError(formData.email, isDoctor ? "Professional email" : "Email address"),
      password: getPasswordError(formData.password),
    };

    Object.keys(errors).forEach((key) => {
      if (!errors[key]) delete errors[key];
    });

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) return;

    setLoading(true);

    try {
      await resetExistingSession();
      const { data } = await api.post("/auth/login", {
        email: formData.email,
        password: formData.password,
        expectedRole: role,
      });

      const minimalUser = {
        _id: data._id,
        role: data.role,
        roles: [data.role],
        status: data.status,
        isVerified: data.isVerified,
        accessToken: data.accessToken,
        name: data.name,
        email: data.email,
      };

      setAuth(minimalUser);
      setStoredAuthSession(minimalUser);
      if (minimalUser.role === "patient") {
        migrateGuestCartToPatient(minimalUser);
      }

      showModal(
        "success",
        "Login Successful",
        `Welcome back, ${data.name}!`,
        "Open dashboard",
        () => handleNavigation(data)
      );
    } catch (err) {
      const message = getFriendlyAuthError(err, "Login failed. Please check your details and try again.");
      showModal("error", "Login Failed", message, "Try Again");
    } finally {
      setVerifyingGoogle(false);
      setLoading(false);
    }
  };

  const isDoctor = role === "doctor";

  return (
    <>
      <StatusModal
        isOpen={modal.isOpen}
        onClose={closeModal}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        actionText={modal.actionText}
        onAction={modal.onAction}
        duration={modal.duration}
      />

      <AuthLayout
        asideImage={isDoctor ? assets.auth_doctor_telehealth : assets.auth_patient_care}
        quote={
          isDoctor
            ? "I think what separates DocX is the speed at which they can provide context and the fact that they're so clinician-friendly. You hear nightmare stories of getting put through the wringer, spending weeks and weeks to get this done. But everything in a startup is about speed and DocX really has that down."
            : "I think what separates DocX is the speed at which they can provide care and the fact that they're so patient-friendly. You hear nightmare stories of getting put through the wringer, spending weeks and weeks to get this done. But everything in a startup is about speed and DocX really has that down."
        }
        quoteAuthor={isDoctor ? "Dr. A. Perera" : "Nethmi Fernando"}
        quoteRole={isDoctor ? "DocX Clinician" : "Returning Patient"}
      >
        <div style={{ marginBottom: 24 }}>
          <ContextEyebrow>{isDoctor ? "Doctor login" : "User login"}</ContextEyebrow>
          <MainTitle>{isDoctor ? "Welcome doctor" : "Welcome user"}</MainTitle>
          <MainSubtitle>
            {isDoctor
              ? "We're eliminating the friction and bias of traditional clinics, connecting medical professionals to patients at the click of a button."
              : "We're eliminating the friction and bias of traditional care, connecting patients to clinicians at the click of a button."}
          </MainSubtitle>
          {isDoctor ? (
            <FooterText style={{ textAlign: "left", marginTop: 12 }}>
              Need a doctor account? <Link to="/join-as-doctor">Doctor registration</Link>
            </FooterText>
          ) : null}
        </div>

        <FormBlock onSubmit={handleSubmit} noValidate>
          <FieldGroup>
            <FieldLabel htmlFor="login-email">
              {isDoctor ? "Professional email" : "Email Address"}
            </FieldLabel>
            <InputShell $error={Boolean(fieldErrors.email)}>
              <FormInput
                id="login-email"
                type="email"
                name="email"
                placeholder="Your email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </InputShell>
            {fieldErrors.email ? <FieldHint $error>{fieldErrors.email}</FieldHint> : null}
          </FieldGroup>

          <FieldGroup>
            <FieldLabel htmlFor="login-password">Password</FieldLabel>
            <InputShell $error={Boolean(fieldErrors.password)}>
              <FormInput
                id="login-password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Your password"
                value={formData.password}
                onChange={handleChange}
                $withAction
                required
              />
              <ActionIconButton type="button" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </ActionIconButton>
            </InputShell>
            {fieldErrors.password ? <FieldHint $error>{fieldErrors.password}</FieldHint> : null}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
              <Link
                to="/forgot-password"
                style={{
                  color: "#111827",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  textDecoration: "none",
                }}
              >
                Forgot your password?
              </Link>
            </div>
          </FieldGroup>

          <div style={{ marginTop: 12 }}>
            <PrimaryButton type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Login"}
            </PrimaryButton>
          </div>
        </FormBlock>

        <>
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
        </>

        <TermsText>
          <AuthPolicyDisclosure
            prefix="By clicking the Login button, I agree to DocX's "
            between=" including E-Sign Consent, and "
            suffix="."
          />
        </TermsText>

        {isDoctor ? (
          <FooterText style={{ textAlign: "left" }}>
            Looking for patient access instead? <Link to="/login">User login</Link>
          </FooterText>
        ) : (
          <>
            <FooterText style={{ textAlign: "left" }}>
              Don&apos;t have an account? <Link to="/signup">User registration</Link>
            </FooterText>

            <TextLinkRow>
              <Link to="/login?role=doctor">Doctor login</Link>
              <Link to="/join-as-doctor">Doctor registration</Link>
            </TextLinkRow>
          </>
        )}
      </AuthLayout>
    </>
  );
};

export default Login;
