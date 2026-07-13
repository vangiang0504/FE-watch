import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../core/auth/auth.store';
import { CartService } from '../../core/cart/cart.service';

interface Product {
  id: string;
  brand: string;
  name: string;
  description: string;
  price: number;
  image: string;
}

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  private readonly auth = inject(AuthStore);
  private readonly cart = inject(CartService);
  private readonly router = inject(Router);

  protected readonly loggingOut = signal(false);
  protected readonly userMenuOpen = signal(false);
  protected readonly isAdmin = this.auth.isAdmin;
  protected readonly cartDrawerOpen = signal(false);
  protected readonly toastMessage = signal('');

  protected readonly cartItems = this.cart.items;
  protected readonly cartCount = this.cart.totalItemsCount;
  protected readonly cartSubtotal = this.cart.subtotal;

  protected readonly products: Product[] = [
    {
      id: 'bde7b1d3-1b3e-47ac-88dd-9574df739979',
      brand: 'CASIO',
      name: 'G-Shock GA-2100',
      description: 'Thiết kế thể thao mỏng nhẹ, bền bỉ cho hoạt động hằng ngày.',
      price: 9000,
      image: 'https://unsplash.com/photos/GHrKMXCb1gs/download?force=true&w=900',
    },
    {
      id: '3dd817bc-19a0-4904-bebf-be776258ba67',
      brand: 'PATEK PHILIPPE',
      name: 'Nautilus 5711',
      description: 'Biểu tượng đồng hồ thể thao sang trọng với dây đeo liền khối.',
      price: 10000,
      image: 'https://unsplash.com/photos/VqAz2J71C3Y/download?force=true&w=900',
    },
    {
      id: 'c9962b2e-c171-4da8-8e83-41b3e95c3850',
      brand: 'SEIKO',
      name: 'Presage Cocktail Time',
      description: 'Thanh lịch với mặt số tinh tế và dây da cổ điển.',
      price: 7000,
      image: 'https://unsplash.com/photos/9cddn0X5Mtc/download?force=true&w=900',
    },
    {
      id: '8dfd4bb5-440f-4196-b97f-40ed15078121',
      brand: 'ROLEX',
      name: 'Submariner Date',
      description: 'Mẫu diver kinh điển, mặt số đen và vành bezel xoay.',
      price: 9000,
      image: 'https://unsplash.com/photos/UNd3IPfV_7s/download?force=true&w=900',
    },
    {
      id: 'f4d1c974-2e87-435a-b600-4c883f72450c',
      brand: 'OMEGA',
      name: 'Speedmaster Professional',
      description: 'Chronograph huyền thoại với thiết kế thể thao vượt thời gian.',
      price: 8000,
      image: 'https://unsplash.com/photos/OOSXECr0sUo/download?force=true&w=900',
    },
    {
      id: '52b6f738-1518-4779-a7cd-4f91d5993b64',
      brand: 'SEIKO',
      name: 'Prospex Diver',
      description: 'Đồng hồ lặn mạnh mẽ, dễ đọc và phù hợp phiêu lưu biển sâu.',
      price: 6000,
      image: 'https://unsplash.com/photos/TtK9yVJx5tA/download?force=true&w=900',
    },
  ];

  protected toggleUserMenu(): void {
    this.userMenuOpen.update((open) => !open);
  }

  protected closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  protected toggleCartDrawer(): void {
    this.cartDrawerOpen.update((open) => !open);
  }

  protected closeCartDrawer(): void {
    this.cartDrawerOpen.set(false);
  }

  protected addToCart(product: Product): void {
    this.cart.addToCart(product);
    this.toastMessage.set('Đã thêm vào giỏ hàng');
    setTimeout(() => this.toastMessage.set(''), 1600);
  }

  protected buyNow(product: Product): void {
    this.addToCart(product);
    void this.router.navigateByUrl('/checkout');
  }

  protected updateQuantity(id: string, quantity: number): void {
    this.cart.updateQuantity(id, quantity);
  }

  protected removeFromCart(id: string): void {
    this.cart.removeFromCart(id);
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
}
