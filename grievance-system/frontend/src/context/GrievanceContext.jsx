import { createContext, useContext, useState, useCallback } from 'react';
import { grievanceAPI } from '../services/api';

const GrievanceContext = createContext(null);

export function GrievanceProvider({ children }) {
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchGrievances = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await grievanceAPI.list(params);
      setGrievances(res.data.grievances);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load grievances');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateGrievanceInList = (updated) => {
    setGrievances((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
  };

  return (
    <GrievanceContext.Provider value={{ grievances, loading, error, fetchGrievances, updateGrievanceInList }}>
      {children}
    </GrievanceContext.Provider>
  );
}

export const useGrievanceContext = () => useContext(GrievanceContext);
