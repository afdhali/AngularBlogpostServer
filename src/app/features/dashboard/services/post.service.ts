// src/app/features/dashboard/services/post.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Post, PostFilters, PostCreateRequest, PostUpdateRequest } from '../models/post.model';
import { environment } from '../../../../environments/environment';

interface ApiResponse<T> {
  code: number;
  status: string;
  data: T;
}

interface PaginatedResponse<T> {
  page: number;
  limit: number;
  total_data: number;
  total_pages: number;
  data: T[];
}

@Injectable({
  providedIn: 'root',
})
export class PostService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/posts`;

  // State signals
  private postList = signal<Post[]>([]);
  private isLoading = signal<boolean>(false);
  private error = signal<string | null>(null);
  private currentPage = signal<number>(1);
  private totalPages = signal<number>(1);
  private totalData = signal<number>(0);

  // Public computed getters
  getPostList = this.postList.asReadonly();
  getIsLoading = this.isLoading.asReadonly();
  getError = this.error.asReadonly();
  getCurrentPage = this.currentPage.asReadonly();
  getTotalPages = this.totalPages.asReadonly();
  getTotalData = this.totalData.asReadonly();

  /**
   * Load posts with filters
   */
  loadPosts(filters: PostFilters = {}): Observable<ApiResponse<PaginatedResponse<Post>>> {
    this.isLoading.set(true);
    this.error.set(null);

    let params = new HttpParams();
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.search) params = params.set('search', filters.search);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.category_id) params = params.set('category_id', filters.category_id);
    if (filters.tag) params = params.set('tag', filters.tag);
    if (filters.author_id) params = params.set('author_id', filters.author_id);
    if (filters.sort_by) params = params.set('sort_by', filters.sort_by);
    if (filters.sort_order) params = params.set('sort_order', filters.sort_order);

    return this.http.get<ApiResponse<PaginatedResponse<Post>>>(this.apiUrl, { params }).pipe(
      tap((response) => {
        this.postList.set(response.data.data);
        this.currentPage.set(response.data.page);
        this.totalPages.set(response.data.total_pages);
        this.totalData.set(response.data.total_data);
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.error.set(err.error?.data?.message || 'Failed to load posts');
        this.isLoading.set(false);
        return throwError(() => err);
      })
    );
  }

  /**
   * Get post by ID
   */
  getPostById(id: string): Observable<ApiResponse<Post>> {
    return this.http.get<ApiResponse<Post>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get post by slug
   */
  getPostBySlug(slug: string): Observable<ApiResponse<Post>> {
    return this.http.get<ApiResponse<Post>>(`${this.apiUrl}/slug/${slug}`);
  }

  /**
   * Create new post
   */
  createPost(payload: PostCreateRequest): Observable<ApiResponse<Post>> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.post<ApiResponse<Post>>(this.apiUrl, payload).pipe(
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.error.set(err.error?.data?.message || 'Failed to create post');
        this.isLoading.set(false);
        return throwError(() => err);
      })
    );
  }

  /**
   * Update existing post
   */
  updatePost(id: string, payload: PostUpdateRequest): Observable<ApiResponse<Post>> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.put<ApiResponse<Post>>(`${this.apiUrl}/${id}`, payload).pipe(
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.error.set(err.error?.data?.message || 'Failed to update post');
        this.isLoading.set(false);
        return throwError(() => err);
      })
    );
  }

  /**
   * Delete post
   */
  deletePost(id: string): Observable<ApiResponse<{ message: string }>> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.delete<ApiResponse<{ message: string }>>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        // Remove from local state
        this.postList.update((posts) => posts.filter((p) => p.id !== id));
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.error.set(err.error?.data?.message || 'Failed to delete post');
        this.isLoading.set(false);
        return throwError(() => err);
      })
    );
  }

  /**
   * Publish post (Admin only)
   */
  publishPost(id: string): Observable<ApiResponse<Post>> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.post<ApiResponse<Post>>(`${this.apiUrl}/${id}/publish`, {}).pipe(
      tap((response) => {
        // Update local state
        this.postList.update((posts) => posts.map((p) => (p.id === id ? response.data : p)));
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.error.set(err.error?.data?.message || 'Failed to publish post');
        this.isLoading.set(false);
        return throwError(() => err);
      })
    );
  }

  /**
   * Unpublish post (Admin only)
   */
  unpublishPost(id: string): Observable<ApiResponse<Post>> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.post<ApiResponse<Post>>(`${this.apiUrl}/${id}/unpublish`, {}).pipe(
      tap((response) => {
        // Update local state
        this.postList.update((posts) => posts.map((p) => (p.id === id ? response.data : p)));
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.error.set(err.error?.data?.message || 'Failed to unpublish post');
        this.isLoading.set(false);
        return throwError(() => err);
      })
    );
  }

  /**
   * Pagination helpers
   */
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
    }
  }
}
