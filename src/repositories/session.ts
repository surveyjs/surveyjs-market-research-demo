import { AuthUser } from '../types/auth';

const STORAGE_KEY = 'acme-research-session';

export interface StoredSession extends AuthUser {
  token: string;
}

function read(storage: Storage): StoredSession | null {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export const session = {
  get(): StoredSession | null {
    return read(window.localStorage) ?? read(window.sessionStorage);
  },
  getToken(): string {
    return session.get()?.token ?? '';
  },
  store(value: StoredSession, remember: boolean) {
    const target = remember ? window.localStorage : window.sessionStorage;
    const other = remember ? window.sessionStorage : window.localStorage;
    target.setItem(STORAGE_KEY, JSON.stringify(value));
    other.removeItem(STORAGE_KEY);
  },
  clear() {
    window.localStorage.removeItem(STORAGE_KEY);
    window.sessionStorage.removeItem(STORAGE_KEY);
  },
};
