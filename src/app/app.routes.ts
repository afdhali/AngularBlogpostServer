import { Routes } from '@angular/router';
import { authGuard } from './guard/auth.guard';

/**
 * Main Application Routes
 *
 * Route Strategy:
 * - Public routes: Home, Blog (no auth required)
 * - Auth routes: Login, Register (with guestGuard)
 * - Protected routes: Dashboard (with authGuard)
 */
export const routes: Routes = [
  // ========================================
  // PUBLIC ROUTES
  // ========================================
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
    title: 'Home - BlogApp',
  },

  // ========================================
  // AUTH ROUTES (Lazy Loaded)
  // ========================================
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
    // Note: guestGuard applied to individual auth routes in auth.routes.ts
  },

  // ========================================
  // DASHBOARD ROUTES (Protected - Lazy Loaded)
  // ========================================
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
    canActivate: [authGuard],
  },

  // ========================================
  // BLOG ROUTES (Public - SEO Optimized with SSG)
  // ========================================
  {
    path: 'blog',
    loadChildren: () => import('./features/blog/blog.routes').then((m) => m.BLOG_ROUTES),
  },

  // ========================================
  // 404 NOT FOUND
  // ========================================
  {
    path: '404',
    loadComponent: () =>
      import('./pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
    title: '404 - Page Not Found',
  },

  // Redirect all unknown routes to 404
  {
    path: '**',
    redirectTo: '/404',
  },
];
