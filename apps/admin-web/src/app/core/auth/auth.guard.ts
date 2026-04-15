// apps/admin-web/src/app/core/auth/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { AuthStore } from '../store/auth.store';

export const authGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const authService = inject(AuthService);
  const router = inject(Router);

  // Signal store has session (normal navigation within session)
  if (authStore.isAuthenticated()) return true;

  // Not in store — try restoring from localStorage (page refresh case)
  authService.restoreSession();
  if (authStore.isAuthenticated()) return true;

  router.navigate(['/login']);
  return false;
};
