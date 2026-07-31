import { apiConfig } from './apiConfig.js';
import { apiRequest } from './apiClient.js';
import { storage } from './storage.js';

const wait = (milliseconds = 350) => new Promise((resolve) => {
  setTimeout(resolve, milliseconds);
});

const unwrap = (payload) => payload?.data || payload;

function buildMockUser(identifier, role = 'USER') {
  return {
    userId: `mock-user-${Date.now()}`,
    firstName: role === 'SUPPORT' ? 'پشتیبان' : 'کاربر',
    lastName: 'آزمایشی',
    email: identifier.includes('@') ? identifier : 'user@sportik.local',
    phoneNumber: identifier.includes('@') ? '09121234567' : identifier,
    role,
  };
}

function establishMockSession(identifier, role = 'USER', profile = {}) {
  const user = { ...buildMockUser(identifier, role), ...profile };
  const accessToken = `mock-access-${Date.now()}`;
  const refreshToken = `mock-refresh-${Date.now()}`;

  storage.set('mockSession', true);
  storage.set('accessToken', accessToken);
  storage.set('refreshToken', refreshToken);
  storage.set('user', user);

  return {
    user,
    access_token: accessToken,
    refresh_token: refreshToken,
  };
}

function decodeJwtPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return {};
  }
}

async function finishBackendLogin(payload, identifier = '') {
  const data = unwrap(payload);

  if (data?.access_token) storage.set('accessToken', data.access_token);
  if (data?.refresh_token) storage.set('refreshToken', data.refresh_token);

  if (!storage.get('accessToken') && data?.refresh_token) {
    const refreshPayload = await apiRequest(`${apiConfig.authBaseUrl}/refresh`, {
      method: 'POST',
      body: JSON.stringify({ refresh_token: data.refresh_token }),
    });
    const refreshData = unwrap(refreshPayload);
    storage.set('accessToken', refreshData.access_token);
    storage.set('refreshToken', refreshData.refresh_token || data.refresh_token);
  }

  const accessToken = storage.get('accessToken');
  if (!accessToken) throw new Error('توکن ورود از سرور دریافت نشد.');

  const claims = decodeJwtPayload(accessToken);
  const rawRole = Array.isArray(claims.roles) ? claims.roles[0] : claims.role;
  const role = String(rawRole || 'USER').replace(/^ROLE_/, '');

  const user = {
    userId: claims.sub || '',
    firstName: claims.first_name || claims.name || 'کاربر',
    lastName: claims.last_name || '',
    email: identifier.includes('@') ? identifier : '',
    phoneNumber: identifier.includes('@') ? '' : identifier,
    role,
  };

  storage.remove('mockSession');
  storage.set('user', user);

  return {
    user,
    access_token: accessToken,
    refresh_token: storage.get('refreshToken'),
  };
}

export const authService = {
  async loginWithPassword(identifier, password) {
    if (apiConfig.authMocks) {
      await wait();
      if (password !== '12345678') {
        throw new Error('در حالت آزمایشی رمز عبور باید 12345678 باشد.');
      }
      const role = identifier.toLowerCase().includes('support') ? 'SUPPORT' : 'USER';
      return establishMockSession(identifier, role);
    }

    const payload = await apiRequest(`${apiConfig.authBaseUrl}/login-password`, {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    const data = unwrap(payload);

    if (data?.step && data.step !== 'DONE' && data.mfa_token) {
      return { requiresOtp: true, mfa: data.mfa_token };
    }

    return finishBackendLogin(payload, identifier);
  },

  async requestOtp(identifier) {
    if (apiConfig.authMocks) {
      await wait();
      return { mfa: `mock-mfa-${Date.now()}`, demoOtp: '12345' };
    }

    const isEmail = identifier.includes('@');
    const endpoint = isEmail ? 'login-otp-email' : 'login-otp-phone';
    const body = isEmail ? { email: identifier } : { phone: identifier };
    const payload = await apiRequest(`${apiConfig.authBaseUrl}/${endpoint}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const data = unwrap(payload);

    return { mfa: data.mfa_token || data.mfa, ...data };
  },

  async verifyOtp(identifier, mfa, otp) {
    if (apiConfig.authMocks) {
      await wait();
      if (String(otp) !== '12345') {
        throw new Error('کد آزمایشی صحیح 12345 است.');
      }
      const role = identifier.toLowerCase().includes('support') ? 'SUPPORT' : 'USER';
      return establishMockSession(identifier, role);
    }

    const payload = await apiRequest(`${apiConfig.authBaseUrl}/verify`, {
      method: 'POST',
      body: JSON.stringify({ mfa, otp }),
    });

    return finishBackendLogin(payload, identifier);
  },

  async signupInitiate(email) {
    if (apiConfig.authMocks) {
      await wait();
      return { signup_token: `mock-signup-${Date.now()}`, demoOtp: '12345' };
    }

    const payload = await apiRequest(`${apiConfig.authBaseUrl}/signup/initiate`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });

    return unwrap(payload);
  },

  async signupVerify(token, otp) {
    if (apiConfig.authMocks) {
      await wait();
      if (String(otp) !== '12345') {
        throw new Error('کد آزمایشی صحیح 12345 است.');
      }
      return { temp_token: `mock-temp-${Date.now()}` };
    }

    const payload = await apiRequest(`${apiConfig.authBaseUrl}/signup/verify`, {
      method: 'POST',
      body: JSON.stringify({ mfa: token, otp }),
    });

    return unwrap(payload);
  },

  async signupComplete({ tempToken, firstName, lastName, password, email }) {
    if (apiConfig.authMocks) {
      await wait();
      return establishMockSession(email, 'USER', { firstName, lastName });
    }

    await apiRequest(`${apiConfig.authBaseUrl}/signup/complete`, {
      method: 'POST',
      body: JSON.stringify({
        temp_token: tempToken,
        first_name: firstName,
        last_name: lastName,
        password,
      }),
    });

    const loginPayload = await apiRequest(`${apiConfig.authBaseUrl}/login-password`, {
      method: 'POST',
      body: JSON.stringify({ identifier: email, password }),
    });

    return finishBackendLogin(loginPayload, email);
  },

  async logout() {
    const refreshToken = storage.get('refreshToken');

    if (refreshToken && !storage.get('mockSession')) {
      try {
        await apiRequest(`${apiConfig.authBaseUrl}/logout`, {
          method: 'POST',
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } catch {
      }
    }
    storage.clearSession();
  },
};
