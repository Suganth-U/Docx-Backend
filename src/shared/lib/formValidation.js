export const isBlank = (value) => !String(value ?? "").trim();

export const isValidEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

export const validateRequiredFields = (values, labels) => {
  const errors = {};

  Object.entries(labels).forEach(([field, label]) => {
    if (isBlank(values[field])) {
      errors[field] = `${label} is required.`;
    }
  });

  return errors;
};

export const clearFieldError = (setErrors, field) => {
  setErrors((current) => {
    if (!current?.[field]) return current;
    const next = { ...current };
    delete next[field];
    return next;
  });
};

export const setServerFieldError = (setErrors, field, message) => {
  setErrors((current) => ({
    ...current,
    [field]: message,
  }));
};
