// src/components/ui/calendar.jsx
import React from 'react';

const Calendar = ({ selected, onSelect }) => {
  const handleDateSelect = (date) => {
    onSelect(date);
  };

  return (
    <div className="calendar">
      <input
        type="date"
        value={selected ? selected.toISOString().split('T')[0] : ''}
        onChange={(e) => handleDateSelect(new Date(e.target.value))}
      />
    </div>
  );
};

export default Calendar;
