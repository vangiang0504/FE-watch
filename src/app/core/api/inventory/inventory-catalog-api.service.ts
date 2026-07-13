import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

export interface InventoryStock {
  productId: string;
  availableQuantity: number;
}

/**
 * Calls Inventory Service's public read endpoint (/api/inventory/{productId})
 * directly. productId now shares the same String/UUID identity space as
 * Product Service, so this can be looked up 1:1 for a given catalog product.
 */
@Injectable({ providedIn: 'root' })
export class InventoryCatalogApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/inventory';

  getByProductId(productId: string): Observable<ApiResponse<InventoryStock>> {
    return this.http.get<ApiResponse<InventoryStock>>(`${this.baseUrl}/${productId}`);
  }
}
