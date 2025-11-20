// media-picker.component.ts
import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  effect,
  output,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgOptimizedImage } from '@angular/common';
import { MediaService } from '../../features/dashboard/services/media.service';
import { AuthService } from '../../core/services/auth.service';
import { Media, MediaFilters } from '../../features/dashboard/models/media.model';

export interface MediaPickerConfig {
  allowMultiple?: boolean; // Default: false
  mediaType?: 'all' | 'image' | 'video' | 'audio' | 'document'; // Default: 'all'
  maxSelection?: number; // Default: 1
  showUploadButton?: boolean; // Default: true
  previewMode?: 'grid' | 'list'; // Default: 'grid'
  filterByUser?: boolean; // Default: false (show all media)
}

export interface MediaPickerResult {
  selected: Media[];
  action: 'confirm' | 'cancel';
}

@Component({
  selector: 'app-media-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, NgOptimizedImage],
  templateUrl: './media-picker.component.html',
})
export class MediaPickerComponent implements OnInit, OnDestroy {
  private mediaService = inject(MediaService);
  private authService = inject(AuthService);

  // Input configuration
  config = input<MediaPickerConfig>({
    allowMultiple: false,
    mediaType: 'all',
    maxSelection: 1,
    showUploadButton: true,
    previewMode: 'grid',
    filterByUser: false,
  });

  // Output events
  onSelect = output<MediaPickerResult>();
  onCancel = output<void>();

  // Component signals
  selectedItems = signal<Media[]>([]);
  showUploadModal = signal(false);
  uploadProgress = signal(0);
  isUploading = signal(false);
  searchQuery = signal('');

  // Upload form signals
  selectedFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);
  altText = signal('');
  description = signal('');

  // Service signals
  mediaList = this.mediaService.getMediaList;
  isLoading = this.mediaService.getIsLoading;
  error = this.mediaService.getError;
  totalPages = this.mediaService.getTotalPages;
  currentPage = this.mediaService.getCurrentPage;

  // Auth signals
  currentUser = this.authService.user;
  isAuthenticated = this.authService.isAuthenticated;

  // Computed signals
  filteredMedia = computed(() => {
    const cfg = this.config();
    const list = this.mediaList();
    const query = this.searchQuery().toLowerCase();

    let filtered = list;

    // Filter by media type
    if (cfg.mediaType && cfg.mediaType !== 'all') {
      filtered = filtered.filter((m) => m.media_type === cfg.mediaType);
    }

    // Filter by user (if needed)
    if (cfg.filterByUser) {
      const user = this.currentUser();
      if (user) {
        filtered = filtered.filter((m) => m.user.id === user.id);
      }
    }

    // Search filter
    if (query) {
      filtered = filtered.filter(
        (m) =>
          m.original_name.toLowerCase().includes(query) ||
          m.alt_text?.toLowerCase().includes(query) ||
          m.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  });

  selectionCount = computed(() => this.selectedItems().length);

  maxReached = computed(() => {
    const cfg = this.config();
    return this.selectionCount() >= (cfg.maxSelection || 1);
  });

  canUpload = computed(() => {
    const cfg = this.config();
    return this.isAuthenticated() && cfg.showUploadButton;
  });

  // Signal untuk @defer loading
  contentReady = signal(false);

  constructor() {
    // Effect untuk debugging
    effect(() => {
      console.log('Selected items:', this.selectedItems().length);
    });

    // Simulate content loading untuk trigger @defer
    setTimeout(() => {
      this.contentReady.set(true);
    }, 100);
  }

  ngOnInit(): void {
    console.log('MediaPicker initialized with config:', this.config());
    this.loadMedia();
  }

  ngOnDestroy(): void {
    // Cleanup preview URL
    const preview = this.previewUrl();
    if (preview) {
      URL.revokeObjectURL(preview);
    }
  }

  // === LOAD OPERATIONS ===
  loadMedia(): void {
    const cfg = this.config();
    const filters: MediaFilters = {
      page: this.currentPage(),
      limit: 12,
      sort_by: 'created_at',
      sort_order: 'desc',
    };

    if (cfg.mediaType && cfg.mediaType !== 'all') {
      filters.media_type = cfg.mediaType;
    }

    if (cfg.filterByUser) {
      const user = this.currentUser();
      if (user) {
        filters.user_id = user.id;
      }
    }

    this.mediaService.loadMedia(filters).subscribe();
  }

  // === SELECTION OPERATIONS ===
  isSelected(media: Media): boolean {
    return this.selectedItems().some((item) => item.id === media.id);
  }

  toggleSelection(media: Media): void {
    const cfg = this.config();
    const isCurrentlySelected = this.isSelected(media);

    if (isCurrentlySelected) {
      // Deselect
      this.selectedItems.update((items) => items.filter((item) => item.id !== media.id));
    } else {
      // Select
      if (cfg.allowMultiple) {
        // Multiple selection
        if (!this.maxReached()) {
          this.selectedItems.update((items) => [...items, media]);
        } else {
          alert(`Maximum ${cfg.maxSelection} items can be selected`);
        }
      } else {
        // Single selection - replace
        this.selectedItems.set([media]);
      }
    }
  }

  clearSelection(): void {
    this.selectedItems.set([]);
  }

  // === CONFIRM/CANCEL OPERATIONS ===
  confirmSelection(): void {
    const selected = this.selectedItems();
    if (selected.length === 0) {
      alert('Please select at least one item');
      return;
    }

    this.onSelect.emit({
      selected,
      action: 'confirm',
    });
  }

  cancelSelection(): void {
    this.onCancel.emit();
  }

  // === SEARCH OPERATIONS ===
  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  clearSearch(): void {
    this.searchQuery.set('');
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

  // === UPLOAD OPERATIONS ===
  openUploadModal(): void {
    if (!this.canUpload()) {
      alert('Please login to upload media');
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

    // Validate file type if config specifies
    const cfg = this.config();
    if (cfg.mediaType && cfg.mediaType !== 'all') {
      const validType = this.validateFileType(file, cfg.mediaType);
      if (!validType) {
        alert(`Please select a ${cfg.mediaType} file`);
        input.value = '';
        return;
      }
    }

    this.selectedFile.set(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        this.previewUrl.set(dataUrl);

        // Get image dimensions for NgOptimizedImage
        img.onload = () => {
          console.log('Image dimensions:', img.width, 'x', img.height);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  }

  validateFileType(file: File, mediaType: string): boolean {
    const mimeType = file.type;
    switch (mediaType) {
      case 'image':
        return mimeType.startsWith('image/');
      case 'video':
        return mimeType.startsWith('video/');
      case 'audio':
        return mimeType.startsWith('audio/');
      case 'document':
        return (
          mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')
        );
      default:
        return true;
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

    // Simulate progress
    const interval = setInterval(() => {
      this.uploadProgress.update((p) => Math.min(p + 10, 90));
    }, 200);

    // Get image dimensions for upload payload
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      if (file.type.startsWith('image/')) {
        img.onload = () => {
          this.performUpload(file, interval, img.width, img.height);
        };
        img.src = e.target?.result as string;
      } else {
        this.performUpload(file, interval);
      }
    };
    reader.readAsDataURL(file);
  }

  private performUpload(
    file: File,
    interval: ReturnType<typeof setInterval>,
    width?: number,
    height?: number
  ): void {
    const payload: any = {
      alt_text: this.altText() || undefined,
      description: this.description() || undefined,
    };

    if (width && height) {
      payload.width = width;
      payload.height = height;
    }

    this.mediaService.uploadMedia(file, payload).subscribe({
      next: (response) => {
        clearInterval(interval);
        this.uploadProgress.set(100);
        console.log('Media uploaded:', response.data);

        setTimeout(() => {
          this.closeUploadModal();
          this.isUploading.set(false);
          this.uploadProgress.set(0);

          // Auto-select uploaded media if within limits
          const cfg = this.config();
          if (!this.maxReached()) {
            if (cfg.allowMultiple) {
              this.selectedItems.update((items) => [...items, response.data]);
            } else {
              this.selectedItems.set([response.data]);
            }
          }

          alert('Media uploaded successfully!');
        }, 500);
      },
      error: (err) => {
        clearInterval(interval);
        this.isUploading.set(false);
        this.uploadProgress.set(0);
        console.error('Upload failed:', err);
        alert(`Upload failed: ${err.error?.data?.message || 'Unknown error'}`);
      },
    });
  }

  resetUploadForm(): void {
    this.selectedFile.set(null);
    const preview = this.previewUrl();
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    this.previewUrl.set(null);
    this.altText.set('');
    this.description.set('');
  }

  // === HELPER METHODS ===
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
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
