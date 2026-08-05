import { apiRequest } from './apiClient.js';
import { apiConfig } from './apiConfig.js';
import { storage } from './storage.js';

const delay = (milliseconds = 220) => new Promise((resolve) => {
  window.setTimeout(resolve, milliseconds);
});

const unwrap = (payload) => payload?.data ?? payload;

function mergeWithSession(profile = {}) {
  const sessionUser = storage.get('user', {});

  return {
    ...sessionUser,
    ...profile,
    userId: profile.userId || sessionUser.userId || '',
    role: profile.role || sessionUser.role || 'USER',
  };
}

export const userService = {
  async getProfile() {
    if (apiConfig.userMocks || storage.get('mockSession')) {
      await delay(140);
      return storage.get('user', {});
    }

    const payload = await apiRequest(`${apiConfig.userBaseUrl}/profile`);
    const profile = mergeWithSession(unwrap(payload) || {});
    storage.set('user', profile);
    return profile;
  },

  async updateProfile(values) {
    if (apiConfig.userMocks || storage.get('mockSession')) {
      await delay();
      const updatedProfile = mergeWithSession(values);
      storage.set('user', updatedProfile);
      return updatedProfile;
    }

    await apiRequest(`${apiConfig.userBaseUrl}/profile`, {
      method: 'PUT',
      body: JSON.stringify({
        firstName: values.firstName || '',
        lastName: values.lastName || '',
        email: values.email || '',
        phoneNumber: values.phoneNumber || null,
        city: values.city || null,
      }),
    });

    const updatedProfile = mergeWithSession(values);
    storage.set('user', updatedProfile);
    return updatedProfile;
  },
};
