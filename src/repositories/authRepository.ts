import { Session } from '../types/auth';
import { api } from './api';
import { session, StoredSession } from './session';

export const authRepository = {
  current(): StoredSession | null {
    return session.get();
  },
  store(value: Session, remember: boolean) {
    session.store(value, remember);
  },
  async login(username: string, password: string): Promise<Session> {
    return api<Session>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
  },
  async logout(): Promise<void> {
    try {
      await api<void>('/auth/logout', { method: 'POST' });
    } finally {
      session.clear();
    }
  },
};
