import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

/**
 * Auth Guard
 * Protects routes that require authentication
 *
 * Usage:
 * {
 *   path: 'dashboard',
 *   component: DashboardComponent,
 *   canActivate: [authGuard]
 * }
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if user is authenticated
  if (authService.isAuthenticated()) {
    return true;
  }

  // Save the attempted URL for redirecting after login
  const returnUrl = state.url;

  // Redirect to login page
  return router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl },
  });
};

/**
 * Guest Guard
 * Redirects authenticated users away from auth pages
 *
 * Usage:
 * {
 *   path: 'auth/login',
 *   component: LoginComponent,
 *   canActivate: [guestGuard]
 * }
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // If already authenticated, redirect to dashboard
  if (authService.isAuthenticated()) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};

/**
 * Admin Guard
 * Protects routes that require admin or super_admin role
 *
 * Usage:
 * {
 *   path: 'admin',
 *   component: AdminComponent,
 *   canActivate: [authGuard, adminGuard]
 * }
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.user();

  // Check if user has admin or super_admin role
  if (user && (user.role === 'admin' || user.role === 'super_admin')) {
    return true;
  }

  // Not authorized, redirect to dashboard
  return router.createUrlTree(['/dashboard']);
};
