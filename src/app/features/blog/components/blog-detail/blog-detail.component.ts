// src/app/features/blog/components/blog-detail/blog-detail.component.ts
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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { BlogPublicService } from '../../services/blog-public.service';
import { BlogPost } from '../../models/blog-public.model';

const BLOG_POST_KEY = makeStateKey<BlogPost>('blog-post');

@Component({
  selector: 'app-blog-detail',
  standalone: true,
  imports: [CommonModule, NgOptimizedImage],
  templateUrl: './blog-detail.component.html',
  styleUrls: ['./blog-detail.component.css'],
})
export class BlogDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private blogService = inject(BlogPublicService);
  private platformId = inject(PLATFORM_ID);
  private transferState = inject(TransferState);
  private meta = inject(Meta);
  private title = inject(Title);

  // Local state
  post = signal<BlogPost | null>(null);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);
  processedContent = signal<string>('');

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      if (slug) {
        this.loadPost(slug);
      }
    });
  }

  loadPost(slug: string): void {
    // Check if data already exists in transfer state (SSR)
    const cachedData = this.transferState.get(BLOG_POST_KEY, null);

    if (cachedData && cachedData.slug === slug) {
      // Use cached data from SSR
      this.post.set(cachedData);
      this.processContent(cachedData.content);
      this.updateMetaTags(cachedData);
      this.isLoading.set(false);
      this.transferState.remove(BLOG_POST_KEY);
    } else {
      // Load fresh data
      this.isLoading.set(true);
      this.error.set(null);

      this.blogService.getPostBySlug(slug).subscribe({
        next: (response) => {
          this.post.set(response.data);
          this.processContent(response.data.content);
          this.updateMetaTags(response.data);
          this.isLoading.set(false);

          // Store in transfer state for SSR
          if (!isPlatformBrowser(this.platformId)) {
            this.transferState.set(BLOG_POST_KEY, response.data);
          }
        },
        error: (err) => {
          this.error.set('Post not found');
          this.isLoading.set(false);
          console.error('Error loading post:', err);
        },
      });
    }
  }

  processContent(content: string): void {
    if (!content) {
      this.processedContent.set('');
      return;
    }

    // Replace \n with <br> for line breaks
    let processed = content.replace(/\n/g, '<br>');

    // Process code blocks wrapped with '''
    processed = processed.replace(/'''([\s\S]*?)'''/g, (match, code) => {
      // Clean up the code
      const cleanCode = code.replace(/<br>/g, '\n').trim();

      return `<pre class="bg-gray-900 text-gray-100 rounded-lg p-6 overflow-x-auto mb-6 shadow-lg relative"><code>${this.escapeHtml(
        cleanCode
      )}</code></pre>`;
    });

    this.processedContent.set(processed);
  }

  escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  updateMetaTags(post: BlogPost): void {
    // Update page title
    this.title.setTitle(`${post.title} - Tech Blog`);

    // Update meta tags for SEO
    this.meta.updateTag({
      name: 'description',
      content: this.getExcerpt(post.content, 160),
    });
    this.meta.updateTag({ name: 'keywords', content: post.tags.join(', ') });
    this.meta.updateTag({ name: 'author', content: post.author.full_name });

    // Open Graph tags for social sharing
    this.meta.updateTag({ property: 'og:title', content: post.title });
    this.meta.updateTag({
      property: 'og:description',
      content: this.getExcerpt(post.content, 160),
    });
    this.meta.updateTag({ property: 'og:type', content: 'article' });
    if (post.featured_image) {
      this.meta.updateTag({ property: 'og:image', content: post.featured_image });
    }

    // Twitter Card tags
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: post.title });
    this.meta.updateTag({
      name: 'twitter:description',
      content: this.getExcerpt(post.content, 160),
    });
    if (post.featured_image) {
      this.meta.updateTag({ name: 'twitter:image', content: post.featured_image });
    }

    // Article specific tags
    this.meta.updateTag({ property: 'article:published_time', content: post.published_at });
    this.meta.updateTag({ property: 'article:modified_time', content: post.updated_at });
    this.meta.updateTag({ property: 'article:author', content: post.author.full_name });
    post.tags.forEach((tag) => {
      this.meta.addTag({ property: 'article:tag', content: tag });
    });
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

  goBack(): void {
    this.router.navigate(['/blog']);
  }
}
