import {
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "firebase/auth";
import { auth, provider } from "@/shared/config/firebase";

const GOOGLE_REDIRECT_CONTEXT_KEY = "docx_google_auth_redirect_context";
const REDIRECT_CONTEXT_MAX_AGE_MS = 10 * 60 * 1000;

const normalizeEmail = (value = "") => String(value || "").trim().toLowerCase();

const toGoogleAuthError = (error) => {
  const code = error?.code || "";
  let message = error?.message || "Google sign-in failed. Please try again.";

  if (code === "auth/popup-blocked") {
    message = "Your browser blocked the Google sign-in popup. We are redirecting you to Google sign-in instead.";
  } else if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
    message = "Google sign-in was cancelled before it finished.";
  } else if (
    code === "auth/network-request-failed" ||
    code === "auth/internal-error" ||
    /network|connection|apis\.google\.com|identitytoolkit/i.test(message)
  ) {
    message = "Google sign-in could not reach Google right now. Check your connection and try again.";
  }

  const normalizedError = new Error(message);
  normalizedError.code = code;
  normalizedError.originalError = error;
  return normalizedError;
};

const shouldUseRedirectFallback = (error) =>
  ["auth/popup-blocked", "auth/cancelled-popup-request"].includes(error?.code);

const saveRedirectContext = (context) => {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(
    GOOGLE_REDIRECT_CONTEXT_KEY,
    JSON.stringify({
      createdAt: Date.now(),
      ...context,
    })
  );
};

const readRedirectContext = () => {
  if (typeof window === "undefined") return null;

  try {
    const rawContext = window.sessionStorage.getItem(GOOGLE_REDIRECT_CONTEXT_KEY);
    if (!rawContext) return null;

    const context = JSON.parse(rawContext);
    if (!context?.createdAt || Date.now() - context.createdAt > REDIRECT_CONTEXT_MAX_AGE_MS) {
      window.sessionStorage.removeItem(GOOGLE_REDIRECT_CONTEXT_KEY);
      return null;
    }

    return context;
  } catch {
    window.sessionStorage.removeItem(GOOGLE_REDIRECT_CONTEXT_KEY);
    return null;
  }
};

const clearRedirectContext = () => {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(GOOGLE_REDIRECT_CONTEXT_KEY);
  }
};

const buildVerificationPayload = async (firebaseUser, expectedEmail = "") => {
  const token = await firebaseUser.getIdToken(true);
  const verifiedEmail = normalizeEmail(firebaseUser.email);

  if (!verifiedEmail) {
    throw new Error("Google did not return an email for this account.");
  }

  if (expectedEmail && normalizeEmail(expectedEmail) !== verifiedEmail) {
    throw new Error("Use the same Google email address you entered in the form.");
  }

  return {
    token,
    email: verifiedEmail,
    name: firebaseUser.displayName || "",
  };
};

export const getGoogleAuthErrorMessage = (error, fallback = "Google sign-in failed. Please try again.") =>
  error?.response?.data?.message || error?.message || fallback;

export const verifyGoogleEmailAddress = async ({
  expectedEmail = "",
  redirectContext = {},
  useRedirectFallback = true,
} = {}) => {
  let popupUser = null;

  try {
    const result = await signInWithPopup(auth, provider);
    popupUser = result.user;

    return await buildVerificationPayload(popupUser, expectedEmail);
  } catch (error) {
    if (useRedirectFallback && shouldUseRedirectFallback(error)) {
      saveRedirectContext({
        expectedEmail,
        ...redirectContext,
      });

      try {
        await signInWithRedirect(auth, provider);
        return new Promise(() => {});
      } catch (redirectError) {
        clearRedirectContext();
        throw toGoogleAuthError(redirectError);
      }
    }

    throw toGoogleAuthError(error);
  } finally {
    if (popupUser) {
      await signOut(auth).catch(() => {});
    }
  }
};

export const verifyGoogleRedirectResult = async () => {
  const context = readRedirectContext();
  if (!context) return null;

  let redirectUser = null;

  try {
    const result = await getRedirectResult(auth);
    if (!result?.user) return null;

    redirectUser = result.user;
    const verification = await buildVerificationPayload(redirectUser, context.expectedEmail || "");
    clearRedirectContext();

    return {
      ...verification,
      context,
    };
  } catch (error) {
    clearRedirectContext();
    throw toGoogleAuthError(error);
  } finally {
    if (redirectUser) {
      await signOut(auth).catch(() => {});
    }
  }
};
