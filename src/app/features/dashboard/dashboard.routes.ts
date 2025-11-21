import { Routes } from '@angular/router';
import { adminGuard, authGuard } from '../../guard/auth.guard';
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
      {
        path: 'categories',
        loadComponent: () =>
          import('./pages/category/category.component').then((m) => m.CategoryComponent),
        canActivate: [adminGuard],
        title: 'Category Management - BlogApp',
      },
      {
        path: 'posts',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/posts/posts.component').then((m) => m.PostsComponent),
            title: 'Posts Management',
          },
          {
            path: 'create',
            loadComponent: () =>
              import('./pages/posts/post-form/post-form.component').then(
                (m) => m.PostFormComponent
              ),
            title: 'Create Post',
          },
          {
            path: 'edit/:id',
            loadComponent: () =>
              import('./pages/posts/post-form/post-form.component').then(
                (m) => m.PostFormComponent
              ),
            title: 'Edit Post',
          },
        ],
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
