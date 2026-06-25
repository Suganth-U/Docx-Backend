import React from "react";

export const Dialog = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-500 bg-opacity-75 z-50">
      <div className="bg-white p-4 rounded shadow-lg w-1/3">
        <div className="mb-4">{children}</div>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export const DialogContent = ({ children }) => <div>{children}</div>;
export const DialogDescription = ({ children }) => <p>{children}</p>;
export const DialogFooter = ({ children }) => <div>{children}</div>;
export const DialogHeader = ({ children }) => <div>{children}</div>;
export const DialogTitle = ({ children }) => <h3>{children}</h3>;
export const DialogTrigger = ({ children, onClick }) => (
  <button onClick={onClick}>{children}</button>
);
