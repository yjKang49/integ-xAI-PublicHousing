// apps/mobile-app/src/app/core/auth/auth.service.ts
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
        const payload = res.data ?? res;
        this.authStore.setAuth({
          accessToken: payload.accessToken,
          refreshToken: payload.refreshToken,
          user: payload.user,
        });
      }),
    );
  }

  logout() {
    const refreshToken = this.authStore.refreshToken();
    if (refreshToken) {
      this.http.post(`${this.base}/logout`, { refreshToken }).subscribe();
    }
    this.authStore.clearAuth();
    this.router.navigate(['/login']);
  }

  refreshToken() {
    const refreshToken = this.authStore.refreshToken();
    if (!refreshToken) return throwError(() => new Error('No refresh token'));

    return this.http.post<any>(`${this.base}/refresh`, { refreshToken }).pipe(
      tap((res) => {
        const payload = res.data ?? res;
        this.authStore.updateTokens(payload.accessToken, payload.refreshToken);
      }),
      catchError((err) => {
        this.authStore.clearAuth();
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
      try {
        const user = JSON.parse(userJson);
        this.authStore.setAuth({ accessToken, refreshToken: refreshToken ?? '', user });
      } catch {}
    }
  }
}
