// category.component.ts
import { Component, OnInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CategoryService } from '../../services/category.service';
import { AuthService } from '../../../../core/services/auth.service';
import {
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '../../models/category.model';

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './category.component.html',
  styleUrls: ['./category.component.css'],
})
export class CategoryComponent implements OnInit, OnDestroy {
  private categoryService = inject(CategoryService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Component signals
  showCreateModal = signal(false);
  showEditModal = signal(false);
  showDeleteConfirm = signal(false);
  selectedCategory = signal<Category | null>(null);
  searchQuery = signal('');

  // Form signals
  categoryName = signal('');
  categoryDescription = signal('');

  // Service signals (readonly)
  categoriesList = this.categoryService.getCategoriesList;
  isLoading = this.categoryService.getIsLoading;
  error = this.categoryService.getError;
  totalPages = this.categoryService.getTotalPages;
  totalData = this.categoryService.getTotalData;
  currentPage = this.categoryService.getCurrentPage;

  // Auth signals
  currentUser = this.authService.user;
  isAdmin = this.authService.isAdmin; // includes both admin and super_admin

  // Signal untuk defer loading
  statsReady = signal(false);

  // Stats computed
  stats = computed(() => {
    const list = this.categoriesList();
    const totalPosts = list.reduce((sum, cat) => sum + cat.post_count, 0);
    return {
      total: list.length,
      totalPosts: totalPosts,
      avgPosts: list.length > 0 ? Math.round(totalPosts / list.length) : 0,
    };
  });

  // Computed for search
  filteredCategories = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const list = this.categoriesList();

    if (!query) return list;

    return list.filter(
      (cat) =>
        cat.name.toLowerCase().includes(query) ||
        cat.slug.toLowerCase().includes(query) ||
        cat.description?.toLowerCase().includes(query)
    );
  });

  constructor() {
    // Effect untuk debug
    effect(() => {
      console.log('📊 Category Stats:', this.stats());
      console.log('📋 Filtered Categories Count:', this.filteredCategories().length);
    });

    // Simulate stats loading untuk trigger @defer
    setTimeout(() => {
      this.statsReady.set(true);
    }, 100);
  }

  ngOnInit(): void {
    console.log('🎬 CategoryComponent initialized');

    // Check if user has admin access
    if (!this.isAdmin()) {
      console.error('❌ Unauthorized: User is not admin');
      this.router.navigate(['/dashboard']);
      return;
    }

    this.loadCategories();
  }

  ngOnDestroy(): void {
    console.log('🛑 CategoryComponent destroyed');
  }

  // === LOAD OPERATIONS ===
  loadCategories(): void {
    this.categoryService
      .loadCategories({
        page: this.currentPage(),
        limit: 10,
        sort_by: 'created_at',
        sort_order: 'desc',
      })
      .subscribe({
        next: () => console.log('✅ Categories loaded successfully'),
        error: (err) => console.error('❌ Error loading categories:', err),
      });
  }

  // === SEARCH OPERATIONS ===
  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  // === CREATE OPERATIONS ===
  openCreateModal(): void {
    this.showCreateModal.set(true);
    this.resetForm();
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.resetForm();
  }

  onCreate(): void {
    const name = this.categoryName().trim();

    if (!name) {
      alert('Category name is required');
      return;
    }

    const payload: CreateCategoryRequest = {
      name: name,
      description: this.categoryDescription().trim() || undefined,
    };

    this.categoryService.createCategory(payload).subscribe({
      next: (response) => {
        console.log('✅ Category created:', response.data);
        this.closeCreateModal();
        alert('Category created successfully!');
      },
      error: (err) => {
        console.error('❌ Create failed:', err);
        alert(`Create failed: ${err.error?.data?.message || 'Unknown error'}`);
      },
    });
  }

  // === EDIT OPERATIONS ===
  openEditModal(category: Category): void {
    this.selectedCategory.set(category);
    this.categoryName.set(category.name);
    this.categoryDescription.set(category.description || '');
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.selectedCategory.set(null);
    this.resetForm();
  }

  onUpdate(): void {
    const category = this.selectedCategory();
    if (!category) return;

    const name = this.categoryName().trim();

    if (!name) {
      alert('Category name is required');
      return;
    }

    const payload: UpdateCategoryRequest = {
      name: name,
      description: this.categoryDescription().trim() || undefined,
    };

    this.categoryService.updateCategory(category.id, payload).subscribe({
      next: () => {
        console.log('✅ Category updated');
        this.closeEditModal();
        alert('Category updated successfully!');
      },
      error: (err) => {
        console.error('❌ Update failed:', err);
        alert(`Update failed: ${err.error?.data?.message || 'Unknown error'}`);
      },
    });
  }

  // === DELETE OPERATIONS ===
  openDeleteConfirm(category: Category): void {
    this.selectedCategory.set(category);
    this.showDeleteConfirm.set(true);
  }

  closeDeleteConfirm(): void {
    this.showDeleteConfirm.set(false);
    this.selectedCategory.set(null);
  }

  onDelete(): void {
    const category = this.selectedCategory();
    if (!category) return;

    this.categoryService.deleteCategory(category.id).subscribe({
      next: () => {
        console.log('✅ Category deleted');
        this.closeDeleteConfirm();
        alert('Category deleted successfully!');
      },
      error: (err) => {
        console.error('❌ Delete failed:', err);
        alert(`Delete failed: ${err.error?.data?.message || 'Unknown error'}`);
      },
    });
  }

  // === PAGINATION ===
  onPageChange(page: number): void {
    this.categoryService.goToPage(page);
  }

  nextPage(): void {
    this.categoryService.nextPage();
  }

  previousPage(): void {
    this.categoryService.previousPage();
  }

  // === HELPER METHODS ===
  resetForm(): void {
    this.categoryName.set('');
    this.categoryDescription.set('');
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  // Generate array for pagination
  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    if (total <= 7) {
      // Show all pages if total is 7 or less
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Show first, last, current, and neighbors
      pages.push(1);

      if (current > 3) {
        pages.push(-1); // Ellipsis marker
      }

      for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
        pages.push(i);
      }

      if (current < total - 2) {
        pages.push(-1); // Ellipsis marker
      }

      pages.push(total);
    }

    return pages;
  }
}
