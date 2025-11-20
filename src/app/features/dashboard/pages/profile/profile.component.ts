import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ProfileService } from '../../services/profile.service';
import {
  ProfileFormData,
  PasswordFormData,
  UpdateProfileRequest,
  ChangePasswordRequest,
} from '../../models/profile.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  authService = inject(AuthService);
  profileService = inject(ProfileService);

  // Forms
  profileForm!: FormGroup;
  passwordForm!: FormGroup;

  // UI State
  activeTab = signal<'profile' | 'password'>('profile');
  showSuccessMessage = signal(false);
  successMessage = signal('');
  selectedFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);

  ngOnInit(): void {
    this.initForms();
  }

  private initForms(): void {
    const user = this.authService.user();

    // Profile form
    this.profileForm = this.fb.group({
      full_name: [user?.full_name || '', [Validators.required, Validators.minLength(3)]],
      bio: [user?.bio || '', Validators.maxLength(500)],
    });

    // Password form
    this.passwordForm = this.fb.group(
      {
        old_password: ['', [Validators.required, Validators.minLength(8)]],
        new_password: ['', [Validators.required, Validators.minLength(8)]],
        confirm_password: ['', Validators.required],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  // Validators
  private passwordMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
    const newPassword = group.get('new_password')?.value;
    const confirmPassword = group.get('confirm_password')?.value;

    if (newPassword !== confirmPassword) {
      return { passwordMismatch: true };
    }
    return null;
  }

  // Tab switching
  switchTab(tab: 'profile' | 'password'): void {
    this.activeTab.set(tab);
  }

  // Profile form handlers
  onProfileSubmit(): void {
    if (this.profileForm.invalid) {
      this.markFormGroupTouched(this.profileForm);
      return;
    }

    const data: UpdateProfileRequest = {
      full_name: this.profileForm.value.full_name,
      bio: this.profileForm.value.bio || undefined,
    };

    this.profileService.updateProfile(data).subscribe({
      next: () => {
        this.showSuccess('Profile updated successfully');
      },
      error: (error) => {
        console.error('Profile update failed:', error);
      },
    });
  }

  // Password form handlers
  onPasswordSubmit(): void {
    if (this.passwordForm.invalid) {
      this.markFormGroupTouched(this.passwordForm);
      return;
    }

    const data: ChangePasswordRequest = {
      old_password: this.passwordForm.value.old_password,
      new_password: this.passwordForm.value.new_password,
    };

    this.profileService.changePassword(data).subscribe({
      next: () => {
        this.showSuccess('Password changed successfully');
        this.passwordForm.reset();
      },
      error: (error) => {
        console.error('Password change failed:', error);
      },
    });
  }

  // Avatar handlers
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Invalid file type. Please upload JPG, PNG, GIF, or WEBP.');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File too large. Maximum size is 5MB.');
      return;
    }

    this.selectedFile.set(file);

    // Preview
    const reader = new FileReader();
    reader.onload = () => {
      this.previewUrl.set(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  uploadAvatar(): void {
    const file = this.selectedFile();
    if (!file) return;

    this.profileService.uploadAvatar(file).subscribe({
      next: () => {
        this.showSuccess('Avatar uploaded successfully');
        this.selectedFile.set(null);
        this.previewUrl.set(null);
      },
      error: (error) => {
        console.error('Avatar upload failed:', error);
      },
    });
  }

  deleteAvatar(): void {
    if (!confirm('Are you sure you want to delete your avatar?')) return;

    this.profileService.deleteAvatar().subscribe({
      next: () => {
        this.showSuccess('Avatar deleted successfully');
      },
      error: (error) => {
        console.error('Avatar delete failed:', error);
      },
    });
  }

  cancelAvatarUpload(): void {
    this.selectedFile.set(null);
    this.previewUrl.set(null);
  }

  // Helpers
  private showSuccess(message: string): void {
    this.successMessage.set(message);
    this.showSuccessMessage.set(true);

    setTimeout(() => {
      this.showSuccessMessage.set(false);
    }, 3000);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  // Getters for form validation
  get fullName() {
    return this.profileForm.get('full_name');
  }

  get bio() {
    return this.profileForm.get('bio');
  }

  get oldPassword() {
    return this.passwordForm.get('old_password');
  }

  get newPassword() {
    return this.passwordForm.get('new_password');
  }

  get confirmPassword() {
    return this.passwordForm.get('confirm_password');
  }

  get fullNameError(): string {
    if (this.fullName?.hasError('required') && this.fullName.touched) {
      return 'Full name is required';
    }
    if (this.fullName?.hasError('minlength') && this.fullName.touched) {
      return 'Full name must be at least 3 characters';
    }
    return '';
  }

  get bioError(): string {
    if (this.bio?.hasError('maxlength') && this.bio.touched) {
      return 'Bio must be less than 500 characters';
    }
    return '';
  }

  get oldPasswordError(): string {
    if (this.oldPassword?.hasError('required') && this.oldPassword.touched) {
      return 'Old password is required';
    }
    if (this.oldPassword?.hasError('minlength') && this.oldPassword.touched) {
      return 'Password must be at least 8 characters';
    }
    return '';
  }

  get newPasswordError(): string {
    if (this.newPassword?.hasError('required') && this.newPassword.touched) {
      return 'New password is required';
    }
    if (this.newPassword?.hasError('minlength') && this.newPassword.touched) {
      return 'Password must be at least 8 characters';
    }
    return '';
  }

  get confirmPasswordError(): string {
    if (this.confirmPassword?.hasError('required') && this.confirmPassword.touched) {
      return 'Please confirm your password';
    }
    if (this.passwordForm.hasError('passwordMismatch') && this.confirmPassword?.touched) {
      return 'Passwords do not match';
    }
    return '';
  }
}
