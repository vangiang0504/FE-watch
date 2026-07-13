import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { AuthStore } from '../auth/auth.store';

export interface CartItem {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  image: string;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly auth = inject(AuthStore);
  private activeKey = '';

  // Initialize cart items with the default item if localStorage is empty
  private readonly itemsSignal = signal<CartItem[]>([]);

  constructor() {
    effect(() => {
      const email = this.auth.email();
      const key = this.storageKey();
      if (key !== this.activeKey) {
        if (email) {
          const guestKey = 'horologue_cart_items_v2:guest';
          const guestItems = this.loadCartFromStorage(guestKey);
          const userItems = this.loadCartFromStorage(key);
          if (guestItems.length && !userItems.length) {
            localStorage.setItem(key, JSON.stringify(guestItems));
            localStorage.removeItem(guestKey);
          }
        }
        this.activeKey = key;
        this.itemsSignal.set(this.loadCartFromStorage(key));
      }
    });
  }

  readonly items = computed(() => this.itemsSignal());

  readonly totalItemsCount = computed(() => {
    return this.itemsSignal().reduce((acc, item) => acc + item.quantity, 0);
  });

  readonly subtotal = computed(() => {
    return this.itemsSignal().reduce((acc, item) => acc + item.price * item.quantity, 0);
  });

  addToCart(item: Omit<CartItem, 'quantity'>): void {
    this.itemsSignal.update((currentItems) => {
      const existingItem = currentItems.find((i) => i.id === item.id);
      let updatedItems: CartItem[];

      if (existingItem) {
        updatedItems = currentItems.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        updatedItems = [...currentItems, { ...item, quantity: 1 }];
      }

      this.saveCartToStorage(updatedItems);
      return updatedItems;
    });
  }

  removeFromCart(id: string): void {
    this.itemsSignal.update((currentItems) => {
      const updatedItems = currentItems.filter((i) => i.id !== id);
      this.saveCartToStorage(updatedItems);
      return updatedItems;
    });
  }

  updateQuantity(id: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeFromCart(id);
      return;
    }

    this.itemsSignal.update((currentItems) => {
      const updatedItems = currentItems.map((i) =>
        i.id === id ? { ...i, quantity } : i
      );
      this.saveCartToStorage(updatedItems);
      return updatedItems;
    });
  }

  clearCart(): void {
    this.itemsSignal.set([]);
    this.saveCartToStorage([]);
  }

  private loadCartFromStorage(key: string): CartItem[] {
    try {
      const data = localStorage.getItem(key);
      if (data) {
        return JSON.parse(data) as CartItem[];
      }
    } catch (e) {
      console.error('Failed to parse cart items from storage:', e);
    }

    return [];
  }

  private saveCartToStorage(items: CartItem[]): void {
    try {
      localStorage.setItem(this.activeKey, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save cart items to storage:', e);
    }
  }

  private storageKey(): string {
    const email = this.auth.email();
    return `horologue_cart_items_v2:${email ? email.toLowerCase() : 'guest'}`;
  }
}
