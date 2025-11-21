// src/app/features/blog/components/blog-list/blog-list.component.ts
import {
  Component,
  OnInit,
  inject,
  signal,
  PLATFORM_ID,
  TransferState,
  makeStateKey,
} from '@angular/core';
import { CommonModule, isPlatformBrowser, NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BlogPublicService } from '../../services/blog-public.service';
import { BlogPost } from '../../models/blog-public.model';

const BLOG_POSTS_KEY = makeStateKey<any>('blog-posts');

@Component({
  selector: 'app-blog-list',
  standalone: true,
  imports: [CommonModule, RouterLink, NgOptimizedImage],
  templateUrl: './blog-list.component.html',
})
export class BlogListComponent implements OnInit {
  private blogService = inject(BlogPublicService);
  private platformId = inject(PLATFORM_ID);
  private transferState = inject(TransferState);

  // Local state
  posts = signal<BlogPost[]>([]);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);
  currentPage = signal<number>(1);
  totalPages = signal<number>(1);
  totalData = signal<number>(0);

  // Pagination computed
  get pages(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    // Show max 5 pages
    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + 4);

    // Adjust start if we're near the end
    if (end - start < 4) {
      start = Math.max(1, end - 4);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  ngOnInit(): void {
    // Check if data already exists in transfer state (SSR)
    const cachedData = this.transferState.get(BLOG_POSTS_KEY, null);

    if (cachedData) {
      // Use cached data from SSR
      this.posts.set(cachedData.data);
      this.currentPage.set(cachedData.page);
      this.totalPages.set(cachedData.total_pages);
      this.totalData.set(cachedData.total_data);
      this.transferState.remove(BLOG_POSTS_KEY);
    } else {
      // Load fresh data
      this.loadPosts();
    }
  }

  loadPosts(page: number = 1): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.blogService
      .loadPublishedPosts({
        page,
        limit: 12,
        sort_by: 'created_at',
        sort_order: 'desc',
      })
      .subscribe({
        next: (response) => {
          this.posts.set(response.data.data);
          this.currentPage.set(response.data.page);
          this.totalPages.set(response.data.total_pages);
          this.totalData.set(response.data.total_data);
          this.isLoading.set(false);

          // Store in transfer state for SSR
          if (!isPlatformBrowser(this.platformId)) {
            this.transferState.set(BLOG_POSTS_KEY, response.data);
          }
        },
        error: (err) => {
          console.error('Error loading posts:', err);
          this.error.set('Failed to load posts');
          this.isLoading.set(false);
        },
      });
  }

  onPageChange(page: number): void {
    this.loadPosts(page);
    // Scroll to top
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  getReadingTime(content: string): number {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }

  getExcerpt(content: string, maxLength: number = 150): string {
    if (!content) return '';

    // Remove code blocks and HTML tags
    const cleanText = content
      .replace(/'''[\s\S]*?'''/g, '')
      .replace(/<[^>]*>/g, '')
      .replace(/\n/g, ' ')
      .trim();

    if (cleanText.length <= maxLength) return cleanText;
    return cleanText.substring(0, maxLength) + '...';
  }
}
