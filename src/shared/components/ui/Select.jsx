// src/components/ui/select.jsx
import React from 'react';

export const Select = ({ options, onChange, value, name, label }) => {
  return (
    <div className="mb-4">
      {label && <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>}
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
      >
        {options.map((option, index) => (
          <option key={index} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export const SelectContent = ({ children }) => (
  <div className="select-content">{children}</div>
);

export const SelectItem = ({ children }) => (
  <div className="select-item">{children}</div>
);

export const SelectTrigger = ({ children }) => (
  <div className="select-trigger">{children}</div>
);

export const SelectValue = ({ value }) => (
  <div className="select-value">{value}</div>
);

