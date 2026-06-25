// src/lib/utils.js

// Example utility function for combining class names
export const cn = (...classes) => {
    return classes.filter(Boolean).join(' ');
  };
  