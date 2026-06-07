import { useState, useEffect, useCallback, useRef } from 'react';
import { get, post, del } from '../lib/api';

export function useTravel(token, onArrive) {
  const [travel, setTravel]   = useState(undefined); // undefined = not yet loaded
  const [loading, setLoading] = useState(false);
  const onArriveRef = useRef(onArrive);
  onArriveRef.current = onArrive;

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const res = await get('/api/travel/active', token);
      const t = res.data;
      setTravel(t);
      if (t?.status === 'arrived') {
        onArriveRef.current?.(t);
        setTravel(null);
      }
    } catch {}
  }, [token]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 8000);
    return () => clearInterval(id);
  }, [refresh]);

  const startTravel = async (toLocationId) => {
    setLoading(true);
    try {
      const res = await post('/api/travel', { toLocationId }, token);
      setTravel(res.data);
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const cancelTravel = async () => {
    setLoading(true);
    try {
      await del('/api/travel/cancel', token);
      setTravel(null);
    } catch {}
    finally { setLoading(false); }
  };

  return { travel, loading, startTravel, cancelTravel, refresh };
}
