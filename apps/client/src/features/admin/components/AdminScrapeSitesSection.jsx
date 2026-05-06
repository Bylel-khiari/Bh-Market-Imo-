import React from 'react';
import { FaBan, FaCheckCircle, FaPlus, FaSyncAlt } from 'react-icons/fa';

export default function AdminScrapeSitesSection({
  statusFilterOptions,
  filteredSites,
  siteSearch,
  setSiteSearch,
  siteStatusFilter,
  setSiteStatusFilter,
  siteFormMessage,
  siteError,
  siteLoading,
  siteSubmitting,
  editingSiteId,
  openCreateSitePanel,
  handleToggleSiteStatus,
  startEditSite,
  requestDeleteSite,
  formatDate,
}) {
  return (
    <div className="admin-card admin-sites-card">
      <div className="admin-users-header">
        <h2>Sites de collecte</h2>
        <div className="admin-users-header-actions">
          <span className="admin-users-count">{filteredSites.length}</span>
          <button type="button" className="admin-refresh" onClick={openCreateSitePanel}>
            <FaPlus /> Nouveau site
          </button>
        </div>
      </div>

      <p className="admin-section-help">
        Ajoutez, modifiez, supprimez ou activez/désactivez les sites de collecte.
        L’identifiant technique doit correspondre au spider Scrapy pour piloter les prochains lancements.
      </p>

      <div className="admin-users-toolbar admin-toolbar-row">
        <input
          className="admin-search-input"
          placeholder="Rechercher par nom, spider ou URL"
          value={siteSearch}
          onChange={(event) => setSiteSearch(event.target.value)}
        />
        <div className="admin-filter-chips" aria-label="Filtrer les sites par statut">
          {statusFilterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`admin-filter-chip ${siteStatusFilter === option.value ? 'is-active' : ''}`}
              onClick={() => setSiteStatusFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {siteFormMessage && (
        <p
          className={`admin-form-message ${siteFormMessage.toLowerCase().includes('erreur') ? 'admin-form-message--error' : ''}`}
        >
          {siteFormMessage}
        </p>
      )}
      {siteError && <p className="admin-form-message admin-form-message--error">{siteError}</p>}

      {siteLoading ? (
        <div className="admin-state admin-state--inline">
          <FaSyncAlt className="spin" />
          <p>Chargement des sites de collecte...</p>
        </div>
      ) : filteredSites.length === 0 ? (
        <p className="empty">Aucun site de collecte trouvé.</p>
      ) : (
        <div className="admin-sites-grid">
          {filteredSites.map((site) => (
            <article
              key={site.id}
              className={`admin-site-card ${site.is_active ? 'is-active' : 'is-inactive'} ${editingSiteId === site.id ? 'is-editing' : ''}`}
            >
              <div className="admin-site-card-head">
                <div>
                  <h3>{site.name}</h3>
                  <p className="admin-site-spider">Robot de collecte : {site.spider_name}</p>
                </div>
                <span className={`admin-site-status ${site.is_active ? 'is-active' : 'is-inactive'}`}>
                  {site.is_active ? <FaCheckCircle /> : <FaBan />}
                  {site.is_active ? 'Actif' : 'Désactivé'}
                </span>
              </div>

              <div className="admin-site-meta">
                <span>
                  <strong>Base :</strong> {site.base_url || '-'}
                </span>
                <span>
                  <strong>Départ :</strong> {site.start_url || '-'}
                </span>
                <span>
                  <strong>Intégration :</strong> {site.integration_status || 'ready'}
                </span>
                <span>
                  <strong>Mise à jour :</strong> {formatDate(site.updated_at || site.created_at)}
                </span>
              </div>

              <p className="admin-site-description">
                {site.description || 'Aucune description renseignée pour ce site.'}
              </p>

              <div className="admin-table-actions admin-site-actions">
                <button
                  type="button"
                  className={`admin-toggle-btn ${site.is_active ? 'is-active' : 'is-inactive'}`}
                  onClick={() => handleToggleSiteStatus(site)}
                  disabled={siteSubmitting || (!site.is_active && (site.integration_status || 'ready') !== 'ready')}
                  aria-pressed={site.is_active}
                  aria-label={site.is_active ? 'Désactiver ce site de collecte' : 'Activer ce site de collecte'}
                >
                  <span className="admin-toggle-track">
                    <span className="admin-toggle-thumb" />
                  </span>
                  <span className="admin-toggle-copy">
                    <strong>{site.is_active ? 'Actif' : 'Inactif'}</strong>
                    <small>
                      {site.is_active
                        ? 'Cliquer pour désactiver'
                        : (site.integration_status || 'ready') === 'ready'
                          ? 'Cliquer pour activer'
                          : 'Spider requis'}
                    </small>
                  </span>
                </button>
                <button
                  type="button"
                  className="admin-secondary"
                  onClick={() => startEditSite(site)}
                  disabled={siteSubmitting}
                >
                  Modifier
                </button>
                <button
                  type="button"
                  className="admin-danger"
                  onClick={() => requestDeleteSite(site)}
                  disabled={siteSubmitting}
                >
                  Supprimer
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
