import { computed, Injectable, signal } from '@angular/core';

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
  private readonly STORAGE_KEY = 'horologue_cart_items_v2';

  // Initialize cart items with the default item if localStorage is empty
  private readonly itemsSignal = signal<CartItem[]>(this.loadCartFromStorage());

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

  private loadCartFromStorage(): CartItem[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        return JSON.parse(data) as CartItem[];
      }
    } catch (e) {
      console.error('Failed to parse cart items from storage:', e);
    }

    // Default mock item as per initial requirements
    return [
      {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'HOROLOGUE',
        description: 'Bespoke Tourbillon',
        price: 1000,
        quantity: 1,
        image:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuCFx32SJ7wqbdxsoahbIBZeXIeUTCkjPa7EOIfelwF9JOt8hn2h_4qrSK5TUwsnL6llxXIu_jMfq7QjAFbjQOMB1KO8zzYEkHRQDTtm929k6kjfNik1AxvLAHJ8Tli5C7Ov6XiamZNawCErH03WJf13z9j4boHgBkhayBSw2qifrWc-S7xPy0Q3Unncc4C6Sv-5nPy217zAo-nhKlrn5EXo7WvWAdKwGGbiCN8UDJKYhEdD3WKp6yXtMDLXzIODQ8zVLqiuSsTJRbM',
      },
    ];
  }

  private saveCartToStorage(items: CartItem[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save cart items to storage:', e);
    }
  }
}
