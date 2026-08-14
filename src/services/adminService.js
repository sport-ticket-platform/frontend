import { apiRequest } from './apiClient.js';
import { apiConfig } from './apiConfig.js';

const unwrap = (payload) => payload?.data ?? payload;

export const adminService = {
  async getUsers(filters = {}) {
    const params = new URLSearchParams({ limit: '40', offset: '0' });
    if (filters.email) params.set('email', filters.email);
    if (filters.firstName) params.set('firstName', filters.firstName);
    if (filters.lastName) params.set('lastName', filters.lastName);
    if (filters.status !== '') params.set('status', String(filters.status));
    const payload = await apiRequest(`${apiConfig.adminBaseUrl}/users?${params.toString()}`);
    const users = unwrap(payload);
    return Array.isArray(users) ? users : [];
  },

  async changeUserStatus(userId, active) {
    await apiRequest(`${apiConfig.adminBaseUrl}/users/${userId}?active=${active}`, { method: 'PUT' });
    return active;
  },

  async createMatch(values) {
    return unwrap(await apiRequest(`${apiConfig.eventBaseUrl}/new/match`, {
      method: 'POST',
      body: JSON.stringify(values),
    }));
  },

  async createTicketConfig(values) {
    return unwrap(await apiRequest(`${apiConfig.eventBaseUrl}/new/match/ticket`, {
      method: 'POST',
      body: JSON.stringify(values),
    }));
  },
};
