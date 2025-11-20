import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import {
  ProfileResponse,
  UpdateProfileRequest,
  ChangePasswordRequest,
} from '../models/profile.model';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private isLoadingSignal = signal(false);
  private errorSignal = signal<string | null>(null);

  readonly isLoading = this.isLoadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  /**
   * Update user profile
   */
  updateProfile(data: UpdateProfileRequest): Observable<ProfileResponse> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.put<ProfileResponse>(`${environment.apiUrl}/profile`, data).pipe(
      tap((response) => {
        console.log('✅ Profile updated:', response.data);

        // Update user in AuthService - Access private signal properly
        const currentUser = this.authService.user();
        if (currentUser) {
          // Create updated user object
          const updatedUser = {
            ...currentUser,
            full_name: response.data.full_name,
            bio: response.data.bio,
          };

          // Force update by calling the service method
          // We need to trigger the signal update
          (this.authService as any)['userSignal'].set(updatedUser);

          console.log('✅ User signal updated in AuthService');
        }

        this.isLoadingSignal.set(false);
      }),
      catchError((error) => {
        const message = error.error?.data?.message || 'Failed to update profile';
        this.errorSignal.set(message);
        this.isLoadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Change password
   */
  changePassword(data: ChangePasswordRequest): Observable<any> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.put(`${environment.apiUrl}/profile/password`, data).pipe(
      tap(() => {
        console.log('✅ Password changed successfully');
        this.isLoadingSignal.set(false);
      }),
      catchError((error) => {
        const message = error.error?.data?.message || 'Failed to change password';
        this.errorSignal.set(message);
        this.isLoadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Upload avatar
   */
  uploadAvatar(file: File): Observable<ProfileResponse> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    const formData = new FormData();
    formData.append('avatar', file);

    return this.http.post<ProfileResponse>(`${environment.apiUrl}/profile/avatar`, formData).pipe(
      tap((response) => {
        console.log('✅ Avatar uploaded:', response.data.avatar);

        // Update user avatar in AuthService
        const currentUser = this.authService.user();
        if (currentUser) {
          const updatedUser = {
            ...currentUser,
            avatar: response.data.avatar,
          };

          // Update the signal
          (this.authService as any)['userSignal'].set(updatedUser);

          console.log('✅ Avatar synced to AuthService');
        }

        this.isLoadingSignal.set(false);
      }),
      catchError((error) => {
        const message = error.error?.data?.message || 'Failed to upload avatar';
        this.errorSignal.set(message);
        this.isLoadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete avatar
   */
  deleteAvatar(): Observable<any> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.delete(`${environment.apiUrl}/profile/avatar`).pipe(
      tap(() => {
        console.log('✅ Avatar deleted');

        // Reset avatar in AuthService
        const currentUser = this.authService.user();
        if (currentUser) {
          const updatedUser = {
            ...currentUser,
            avatar: '',
          };

          // Update the signal
          (this.authService as any)['userSignal'].set(updatedUser);

          console.log('✅ Avatar cleared from AuthService');
        }

        this.isLoadingSignal.set(false);
      }),
      catchError((error) => {
        const message = error.error?.data?.message || 'Failed to delete avatar';
        this.errorSignal.set(message);
        this.isLoadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }
}
