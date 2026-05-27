import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchAdminScraperControlApi,
  requireAuthToken,
  startAdminListingCleanerApi,
  startAdminScraperApi,
  stopAdminScraperApi,
  updateAdminScraperControlApi,
} from '../../../lib/auth';
import {
  daysToYearsInput,
  formatDuration,
  formatScraperRunType,
  formatScraperStatus,
  yearsToDays,
} from '../utils/adminFormatters';

export default function useAdminScraperControl({ activeSection, handleAuthFailure }) {
  const [scraperControl, setScraperControl] = useState(null);
  const [scraperControlLoading, setScraperControlLoading] = useState(true);
  const [scraperControlError, setScraperControlError] = useState('');
  const [scraperControlMessage, setScraperControlMessage] = useState('');
  const [scraperSubmitting, setScraperSubmitting] = useState(false);
  const [scraperIntervalDays, setScraperIntervalDays] = useState('7');
  const [scraperMaxListingAgeYears, setScraperMaxListingAgeYears] = useState('3');
  const [scraperIntervalDirty, setScraperIntervalDirty] = useState(false);
  const scraperIntervalDirtyRef = useRef(false);

  const fetchScraperControl = useCallback(async ({ silent = false } = {}) => {
    try {
      const token = requireAuthToken();

      if (!silent) {
        setScraperControlLoading(true);
      }

      setScraperControlError('');
      const payload = await fetchAdminScraperControlApi(token);
      const nextControl = payload?.control || null;

      setScraperControl(nextControl);

      if (nextControl?.interval_days && !scraperIntervalDirtyRef.current) {
        setScraperIntervalDays(String(nextControl.interval_days));
      }
      if (nextControl?.max_listing_age_days && !scraperIntervalDirtyRef.current) {
        setScraperMaxListingAgeYears(daysToYearsInput(nextControl.max_listing_age_days));
      }
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setScraperControlError(requestError.message || 'Erreur de chargement du contrÃƒÂ´le du scraper.');
    } finally {
      if (!silent) {
        setScraperControlLoading(false);
      }
    }
  }, [handleAuthFailure]);

  const syncScraperControlState = (control, message = '') => {
    setScraperControl(control || null);

    if (control?.interval_days) {
      setScraperIntervalDays(String(control.interval_days));
    }

    if (control?.max_listing_age_days) {
      setScraperMaxListingAgeYears(daysToYearsInput(control.max_listing_age_days));
    }

    scraperIntervalDirtyRef.current = false;
    setScraperIntervalDirty(false);
    setScraperControlMessage(message);
  };

  const readScraperIntervalDays = () => {
    const value = Number(scraperIntervalDays);

    if (!Number.isInteger(value) || value < 1 || value > 365) {
      setScraperControlMessage('');
      setScraperControlError('Choisissez un intervalle valide entre 1 et 365 jours.');
      return null;
    }

    return value;
  };

  const readScraperMaxListingAgeDays = () => {
    const value = yearsToDays(scraperMaxListingAgeYears);

    if (!value || value < 365 || value > 365 * 20) {
      setScraperControlMessage('');
      setScraperControlError('Choisissez un age maximum valide entre 1 et 20 ans.');
      return null;
    }

    return value;
  };

  const handleScraperIntervalChange = (event) => {
    setScraperIntervalDays(event.target.value);
    setScraperControlError('');
    scraperIntervalDirtyRef.current = true;
    setScraperIntervalDirty(true);
  };

  const handleScraperMaxListingAgeChange = (event) => {
    setScraperMaxListingAgeYears(event.target.value);
    setScraperControlError('');
    scraperIntervalDirtyRef.current = true;
    setScraperIntervalDirty(true);
  };

  const handleSaveScraperConfig = async () => {
    const intervalDays = readScraperIntervalDays();
    if (!intervalDays) return;
    const maxListingAgeDays = readScraperMaxListingAgeDays();
    if (!maxListingAgeDays) return;

    try {
      const token = requireAuthToken();
      setScraperSubmitting(true);
      setScraperControlError('');
      setScraperControlMessage('');

      const payload = await updateAdminScraperControlApi(
        {
          interval_days: intervalDays,
          max_listing_age_days: maxListingAgeDays,
        },
        token,
      );

      syncScraperControlState(
        payload?.control || scraperControl,
        'Configuration du scraping mise a jour.',
      );
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setScraperControlError(requestError.message || 'Erreur pendant la mise ÃƒÂ  jour du scraper.');
    } finally {
      setScraperSubmitting(false);
    }
  };

  const handleStartScraper = async () => {
    const intervalDays = readScraperIntervalDays();
    if (!intervalDays) return;
    const maxListingAgeDays = readScraperMaxListingAgeDays();
    if (!maxListingAgeDays) return;

    try {
      const token = requireAuthToken();
      setScraperSubmitting(true);
      setScraperControlError('');
      setScraperControlMessage('');

      const payload = await startAdminScraperApi(
        {
          interval_days: intervalDays,
          max_listing_age_days: maxListingAgeDays,
        },
        token,
      );

      syncScraperControlState(
        payload?.control || scraperControl,
        'Cycle de scraping dÃƒÂ©marrÃƒÂ©. Les prochains rescrapes suivront cet intervalle.',
      );
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setScraperControlError(requestError.message || 'Erreur pendant le dÃƒÂ©marrage du scraper.');
    } finally {
      setScraperSubmitting(false);
    }
  };

  const handleStartListingCleaner = async () => {
    try {
      const token = requireAuthToken();
      setScraperSubmitting(true);
      setScraperControlError('');
      setScraperControlMessage('');

      const payload = await startAdminListingCleanerApi(token);

      syncScraperControlState(
        payload?.control || scraperControl,
        'Agent de filtrage dÃƒÂ©marrÃƒÂ©. Les annonces nettoyÃƒÂ©es seront synchronisÃƒÂ©es aprÃƒÂ¨s le filtrage.',
      );
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setScraperControlError(requestError.message || 'Erreur pendant le dÃƒÂ©marrage de lÃ¢â‚¬â„¢agent.');
    } finally {
      setScraperSubmitting(false);
    }
  };

  const handleStopScraper = async () => {
    try {
      const token = requireAuthToken();
      setScraperSubmitting(true);
      setScraperControlError('');
      setScraperControlMessage('');

      const payload = await stopAdminScraperApi(token);

      syncScraperControlState(
        payload?.control || scraperControl,
        'Le scraping automatique a ÃƒÂ©tÃƒÂ© arrÃƒÂªtÃƒÂ©.',
      );
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setScraperControlError(requestError.message || 'Erreur pendant lÃ¢â‚¬â„¢arrÃƒÂªt du scraper.');
    } finally {
      setScraperSubmitting(false);
    }
  };

  useEffect(() => {
    fetchScraperControl();
  }, [fetchScraperControl]);

  useEffect(() => {
    const shouldPollScraper =
      activeSection === 'sites' || Boolean(scraperControl?.is_enabled) || Boolean(scraperControl?.is_running);

    if (!shouldPollScraper) {
      return undefined;
    }

    const pollDelayMs =
      scraperControl?.status === 'running' || scraperControl?.status === 'stopping' || scraperControl?.is_running
        ? 3000
        : activeSection === 'sites'
          ? 10000
          : 15000;

    const intervalId = setInterval(() => {
      fetchScraperControl({ silent: true });
    }, pollDelayMs);

    return () => clearInterval(intervalId);
  }, [activeSection, fetchScraperControl, scraperControl?.is_enabled, scraperControl?.is_running, scraperControl?.status]);

  const scraperIsRunning = Boolean(scraperControl?.is_running) || scraperControl?.status === 'running';
  const scraperIsEnabled = Boolean(scraperControl?.is_enabled);
  const scraperStatusLabel = formatScraperStatus(scraperControl);
  const scraperCurrentCommandLabel =
    scraperControl?.current_command ||
    (scraperControl?.current_spider_name
      ? `Execution du spider ${scraperControl.current_spider_name}`
      : scraperIsRunning
        ? 'Execution en cours.'
        : 'Aucune commande en cours.');
  const scraperStatusClassName =
    scraperControl?.status === 'running'
      ? 'is-running'
      : scraperControl?.status === 'stopping'
        ? 'is-stopping'
        : scraperControl?.status === 'error'
          ? 'is-error'
          : scraperIsEnabled
            ? 'is-scheduled'
            : 'is-idle';
  const scraperProgressPercent = Math.min(100, Math.max(0, Number(scraperControl?.progress_percent || 0)));
  const scraperProgressSteps =
    Number(scraperControl?.progress_total || 0) > 0
      ? `${Number(scraperControl?.progress_current || 0)} / ${Number(scraperControl?.progress_total || 0)} etapes`
      : 'En attente';
  const scraperEtaLabel = scraperIsRunning
    ? formatDuration(scraperControl?.estimated_remaining_seconds)
    : scraperControl?.last_finished_at
      ? 'Termine'
      : 'Aucun cycle';
  const scraperRunTypeLabel = formatScraperRunType(scraperControl?.run_type);
  const scraperRecentLog = String(scraperControl?.recent_log || '').trim();

  return {
    fetchScraperControl,
    handleSaveScraperConfig,
    handleScraperIntervalChange,
    handleScraperMaxListingAgeChange,
    handleStartListingCleaner,
    handleStartScraper,
    handleStopScraper,
    scraperControl,
    scraperControlError,
    scraperControlLoading,
    scraperControlMessage,
    scraperCurrentCommandLabel,
    scraperEtaLabel,
    scraperIntervalDays,
    scraperIntervalDirty,
    scraperIsEnabled,
    scraperIsRunning,
    scraperMaxListingAgeYears,
    scraperProgressPercent,
    scraperProgressSteps,
    scraperRecentLog,
    scraperRunTypeLabel,
    scraperStatusClassName,
    scraperStatusLabel,
    scraperSubmitting,
  };
}
