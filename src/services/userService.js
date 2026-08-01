import { apiRequest } from './apiClient.js';
import { apiConfig } from './apiConfig.js';
import { storage } from './storage.js';

const delay = (milliseconds = 220) => new Promise((resolve) => {
  window.setTimeout(resolve, milliseconds);
});

const unwrap = (payload) => payload?.data || payload;

export const userService = {
  async getProfile() {
    if (storage.get('mockSession')) {
      await delay(140);
      return storage.get('user', {});
    }

    const payload = await apiRequest(`${apiConfig.userBaseUrl}/profile`);
    const profile = unwrap(payload);
    storage.set('user', profile);
    return profile;
  },

  async updateProfile(values) {
    if (storage.get('mockSession')) {
      await delay();
      const updatedProfile = {
        ...storage.get('user', {}),
        ...values,
      };
      storage.set('user', updatedProfile);
      return updatedProfile;
    }

    const payload = await apiRequest(`${apiConfig.userBaseUrl}/profile`, {
      method: 'PUT',
      body: JSON.stringify(values),
    });
    const updatedProfile = unwrap(payload);
    storage.set('user', updatedProfile);
    return updatedProfile;
  },
};
