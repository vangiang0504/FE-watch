import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { UserApiService, UserProfile } from '../../core/api/user/user-api.service';
import { CheckoutApiService, OrderResponse } from '../../core/api/checkout/checkout-api.service';
import { AuthStore } from '../../core/auth/auth.store';

interface ProfileForm {
  fullName: FormControl<string>;
  username: FormControl<string>;
  email: FormControl<string>;
  phone: FormControl<string>;
}

@Component({
  selector: 'app-profile-page',
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage implements OnInit, OnDestroy {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly userApi = inject(UserApiService);
  private readonly checkoutApi = inject(CheckoutApiService);

  protected readonly loggingOut = signal(false);
  protected readonly loadingProfile = signal(true);
  protected readonly updating = signal(false);
  protected readonly editingProfile = signal(false);
  protected readonly loadError = signal('');
  protected readonly message = signal('');
  protected readonly profile = signal<UserProfile | null>(null);

  protected readonly activeTab = signal<'profile' | 'orders' | 'collection' | 'settings'>('profile');
  protected readonly orders = signal<OrderResponse[]>([]);
  protected readonly loadingOrders = signal(false);
  protected readonly ordersError = signal('');
  protected readonly confirmingOrderId = signal('');
  protected readonly now = signal(Date.now());
  private readonly clock = window.setInterval(() => this.now.set(Date.now()), 1000);

  protected setActiveTab(tab: 'profile' | 'orders' | 'collection' | 'settings'): void {
    this.activeTab.set(tab);
    if (tab === 'orders') {
      this.loadOrders();
    }
  }

  protected loadOrders(): void {
    this.loadingOrders.set(true);
    this.ordersError.set('');
    this.checkoutApi.getMyOrders().subscribe({
      next: (response) => {
        this.orders.set(response.data || []);
        this.loadingOrders.set(false);
      },
      error: (err) => {
        console.error('Error loading orders:', err);
        this.ordersError.set('Không thể tải danh sách đơn hàng. Vui lòng thử lại sau.');
        this.loadingOrders.set(false);
      }
    });
  }

  protected getStatusLabel(status: string): string {
    switch (status) {
      case 'PENDING_SHIPPING_FEE': return 'Chờ tính phí vận chuyển';
      case 'PENDING_PAYMENT': return 'Chờ thanh toán';
      case 'PAID': return 'Đã thanh toán';
      case 'COMPLETED': return 'Hoàn thành';
      case 'CANCELLED': return 'Đã hủy';
      case 'SHIPPING_CREATED': return 'Đang giao hàng';
      default: return status;
    }
  }

  protected getStatusClass(status: string): string {
    switch (status) {
      case 'PAID':
      case 'COMPLETED': return 'status-completed';
      case 'CANCELLED': return 'status-cancelled';
      case 'PENDING_PAYMENT':
      case 'PENDING_SHIPPING_FEE': return 'status-pending';
      default: return 'status-default';
    }
  }

  protected readonly form = new FormGroup<ProfileForm>({
    fullName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    username: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl({ value: '', disabled: true }, {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    phone: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  ngOnDestroy(): void {
    window.clearInterval(this.clock);
  }

  protected canConfirmReceived(order: OrderResponse): boolean {
    return order.status === 'SHIPPING_CREATED'
      && !!order.confirmAvailableAt
      && Date.parse(order.confirmAvailableAt) <= this.now();
  }

  protected confirmRemainingSeconds(order: OrderResponse): number {
    return order.confirmAvailableAt
      ? Math.max(0, Math.ceil((Date.parse(order.confirmAvailableAt) - this.now()) / 1000))
      : 0;
  }

  protected confirmReceived(order: OrderResponse): void {
    if (!this.canConfirmReceived(order) || this.confirmingOrderId()) {
      return;
    }
    this.confirmingOrderId.set(String(order.orderId));
    this.ordersError.set('');
    this.checkoutApi.confirmReceived(order.orderId).subscribe({
      next: () => {
        this.orders.update((orders) => orders.map((item) =>
          String(item.orderId) === String(order.orderId) ? { ...item, status: 'COMPLETED' } : item));
        this.confirmingOrderId.set('');
      },
      error: (error) => {
        this.ordersError.set(error?.error?.message || 'Không thể xác nhận đã nhận hàng.');
        this.confirmingOrderId.set('');
      },
    });
  }

  protected update(): void {
    if (!this.editingProfile() || this.form.invalid || this.updating()) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.updating.set(true);
    this.message.set('');

    this.userApi.updateMe({
      fullName: raw.fullName,
      username: raw.username,
      phone: raw.phone,
    }).subscribe({
      next: (response) => {
        this.profile.set(response.data);
        this.applyProfile(response.data);
        this.editingProfile.set(false);
        this.message.set('Cập nhật hồ sơ thành công.');
        this.updating.set(false);
      },
      error: (error) => {
        this.message.set(error?.error?.message || 'Không thể cập nhật thông tin cá nhân.');
        this.updating.set(false);
      },
    });
  }

  protected reset(): void {
    const profile = this.profile();
    if (profile) {
      this.applyProfile(profile);
    }
    this.message.set('');
  }

  protected openEditProfile(): void {
    const profile = this.profile();
    if (profile) {
      this.applyProfile(profile);
    }
    this.message.set('');
    this.editingProfile.set(true);
  }

  protected closeEditProfile(): void {
    if (this.updating()) {
      return;
    }
    this.reset();
    this.editingProfile.set(false);
  }

  protected hasError(controlName: keyof ProfileForm, error: string): boolean {
    const control = this.form.controls[controlName];
    return control.hasError(error) && (control.dirty || control.touched);
  }

  protected displayName(): string {
    const profile = this.profile();
    return profile?.fullName || profile?.username || 'Tài khoản';
  }

  protected initials(): string {
    return this.displayName()
      .split(' ')
      .filter(Boolean)
      .slice(-2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'U';
  }

  protected logout(): void {
    if (this.loggingOut()) {
      return;
    }

    this.loggingOut.set(true);
    this.auth.logout().subscribe(() => {
      void this.router.navigateByUrl('/login');
    });
  }

  private loadProfile(): void {
    this.loadingProfile.set(true);
    this.loadError.set('');

    this.userApi.me().subscribe({
      next: (response) => {
        this.profile.set(response.data);
        this.applyProfile(response.data);
        this.loadingProfile.set(false);
      },
      error: () => {
        this.loadError.set('Không thể tải thông tin cá nhân.');
        this.loadingProfile.set(false);
      },
    });
  }

  private applyProfile(profile: UserProfile): void {
    this.form.reset({
      fullName: profile.fullName || '',
      username: profile.username || '',
      email: profile.email,
      phone: profile.phone || '',
    });
  }
}
