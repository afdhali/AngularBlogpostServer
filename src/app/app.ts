import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Root Application Component - UPDATED
 *
 * Changes:
 * - ❌ REMOVED: Manual initAuth() call from ngOnInit()
 * - ✅ REASON: initAuth() now handled by APP_INITIALIZER in app.config.ts
 *
 * Why Remove?
 * - Double initialization prevented
 * - APP_INITIALIZER guarantees auth ready before routing
 * - Cleaner component (single responsibility)
 *
 * Old Flow (BAD):
 * 1. App load
 * 2. Router starts (guards check immediately) ⚠️
 * 3. App.ngOnInit() calls initAuth() (async)
 * 4. initAuth() completes (too late!)
 * 5. User already redirected to login ❌
 *
 * New Flow (GOOD):
 * 1. App load
 * 2. APP_INITIALIZER runs initAuth() ✅
 * 3. Wait for initAuth() to complete ⏳
 * 4. THEN router starts
 * 5. Guards check (user already authenticated) ✅
 * 6. User stays on intended page ✅
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = 'AngularBlogpostAPP';

  /**
   * No ngOnInit needed!
   * Auth initialization handled by APP_INITIALIZER
   */
}
