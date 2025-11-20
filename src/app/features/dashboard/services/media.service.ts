// media.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, tap, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import {
  Media,
  MediaFilters,
  MediaListResponse,
  MediaResponse,
  MediaUpdatePayload,
} from '../models/media.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MediaService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  // Signals untuk state management
  private mediaList = signal<Media[]>([]);
  private currentMedia = signal<Media | null>(null);
  private isLoading = signal(false);
  private error = signal<string | null>(null);
  private totalPages = signal(0);
  private totalData = signal(0);
  private currentPage = signal(1);
  private filters = signal<MediaFilters>({
    page: 1,
    limit: 12,
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  // Readonly signals untuk components
  getMediaList = computed(() => this.mediaList());
  getCurrentMedia = computed(() => this.currentMedia());
  getIsLoading = computed(() => this.isLoading());
  getError = computed(() => this.error());
  getTotalPages = computed(() => this.totalPages());
  getTotalData = computed(() => this.totalData());
  getCurrentPage = computed(() => this.currentPage());
  getFilters = computed(() => this.filters());

  // Computed untuk user's own media (membutuhkan user ID dari auth)
  getUserMedia = computed(() => {
    const user = this.authService.user();
    if (!user) return [];
    return this.mediaList().filter((m) => m.user.id === user.id);
  });

  /**
   * Get all media with filters (Public - only needs API Key via BFF)
   */
  loadMedia(filters?: MediaFilters): Observable<MediaListResponse> {
    this.isLoading.set(true);
    this.error.set(null);

    // Merge with existing filters
    const currentFilters = { ...this.filters(), ...filters };
    this.filters.set(currentFilters);

    // Build query params
    let params = new HttpParams();
    Object.entries(currentFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<MediaListResponse>(`${environment.apiUrl}/media`, { params }).pipe(
      tap((response) => {
        this.mediaList.set(response.data.data);
        this.totalPages.set(response.data.total_pages);
        this.totalData.set(response.data.total_data);
        this.currentPage.set(response.data.page);
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.error.set(err.error?.data?.message || 'Failed to load media');
        this.isLoading.set(false);
        console.error('Error loading media:', err);
        return of({
          code: 500,
          status: 'ERROR',
          data: {
            page: 1,
            limit: 12,
            total_data: 0,
            total_pages: 0,
            data: [],
          },
        } as MediaListResponse);
      })
    );
  }

  /**
   * Get media by ID (Public)
   */
  loadMediaById(id: string): Observable<MediaResponse> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.get<MediaResponse>(`${environment.apiUrl}/media/${id}`).pipe(
      tap((response) => {
        this.currentMedia.set(response.data);
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.error.set(err.error?.data?.message || 'Failed to load media');
        this.isLoading.set(false);
        console.error('Error loading media:', err);
        return of({
          code: 404,
          status: 'NOT_FOUND',
          data: null as any,
        } as MediaResponse);
      })
    );
  }

  /**
   * Upload media (Authenticated user)
   * BFF will automatically add Bearer token via AuthInterceptor
   */
  uploadMedia(file: File, payload?: Partial<MediaUpdatePayload>): Observable<MediaResponse> {
    this.isLoading.set(true);
    this.error.set(null);

    const formData = new FormData();
    formData.append('file', file);

    if (payload?.alt_text) {
      formData.append('alt_text', payload.alt_text);
    }
    if (payload?.description) {
      formData.append('description', payload.description);
    }
    if (payload?.is_featured !== undefined) {
      formData.append('is_featured', payload.is_featured.toString());
    }
    if (payload?.post_id) {
      formData.append('post_id', payload.post_id);
    }

    // Extract width and height for images
    if (file.type.startsWith('image/') && payload?.width && payload?.height) {
      formData.append('width', payload.width.toString());
      formData.append('height', payload.height.toString());
    }

    return this.http.post<MediaResponse>(`${environment.apiUrl}/media`, formData).pipe(
      tap((response) => {
        // Add new media to list
        this.mediaList.update((list) => [response.data, ...list]);
        this.totalData.update((count) => count + 1);
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.error.set(err.error?.data?.message || 'Failed to upload media');
        this.isLoading.set(false);
        console.error('Error uploading media:', err);
        throw err;
      })
    );
  }

  /**
   * Update media metadata (Owner or Admin)
   * BFF will automatically add Bearer token via AuthInterceptor
   */
  updateMedia(id: string, payload: MediaUpdatePayload): Observable<MediaResponse> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.put<MediaResponse>(`${environment.apiUrl}/media/${id}`, payload).pipe(
      tap((response) => {
        // Update media in list
        this.mediaList.update((list) => list.map((m) => (m.id === id ? response.data : m)));
        if (this.currentMedia()?.id === id) {
          this.currentMedia.set(response.data);
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.error.set(err.error?.data?.message || 'Failed to update media');
        this.isLoading.set(false);
        console.error('Error updating media:', err);
        throw err;
      })
    );
  }

  /**
   * Delete media (Owner or Admin)
   * BFF will automatically add Bearer token via AuthInterceptor
   */
  deleteMedia(id: string): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.delete(`${environment.apiUrl}/media/${id}`).pipe(
      tap(() => {
        // Remove media from list
        this.mediaList.update((list) => list.filter((m) => m.id !== id));
        this.totalData.update((count) => Math.max(0, count - 1));
        if (this.currentMedia()?.id === id) {
          this.currentMedia.set(null);
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.error.set(err.error?.data?.message || 'Failed to delete media');
        this.isLoading.set(false);
        console.error('Error deleting media:', err);
        throw err;
      })
    );
  }

  /**
   * Get media by post ID (Public)
   */
  loadMediaByPostId(postId: string): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.get(`${environment.apiUrl}/posts/${postId}/media`).pipe(
      tap((response: any) => {
        // You can handle this differently if needed
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.error.set(err.error?.data?.message || 'Failed to load post media');
        this.isLoading.set(false);
        console.error('Error loading post media:', err);
        return of({ code: 404, status: 'NOT_FOUND', data: [] });
      })
    );
  }

  // Helper methods
  setFilters(filters: MediaFilters): void {
    this.filters.update((current) => ({ ...current, ...filters }));
  }

  clearFilters(): void {
    this.filters.set({
      page: 1,
      limit: 12,
      sort_by: 'created_at',
      sort_order: 'desc',
    });
  }

  clearError(): void {
    this.error.set(null);
  }

  goToPage(page: number): void {
    this.setFilters({ page });
    this.loadMedia().subscribe();
  }

  nextPage(): void {
    const current = this.currentPage();
    const total = this.totalPages();
    if (current < total) {
      this.goToPage(current + 1);
    }
  }

  previousPage(): void {
    const current = this.currentPage();
    if (current > 1) {
      this.goToPage(current - 1);
    }
  }
}
