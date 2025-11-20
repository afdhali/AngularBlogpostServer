import { Routes } from '@angular/router';

/**
 * Auth Routes
 * All authentication-related pages
 * - Login
 * - Register
 * - Forgot Password (future)
 */
export const AUTH_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
    title: 'Login - Blog App',
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register.component').then((m) => m.RegisterComponent),
    title: 'Register - Blog App',
  },
];
