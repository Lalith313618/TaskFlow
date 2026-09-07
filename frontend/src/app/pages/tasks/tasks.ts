import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './tasks.html',
  styleUrl: './tasks.css'
})
export class Tasks implements OnInit {

  tasks: any[] = [];
  isLoading = false;
  isSyncing = false;
  isManager = false;
  errorMessage = '';
  successMessage = '';

  // Filter, Sort, Search, Pagination params
  search = '';
  status = '';
  priority = '';
  sort = '-createdAt';
  internId = '';
  page = 1;
  limit = 6;
  totalPages = 1;
  totalTasks = 0;

  // Task deletion state
  taskToDelete: any = null;

  constructor(
    private taskService: TaskService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.isManager = this.authService.isManager();

    this.route.queryParams.subscribe(params => {
      this.internId = params['internId'] || '';
      this.page = 1;
      this.loadTasks(true);
    });
  }

  loadTasks(isInitial = false): void {
    if (isInitial) {
      this.isLoading = true;
    }
    this.isSyncing = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    const params: any = {
      page: this.page,
      limit: this.limit,
      sort: this.sort
    };

    if (this.search.trim()) {
      params.search = this.search.trim();
    }
    if (this.status) {
      params.status = this.status;
    }
    if (this.priority) {
      params.priority = this.priority;
    }
    if (this.internId) {
      params.internId = this.internId;
    }

    this.taskService.getTasks(params).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.isSyncing = false;
        if (res.success) {
          this.tasks = res.data || [];
          if (res.pagination) {
            this.page = res.pagination.currentPage;
            this.totalPages = res.pagination.totalPages;
            this.totalTasks = res.pagination.totalTasks;
          }
        }
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.isLoading = false;
        this.isSyncing = false;
        this.errorMessage = err.error?.message || 'Failed to load tasks. Please retry.';
        this.cdr.markForCheck();
      }
    });
  }

  onSearch(): void {
    this.page = 1;
    this.loadTasks();
  }

  onFilterChange(): void {
    this.page = 1;
    this.loadTasks();
  }

  onSortChange(): void {
    this.page = 1;
    this.loadTasks();
  }

  clearInternFilter(): void {
    this.internId = '';
    this.page = 1;
    this.loadTasks();
  }

  goToPage(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.page = newPage;
      this.loadTasks();
    }
  }

  updateTaskStatus(task: any, newStatus: string): void {
    this.taskService.updateTaskStatus(task._id, newStatus).subscribe({
      next: () => {
        task.status = newStatus;
        this.successMessage = `Task status updated to ${newStatus}`;
        this.cdr.markForCheck();
        setTimeout(() => {
          this.successMessage = '';
          this.cdr.markForCheck();
        }, 3000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to update task status';
        this.cdr.markForCheck();
      }
    });
  }

  confirmDelete(task: any): void {
    this.taskToDelete = task;
    this.cdr.markForCheck();
  }

  cancelDelete(): void {
    this.taskToDelete = null;
    this.cdr.markForCheck();
  }

  deleteTask(): void {
    if (!this.taskToDelete) return;

    const id = this.taskToDelete._id;
    this.taskService.deleteTask(id).subscribe({
      next: () => {
        this.taskToDelete = null;
        this.successMessage = 'Task deleted successfully';
        this.cdr.markForCheck();
        setTimeout(() => {
          this.successMessage = '';
          this.cdr.markForCheck();
        }, 3000);
        this.loadTasks();
      },
      error: (err) => {
        this.taskToDelete = null;
        this.errorMessage = err.error?.message || 'Failed to delete task';
        this.cdr.markForCheck();
      }
    });
  }
}
