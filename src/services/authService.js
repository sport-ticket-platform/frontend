import { apiConfig } from './apiConfig.js';
import { apiRequest } from './apiClient.js';
import { storage } from './storage.js';

const unwrap = (payload) =>
  payload?.data ?? payload;

function normalizeToken(value) {
  if (typeof value !== 'string') return '';

  return value
    .trim()
    .replace(/^Bearer\s+/i, '')
    .trim();
}

function decodeJwtPayload(token) {
  try {
    const encodedPayload =
      token.split('.')[1];

    if (!encodedPayload) return {};

    const base64 = encodedPayload
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const padded =
      base64
      + '='.repeat(
        (4 - (base64.length % 4)) % 4,
      );

    return JSON.parse(atob(padded));
  } catch {
    return {};
  }
}

function normalizeRole(claims) {
  const roles = Array.isArray(claims.roles)
    ? claims.roles
    : [claims.roles || claims.role]
      .filter(Boolean);

  return String(roles[0] || 'USER')
    .replace(/^ROLE_/, '')
    .toUpperCase();
}

function buildUserFromToken(
  accessToken,
  identifier = '',
) {
  const claims =
    decodeJwtPayload(accessToken);

  return {
    userId: String(claims.sub || ''),

    firstName: 'کاربر',
    lastName: '',

    email: identifier.includes('@')
      ? identifier
      : '',

    phoneNumber: identifier.includes('@')
      ? ''
      : identifier,

    role: normalizeRole(claims),
  };
}

async function fetchBackendProfile(
  fallbackUser,
) {
  try {
    const payload = await apiRequest(
      `${apiConfig.userBaseUrl}/profile`,
    );

    const profile = unwrap(payload) || {};

    return {
      ...fallbackUser,
      ...profile,
      userId: fallbackUser.userId,
      role: fallbackUser.role,
    };
  } catch (error) {

    if ([401, 403].includes(error.status)) {
      throw error;
    }

    return fallbackUser;
  }
}

async function exchangeRefreshToken(
  refreshToken,
) {
  const payload = await apiRequest(
    `${apiConfig.authBaseUrl}/refresh`,
    {
      method: 'POST',

      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    },
    false,
  );

  const data = unwrap(payload);

  const accessToken = normalizeToken(
    data?.access_token,
  );

  if (!accessToken) {
    throw new Error(
      'توکن دسترسی از سرور دریافت نشد.',
    );
  }

  storage.set(
    'accessToken',
    accessToken,
  );

  storage.set(
    'refreshToken',
    data.refresh_token || refreshToken,
  );

  return {
    ...data,
    access_token: accessToken,
  };
}

async function finishBackendLogin(
  payload,
  identifier = '',
) {
  const data = unwrap(payload) || {};

  storage.remove('accessToken');
  storage.remove('user');

  let accessToken = normalizeToken(
    data.access_token,
  );

  let refreshToken =
    normalizeToken(data.refresh_token);

  if (refreshToken) {
    storage.set(
      'refreshToken',
      refreshToken,
    );
  }

  if (!accessToken && refreshToken) {
    const refreshed =
      await exchangeRefreshToken(
        refreshToken,
      );

    accessToken =
      refreshed.access_token;

    refreshToken =
      refreshed.refresh_token
      || refreshToken;
  } else if (accessToken) {
    storage.set(
      'accessToken',
      accessToken,
    );
  }

  if (!accessToken) {
    storage.remove('refreshToken');

    throw new Error(
      'اطلاعات نشست از سرور دریافت نشد.',
    );
  }

  const tokenUser =
    buildUserFromToken(
      accessToken,
      identifier,
    );
  const user = await fetchBackendProfile(
    tokenUser,
  );

  storage.set('user', user);

  return {
    user,
    access_token: accessToken,

    refresh_token:
      refreshToken
      || storage.get('refreshToken'),
  };
}

function requireToken(value, message) {
  if (!value) {
    throw new Error(message);
  }

  return value;
}

export const authService = {
  async loginWithPassword(
    identifier,
    password,
  ) {
    storage.clearSession();

    const payload = await apiRequest(
      `${apiConfig.authBaseUrl}/login-password`,
      {
        method: 'POST',

        body: JSON.stringify({
          identifier,
          password,
        }),
      },
    );

    const data = unwrap(payload) || {};

    if (
      data.mfa_token
      && String(data.step || '')
        .startsWith('2FA')
    ) {
      return {
        requiresOtp: true,
        mfa: data.mfa_token,
        step: data.step,
      };
    }

    return finishBackendLogin(
      payload,
      identifier,
    );
  },

  async requestOtp(identifier) {
    storage.clearSession();

    const isEmail =
      identifier.includes('@');

    const endpoint = isEmail
      ? 'login-otp-email'
      : 'login-otp-phone';

    const body = isEmail
      ? { email: identifier }
      : { phone: identifier };

    const payload = await apiRequest(
      `${apiConfig.authBaseUrl}/${endpoint}`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );

    const data = unwrap(payload) || {};

    return {
      ...data,

      mfa: requireToken(
        data.mfa_token || data.mfa,
        'توکن تأیید کد یک‌بارمصرف از سرور دریافت نشد.',
      ),
    };
  },

  async verifyOtp(
    identifier,
    mfa,
    otp,
  ) {
    const payload = await apiRequest(
      `${apiConfig.authBaseUrl}/verify`,
      {
        method: 'POST',

        body: JSON.stringify({
          mfa,
          otp,
        }),
      },
    );

    const data = unwrap(payload) || {};

    if (
      data.mfa_token
      && String(data.step || '')
        .startsWith('2FA')
    ) {
      return {
        requiresOtp: true,
        mfa: data.mfa_token,
        step: data.step,
      };
    }

    return finishBackendLogin(
      payload,
      identifier,
    );
  },

  async signupInitiate(email) {
    const payload = await apiRequest(
      `${apiConfig.authBaseUrl}/signup/initiate`,
      {
        method: 'POST',

        body: JSON.stringify({
          email,
        }),
      },
    );

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
    const payload = await apiRequest(
      `${apiConfig.authBaseUrl}/signup/verify`,
      {
        method: 'POST',

        body: JSON.stringify({
          mfa: token,
          otp,
        }),
      },
    );

    const data = unwrap(payload) || {};

    return {
      ...data,

      temp_token: requireToken(
        data.temp_token,
        'توکن موقت تکمیل ثبت‌نام از سرور دریافت نشد.',
      ),
    };
  },

  async signupComplete({
    tempToken,
    firstName,
    lastName,
    password,
    email,
  }) {
    await apiRequest(
      `${apiConfig.authBaseUrl}/signup/complete`,
      {
        method: 'POST',

        body: JSON.stringify({
          temp_token: tempToken,
          first_name: firstName,
          last_name: lastName,
          password,
        }),
      },
    );

    const loginPayload = await apiRequest(
      `${apiConfig.authBaseUrl}/login-password`,
      {
        method: 'POST',

        body: JSON.stringify({
          identifier: email,
          password,
        }),
      },
    );

    const loginData =
      unwrap(loginPayload) || {};

    if (
      loginData.mfa_token
      && String(loginData.step || '')
        .startsWith('2FA')
    ) {
      return {
        requiresOtp: true,
        mfa: loginData.mfa_token,
        step: loginData.step,
        identifier: email,
      };
    }

    return finishBackendLogin(
      loginPayload,
      email,
    );
  },

  async resetPasswordInitiate(email) {
    const payload = await apiRequest(
      `${apiConfig.authBaseUrl}/reset-password/initiate`,
      {
        method: 'POST',

        body: JSON.stringify({
          email,
        }),
      },
    );

    return unwrap(payload) || {};
  },

  async resetPasswordVerify(
    mfa,
    otp,
  ) {
    const payload = await apiRequest(
      `${apiConfig.authBaseUrl}/reset-password/verify`,
      {
        method: 'POST',

        body: JSON.stringify({
          mfa,
          otp,
        }),
      },
    );

    return unwrap(payload) || {};
  },

  async resetPasswordComplete(
    tempToken,
    password,
  ) {
    await apiRequest(
      `${apiConfig.authBaseUrl}/reset-password/complete`,
      {
        method: 'POST',

        body: JSON.stringify({
          temp_token: tempToken,
          password,
        }),
      },
    );
  },

  async logout() {
    const refreshToken =
      storage.get('refreshToken');

    try {
      if (refreshToken) {
        await apiRequest(
          `${apiConfig.authBaseUrl}/logout`,
          {
            method: 'POST',

            body: JSON.stringify({
              refresh_token: refreshToken,
            }),
          },
          false,
        );
      }
    } finally {
      storage.clearSession();
    }
  },
};