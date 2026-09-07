import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit, OnDestroy {

  stats: any = {
    totalTasks: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    highPriority: 0,
    overdue: 0,
    totalInterns: 0
  };

  recentTasks: any[] = [];
  isManager = false;
  userName = '';
  isSyncing = false;
  errorMessage = '';

  private pollInterval: any = null;

  constructor(
    private taskService: TaskService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.isManager = this.authService.isManager();
    const user = this.authService.getUser();
    if (user && user.name) {
      this.userName = user.name;
    }
    this.loadStats();
  }

  ngOnDestroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  @HostListener('window:focus')
  onWindowFocus(): void {
    this.loadStats(true);
  }

  loadStats(silent = false): void {
    if (!silent) {
      this.isSyncing = true;
    }
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.taskService.getTaskStats().subscribe({
      next: (response: any) => {
        if (response && response.data) {
          this.stats = response.data;
          this.recentTasks = response.data.recentTasks || [];
        }
        this.isSyncing = false;
        this.cdr.markForCheck();
      },
      error: (error: any) => {
        this.isSyncing = false;
        if (!silent) {
          this.errorMessage = error.error?.message || 'Failed to sync latest stats. Please retry.';
        }
        this.cdr.markForCheck();
      }
    });
  }
}