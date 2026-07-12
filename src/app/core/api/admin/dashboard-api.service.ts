import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

export interface DashboardProductSummary {
  productId: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  imageUrl: string;
}

export interface DashboardInventoryItem {
  productId: string;
  availableQuantity: number;
}

export interface DashboardSummary {
  totalProducts: number;
  products: DashboardProductSummary[];
  totalInventoryItems: number;
  inventoryItems: DashboardInventoryItem[];
}

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly http = inject(HttpClient);

  summary(): Observable<ApiResponse<DashboardSummary>> {
    return this.http.get<ApiResponse<DashboardSummary>>('/api/admin/dashboard');
  }
}
