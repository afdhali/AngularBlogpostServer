// category.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import {
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CategoryFilters,
  CategoryResponse,
  CategoryListResponse,
  MessageResponse,
} from '../models/category.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/categories`;

  // State signals
  private categories = signal<Category[]>([]);
  private isLoading = signal(false);
  private error = signal<string | null>(null);

  // Pagination signals
  private currentPage = signal(1);
  private totalPages = signal(1);
  private totalData = signal(0);
  private limit = signal(10);

  // Filters
  private filters = signal<CategoryFilters>({});

  // Readonly getters for components
  getCategoriesList = this.categories.asReadonly();
  getIsLoading = this.isLoading.asReadonly();
  getError = this.error.asReadonly();
  getCurrentPage = this.currentPage.asReadonly();
  getTotalPages = this.totalPages.asReadonly();
  getTotalData = this.totalData.asReadonly();
  getLimit = this.limit.asReadonly();

  /**
   * Load categories with filters and pagination
   */
  loadCategories(filters: CategoryFilters = {}): Observable<CategoryListResponse> {
    this.isLoading.set(true);
    this.error.set(null);
    this.filters.set(filters);

    let params = new HttpParams();
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.search) params = params.set('search', filters.search);
    if (filters.sort_by) params = params.set('sort_by', filters.sort_by);
    if (filters.sort_order) params = params.set('sort_order', filters.sort_order);

    return this.http.get<CategoryListResponse>(this.apiUrl, { params }).pipe(
      tap((response) => {
        this.categories.set(response.data.data);
        this.currentPage.set(response.data.page);
        this.totalPages.set(response.data.total_pages);
        this.totalData.set(response.data.total_data);
        this.limit.set(response.data.limit);
        this.isLoading.set(false);
        console.log('✅ Categories loaded:', response.data.total_data);
      }),
      catchError((err) => {
        this.error.set(err.error?.data?.message || 'Failed to load categories');
        this.isLoading.set(false);
        console.error('❌ Load categories error:', err);
        return of({
          code: 500,
          status: 'ERROR',
          data: {
            page: 1,
            limit: 10,
            total_data: 0,
            total_pages: 0,
            data: [],
          },
        } as CategoryListResponse);
      })
    );
  }

  /**
   * Get category by ID
   */
  getCategoryById(id: string): Observable<CategoryResponse> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.get<CategoryResponse>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        this.isLoading.set(false);
        console.log('✅ Category fetched');
      }),
      catchError((err) => {
        this.error.set(err.error?.data?.message || 'Failed to load category');
        this.isLoading.set(false);
        console.error('❌ Get category error:', err);
        throw err;
      })
    );
  }

  /**
   * Create new category (Admin only)
   */
  createCategory(data: CreateCategoryRequest): Observable<CategoryResponse> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.post<CategoryResponse>(this.apiUrl, data).pipe(
      tap((response) => {
        // Reload categories after creation
        this.loadCategories(this.filters()).subscribe();
        this.isLoading.set(false);
        console.log('✅ Category created:', response.data.name);
      }),
      catchError((err) => {
        this.error.set(err.error?.data?.message || 'Failed to create category');
        this.isLoading.set(false);
        console.error('❌ Create category error:', err);
        throw err;
      })
    );
  }

  /**
   * Update category (Admin only)
   */
  updateCategory(id: string, data: UpdateCategoryRequest): Observable<CategoryResponse> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.put<CategoryResponse>(`${this.apiUrl}/${id}`, data).pipe(
      tap((response) => {
        // Update local state
        this.categories.update((cats) => cats.map((cat) => (cat.id === id ? response.data : cat)));
        this.isLoading.set(false);
        console.log('✅ Category updated:', response.data.name);
      }),
      catchError((err) => {
        this.error.set(err.error?.data?.message || 'Failed to update category');
        this.isLoading.set(false);
        console.error('❌ Update category error:', err);
        throw err;
      })
    );
  }

  /**
   * Delete category (Admin only)
   */
  deleteCategory(id: string): Observable<MessageResponse> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.delete<MessageResponse>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        // Remove from local state
        this.categories.update((cats) => cats.filter((cat) => cat.id !== id));
        this.totalData.update((total) => total - 1);
        this.isLoading.set(false);
        console.log('✅ Category deleted');
      }),
      catchError((err) => {
        this.error.set(err.error?.data?.message || 'Failed to delete category');
        this.isLoading.set(false);
        console.error('❌ Delete category error:', err);
        throw err;
      })
    );
  }

  /**
   * Set filters and reload
   */
  setFilters(filters: Partial<CategoryFilters>): void {
    this.filters.update((current) => ({ ...current, ...filters }));
  }

  /**
   * Pagination helpers
   */
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.setFilters({ page });
    this.loadCategories(this.filters()).subscribe();
  }

  nextPage(): void {
    const nextPage = this.currentPage() + 1;
    if (nextPage <= this.totalPages()) {
      this.goToPage(nextPage);
    }
  }

  previousPage(): void {
    const prevPage = this.currentPage() - 1;
    if (prevPage >= 1) {
      this.goToPage(prevPage);
    }
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.filters.set({});
    this.loadCategories().subscribe();
  }
}
