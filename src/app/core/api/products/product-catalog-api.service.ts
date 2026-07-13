import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

export interface CatalogProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  price: number;
  imageUrl: string;
  deleted: boolean;
}

export interface CatalogProductDetail extends CatalogProduct {
  createdAt: string;
  updatedAt: string;
}

export interface CatalogSearchParams {
  keyword?: string;
  brand?: string;
  category?: string;
  page?: number;
  size?: number;
}

/**
 * Calls Product Service's public read endpoints (/api/products) directly -
 * unlike ProductsApiService (admin proxy), this is the customer-facing
 * catalog and requires no admin role. Routed through API Gateway.
 */
@Injectable({ providedIn: 'root' })
export class ProductCatalogApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/products';

  list(page = 0, size = 20): Observable<ApiResponse<CatalogProduct[]>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<ApiResponse<CatalogProduct[]>>(this.baseUrl, { params });
  }

  getById(id: string): Observable<ApiResponse<CatalogProductDetail>> {
    return this.http.get<ApiResponse<CatalogProductDetail>>(`${this.baseUrl}/${id}`);
  }

  search(params: CatalogSearchParams): Observable<ApiResponse<CatalogProduct[]>> {
    let httpParams = new HttpParams()
      .set('page', params.page ?? 0)
      .set('size', params.size ?? 20);

    if (params.keyword) {
      httpParams = httpParams.set('keyword', params.keyword);
    }
    if (params.brand) {
      httpParams = httpParams.set('brand', params.brand);
    }
    if (params.category) {
      httpParams = httpParams.set('category', params.category);
    }

    return this.http.get<ApiResponse<CatalogProduct[]>>(`${this.baseUrl}/search`, { params: httpParams });
  }
}
