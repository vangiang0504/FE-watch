import { Injectable } from '@angular/core';
import { TokenResponse } from '../api/identity/identity-api.service';

const ACCESS_TOKEN_KEY = 'watch.accessToken';
const ACCESS_TOKEN_EXPIRES_AT_KEY = 'watch.accessTokenExpiresAt';
const LEGACY_REFRESH_TOKEN_KEY = 'watch.refreshToken';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  getAccessToken(): string | null {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY);
  }

  save(tokens: TokenResponse): void {
    sessionStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
    sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    sessionStorage.setItem(ACCESS_TOKEN_EXPIRES_AT_KEY, String(Date.now() + tokens.expiresInSeconds * 1000));
  }

  clear(): void {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(ACCESS_TOKEN_EXPIRES_AT_KEY);
    sessionStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
  }
}
