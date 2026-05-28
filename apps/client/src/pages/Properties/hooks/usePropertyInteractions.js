import { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { addFavoriteApi, removeFavoriteApi, submitPropertyReportApi } from '../../../lib/auth';

export default function usePropertyInteractions({
  authSession,
  currentUserRole,
  favoriteIdSet,
  setFavoriteError,
  setFavoriteIds,
  setFavoriteNotice,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [favoritePendingId, setFavoritePendingId] = useState(null);
  const [reportModalProperty, setReportModalProperty] = useState(null);
  const [reportCategory, setReportCategory] = useState('cannot_open_site');
  const [reportMessage, setReportMessage] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reportNotice, setReportNotice] = useState('');

  const toggleFavorite = useCallback(async (event, property) => {
    event.stopPropagation();
    setFavoriteError('');
    setFavoriteNotice('');

    if (!authSession?.token) {
      navigate('/login', { state: { from: `/properties${location.search}` } });
      return;
    }

    if (currentUserRole !== 'client') {
      setFavoriteError('Les favoris sont disponibles uniquement pour les comptes client.');
      return;
    }

    const propertyId = String(property.id);
    const isFavorite = favoriteIdSet.has(propertyId);
    setFavoritePendingId(propertyId);

    setFavoriteIds((prev) => {
      if (isFavorite) {
        return prev.filter((id) => String(id) !== propertyId);
      }

      return prev.some((id) => String(id) === propertyId) ? prev : [...prev, propertyId];
    });

    try {
      if (isFavorite) {
        await removeFavoriteApi(property.id, authSession.token);
      } else {
        await addFavoriteApi(property.id, authSession.token);
      }

      setFavoriteNotice(
        isFavorite
          ? 'Le bien a été retiré de vos favoris.'
          : 'Le bien a été ajouté à vos favoris.',
      );
    } catch (err) {
      console.error('Impossible de mettre à jour le favori :', err);

      setFavoriteIds((prev) => {
        if (isFavorite) {
          return prev.some((id) => String(id) === propertyId) ? prev : [...prev, propertyId];
        }

        return prev.filter((id) => String(id) !== propertyId);
      });

      setFavoriteError(err.message || 'Impossible de mettre à jour ce favori.');
    } finally {
      setFavoritePendingId(null);
    }
  }, [
    authSession,
    currentUserRole,
    favoriteIdSet,
    location.search,
    navigate,
    setFavoriteError,
    setFavoriteIds,
    setFavoriteNotice,
  ]);

  const openReportModal = useCallback((property, event) => {
    if (event) {
      event.stopPropagation();
    }

    setReportError('');
    setReportNotice('');

    if (!authSession?.token) {
      navigate('/login', { state: { from: `/properties${location.search}` } });
      return;
    }

    if (currentUserRole !== 'client') {
      setReportError('Le signalement est disponible uniquement pour les comptes client.');
      return;
    }

    setReportCategory('cannot_open_site');
    setReportMessage('');
    setReportModalProperty(property);
  }, [authSession, currentUserRole, location.search, navigate]);

  const closeReportModal = useCallback(() => {
    if (reportSubmitting) return;
    setReportModalProperty(null);
  }, [reportSubmitting]);

  const submitReport = useCallback(async (event) => {
    event.preventDefault();
    if (!reportModalProperty) return;

    const trimmedMessage = reportMessage.trim();
    if (trimmedMessage.length < 6) {
      setReportError('Veuillez décrire le problème avec au moins 6 caractères.');
      return;
    }

    try {
      setReportSubmitting(true);
      setReportError('');

      await submitPropertyReportApi(
        reportModalProperty.id,
        {
          category: reportCategory,
          message: trimmedMessage,
        },
        authSession.token,
      );

      setReportNotice('Votre signalement a été envoyé à l’équipe admin.');
      setReportModalProperty(null);
      setReportMessage('');
      setReportCategory('cannot_open_site');
    } catch (err) {
      console.error('Impossible d’envoyer le signalement :', err);
      setReportError(err.message || 'Impossible d’envoyer le signalement.');
    } finally {
      setReportSubmitting(false);
    }
  }, [authSession, reportCategory, reportMessage, reportModalProperty]);

  return {
    closeReportModal,
    favoritePendingId,
    openReportModal,
    reportCategory,
    reportError,
    reportMessage,
    reportModalProperty,
    reportNotice,
    reportSubmitting,
    setReportCategory,
    setReportMessage,
    submitReport,
    toggleFavorite,
  };
}
