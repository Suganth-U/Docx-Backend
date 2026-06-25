const DATE_STYLE_OPTIONS = {
  weekday: new Set(["long", "short", "narrow"]),
  era: new Set(["long", "short", "narrow"]),
  year: new Set(["numeric", "2-digit"]),
  month: new Set(["numeric", "2-digit", "long", "short", "narrow"]),
  day: new Set(["numeric", "2-digit"]),
  hour: new Set(["numeric", "2-digit"]),
  minute: new Set(["numeric", "2-digit"]),
  second: new Set(["numeric", "2-digit"]),
  timeZoneName: new Set(["long", "short", "shortoffset", "longoffset", "shortgeneric", "longgeneric"]),
};

const normalizeDateTimeOptions = (options = {}) =>
  Object.entries(options).reduce((accumulator, [key, value]) => {
    if (typeof value !== "string") {
      accumulator[key] = value;
      return accumulator;
    }

    const allowedValues = DATE_STYLE_OPTIONS[key];
    if (!allowedValues) {
      accumulator[key] = value;
      return accumulator;
    }

    const normalizedValue = value.toLowerCase();
    accumulator[key] = allowedValues.has(normalizedValue) ? normalizedValue : value;
    return accumulator;
  }, {});

const buildDate = (value) => {
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const safeToLocaleDateString = (
  value,
  locale = "en-US",
  options = {},
  fallback = "Pending"
) => {
  const parsed = buildDate(value);
  if (!parsed) return fallback;

  const normalizedOptions = normalizeDateTimeOptions(options);

  try {
    return parsed.toLocaleDateString(locale, normalizedOptions);
  } catch {
    return parsed.toLocaleDateString(locale);
  }
};

export const safeToLocaleString = (
  value,
  locale = "en-US",
  options = {},
  fallback = "Pending"
) => {
  const parsed = buildDate(value);
  if (!parsed) return fallback;

  const normalizedOptions = normalizeDateTimeOptions(options);

  try {
    return parsed.toLocaleString(locale, normalizedOptions);
  } catch {
    return parsed.toLocaleString(locale);
  }
};
