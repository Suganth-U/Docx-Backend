// src/components/ui/button.jsx
import React from 'react';

const Button = ({ children, onClick, variant = 'default' }) => {
  return (
    <button
      onClick={onClick}
      className={`btn ${variant === 'outline' ? 'btn-outline' : ''}`}
    >
      {children}
    </button>
  );
};

export default Button;
