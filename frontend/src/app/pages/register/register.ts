import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {

  name = '';
  email = '';
  password = '';
  role: 'intern' | 'manager' = 'intern';
  managerAccessCode = '';

  errorMessage = '';
  successMessage = '';
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  register(): void {

    this.errorMessage = '';
    this.successMessage = '';

    if (!this.name || !this.email || !this.password) {
      this.errorMessage = 'Name, email and password are required';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters';
      return;
    }

    this.isLoading = true;

    const payload: {
      name: string;
      email: string;
      password: string;
      role: 'intern' | 'manager';
      managerAccessCode?: string;
    } = {
      name: this.name,
      email: this.email,
      password: this.password,
      role: this.role
    };

    if (this.role === 'manager') {
      payload.managerAccessCode = this.managerAccessCode;
    }

    this.authService.register(payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Account created successfully!';
        this.cdr.markForCheck();

        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1000);
      },

      error: (error) => {
        this.isLoading = false;
        this.errorMessage =
          error.error?.message || 'Registration failed. Please try again.';
        this.cdr.markForCheck();
      }
    });
  }
}