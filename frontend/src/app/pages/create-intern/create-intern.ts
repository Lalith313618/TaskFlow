import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-create-intern',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './create-intern.html',
  styleUrl: './create-intern.css'
})
export class CreateIntern implements OnInit {

  // Registration form fields
  name = '';
  email = '';
  password = '';
  showPassword = false;
  isRegistering = false;
  registerSuccess = '';
  registerError = '';

  // Interns directory state
  interns: any[] = [];
  filteredInterns: any[] = [];
  searchQuery = '';
  isLoadingInterns = false;

  // Edit modal state
  editingIntern: any = null;
  editName = '';
  editEmail = '';
  editPassword = '';
  isSavingEdit = false;
  editError = '';
  editSuccess = '';

  // Delete modal state
  internToDelete: any = null;
  isDeleting = false;
  deleteError = '';

  constructor(
    private taskService: TaskService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadInterns();
  }

  loadInterns(): void {
    this.isLoadingInterns = true;
    this.cdr.markForCheck();

    this.taskService.getInterns().subscribe({
      next: (res) => {
        this.isLoadingInterns = false;
        if (res && res.success && res.data) {
          this.interns = res.data;
          this.applyFilter();
        } else {
          this.interns = [];
          this.filteredInterns = [];
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingInterns = false;
        this.cdr.markForCheck();
      }
    });
  }

  applyFilter(): void {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.filteredInterns = [...this.interns];
    } else {
      this.filteredInterns = this.interns.filter(i =>
        (i.name && i.name.toLowerCase().includes(q)) ||
        (i.email && i.email.toLowerCase().includes(q))
      );
    }
  }

  onSearchChange(): void {
    this.applyFilter();
    this.cdr.markForCheck();
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
    this.cdr.markForCheck();
  }

  onRegister(): void {
    this.registerError = '';
    this.registerSuccess = '';

    if (!this.name.trim()) {
      this.registerError = 'Full name is required';
      return;
    }

    if (!this.email.trim()) {
      this.registerError = 'Email address is required';
      return;
    }

    if (!this.password || this.password.length < 6) {
      this.registerError = 'Password must be at least 6 characters';
      return;
    }

    this.isRegistering = true;
    this.cdr.markForCheck();

    const internData = {
      name: this.name.trim(),
      email: this.email.trim().toLowerCase(),
      password: this.password
    };

    this.taskService.createIntern(internData).subscribe({
      next: (res) => {
        this.isRegistering = false;
        this.registerSuccess = `Intern account created for ${internData.name}! They can now log in with email "${internData.email}".`;
        this.name = '';
        this.email = '';
        this.password = '';
        this.loadInterns();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isRegistering = false;
        this.registerError = err.error?.message || 'Failed to register intern. Please check details.';
        this.cdr.markForCheck();
      }
    });
  }

  // Edit methods
  openEditModal(intern: any): void {
    this.editingIntern = intern;
    this.editName = intern.name;
    this.editEmail = intern.email;
    this.editPassword = '';
    this.editError = '';
    this.editSuccess = '';
    this.cdr.markForCheck();
  }

  closeEditModal(): void {
    this.editingIntern = null;
    this.editError = '';
    this.editSuccess = '';
    this.cdr.markForCheck();
  }

  onSaveEdit(): void {
    if (!this.editingIntern) return;

    this.editError = '';
    this.editSuccess = '';

    if (!this.editName.trim()) {
      this.editError = 'Full name is required';
      return;
    }

    if (!this.editEmail.trim()) {
      this.editError = 'Email address is required';
      return;
    }

    if (this.editPassword && this.editPassword.length < 6) {
      this.editError = 'New password must be at least 6 characters if updating';
      return;
    }

    this.isSavingEdit = true;
    this.cdr.markForCheck();

    const updatePayload: any = {
      name: this.editName.trim(),
      email: this.editEmail.trim().toLowerCase()
    };

    if (this.editPassword) {
      updatePayload.password = this.editPassword;
    }

    this.taskService.updateIntern(this.editingIntern._id, updatePayload).subscribe({
      next: () => {
        this.isSavingEdit = false;
        this.editSuccess = 'Intern details updated successfully!';
        this.cdr.markForCheck();
        setTimeout(() => {
          this.closeEditModal();
          this.loadInterns();
        }, 1000);
      },
      error: (err) => {
        this.isSavingEdit = false;
        this.editError = err.error?.message || 'Failed to update intern.';
        this.cdr.markForCheck();
      }
    });
  }

  // Delete methods
  confirmDelete(intern: any): void {
    this.internToDelete = intern;
    this.deleteError = '';
    this.cdr.markForCheck();
  }

  cancelDelete(): void {
    this.internToDelete = null;
    this.deleteError = '';
    this.cdr.markForCheck();
  }

  onDeleteIntern(): void {
    if (!this.internToDelete) return;

    this.isDeleting = true;
    this.deleteError = '';
    this.cdr.markForCheck();

    const internId = this.internToDelete._id;
    this.taskService.deleteIntern(internId).subscribe({
      next: () => {
        this.isDeleting = false;
        this.internToDelete = null;
        this.loadInterns();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isDeleting = false;
        this.deleteError = err.error?.message || 'Failed to delete intern.';
        this.cdr.markForCheck();
      }
    });
  }
}
