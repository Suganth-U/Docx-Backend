const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

export const trimValue = (value = "") => String(value || "").trim();

export const getRequiredError = (value, label) => {
  if (trimValue(value)) return "";
  return `${label} is required.`;
};

export const getEmailError = (value, label = "Email address") => {
  const email = trimValue(value);

  if (!email) return `${label} is required.`;
  if (!EMAIL_PATTERN.test(email)) return `Enter a valid ${label.toLowerCase()}, like name@example.com.`;

  return "";
};

export const getPasswordError = (value, options = {}) => {
  const password = String(value || "");
  const label = options.label || "Password";
  const requireStrong = Boolean(options.requireStrong);

  if (!password) return `${label} is required.`;
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `${label} must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (requireStrong && !/[A-Z]/.test(password)) {
    return `${label} must include at least one uppercase letter.`;
  }
  if (requireStrong && !/[0-9]/.test(password)) {
    return `${label} must include at least one number.`;
  }
  if (requireStrong && !/[^A-Za-z0-9]/.test(password)) {
    return `${label} must include at least one symbol.`;
  }

  return "";
};

export const getPasswordMatchError = (password, confirmPassword) => {
  if (!confirmPassword) return "Confirm password is required.";
  if (password !== confirmPassword) return "Passwords do not match. Type the same password again.";
  return "";
};

export const getPositiveNumberError = (value, label) => {
  if (value === undefined || value === null || trimValue(value) === "") {
    return `${label} is required.`;
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return `${label} must be a valid number.`;
  }

  return "";
};

export const getFriendlyAuthError = (error, fallback = "Something went wrong. Please try again.") => {
  const rawMessage = error?.response?.data?.message || error?.message || fallback;
  const message = String(rawMessage || "").trim();

  if (/user already exists/i.test(message) || /duplicate key/i.test(message)) {
    return "An account already exists with this email. Try logging in instead.";
  }

  if (/network error/i.test(message)) {
    return "We could not reach DocX right now. Check your connection and try again.";
  }

  return message || fallback;
};
