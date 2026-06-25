// src/components/ui/input.jsx
import React from 'react';

const Input = ({ value, onChange, type = "text", placeholder = "" }) => {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="px-4 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500"
    />
  );
};

export default Input;
