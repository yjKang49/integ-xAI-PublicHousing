// apps/mobile-app/src/app/core/http/auth.interceptor.ts
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError, BehaviorSubject, switchMap, filter, take, catchError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { AuthStore } from '../store/auth.store';
import { environment } from '../../../environments/environment';

let isRefreshing = false;
const refreshSubject = new BehaviorSubject<string | null>(null);

const API_BASE = environment.apiUrl;

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const authStore = inject(AuthStore);
  const http = inject(HttpClient);
  const token = authStore.accessToken();

  const authReq = token ? addToken(req, token) : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !req.url.includes('/auth/')) {
        return handle401(req, next, authStore, http);
      }
      return throwError(() => err);
    }),
  );
};

function addToken(req: HttpRequest<unknown>, token: string) {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authStore: InstanceType<typeof AuthStore>,
  http: HttpClient,
) {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshSubject.next(null);

    const refreshToken = authStore.refreshToken();
    if (!refreshToken) {
      isRefreshing = false;
      authStore.clearAuth();
      return throwError(() => new Error('No refresh token'));
    }

    return http.post<any>(`${API_BASE}/auth/refresh`, { refreshToken }).pipe(
      switchMap((res: any) => {
        isRefreshing = false;
        const newAccess  = res.data?.accessToken  ?? res.accessToken;
        const newRefresh = res.data?.refreshToken ?? res.refreshToken;
        authStore.updateTokens(newAccess, newRefresh);
        refreshSubject.next(newAccess);
        return next(addToken(req, newAccess));
      }),
      catchError((err) => {
        isRefreshing = false;
        authStore.clearAuth();
        return throwError(() => err);
      }),
    );
  }

  return refreshSubject.pipe(
    filter((token): token is string => token !== null),
    take(1),
    switchMap((token) => next(addToken(req, token))),
  );
}
