import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar implements OnInit {

  @Output() toggleSidebar = new EventEmitter<void>();

  isLoggedIn = false;
  isManager = false;
  userName = '';
  userRole = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.checkAuth();
  }

  checkAuth(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
    this.isManager = this.authService.isManager();
    this.userRole = this.authService.getRole();
    const user = this.authService.getUser();
    if (user && user.name) {
      this.userName = user.name;
    }
  }

  onToggle(): void {
    this.toggleSidebar.emit();
  }

  logout(): void {
    this.authService.logout();
    this.isLoggedIn = false;
    this.router.navigate(['/login']);
  }
}
