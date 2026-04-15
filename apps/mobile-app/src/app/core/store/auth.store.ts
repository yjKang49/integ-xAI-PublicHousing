// apps/mobile-app/src/app/core/store/auth.store.ts
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';

interface AuthUser {
  _id?: string;
  id?: string;
  email: string;
  name: string;
  role: string;
  organizationId: string | null;
  assignedComplexIds: string[];
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
};

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => ({
    setAuth(data: { accessToken: string; refreshToken: string; user: AuthUser }) {
      patchState(store, {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
        isAuthenticated: true,
      });
      // Persist to survive app reload
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
    },
    updateTokens(accessToken: string, refreshToken: string) {
      patchState(store, { accessToken, refreshToken });
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    },
    clearAuth() {
      patchState(store, initialState);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    },
    hasRole(...roles: string[]): boolean {
      const role = store.user()?.role;
      return role ? roles.includes(role) : false;
    },
  })),
);
