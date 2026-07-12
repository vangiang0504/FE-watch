import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

export interface InventoryItem {
  productId: string;
  availableQuantity: number;
}

/**
 * Calls Admin Service's proxy endpoint (/api/admin/inventory) so Admin never
 * bypasses the service that owns the data - mirrors ProductsApiService.
 */
@Injectable({ providedIn: 'root' })
export class InventoryAdminApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/admin/inventory';

  list(): Observable<ApiResponse<InventoryItem[]>> {
    return this.http.get<ApiResponse<InventoryItem[]>>(this.baseUrl);
  }
}
