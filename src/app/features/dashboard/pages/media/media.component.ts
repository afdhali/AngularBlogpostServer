// media.component.ts
import { Component, OnInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
import { MediaService } from '../../services/media.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Media, MediaFilters } from '../../models/media.model';

@Component({
  selector: 'app-media',
  standalone: true,
  imports: [CommonModule, FormsModule, NgOptimizedImage],
  templateUrl: './media.component.html',
  styleUrls: ['./media.component.css'],
})
export class MediaComponent implements OnInit, OnDestroy {
  private mediaService = inject(MediaService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Component signals
  selectedMediaType = signal<'all' | 'image' | 'video' | 'audio' | 'document'>('all');
  selectedMedia = signal<Media | null>(null);
  showUploadModal = signal(false);
  showEditModal = signal(false);
  showDeleteConfirm = signal(false);
  uploadProgress = signal(0);
  isUploading = signal(false);

  // File upload signals
  selectedFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);
  altText = signal('');
  description = signal('');
  isFeatured = signal(false);

  // View mode
  viewMode = signal<'grid' | 'list'>('grid');

  // Service signals (readonly)
  mediaList = this.mediaService.getMediaList;
  isLoading = this.mediaService.getIsLoading;
  error = this.mediaService.getError;
  totalPages = this.mediaService.getTotalPages;
  totalData = this.mediaService.getTotalData;
  currentPage = this.mediaService.getCurrentPage;

  // Auth signals
  currentUser = this.authService.user;
  isAuthenticated = this.authService.isAuthenticated;
  isAdmin = this.authService.isAdmin; // includes both admin and super_admin

  // Computed signals
  filteredMedia = computed(() => {
    const type = this.selectedMediaType();
    const list = this.mediaList();

    if (type === 'all') return list;
    return list.filter((m) => m.media_type === type);
  });

  // Stats computed
  stats = computed(() => {
    const list = this.mediaList();
    return {
      total: list.length,
      images: list.filter((m) => m.media_type === 'image').length,
      videos: list.filter((m) => m.media_type === 'video').length,
      audios: list.filter((m) => m.media_type === 'audio').length,
      documents: list.filter((m) => m.media_type === 'document').length,
    };
  });

  // Signal untuk defer loading
  statsReady = signal(false);

  // Permission checks
  canUpload = computed(() => this.isAuthenticated());

  // canEdit = computed(() => {
  //   const media = this.selectedMedia();
  //   const user = this.currentUser();
  //   if (!media || !user) return false;

  //   // Owner atau Admin (admin + super_admin) bisa edit
  //   return media.user_id === user.id || this.isAdmin();
  // });

  // canDelete = computed(() => {
  //   const media = this.selectedMedia();
  //   const user = this.currentUser();
  //   if (!media || !user) return false;

  //   // Owner atau Admin (admin + super_admin) bisa delete
  //   return media.user_id === user.id || this.isAdmin();
  // });

  canEdit(media: Media): boolean {
    const user = this.currentUser();
    if (!user || !media) return false;
    return media.user.id === user.id || this.isAdmin();
  }

  canDelete(media: Media): boolean {
    const user = this.currentUser();
    if (!user || !media) return false;
    return media.user.id === user.id || this.isAdmin();
  }

  constructor() {
    // Effect untuk debug
    effect(() => {
      console.log('📊 Media Stats:', this.stats());
      console.log('📷 Filtered Media Count:', this.filteredMedia().length);
    });

    // Simulate stats loading untuk trigger @defer
    setTimeout(() => {
      this.statsReady.set(true);
    }, 100);
  }

  ngOnInit(): void {
    console.log('🎬 MediaComponent initialized');
    this.loadMedia();
  }

  ngOnDestroy(): void {
    console.log('🛑 MediaComponent destroyed');
    // Cleanup preview URL
    const preview = this.previewUrl();
    if (preview) {
      URL.revokeObjectURL(preview);
    }
  }

  // === LOAD OPERATIONS ===
  loadMedia(): void {
    const filters: MediaFilters = {
      page: this.currentPage(),
      limit: 12,
      sort_by: 'created_at',
      sort_order: 'desc',
    };

    const type = this.selectedMediaType();
    if (type !== 'all') {
      filters.media_type = type;
    }

    this.mediaService.loadMedia(filters).subscribe({
      next: () => console.log('✅ Media loaded successfully'),
      error: (err) => console.error('❌ Error loading media:', err),
    });
  }

  // === FILTER OPERATIONS ===
  onFilterChange(type: 'all' | 'image' | 'video' | 'audio' | 'document'): void {
    this.selectedMediaType.set(type);
    this.mediaService.setFilters({ page: 1 });
    this.loadMedia();
  }

  // === PAGINATION ===
  onPageChange(page: number): void {
    this.mediaService.goToPage(page);
  }

  nextPage(): void {
    this.mediaService.nextPage();
  }

  previousPage(): void {
    this.mediaService.previousPage();
  }

  // === VIEW MODE ===
  toggleViewMode(): void {
    this.viewMode.update((mode) => (mode === 'grid' ? 'list' : 'grid'));
  }

  // === UPLOAD OPERATIONS ===
  openUploadModal(): void {
    if (!this.canUpload()) {
      alert('Please login to upload media');
      this.router.navigate(['/auth/login']);
      return;
    }
    this.showUploadModal.set(true);
  }

  closeUploadModal(): void {
    this.showUploadModal.set(false);
    this.resetUploadForm();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.selectedFile.set(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewUrl.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  onUpload(): void {
    const file = this.selectedFile();
    if (!file) {
      alert('Please select a file');
      return;
    }

    this.isUploading.set(true);
    this.uploadProgress.set(0);

    // Simulate upload progress (real implementation would use HttpClient progress events)
    const interval = setInterval(() => {
      this.uploadProgress.update((p) => Math.min(p + 10, 90));
    }, 200);

    const payload = {
      alt_text: this.altText() || undefined,
      description: this.description() || undefined,
      is_featured: this.isFeatured(),
    };

    this.mediaService.uploadMedia(file, payload).subscribe({
      next: (response) => {
        clearInterval(interval);
        this.uploadProgress.set(100);
        console.log('✅ Media uploaded:', response.data);

        setTimeout(() => {
          this.closeUploadModal();
          this.isUploading.set(false);
          this.uploadProgress.set(0);
          alert('Media uploaded successfully!');
        }, 500);
      },
      error: (err) => {
        clearInterval(interval);
        this.isUploading.set(false);
        this.uploadProgress.set(0);
        console.error('❌ Upload failed:', err);
        alert(`Upload failed: ${err.error?.data?.message || 'Unknown error'}`);
      },
    });
  }

  resetUploadForm(): void {
    this.selectedFile.set(null);
    this.previewUrl.set(null);
    this.altText.set('');
    this.description.set('');
    this.isFeatured.set(false);
  }

  // === EDIT OPERATIONS ===
  openEditModal(media: Media): void {
    if (!this.canEdit(media)) {
      alert('You do not have permission to edit this media');
      return;
    }
    this.selectedMedia.set(media);
    this.altText.set(media.alt_text || '');
    this.description.set(media.description || '');
    this.isFeatured.set(media.is_featured || false);
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.selectedMedia.set(null);
    this.resetUploadForm();
  }

  onUpdate(): void {
    const media = this.selectedMedia();
    if (!media) return;

    const payload = {
      alt_text: this.altText() || undefined,
      description: this.description() || undefined,
      is_featured: this.isFeatured(),
    };

    this.mediaService.updateMedia(media.id, payload).subscribe({
      next: () => {
        console.log('✅ Media updated');
        this.closeEditModal();
        alert('Media updated successfully!');
      },
      error: (err) => {
        console.error('❌ Update failed:', err);
        alert(`Update failed: ${err.error?.data?.message || 'Unknown error'}`);
      },
    });
  }

  // === DELETE OPERATIONS ===
  openDeleteConfirm(media: Media): void {
    if (!this.canDelete(media)) {
      alert('You do not have permission to delete this media');
      return;
    }
    this.selectedMedia.set(media);
    this.showDeleteConfirm.set(true);
  }

  closeDeleteConfirm(): void {
    this.showDeleteConfirm.set(false);
    this.selectedMedia.set(null);
  }

  onDelete(): void {
    const media = this.selectedMedia();
    if (!media) return;

    this.mediaService.deleteMedia(media.id).subscribe({
      next: () => {
        console.log('✅ Media deleted');
        this.closeDeleteConfirm();
        alert('Media deleted successfully!');
      },
      error: (err) => {
        console.error('❌ Delete failed:', err);
        alert(`Delete failed: ${err.error?.data?.message || 'Unknown error'}`);
      },
    });
  }

  // === HELPER METHODS ===
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  getMediaIcon(type: string): string {
    switch (type) {
      case 'image':
        return '🖼️';
      case 'video':
        return '🎥';
      case 'audio':
        return '🎵';
      case 'document':
        return '📄';
      default:
        return '📁';
    }
  }
}
