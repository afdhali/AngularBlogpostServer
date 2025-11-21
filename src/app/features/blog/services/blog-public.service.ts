// src/app/features/blog/services/blog-public.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { BlogPost, BlogFilters, PaginatedBlogResponse } from '../models/blog-public.model';
import { environment } from '../../../../environments/environment';

interface ApiResponse<T> {
  code: number;
  status: string;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class BlogPublicService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/posts`;

  // State signals
  private postList = signal<BlogPost[]>([]);
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
   * Load published posts with filters (for public blog)
   * Always filters by status = 'published'
   */
  loadPublishedPosts(filters: BlogFilters = {}): Observable<ApiResponse<PaginatedBlogResponse>> {
    this.isLoading.set(true);
    this.error.set(null);

    let params = new HttpParams();
    params = params.set('status', 'published'); // Always filter published posts

    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.search) params = params.set('search', filters.search);
    if (filters.category_id) params = params.set('category_id', filters.category_id);
    if (filters.tag) params = params.set('tag', filters.tag);
    if (filters.sort_by) params = params.set('sort_by', filters.sort_by);
    if (filters.sort_order) params = params.set('sort_order', filters.sort_order);

    return this.http.get<ApiResponse<PaginatedBlogResponse>>(this.apiUrl, { params }).pipe(
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
   * Get post by slug (for detail page)
   */
  getPostBySlug(slug: string): Observable<ApiResponse<BlogPost>> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.get<ApiResponse<BlogPost>>(`${this.apiUrl}/slug/${slug}`).pipe(
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.error.set(err.error?.data?.message || 'Failed to load post');
        this.isLoading.set(false);
        return throwError(() => err);
      })
    );
  }

  /**
   * Get post by ID (alternative)
   */
  getPostById(id: string): Observable<ApiResponse<BlogPost>> {
    return this.http.get<ApiResponse<BlogPost>>(`${this.apiUrl}/${id}`);
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
