import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { IdentityApiService, RegisterRequest, TokenResponse } from '../api/identity/identity-api.service';
import { TokenStorageService } from './token-storage.service';

interface JwtClaims {
  role?: string;
  email?: string;
}

function decodeClaims(accessToken: string | null): JwtClaims {
  if (!accessToken) {
    return {};
  }

  try {
    const payload = accessToken.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as JwtClaims;
  } catch {
    return {};
  }
}

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly identityApi = inject(IdentityApiService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly accessToken = signal(this.tokenStorage.getAccessToken());

  private readonly claims = computed(() => decodeClaims(this.accessToken()));

  readonly isAuthenticated = computed(() => Boolean(this.accessToken()));
  readonly role = computed(() => this.claims().role ?? null);
  readonly isAdmin = computed(() => this.role() === 'ADMIN');
  readonly email = computed(() => this.claims().email ?? null);

  readonly currentUser = computed(() => {
    const token = this.accessToken();
    if (!token) return null;
    try {
      const payload = token.split('.')[1];
      // Decode base64url safely
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const parsed = JSON.parse(jsonPayload) as { sub: string; email: string; role: string };
      return {
        id: Number(parsed.sub),
        email: parsed.email,
        role: parsed.role,
      };
    } catch (e) {
      console.error('Error decoding auth token:', e);
      return null;
    }
  });


  login(email: string, password: string): Observable<TokenResponse> {
    return this.identityApi.login(email, password).pipe(
      map((response) => response.data),
      tap((tokens) => this.saveTokens(tokens)),
    );
  }

  loginWithGoogle(idToken: string): Observable<TokenResponse> {
    return this.identityApi.loginWithGoogle(idToken).pipe(
      map((response) => response.data),
      tap((tokens) => this.saveTokens(tokens)),
    );
  }

  refresh(): Observable<TokenResponse> {
    return this.identityApi.refresh().pipe(
      map((response) => response.data),
      tap((tokens) => this.saveTokens(tokens)),
    );
  }

  register(request: RegisterRequest): Observable<unknown> {
    return this.identityApi.register(request).pipe(map((response) => response.data));
  }

  logout(): Observable<void> {
    const accessToken = this.tokenStorage.getAccessToken();

    if (!accessToken) {
      this.logoutLocal();
      return of(void 0);
    }

    return this.identityApi.logout(accessToken).pipe(
      catchError(() => of(null)),
      tap(() => this.logoutLocal()),
      map(() => void 0),
    );
  }

  logoutLocal(): void {
    this.tokenStorage.clear();
    this.accessToken.set(null);
  }

  private saveTokens(tokens: TokenResponse): void {
    this.tokenStorage.save(tokens);
    this.accessToken.set(tokens.accessToken);
  }
}
