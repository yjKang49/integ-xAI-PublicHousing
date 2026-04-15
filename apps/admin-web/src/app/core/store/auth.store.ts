// apps/admin-web/src/app/core/store/auth.store.ts
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { UserRole } from '@ax/shared';

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    organizationId: string;
    assignedComplexIds: string[];
  } | null;
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
    setAuth(payload: { accessToken: string; refreshToken: string; user: AuthState['user'] }) {
      patchState(store, {
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
        user: payload.user,
        isAuthenticated: true,
      });
      localStorage.setItem('user', JSON.stringify(payload.user));
    },
    updateTokens(accessToken: string, refreshToken: string) {
      patchState(store, { accessToken, refreshToken });
    },
    clearAuth() {
      patchState(store, initialState);
    },
    hasRole(...roles: UserRole[]): boolean {
      const role = store.user()?.role;
      return role ? roles.includes(role) : false;
    },
    isSuperAdmin(): boolean {
      return store.user()?.role === UserRole.SUPER_ADMIN;
    },
  })),
);
