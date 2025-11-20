import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
  PLATFORM_ID,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  provideClientHydration,
  withEventReplay,
  withHttpTransferCacheOptions,
} from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAppInitializer } from '@angular/core'; // Import baru

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { AuthService } from './core/services/auth.service';
import { inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * 🔥 CRITICAL: Auth Initialization BEFORE app starts
 *
 * Menggunakan provideAppInitializer (Angular 19+ recommended)
 * - initAuth() dijalankan SEBELUM routing & guards
 * - Menghindari race condition: guard jalan sebelum auth selesai
 * - User tetap login setelah refresh
 */
function initializeAuth() {
  const authService = inject(AuthService);
  const platformId = inject(PLATFORM_ID);

  // Hanya jalankan di browser
  if (!isPlatformBrowser(platformId)) {
    console.log('Server-side, skipping auth init');
    return;
  }

  console.log('Starting auth initialization...');

  // Convert Observable → Promise untuk APP_INITIALIZER
  return new Promise<void>((resolve) => {
    authService.initAuth().subscribe({
      next: () => {
        console.log('Auth initialization complete');
        resolve();
      },
      error: (error) => {
        console.error('Auth initialization failed:', error);
        resolve(); // Jangan blokir app
      },
      complete: () => {
        console.log('Auth initialization finished');
        resolve();
      },
    });
  });
}

/**
 * Application Configuration - MODERN ANGULAR 19+ STYLE
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),

    // Hydration + Transfer Cache (dengan filter ketat)
    provideClientHydration(
      withEventReplay(),
      withHttpTransferCacheOptions({
        filter: (req) => {
          // 1. Jangan cache non-GET
          if (req.method !== 'GET') {
            console.log(`[Transfer Cache] EXCLUDED (${req.method}): ${req.url}`);
            return false;
          }

          // 2. Exclude path kritis
          const excludedPaths = [
            '/auth/login',
            '/auth/register',
            '/auth/refresh',
            '/auth/logout',
            '/profile',
          ];

          const isExcluded = excludedPaths.some((path) => req.url.includes(path));
          if (isExcluded) {
            console.log(`[Transfer Cache] EXCLUDED (Path): ${req.url}`);
            return false;
          }

          // 3. Cache GET lainnya
          console.log(`[Transfer Cache] CACHED: GET ${req.url}`);
          return true;
        },
      })
    ),

    // HTTP Client + Interceptors
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),

    // MODERN WAY: Gunakan provideAppInitializer
    provideAppInitializer(initializeAuth),
  ],
};
