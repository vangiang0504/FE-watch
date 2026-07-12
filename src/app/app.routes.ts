import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'home',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'products',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/products/product-list.page').then((m) => m.ProductListPage),
  },
  {
    path: 'products/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/products/product-detail.page').then((m) => m.ProductDetailPage),
  },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./features/admin/shell/admin-shell.component').then((m) => m.AdminShellComponent),
    children: [
      { path: '', redirectTo: 'products', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/admin/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./features/admin/products/product-management.page').then((m) => m.ProductManagementPage),
      },
      {
        path: 'customers',
        data: { title: 'Khách hàng' },
        loadComponent: () =>
          import('./features/admin/coming-soon/coming-soon.page').then((m) => m.ComingSoonPage),
      },
      {
        path: 'logistics',
        data: { title: 'Vận chuyển' },
        loadComponent: () =>
          import('./features/admin/coming-soon/coming-soon.page').then((m) => m.ComingSoonPage),
      },
      {
        path: 'revenue',
        data: { title: 'Doanh thu' },
        loadComponent: () =>
          import('./features/admin/coming-soon/coming-soon.page').then((m) => m.ComingSoonPage),
      },
      {
        path: 'security',
        data: { title: 'Bảo mật' },
        loadComponent: () =>
          import('./features/admin/coming-soon/coming-soon.page').then((m) => m.ComingSoonPage),
      },
    ],
  },
  {
    path: 'checkout',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/checkout/checkout.page').then((m) => m.CheckoutPage),
  },
];
