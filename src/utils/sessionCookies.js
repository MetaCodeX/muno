// Persistent Session & Device Identification for MUNO
// Combines 1-year document.cookie + localStorage so devices, mobile webviews,
// and re-opened tabs ALWAYS maintain identity and never create duplicate profiles.

const COOKIE_NAME = 'muno_device_id';
const SESSION_KEY = 'muno_persistent_session';
const USERNAME_KEY = 'muno_user_name';

function getCookie(name) {
  try {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
  } catch {}
  return null;
}

function setCookie(name, value, days = 365) {
  try {
    const expires = new Date(Date.now() + days * 86400000).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  } catch {}
}

export function getOrCreateDeviceId() {
  let deviceId = getCookie(COOKIE_NAME);
  if (!deviceId) {
    try {
      deviceId = localStorage.getItem(COOKIE_NAME);
    } catch {}
  }
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
  }
  setCookie(COOKIE_NAME, deviceId, 365);
  try {
    localStorage.setItem(COOKIE_NAME, deviceId);
  } catch {}
  return deviceId;
}

export function saveSession({ sessionId, roomCode, username }) {
  const deviceId = getOrCreateDeviceId();
  const payload = JSON.stringify({ sessionId, roomCode, username, deviceId });
  try {
    localStorage.setItem(SESSION_KEY, payload);
    setCookie('muno_active_session', payload, 30);
  } catch {}
}

export function loadSession() {
  let data = null;
  try {
    data = localStorage.getItem(SESSION_KEY);
    if (!data) data = getCookie('muno_active_session');
    if (data) return JSON.parse(data);
  } catch {}
  return null;
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
    setCookie('muno_active_session', '', -1);
  } catch {}
}

export function saveUsername(username) {
  try {
    localStorage.setItem(USERNAME_KEY, username);
    setCookie('muno_saved_username', username, 365);
  } catch {}
}

export function loadUsername() {
  try {
    return localStorage.getItem(USERNAME_KEY) || getCookie('muno_saved_username') || '';
  } catch {}
  return '';
}
