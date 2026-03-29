import { useState, useEffect, useCallback } from 'react';
import { grievanceAPI } from '../services/api';

export function useGrievances(params = {}) {
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async (overrideParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await grievanceAPI.list(overrideParams || params);
      setGrievances(res.data.grievances);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => { fetch(); }, [fetch]);

  return { grievances, loading, error, refetch: fetch, setGrievances };
}
