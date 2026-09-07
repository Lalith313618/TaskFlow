import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar implements OnInit {

  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  isManager = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isManager = this.authService.isManager();
  }

  onClose(): void {
    this.close.emit();
  }

  logout(): void {
    this.authService.logout();
    this.onClose();
    this.router.navigate(['/login']);
  }
}
