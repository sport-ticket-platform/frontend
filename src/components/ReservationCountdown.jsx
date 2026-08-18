import { useEffect, useRef } from 'react';
import { Timer } from 'lucide-react';
import { useCountdown } from '../hooks/useCountdown.js';

export default function ReservationCountdown({ expiresAt, onExpired }) {
  const { seconds, expired, formatted } = useCountdown(expiresAt);
  const callbackFired = useRef(false);

  useEffect(() => {
    if (expired && !callbackFired.current && onExpired) {
      callbackFired.current = true;
      const timer = setTimeout(() => {
        onExpired();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [expired, onExpired]);

  if (expired) {
    return (
      <span className="reservation-countdown expired">
        <Timer size={13} />
        زمان منقضی شد
      </span>
    );
  }

  return (
    <span className={`reservation-countdown ${seconds < 60 ? 'urgent' : ''}`}>
      <Timer size={13} />
      {formatted} باقی‌مانده
    </span>
  );
}
