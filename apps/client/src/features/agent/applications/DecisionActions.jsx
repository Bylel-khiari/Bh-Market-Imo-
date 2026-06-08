import React from 'react';
import { FaBan, FaCheckCircle } from 'react-icons/fa';

export default function DecisionActions({
  draft,
  onReviewSubmit,
  processingLocked = false,
  processingLockMessage = '',
  submitting,
}) {
  const isDisabled = submitting || processingLocked;

  return (
    <>
      {processingLockMessage && (
        <p className="agent-processing-wait agent-processing-wait--compact">
          {processingLockMessage}
        </p>
      )}

      <div className="agent-quick-actions">
        <button
          type="button"
          className="admin-secondary"
          onClick={() => onReviewSubmit('EN_VERIFICATION')}
          disabled={isDisabled}
          title={processingLockMessage || undefined}
        >
          Vérifier les documents
        </button>
        <button
          type="button"
          className="admin-secondary"
          onClick={() => onReviewSubmit('DOCUMENTS_MANQUANTS')}
          disabled={isDisabled}
          title={processingLockMessage || undefined}
        >
          Demander les pièces
        </button>
        <button
          type="button"
          className="admin-secondary"
          onClick={() => onReviewSubmit('EN_ETUDE')}
          disabled={isDisabled}
          title={processingLockMessage || undefined}
        >
          Passer en étude
        </button>
        <button
          type="button"
          className="admin-refresh"
          onClick={() => onReviewSubmit('ACCEPTE')}
          disabled={isDisabled}
          title={processingLockMessage || undefined}
        >
          <FaCheckCircle />
          <span>Accepter</span>
        </button>
        <button
          type="button"
          className="admin-danger"
          onClick={() => onReviewSubmit('REFUSE')}
          disabled={isDisabled}
          title={processingLockMessage || undefined}
        >
          <FaBan />
          <span>Refuser</span>
        </button>
      </div>

      <button
        type="button"
        className="admin-refresh agent-save-btn"
        onClick={() => onReviewSubmit(draft.status)}
        disabled={isDisabled}
        title={processingLockMessage || undefined}
      >
        {submitting ? 'Traitement...' : 'Enregistrer les modifications'}
      </button>
    </>
  );
}
