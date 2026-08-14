import { apiConfig } from './apiConfig.js';
import { apiRequest } from './apiClient.js';
import { storage } from './storage.js';

const wait = (milliseconds = 350) => new Promise((resolve) => {
  setTimeout(resolve, milliseconds);
});

const unwrap = (payload) => payload?.data ?? payload;

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
    const encodedPayload = token.split('.')[1];
    if (!encodedPayload) return {};

    const base64 = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return {};
  }
}

function normalizeRole(claims) {
  const roles = Array.isArray(claims.roles)
    ? claims.roles
    : [claims.roles || claims.role].filter(Boolean);

  return String(roles[0] || 'USER')
    .replace(/^ROLE_/, '')
    .toUpperCase();
}

function buildUserFromToken(accessToken, identifier = '') {
  const claims = decodeJwtPayload(accessToken);

  return {
    userId: String(claims.sub || ''),
    firstName: 'کاربر',
    lastName: '',
    email: identifier.includes('@') ? identifier : '',
    phoneNumber: identifier.includes('@') ? '' : identifier,
    role: normalizeRole(claims),
  };
}

async function fetchBackendProfile(fallbackUser) {
  if (apiConfig.userMocks) return fallbackUser;

  try {
    const payload = await apiRequest(`${apiConfig.userBaseUrl}/profile`);
    const profile = unwrap(payload) || {};

    return {
      ...fallbackUser,
      ...profile,
      userId: fallbackUser.userId,
      role: fallbackUser.role,
    };
  } catch {
    return fallbackUser;
  }
}

async function exchangeRefreshToken(refreshToken) {
  const payload = await apiRequest(`${apiConfig.authBaseUrl}/refresh`, {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  }, false);

  const data = unwrap(payload);
  if (!data?.access_token) {
    throw new Error('توکن دسترسی از سرور دریافت نشد.');
  }

  storage.set('accessToken', data.access_token);
  storage.set('refreshToken', data.refresh_token || refreshToken);

  return data;
}

async function finishBackendLogin(payload, identifier = '') {
  const data = unwrap(payload) || {};

  storage.remove('accessToken');
  storage.remove('user');
  storage.remove('mockSession');

  let accessToken = data.access_token || '';
  let refreshToken = data.refresh_token || '';

  if (refreshToken) storage.set('refreshToken', refreshToken);

  if (!accessToken && refreshToken) {
    const refreshed = await exchangeRefreshToken(refreshToken);
    accessToken = refreshed.access_token;
    refreshToken = refreshed.refresh_token || refreshToken;
  } else if (accessToken) {
    storage.set('accessToken', accessToken);
  }

  if (!accessToken) {
    storage.remove('refreshToken');
    throw new Error('اطلاعات نشست از سرور دریافت نشد.');
  }

  const tokenUser = buildUserFromToken(accessToken, identifier);
  const user = await fetchBackendProfile(tokenUser);
  storage.set('user', user);

  return {
    user,
    access_token: accessToken,
    refresh_token: refreshToken || storage.get('refreshToken'),
  };
}

function requireToken(value, message) {
  if (!value) throw new Error(message);
  return value;
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

    storage.clearSession();

    const payload = await apiRequest(`${apiConfig.authBaseUrl}/login-password`, {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    const data = unwrap(payload) || {};

    if (data.mfa_token && String(data.step || '').startsWith('2FA')) {
      return {
        requiresOtp: true,
        mfa: data.mfa_token,
        step: data.step,
      };
    }

    return finishBackendLogin(payload, identifier);
  },

  async requestOtp(identifier) {
    if (apiConfig.authMocks) {
      await wait();
      return { mfa: `mock-mfa-${Date.now()}`, demoOtp: '12345' };
    }

    storage.clearSession();

    const isEmail = identifier.includes('@');
    const endpoint = isEmail ? 'login-otp-email' : 'login-otp-phone';
    const body = isEmail ? { email: identifier } : { phone: identifier };

    const payload = await apiRequest(`${apiConfig.authBaseUrl}/${endpoint}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const data = unwrap(payload) || {};

    return {
      ...data,
      mfa: requireToken(
        data.mfa_token || data.mfa,
        'توکن تأیید کد یک‌بارمصرف از سرور دریافت نشد.',
      ),
    };
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
    const data = unwrap(payload) || {};

    if (data.mfa_token && String(data.step || '').startsWith('2FA')) {
      return {
        requiresOtp: true,
        mfa: data.mfa_token,
        step: data.step,
      };
    }

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
    const data = unwrap(payload) || {};

    return {
      ...data,
      mfa_token: requireToken(
        data.mfa_token,
        'توکن تأیید ثبت‌نام از سرور دریافت نشد.',
      ),
    };
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
    const data = unwrap(payload) || {};

    return {
      ...data,
      temp_token: requireToken(
        data.temp_token,
        'توکن موقت تکمیل ثبت‌نام از سرور دریافت نشد.',
      ),
    };
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
    const loginData = unwrap(loginPayload) || {};

    if (loginData.mfa_token && String(loginData.step || '').startsWith('2FA')) {
      return {
        requiresOtp: true,
        mfa: loginData.mfa_token,
        step: loginData.step,
        identifier: email,
      };
    }

    return finishBackendLogin(loginPayload, email);
  },

  async resetPasswordInitiate(email) {
    const payload = await apiRequest(`${apiConfig.authBaseUrl}/reset-password/initiate`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return unwrap(payload) || {};
  },

  async resetPasswordVerify(mfa, otp) {
    const payload = await apiRequest(`${apiConfig.authBaseUrl}/reset-password/verify`, {
      method: 'POST',
      body: JSON.stringify({ mfa, otp }),
    });
    return unwrap(payload) || {};
  },

  async resetPasswordComplete(tempToken, password) {
    await apiRequest(`${apiConfig.authBaseUrl}/reset-password/complete`, {
      method: 'POST',
      body: JSON.stringify({ temp_token: tempToken, password }),
    });
  },

  async logout() {
    const refreshToken = storage.get('refreshToken');

    if (refreshToken && !storage.get('mockSession')) {
      try {
        await apiRequest(`${apiConfig.authBaseUrl}/logout`, {
          method: 'POST',
          body: JSON.stringify({ refresh_token: refreshToken }),
        }, false);
      } catch {
      }
    }

    storage.clearSession();
  },
};
