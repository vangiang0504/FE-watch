import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

export interface OrderItemRequest {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateOrderRequest {
  userId: number;
  items: OrderItemRequest[];
  shippingAddress: string;
}

export interface OrderResponse {
  orderId: number;
  userId: number;
  status: string;
  totalAmount: number;
  shippingAddress: string;
  shippingFee?: number;
  paymentUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class CheckoutApiService {
  private readonly http = inject(HttpClient);

  createOrder(request: CreateOrderRequest): Observable<ApiResponse<OrderResponse>> {
    return this.http.post<ApiResponse<OrderResponse>>('/api/orders', request);
  }

  getOrder(orderId: number): Observable<ApiResponse<OrderResponse>> {
    return this.http.get<ApiResponse<OrderResponse>>(`/api/orders/${orderId}`);
  }

  getMyOrders(): Observable<ApiResponse<OrderResponse[]>> {
    return this.http.get<ApiResponse<OrderResponse[]>>('/api/orders/me');
  }
}
