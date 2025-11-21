import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet, RouterLinkActive],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.css',
})
export class DashboardLayoutComponent {
  private router = inject(Router);
  authService = inject(AuthService);

  // Dropdown state
  isDropdownOpen = signal(false);

  toggleDropdown(): void {
    this.isDropdownOpen.update((open) => !open);
  }

  closeDropdown(): void {
    this.isDropdownOpen.set(false);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  navigateToProfile(): void {
    this.closeDropdown();
    this.router.navigate(['/dashboard/profile']);
  }

  navigateToCategories(): void {
    this.closeDropdown();
    this.router.navigate(['/dashboard/categories']);
  }
}
