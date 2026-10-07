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
  currentUserId = '';
  errorMessage = '';
  successMessage = '';

  search = '';
  status = '';
  priority = '';
  sort = '-createdAt';
  internId = '';
  page = 1;
  limit = 6;
  totalPages = 1;
  totalTasks = 0;

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
    const currentUser = this.authService.getUser();
    if (currentUser) {
      this.currentUserId = String(currentUser.id || currentUser._id || '');
    }

    const cached = localStorage.getItem('taskflow_cached_tasks');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.tasks = parsed;
          this.totalTasks = parsed.length;
          this.isLoading = false;
        }
      } catch (_) {}
    }

    const pending = this.taskService.consumePendingAssignment();
    if (pending.task) {
      this.tasks = [pending.task, ...this.tasks.filter(t => t._id !== pending.task._id)];
      this.totalTasks = Math.max(this.totalTasks, this.tasks.length);
      this.isLoading = false;
      this.saveTasksCache(this.tasks);
    }
    if (pending.message) {
      this.successMessage = pending.message;
      setTimeout(() => {
        this.successMessage = '';
        this.cdr.markForCheck();
      }, 4000);
    }

    try {
      if (typeof window !== 'undefined' && window.history?.state) {
        const state = window.history.state;
        if (state.assignedMessage || state.newTask) {
          const cleanState = { ...state };
          delete cleanState.assignedMessage;
          delete cleanState.newTask;
          window.history.replaceState(cleanState, document.title, window.location.href);
        }
      }
    } catch (_) {}

    this.route.queryParams.subscribe(params => {
      this.internId = params['internId'] || '';
      this.page = 1;
      this.loadTasks(this.tasks.length === 0);
    });
  }

  private saveTasksCache(tasks: any[]): void {
    try {
      localStorage.setItem('taskflow_cached_tasks', JSON.stringify(tasks));
    } catch (_) {}
  }

  private removeCachedTask(id: string): void {
    try {
      const cached = localStorage.getItem('taskflow_cached_tasks');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((t: any) => t._id !== id);
          localStorage.setItem('taskflow_cached_tasks', JSON.stringify(filtered));
        }
      }
    } catch (_) {}
  }

  private updateCachedTask(task: any): void {
    try {
      const cached = localStorage.getItem('taskflow_cached_tasks');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const idx = parsed.findIndex((t: any) => t._id === task._id);
          if (idx !== -1) {
            parsed[idx] = { ...parsed[idx], ...task };
            localStorage.setItem('taskflow_cached_tasks', JSON.stringify(parsed));
          }
        }
      }
    } catch (_) {}
  }

  loadTasks(isInitial = false): void {
    if (isInitial && this.tasks.length === 0) {
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
          if (!this.internId && !this.search && !this.status && !this.priority && this.page === 1) {
            this.saveTasksCache(this.tasks);
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
        this.updateCachedTask(task);
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

    const task = this.taskToDelete;
    const id = task._id;
    const taskIndex = this.tasks.findIndex(t => t._id === id);

    this.tasks = this.tasks.filter(t => t._id !== id);
    if (this.totalTasks > 0) this.totalTasks -= 1;
    this.taskToDelete = null;
    this.successMessage = 'Task deleted successfully';

    this.removeCachedTask(id);
    if (!this.internId && !this.search && !this.status && !this.priority && this.page === 1) {
      this.saveTasksCache(this.tasks);
    }

    this.cdr.markForCheck();

    setTimeout(() => {
      this.successMessage = '';
      this.cdr.markForCheck();
    }, 3000);

    this.taskService.deleteTask(id).subscribe({
      next: () => {
        this.removeCachedTask(id);

        if (this.tasks.length === 0 && this.page > 1) {
          this.page -= 1;
          this.loadTasks();
        }
      },
      error: (err) => {
        if (taskIndex !== -1) {
          this.tasks.splice(taskIndex, 0, task);
          this.totalTasks += 1;
          if (!this.internId && !this.search && !this.status && !this.priority && this.page === 1) {
            this.saveTasksCache(this.tasks);
          }
        }
        this.errorMessage = err.error?.message || 'Failed to delete task on server';
        this.successMessage = '';
        this.cdr.markForCheck();
      }
    });
  }

  isTaskOwner(task: any): boolean {
    if (!task || !this.currentUserId) return false;
    const ownerId = task.assignedBy?._id || task.assignedBy?.id || task.assignedBy;
    return String(ownerId) === String(this.currentUserId);
  }

  canEditTask(task: any): boolean {
    return this.isManager && this.isTaskOwner(task);
  }

  canDeleteTask(task: any): boolean {
    return this.isManager && this.isTaskOwner(task);
  }

  canChangeStatus(task: any): boolean {
    if (!this.isManager) return true;
    return this.isTaskOwner(task);
  }

  canAccessThread(task: any): boolean {
    if (!this.isManager) return true;
    return this.isTaskOwner(task);
  }
}
