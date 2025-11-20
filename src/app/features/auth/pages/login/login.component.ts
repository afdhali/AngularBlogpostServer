import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  authService = inject(AuthService);

  loginForm!: FormGroup;
  showPassword = signal(false);

  ngOnInit(): void {
    // Redirect if already logged in
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    const { email, password } = this.loginForm.value;

    this.authService.login({ email, password }).subscribe({
      next: () => {
        console.log('✅ Login successful');
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        console.error('❌ Login failed:', error);
        // Error sudah di-handle di service, akan tampil di template
      },
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  // Getters untuk validasi
  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }

  get emailError(): string {
    if (this.email?.hasError('required') && this.email.touched) {
      return 'email wajib diisi';
    }
    if (this.email?.hasError('minlength') && this.email.touched) {
      return 'Username minimal 3 karakter';
    }
    return '';
  }

  get passwordError(): string {
    if (this.password?.hasError('required') && this.password.touched) {
      return 'Password wajib diisi';
    }
    if (this.password?.hasError('minlength') && this.password.touched) {
      return 'Password minimal 8 karakter';
    }
    return '';
  }
}
