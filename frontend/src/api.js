const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5280';

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Request failed');
  }

  if (res.status === 204) return null;
  return res.json();
}

export function getToken() {
  return localStorage.getItem('lb_token');
}

function decodeJwtPayload(token) {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  try {
    const json = atob(payload);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getUserRole() {
  const token = getToken();
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  return (
    payload.role ||
    payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
    null
  );
}

export function getUserId() {
  const token = getToken();
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  return (
    payload.sub ||
    payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
    payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/nameidentifier'] ||
    null
  );
}

export function isAdmin() {
  return getUserRole() === 'admin';
}

export function setToken(token) {
  localStorage.setItem('lb_token', token);
}

export function clearToken() {
  localStorage.removeItem('lb_token');
}
