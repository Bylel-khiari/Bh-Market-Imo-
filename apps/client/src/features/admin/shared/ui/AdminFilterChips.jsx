import React from 'react';

export default function AdminFilterChips({
  ariaLabel,
  className = '',
  onChange,
  options,
  value,
}) {
  return (
    <div className={`admin-filter-chips ${className}`.trim()} aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`admin-filter-chip ${value === option.value ? 'is-active' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
