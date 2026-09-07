import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TaskService } from '../../services/task.service';

@Component({
  selector: 'app-interns',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './interns.html',
  styleUrl: './interns.css'
})
export class Interns implements OnInit {

  interns: any[] = [];
  isLoading = false;
  errorMessage = '';

  constructor(
    private taskService: TaskService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadInterns();
  }

  loadInterns(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.taskService.getInterns().subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res && res.success && res.data) {
          this.interns = res.data;
        } else {
          this.interns = [];
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Failed to load interns directory. Please try again.';
        this.cdr.markForCheck();
      }
    });
  }
}
