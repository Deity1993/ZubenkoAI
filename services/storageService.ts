import { ApiKeys } from '../types';

const CONFIG_KEY = 'voice_orchestrator_config';
const SALT_KEY = 'voice_orchestrator_salt';
const HASH_KEY = 'voice_orchestrator_hash';

const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 256;

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

function base64Encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function base64Decode(str: string): Uint8Array {
  return new Uint8Array(atob(str).split('').map((c) => c.charCodeAt(0)));
}

export const storageService = {
  hasStoredConfig: (): boolean => {
    return !!localStorage.getItem(CONFIG_KEY);
  },

  /** Migration: Alte unverschlüsselte Daten laden (falls vorhanden) */
  getLegacyKeys: (): ApiKeys | null => {
    if (localStorage.getItem(HASH_KEY)) return null; // Bereits migriert
    const data = localStorage.getItem(CONFIG_KEY);
    if (!data) return null;
    try {
      const parsed = JSON.parse(data);
      if (parsed?.elevenLabsKey !== undefined) return parsed as ApiKeys;
    } catch {}
    return null;
  },

  clearLegacyConfig: () => {
    localStorage.removeItem(CONFIG_KEY);
  },

  saveKeys: async (keys: ApiKeys, password: string): Promise<void> => {
    const salt = generateRandomBytes(SALT_LENGTH);
    const iv = generateRandomBytes(IV_LENGTH);
    const key = await deriveKey(password, salt);

    const encoder = new TextEncoder();
    const plaintext = encoder.encode(JSON.stringify(keys));

    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      plaintext
    );

    const hash = await hashPassword(password);
    localStorage.setItem(SALT_KEY, base64Encode(salt));
    localStorage.setItem(HASH_KEY, hash);
    localStorage.setItem(CONFIG_KEY, JSON.stringify({
      iv: base64Encode(iv),
      data: base64Encode(new Uint8Array(ciphertext)),
    }));
  },

  getKeys: async (password: string): Promise<ApiKeys | null> => {
    const configStr = localStorage.getItem(CONFIG_KEY);
    const saltStr = localStorage.getItem(SALT_KEY);
    if (!configStr || !saltStr) return null;

    try {
      const { iv, data } = JSON.parse(configStr);
      const salt = base64Decode(saltStr);
      const ivBytes = base64Decode(iv);
      const ciphertext = base64Decode(data);

      const key = await deriveKey(password, salt);
      const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivBytes },
        key,
        ciphertext
      );

      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(plaintext)) as ApiKeys;
    } catch {
      return null;
    }
  },

  verifyPassword: async (password: string): Promise<boolean> => {
    const storedHash = localStorage.getItem(HASH_KEY);
    if (!storedHash) return false;
    const hash = await hashPassword(password);
    return hash === storedHash;
  },

  clearKeys: () => {
    localStorage.removeItem(CONFIG_KEY);
    localStorage.removeItem(SALT_KEY);
    localStorage.removeItem(HASH_KEY);
  },

  setAuthenticated: () => {
    sessionStorage.setItem('voice_orchestrator_session', 'active');
  },

  isAuthenticated: (): boolean => {
    return sessionStorage.getItem('voice_orchestrator_session') === 'active';
  },

  logout: () => {
    sessionStorage.removeItem('voice_orchestrator_session');
  },
};
