import React, { useMemo, useState } from 'react';
import {
  FaChartLine,
  FaClipboard,
  FaDownload,
  FaExternalLinkAlt,
  FaSave,
  FaTrash,
} from 'react-icons/fa';

const POWER_BI_URL_STORAGE_KEY = 'bh_market_powerbi_dashboard_url';
const POWER_BI_TITLE_STORAGE_KEY = 'bh_market_powerbi_dashboard_title';

function getStoredValue(key, fallback = '') {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    return window.localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function setStoredValue(key, value) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (value) {
      window.localStorage.setItem(key, value);
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Local storage is a convenience here; the preview can still work in memory.
  }
}

function normalizePowerBiInput(value) {
  const raw = String(value || '').trim();
  const iframeSrc = raw.match(/\ssrc=["']([^"']+)["']/i)?.[1];
  return (iframeSrc || raw).replace(/&amp;/g, '&').trim();
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export default function PowerBiDashboardDock({
  defaultEmbedUrl = '',
  defaultTitle = 'Power BI',
  onExportPlatformReport,
}) {
  const initialUrl = getStoredValue(POWER_BI_URL_STORAGE_KEY, defaultEmbedUrl);
  const initialTitle = getStoredValue(POWER_BI_TITLE_STORAGE_KEY, defaultTitle);

  const [embedUrl, setEmbedUrl] = useState(initialUrl);
  const [embedTitle, setEmbedTitle] = useState(initialTitle);
  const [draftUrl, setDraftUrl] = useState(initialUrl);
  const [draftTitle, setDraftTitle] = useState(initialTitle);
  const [message, setMessage] = useState('');

  const canPreview = useMemo(() => isHttpUrl(embedUrl), [embedUrl]);

  const handleSave = (event) => {
    event.preventDefault();

    const nextUrl = normalizePowerBiInput(draftUrl);
    const nextTitle = String(draftTitle || '').trim() || defaultTitle;

    if (!isHttpUrl(nextUrl)) {
      setMessage('Lien Power BI invalide.');
      return;
    }

    setEmbedUrl(nextUrl);
    setEmbedTitle(nextTitle);
    setDraftUrl(nextUrl);
    setDraftTitle(nextTitle);
    setStoredValue(POWER_BI_URL_STORAGE_KEY, nextUrl);
    setStoredValue(POWER_BI_TITLE_STORAGE_KEY, nextTitle);
    setMessage('Dashboard Power BI enregistre.');
  };

  const handleClear = () => {
    const fallbackUrl = normalizePowerBiInput(defaultEmbedUrl);
    const fallbackTitle = defaultTitle || 'Power BI';

    setStoredValue(POWER_BI_URL_STORAGE_KEY, '');
    setStoredValue(POWER_BI_TITLE_STORAGE_KEY, '');
    setEmbedUrl(fallbackUrl);
    setEmbedTitle(fallbackTitle);
    setDraftUrl(fallbackUrl);
    setDraftTitle(fallbackTitle);
    setMessage(fallbackUrl ? 'Lien local retire.' : 'Espace Power BI vide.');
  };

  const handleOpen = () => {
    if (!canPreview) {
      setMessage('Ajoutez un lien Power BI valide.');
      return;
    }

    window.open(embedUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopy = async () => {
    if (!canPreview) {
      setMessage('Aucun lien Power BI a copier.');
      return;
    }

    try {
      await navigator.clipboard.writeText(embedUrl);
      setMessage('Lien Power BI copie.');
    } catch {
      setMessage('Copie indisponible dans ce navigateur.');
    }
  };

  return (
    <section className="admin-card agent-powerbi-dock">
      <div className="agent-powerbi-dock-head">
        <div>
          <h2>Power BI</h2>
          <p className="admin-section-help">Dashboard Power BI agent bancaire.</p>
        </div>
        <div className="agent-powerbi-action-row">
          <button type="button" className="admin-secondary" onClick={onExportPlatformReport}>
            <FaDownload />
            <span>CSV KPI</span>
          </button>
          <button type="button" className="admin-secondary" onClick={handleCopy}>
            <FaClipboard />
            <span>Copier</span>
          </button>
          <button type="button" className="admin-refresh" onClick={handleOpen}>
            <FaExternalLinkAlt />
            <span>Ouvrir</span>
          </button>
        </div>
      </div>

      <form className="agent-powerbi-form" onSubmit={handleSave}>
        <label className="admin-field-block agent-powerbi-url-field">
          <span className="admin-field-label">Lien ou iframe Power BI</span>
          <input
            type="text"
            value={draftUrl}
            onChange={(event) => setDraftUrl(event.target.value)}
            placeholder="https://app.powerbi.com/reportEmbed?..."
          />
        </label>
        <label className="admin-field-block agent-powerbi-title-field">
          <span className="admin-field-label">Titre</span>
          <input
            type="text"
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            placeholder="Dashboard Power BI"
          />
        </label>
        <div className="agent-powerbi-form-actions">
          <button type="submit" className="admin-refresh">
            <FaSave />
            <span>Enregistrer</span>
          </button>
          <button type="button" className="admin-danger" onClick={handleClear}>
            <FaTrash />
            <span>Retirer</span>
          </button>
        </div>
      </form>

      {message && <p className="admin-form-message">{message}</p>}

      {canPreview ? (
        <div className="agent-powerbi-frame-wrap">
          <iframe
            src={embedUrl}
            title={embedTitle}
            className="agent-powerbi-frame"
            loading="lazy"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="admin-state admin-state--inline agent-powerbi-empty">
          <FaChartLine />
          <p>Aucun dashboard Power BI configure.</p>
        </div>
      )}
    </section>
  );
}
