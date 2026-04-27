import { jsonRequest } from '../../lib/auth';

export async function sendAssistantMessage({ message, history = [], context = {}, signal } = {}) {
  return jsonRequest('/api/assistant/chat', {
    method: 'POST',
    body: {
      message,
      history,
      context,
    },
    signal,
  });
}

