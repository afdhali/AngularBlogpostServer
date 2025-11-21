// src/app/features/dashboard/models/post.model.ts
export interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featured_image?: string;
  status: 'draft' | 'published' | 'archived';
  views: number;
  author_id: string;
  author: PostAuthor;
  category_id: string;
  category: PostCategory;
  tags: string[];
  comment_count: number;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PostAuthor {
  id: string;
  username: string;
  full_name: string;
  avatar?: string;
}

export interface PostCategory {
  id: string;
  name: string;
  slug: string;
}

export interface PostFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  category_id?: string;
  tag?: string;
  author_id?: string;
  sort_by?: 'created_at' | 'updated_at' | 'title' | 'views';
  sort_order?: 'asc' | 'desc';
}

export interface PostCreateRequest {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  category_id: string;
  featured_image?: string;
  tags?: string[];
  status?: 'draft' | 'published' | 'archived';
}

export interface PostUpdateRequest {
  title?: string;
  slug?: string;
  content?: string;
  excerpt?: string;
  category_id?: string;
  featured_image?: string;
  tags?: string[];
  status?: 'draft' | 'published' | 'archived';
}
