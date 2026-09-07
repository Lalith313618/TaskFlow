import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { timeout } from 'rxjs';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile implements OnInit {

  // User details
  user = {
    name: '',
    email: '',
    createdAt: ''
  };

  // Profile Form
  name = '';
  email = '';

  // Password Form
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  // Status messages
  isLoading = false;
  isSyncing = false;
  profileError = '';
  profileSuccess = '';
  passwordError = '';
  passwordSuccess = '';
  isUpdatingProfile = false;
  isChangingPassword = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.isSyncing = true;
    this.profileError = '';
    this.cdr.markForCheck();

    this.authService.getMe().pipe(
      timeout(4000)
    ).subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.user = res.data;
          this.name = res.data.name || '';
          this.email = res.data.email || '';
        }
        this.isSyncing = false;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.isSyncing = false;
        this.cdr.markForCheck();
        console.warn('Profile sync notice:', err);
      }
    });
  }

  onUpdateProfile(): void {
    this.profileError = '';
    this.profileSuccess = '';

    if (!this.name || !this.email) {
      this.profileError = 'Name and email are required';
      return;
    }

    this.isUpdatingProfile = true;
    this.cdr.markForCheck();

    this.authService.updateProfile({
      name: this.name,
      email: this.email
    }).subscribe({
      next: (res) => {
        this.isUpdatingProfile = false;
        this.profileSuccess = res.message || 'Profile updated successfully!';
        if (res.data) {
          this.user.name = res.data.name;
          this.user.email = res.data.email;
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isUpdatingProfile = false;
        this.profileError = err.error?.message || 'Failed to update profile.';
        this.cdr.markForCheck();
      }
    });
  }

  onChangePassword(): void {
    this.passwordError = '';
    this.passwordSuccess = '';

    if (!this.currentPassword || !this.newPassword) {
      this.passwordError = 'Current password and new password are required';
      return;
    }

    if (this.newPassword.length < 6) {
      this.passwordError = 'New password must be at least 6 characters';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.passwordError = 'New passwords do not match';
      return;
    }

    this.isChangingPassword = true;
    this.cdr.markForCheck();

    this.authService.changePassword({
      currentPassword: this.currentPassword,
      newPassword: this.newPassword
    }).subscribe({
      next: (res) => {
        this.isChangingPassword = false;
        this.passwordSuccess = res.message || 'Password changed successfully!';
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isChangingPassword = false;
        this.passwordError = err.error?.message || 'Failed to change password.';
        this.cdr.markForCheck();
      }
    });
  }

  logout(): void {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
}

