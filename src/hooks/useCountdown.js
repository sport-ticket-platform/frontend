import { useEffect, useMemo, useState } from 'react';

function calculateSeconds(target) {
  if (!target) return 0;
  return Math.max(0, Math.floor((new Date(target).getTime() - Date.now()) / 1000));
}

export function useCountdown(target) {
  const [seconds, setSeconds] = useState(() => calculateSeconds(target));

  useEffect(() => {
    const update = () => setSeconds(calculateSeconds(target));
    update();

    if (!target) return undefined;

    const intervalId = window.setInterval(update, 1000);
    return () => window.clearInterval(intervalId);
  }, [target]);

  return useMemo(() => ({
    seconds,
    expired: seconds <= 0,
    formatted: `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`,
  }), [seconds]);
}
