import { useEffect, useRef, useCallback } from 'react';

export function useTimeoutCleanup() {
  const timersRef = useRef([]);

  const clearAll = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const schedule = useCallback((fn, delay) => {
    const id = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((t) => t !== id);
      fn();
    }, delay);
    timersRef.current.push(id);
    return id;
  }, []);

  useEffect(() => clearAll, [clearAll]);

  return { schedule, clearAll };
}
