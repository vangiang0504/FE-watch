import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  fullName?: string;
  phone?: string;
}

export interface TokenResponse {
  accessToken: string;
  expiresInSeconds: number;
}

@Injectable({ providedIn: 'root' })
export class IdentityApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/auth';

  register(request: RegisterRequest): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(`${this.baseUrl}/register`, request);
  }

  login(email: string, password: string): Observable<ApiResponse<TokenResponse>> {
    return this.http.post<ApiResponse<TokenResponse>>(`${this.baseUrl}/login`, { email, password }, { withCredentials: true });
  }

  loginWithGoogle(idToken: string): Observable<ApiResponse<TokenResponse>> {
    return this.http.post<ApiResponse<TokenResponse>>(`${this.baseUrl}/google`, { idToken }, { withCredentials: true });
  }

  refresh(): Observable<ApiResponse<TokenResponse>> {
    return this.http.post<ApiResponse<TokenResponse>>(`${this.baseUrl}/refresh`, {}, { withCredentials: true });
  }

  logout(accessToken: string): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/logout`, {}, {
      headers: { Authorization: `Bearer ${accessToken}` },
      withCredentials: true,
    });
  }
}
