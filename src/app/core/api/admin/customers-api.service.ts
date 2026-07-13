import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface AdminCustomer { id: string | number; email: string; username: string; fullName: string | null; phone: string | null; role: string; status: string; }

@Injectable({ providedIn: 'root' })
export class CustomersApiService {
  private readonly http = inject(HttpClient);
  list(): Observable<{ code: string; message: string; data: AdminCustomer[] }> {
    return this.http.get<{ code: string; message: string; data: AdminCustomer[] }>('/api/v1/admin/customers');
  }

  delete(userId: string | number): Observable<{ code: string; message: string; data: string }> {
    return this.http.delete<{ code: string; message: string; data: string }>(`/api/v1/admin/customers/${userId}`);
  }
}
