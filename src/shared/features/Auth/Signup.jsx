import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
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
  verifyGoogleEmailAddress,
  verifyGoogleRedirectResult,
} from "@/shared/features/Auth/googleEmailVerification";
import {
  AuthLayout,
  CheckboxRow,
  ContextEyebrow,
  Divider,
  FieldGrid,
  FieldGroup,
  FieldHint,
  FieldLabel,
  FormBlock,
  FormInput,
  HelperRow,
  InputShell,
  ActionIconButton,
  MainSubtitle,
  MainTitle,
  PrimaryButton,
  SocialButton,
  TextLinkRow,
} from "@/shared/components/auth/AuthScaffold";
import {
  getEmailError,
  getFriendlyAuthError,
  getPasswordError,
  getPasswordMatchError,
  getRequiredError,
  trimValue,
} from "@/shared/features/Auth/authValidation";

const PasswordMeter = styled.div`
  display: grid;
  gap: 6px;
`;

const MeterBar = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
`;

const Segment = styled.div`
  height: 4px;
  border-radius: 999px;
  background: ${(props) => props.$background || "#E5E7EB"};
  transition: background 0.2s ease;
`;

const SuggestButton = styled.button`
  padding: 0;
  background: none;
  border: none;
  color: #111111;
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
  width: fit-content;

  &:hover {
    text-decoration: underline;
  }
`;
const PORTAL_AUTH_ERROR_MESSAGE =
  "We couldn't sign you in on this portal. Check your credentials or use the correct login page.";

const getNicError = (value) => {
  const nic = trimValue(value);

  if (!nic) return "NIC number is required.";
  if (!/^(\d{9}[VXvx]|\d{12})$/.test(nic)) {
    return "Enter a valid Sri Lankan NIC: 12 digits, or 9 digits followed by V or X.";
  }

  return "";
};

const Signup = () => {
  const navigate = useNavigate();
  const { auth, setAuth } = useAuth();
  const [formData, setFormData] = useState({
    fullName: "",
    nic: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [verifyingGoogle, setVerifyingGoogle] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const googleRedirectHandled = useRef(false);
  const [modal, setModal] = useState({
    isOpen: false,
    type: "success",
    title: "",
    message: "",
    actionText: "",
    onAction: null,
    duration: 3000,
  });

  const showModal = useCallback((type, title, message, actionText, onAction) => {
    setModal({
      isOpen: true,
      type,
      title,
      message,
      actionText,
      onAction,
      duration: type === "success" ? 2000 : 4000,
    });
  }, []);

  const clearAuthState = useCallback(() => {
    setAuth({});
    clearAuthSessionStorage();
  }, [setAuth]);

  useEffect(() => {
    const currentRole = auth?.roles?.[0] || auth?.role;

    if (currentRole && currentRole !== "patient") {
      clearAuthState();
    }
  }, [auth, clearAuthState]);

  const completeGoogleSignup = useCallback(async (verification) => {
    const { data } = await api.post("/auth/google", {
      credential: verification.token,
      expectedRole: "patient",
      intent: "signup",
    });

    if (data.role !== "patient") {
      await api.post("/auth/logout").catch(() => {});
      clearAuthState();
      showModal("error", "Google Sign-Up Failed", PORTAL_AUTH_ERROR_MESSAGE, "Close");
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
    migrateGuestCartToPatient(minimalUser);

    showModal(
      "success",
      "Google Sign-Up Successful",
      `Welcome${data.name ? `, ${data.name}` : ""}! Your account is ready.`,
      "Open DocX",
      () => navigate("/")
    );
  }, [clearAuthState, navigate, setAuth, showModal]);

  useEffect(() => {
    if (googleRedirectHandled.current) return;
    googleRedirectHandled.current = true;

    let active = true;

    const completeRedirectSignup = async () => {
      try {
        const verification = await verifyGoogleRedirectResult();
        if (!verification || verification.context?.source !== "signup") return;

        if (active) setVerifyingGoogle(true);
        await completeGoogleSignup(verification);
      } catch (err) {
        console.error("Google redirect sign-up verification error:", err);
        showModal("error", "Google Sign-Up Failed", getGoogleAuthErrorMessage(err, "Google sign-up failed. Please try again."), "Close");
      } finally {
        if (active) setVerifyingGoogle(false);
      }
    };

    completeRedirectSignup();

    return () => {
      active = false;
    };
  }, [completeGoogleSignup, showModal]);

  const handleGoogleSignup = async () => {
    const nextErrors = {};

    const emailError = formData.email ? getEmailError(formData.email) : "";
    if (emailError) {
      nextErrors.email = emailError;
    }

    if (!termsAccepted) {
      nextErrors.terms = "You must accept the terms and privacy policy.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors((current) => ({ ...current, ...nextErrors }));
      return;
    }

    try {
      setVerifyingGoogle(true);
      const verification = await verifyGoogleEmailAddress({
        expectedEmail: formData.email,
        redirectContext: {
          source: "signup",
          expectedRole: "patient",
          intent: "signup",
          termsAccepted: true,
        },
      });

      await completeGoogleSignup(verification);
    } catch (err) {
      console.error("Google sign-up verification error:", err);
      showModal("error", "Google Sign-Up Failed", getGoogleAuthErrorMessage(err, "Google sign-up failed. Please try again."), "Close");
    } finally {
      setVerifyingGoogle(false);
    }
  };

  const checkStrength = (password) => {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    setPasswordStrength(score);
  };

  const generateStrongPassword = () => {
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lower = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*()_+";
    const allChars = upper + lower + numbers + symbols;
    const guaranteed = [
      upper.charAt(Math.floor(Math.random() * upper.length)),
      numbers.charAt(Math.floor(Math.random() * numbers.length)),
      symbols.charAt(Math.floor(Math.random() * symbols.length)),
    ];
    const generated = Array.from({ length: 9 }, () =>
      allChars.charAt(Math.floor(Math.random() * allChars.length))
    )
      .concat(guaranteed)
      .sort(() => Math.random() - 0.5)
      .join("");

    setFormData((current) => ({
      ...current,
      password: generated,
      confirmPassword: generated,
    }));
    checkStrength(generated);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));

    if (name === "password") {
      checkStrength(value);
    }

    if (fieldErrors[name]) {
      setFieldErrors((current) => ({ ...current, [name]: "" }));
    }
  };

  const validate = () => {
    const errors = {
      fullName: getRequiredError(formData.fullName, "Full name"),
      nic: getNicError(formData.nic),
      email: getEmailError(formData.email),
      password: getPasswordError(formData.password, { requireStrong: true }),
      confirmPassword: getPasswordMatchError(formData.password, formData.confirmPassword),
    };

    if (!termsAccepted) {
      errors.terms = "You must accept the terms and privacy policy.";
    }

    Object.keys(errors).forEach((key) => {
      if (!errors[key]) delete errors[key];
    });

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) return;

    try {
      const { data } = await api.post("/auth/register", {
        name: formData.fullName,
        email: formData.email,
        password: formData.password,
        role: "patient",
      });

      if (data.requiresVerification) {
        showModal(
          "success",
          "Please Check Your Email",
          "Registration roughly complete! We've sent a magic link to your email. Click it to verify your account and automatically log in.",
          "Check Inbox",
          null
        );
        return;
      }

      if (data.accessToken || data._id) {
        showModal(
          "success",
          "Account Created",
          `Welcome to DocX, ${data.name || formData.fullName}. Your account is ready and you can log in now.`,
          "Go to Login",
          () => navigate("/login")
        );
        return;
      }

      showModal("error", "Signup Failed", "Account creation failed. Please try again.", "Close");
    } catch (err) {
      const message = getFriendlyAuthError(err, "Signup failed. Please check the highlighted fields.");
      showModal("error", "Signup Failed", message, "Close");
    } finally {
      setVerifyingGoogle(false);
    }
  };

  const strengthSegments = [
    passwordStrength >= 1 ? "#F59E0B" : "#E5E7EB",
    passwordStrength >= 2 ? "#111111" : "#E5E7EB",
    passwordStrength >= 3 ? "#10B981" : "#E5E7EB",
  ];

  return (
    <AuthLayout
      asideImage={assets.auth_bg_1}
    >
      <div style={{ marginBottom: 24 }}>
        <ContextEyebrow>User registration</ContextEyebrow>
        <MainTitle>Create an account</MainTitle>
        <MainSubtitle>
          Create your DocX account for appointments, records, and pharmacy support.
        </MainSubtitle>
        <TextLinkRow>
          <Link to="/login">User login</Link>
          <Link to="/login?role=doctor">Doctor login</Link>
          <Link to="/join-as-doctor">Doctor registration</Link>
        </TextLinkRow>
      </div>

      <FormBlock onSubmit={handleSubmit} noValidate>
        <FieldGrid>
          <FieldGroup>
            <FieldLabel htmlFor="signup-name">Full name</FieldLabel>
            <InputShell $error={Boolean(fieldErrors.fullName)}>
              <FormInput
                id="signup-name"
                type="text"
                name="fullName"
                placeholder="Your full name"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
            </InputShell>
            {fieldErrors.fullName ? <FieldHint $error>{fieldErrors.fullName}</FieldHint> : null}
          </FieldGroup>

          <FieldGroup>
            <FieldLabel htmlFor="signup-nic">NIC number</FieldLabel>
            <InputShell $error={Boolean(fieldErrors.nic)}>
              <FormInput
                id="signup-nic"
                type="text"
                name="nic"
                placeholder="Your NIC"
                value={formData.nic}
                onChange={handleChange}
                required
              />
            </InputShell>
            {fieldErrors.nic ? <FieldHint $error>{fieldErrors.nic}</FieldHint> : null}
          </FieldGroup>
        </FieldGrid>

        <FieldGroup>
          <FieldLabel htmlFor="signup-email">Email address</FieldLabel>
          <InputShell $error={Boolean(fieldErrors.email)}>
            <FormInput
              id="signup-email"
              type="email"
              name="email"
              placeholder="Your email"
              value={formData.email}
              onChange={handleChange}
              list="email-suggestions"
              required
            />
            <datalist id="email-suggestions">
              <option value={formData.email.split("@")[0] + "@gmail.com"} />
            </datalist>
          </InputShell>
          {fieldErrors.email ? <FieldHint $error>{fieldErrors.email}</FieldHint> : null}
        </FieldGroup>

          <FieldGroup>
            <FieldLabel htmlFor="signup-password">Password</FieldLabel>
            <InputShell $error={Boolean(fieldErrors.password)}>
              <FormInput
                id="signup-password"
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
            {formData.password ? (
              <PasswordMeter>
                <MeterBar>
                  {strengthSegments.map((background, index) => (
                    <Segment key={`${background}-${index}`} $background={background} />
                  ))}
                </MeterBar>
                <HelperRow>
                  <FieldHint>
                    Strength:{" "}
                    {passwordStrength < 1 ? "Weak" : passwordStrength < 3 ? "Medium" : "Strong"}
                  </FieldHint>
                  <SuggestButton type="button" onClick={generateStrongPassword}>
                    Suggest strong password
                  </SuggestButton>
                </HelperRow>
              </PasswordMeter>
            ) : null}
            {fieldErrors.password ? <FieldHint $error>{fieldErrors.password}</FieldHint> : null}
          </FieldGroup>

          <FieldGroup>
            <FieldLabel htmlFor="signup-confirm">Confirm password</FieldLabel>
            <InputShell $error={Boolean(fieldErrors.confirmPassword)}>
              <FormInput
                id="signup-confirm"
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm password"
                value={formData.confirmPassword}
                onChange={handleChange}
                $withAction
                required
              />
              <ActionIconButton type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </ActionIconButton>
            </InputShell>
            {fieldErrors.confirmPassword ? (
              <FieldHint $error>{fieldErrors.confirmPassword}</FieldHint>
            ) : null}
          </FieldGroup>
        <div style={{ marginTop: 12 }}>
          <PrimaryButton type="submit">
            Create account
          </PrimaryButton>
        </div>
      </FormBlock>

      <div style={{ marginTop: 24 }}>
        <CheckboxRow $top>
          <input
            type="checkbox"
            id="terms"
            checked={termsAccepted}
            onChange={(event) => {
              setTermsAccepted(event.target.checked);
              if (event.target.checked && fieldErrors.terms) {
                setFieldErrors((current) => ({ ...current, terms: "" }));
              }
            }}
          />
          <span>
            <AuthPolicyDisclosure
              prefix="I agree to the "
              termsLabel="Terms & Conditions"
              between=" and "
              suffix="."
            />
          </span>
        </CheckboxRow>
        {fieldErrors.terms ? <FieldHint $error>{fieldErrors.terms}</FieldHint> : null}
      </div>

      <Divider>or continue with</Divider>
      <SocialButton
        type="button"
        onClick={handleGoogleSignup}
        disabled={verifyingGoogle}
        style={{ width: "100%" }}
      >
        <FaGoogle />
        {verifyingGoogle ? "Continuing with Google..." : "Continue with Google"}
      </SocialButton>

      <StatusModal
        isOpen={modal.isOpen}
        onClose={() => setModal((current) => ({ ...current, isOpen: false }))}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        duration={modal.duration}
        actionText={modal.actionText}
        onAction={modal.onAction}
      />
    </AuthLayout>
  );
};

export default Signup;
