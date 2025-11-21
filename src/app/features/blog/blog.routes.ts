// src/app/features/blog/blog.routes.ts
import { Routes } from '@angular/router';

export const BLOG_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/blog-list/blog-list.component').then((m) => m.BlogListComponent),
    title: 'Blog - Tech Insights',
  },
  {
    path: ':slug',
    loadComponent: () =>
      import('./components/blog-detail/blog-detail.component').then((m) => m.BlogDetailComponent),
    title: 'Blog Post',
  },
];
