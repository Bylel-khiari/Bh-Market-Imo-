import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowRight, FaComments, FaMapMarkerAlt, FaPaperPlane, FaTimes } from 'react-icons/fa';
import { AUTH_SESSION_CHANGED_EVENT, getAuthSession } from '../../lib/auth';
import { sendAssistantMessage } from './assistantApi';
import './BHAssistantWidget.css';

const INITIAL_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  content: 'Bonjour 👋 Je suis l’assistant BH Market Imo. Comment puis-je vous aider aujourd’hui ?',
};

const QUICK_SUGGESTIONS = [
  'Biens près de moi',
  'Simulation crédit',
  'Documents nécessaires',
  'Contacter un agent',
];

const TUNISIA_LOCATION_CENTERS = [
  { city: 'Tunis', latitude: 36.8065, longitude: 10.1815 },
  { city: 'Ariana', latitude: 36.8625, longitude: 10.1956 },
  { city: 'Ben Arous', latitude: 36.7435, longitude: 10.2319 },
  { city: 'Manouba', latitude: 36.808, longitude: 10.0972 },
  { city: 'Nabeul', latitude: 36.4513, longitude: 10.735 },
  { city: 'Zaghouan', latitude: 36.4029, longitude: 10.1429 },
  { city: 'Bizerte', latitude: 37.2744, longitude: 9.8739 },
  { city: 'Béja', latitude: 36.7333, longitude: 9.1833 },
  { city: 'Jendouba', latitude: 36.5011, longitude: 8.7802 },
  { city: 'Le Kef', latitude: 36.1742, longitude: 8.7049 },
  { city: 'Siliana', latitude: 36.0833, longitude: 9.3667 },
  { city: 'Sousse', latitude: 35.8256, longitude: 10.63699 },
  { city: 'Monastir', latitude: 35.77799, longitude: 10.82617 },
  { city: 'Mahdia', latitude: 35.5047, longitude: 11.0622 },
  { city: 'Sfax', latitude: 34.7406, longitude: 10.7603 },
  { city: 'Kairouan', latitude: 35.6781, longitude: 10.0963 },
  { city: 'Kasserine', latitude: 35.1676, longitude: 8.8365 },
  { city: 'Sidi Bouzid', latitude: 35.0382, longitude: 9.4858 },
  { city: 'Gabès', latitude: 33.8815, longitude: 10.0982 },
  { city: 'Médenine', latitude: 33.3549, longitude: 10.5055 },
  { city: 'Tataouine', latitude: 32.9297, longitude: 10.4518 },
  { city: 'Gafsa', latitude: 34.425, longitude: 8.7842 },
  { city: 'Tozeur', latitude: 33.9197, longitude: 8.1335 },
  { city: 'Kébili', latitude: 33.705, longitude: 8.969 },
];

function createMessage(role, content, meta = {}) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
    ...meta,
  };
}

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function inferCityFromText(value = '') {
  const normalizedValue = normalizeText(value);
  return (
    TUNISIA_LOCATION_CENTERS.find((item) =>
      normalizedValue.includes(normalizeText(item.city).replace(/^le\s+/, '')),
    )?.city || ''
  );
}

function distanceSquared(a, b) {
  return ((a.latitude - b.latitude) ** 2) + ((a.longitude - b.longitude) ** 2);
}

function resolveNearestCity(latitude, longitude) {
  const point = { latitude, longitude };
  return TUNISIA_LOCATION_CENTERS.reduce((nearest, candidate) => {
    if (!nearest) return candidate;
    return distanceSquared(point, candidate) < distanceSquared(point, nearest) ? candidate : nearest;
  }, null)?.city || '';
}

function buildProfileLocation(session) {
  const address = session?.user?.address || '';
  const city = session?.user?.city || inferCityFromText(address);

  return {
    ...(city ? { clientCity: city, location: { city, address } } : {}),
    ...(address ? { clientAddress: address } : {}),
  };
}

function messageRequestsCurrentLocation(message = '') {
  const normalizedMessage = normalizeText(message);
  return [
    'pres de moi',
    'près de moi',
    'autour de moi',
    'ma position',
    'ma localisation',
    'proche de moi',
    'zone',
  ].some((term) => normalizedMessage.includes(normalizeText(term)));
}

function buildPageContext(locationOverride) {
  if (typeof window === 'undefined') {
    return {};
  }

  const session = getAuthSession();
  const params = new URLSearchParams(window.location.search);
  const propertyId = params.get('propertyId') || params.get('id') || undefined;
  const profileLocation = buildProfileLocation(session);
  const activeLocation = locationOverride || {};

  return {
    page: window.location.pathname,
    ...(propertyId ? { propertyId } : {}),
    ...profileLocation,
    ...(activeLocation.city
      ? {
          clientCity: activeLocation.city,
          location: activeLocation,
        }
      : {}),
  };
}

function toApiHistory(messages) {
  return messages
    .filter((message) => message.id !== INITIAL_MESSAGE.id)
    .slice(-12)
    .map(({ role, content }) => ({ role, content }));
}

function normalizeSuggestions(suggestions) {
  if (!Array.isArray(suggestions) || suggestions.length === 0) {
    return QUICK_SUGGESTIONS;
  }

  return suggestions.filter(Boolean).slice(0, 4);
}

function getAuthSessionKey() {
  const session = getAuthSession();
  return session?.token || session?.user?.email || 'guest';
}

function BHAssistantWidget() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState(QUICK_SUGGESTIONS);
  const [isLoading, setIsLoading] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const requestIdRef = useRef(0);
  const authSessionKeyRef = useRef(getAuthSessionKey());

  const resetChat = useCallback(() => {
    requestIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([INITIAL_MESSAGE]);
    setInputValue('');
    setSuggestions(QUICK_SUGGESTIONS);
    setDetectedLocation(null);
    setLocationStatus('');
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages, isLoading]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const syncAuthSession = () => {
      const nextSessionKey = getAuthSessionKey();

      if (authSessionKeyRef.current !== nextSessionKey) {
        authSessionKeyRef.current = nextSessionKey;
        resetChat();
      }
    };

    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, syncAuthSession);
    window.addEventListener('storage', syncAuthSession);

    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, syncAuthSession);
      window.removeEventListener('storage', syncAuthSession);
      abortRef.current?.abort();
    };
  }, [resetChat]);

  function handleNavigate(path) {
    if (!path) return;
    navigate(path);
  }

  async function requestBrowserLocation() {
    if (!navigator.geolocation) {
      throw new Error('La localisation navigateur est indisponible.');
    }

    setLocationStatus('Recherche de votre zone...');

    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 5 * 60 * 1000,
      });
    });

    const nextLocation = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      city: resolveNearestCity(position.coords.latitude, position.coords.longitude),
    };

    setDetectedLocation(nextLocation);
    setLocationStatus(nextLocation.city ? `Zone détectée : ${nextLocation.city}` : '');
    return nextLocation;
  }

  async function handleUseLocation(sourceMessage) {
    try {
      const nextLocation = detectedLocation || await requestBrowserLocation();
      await submitMessage(sourceMessage || 'Recommande-moi des biens près de moi', {
        displayMessage: nextLocation.city ? `Biens près de ${nextLocation.city}` : 'Biens près de moi',
        locationOverride: nextLocation,
      });
    } catch {
      setLocationStatus('');
      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage(
          'assistant',
          'Je n’ai pas pu détecter votre position. Indiquez-moi votre ville, par exemple : “Je cherche un appartement à Sousse”.',
        ),
      ]);
    }
  }

  async function submitMessage(nextMessage, options = {}) {
    const cleanedMessage = nextMessage.trim();
    let displayedMessage = (options.displayMessage || cleanedMessage).trim();
    let locationOverride = options.locationOverride || null;

    if (!cleanedMessage || isLoading) {
      return;
    }

    const profileLocation = buildProfileLocation(getAuthSession());
    const hasKnownLocation = Boolean(locationOverride?.city || detectedLocation?.city || profileLocation.clientCity);

    if (!hasKnownLocation && messageRequestsCurrentLocation(cleanedMessage)) {
      try {
        locationOverride = await requestBrowserLocation();
        if (locationOverride?.city && !options.displayMessage) {
          displayedMessage = `Biens près de ${locationOverride.city}`;
        }
      } catch {
        setLocationStatus('');
      }
    }

    const history = toApiHistory(messages);
    const userMessage = createMessage('user', displayedMessage);

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setInputValue('');
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setIsLoading(true);

    try {
      const response = await sendAssistantMessage({
        message: cleanedMessage,
        history,
        context: buildPageContext(locationOverride || detectedLocation),
        signal: abortRef.current.signal,
      });

      if (requestId !== requestIdRef.current) {
        return;
      }

      const assistantMessage = createMessage('assistant', response.reply, {
        actions: Array.isArray(response.actions) ? response.actions : [],
        recommendations: Array.isArray(response.recommendations) ? response.recommendations : [],
        needsLocation: Boolean(response.needsLocation),
        sourceUserMessage: cleanedMessage,
      });

      setMessages((currentMessages) => [...currentMessages, assistantMessage]);
      setSuggestions(normalizeSuggestions(response.suggestions));
    } catch (error) {
      if (error?.name === 'AbortError') {
        return;
      }

      if (requestId !== requestIdRef.current) {
        return;
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage(
          'assistant',
          'Désolé, je n’arrive pas à joindre l’assistant pour le moment. Vous pouvez réessayer ou contacter notre équipe.',
        ),
      ]);
      setSuggestions(QUICK_SUGGESTIONS);
    } finally {
      if (requestId === requestIdRef.current) {
        abortRef.current = null;
        setIsLoading(false);
      }
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    submitMessage(inputValue);
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitMessage(inputValue);
    }
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        className="bh-assistant-launcher"
        onClick={() => setIsOpen(true)}
        aria-label="Ouvrir BH Assistant"
      >
        <span className="bh-assistant-launcher__icon" aria-hidden="true">
          <FaComments />
        </span>
        <span>BH Assistant</span>
      </button>
    );
  }

  return (
    <section className="bh-assistant-widget" aria-label="BH Assistant">
      <header className="bh-assistant-widget__header">
        <div className="bh-assistant-widget__identity">
          <span className="bh-assistant-widget__avatar" aria-hidden="true">
            BH
          </span>
          <div>
            <h2>BH Assistant</h2>
            <p>Conseiller virtuel</p>
          </div>
        </div>
        <button
          type="button"
          className="bh-assistant-widget__icon-button"
          onClick={() => setIsOpen(false)}
          aria-label="Fermer BH Assistant"
        >
          <FaTimes aria-hidden="true" />
        </button>
      </header>

      <div className="bh-assistant-widget__messages" aria-live="polite">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`bh-assistant-message bh-assistant-message--${message.role}`}
          >
            {message.role === 'assistant' && (
              <span className="bh-assistant-message__avatar" aria-hidden="true">
                BH
              </span>
            )}
            <div className="bh-assistant-message__content">
              <div className="bh-assistant-message__bubble">{message.content}</div>

              {message.role === 'assistant' && message.needsLocation && (
                <button
                  type="button"
                  className="bh-assistant-location-action"
                  onClick={() => handleUseLocation(message.sourceUserMessage)}
                  disabled={isLoading}
                >
                  <FaMapMarkerAlt aria-hidden="true" />
                  <span>Utiliser ma position</span>
                </button>
              )}

              {message.role === 'assistant' && Array.isArray(message.actions) && message.actions.length > 0 && (
                <div className="bh-assistant-actions">
                  {message.actions.map((action) => (
                    <button
                      type="button"
                      key={`${message.id}-${action.label}-${action.path}`}
                      onClick={() => handleNavigate(action.path)}
                    >
                      <span>{action.label}</span>
                      <FaArrowRight aria-hidden="true" />
                    </button>
                  ))}
                </div>
              )}

              {message.role === 'assistant' &&
                Array.isArray(message.recommendations) &&
                message.recommendations.length > 0 && (
                  <div className="bh-assistant-recommendations">
                    {message.recommendations.map((property) => (
                      <article key={`${message.id}-${property.id}`} className="bh-assistant-property-card">
                        {property.image ? (
                          <img src={property.image} alt={property.title} loading="lazy" />
                        ) : (
                          <div className="bh-assistant-property-card__placeholder">BH</div>
                        )}
                        <div>
                          <h3>{property.title}</h3>
                          <p>{property.location || property.city || 'Localisation à vérifier'}</p>
                          {property.price && <strong>{property.price}</strong>}
                          <div className="bh-assistant-property-card__actions">
                            <button type="button" onClick={() => handleNavigate(property.path)}>
                              Voir
                            </button>
                            <button type="button" onClick={() => handleNavigate(property.simulationPath)}>
                              Simuler
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="bh-assistant-message bh-assistant-message--assistant">
            <span className="bh-assistant-message__avatar" aria-hidden="true">
              BH
            </span>
            <div className="bh-assistant-message__bubble bh-assistant-message__bubble--loading">
              Assistant écrit...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {locationStatus && <div className="bh-assistant-widget__location">{locationStatus}</div>}

      <div className="bh-assistant-widget__suggestions" aria-label="Suggestions rapides">
        {suggestions.map((suggestion) => (
          <button
            type="button"
            key={suggestion}
            onClick={() => submitMessage(suggestion)}
            disabled={isLoading}
          >
            {suggestion}
          </button>
        ))}
      </div>

      <form className="bh-assistant-widget__composer" onSubmit={handleSubmit}>
        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Écrivez votre message..."
          aria-label="Message pour BH Assistant"
          rows="1"
          disabled={isLoading}
        />
        <button type="submit" aria-label="Envoyer le message" disabled={isLoading || !inputValue.trim()}>
          <FaPaperPlane aria-hidden="true" />
        </button>
      </form>
    </section>
  );
}

export default BHAssistantWidget;
