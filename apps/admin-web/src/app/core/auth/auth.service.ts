// apps/admin-web/src/app/core/auth/auth.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError, throwError } from 'rxjs';
import { AuthStore } from '../store/auth.store';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly authStore = inject(AuthStore);
  private readonly base = `${environment.apiUrl}/auth`;

  login(email: string, password: string) {
    return this.http.post<any>(`${this.base}/login`, { email, password }).pipe(
      tap((res) => {
        this.authStore.setAuth(res.data);
        this.persistTokens(res.data.accessToken, res.data.refreshToken);
      }),
    );
  }

  // ⚠️ TEMP — 외부 공개 미리보기용 자동 로그인 (시드된 ORG_ADMIN 계정).
  // 운영 전환 시 이 메서드와 auth.guard 의 호출부를 함께 제거할 것.
  autoLogin() {
    return this.login('admin@happy-housing.kr', 'Admin@1234');
  }

  logout() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      this.http.post(`${this.base}/logout`, { refreshToken }).subscribe();
    }
    this.clearSession();
    this.router.navigate(['/login']);
  }

  refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return throwError(() => new Error('No refresh token'));

    return this.http.post<any>(`${this.base}/refresh`, { refreshToken }).pipe(
      tap((res) => {
        this.persistTokens(res.data.accessToken, res.data.refreshToken);
        this.authStore.updateTokens(res.data.accessToken, res.data.refreshToken);
      }),
      catchError((err) => {
        this.clearSession();
        this.router.navigate(['/login']);
        return throwError(() => err);
      }),
    );
  }

  restoreSession() {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const userJson = localStorage.getItem('user');
    if (accessToken && userJson) {
      const user = JSON.parse(userJson);
      this.authStore.setAuth({ accessToken, refreshToken: refreshToken ?? '', user });
    }
  }

  private persistTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  private clearSession() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    this.authStore.clearAuth();
  }
}
