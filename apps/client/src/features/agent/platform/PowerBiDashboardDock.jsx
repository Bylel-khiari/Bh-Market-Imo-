import React, { useEffect, useMemo, useState } from 'react';
import {
  FaChartLine,
  FaClipboard,
  FaCompress,
  FaDownload,
  FaExternalLinkAlt,
  FaExpand,
} from 'react-icons/fa';

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
  const [message, setMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const embedUrl = String(defaultEmbedUrl || '').trim();
  const embedTitle = String(defaultTitle || 'Power BI').trim();
  const canPreview = useMemo(() => isHttpUrl(embedUrl), [embedUrl]);

  useEffect(() => {
    if (!isExpanded) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsExpanded(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExpanded]);

  const handleOpen = () => {
    if (!canPreview) {
      setMessage('Aucun lien Power BI configure.');
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
    <section className={`admin-card agent-powerbi-dock${isExpanded ? ' is-expanded' : ''}`}>
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
          <button type="button" className="admin-secondary" onClick={() => setIsExpanded((current) => !current)}>
            {isExpanded ? <FaCompress /> : <FaExpand />}
            <span>{isExpanded ? 'Reduire' : 'Agrandir'}</span>
          </button>
          <button type="button" className="admin-refresh" onClick={handleOpen}>
            <FaExternalLinkAlt />
            <span>Ouvrir</span>
          </button>
        </div>
      </div>

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
