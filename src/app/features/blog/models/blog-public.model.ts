// src/app/features/blog/models/blog-public.model.ts
export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featured_image?: string;
  status: 'published';
  views: number;
  author: BlogAuthor;
  category: BlogCategory;
  tags: string[];
  comment_count: number;
  published_at: string;
  created_at: string;
  updated_at: string;
}

export interface BlogAuthor {
  id: string;
  username: string;
  full_name: string;
  avatar?: string;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
}

export interface BlogFilters {
  page?: number;
  limit?: number;
  search?: string;
  category_id?: string;
  tag?: string;
  sort_by?: 'created_at' | 'updated_at' | 'views';
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedBlogResponse {
  page: number;
  limit: number;
  total_data: number;
  total_pages: number;
  data: BlogPost[];
}
