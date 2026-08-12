import { useEffect, useRef } from 'react';

export function useTimeoutCleanup() {
  const timersRef = useRef([]);

  const schedule = (fn, delay) => {
    const id = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((t) => t !== id);
      fn();
    }, delay);
    timersRef.current.push(id);
    return id;
  };

  const clearAll = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  useEffect(() => clearAll, []);

  return { schedule, clearAll };
}
