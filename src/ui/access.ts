import { UserRole } from '../types/auth';

export function canWrite(role: UserRole): boolean {
  return role === 'administrator' || role === 'research_manager';
}

export function canDesign(role: UserRole): boolean {
  return role === 'administrator';
}

export function roleLabel(role: UserRole): string {
  if (role === 'administrator') return 'Administrator';
  if (role === 'research_manager') return 'Research Manager';
  if (role === 'researcher') return 'Researcher';
  return 'Read-only';
}
