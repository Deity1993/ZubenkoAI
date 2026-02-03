import { ApiKeys } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

function getToken(): string | null {
  return sessionStorage.getItem('zubenkoai_token');
}

function setToken(token: string) {
  sessionStorage.setItem('zubenkoai_token', token);
}

export const apiService = {
  clearToken() {
    sessionStorage.removeItem('zubenkoai_token');
  },
  async login(username: string, password: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Anmeldung fehlgeschlagen');
  }
  setToken(data.token);
  },
  async getConfig(): Promise<ApiKeys> {
  const token = getToken();
  if (!token) throw new Error('Nicht angemeldet');
  const res = await fetch(`${API_BASE}/api/config`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    this.clearToken();
    throw new Error('Sitzung abgelaufen');
  }
  if (!res.ok) throw new Error('Konfiguration konnte nicht geladen werden');
  return res.json();
  },
};
