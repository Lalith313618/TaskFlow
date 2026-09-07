import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

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

  errorMessage = '';
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  login(): void {
    this.errorMessage = '';
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
}