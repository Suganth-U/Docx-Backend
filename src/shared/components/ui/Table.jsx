// src/components/ui/table.jsx
import React from 'react';

export const Table = ({ children }) => {
  return <table className="table-auto w-full">{children}</table>;
};

export const TableHeader = ({ children }) => {
  return <thead className="bg-gray-200">{children}</thead>;
};

export const TableRow = ({ children }) => {
  return <tr>{children}</tr>;
};

export const TableCell = ({ children }) => {
  return <td className="px-4 py-2 border">{children}</td>;
};

export const TableBody = ({ children }) => {
  return <tbody>{children}</tbody>;
};

export const TableHead = ({ children }) => {
  return <th className="px-4 py-2 border text-left">{children}</th>;
};
