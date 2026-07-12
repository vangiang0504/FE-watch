import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { InventoryCatalogApiService } from '../../core/api/inventory/inventory-catalog-api.service';
import { CatalogProductDetail, ProductCatalogApiService } from '../../core/api/products/product-catalog-api.service';

@Component({
  selector: 'app-product-detail-page',
  imports: [DecimalPipe, RouterLink],
  templateUrl: './product-detail.page.html',
  styleUrl: './product-detail.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly productApi = inject(ProductCatalogApiService);
  private readonly inventoryApi = inject(InventoryCatalogApiService);

  protected readonly product = signal<CatalogProductDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');

  protected readonly stockQuantity = signal<number | null>(null);
  protected readonly stockChecked = signal(false);

  protected readonly favorited = signal(false);

  constructor() {
    const productId = this.route.snapshot.paramMap.get('id');
    if (!productId) {
      this.errorMessage.set('Không tìm thấy sản phẩm.');
      this.loading.set(false);
      return;
    }
    this.loadProduct(productId);
    this.loadStock(productId);
  }

  private loadProduct(productId: string): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.productApi.getById(productId).subscribe({
      next: (response) => {
        this.product.set(response.data);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Không tải được thông tin sản phẩm. Sản phẩm có thể không tồn tại.');
        this.loading.set(false);
      },
    });
  }

  private loadStock(productId: string): void {
    this.inventoryApi.getByProductId(productId).subscribe({
      next: (response) => {
        this.stockQuantity.set(response.data.availableQuantity);
        this.stockChecked.set(true);
      },
      error: () => {
        this.stockQuantity.set(null);
        this.stockChecked.set(true);
      },
    });
  }

  protected toggleFavorite(): void {
    this.favorited.update((value) => !value);
  }
}
