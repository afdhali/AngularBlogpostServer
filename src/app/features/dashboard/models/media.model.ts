// media.model.ts
export interface MediaUploader {
  id: string;
  username: string;
  full_name: string;
  avatar: string;
}

export interface Media {
  id: string;
  filename: string;
  original_name: string;
  path: string; // backend uses 'path', not 'file_path'
  url: string; // backend uses 'url', not 'file_url'
  size: number; // backend uses 'size', not 'file_size'
  mime_type: string;
  media_type: 'image' | 'video' | 'audio' | 'document';
  alt_text?: string;
  description?: string;
  is_featured?: boolean;
  post_id?: string;
  user: MediaUploader;
  created_at?: string; // Optional
  updated_at?: string; // Optional
}

export interface MediaListResponse {
  code: number;
  status: string;
  data: {
    page: number;
    limit: number;
    total_data: number;
    total_pages: number;
    data: Media[];
  };
}

export interface MediaResponse {
  code: number;
  status: string;
  data: Media;
}

export interface MediaUploadPayload {
  file: File;
  alt_text?: string;
  description?: string;
  is_featured?: boolean;
  post_id?: string;
}

export interface MediaUpdatePayload {
  alt_text?: string;
  description?: string;
  is_featured?: boolean;
  post_id?: string;

  // Tambahkan ini
  width?: number;
  height?: number;
}

export interface MediaFilters {
  page?: number;
  limit?: number;
  media_type?: 'image' | 'video' | 'audio' | 'document';
  post_id?: string;
  user_id?: string;
  is_featured?: boolean;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}
