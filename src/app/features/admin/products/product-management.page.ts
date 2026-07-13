import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { InventoryAdminApiService } from '../../../core/api/inventory/inventory-admin-api.service';
import { ProductSummary, ProductsApiService } from '../../../core/api/products/products-api.service';

type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock' | 'unknown';

const LOW_STOCK_THRESHOLD = 5;

function stockStatus(quantity: number | undefined): StockStatus {
  if (quantity === undefined) {
    return 'unknown';
  }
  if (quantity <= 0) {
    return 'out-of-stock';
  }
  if (quantity <= LOW_STOCK_THRESHOLD) {
    return 'low-stock';
  }
  return 'in-stock';
}

const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  'in-stock': 'Còn Hàng',
  'low-stock': 'Sắp Hết',
  'out-of-stock': 'Hết Hàng',
  unknown: 'Chưa Rõ',
};

interface ProductForm {
  name: FormControl<string>;
  brand: FormControl<string>;
  category: FormControl<string>;
  description: FormControl<string>;
  price: FormControl<number>;
  imageUrl: FormControl<string>;
  quantity: FormControl<number>;
}

const PAGE_SIZE = 3;

@Component({
  selector: 'app-product-management-page',
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './product-management.page.html',
  styleUrl: './product-management.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductManagementPage {
  private readonly api = inject(ProductsApiService);
  private readonly inventoryApi = inject(InventoryAdminApiService);

  protected readonly products = signal<ProductSummary[]>([]);
  protected readonly stockByProductId = signal<Map<string, number>>(new Map());
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly searchTerm = signal('');
  protected readonly page = signal(0);

  protected readonly formMode = signal<'create' | 'edit' | null>(null);
  protected readonly editingProductId = signal<string | null>(null);
  protected readonly formSubmitting = signal(false);
  protected readonly formError = signal('');

  protected readonly priceEditProductId = signal<string | null>(null);
  protected readonly priceEditValue = signal<number | null>(null);
  protected readonly priceSubmitting = signal(false);

  protected readonly deletingProductId = signal<string | null>(null);

  protected readonly filtered = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) {
      return this.products();
    }
    return this.products().filter(
      (product) =>
        product.name.toLowerCase().includes(term) || product.brand.toLowerCase().includes(term),
    );
  });

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));

  protected readonly pageItems = computed(() => {
    const start = this.page() * PAGE_SIZE;
    return this.filtered().slice(start, start + PAGE_SIZE);
  });

  protected readonly form = new FormGroup<ProductForm>({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    brand: new FormControl('', { nonNullable: true }),
    category: new FormControl('', { nonNullable: true }),
    description: new FormControl('', { nonNullable: true }),
    price: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    imageUrl: new FormControl('', { nonNullable: true }),
    quantity: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
  });

  constructor() {
    this.reload();
  }

  protected reload(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    forkJoin({ products: this.api.list(), inventory: this.inventoryApi.list() }).subscribe({
      next: ({ products, inventory }) => {
        this.products.set(products.data);
        this.stockByProductId.set(new Map(inventory.data.map((item) => [item.productId, item.availableQuantity])));
        this.loading.set(false);
        this.page.set(0);
      },
      error: () => {
        this.errorMessage.set('Không tải được danh sách sản phẩm. Kiểm tra Gateway/Admin Service đã chạy chưa.');
        this.loading.set(false);
      },
    });
  }

  protected stockOf(productId: string): number | undefined {
    return this.stockByProductId().get(productId);
  }

  protected stockStatusOf(productId: string): StockStatus {
    return stockStatus(this.stockOf(productId));
  }

  protected stockLabelOf(productId: string): string {
    return STOCK_STATUS_LABEL[this.stockStatusOf(productId)];
  }

  protected onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.page.set(0);
  }

  protected goToPage(index: number): void {
    if (index < 0 || index >= this.totalPages()) {
      return;
    }
    this.page.set(index);
  }

  protected openCreateForm(): void {
    this.formMode.set('create');
    this.editingProductId.set(null);
    this.formError.set('');
    this.form.reset({ name: '', brand: '', category: '', description: '', price: 0, imageUrl: '', quantity: 0 });
  }

  protected openEditForm(product: ProductSummary): void {
    this.formMode.set('edit');
    this.editingProductId.set(product.productId);
    this.formError.set('');
    this.form.reset({
      name: product.name,
      brand: product.brand,
      category: product.category,
      description: '',
      price: product.price,
      imageUrl: product.imageUrl,
      quantity: this.stockOf(product.productId) ?? 0,
    });
  }

  protected closeForm(): void {
    this.formMode.set(null);
    this.editingProductId.set(null);
  }

  protected submitForm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const mode = this.formMode();
    const value = this.form.getRawValue();
    const { quantity, ...productRequest } = value;
    this.formSubmitting.set(true);
    this.formError.set('');

    const request$ =
      mode === 'edit' && this.editingProductId()
        ? this.api.update(this.editingProductId()!, productRequest)
        : this.api.create(productRequest);

    request$.subscribe({
      next: (response) => {
        const productId = mode === 'edit' ? this.editingProductId() : response.data;
        if (!productId) {
          this.formSubmitting.set(false);
          this.formError.set('Không xác định được sản phẩm để cập nhật tồn kho.');
          return;
        }
        this.inventoryApi.adjust(productId, quantity).subscribe({
          next: () => {
            this.formSubmitting.set(false);
            this.closeForm();
            this.reload();
          },
          error: () => {
            this.formSubmitting.set(false);
            this.formError.set('Lưu sản phẩm thành công nhưng không cập nhật được số lượng tồn kho.');
          },
        });
      },
      error: (err) => {
        this.formSubmitting.set(false);
        this.formError.set(this.extractErrorMessage(err, 'Không lưu được sản phẩm.'));
      },
    });
  }

  protected openPriceEdit(product: ProductSummary): void {
    this.priceEditProductId.set(product.productId);
    this.priceEditValue.set(product.price);
  }

  protected cancelPriceEdit(): void {
    this.priceEditProductId.set(null);
    this.priceEditValue.set(null);
  }

  protected submitPriceEdit(): void {
    const productId = this.priceEditProductId();
    const newPrice = this.priceEditValue();
    if (!productId || newPrice === null || newPrice < 0) {
      return;
    }

    this.priceSubmitting.set(true);
    this.api.changePrice(productId, newPrice).subscribe({
      next: () => {
        this.priceSubmitting.set(false);
        this.cancelPriceEdit();
        this.reload();
      },
      error: () => {
        this.priceSubmitting.set(false);
        this.errorMessage.set('Không cập nhật được giá.');
      },
    });
  }

  protected confirmDelete(product: ProductSummary): void {
    this.deletingProductId.set(product.productId);
  }

  protected cancelDelete(): void {
    this.deletingProductId.set(null);
  }

  protected deleteConfirmed(): void {
    const productId = this.deletingProductId();
    if (!productId) {
      return;
    }

    this.api.delete(productId).subscribe({
      next: () => {
        this.deletingProductId.set(null);
        this.reload();
      },
      error: () => {
        this.deletingProductId.set(null);
        this.errorMessage.set('Không xóa được sản phẩm.');
      },
    });
  }

  protected hasError(controlName: keyof ProductForm, error: string): boolean {
    const control = this.form.controls[controlName];
    return control.hasError(error) && (control.dirty || control.touched);
  }

  private extractErrorMessage(err: unknown, fallback: string): string {
    const httpError = err as { error?: { message?: string } };
    return httpError?.error?.message ?? fallback;
  }
}
