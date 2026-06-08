import React from 'react';

export default function AdminSearchInput({ onChange, placeholder, value }) {
  return (
    <input
      className="admin-search-input"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
