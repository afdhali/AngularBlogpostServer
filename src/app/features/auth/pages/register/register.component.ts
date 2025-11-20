import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  authService = inject(AuthService);

  registerForm!: FormGroup;
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  passwordStrength = signal<'weak' | 'medium' | 'strong'>('weak');

  ngOnInit(): void {
    // Redirect if already logged in
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.registerForm = this.fb.group(
      {
        username: [
          '',
          [
            Validators.required,
            Validators.minLength(3),
            Validators.maxLength(50),
            Validators.pattern(/^[a-zA-Z0-9_]+$/),
          ],
        ],
        email: ['', [Validators.required, Validators.email]],
        full_name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
        password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(100)]],
        confirmPassword: ['', Validators.required],
        agreeToTerms: [false, Validators.requiredTrue],
      },
      {
        validators: this.passwordMatchValidator,
      }
    );

    // Monitor password strength
    this.registerForm.get('password')?.valueChanges.subscribe((password) => {
      this.updatePasswordStrength(password);
    });
  }

  // Custom validator untuk password match
  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    if (password && confirmPassword && password !== confirmPassword) {
      return { passwordMismatch: true };
    }
    return null;
  }

  private updatePasswordStrength(password: string): void {
    if (!password) {
      this.passwordStrength.set('weak');
      return;
    }

    let strength = 0;

    // Length check
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;

    // Contains lowercase and uppercase
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;

    // Contains number
    if (/\d/.test(password)) strength++;

    // Contains special character
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;

    if (strength <= 2) {
      this.passwordStrength.set('weak');
    } else if (strength <= 4) {
      this.passwordStrength.set('medium');
    } else {
      this.passwordStrength.set('strong');
    }
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.markFormGroupTouched(this.registerForm);
      return;
    }

    const { username, email, password, full_name } = this.registerForm.value;

    this.authService
      .register({
        username,
        email,
        password,
        full_name,
      })
      .subscribe({
        next: () => {
          console.log('✅ Registration successful');
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          console.error('❌ Registration failed:', error);
          // Error sudah di-handle di service
        },
      });
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((value) => !value);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  // Getters untuk form controls
  get username() {
    return this.registerForm.get('username');
  }

  get email() {
    return this.registerForm.get('email');
  }

  get full_name() {
    return this.registerForm.get('full_name');
  }

  get password() {
    return this.registerForm.get('password');
  }

  get confirmPassword() {
    return this.registerForm.get('confirmPassword');
  }

  get agreeToTerms() {
    return this.registerForm.get('agreeToTerms');
  }

  // Error getters
  get usernameError(): string {
    if (this.username?.hasError('required') && this.username.touched) {
      return 'Username wajib diisi';
    }
    if (this.username?.hasError('minlength') && this.username.touched) {
      return 'Username minimal 3 karakter';
    }
    if (this.username?.hasError('pattern') && this.username.touched) {
      return 'Username hanya boleh huruf, angka, dan underscore';
    }
    return '';
  }

  get emailError(): string {
    if (this.email?.hasError('required') && this.email.touched) {
      return 'Email wajib diisi';
    }
    if (this.email?.hasError('email') && this.email.touched) {
      return 'Format email tidak valid';
    }
    return '';
  }

  get fullNameError(): string {
    if (this.full_name?.hasError('required') && this.full_name.touched) {
      return 'Nama lengkap wajib diisi';
    }
    if (this.full_name?.hasError('minlength') && this.full_name.touched) {
      return 'Nama lengkap minimal 3 karakter';
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

  get confirmPasswordError(): string {
    if (this.confirmPassword?.hasError('required') && this.confirmPassword.touched) {
      return 'Konfirmasi password wajib diisi';
    }
    if (this.registerForm.hasError('passwordMismatch') && this.confirmPassword?.touched) {
      return 'Password tidak cocok';
    }
    return '';
  }

  get passwordStrengthColor(): string {
    switch (this.passwordStrength()) {
      case 'weak':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'strong':
        return 'bg-green-500';
    }
  }

  get passwordStrengthWidth(): string {
    switch (this.passwordStrength()) {
      case 'weak':
        return 'w-1/3';
      case 'medium':
        return 'w-2/3';
      case 'strong':
        return 'w-full';
    }
  }

  get passwordStrengthText(): string {
    switch (this.passwordStrength()) {
      case 'weak':
        return 'Lemah';
      case 'medium':
        return 'Sedang';
      case 'strong':
        return 'Kuat';
    }
  }
}
