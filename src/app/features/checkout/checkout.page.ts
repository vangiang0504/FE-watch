import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { AuthStore } from '../../core/auth/auth.store';
import { CartService } from '../../core/cart/cart.service';
import {
  CheckoutApiService,
  OrderResponse,
  ShippingFeeRule,
} from '../../core/api/checkout/checkout-api.service';
import { interval, Subscription } from 'rxjs';

interface CheckoutForm {
  address: FormControl<string>;
  apartment: FormControl<string>;
  city: FormControl<string>;
  ward: FormControl<string>;
}

interface WardOption {
  name: string;
  fee: number;
}

@Component({
  selector: 'app-checkout-page',
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe],
  templateUrl: './checkout.page.html',
  styleUrl: './checkout.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})


export class CheckoutPage implements OnInit, OnDestroy {
  private readonly auth = inject(AuthStore);
  private readonly cart = inject(CartService);
  private readonly checkoutApi = inject(CheckoutApiService);
  private readonly router = inject(Router);

  // Checkout flow state
  protected readonly currentStep = signal<'info' | 'shipping' | 'payment'>('info');
  protected readonly selectedShippingMethod = signal<'standard' | 'express'>('standard');
  protected readonly promoCodeInput = signal('');
  protected readonly appliedPromoCode = signal('');
  protected readonly promoError = signal('');
  protected readonly promoSuccess = signal('');
  protected readonly promoDiscount = signal(0);
  // Order API state
  protected readonly orderLoading = signal(false);
  protected readonly orderError = signal('');
  protected readonly pollingOrder = signal(false);
  protected readonly createdOrder = signal<OrderResponse | null>(null);

  // Subscriptions
  private pollSubscription?: Subscription;

  protected readonly cartItems = this.cart.items;
  private readonly shippingRules = signal<ShippingFeeRule[]>([]);
  protected readonly shippingRulesLoading = signal(true);
  protected readonly selectedCity = signal('');
  protected readonly selectedWard = signal('');
  protected readonly cityDropdownOpen = signal(false);
  protected readonly wardDropdownOpen = signal(false);
  protected readonly citySearch = signal('');
  protected readonly wardSearch = signal('');

  protected readonly cityOptions = computed(() => {
    const provinces = this.shippingRules()
      .filter((rule) => rule.regionCode !== 'DEFAULT' && !rule.regionCode.startsWith('QNH_'))
      .map((rule) => rule.regionName);
    return this.shippingRules().some((rule) => rule.regionCode.startsWith('QNH_'))
      ? ['Quy Nhơn', ...provinces]
      : provinces;
  });

  protected readonly wardOptions = computed<WardOption[]>(() => {
    const city = this.selectedCity();
    if (!city) {
      return [];
    }
    if (city === 'Quy Nhơn') {
      return this.shippingRules()
        .filter((rule) => rule.regionCode.startsWith('QNH_'))
        .map((rule) => ({ name: rule.regionName, fee: rule.fee }));
    }
    const rule = this.shippingRules().find((candidate) => candidate.regionName === city);
    return rule
      ? [
          { name: 'Phường trung tâm', fee: rule.fee },
          { name: 'Huyện/xã ngoại thành', fee: rule.remoteFee ?? rule.fee },
        ]
      : [];
  });

  protected readonly filteredCities = computed(() => {
    const query = this.normalize(this.citySearch());
    return this.cityOptions().filter((city) => this.normalize(city).includes(query));
  });

  protected readonly filteredWards = computed(() => {
    const query = this.normalize(this.wardSearch());
    return this.wardOptions().filter((ward) => this.normalize(ward.name).includes(query));
  });

  // Checkout form group
  protected readonly form = new FormGroup<CheckoutForm>({
    address: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    apartment: new FormControl('', { nonNullable: true }),
    city: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    ward: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  // Computed totals
  protected readonly subtotal = computed(() => {
    return this.cartItems().reduce((acc, item) => acc + item.price * item.quantity, 0);
  });

  protected readonly shippingFee = computed(() => {
    if (this.currentStep() === 'info') {
      return 0; // Displayed as "Calculated next" in view
    }
    const selected = this.wardOptions().find((ward) => ward.name === this.selectedWard());
    return this.createdOrder()?.shippingFee ?? selected?.fee ?? 0;
  });

  ngOnInit(): void {
    this.checkoutApi.getShippingFees().subscribe({
      next: (rules) => {
        this.shippingRules.set(rules);
        this.shippingRulesLoading.set(false);
      },
      error: () => {
        this.shippingRulesLoading.set(false);
        this.orderError.set('Không tải được biểu phí vận chuyển. Vui lòng thử lại.');
      },
    });
  }

  protected readonly totalAmount = computed(() => {
    if (this.createdOrder()?.totalAmount) {
      return this.createdOrder()!.totalAmount;
    }
    return this.subtotal() + this.shippingFee();
  });

  // Next step handler
  protected nextStep(): void {
    if (this.currentStep() === 'info') {
      if (this.cartItems().length === 0) {
        this.orderError.set('Giỏ hàng đang trống. Vui lòng chọn sản phẩm trước khi thanh toán.');
        return;
      }
      if (this.form.invalid) {
        this.form.markAllAsTouched();
        return;
      }
      this.currentStep.set('shipping');
    } else if (this.currentStep() === 'shipping') {
      this.currentStep.set('payment');
    }
  }

  // Previous step handler
  protected prevStep(): void {
    if (this.currentStep() === 'shipping') {
      this.currentStep.set('info');
    } else if (this.currentStep() === 'payment') {
      this.currentStep.set('shipping');
    }
  }

  // Apply discount coupon
  protected applyPromoCode(): void {
    const code = this.promoCodeInput().trim().toUpperCase();
    if (!code) return;

    this.promoError.set('');
    this.promoSuccess.set('');

    if (code === 'HORO10') {
      const discount = Math.round(this.subtotal() * 0.1);
      this.promoDiscount.set(discount);
      this.appliedPromoCode.set(code);
      this.promoSuccess.set('Áp dụng mã giảm giá 10% thành công!');
    } else if (code === 'WELCOME') {
      const discount = Math.round(this.subtotal() * 0.05);
      this.promoDiscount.set(discount);
      this.appliedPromoCode.set(code);
      this.promoSuccess.set('Áp dụng mã giảm giá 5% thành công!');
    } else {
      this.promoDiscount.set(0);
      this.appliedPromoCode.set('');
      this.promoError.set('Mã giảm giá không hợp lệ hoặc đã hết hạn.');
    }
  }

  // Form error helper
  protected hasError(controlName: keyof CheckoutForm, error: string): boolean {
    const control = this.form.controls[controlName];
    return control.hasError(error) && (control.dirty || control.touched);
  }

  protected toggleCityDropdown(event: Event): void {
    event.stopPropagation();
    this.wardDropdownOpen.set(false);
    this.cityDropdownOpen.update((open) => !open);
  }

  protected toggleWardDropdown(event: Event): void {
    event.stopPropagation();
    if (!this.selectedCity()) {
      return;
    }
    this.cityDropdownOpen.set(false);
    this.wardDropdownOpen.update((open) => !open);
  }

  protected filterCity(value: string): void {
    this.citySearch.set(value);
  }

  protected filterWard(value: string): void {
    this.wardSearch.set(value);
  }

  protected selectCity(city: string): void {
    this.selectedCity.set(city);
    this.selectedWard.set('');
    this.form.controls.city.setValue(city);
    this.form.controls.city.markAsTouched();
    this.form.controls.ward.setValue('');
    this.citySearch.set('');
    this.wardSearch.set('');
    this.cityDropdownOpen.set(false);
    this.wardDropdownOpen.set(false);
  }

  protected selectWard(ward: string): void {
    this.selectedWard.set(ward);
    this.form.controls.ward.setValue(ward);
    this.form.controls.ward.markAsTouched();
    this.wardSearch.set('');
    this.wardDropdownOpen.set(false);
  }

  @HostListener('document:click')
  protected closeDropdowns(): void {
    this.cityDropdownOpen.set(false);
    this.wardDropdownOpen.set(false);
  }

  protected setShippingMethod(method: 'standard' | 'express'): void {
    this.selectedShippingMethod.set(method);
  }

  // Submit order handler
  protected submitOrder(): void {
    if (this.cartItems().length === 0) {
      this.orderError.set('Giỏ hàng đang trống. Vui lòng chọn sản phẩm trước khi thanh toán.');
      return;
    }
    if (this.form.invalid) {
      this.currentStep.set('info');
      this.form.markAllAsTouched();
      return;
    }

    const user = this.auth.currentUser();
    if (!user) {
      this.orderError.set('Vui lòng đăng nhập trước khi đặt hàng.');
      this.router.navigate(['/login']);
      return;
    }
    const userId = user.id;

    const rawValues = this.form.getRawValue();
    // Build clean address string
    const fullAddress = [
      rawValues.address,
      rawValues.apartment,
      rawValues.ward,
      rawValues.city,
      'Việt Nam',
    ].filter(Boolean).join(', ');

    const itemsRequest = this.cartItems().map(item => ({
      productId: item.id,
      quantity: item.quantity,
      unitPrice: item.price
    }));

    this.orderLoading.set(true);
    this.orderError.set('');

    this.checkoutApi.createOrder({
      userId,
      items: itemsRequest,
      shippingAddress: fullAddress
    }).subscribe({
      next: (response) => {
        const order = response.data;
        this.createdOrder.set(order);
        this.orderLoading.set(false);
        this.pollingOrder.set(true);

        // Start polling for payment link
        this.startPolling(order.orderId);
      },
      error: (err) => {
        console.error(err);
        this.orderLoading.set(false);
        this.orderError.set('Đã có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại.');
      }
    });
  }

  private startPolling(orderId: string | number): void {
    // Poll order status every 2 seconds
    this.pollSubscription = interval(2000).subscribe({
      next: () => {
        this.checkoutApi.getOrder(orderId).subscribe({
          next: (response) => {
            const order = response.data;
            this.createdOrder.set(order);
            // If paymentUrl is available, redirect user to PayOS
            if (order.paymentUrl) {
              this.stopPolling();
              window.location.href = order.paymentUrl;
            } else if (order.status === 'CANCELLED') {
              this.stopPolling();
              this.pollingOrder.set(false);
              this.orderError.set('Đơn hàng đã bị hủy (Sản phẩm có thể đã hết hàng hoặc không đủ tồn kho). Vui lòng kiểm tra lại.');
            }
          },
          error: (err) => {
            console.error('Error polling order:', err);
          }
        });
      }
    });

    // Timeout polling after 60 seconds (fall back to error message)
    setTimeout(() => {
      if (this.pollingOrder() && !this.createdOrder()?.paymentUrl) {
        this.stopPolling();
        this.pollingOrder.set(false);
        this.orderError.set('Không nhận được liên kết thanh toán từ máy chủ. Vui lòng kiểm tra lại trạng thái đơn hàng của bạn.');
      }
    }, 60000);
  }

  private stopPolling(): void {
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
      this.pollSubscription = undefined;
    }
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }
}
