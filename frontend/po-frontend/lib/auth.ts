import { User } from '@/types';

const TOKEN_KEY = 'access_token';
const USER_KEY = 'user';

export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  document.cookie = `access_token=${token}; path=/; SameSite=Strict`;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  document.cookie = 'access_token=; path=/; max-age=0';
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
