import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { provideClientHydration, withHttpTransferCacheOptions } from '@angular/platform-browser';

/**
 * Server Configuration - ULTIMATE FIX
 *
 * Critical Fix: Transfer Cache Configuration
 *
 * Issue:
 * - /auth/refresh endpoint DI-CACHE oleh Angular SSR
 * - Setiap page reload, cached response digunakan
 * - Backend generate new refresh token → old token revoked
 * - Result: Multiple revoked tokens di database
 *
 * Solution:
 * - Exclude ALL auth endpoints dari Transfer State Cache
 * - Exclude semua POST/PUT/DELETE requests (state-changing)
 * - Only cache GET requests untuk static data
 */
const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    provideClientHydration(
      withHttpTransferCacheOptions({
        /**
         * 🔥 CRITICAL: Filter untuk exclude endpoints dari cache
         *
         * Return value:
         * - true = CACHE this request (default)
         * - false = DON'T CACHE this request
         *
         * Strategy:
         * 1. NEVER cache state-changing operations (POST/PUT/DELETE)
         * 2. NEVER cache auth endpoints (termasuk /auth/refresh)
         * 3. NEVER cache user-specific data (/profile)
         * 4. Only cache static GET requests
         */
        filter: (req) => {
          // ========================================
          // Rule 1: NEVER cache non-GET requests
          // ========================================
          if (req.method !== 'GET') {
            console.log(`🚫 [Transfer Cache] EXCLUDED (${req.method}): ${req.url}`);
            return false; // DON'T CACHE
          }

          // ========================================
          // Rule 2: Excluded paths (CRITICAL!)
          // ========================================
          const excludedPaths = [
            // Auth endpoints - ALL methods
            '/auth/login',
            '/auth/register',
            '/auth/refresh', // 🔥 MOST CRITICAL - Never cache this!
            '/auth/logout',

            // User-specific data
            '/profile',

            // Optional: Add more endpoints as needed
            // '/dashboard',
            // '/api/v1/posts/create',
          ];

          /**
           * Check if request URL contains any excluded path
           */
          const isExcluded = excludedPaths.some((path) => req.url.includes(path));

          if (isExcluded) {
            console.log(`🚫 [Transfer Cache] EXCLUDED (Path Match): ${req.url}`);
            return false; // DON'T CACHE
          }

          // ========================================
          // Rule 3: Cache allowed GET requests
          // ========================================
          console.log(`✅ [Transfer Cache] CACHED: GET ${req.url}`);
          return true; // CACHE THIS
        },

        /**
         * Additional Options (Optional)
         */
        // includeHeaders: [], // Headers to include in cache key
        // includePostRequests: false, // CRITICAL: Never cache POST (default false)
        // includeRequestsWithAuthHeaders: false, // Don't cache authenticated requests
      })
    ),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);

/**
 * DEBUGGING TIPS:
 *
 * 1. Check Console Logs:
 *    - Look for "🚫 [Transfer Cache] EXCLUDED"
 *    - Confirm /auth/refresh is excluded
 *
 * 2. Chrome DevTools → Network:
 *    - Refresh page
 *    - Click on /auth/refresh request
 *    - Check "Size" column:
 *      ✅ "XXX B" = Real request (GOOD)
 *      ❌ "(from disk cache)" = Cached (BAD)
 *
 * 3. Database Check:
 *    - After login, check refresh_tokens table
 *    - Should only see 1 token with is_revoked = false
 *    - After page refresh, check again
 *    - Should see:
 *      ✅ Old token is_revoked = true
 *      ✅ New token is_revoked = false
 *      ❌ Multiple tokens with is_revoked = true (BAD)
 *
 * 4. Force Clear Cache:
 *    - Chrome DevTools → Application → Storage → Clear site data
 *    - Hard refresh: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
 */
