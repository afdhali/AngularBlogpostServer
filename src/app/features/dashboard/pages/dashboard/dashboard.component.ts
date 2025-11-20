import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';

interface DashboardStats {
  totalPosts: number;
  totalViews: number;
  totalComments: number;
  totalLikes: number;
}

interface RecentPost {
  id: string;
  title: string;
  excerpt: string;
  status: 'published' | 'draft';
  views: number;
  createdAt: Date;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private router = inject(Router);
  authService = inject(AuthService);

  // Signals for reactive state
  stats = signal<DashboardStats>({
    totalPosts: 0,
    totalViews: 0,
    totalComments: 0,
    totalLikes: 0,
  });

  recentPosts = signal<RecentPost[]>([]);
  isLoading = signal(true);

  // Computed values
  greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  });

  userName = computed(() => {
    return this.authService.user()?.full_name || 'User';
  });

  userRole = computed(() => {
    return this.authService.user()?.role || 'user';
  });

  ngOnInit(): void {
    // Simulate loading data
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    // Simulate API call
    setTimeout(() => {
      // Mock stats data
      this.stats.set({
        totalPosts: 24,
        totalViews: 12458,
        totalComments: 342,
        totalLikes: 1879,
      });

      // Mock recent posts
      this.recentPosts.set([
        {
          id: '1',
          title: 'Getting Started with Angular 20',
          excerpt: 'Learn the basics of Angular 20 and its new features...',
          status: 'published',
          views: 1234,
          createdAt: new Date('2024-01-15'),
        },
        {
          id: '2',
          title: 'Mastering Tailwind CSS v4',
          excerpt: 'Discover the power of Tailwind CSS v4 for modern web design...',
          status: 'published',
          views: 856,
          createdAt: new Date('2024-01-14'),
        },
        {
          id: '3',
          title: 'Building Scalable Applications',
          excerpt: 'Best practices for building scalable applications...',
          status: 'draft',
          views: 0,
          createdAt: new Date('2024-01-13'),
        },
      ]);

      this.isLoading.set(false);
    }, 1000);
  }

  createNewPost(): void {
    // TODO: Navigate to post editor
    console.log('Create new post');
  }

  viewPost(postId: string): void {
    // TODO: Navigate to post detail
    console.log('View post:', postId);
  }

  quickActions = [
    {
      icon: '✏️',
      title: 'New Post',
      description: 'Create a new blog post',
      color: 'from-blue-500 to-blue-600',
      action: () => this.createNewPost(),
    },
    {
      icon: '📊',
      title: 'Analytics',
      description: 'View your statistics',
      color: 'from-purple-500 to-purple-600',
      action: () => console.log('Analytics'),
    },
    {
      icon: '⚙️',
      title: 'Settings',
      description: 'Manage your account',
      color: 'from-pink-500 to-pink-600',
      action: () => console.log('Settings'),
    },
    {
      icon: '💬',
      title: 'Comments',
      description: 'Review comments',
      color: 'from-green-500 to-green-600',
      action: () => console.log('Comments'),
    },
  ];
}
