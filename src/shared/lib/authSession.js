export const AUTH_SESSION_KEY = "userInfo";
export const AUTH_SESSION_EVENT = "docx:auth-session-changed";

const LEGACY_AUTH_KEYS = [
  "adminInfo",
  "admin_id",
  "doctorFullname",
  "doctor_id",
  "doctorSpecialization",
  "doctorHospital",
  "doctorEmail",
];

const emitAuthSessionChange = (detail = {}) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EVENT, { detail }));
};

export const getStoredAuthSession = () => {
  try {
    const rawUserInfo = localStorage.getItem(AUTH_SESSION_KEY);
    return rawUserInfo ? JSON.parse(rawUserInfo) : {};
  } catch (error) {
    console.error("Failed to parse stored auth session", error);
    return {};
  }
};

export const setStoredAuthSession = (session = {}) => {
  const normalizedSession = {
    ...session,
    role: session.role || session.roles?.[0] || "",
    roles: session.roles || (session.role ? [session.role] : []),
  };

  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(normalizedSession));
  LEGACY_AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
  emitAuthSessionChange({ type: "set", session: normalizedSession });
  return normalizedSession;
};

export const clearAuthSessionStorage = () => {
  localStorage.removeItem(AUTH_SESSION_KEY);
  LEGACY_AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
  emitAuthSessionChange({ type: "clear" });
};

export const getStoredAuthRole = () => {
  const session = getStoredAuthSession();
  return String(session?.role || session?.roles?.[0] || "").toLowerCase();
};

export const isPatientSession = (session = getStoredAuthSession()) =>
  String(session?.role || session?.roles?.[0] || "").toLowerCase() === "patient" &&
  Boolean(session?.accessToken);

export const isDoctorSession = (session = getStoredAuthSession()) =>
  String(session?.role || session?.roles?.[0] || "").toLowerCase() === "doctor" &&
  Boolean(session?.accessToken);

export const isAdminSession = (session = getStoredAuthSession()) =>
  String(session?.role || session?.roles?.[0] || "").toLowerCase() === "admin" &&
  Boolean(session?.accessToken);

export const hasWrongRoleFor = (allowedRoles = [], session = getStoredAuthSession()) => {
  const role = String(session?.role || session?.roles?.[0] || "").toLowerCase();
  return Boolean(role && !allowedRoles.includes(role));
};

export const getLoginRouteForRole = (role = "patient") => {
  if (role === "admin") return "/admin/login";
  if (role === "doctor") return "/login?role=doctor";
  return "/login?role=patient";
};

export const getLoginRouteForAllowedRoles = (allowedRoles = [], pathname = "") => {
  if (allowedRoles.includes("admin") || pathname.startsWith("/admin")) {
    return "/admin/login";
  }

  if (allowedRoles.length === 1 && allowedRoles.includes("doctor")) {
    return "/login?role=doctor";
  }

  if (allowedRoles.length === 1 && allowedRoles.includes("patient")) {
    return "/login?role=patient";
  }

  if (pathname.startsWith("/doctor")) {
    return "/login?role=doctor";
  }

  return "/login?role=patient";
};

export const getPatientLoginState = (pathname = "", search = "") => ({
  pathname,
  search,
});

export const splitPathForRouterState = (targetPath = "") => {
  const [pathname = "/", rawSearch = ""] = String(targetPath || "/").split("?");
  return {
    pathname: pathname || "/",
    search: rawSearch ? `?${rawSearch}` : "",
  };
};

export const requirePatientSessionForNavigation = (navigate, targetPath = "/") => {
  const session = getStoredAuthSession();

  if (isPatientSession(session)) {
    navigate(targetPath);
    return true;
  }

  if (session?.accessToken) {
    clearAuthSessionStorage();
  }

  navigate("/login?role=patient", {
    state: { from: splitPathForRouterState(targetPath) },
  });
  return false;
};
