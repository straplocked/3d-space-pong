/**
 * Browser-only persistent state for the current sign-up session.
 * We cache the userId in localStorage so users don't have to sign up
 * on every match. They can clear it via "Sign out" on the menu (future).
 */
export interface CurrentUser {
  userId: number;
  displayName: string;
}

const KEY = "3d-pong:user";

export function getCurrentUser(): CurrentUser | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CurrentUser;
    if (
      typeof parsed.userId === "number" &&
      typeof parsed.displayName === "string"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: CurrentUser): void {
  localStorage.setItem(KEY, JSON.stringify(user));
}

export function clearCurrentUser(): void {
  localStorage.removeItem(KEY);
}
