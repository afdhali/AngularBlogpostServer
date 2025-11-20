import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Server Routes Configuration untuk SSR
 *
 * RenderMode Options:
 * - Prerender: Static Site Generation (SSG) - Pre-built at build time
 * - Server: Server-Side Rendering (SSR) - Rendered per request
 * - Client: Client-Side Rendering (CSR) - No SSR, fully client-side
 */
export const serverRoutes: ServerRoute[] = [
  // ========================================
  // PUBLIC PAGES - SSG (Prerender)
  // ========================================
  // Best for static content that doesn't change often
  {
    path: '',
    renderMode: RenderMode.Prerender,
  },

  // ========================================
  // BLOG PAGES - SSR (Server)
  // ========================================
  // SEO critical, need dynamic meta tags
  // {
  //   path: 'blog',
  //   renderMode: RenderMode.Server,
  // },
  // {
  //   path: 'blog/:slug',
  //   renderMode: RenderMode.Server,
  // },

  // ========================================
  // AUTH PAGES - CSR (Client)
  // ========================================
  // No need for SEO, better UX with CSR
  {
    path: 'auth/login',
    renderMode: RenderMode.Client,
  },
  {
    path: 'auth/register',
    renderMode: RenderMode.Client,
  },

  // ========================================
  // PROTECTED PAGES - CSR (Client)
  // ========================================
  // Behind authentication, no SEO needed
  {
    path: 'dashboard/**',
    renderMode: RenderMode.Client,
  },

  // ========================================
  // FALLBACK - CSR (Client)
  // ========================================
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
