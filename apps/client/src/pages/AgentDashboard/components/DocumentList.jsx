import React from 'react';
import { FaDownload } from 'react-icons/fa';

export default function DocumentList({
  documents,
  openingDocumentKey,
  onOpenApplicationDocument,
  selectedApplication,
}) {
  if (!documents.length) {
    return <p className="admin-section-help">Aucun document n’a été déclaré dans le portail.</p>;
  }

  return (
    <div className="agent-document-list">
      {documents.map((document) => {
        const documentKey = `${selectedApplication.id}-${document.index}`;
        const isOpening = openingDocumentKey === documentKey;

        return document.hasFile ? (
          <button
            key={document.key}
            type="button"
            className="agent-document-pill agent-document-pill--action"
            onClick={() => onOpenApplicationDocument(document)}
            disabled={isOpening}
            title="Consulter le document"
          >
            <FaDownload />
            <span className="agent-document-pill-text">
              <strong>{document.label}</strong>
              <small>{isOpening ? 'Ouverture...' : document.name}</small>
            </span>
          </button>
        ) : (
          <span
            key={document.key}
            className="agent-document-pill agent-document-pill--unavailable"
            title="Fichier non disponible pour les anciens dossiers."
          >
            <span className="agent-document-pill-text">
              <strong>{document.label}</strong>
              <small>{document.name}</small>
            </span>
          </span>
        );
      })}
    </div>
  );
}
