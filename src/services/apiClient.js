import { apiConfig } from './apiConfig.js';
import { storage } from './storage.js';

const DEVICE_ID_KEY = 'deviceId';

function getDeviceId() {
  let deviceId = storage.get(DEVICE_ID_KEY);

  if (!deviceId) {
    deviceId = globalThis.crypto?.randomUUID?.()
      || `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    storage.set(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = body?.message
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

  const response = await fetch(`${apiConfig.authBaseUrl}/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-Id': getDeviceId(),
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  const payload = await parseResponse(response);
  const data = payload?.data || payload;

  if (!data?.access_token) return null;

  storage.set('accessToken', data.access_token);
  if (data.refresh_token) storage.set('refreshToken', data.refresh_token);
  return data.access_token;
}

export async function apiRequest(url, options = {}, retry = true) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), apiConfig.timeoutMs);
  const accessToken = storage.get('accessToken');

  const headers = {
    Accept: 'application/json',
    'X-Device-Id': getDeviceId(),
    ...(!(options.body instanceof FormData) && { 'Content-Type': 'application/json' }),
    ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (response.status === 401 && retry && storage.get('refreshToken')) {
      const refreshedToken = await refreshAccessToken();
      if (refreshedToken) return apiRequest(url, options, false);
    }

    return await parseResponse(response);
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('زمان پاسخ‌گویی سرور بیش از حد طول کشید.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
