import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { AuthStore } from '../../core/auth/auth.store';
import { CartService } from '../../core/cart/cart.service';
import { CheckoutApiService, OrderResponse } from '../../core/api/checkout/checkout-api.service';
import { catchError, map, of, Subscription, interval } from 'rxjs';

interface CheckoutForm {
  address: FormControl<string>;
  apartment: FormControl<string>;
  city: FormControl<string>;
  country: FormControl<string>;
}

@Component({
  selector: 'app-checkout-page',
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe],
  templateUrl: './checkout.page.html',
  styleUrl: './checkout.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})


export class CheckoutPage {
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

  // Checkout items from CartService
  protected readonly cartItems = this.cart.items;
  protected readonly cityOptions = [
    'Ho Chi Minh',
    'Ha Noi',
    'Da Nang',
    'Hai Phong',
    'Can Tho',
    'Binh Duong',
    'Dong Nai',
    'Ba Ria Vung Tau',
    'Hue',
    'Quang Ninh',
    'Nha Trang',
    'Da Lat',
  ];

  // Checkout form group
  protected readonly form = new FormGroup<CheckoutForm>({
    address: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    apartment: new FormControl('', { nonNullable: true }),
    city: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    country: new FormControl('VN', { nonNullable: true, validators: [Validators.required] }),
  });

  // Computed totals
  protected readonly subtotal = computed(() => {
    return this.cartItems().reduce((acc, item) => acc + item.price * item.quantity, 0);
  });

  protected readonly shippingFee = computed(() => {
    if (this.currentStep() === 'info') {
      return 0; // Displayed as "Calculated next" in view
    }
    return this.createdOrder()?.shippingFee ?? this.feeForAddress(this.form.getRawValue().city);
  });

  protected readonly totalAmount = computed(() => {
    if (this.createdOrder()?.totalAmount) {
      return this.createdOrder()!.totalAmount;
    }
    return this.subtotal() + this.shippingFee();
  });

  // Next step handler
  protected nextStep(): void {
    if (this.currentStep() === 'info') {
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

  protected setShippingMethod(method: 'standard' | 'express'): void {
    this.selectedShippingMethod.set(method);
  }

  // Submit order handler
  protected submitOrder(): void {
    if (this.form.invalid) {
      this.currentStep.set('info');
      this.form.markAllAsTouched();
      return;
    }

    const user = this.auth.currentUser();
    if (!user) {
      this.orderError.set('Vui lÃ²ng Ä‘Äƒng nháº­p trÆ°á»›c khi Ä‘áº·t hÃ ng.');
      this.router.navigate(['/login']);
      return;
    }
    const userId = user.id;

    const rawValues = this.form.getRawValue();
    // Build clean address string
    const fullAddress = [
      rawValues.address,
      rawValues.apartment,
      rawValues.city,
      rawValues.country === 'VN' ? 'Việt Nam' : rawValues.country
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

  private startPolling(orderId: number): void {
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
              this.cart.clearCart();
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

  private feeForAddress(address: string): number {
    const value = address.toUpperCase();
    return ['HCM', 'HO CHI MINH', 'DA NANG', 'BINH DUONG', 'DONG NAI', 'HUE']
      .some(region => value.includes(region)) ? 1000 : 2000;
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }
}
