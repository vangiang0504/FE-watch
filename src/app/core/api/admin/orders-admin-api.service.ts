import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

export interface AdminOrder {
  orderId: string | number;
  userId: string | number;
  status: string;
  totalAmount: number;
  shippingAddress: string;
  shippingFee?: number;
  paymentUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class OrdersAdminApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/orders';

  list(): Observable<ApiResponse<AdminOrder[]>> {
    return this.http.get<ApiResponse<AdminOrder[]>>(this.baseUrl);
  }
}
