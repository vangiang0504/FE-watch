import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogProduct, ProductCatalogApiService } from '../../core/api/products/product-catalog-api.service';

type PriceRange = 'all' | 'under10m' | '10m-200m' | 'over200m';
type SortOption = 'new' | 'price_asc' | 'price_desc';

const PAGE_SIZE = 6;
const SKELETON_COUNT = 6;

@Component({
  selector: 'app-product-list-page',
  imports: [DecimalPipe, RouterLink],
  templateUrl: './product-list.page.html',
  styleUrl: './product-list.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductListPage {
  private readonly api = inject(ProductCatalogApiService);

  protected readonly allProducts = signal<CatalogProduct[]>([]);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly selectedBrands = signal<ReadonlySet<string>>(new Set());
  protected readonly priceRange = signal<PriceRange>('all');
  protected readonly sortBy = signal<SortOption>('new');
  protected readonly page = signal(0);
  protected readonly favorites = signal<ReadonlySet<string>>(new Set());

  protected readonly brands = computed(() => {
    const set = new Set(this.allProducts().map((product) => product.brand).filter(Boolean));
    return Array.from(set).sort();
  });

  protected readonly filtered = computed(() => {
    const brands = this.selectedBrands();
    const range = this.priceRange();

    return this.allProducts().filter((product) => {
      if (brands.size > 0 && !brands.has(product.brand)) {
        return false;
      }
      if (range === 'under10m' && product.price >= 10_000_000) {
        return false;
      }
      if (range === '10m-200m' && (product.price < 10_000_000 || product.price > 200_000_000)) {
        return false;
      }
      if (range === 'over200m' && product.price <= 200_000_000) {
        return false;
      }
      return true;
    });
  });

  protected readonly sorted = computed(() => {
    const items = [...this.filtered()];
    const sort = this.sortBy();

    if (sort === 'price_asc') {
      items.sort((a, b) => a.price - b.price);
    } else if (sort === 'price_desc') {
      items.sort((a, b) => b.price - a.price);
    }
    return items;
  });

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.sorted().length / PAGE_SIZE)));

  protected readonly pageItems = computed(() => {
    const start = this.page() * PAGE_SIZE;
    return this.sorted().slice(start, start + PAGE_SIZE);
  });

  protected readonly skeletonPlaceholders = Array.from({ length: SKELETON_COUNT });

  protected categoryLabel(category: string): string {
    const labels: Record<string, string> = {
      Sport: 'Thể thao',
      Luxury: 'Cao cấp',
      Dress: 'Thanh lịch',
      Diver: 'Đồng hồ lặn',
      Chronograph: 'Bấm giờ',
    };
    return labels[category] ?? category;
  }

  constructor() {
    this.reload();
  }

  protected reload(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.api.list(0, 100).subscribe({
      next: (response) => {
        this.allProducts.set(response.data);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Không tải được danh sách sản phẩm. Kiểm tra Gateway/Product Service đã chạy chưa.');
        this.loading.set(false);
      },
    });
  }

  protected toggleBrand(brand: string): void {
    const next = new Set(this.selectedBrands());
    if (next.has(brand)) {
      next.delete(brand);
    } else {
      next.add(brand);
    }
    this.selectedBrands.set(next);
    this.page.set(0);
  }

  protected setPriceRange(range: PriceRange): void {
    this.priceRange.set(range);
    this.page.set(0);
  }

  protected onSortChange(value: string): void {
    this.sortBy.set(value as SortOption);
    this.page.set(0);
  }

  protected toggleFavorite(productId: string): void {
    const next = new Set(this.favorites());
    if (next.has(productId)) {
      next.delete(productId);
    } else {
      next.add(productId);
    }
    this.favorites.set(next);
  }

  protected goToPage(delta: number): void {
    const next = this.page() + delta;
    if (next < 0 || next >= this.totalPages()) {
      return;
    }
    this.page.set(next);
  }
}
