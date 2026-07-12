import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../../../core/auth/auth.store';

interface AdminNavItem {
  label: string;
  route: string;
  icon: string;
}

const NAV_ITEMS: AdminNavItem[] = [
  { label: 'Dashboard', route: '/admin/dashboard', icon: 'dashboard' },
  { label: 'Sản phẩm', route: '/admin/products', icon: 'watch' },
  { label: 'Khách hàng', route: '/admin/customers', icon: 'group' },
  { label: 'Vận chuyển', route: '/admin/logistics', icon: 'shipping' },
  { label: 'Doanh thu', route: '/admin/revenue', icon: 'revenue' },
];

@Component({
  selector: 'app-admin-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-shell.component.html',
  styleUrl: './admin-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminShellComponent {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly navItems = NAV_ITEMS;
  protected readonly loggingOut = signal(false);

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
