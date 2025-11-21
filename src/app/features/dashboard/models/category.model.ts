// category.model.ts
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  post_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
}

export interface CategoryFilters {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: 'name' | 'slug' | 'post_count' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

export interface CategoryResponse {
  code: number;
  status: string;
  data: Category;
}

export interface CategoryListResponse {
  code: number;
  status: string;
  data: {
    page: number;
    limit: number;
    total_data: number;
    total_pages: number;
    data: Category[];
  };
}

export interface MessageResponse {
  code: number;
  status: string;
  data: {
    message: string;
  };
}
