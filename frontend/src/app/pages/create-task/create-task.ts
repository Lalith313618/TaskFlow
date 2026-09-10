import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-create-task',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './create-task.html',
  styleUrl: './create-task.css'
})
export class CreateTask implements OnInit {

  taskId: string | null = null;
  isEditMode = false;
  isManager = false;

  title = '';
  description = '';
  status = 'pending';
  priority = 'medium';
  dueDate = '';

  // Assignment fields
  internEmail = '';
  assignedTo = '';
  internsList: any[] = [];
  isLoadingInterns = false;

  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private taskService: TaskService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.isManager = this.authService.isManager();

    // Check if manager is assigning from intern directory
    const queryInternEmail = this.route.snapshot.queryParamMap.get('internEmail');
    const queryInternId = this.route.snapshot.queryParamMap.get('internId');

    if (queryInternEmail) this.internEmail = queryInternEmail;
    if (queryInternId) this.assignedTo = queryInternId;

    if (this.isManager) {
      this.loadInterns();
    }

    this.taskId = this.route.snapshot.queryParamMap.get('id');
    if (this.taskId) {
      this.isEditMode = true;
      this.loadTask(this.taskId);
    }
  }

  loadInterns(): void {
    this.isLoadingInterns = true;
    this.cdr.markForCheck();
    this.taskService.getInterns().subscribe({
      next: (res) => {
        this.isLoadingInterns = false;
        if (res.success && res.data) {
          this.internsList = res.data;
          if (this.assignedTo) {
            const found = this.internsList.find(i => i._id === this.assignedTo);
            if (found && !this.internEmail) {
              this.internEmail = found.email;
            }
          }
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingInterns = false;
        this.cdr.markForCheck();
      }
    });
  }

  onInternSelect(event: Event): void {
    const selectedId = (event.target as HTMLSelectElement).value;
    this.assignedTo = selectedId;
    const intern = this.internsList.find(i => i._id === selectedId);
    if (intern) {
      this.internEmail = intern.email;
    }
    this.cdr.markForCheck();
  }

  onInternEmailInput(): void {
    const email = this.internEmail.trim().toLowerCase();
    const found = this.internsList.find(i => i.email?.toLowerCase() === email);
    if (found) {
      this.assignedTo = found._id;
    }
    this.cdr.markForCheck();
  }

  loadTask(id: string): void {
    this.isLoading = true;
    this.cdr.markForCheck();
    this.taskService.getTaskById(id).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const task = res.data;
          this.title = task.title || '';
          this.description = task.description || '';
          this.status = task.status || 'pending';
          this.priority = task.priority || 'medium';
          if (task.dueDate) {
            const d = new Date(task.dueDate);
            if (!isNaN(d.getTime())) {
              const pad = (n: number) => n.toString().padStart(2, '0');
              this.dueDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            }
          }
          if (task.assignedTo) {
            this.assignedTo = task.assignedTo._id || task.assignedTo;
            this.internEmail = task.assignedTo.email || '';
          }
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Failed to load task details.';
        this.cdr.markForCheck();
      }
    });
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.title.trim()) {
      this.errorMessage = 'Task title is required';
      return;
    }

    if (this.title.trim().length < 3) {
      this.errorMessage = 'Task title must be at least 3 characters';
      return;
    }

    if (this.isManager && !this.internEmail.trim() && !this.assignedTo) {
      this.errorMessage = 'Please select or enter an intern to assign this task to';
      return;
    }

    this.isSaving = true;
    this.cdr.markForCheck();

    const taskData: any = {
      title: this.title.trim(),
      description: this.description.trim(),
      status: this.status,
      priority: this.priority,
      ...(this.dueDate ? { dueDate: new Date(this.dueDate).toISOString() } : {})
    };

    if (this.internEmail.trim()) {
      taskData.internEmail = this.internEmail.trim().toLowerCase();
    }
    if (this.assignedTo) {
      taskData.assignedTo = this.assignedTo;
    }

    if (this.isEditMode && this.taskId) {
      this.taskService.updateTask(this.taskId, taskData).subscribe({
        next: () => {
          this.isSaving = false;
          this.successMessage = 'Task updated successfully!';
          this.cdr.markForCheck();
          setTimeout(() => this.router.navigate(['/tasks']), 1000);
        },
        error: (err) => {
          this.isSaving = false;
          if (err.error?.errors && Array.isArray(err.error.errors)) {
            this.errorMessage = err.error.errors.join(', ');
          } else {
            this.errorMessage = err.error?.message || 'Failed to update task.';
          }
          this.cdr.markForCheck();
        }
      });
    } else {
      this.taskService.createTask(taskData).subscribe({
        next: () => {
          this.isSaving = false;
          this.successMessage = 'Task assigned successfully! Notification email dispatched.';
          this.cdr.markForCheck();
          setTimeout(() => this.router.navigate(['/tasks']), 1200);
        },
        error: (err) => {
          this.isSaving = false;
          if (err.error?.errors && Array.isArray(err.error.errors)) {
            this.errorMessage = err.error.errors.join(', ');
          } else {
            this.errorMessage = err.error?.message || 'Failed to assign task.';
          }
          this.cdr.markForCheck();
        }
      });
    }
  }
}
