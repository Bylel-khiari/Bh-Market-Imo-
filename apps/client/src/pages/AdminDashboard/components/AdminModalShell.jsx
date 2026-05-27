import React from 'react';
import { FaTimes } from 'react-icons/fa';

export default function AdminModalShell({
  children,
  disabled,
  onClose,
  title,
  wide = false,
}) {
  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <aside
        className={`admin-card admin-edit-modal${wide ? ' admin-edit-modal--wide' : ''}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-edit-panel-head">
          <h2>{title}</h2>
          <button
            type="button"
            className="admin-close-btn"
            onClick={onClose}
            disabled={disabled}
            aria-label="Fermer"
          >
            <FaTimes />
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}

export function AdminConfirmModal({
  cancelLabel = 'Annuler',
  children,
  confirmLabel,
  disabled,
  onCancel,
  onConfirm,
  title = 'Confirmer la suppression',
}) {
  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onClick={onCancel}>
      <aside className="admin-card admin-confirm-modal" onClick={(event) => event.stopPropagation()}>
        <h2>{title}</h2>
        <p className="admin-section-help">{children}</p>
        <div className="admin-form-actions">
          <button type="button" className="admin-secondary" onClick={onCancel} disabled={disabled}>
            {cancelLabel}
          </button>
          <button type="button" className="admin-danger" onClick={onConfirm} disabled={disabled}>
            {confirmLabel}
          </button>
        </div>
      </aside>
    </div>
  );
}

export function AdminFieldInput({
  disabled,
  id,
  label,
  name,
  onChange,
  placeholder,
  type = 'text',
  value,
  ...inputProps
}) {
  return (
    <div className="admin-field-block">
      <label className="admin-field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        {...inputProps}
      />
    </div>
  );
}
