import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AdminOrder, OrdersAdminApiService } from '../../../core/api/admin/orders-admin-api.service';
import { CustomersApiService, AdminCustomer } from '../../../core/api/admin/customers-api.service';

type OrderFilterStatus = 'all' | 'shipping' | 'pending-payment' | 'pending-fee' | 'archived';

@Component({
  selector: 'app-logistics-management-page',
  imports: [DecimalPipe],
  templateUrl: './logistics-management.page.html',
  styleUrl: './logistics-management.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogisticsManagementPage {
  private readonly ordersApi = inject(OrdersAdminApiService);
  private readonly customersApi = inject(CustomersApiService);

  protected readonly orders = signal<AdminOrder[]>([]);
  protected readonly customers = signal<AdminCustomer[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly search = signal('');
  protected readonly activeFilter = signal<OrderFilterStatus>('all');

  private readonly customersById = computed(() => {
    return new Map(this.customers().map((customer) => [String(customer.id), customer]));
  });

  protected readonly kpiTotal = computed(() => this.orders().length);
  protected readonly kpiShipping = computed(
    () => this.orders().filter((o) => o.status === 'SHIPPING_CREATED').length,
  );
  protected readonly kpiPendingPayment = computed(
    () => this.orders().filter((o) => o.status === 'PENDING_PAYMENT').length,
  );
  protected readonly kpiPendingFee = computed(
    () => this.orders().filter((o) => o.status === 'PENDING_SHIPPING_FEE').length,
  );

  protected readonly filtered = computed(() => {
    const filter = this.activeFilter();
    const term = this.search().trim().toLowerCase();
    const customerMap = this.customersById();

    return this.orders()
      .filter((order) => {
        // Status filter
        if (filter === 'shipping') return order.status === 'SHIPPING_CREATED';
        if (filter === 'pending-payment') return order.status === 'PENDING_PAYMENT';
        if (filter === 'pending-fee') return order.status === 'PENDING_SHIPPING_FEE';
        if (filter === 'archived') return order.status === 'COMPLETED' || order.status === 'CANCELLED';
        return true;
      })
      .filter((order) => {
        // Text search
        if (!term) return true;
        
        const customer = customerMap.get(String(order.userId));
        const customerName = customer?.fullName || customer?.username || '';
        const orderIdStr = String(order.orderId);
        
        return (
          orderIdStr.includes(term) ||
          order.shippingAddress.toLowerCase().includes(term) ||
          customerName.toLowerCase().includes(term)
        );
      });
  });

  constructor() {
    this.reload();
  }

  protected reload(): void {
    this.loading.set(true);
    this.error.set('');
    
    forkJoin({
      orders: this.ordersApi.list(),
      customers: this.customersApi.list(),
    }).subscribe({
      next: ({ orders, customers }) => {
        this.orders.set(orders.data || []);
        this.customers.set(customers.data || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading logistics data:', err);
        this.error.set('Không tải được danh sách đơn hàng hoặc khách hàng.');
        this.loading.set(false);
      },
    });
  }

  protected getCustomerName(userId: string | number): string {
    const customer = this.customersById().get(String(userId));
    return customer?.fullName || customer?.username || `KH: ${userId}`;
  }

  protected getStatusLabel(status: string): string {
    switch (status) {
      case 'PENDING_SHIPPING_FEE': return 'Chờ tính phí';
      case 'PENDING_PAYMENT': return 'Chờ thanh toán';
      case 'SHIPPING_CREATED': return 'Đang vận chuyển';
      case 'COMPLETED': return 'Đã hoàn thành';
      case 'CANCELLED': return 'Đã hủy';
      default: return status;
    }
  }

  protected setSearch(value: string): void {
    this.search.set(value);
  }
}
