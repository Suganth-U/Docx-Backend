import React from "react";

const baseStyle = {
  display: "block",
  margin: "2px 0 0",
  color: "#dc2626",
  fontSize: "0.78rem",
  fontWeight: 600,
  lineHeight: 1.4,
  textTransform: "none",
  letterSpacing: 0,
};

const FieldError = ({ id, message, className = "", style }) => {
  if (!message) return null;

  return (
    <span
      id={id}
      className={["field-error", className].filter(Boolean).join(" ")}
      role="alert"
      style={{ ...baseStyle, ...style }}
    >
      {message}
    </span>
  );
};

export default FieldError;
