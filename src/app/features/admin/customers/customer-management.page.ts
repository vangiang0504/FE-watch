import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AdminCustomer, CustomersApiService } from '../../../core/api/admin/customers-api.service';

@Component({ selector: 'app-customer-management-page', imports: [DecimalPipe], templateUrl: './customer-management.page.html', styleUrl: './customer-management.page.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class CustomerManagementPage {
  private readonly api = inject(CustomersApiService);
  protected readonly customers = signal<AdminCustomer[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly search = signal('');
  protected readonly deletingId = signal<string | number | null>(null);
  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    return this.customers().filter((customer) => !term || [customer.fullName, customer.email, customer.username, customer.phone].some((value) => value?.toLowerCase().includes(term)));
  });
  constructor() { this.reload(); }
  protected reload(): void {
    this.loading.set(true);
    this.api.list().subscribe({ next: (response) => { this.customers.set(response.data); this.loading.set(false); }, error: () => { this.error.set('Không tải được danh sách khách hàng.'); this.loading.set(false); } });
  }
  protected setSearch(value: string): void { this.search.set(value); }

  protected isProtected(customer: AdminCustomer): boolean { return String(customer.id) === '1'; }

  protected deleteCustomer(customer: AdminCustomer): void {
    if (this.isProtected(customer) || !window.confirm(`Xóa tài khoản ${customer.email}?`)) return;
    this.deletingId.set(customer.id);
    this.api.delete(customer.id).subscribe({
      next: () => { this.deletingId.set(null); this.reload(); },
      error: () => { this.deletingId.set(null); this.error.set('Không xóa được tài khoản khách hàng.'); },
    });
  }
}
