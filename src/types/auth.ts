export type UserRole = 'administrator' | 'research_manager' | 'researcher' | 'readonly';

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
}

export interface Session extends AuthUser {
  token: string;
}

export interface RosterEntry {
  username: string;
  fullName: string;
  role: UserRole;
  label: string;
}
