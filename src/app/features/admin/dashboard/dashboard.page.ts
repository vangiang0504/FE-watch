import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AuthStore } from '../../../core/auth/auth.store';
import {
  DashboardApiService,
  DashboardInventoryItem,
  DashboardProductSummary,
} from '../../../core/api/admin/dashboard-api.service';

interface LowStockRow {
  productId: string;
  name: string;
  brand: string;
  imageUrl: string;
  availableQuantity: number;
}

interface BrandBreakdownRow {
  brand: string;
  count: number;
  barPercent: number;
}

const LOW_STOCK_THRESHOLD = 5;
const BRAND_BREAKDOWN_LIMIT = 6;

@Component({
  selector: 'app-admin-dashboard-page',
  imports: [DecimalPipe],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly api = inject(DashboardApiService);
  private readonly auth = inject(AuthStore);

  protected readonly adminEmail = this.auth.email;
  protected readonly adminInitial = computed(() => (this.auth.email() ?? '?').charAt(0).toUpperCase());

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly totalProducts = signal(0);
  protected readonly totalInventoryItems = signal(0);
  protected readonly products = signal<DashboardProductSummary[]>([]);
  protected readonly inventoryItems = signal<DashboardInventoryItem[]>([]);

  private readonly productsById = computed(
    () => new Map(this.products().map((product) => [product.productId, product])),
  );

  protected readonly outOfStockCount = computed(
    () => this.inventoryItems().filter((item) => item.availableQuantity <= 0).length,
  );

  protected readonly inventoryValue = computed(() => {
    const byId = this.productsById();
    return this.inventoryItems().reduce((sum, item) => {
      const price = byId.get(item.productId)?.price ?? 0;
      return sum + price * item.availableQuantity;
    }, 0);
  });

  protected readonly lowStockRows = computed<LowStockRow[]>(() => {
    const byId = this.productsById();

    return this.inventoryItems()
      .filter((item) => item.availableQuantity <= LOW_STOCK_THRESHOLD)
      .map((item) => {
        const product = byId.get(item.productId);
        return {
          productId: item.productId,
          name: product?.name ?? item.productId,
          brand: product?.brand ?? '—',
          imageUrl: product?.imageUrl ?? '',
          availableQuantity: item.availableQuantity,
        };
      })
      .sort((a, b) => a.availableQuantity - b.availableQuantity)
      .slice(0, 6);
  });

  protected readonly brandBreakdown = computed<BrandBreakdownRow[]>(() => {
    const products = this.products();
    if (products.length === 0) {
      return [];
    }

    const counts = new Map<string, number>();
    for (const product of products) {
      const brand = product.brand?.trim() || 'Khác';
      counts.set(brand, (counts.get(brand) ?? 0) + 1);
    }

    const maxCount = Math.max(...counts.values());

    return [...counts.entries()]
      .map(([brand, count]) => ({ brand, count, barPercent: Math.round((count / maxCount) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, BRAND_BREAKDOWN_LIMIT);
  });

  constructor() {
    this.reload();
  }

  protected reload(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.api.summary().subscribe({
      next: (response) => {
        this.totalProducts.set(response.data.totalProducts);
        this.totalInventoryItems.set(response.data.totalInventoryItems);
        this.products.set(response.data.products);
        this.inventoryItems.set(response.data.inventoryItems);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Không tải được dashboard. Kiểm tra Gateway/Admin Service đã chạy chưa.');
        this.loading.set(false);
      },
    });
  }
}
