// Stores the logged-in user and token, and notifies components when they change.
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user';
const EVENT = 'krishi-auth-change';

const safeGet = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const getToken = () => safeGet(TOKEN_KEY);

export const getUser = () => {
  const raw = safeGet(USER_KEY);
  if (!raw || !getToken()) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const notify = () => window.dispatchEvent(new Event(EVENT));

export const setSession = (token, user) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // storage unavailable (private mode): the session lasts until reload
  }
  notify();
};

export const updateStoredUser = (user) => setSession(null, user);

export const clearSession = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    // Remove data left by the old browser-only demo login.
    localStorage.removeItem('users');
  } catch {
    // ignore
  }
  notify();
};

// Calls `callback` whenever the user logs in or out (in this or another tab).
export const onAuthChange = (callback) => {
  const handler = () => callback(getUser());
  window.addEventListener(EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener('storage', handler);
  };
};
