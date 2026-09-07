import { Component, EventEmitter, Output, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SocketService, AppNotification } from '../../services/socket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar implements OnInit, OnDestroy {

  @Output() toggleSidebar = new EventEmitter<void>();

  isLoggedIn = false;
  isManager = false;
  userName = '';
  userRole = '';

  showNotifications = false;
  unreadCount = 0;
  notifications: AppNotification[] = [];

  private subs: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private socketService: SocketService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.checkAuth();

    if (this.isLoggedIn) {
      this.socketService.rejoinUserRoom();

      this.subs.push(
        this.socketService.unreadCount$.subscribe(count => {
          this.unreadCount = count;
          this.cdr.markForCheck();
        })
      );

      this.subs.push(
        this.socketService.notifications$.subscribe(list => {
          this.notifications = list;
          this.cdr.markForCheck();
        })
      );
    }
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
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

  toggleNotifications(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.showNotifications = !this.showNotifications;
    this.cdr.markForCheck();
  }

  onNotificationClick(notif: AppNotification): void {
    this.socketService.markAsRead(notif.id);
    this.showNotifications = false;
    this.cdr.markForCheck();

    if (notif.taskId) {
      this.router.navigate(['/tasks', notif.taskId]);
    }
  }

  markAllAsRead(): void {
    this.socketService.markAllAsRead();
    this.cdr.markForCheck();
  }

  clearAll(): void {
    this.socketService.clearAll();
    this.cdr.markForCheck();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.notif-wrapper')) {
      this.showNotifications = false;
      this.cdr.markForCheck();
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
