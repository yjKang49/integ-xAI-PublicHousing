// apps/mobile-app/src/app/core/auth/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../store/auth.store';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authStore.isAuthenticated()) return true;

  // Restore from localStorage (page refresh / app reopen)
  authService.restoreSession();
  if (authStore.isAuthenticated()) return true;

  router.navigate(['/login']);
  return false;
};
