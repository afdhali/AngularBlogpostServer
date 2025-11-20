import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  tap,
  catchError,
  throwError,
  Observable,
  EMPTY,
  of,
  switchMap,
  map,
  shareReplay,
  finalize,
} from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';
import {
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  TokenResponse,
  UserResponse,
} from '../models/auth.model';

/**
 * Authentication Service - ULTIMATE FIX
 *
 * Issues Fixed:
 * 1. ✅ Prevent double/multiple refresh token requests (Request Locking)
 * 2. ✅ Proper platform detection (Server vs Browser)
 * 3. ✅ Better initialization flag management
 * 4. ✅ Clear logging untuk debugging
 * 5. ✅ Handle race conditions
 *
 * Critical Changes:
 * - Added refreshTokenInProgress$ observable untuk prevent multiple refresh
 * - Added isInitializing flag untuk prevent double init
 * - Improved error handling dengan detailed logging
 * - Platform check di semua storage operations
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  // ===== TOKEN MANAGEMENT =====

  /**
   * Access Token: IN-MEMORY ONLY (Never persisted)
   */
  private accessToken: string | null = null;

  /**
   * Refresh Token Storage Key
   */
  private readonly REFRESH_TOKEN_KEY = 'rt';

  // ===== REQUEST LOCKING (Prevent Multiple Refresh) =====

  /**
   * 🔒 CRITICAL: Observable untuk tracking refresh token in progress
   *
   * Kenapa ini penting?
   * - Prevent multiple refresh token requests secara bersamaan
   * - shareReplay(1) = Share 1 response ke multiple subscribers
   * - Kalau ada multiple requests, semua akan wait untuk same refresh
   */
  private refreshTokenInProgress$: Observable<void> | null = null;

  // ===== INITIALIZATION FLAGS =====

  /**
   * Flag untuk prevent double initialization
   * Set ke true setelah initAuth() pertama kali dipanggil
   */
  private isInitialized = false;

  /**
   * Flag untuk tracking initialization in progress
   * Prevent race condition saat multiple components call initAuth()
   */
  private isInitializing = false;

  // ===== SIGNALS (State Management) =====

  private userSignal = signal<User | null>(null);
  private isLoadingSignal = signal(false);
  private errorSignal = signal<string | null>(null);

  // ===== PUBLIC READONLY SIGNALS =====

  readonly user = this.userSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  // ===== COMPUTED SIGNALS (Derived State) =====

  readonly isAuthenticated = computed(() => this.userSignal() !== null);
  readonly isSuperAdmin = computed(() => this.userSignal()?.role === 'super_admin');
  readonly isAdmin = computed(() => {
    const role = this.userSignal()?.role;
    return role === 'super_admin' || role === 'admin';
  });
  readonly canManagePosts = computed(() => this.isAdmin());
  readonly canManageUsers = computed(() => this.isSuperAdmin());

  // ===== PLATFORM CHECK =====

  /**
   * Check if code is running in browser environment
   * Returns false during SSR
   */
  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  // ===== REFRESH TOKEN GETTER/SETTER =====

  /**
   * Get refresh token from sessionStorage (browser only)
   */
  private get refreshToken(): string | null {
    if (!this.isBrowser()) {
      console.log('⚠️ [refreshToken getter] Not in browser, returning null');
      return null;
    }

    try {
      const encrypted = sessionStorage.getItem(this.REFRESH_TOKEN_KEY);
      if (!encrypted) {
        return null;
      }
      const decrypted = this.decrypt(encrypted);
      console.log('🔑 [refreshToken getter] Token retrieved from sessionStorage');
      return decrypted;
    } catch (error) {
      console.error('❌ [refreshToken getter] Failed to get refresh token:', error);
      return null;
    }
  }

  /**
   * Set refresh token to sessionStorage (browser only)
   */
  private set refreshToken(token: string | null) {
    if (!this.isBrowser()) {
      console.log('⚠️ [refreshToken setter] Not in browser, skipping storage');
      return;
    }

    try {
      if (token) {
        const encrypted = this.encrypt(token);
        sessionStorage.setItem(this.REFRESH_TOKEN_KEY, encrypted);
        console.log('✅ [refreshToken setter] Token saved to sessionStorage');
      } else {
        sessionStorage.removeItem(this.REFRESH_TOKEN_KEY);
        console.log('✅ [refreshToken setter] Token removed from sessionStorage');
      }
    } catch (error) {
      console.error('❌ [refreshToken setter] Failed to set refresh token:', error);
    }
  }

  // ===== ENCRYPTION/DECRYPTION =====

  private encrypt(text: string): string {
    const key = environment.encryptionKey;
    let encrypted = '';
    for (let i = 0; i < text.length; i++) {
      encrypted += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(encrypted);
  }

  private decrypt(encrypted: string): string {
    const key = environment.encryptionKey;
    const text = atob(encrypted);
    let decrypted = '';
    for (let i = 0; i < text.length; i++) {
      decrypted += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return decrypted;
  }

  // ===== PUBLIC METHODS =====

  getAccessToken(): string | null {
    return this.accessToken;
  }

  hasRefreshToken(): boolean {
    return this.refreshToken !== null;
  }

  /**
   * 🔥 ULTIMATE FIX: Initialize auth state
   *
   * Critical Improvements:
   * 1. Platform check (skip di server)
   * 2. Initialization flag (prevent double init)
   * 3. Initializing flag (prevent race condition)
   * 4. Proper error handling dengan detailed logging
   * 5. Always return Observable (never null)
   *
   * Flow:
   * 1. Check platform (browser only)
   * 2. Check if already initialized
   * 3. Check if initialization in progress
   * 4. Check refresh token availability
   * 5. Attempt refresh token
   * 6. Fetch user profile
   * 7. Mark as initialized
   */
  initAuth(): Observable<void> {
    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('🔄 [initAuth] STARTING AUTH INITIALIZATION');
    console.log('═══════════════════════════════════════════════');

    // ========================================
    // STEP 1: Platform Check
    // ========================================
    if (!this.isBrowser()) {
      console.log('🖥️ [initAuth] Server-side rendering detected');
      console.log('   → Skipping initialization (no sessionStorage available)');
      console.log('═══════════════════════════════════════════════');
      return EMPTY;
    }

    console.log('🌐 [initAuth] Browser environment detected');

    // ========================================
    // STEP 2: Already Initialized Check
    // ========================================
    if (this.isInitialized) {
      console.log('✅ [initAuth] Already initialized');
      console.log('   → Skipping re-initialization');
      console.log('   → User:', this.userSignal()?.username || 'Not logged in');
      console.log('═══════════════════════════════════════════════');
      return EMPTY;
    }

    // ========================================
    // STEP 3: Initialization In Progress Check
    // ========================================
    if (this.isInitializing) {
      console.log('⏳ [initAuth] Initialization already in progress');
      console.log('   → Skipping duplicate initialization attempt');
      console.log('═══════════════════════════════════════════════');
      return EMPTY;
    }

    // ========================================
    // STEP 4: Refresh Token Check
    // ========================================
    if (!this.hasRefreshToken()) {
      console.log('⚠️ [initAuth] No refresh token found in sessionStorage');
      console.log('   → User needs to login');
      console.log('═══════════════════════════════════════════════');
      this.isInitialized = true; // Mark as initialized (checked, no token)
      return EMPTY;
    }

    console.log('🔑 [initAuth] Refresh token found in sessionStorage');

    // ========================================
    // STEP 5: Start Initialization
    // ========================================
    this.isInitializing = true;
    this.isLoadingSignal.set(true);

    console.log('📡 [initAuth] Starting token refresh process...');

    return this.performRefreshToken().pipe(
      switchMap(() => {
        console.log('✅ [initAuth] Access token refreshed successfully');
        console.log('👤 [initAuth] Fetching user profile...');
        return this.fetchUserProfile().pipe(map(() => void 0));
      }),
      tap(() => {
        console.log('✅ [initAuth] User profile fetched successfully');
        console.log('   → Username:', this.userSignal()?.username);
        console.log('   → Email:', this.userSignal()?.email);
        console.log('   → Role:', this.userSignal()?.role);
        this.isLoadingSignal.set(false);
        this.isInitialized = true;
        this.isInitializing = false;
        console.log('═══════════════════════════════════════════════');
        console.log('✅ [initAuth] AUTH INITIALIZATION COMPLETE');
        console.log('═══════════════════════════════════════════════');
        console.log('');
      }),
      catchError((error) => {
        console.error('');
        console.error('═══════════════════════════════════════════════');
        console.error('❌ [initAuth] AUTH INITIALIZATION FAILED');
        console.error('═══════════════════════════════════════════════');
        console.error('Error details:', error);

        if (error.status === 401) {
          console.error('   → Refresh token expired or invalid');
        } else if (error.status === 503) {
          console.error('   → Backend service unavailable');
        } else if (error.status === 0) {
          console.error('   → Network error or CORS issue');
        }

        console.error('   → Clearing auth state and requiring re-login');
        console.error('═══════════════════════════════════════════════');
        console.error('');

        this.clearAuthState();
        return EMPTY;
      }),
      finalize(() => {
        // Always clean up flags
        this.isInitializing = false;
        this.isLoadingSignal.set(false);
      })
    );
  }

  /**
   * Login user
   */
  login(credentials: LoginRequest): Observable<AuthResponse> {
    console.log('🔐 [login] Starting login process...');
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, credentials).pipe(
      tap((response) => {
        console.log('✅ [login] Login successful');
        console.log('   → Username:', response.data.user.username);
        console.log('   → Role:', response.data.user.role);

        this.accessToken = response.data.access_token;
        this.refreshToken = response.data.refresh_token;
        this.userSignal.set(response.data.user);
        this.isLoadingSignal.set(false);

        // Mark as initialized after successful login
        this.isInitialized = true;
      }),
      catchError((error) => {
        const message = error.error?.data?.message || 'Login failed';
        console.error('❌ [login] Login failed:', message);
        this.errorSignal.set(message);
        this.isLoadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Register user
   */
  register(data: RegisterRequest): Observable<AuthResponse> {
    console.log('📝 [register] Starting registration process...');
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, data).pipe(
      tap((response) => {
        console.log('✅ [register] Registration successful, auto-login');
        console.log('   → Username:', response.data.user.username);

        this.accessToken = response.data.access_token;
        this.refreshToken = response.data.refresh_token;
        this.userSignal.set(response.data.user);
        this.isLoadingSignal.set(false);

        // Mark as initialized after successful registration
        this.isInitialized = true;
      }),
      catchError((error) => {
        const message = error.error?.data?.message || 'Registration failed';
        console.error('❌ [register] Registration failed:', message);
        this.errorSignal.set(message);
        this.isLoadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Logout user
   */
  logout(): void {
    console.log('👋 [logout] Logging out user...');
    this.clearAuthState();
    this.router.navigate(['/auth/login']);
  }

  /**
   * 🔥 CRITICAL FIX: Perform refresh token dengan request locking
   *
   * Kenapa Request Locking?
   * - Prevent multiple refresh token requests secara bersamaan
   * - Share response ke multiple subscribers
   * - Avoid race condition yang menyebabkan multiple revoked tokens
   *
   * Flow:
   * 1. Check if refresh already in progress → return existing Observable
   * 2. If not, create new refresh request
   * 3. shareReplay(1) → Share 1 response ke all subscribers
   * 4. Cleanup refreshTokenInProgress$ setelah complete
   */
  performRefreshToken(): Observable<void> {
    console.log('');
    console.log('───────────────────────────────────────────────');
    console.log('🔄 [performRefreshToken] Attempting token refresh');
    console.log('───────────────────────────────────────────────');

    // ========================================
    // STEP 1: Check if refresh in progress
    // ========================================
    if (this.refreshTokenInProgress$) {
      console.log('⏳ [performRefreshToken] Refresh already in progress');
      console.log('   → Waiting for existing request to complete...');
      return this.refreshTokenInProgress$;
    }

    // ========================================
    // STEP 2: Validate refresh token
    // ========================================
    const refreshToken = this.refreshToken;

    if (!refreshToken) {
      console.error('❌ [performRefreshToken] No refresh token available');
      console.log('───────────────────────────────────────────────');
      return throwError(() => new Error('No refresh token available'));
    }

    console.log('🔑 [performRefreshToken] Refresh token found');
    console.log('📡 [performRefreshToken] Sending refresh request to backend...');

    // ========================================
    // STEP 3: Create refresh request with locking
    // ========================================
    this.refreshTokenInProgress$ = this.http
      .post<TokenResponse>(`${environment.apiUrl}/auth/refresh`, {
        refresh_token: refreshToken,
      })
      .pipe(
        tap((response) => {
          console.log('✅ [performRefreshToken] Token refresh successful');
          console.log('   → New access token received');
          console.log('   → New refresh token received');
          console.log('   → Expires in:', response.data.expires_in, 'seconds');

          // Update tokens
          this.accessToken = response.data.access_token;
          this.refreshToken = response.data.refresh_token;
        }),
        catchError((error) => {
          console.error('❌ [performRefreshToken] Refresh failed');
          console.error('   → Status:', error.status);
          console.error('   → Message:', error.error?.data?.message);

          if (error.status === 401) {
            console.error('   → Refresh token expired or invalid');
            console.error('   → User will be logged out');
          } else if (error.status === 503) {
            console.error('   → Backend service unavailable');
          }

          console.log('───────────────────────────────────────────────');
          return throwError(() => error);
        }),
        switchMap(() => of(void 0)),
        shareReplay(1), // 🔒 CRITICAL: Share response to all subscribers
        finalize(() => {
          // ========================================
          // STEP 4: Cleanup lock after completion
          // ========================================
          console.log('🧹 [performRefreshToken] Cleaning up refresh lock');
          console.log('───────────────────────────────────────────────');
          console.log('');
          this.refreshTokenInProgress$ = null;
        })
      );

    return this.refreshTokenInProgress$;
  }

  /**
   * Fetch user profile
   */
  private fetchUserProfile(): Observable<User> {
    console.log('👤 [fetchUserProfile] Fetching user profile...');

    return this.http.get<UserResponse>(`${environment.apiUrl}/profile`).pipe(
      tap((response) => {
        console.log('✅ [fetchUserProfile] User profile fetched');
        console.log('   → Username:', response.data.username);
        console.log('   → Email:', response.data.email);
        this.userSignal.set(response.data);
        this.isLoadingSignal.set(false);
      }),
      switchMap((response) => of(response.data)),
      catchError((error) => {
        console.error('❌ [fetchUserProfile] Failed to fetch profile');
        console.error('   → Error:', error);
        this.isLoadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Clear all auth state
   */
  private clearAuthState(): void {
    console.log('🧹 [clearAuthState] Clearing all auth state...');
    this.accessToken = null;
    this.refreshToken = null;
    this.userSignal.set(null);
    this.isLoadingSignal.set(false);
    this.errorSignal.set(null);
    this.isInitialized = false;
    this.isInitializing = false;
    this.refreshTokenInProgress$ = null;
    console.log('✅ [clearAuthState] Auth state cleared');
  }
}
