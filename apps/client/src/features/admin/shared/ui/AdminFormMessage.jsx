import React from 'react';

export default function AdminFormMessage({ children, tone = 'default' }) {
  if (!children) {
    return null;
  }

  const isError = tone === 'error' || String(children).toLowerCase().includes('erreur');
  const className = `admin-form-message ${isError ? 'admin-form-message--error' : ''}`.trim();

  return <p className={className}>{children}</p>;
}
