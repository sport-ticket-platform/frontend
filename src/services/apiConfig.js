export const apiConfig = {
  authBaseUrl: import.meta.env.VITE_AUTH_API_URL || '/auth-api/api/auth',
  userBaseUrl: import.meta.env.VITE_USER_API_URL || '/user-api/api/user',
  adminBaseUrl: import.meta.env.VITE_ADMIN_API_URL || '/user-api/api/admin',
  eventBaseUrl: import.meta.env.VITE_EVENT_API_URL || '/event-api/api/event',
  reservationBaseUrl: import.meta.env.VITE_RESERVATION_API_URL || '/reservation-api/api/reservations',

  timeoutMs: Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000),
};
