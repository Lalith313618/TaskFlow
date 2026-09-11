import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { timeout } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  email = '';
  password = '';
  securityCode = '';
  newPassword = '';
  isResetMode = false;

  errorMessage = '';
  successMessage = '';
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  login(): void {
    this.errorMessage = '';
    this.successMessage = '';
    const email = (this.email || '').trim();
    const password = this.password || '';

    if (!email || !password) {
      this.errorMessage = 'Email and password are required';
      return;
    }

    this.isLoading = true;
    this.cdr.markForCheck();

    this.authService.login({
      email,
      password
    }).subscribe({
      next: (response) => {
        const token = response?.data?.token || response?.token;
        const user = response?.data?.user || response?.data || response?.user;

        if (token) {
          this.authService.saveSession(token, {
            id: user?.id || user?._id,
            name: user?.name,
            email: user?.email,
            role: user?.role
          });
        }

        this.isLoading = false;
        this.cdr.markForCheck();

        this.router.navigate(['/dashboard']);
      },

      error: (error) => {
        this.isLoading = false;
        this.errorMessage =
          error.error?.message || 'Login failed. Please check your email and password.';
        this.cdr.markForCheck();
      }
    });
  }

  resetPassword(): void {
    this.errorMessage = '';
    this.successMessage = '';
    const email = (this.email || '').trim();
    const securityCode = (this.securityCode || '').trim();
    const newPassword = this.newPassword || '';

    if (!email || !securityCode || !newPassword) {
      this.errorMessage = 'Email, security code and new password are required';
      return;
    }

    if (newPassword.length < 6) {
      this.errorMessage = 'New password must be at least 6 characters';
      return;
    }

    this.isLoading = true;
    this.authService.resetPassword({ email, securityCode, newPassword }).pipe(
      timeout(15000)
    ).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = response?.message || 'Password reset successfully. You can now sign in.';
        this.isResetMode = false;
        this.password = '';
        this.securityCode = '';
        this.newPassword = '';
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.name === 'TimeoutError'
          ? 'Password reset timed out. Please make sure the backend is running and try again.'
          : error.error?.message || 'Password reset failed. Please try again.';
        this.cdr.markForCheck();
      }
    });
  }

  toggleResetMode(): void {
    this.isResetMode = !this.isResetMode;
    this.errorMessage = '';
    this.successMessage = '';
    this.password = '';
    this.securityCode = '';
    this.newPassword = '';
  }
}