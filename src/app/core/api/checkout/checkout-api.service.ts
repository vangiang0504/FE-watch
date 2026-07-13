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
  userId: string | number;
  items: OrderItemRequest[];
  shippingAddress: string;
}

export interface OrderResponse {
  orderId: string | number;
  userId: string | number;
  status: string;
  totalAmount: number;
  shippingAddress: string;
  shippingFee?: number;
  paymentUrl?: string;
  confirmAvailableAt?: string;
}

export interface ShippingFeeRule {
  regionCode: string;
  regionName: string;
  fee: number;
  remoteFee: number | null;
}

@Injectable({ providedIn: 'root' })
export class CheckoutApiService {
  private readonly http = inject(HttpClient);

  createOrder(request: CreateOrderRequest): Observable<ApiResponse<OrderResponse>> {
    return this.http.post<ApiResponse<OrderResponse>>('/api/v1/orders', request);
  }

  getOrder(orderId: string | number): Observable<ApiResponse<OrderResponse>> {
    return this.http.get<ApiResponse<OrderResponse>>(`/api/v1/orders/${orderId}`);
  }

  getMyOrders(): Observable<ApiResponse<OrderResponse[]>> {
    return this.http.get<ApiResponse<OrderResponse[]>>('/api/v1/orders/me');
  }

  confirmReceived(orderId: string | number): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`/api/v1/orders/${orderId}/confirm-received`, {});
  }

  getShippingFees(): Observable<ShippingFeeRule[]> {
    return this.http.get<ShippingFeeRule[]>('/api/v1/shipping/fees');
  }
}
