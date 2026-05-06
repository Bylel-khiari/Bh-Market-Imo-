import React from 'react';
import {
  FaCheckCircle,
  FaClock,
  FaCog,
  FaExclamationTriangle,
  FaGlobe,
  FaPlay,
  FaStop,
  FaSyncAlt,
  FaTerminal,
  FaUserTie,
} from 'react-icons/fa';

export default function AdminScraperControlSection({
  scraperControl,
  scraperControlLoading,
  scraperControlError,
  scraperControlMessage,
  scraperSubmitting,
  scraperIntervalDays,
  scraperIntervalDirty,
  scraperStatusClassName,
  scraperStatusLabel,
  scraperIsRunning,
  scraperIsEnabled,
  scraperProgressPercent,
  scraperProgressSteps,
  scraperRunTypeLabel,
  scraperEtaLabel,
  scraperCurrentCommandLabel,
  scraperRecentLog,
  siteTotals,
  handleScraperIntervalChange,
  handleSaveScraperConfig,
  handleStartScraper,
  handleStartListingCleaner,
  handleStopScraper,
  fetchScraperControl,
  formatDateTime,
  formatDuration,
  formatScraperRunType,
}) {
  return (
    <div className="admin-card admin-scraper-control-card">
      <div className="admin-scraper-control-head">
        <div className="admin-scraper-title-block">
          <span className="admin-scraper-kicker">Mission de contrôle</span>
          <h2>Automatisation du scraping</h2>
          <p className="admin-section-help">
            Démarrer lance un cycle de collecte complet. L’agent de filtrage exécute uniquement
            le nettoyage des annonces déjà collectées puis synchronise les biens visibles.
          </p>
        </div>
        <div className="admin-scraper-top-meta">
          <span className={`admin-scraper-badge ${scraperStatusClassName}`}>
            {scraperStatusLabel}
          </span>
          <span className="admin-scraper-sites-pill">
            Sites actifs {siteTotals.active} / {siteTotals.total}
          </span>
        </div>
      </div>

      {scraperControlMessage && (
        <p
          className={`admin-form-message ${scraperControlMessage.toLowerCase().includes('erreur') ? 'admin-form-message--error' : ''}`}
        >
          {scraperControlMessage}
        </p>
      )}
      {scraperControlError && (
        <p className="admin-form-message admin-form-message--error">{scraperControlError}</p>
      )}

      {scraperControlLoading ? (
        <div className="admin-state admin-state--inline">
          <FaSyncAlt className="spin" />
              <p>Chargement du contrôle du scraper...</p>
        </div>
      ) : (
        <>
          <div className="admin-scraper-control-grid">
            <div className="admin-scraper-main">
              <div className="admin-scraper-main-panel">
                <div className="admin-scraper-mini-grid">
                  <div className="admin-scraper-mini-card">
                    <span>Cadence actuelle</span>
                    <strong>{scraperControl?.interval_days || Number(scraperIntervalDays) || 0} jours</strong>
                  </div>
                  <div className="admin-scraper-mini-card">
                    <span>Mode</span>
                    <strong>{scraperIsRunning ? 'Cycle en direct' : scraperIsEnabled ? 'Planifié' : 'Arrêté'}</strong>
                  </div>
                  <div className="admin-scraper-mini-card">
                    <span>Exécution courante</span>
                    <strong>{scraperRunTypeLabel}</strong>
                  </div>
                  <div className="admin-scraper-mini-card">
                    <span>Temps restant</span>
                    <strong>{scraperEtaLabel}</strong>
                  </div>
                </div>

                <div className="admin-scraper-progress-panel">
                  <div className="admin-scraper-progress-head">
                    <span>Progression</span>
                    <strong>{Math.round(scraperProgressPercent)}%</strong>
                  </div>
                  <div
                    className="admin-scraper-progress-track"
                    role="progressbar"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-valuenow={Math.round(scraperProgressPercent)}
                  >
                    <span style={{ width: `${scraperProgressPercent}%` }} />
                  </div>
                  <small>{scraperProgressSteps}</small>
                </div>

                <div className="admin-scraper-form-shell">
                  <div className="admin-field-block">
                    <label className="admin-field-label" htmlFor="scraper-interval-days">
                      Intervalle de rescrape automatique
                    </label>
                    <p className="admin-scraper-field-help">
                      Définissez dans combien de jours le prochain cycle doit être relancé automatiquement.
                    </p>
                    <div className="admin-inline-control">
                      <input
                        id="scraper-interval-days"
                        type="number"
                        min="1"
                        max="365"
                        step="1"
                        value={scraperIntervalDays}
                        onChange={handleScraperIntervalChange}
                        disabled={scraperSubmitting}
                      />
                      <span className="admin-inline-suffix">jours</span>
                      <button
                        type="button"
                        className="admin-secondary admin-scraper-btn admin-scraper-btn--save"
                        onClick={handleSaveScraperConfig}
                        disabled={scraperSubmitting || !scraperIntervalDirty}
                      >
                        Enregistrer
                      </button>
                    </div>
                  </div>

                  <div className="admin-form-actions admin-scraper-actions">
                    <button
                      type="button"
                      className="admin-refresh admin-scraper-btn admin-scraper-btn--start"
                      onClick={handleStartScraper}
                      disabled={scraperSubmitting || scraperIsRunning}
                    >
                      <FaPlay />
                      {scraperIsEnabled ? 'Relancer maintenant' : 'Démarrer'}
                    </button>
                    <button
                      type="button"
                      className="admin-secondary admin-scraper-btn admin-scraper-btn--agent"
                      onClick={handleStartListingCleaner}
                      disabled={scraperSubmitting || scraperIsRunning}
                    >
                      <FaUserTie />
                      Agent de filtrage
                    </button>
                    <button
                      type="button"
                      className="admin-danger admin-scraper-btn admin-scraper-btn--stop"
                      onClick={handleStopScraper}
                      disabled={scraperSubmitting || (!scraperIsEnabled && !scraperIsRunning)}
                    >
                      <FaStop />
                      Arrêter
                    </button>
                    <button
                      type="button"
                      className="admin-secondary admin-scraper-btn admin-scraper-btn--refresh"
                      onClick={() => fetchScraperControl()}
                      disabled={scraperSubmitting || scraperControlLoading}
                    >
                      <FaSyncAlt />
                      Actualiser
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="admin-scraper-stats">
              <ScraperStat icon={<FaCog />} label="État courant" value={scraperStatusLabel} detail={scraperControl?.current_step || 'Aucun cycle actif.'} />
              <ScraperStat icon={<FaGlobe />} label="Robot courant" value={scraperControl?.current_spider_name || '-'} detail={scraperCurrentCommandLabel} />
              <ScraperStat icon={<FaClock />} label="Temps estimé" value={scraperEtaLabel} detail={`Progression : ${Math.round(scraperProgressPercent)}% (${scraperProgressSteps})`} />
              <ScraperStat icon={<FaCheckCircle />} label="Dernier succès" value={formatDateTime(scraperControl?.last_success_at)} detail={`Dernier lancement : ${formatDateTime(scraperControl?.last_started_at)}`} />
              <ScraperStat icon={<FaSyncAlt />} label="Prochaine collecte" value={scraperIsEnabled ? formatDateTime(scraperControl?.next_run_at) : 'Désactivé'} detail={`Sites actifs : ${siteTotals.active} / ${siteTotals.total}`} />
            </div>
          </div>

          {scraperControl?.last_error && (
            <div className="admin-scraper-alert">
              <div className="admin-scraper-alert-icon">
                <FaExclamationTriangle />
              </div>
              <div>
                <strong>Dernière erreur détectée</strong>
                <p>{scraperControl.last_error}</p>
              </div>
            </div>
          )}

          <div className="admin-scraper-log-panel">
            <div className="admin-scraper-log-head">
              <h3>
                <FaTerminal /> Journaux de collecte et agent
              </h3>
              <span>{scraperIsRunning ? 'Suivi en direct' : 'Dernière exécution'}</span>
            </div>
            {scraperRecentLog ? (
              <pre>{scraperRecentLog}</pre>
            ) : (
              <p className="empty">Aucun log disponible pour le moment.</p>
            )}
          </div>

          <div className="admin-scraper-history-grid">
            <RunHistoryPanel
              title="Historique des exécutions"
              count={scraperControl?.recent_runs?.length || 0}
              rows={scraperControl?.recent_runs || []}
              emptyLabel="Aucun historique disponible."
              getTitle={(run) => formatScraperRunType(run.run_type)}
              getDate={(run) => formatDateTime(run.started_at)}
              getDuration={(run) => formatDuration(run.duration_seconds)}
            />
            <RunHistoryPanel
              title="Métriques par robot"
              count={scraperControl?.spider_metrics?.length || 0}
              rows={scraperControl?.spider_metrics || []}
              emptyLabel="Aucune métrique spider disponible."
              getTitle={(metric) => metric.site_name || metric.spider_name}
              getDate={(metric) => formatDateTime(metric.started_at)}
              getDuration={(metric) => formatDuration(metric.duration_seconds)}
            />
          </div>
        </>
      )}
    </div>
  );
}

function ScraperStat({ icon, label, value, detail }) {
  return (
    <div className="admin-scraper-stat">
      <div className="admin-scraper-stat-head">
        <span className="admin-scraper-stat-icon">{icon}</span>
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function formatRunStatus(status) {
  switch (status) {
    case 'running':
      return 'En cours';
    case 'success':
      return 'Réussi';
    case 'error':
      return 'Erreur';
    case 'stopped':
      return 'Arrêté';
    default:
      return status || 'Inconnu';
  }
}

function RunHistoryPanel({ title, count, rows, emptyLabel, getTitle, getDate, getDuration }) {
  return (
    <div className="admin-scraper-log-panel">
      <div className="admin-scraper-log-head">
        <h3>{title}</h3>
        <span>{count}</span>
      </div>
      {rows.length ? (
        <div className="admin-run-history-list">
          {rows.map((row) => (
            <div key={row.id} className={`admin-run-history-row status-${row.status}`}>
              <span>{getTitle(row)}</span>
              <strong>{formatRunStatus(row.status)}</strong>
              <small>{getDate(row)}</small>
              <small>{getDuration(row)}</small>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty">{emptyLabel}</p>
      )}
    </div>
  );
}
