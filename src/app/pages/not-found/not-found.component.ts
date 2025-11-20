import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.css',
})
export class NotFoundComponent {
  private router = inject(Router);

  goHome(): void {
    this.router.navigate(['/']);
  }

  goBack(): void {
    window.history.back();
  }

  suggestions = [
    { label: 'Home', route: '/', icon: '🏠' },
    { label: 'Login', route: '/auth/login', icon: '🔐' },
    { label: 'Dashboard', route: '/dashboard', icon: '📊' },
    { label: 'Blog', route: '/blog', icon: '📝' },
  ];
}
