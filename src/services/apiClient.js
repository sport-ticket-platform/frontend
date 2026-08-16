import { apiConfig } from './apiConfig.js';
import { storage } from './storage.js';

const DEVICE_ID_KEY = 'deviceId';
let refreshPromise = null;

function normalizeAccessToken(value) {
  if (typeof value !== 'string') return '';

  return value
    .trim()
    .replace(/^Bearer\s+/i, '')
    .trim();
}

function storeAccessToken(value) {
  const token = normalizeAccessToken(value);

  if (!token) {
    throw new Error('توکن دسترسی معتبر از سرور دریافت نشد.');
  }

  storage.set('accessToken', token);
  return token;
}

function getDeviceId() {
  let deviceId = storage.get(DEVICE_ID_KEY);

  if (!deviceId) {
    deviceId =
      globalThis.crypto?.randomUUID?.()
      || `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    storage.set(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}

function collectMessageValues(value) {
  if (value == null) return [];

  if (typeof value === 'string') {
    return value.trim() ? [value.trim()] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectMessageValues);
  }

  if (typeof value === 'object') {
    const directMessage =
      value.messageFa
      || value.message
      || value.titleFa
      || value.title;

    if (directMessage) {
      return collectMessageValues(directMessage);
    }

    return Object.values(value).flatMap(collectMessageValues);
  }

  return [];
}

function collectValidationMessage(body) {
  if (!body || typeof body !== 'object') return '';

  const source =
    body.errors
    || body.validationErrors
    || body.error?.errors
    || body.data;

  return [...new Set(collectMessageValues(source))].join('، ');
}

async function readResponseBody(response) {
  if (response.status === 204) return null;

  const rawBody = await response.text();

  if (!rawBody) return null;

  const contentType =
    response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    return rawBody;
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    return rawBody;
  }
}

async function parseResponse(response) {
  const body = await readResponseBody(response);

  if (!response.ok) {
    const message =
      body?.messageFa
      || body?.titleFa
      || collectValidationMessage(body)
      || body?.message
      || body?.title
      || body?.error
      || (typeof body === 'string' && body)
      || 'خطا در ارتباط با سرور';

    const error = new Error(message);
    error.status = response.status;
    error.payload = body;

    throw error;
  }

  return body;
}

async function refreshAccessToken() {
  const refreshToken = storage.get('refreshToken');

  if (!refreshToken) return null;

  const response = await fetch(
    `${apiConfig.authBaseUrl}/refresh`,
    {
      method: 'POST',

      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Device-Id': getDeviceId(),
      },

      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    },
  );

  const payload = await parseResponse(response);
  const data = payload?.data || payload;

  if (!data?.access_token) return null;

  const accessToken = storeAccessToken(
    data.access_token,
  );

  if (data.refresh_token) {
    storage.set(
      'refreshToken',
      data.refresh_token,
    );
  }

  return accessToken;
}

function getRefreshedAccessToken() {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken()
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function apiRequest(
  url,
  options = {},
  retry = true,
) {
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    apiConfig.timeoutMs,
  );

  const accessToken = normalizeAccessToken(
    storage.get('accessToken'),
  );

  const headers = new Headers(
    options.headers || {},
  );

  if (!headers.has('Accept')) {
    headers.set(
      'Accept',
      'application/json',
    );
  }

  headers.set(
    'X-Device-Id',
    getDeviceId(),
  );

  if (
    !(options.body instanceof FormData)
    && !headers.has('Content-Type')
  ) {
    headers.set(
      'Content-Type',
      'application/json',
    );
  }

  if (accessToken) {
    headers.set(
      'Authorization',
      `Bearer ${accessToken}`,
    );
  } else {
    headers.delete('Authorization');
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (
      response.status === 401
      && retry
      && storage.get('refreshToken')
    ) {
      const refreshedToken =
        await getRefreshedAccessToken();

      if (refreshedToken) {
        return apiRequest(
          url,
          options,
          false,
        );
      }
    }

    return await parseResponse(response);
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(
        'زمان پاسخ‌گویی سرور بیش از حد طول کشید.',
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}