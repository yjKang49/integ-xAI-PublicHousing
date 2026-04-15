// apps/admin-web/src/app/core/auth/role.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserRole } from '@ax/shared';
import { AuthStore } from '../store/auth.store';

export const roleGuard =
  (allowedRoles: UserRole[]): CanActivateFn =>
  () => {
    const authStore = inject(AuthStore);
    const router = inject(Router);
    const user = authStore.user();

    if (!user) { router.navigate(['/login']); return false; }
    if (user.role === UserRole.SUPER_ADMIN) return true;
    if (allowedRoles.includes(user.role)) return true;

    router.navigate(['/dashboard']);
    return false;
  };
