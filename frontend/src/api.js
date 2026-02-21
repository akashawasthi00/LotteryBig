const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5280';

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('lb_token');
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

export function setToken(token) {
  localStorage.setItem('lb_token', token);
}

export function clearToken() {
  localStorage.removeItem('lb_token');
}
