import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  private router = inject(Router);
  authService = inject(AuthService);

  navigateToAuth(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/auth/login']);
    }
  }

  features = [
    {
      icon: '📝',
      title: 'Create & Manage',
      description: 'Buat dan kelola artikel blog dengan mudah menggunakan editor yang intuitif.',
    },
    {
      icon: '🎨',
      title: 'Beautiful Design',
      description: 'Template modern dengan Tailwind CSS v4 yang responsive di semua device.',
    },
    {
      icon: '🔒',
      title: 'Secure Authentication',
      description: 'Sistem autentikasi yang aman dengan JWT token dan auto-refresh.',
    },
    {
      icon: '⚡',
      title: 'Fast Performance',
      description: 'SSR dengan Angular 20 untuk performa optimal dan SEO-friendly.',
    },
    {
      icon: '📱',
      title: 'Responsive',
      description: 'Tampilan sempurna di desktop, tablet, dan mobile devices.',
    },
    {
      icon: '🚀',
      title: 'Modern Stack',
      description: 'Dibangun dengan Angular 20, Signals, dan modern best practices.',
    },
  ];

  testimonials = [
    {
      name: 'Ahmad Fauzi',
      role: 'Content Creator',
      avatar: '👨‍💼',
      text: 'Platform blog terbaik yang pernah saya gunakan. Mudah dan powerful!',
    },
    {
      name: 'Siti Nurhaliza',
      role: 'Blogger',
      avatar: '👩‍💻',
      text: 'Interface yang clean dan fitur-fitur yang lengkap. Sangat recommended!',
    },
    {
      name: 'Budi Santoso',
      role: 'Tech Writer',
      avatar: '👨‍🔬',
      text: 'Performance-nya luar biasa cepat. SEO-friendly pula!',
    },
  ];
}
