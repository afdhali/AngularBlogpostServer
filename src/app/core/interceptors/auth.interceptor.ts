import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Auth Token Interceptor - FIXED VERSION
 *
 * Fungsi:
 * 1. Menambahkan Bearer token ke header Authorization
 * 2. Auto refresh token kalau dapat 401 error
 * 3. Retry original request dengan token baru
 * 4. ✅ Better error handling untuk BFF proxy
 *
 * Flow Auto Refresh:
 * Request → 401 Error → Refresh Token → Retry Request → Success
 *
 * Catatan:
 * - Skip endpoints auth (login, register, refresh) karena tidak butuh token
 * - Kalau refresh token juga expired, logout user
 * - BFF proxy errors (503) di-detect dan di-log dengan jelas
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // ========================================
  // STEP 1: Skip auth endpoints
  // ========================================
  const skipUrls = ['/auth/login', '/auth/register', '/auth/refresh'];
  const shouldSkip = skipUrls.some((url) => req.url.includes(url));

  if (shouldSkip) {
    console.log(`📝 [authInterceptor] Skipping token for ${req.method} ${req.url}`);
    return next(req);
  }

  // ========================================
  // STEP 2: Tambahkan access token kalau ada
  // ========================================
  const accessToken = authService.getAccessToken();
  let clonedRequest = req;

  if (accessToken) {
    console.log(`🔐 [authInterceptor] Adding Bearer token for ${req.method} ${req.url}`);
    clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } else {
    console.log(`⚠️ [authInterceptor] No access token available for ${req.method} ${req.url}`);
  }

  // ========================================
  // STEP 3: Forward request dan handle errors
  // ========================================
  return next(clonedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      // ========================================
      // ERROR HANDLING
      // ========================================

      console.error(`❌ [authInterceptor] HTTP Error ${error.status} on ${req.method} ${req.url}`);

      // ----------------------------------------
      // Case 1: BFF Proxy Error (503)
      // ----------------------------------------
      if (error.status === 503) {
        console.error('🔴 [authInterceptor] BFF Proxy Error - Backend service unavailable!');
        console.error('   Error message:', error.error?.data?.message);
        console.error('   Possible causes:');
        console.error('   - Backend Golang not running');
        console.error('   - BFF proxy cannot reach backend');
        console.error('   - Network timeout');

        // Option 1: Langsung throw error ke component
        return throwError(() => ({
          code: 503,
          message: 'Backend service unavailable',
          error,
        }));

        // Option 2: Redirect ke error page
        // this.router.navigate(['/error'], { queryParams: { code: 503 } });
        // return EMPTY;
      }

      // ----------------------------------------
      // Case 2: Unauthorized (401) - Token Expired
      // ----------------------------------------
      if (error.status === 401) {
        console.warn('🔄 [authInterceptor] Access token expired (401)');

        // Check if we have refresh token
        if (!authService.hasRefreshToken()) {
          console.error('❌ [authInterceptor] No refresh token available, logging out');
          authService.logout();
          return throwError(() => error);
        }

        console.log('🔄 [authInterceptor] Attempting to refresh access token...');

        // ✅ KEY: Attempt refresh dan retry original request
        return authService.performRefreshToken().pipe(
          switchMap(() => {
            console.log('✅ [authInterceptor] Token refreshed successfully');

            // Get new token dan retry original request
            const newToken = authService.getAccessToken();
            const newRequest = req.clone({
              setHeaders: {
                Authorization: `Bearer ${newToken}`,
              },
            });

            console.log(`🔄 [authInterceptor] Retrying original request with new token`);
            return next(newRequest);
          }),
          catchError((refreshError) => {
            console.error('❌ [authInterceptor] Refresh token failed:', refreshError);
            console.error('   Logout user dan redirect ke login page');

            authService.logout();
            return throwError(() => refreshError);
          })
        );
      }

      // ----------------------------------------
      // Case 3: Forbidden (403)
      // ----------------------------------------
      if (error.status === 403) {
        console.error('🚫 [authInterceptor] Forbidden (403) - User tidak memiliki akses');
        console.error('   Error message:', error.error?.data?.message);

        return throwError(() => ({
          code: 403,
          message: 'Forbidden - You do not have permission to access this resource',
          error,
        }));
      }

      // ----------------------------------------
      // Case 4: Not Found (404)
      // ----------------------------------------
      if (error.status === 404) {
        console.warn('🔍 [authInterceptor] Not found (404)');
        return throwError(() => error);
      }

      // ----------------------------------------
      // Case 5: Server Error (500, 502, etc)
      // ----------------------------------------
      if (error.status >= 500) {
        console.error(`🔴 [authInterceptor] Server error (${error.status})`);
        console.error('   Error message:', error.error?.data?.message);

        return throwError(() => ({
          code: error.status,
          message: 'Server error occurred',
          error,
        }));
      }

      // ----------------------------------------
      // Case 6: Network Error atau timeout
      // ----------------------------------------
      if (error.status === 0) {
        console.error('❌ [authInterceptor] Network error atau timeout');
        console.error('   Mungkin penyebab:');
        console.error('   - Network tidak connect');
        console.error('   - CORS issue');
        console.error('   - Request timeout');

        return throwError(() => ({
          code: 0,
          message: 'Network error - Please check your connection',
          error,
        }));
      }

      // ----------------------------------------
      // Case 7: Other errors
      // ----------------------------------------
      console.error('❌ [authInterceptor] Unknown error occurred');
      console.error('   Status:', error.status);
      console.error('   Message:', error.error?.data?.message);

      return throwError(() => error);
    })
  );
};

/**
 * Usage di Components:
 *
 * Untuk handle errors dari interceptor:
 *
 * this.http.get('/api/v1/profile').subscribe({
 *   next: (data) => {
 *     console.log('Success:', data);
 *   },
 *   error: (error) => {
 *     // Handle specific errors
 *     if (error.code === 503) {
 *       console.log('Backend not available');
 *     } else if (error.code === 403) {
 *       console.log('Permission denied');
 *     }
 *   }
 * });
 */
