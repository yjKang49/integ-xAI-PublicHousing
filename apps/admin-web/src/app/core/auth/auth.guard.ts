// apps/admin-web/src/app/core/auth/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
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

  // ⚠️ TEMP — 외부 공개 미리보기용 자동 로그인. 세션이 없으면 시드 ORG_ADMIN 으로 로그인.
  // 운영 전환 시 이 블록 제거 후 router.navigate(['/login']); return false; 로 복원할 것.
  return authService.autoLogin().pipe(
    map(() => true),
    catchError(() => {
      router.navigate(['/login']);
      return of(false);
    }),
  );
};
