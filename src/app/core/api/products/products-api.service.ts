import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

export interface ProductSummary {
  productId: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  imageUrl: string;
}

export interface ProductDetail extends ProductSummary {
  id: string;
  description: string;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductRequest {
  name: string;
  brand: string;
  category: string;
  description: string;
  price: number;
  imageUrl: string;
}

export type UpdateProductRequest = CreateProductRequest;

/**
 * Calls Admin Service's proxy endpoints (/api/admin/products) rather than
 * Product Service directly - Admin never bypasses the service that owns the
 * data (FR35). Requires API Gateway to route /api/admin/** to admin-service
 * (not configured yet as of this writing - see team notes).
 */
@Injectable({ providedIn: 'root' })
export class ProductsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/admin/products';

  list(): Observable<ApiResponse<ProductSummary[]>> {
    return this.http.get<ApiResponse<ProductSummary[]>>(this.baseUrl);
  }

  create(request: CreateProductRequest): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(this.baseUrl, request);
  }

  update(productId: string, request: UpdateProductRequest): Observable<ApiResponse<string>> {
    return this.http.put<ApiResponse<string>>(`${this.baseUrl}/${productId}`, request);
  }

  changePrice(productId: string, newPrice: number): Observable<ApiResponse<string>> {
    return this.http.put<ApiResponse<string>>(`${this.baseUrl}/${productId}/price`, newPrice);
  }

  delete(productId: string): Observable<ApiResponse<string>> {
    return this.http.delete<ApiResponse<string>>(`${this.baseUrl}/${productId}`);
  }
}
