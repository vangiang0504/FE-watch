import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, finalize, Observable, shareReplay, switchMap, throwError } from 'rxjs';
import { AuthStore } from '../auth/auth.store';
import { TokenStorageService } from '../auth/token-storage.service';
import { TokenResponse } from '../api/identity/identity-api.service';

const PUBLIC_ENDPOINTS = [
  '/auth/login', '/auth/google', '/auth/register', '/auth/refresh', '/auth/logout',
  '/api/products', '/api/inventory',
];
let refreshRequest$: Observable<TokenResponse> | null = null;

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthStore);
  const tokenStorage = inject(TokenStorageService);
  const token = tokenStorage.getAccessToken();
  const isPublicRequest = PUBLIC_ENDPOINTS.some((endpoint) => request.url.includes(endpoint));

  if (!token || isPublicRequest) {
    return next(request);
  }

  const authenticatedRequest = request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      refreshRequest$ ??= auth.refresh().pipe(
        finalize(() => {
          refreshRequest$ = null;
        }),
        shareReplay(1),
      );

      return refreshRequest$.pipe(
        catchError((refreshError: unknown) => {
          auth.logoutLocal();
          return throwError(() => refreshError);
        }),
        switchMap((tokens) => next(request.clone({
          setHeaders: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        }))),
      );
    }),
  );
};
