import React from 'react';
import { FaBan, FaCheckCircle } from 'react-icons/fa';

export default function DecisionActions({ draft, onReviewSubmit, submitting }) {
  return (
    <>
      <div className="agent-quick-actions">
        <button
          type="button"
          className="admin-secondary"
          onClick={() => onReviewSubmit('EN_VERIFICATION')}
          disabled={submitting}
        >
          VÃƒÂ©rifier les documents
        </button>
        <button
          type="button"
          className="admin-secondary"
          onClick={() => onReviewSubmit('DOCUMENTS_MANQUANTS')}
          disabled={submitting}
        >
          Demander les piÃƒÂ¨ces
        </button>
        <button
          type="button"
          className="admin-secondary"
          onClick={() => onReviewSubmit('EN_ETUDE')}
          disabled={submitting}
        >
          Passer en ÃƒÂ©tude
        </button>
        <button
          type="button"
          className="admin-refresh"
          onClick={() => onReviewSubmit('ACCEPTE')}
          disabled={submitting}
        >
          <FaCheckCircle />
          <span>Accepter</span>
        </button>
        <button
          type="button"
          className="admin-danger"
          onClick={() => onReviewSubmit('REFUSE')}
          disabled={submitting}
        >
          <FaBan />
          <span>Refuser</span>
        </button>
      </div>

      <button
        type="button"
        className="admin-refresh agent-save-btn"
        onClick={() => onReviewSubmit(draft.status)}
        disabled={submitting}
      >
        {submitting ? 'Traitement...' : 'Enregistrer les modifications'}
      </button>
    </>
  );
}
