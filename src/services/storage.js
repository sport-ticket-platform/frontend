const prefix = 'sportik_';

export const storage = {
  get(key, fallback = null) {
    try {
      const rawValue = localStorage.getItem(prefix + key);
      return rawValue === null ? fallback : JSON.parse(rawValue);
    } catch {
      return fallback;
    }
  },

  set(key, value) {
    localStorage.setItem(prefix + key, JSON.stringify(value));
  },

  remove(key) {
    localStorage.removeItem(prefix + key);
  },

  clearSession() {
    ['accessToken', 'refreshToken', 'user', 'mockSession'].forEach((key) => {
      this.remove(key);
    });
  },
};
