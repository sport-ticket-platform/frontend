const legacyMocks = String(import.meta.env.VITE_ENABLE_MOCKS ?? 'true').toLowerCase() === 'true';

export const apiConfig = {
  authBaseUrl: import.meta.env.VITE_AUTH_API_URL || '/auth-api/api/auth',
  userBaseUrl: import.meta.env.VITE_USER_API_URL || '/user-api/api/user',
  ticketBaseUrl: import.meta.env.VITE_TICKET_API_URL || '/ticket-api/api',
  authMocks: String(import.meta.env.VITE_AUTH_MOCKS ?? legacyMocks).toLowerCase() === 'true',
  ticketMocks: String(import.meta.env.VITE_TICKET_MOCKS ?? legacyMocks).toLowerCase() === 'true',
  timeoutMs: Number(import.meta.env.VITE_API_TIMEOUT_MS || 12000),
};
