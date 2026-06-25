const normalizeOrigin = (value) => {
  if (!value) return "";
  return value.replace(/\/+$/, "");
};

const configuredOrigin = normalizeOrigin(import.meta.env.VITE_API_URL);

export const API_ORIGIN = configuredOrigin;
export const API_BASE_URL = import.meta.env.DEV
  ? "/api"
  : configuredOrigin
    ? `${configuredOrigin}/api`
    : "/api";

