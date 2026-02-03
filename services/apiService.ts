import { ApiKeys } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

function getToken(): string | null {
  return sessionStorage.getItem('zubenkoai_token');
}

function setToken(token: string) {
  sessionStorage.setItem('zubenkoai_token', token);
}

function setAdmin(isAdmin: boolean) {
  sessionStorage.setItem('zubenkoai_admin', isAdmin ? '1' : '0');
}

export function isAdminUser(): boolean {
  return sessionStorage.getItem('zubenkoai_admin') === '1';
}

export const apiService = {
  clearToken() {
    sessionStorage.removeItem('zubenkoai_token');
    sessionStorage.removeItem('zubenkoai_admin');
  },
  async login(username: string, password: string): Promise<{ isAdmin: boolean }> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const text = await res.text();
  let data: { token?: string; isAdmin?: boolean; error?: string } = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('Server-Antwort ungültig. Bitte Seite neu laden.');
    }
  }
  if (!res.ok) {
    throw new Error(data.error || 'Anmeldung fehlgeschlagen');
  }
  if (!data.token) {
    throw new Error('Anmeldung fehlgeschlagen. Kein Token erhalten.');
  }
  setToken(data.token);
  setAdmin(!!data.isAdmin);
  return { isAdmin: !!data.isAdmin };
  },
  async getConfig(): Promise<ApiKeys> {
  const token = getToken();
  if (!token) throw new Error('Nicht angemeldet');
  const res = await fetch(`${API_BASE}/api/config`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  if (res.status === 401) {
    this.clearToken();
    throw new Error('Sitzung abgelaufen');
  }
  if (!res.ok) throw new Error('Konfiguration konnte nicht geladen werden');
  if (!text) return { elevenLabsKey: '', elevenLabsAgentId: '', n8nWebhookUrl: '', n8nApiKey: '' };
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Konfiguration konnte nicht geladen werden.');
  }
  },
  async getMe(): Promise<{ isAdmin: boolean }> {
    const token = getToken();
    if (!token) throw new Error('Nicht angemeldet');
    const res = await fetch(`${API_BASE}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) { this.clearToken(); throw new Error('Sitzung abgelaufen'); }
    if (!res.ok) throw new Error('Fehler');
    const data = await res.json();
    setAdmin(!!data.isAdmin);
    return data;
  },
  async getAdminUsers(): Promise<AdminUser[]> {
    const token = getToken();
    if (!token) throw new Error('Nicht angemeldet');
    const res = await fetch(`${API_BASE}/api/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) { this.clearToken(); throw new Error('Sitzung abgelaufen'); }
    if (res.status === 403) throw new Error('Admin-Rechte erforderlich');
    if (!res.ok) throw new Error('Benutzer konnten nicht geladen werden');
    return res.json();
  },
  async createUser(username: string, password: string): Promise<{ id: number; username: string }> {
    const token = getToken();
    if (!token) throw new Error('Nicht angemeldet');
    const res = await fetch(`${API_BASE}/api/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (res.status === 401) { this.clearToken(); throw new Error('Sitzung abgelaufen'); }
    if (res.status === 403) throw new Error('Admin-Rechte erforderlich');
    if (!res.ok) throw new Error(data.error || 'Benutzer konnte nicht erstellt werden');
    return data;
  },
  async updateUser(id: number, data: { password?: string; isLocked?: boolean; isAdmin?: boolean }): Promise<void> {
    const token = getToken();
    if (!token) throw new Error('Nicht angemeldet');
    const res = await fetch(`${API_BASE}/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (res.status === 401) { this.clearToken(); throw new Error('Sitzung abgelaufen'); }
    if (res.status === 403) throw new Error('Admin-Rechte erforderlich');
    if (!res.ok) throw new Error(json.error || 'Änderung fehlgeschlagen');
  },
  async getUserConfig(userId: number): Promise<ApiKeys> {
    const token = getToken();
    if (!token) throw new Error('Nicht angemeldet');
    const res = await fetch(`${API_BASE}/api/admin/users/${userId}/config`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) { this.clearToken(); throw new Error('Sitzung abgelaufen'); }
    if (res.status === 403) throw new Error('Admin-Rechte erforderlich');
    if (!res.ok) throw new Error('Konfiguration konnte nicht geladen werden');
    return res.json();
  },
  async setUserConfig(userId: number, config: Partial<ApiKeys>): Promise<void> {
    const token = getToken();
    if (!token) throw new Error('Nicht angemeldet');
    const res = await fetch(`${API_BASE}/api/admin/users/${userId}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(config),
    });
    if (res.status === 401) { this.clearToken(); throw new Error('Sitzung abgelaufen'); }
    if (res.status === 403) throw new Error('Admin-Rechte erforderlich');
    if (!res.ok) throw new Error('Konfiguration konnte nicht gespeichert werden');
  },
};

export interface AdminUser {
  id: number;
  username: string;
  isAdmin: boolean;
  isLocked: boolean;
  createdAt: string;
}
