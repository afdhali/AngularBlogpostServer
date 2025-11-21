// src/app/features/dashboard/pages/posts/posts.component.ts
import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PostService } from '../../services/post.service';
import { CategoryService } from '../../services/category.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Post, PostFilters } from '../../models/post.model';

@Component({
  selector: 'app-posts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './posts.component.html',
})
export class PostsComponent implements OnInit {
  private postService = inject(PostService);
  private categoryService = inject(CategoryService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Service signals
  posts = this.postService.getPostList;
  isLoading = this.postService.getIsLoading;
  error = this.postService.getError;
  currentPage = this.postService.getCurrentPage;
  totalPages = this.postService.getTotalPages;
  totalData = this.postService.getTotalData;

  categories = this.categoryService.getCategoriesList;
  currentUser = this.authService.user;

  // Local state signals
  searchQuery = signal('');
  selectedStatus = signal<string>('');
  selectedCategory = signal<string>('');
  sortBy = signal<'created_at' | 'updated_at' | 'title' | 'views'>('created_at');
  sortOrder = signal<'asc' | 'desc'>('desc');

  // Delete confirmation
  deleteModalOpen = signal(false);
  postToDelete = signal<Post | null>(null);

  // Computed
  isAdmin = computed(() => {
    const user = this.currentUser();
    return user?.role === 'admin' || user?.role === 'super_admin';
  });

  // Effect untuk reload data saat filter berubah
  constructor() {
    effect(() => {
      // Track semua filter signals
      const filters: PostFilters = {
        page: this.currentPage(),
        limit: 10,
        search: this.searchQuery(),
        status: this.selectedStatus(),
        category_id: this.selectedCategory(),
        sort_by: this.sortBy(),
        sort_order: this.sortOrder(),
      };

      // Load posts ketika filter berubah
      this.loadPosts(filters);
    });
  }

  ngOnInit(): void {
    // Load categories for filter
    this.categoryService.loadCategories({ limit: 100 }).subscribe();
  }

  /**
   * Load posts with current filters
   */
  loadPosts(filters: PostFilters): void {
    this.postService.loadPosts(filters).subscribe();
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedStatus.set('');
    this.selectedCategory.set('');
    this.sortBy.set('created_at');
    this.sortOrder.set('desc');
    this.postService.goToPage(1);
  }

  /**
   * Navigate to create post
   */
  createPost(): void {
    this.router.navigate(['/dashboard/posts/create']);
  }

  /**
   * Navigate to edit post
   */
  editPost(id: string): void {
    this.router.navigate(['/dashboard/posts/edit', id]);
  }

  /**
   * View post detail
   */
  viewPost(slug: string): void {
    // Open in new tab
    window.open(`/blog/${slug}`, '_blank');
  }

  /**
   * Open delete confirmation modal
   */
  openDeleteModal(post: Post): void {
    this.postToDelete.set(post);
    this.deleteModalOpen.set(true);
  }

  /**
   * Close delete confirmation modal
   */
  closeDeleteModal(): void {
    this.deleteModalOpen.set(false);
    this.postToDelete.set(null);
  }

  /**
   * Confirm delete post
   */
  confirmDelete(): void {
    const post = this.postToDelete();
    if (!post) return;

    this.postService.deletePost(post.id).subscribe({
      next: () => {
        this.closeDeleteModal();
        alert('Post deleted successfully!');
      },
      error: (err) => {
        alert(`Failed to delete post: ${err.error?.data?.message || 'Unknown error'}`);
      },
    });
  }

  /**
   * Publish post (Admin only)
   */
  publishPost(post: Post): void {
    if (!this.isAdmin()) {
      alert('Only admins can publish posts');
      return;
    }

    if (confirm(`Publish post "${post.title}"?`)) {
      this.postService.publishPost(post.id).subscribe({
        next: () => {
          alert('Post published successfully!');
        },
        error: (err) => {
          alert(`Failed to publish post: ${err.error?.data?.message || 'Unknown error'}`);
        },
      });
    }
  }

  /**
   * Unpublish post (Admin only)
   */
  unpublishPost(post: Post): void {
    if (!this.isAdmin()) {
      alert('Only admins can unpublish posts');
      return;
    }

    if (confirm(`Unpublish post "${post.title}"?`)) {
      this.postService.unpublishPost(post.id).subscribe({
        next: () => {
          alert('Post unpublished successfully!');
        },
        error: (err) => {
          alert(`Failed to unpublish post: ${err.error?.data?.message || 'Unknown error'}`);
        },
      });
    }
  }

  /**
   * Pagination
   */
  goToPage(page: number): void {
    this.postService.goToPage(page);
  }

  nextPage(): void {
    this.postService.nextPage();
  }

  previousPage(): void {
    this.postService.previousPage();
  }

  /**
   * Helper methods
   */
  canEditPost(post: Post): boolean {
    const user = this.currentUser();
    if (!user) return false;

    // Admin can edit any post
    if (this.isAdmin()) return true;

    // Author can edit own post
    return post.author.id === user.id;
  }

  canDeletePost(post: Post): boolean {
    return this.canEditPost(post);
  }

  canPublishPost(): boolean {
    return this.isAdmin();
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
