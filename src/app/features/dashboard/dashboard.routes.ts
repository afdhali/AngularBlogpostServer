import { Routes } from '@angular/router';
import { authGuard } from '../../guard/auth.guard';
import { DashboardLayoutComponent } from './layout/dashboard-layout.component';

/**
 * Dashboard Routes
 * All routes require authentication via authGuard
 * Uses shared layout component for consistent UI
 */
export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    component: DashboardLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
        title: 'Dashboard - BlogApp',
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/profile/profile.component').then((m) => m.ProfileComponent),
        title: 'Profile - BlogApp',
      },
      {
        path: 'media',
        loadComponent: () => import('./pages/media/media.component').then((m) => m.MediaComponent),
        title: 'Media Gallery - BlogApp',
      },
      // Future dashboard sub-routes
      // {
      //   path: 'posts',
      //   loadComponent: () => import('./pages/posts/posts.component'),
      // },
      // {
      //   path: 'analytics',
      //   loadComponent: () => import('./pages/analytics/analytics.component'),
      // }
    ],
  },
];
