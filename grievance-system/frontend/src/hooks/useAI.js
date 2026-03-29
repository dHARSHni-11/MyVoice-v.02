import { useState } from 'react';
import { getSuggestion } from '../services/aiService';

export function useAI() {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generate = async (grievance) => {
    setLoading(true);
    setError(null);
    try {
      const text = await getSuggestion(grievance);
      setResponse(text);
      return text;
    } catch (e) {
      const msg = e.response?.data?.error || 'AI generation failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return { response, loading, error, generate, setResponse };
}
