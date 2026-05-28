import { useEffect, useMemo, useState } from 'react';
import {
  fetchAgentCreditApplicationDocumentApi,
  requireAuthToken,
  scoreAgentCreditApplicationApi,
  updateAgentCreditApplicationApi,
} from '../../../lib/auth';
import { getApplicationDocuments } from '../utils/agentFormatters';

export default function useAgentApplicationReview({
  applications,
  handleAuthFailure,
  loadApplicationQueue,
  setError,
}) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedApplicationId, setSelectedApplicationId] = useState(null);
  const [activeApplicationPanel, setActiveApplicationPanel] = useState('summary');
  const [draft, setDraft] = useState({
    status: 'SOUMIS',
    compliance_score: '',
    compliance_summary: '',
    agent_note: '',
  });
  const [formMessage, setFormMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [openingDocumentKey, setOpeningDocumentKey] = useState('');

  useEffect(() => {
    if (!applications.length) {
      setSelectedApplicationId(null);
      return;
    }

    const exists = applications.some((application) => String(application.id) === String(selectedApplicationId));

    if (!exists) {
      setSelectedApplicationId(applications[0].id);
    }
  }, [applications, selectedApplicationId]);

  const selectedApplication = useMemo(() => {
    if (!applications.length) return null;
    return (
      applications.find((application) => String(application.id) === String(selectedApplicationId)) ||
      applications[0]
    );
  }, [applications, selectedApplicationId]);

  const selectedApplicationDocuments = useMemo(
    () => getApplicationDocuments(selectedApplication),
    [selectedApplication],
  );

  useEffect(() => {
    setActiveApplicationPanel('summary');
  }, [selectedApplication?.id]);

  useEffect(() => {
    if (!selectedApplication) {
      return;
    }

    setDraft({
      status: selectedApplication.status || 'SOUMIS',
      compliance_score:
        selectedApplication.compliance_score === null || selectedApplication.compliance_score === undefined
          ? ''
          : String(selectedApplication.compliance_score),
      compliance_summary: selectedApplication.compliance_summary || '',
      agent_note: selectedApplication.agent_note || '',
    });
    setFormMessage('');
  }, [selectedApplication]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    loadApplicationQueue({ status: statusFilter, searchTerm: search.trim() });
  };

  const handleFilterChange = (nextStatus) => {
    setStatusFilter(nextStatus);
    loadApplicationQueue({ status: nextStatus, searchTerm: search.trim() });
  };

  const handleDraftChange = (event) => {
    const { name, value } = event.target;
    setDraft((prev) => ({ ...prev, [name]: value }));
  };

  const handleReviewSubmit = async (nextStatus = draft.status) => {
    if (!selectedApplication) {
      return;
    }

    try {
      const token = requireAuthToken();
      setSubmitting(true);
      setError('');
      setFormMessage('');

      await updateAgentCreditApplicationApi(
        selectedApplication.id,
        {
          status: nextStatus,
          compliance_score: draft.compliance_score === '' ? null : Number(draft.compliance_score),
          compliance_summary: draft.compliance_summary.trim() || null,
          agent_note: draft.agent_note.trim() || null,
        },
        token,
      );

      setFormMessage('Dossier mis à jour avec succès.');
      await loadApplicationQueue({ status: statusFilter, searchTerm: search.trim(), silent: true });
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setFormMessage('');
      setError(requestError.message || 'Impossible de mettre à jour ce dossier.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleScoringSubmit = async () => {
    if (!selectedApplication) {
      return;
    }

    try {
      const token = requireAuthToken();
      setSubmitting(true);
      setError('');
      setFormMessage('');

      await scoreAgentCreditApplicationApi(selectedApplication.id, token);

      setFormMessage("Score calculé. L'agent bancaire garde la décision finale.");
      await loadApplicationQueue({ status: statusFilter, searchTerm: search.trim(), silent: true });
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setFormMessage('');
      setError(requestError.message || "Impossible de calculer le score de ce dossier.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenApplicationDocument = async (document) => {
    if (!selectedApplication || !document?.hasFile) {
      return;
    }

    const documentWindow = window.open('about:blank', '_blank');
    if (documentWindow) {
      documentWindow.opener = null;
      documentWindow.document.title = 'Chargement du document';
      documentWindow.document.body.innerHTML = '<p style="font-family: sans-serif;">Chargement du document...</p>';
    }
    const documentKey = `${selectedApplication.id}-${document.index}`;

    try {
      const token = requireAuthToken();
      setOpeningDocumentKey(documentKey);
      setError('');

      const { blob } = await fetchAgentCreditApplicationDocumentApi(
        selectedApplication.id,
        document.index,
        token,
      );
      const objectUrl = URL.createObjectURL(blob);

      if (documentWindow) {
        documentWindow.location.href = objectUrl;
      } else {
        window.open(objectUrl, '_blank', 'noopener,noreferrer');
      }

      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } catch (requestError) {
      if (documentWindow) {
        documentWindow.close();
      }

      if (handleAuthFailure(requestError)) {
        return;
      }

      setError(requestError.message || 'Impossible d ouvrir ce document.');
    } finally {
      setOpeningDocumentKey('');
    }
  };

  return {
    activeApplicationPanel,
    draft,
    formMessage,
    handleDraftChange,
    handleFilterChange,
    handleOpenApplicationDocument,
    handleReviewSubmit,
    handleScoringSubmit,
    handleSearchSubmit,
    openingDocumentKey,
    search,
    selectedApplication,
    selectedApplicationDocuments,
    selectedApplicationId,
    setActiveApplicationPanel,
    setSearch,
    setSelectedApplicationId,
    statusFilter,
    submitting,
  };
}
