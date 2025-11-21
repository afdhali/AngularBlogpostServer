// src/app/features/dashboard/pages/posts/post-form/post-form.component.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { PostService } from '../../../services/post.service';
import { CategoryService } from '../../../services/category.service';
import { AuthService } from '../../../../../core/services/auth.service';
import {
  MediaPickerComponent,
  MediaPickerConfig,
  MediaPickerResult,
} from '../../../../../components-lib/media-picker/media-picker.component';

@Component({
  selector: 'app-post-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MediaPickerComponent],
  templateUrl: './post-form.component.html',
})
export class PostFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private postService = inject(PostService);
  private categoryService = inject(CategoryService);
  private authService = inject(AuthService);

  // State signals
  isEditMode = signal(false);
  postId = signal<string | null>(null);
  isSubmitting = signal(false);
  error = signal<string | null>(null);

  // Media picker state
  showMediaPicker = signal(false);
  selectedFeaturedImage = signal<string | null>(null);

  categories = this.categoryService.getCategoriesList;
  currentUser = this.authService.user;

  // Form
  postForm: FormGroup;

  // Tags management
  tagInput = signal('');
  tags = signal<string[]>([]);

  // Computed
  isAdmin = computed(() => {
    const user = this.currentUser();
    return user?.role === 'admin' || user?.role === 'super_admin';
  });

  // Media picker config
  mediaPickerConfig: MediaPickerConfig = {
    allowMultiple: false,
    mediaType: 'image',
    maxSelection: 1,
    showUploadButton: true,
    previewMode: 'grid',
    filterByUser: false,
  };

  constructor() {
    // Initialize form
    this.postForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(200)]],
      slug: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(200)]],
      content: ['', [Validators.required, Validators.minLength(10)]],
      excerpt: ['', [Validators.maxLength(500)]],
      category_id: ['', [Validators.required]],
      featured_image: [''],
      status: ['draft', [Validators.required]],
    });

    // Auto-generate slug from title
    this.postForm.get('title')?.valueChanges.subscribe((title) => {
      if (title && !this.isEditMode()) {
        const slug = this.generateSlug(title);
        this.postForm.patchValue({ slug }, { emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    // Load categories
    this.categoryService.loadCategories({ limit: 100 }).subscribe();

    // Check if edit mode
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.postId.set(id);
      this.loadPost(id);
    }
  }

  /**
   * Load post data for editing
   */
  loadPost(id: string): void {
    this.postService.getPostById(id).subscribe({
      next: (response) => {
        const post = response.data;

        this.postForm.patchValue({
          title: post.title,
          slug: post.slug,
          content: post.content,
          excerpt: post.excerpt,
          category_id: post.category_id,
          featured_image: post.featured_image || '',
          status: post.status,
        });

        this.selectedFeaturedImage.set(post.featured_image || null);
        this.tags.set(post.tags || []);
      },
      error: (err) => {
        this.error.set(err.error?.data?.message || 'Failed to load post');
        alert('Failed to load post. Redirecting...');
        this.router.navigate(['/dashboard/posts']);
      },
    });
  }

  /**
   * Generate slug from title
   */
  generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Add tag
   */
  addTag(): void {
    const tag = this.tagInput().trim();
    if (tag && !this.tags().includes(tag)) {
      this.tags.update((tags) => [...tags, tag]);
      this.tagInput.set('');
    }
  }

  /**
   * Remove tag
   */
  removeTag(tag: string): void {
    this.tags.update((tags) => tags.filter((t) => t !== tag));
  }

  /**
   * Open media picker for featured image
   */
  openMediaPicker(): void {
    this.showMediaPicker.set(true);
  }

  /**
   * Handle media selection
   */
  onMediaSelect(result: MediaPickerResult): void {
    if (result.action === 'confirm' && result.selected.length > 0) {
      const media = result.selected[0];
      this.selectedFeaturedImage.set(media.url);
      this.postForm.patchValue({ featured_image: media.url });
    }
    this.showMediaPicker.set(false);
  }

  /**
   * Handle media picker cancel
   */
  onMediaCancel(): void {
    this.showMediaPicker.set(false);
  }

  /**
   * Remove featured image
   */
  removeFeaturedImage(): void {
    this.selectedFeaturedImage.set(null);
    this.postForm.patchValue({ featured_image: '' });
  }

  /**
   * Submit form
   */
  onSubmit(): void {
    if (this.postForm.invalid) {
      this.markFormGroupTouched(this.postForm);
      alert('Please fill all required fields correctly');
      return;
    }

    this.isSubmitting.set(true);
    this.error.set(null);

    const formValue = this.postForm.value;
    const payload = {
      ...formValue,
      tags: this.tags(),
    };

    const request$ = this.isEditMode()
      ? this.postService.updatePost(this.postId()!, payload)
      : this.postService.createPost(payload);

    request$.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        const message = this.isEditMode()
          ? 'Post updated successfully!'
          : 'Post created successfully!';
        alert(message);
        this.router.navigate(['/dashboard/posts']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.error.set(err.error?.data?.message || 'Failed to save post');
        alert(`Error: ${this.error()}`);
      },
    });
  }

  /**
   * Cancel and go back
   */
  cancel(): void {
    if (confirm('Discard changes?')) {
      this.router.navigate(['/dashboard/posts']);
    }
  }

  /**
   * Mark all form controls as touched
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Check if field has error
   */
  hasError(field: string, error: string): boolean {
    const control = this.postForm.get(field);
    return !!(control && control.hasError(error) && control.touched);
  }

  /**
   * Get field error message
   */
  getErrorMessage(field: string): string {
    const control = this.postForm.get(field);
    if (!control || !control.errors || !control.touched) return '';

    if (control.hasError('required')) return `${field} is required`;
    if (control.hasError('minlength')) {
      const minLength = control.errors['minlength'].requiredLength;
      return `${field} must be at least ${minLength} characters`;
    }
    if (control.hasError('maxlength')) {
      const maxLength = control.errors['maxlength'].requiredLength;
      return `${field} must not exceed ${maxLength} characters`;
    }

    return 'Invalid value';
  }
}
