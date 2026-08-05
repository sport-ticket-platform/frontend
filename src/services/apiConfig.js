const legacyMocks = String(import.meta.env.VITE_ENABLE_MOCKS ?? 'true').toLowerCase() === 'true';

const readFlag = (value, fallback = legacyMocks) => (
  String(value ?? fallback).toLowerCase() === 'true'
);

const ticketMocks = readFlag(import.meta.env.VITE_TICKET_MOCKS);

export const apiConfig = {
  authBaseUrl: import.meta.env.VITE_AUTH_API_URL || '/auth-api/api/auth',
  userBaseUrl: import.meta.env.VITE_USER_API_URL || '/user-api/api/user',
  adminBaseUrl: import.meta.env.VITE_ADMIN_API_URL || '/user-api/api/admin',
  eventBaseUrl: import.meta.env.VITE_EVENT_API_URL || '/event-api/api/event',
  reservationBaseUrl: import.meta.env.VITE_RESERVATION_API_URL || '/reservation-api/api/reservations',

  ticketBaseUrl: import.meta.env.VITE_TICKET_API_URL || '/ticket-api/api',

  authMocks: readFlag(import.meta.env.VITE_AUTH_MOCKS),
  userMocks: readFlag(import.meta.env.VITE_USER_MOCKS),
  eventMocks: readFlag(import.meta.env.VITE_EVENT_MOCKS),
  reservationMocks: readFlag(import.meta.env.VITE_RESERVATION_MOCKS),
  paymentMocks: readFlag(import.meta.env.VITE_PAYMENT_MOCKS, true),
  bookingMocks: readFlag(import.meta.env.VITE_BOOKING_MOCKS, true),
  reportMocks: readFlag(import.meta.env.VITE_REPORT_MOCKS, true),
  supportMocks: readFlag(import.meta.env.VITE_SUPPORT_MOCKS, true),

  ticketMocks,

  timeoutMs: Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000),
};
