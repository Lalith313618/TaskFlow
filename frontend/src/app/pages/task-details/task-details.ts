import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';
import { Subscription } from 'rxjs';
import { getBackendUrl } from '../../config/api.config';

@Component({
  selector: 'app-task-details',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './task-details.html',
  styleUrl: './task-details.css'
})
export class TaskDetails implements OnInit, OnDestroy {

  taskId = '';
  task: any = null;
  responses: any[] = [];

  isManager = false;
  currentUserId = '';

  newMessage = '';
  isSending = false;
  isLoading = false;
  isUpdatingStatus = false;
  errorMessage = '';
  successMessage = '';

  // Work Submission State
  submissionDescription = '';
  selectedFiles: File[] = [];
  selectedFilePreviews: { name: string; size: string; isImage: boolean; previewUrl?: string }[] = [];
  isSubmittingWork = false;
  submissionSuccess = '';
  submissionError = '';
  isEditingSubmission = false;

  // Image Lightbox Modal
  previewModalImage: string | null = null;

  get isWorkSubmitted(): boolean {
    if (!this.task || !this.task.submission) return false;
    const sub = this.task.submission;
    return Boolean(
      sub.submittedAt ||
      (sub.description && sub.description.trim().length > 0) ||
      (sub.attachments && sub.attachments.length > 0)
    );
  }

  formatDueDate(dueDateStr: string | Date | undefined): string {
    if (!dueDateStr) return 'No deadline';
    const d = new Date(dueDateStr);
    if (isNaN(d.getTime())) return 'No deadline';
    const hasTime = d.getUTCHours() !== 0 || d.getUTCMinutes() !== 0;
    if (hasTime) {
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
        ' at ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  private socketSubs: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private taskService: TaskService,
    private authService: AuthService,
    private socketService: SocketService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.taskId = this.route.snapshot.paramMap.get('id') || '';
    this.isManager = this.authService.isManager();
    const user = this.authService.getUser();
    if (user) {
      this.currentUserId = user.id || user._id || '';
    }

    if (this.taskId) {
      this.loadTaskData();
      this.socketService.joinTask(this.taskId);

      // Listen for incoming live chat messages
      this.socketSubs.push(
        this.socketService.onNewMessage().subscribe((data) => {
          if (data && data.taskId === this.taskId && data.response) {
            const exists = this.responses.some(r => r._id === data.response._id);
            if (!exists) {
              this.responses.push(data.response);
              this.cdr.markForCheck();
            }
          }
        })
      );

      // Listen for status changes
      this.socketSubs.push(
        this.socketService.onStatusChanged().subscribe((data) => {
          if (data && data.taskId === this.taskId && this.task) {
            this.task.status = data.status;
            this.cdr.markForCheck();
          }
        })
      );

      // Listen for live work submissions
      this.socketSubs.push(
        this.socketService.onWorkSubmitted().subscribe((data) => {
          if (data && data.taskId === this.taskId && this.task) {
            this.task.status = 'completed';
            if (data.task && data.task.submission) {
              this.task.submission = data.task.submission;
            }
            this.loadResponses();
            this.cdr.markForCheck();
          }
        })
      );
    }
  }

  ngOnDestroy(): void {
    if (this.taskId) {
      this.socketService.leaveTask(this.taskId);
    }
    this.socketSubs.forEach(sub => sub.unsubscribe());
  }

  loadTaskData(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.taskService.getTaskById(this.taskId).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success && res.data) {
          this.task = res.data;
          this.loadResponses();
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Failed to load task details';
        this.cdr.markForCheck();
      }
    });
  }

  loadResponses(): void {
    this.taskService.getResponses(this.taskId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.responses = res.data;
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.warn('Responses load warning:', err);
        this.cdr.markForCheck();
      }
    });
  }

  updateStatus(newStatus: string): void {
    this.isUpdatingStatus = true;
    this.taskService.updateTaskStatus(this.taskId, newStatus).subscribe({
      next: (res) => {
        this.isUpdatingStatus = false;
        if (res.success && res.data) {
          this.task.status = newStatus;
          this.successMessage = `Status updated to ${newStatus}`;
          this.cdr.markForCheck();
          setTimeout(() => {
            this.successMessage = '';
            this.cdr.markForCheck();
          }, 3000);
        } else {
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        this.isUpdatingStatus = false;
        this.errorMessage = err.error?.message || 'Failed to update status';
        this.cdr.markForCheck();
      }
    });
  }

  sendResponse(): void {
    if (!this.newMessage.trim()) return;

    this.isSending = true;
    const msg = this.newMessage.trim();

    this.taskService.addResponse(this.taskId, msg).subscribe({
      next: (res) => {
        this.isSending = false;
        this.newMessage = '';
        if (res.success && res.data) {
          this.responses.push(res.data);
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isSending = false;
        this.errorMessage = err.error?.message || 'Failed to send message';
        this.cdr.markForCheck();
      }
    });
  }

  // --- Work Submission & Attachments Handling ---

  onFilesSelected(event: any): void {
    const fileList: FileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      // Limit 20 MB
      if (file.size > 20 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds the 20 MB size limit.`);
        continue;
      }

      this.selectedFiles.push(file);

      const isImg = file.type.startsWith('image/');
      const previewItem: { name: string; size: string; isImage: boolean; previewUrl?: string } = {
        name: file.name,
        size: this.formatFileSize(file.size),
        isImage: isImg
      };

      if (isImg) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          previewItem.previewUrl = e.target.result;
          this.cdr.markForCheck();
        };
        reader.readAsDataURL(file);
      }

      this.selectedFilePreviews.push(previewItem);
    }

    // Reset input value so same files can be re-selected if removed
    event.target.value = '';
    this.cdr.markForCheck();
  }

  removeSelectedFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.selectedFilePreviews.splice(index, 1);
    this.cdr.markForCheck();
  }

  submitWork(): void {
    if (!this.submissionDescription.trim() && this.selectedFiles.length === 0) {
      this.submissionError = 'Please provide a work description or attach at least one file/image.';
      this.cdr.markForCheck();
      return;
    }

    this.isSubmittingWork = true;
    this.submissionError = '';
    this.submissionSuccess = '';
    this.cdr.markForCheck();

    const formData = new FormData();
    formData.append('description', this.submissionDescription);

    for (const file of this.selectedFiles) {
      formData.append('files', file);
    }

    this.taskService.submitWork(this.taskId, formData).subscribe({
      next: (res) => {
        this.isSubmittingWork = false;
        if (res.success && res.data) {
          this.task = res.data;
          this.submissionSuccess = 'Work submitted successfully! Task marked as completed.';
          this.submissionDescription = '';
          this.selectedFiles = [];
          this.selectedFilePreviews = [];
          this.isEditingSubmission = false;
          this.loadResponses(); // Refresh conversation thread
        }
        this.cdr.markForCheck();

        setTimeout(() => {
          this.submissionSuccess = '';
          this.cdr.markForCheck();
        }, 5000);
      },
      error: (err) => {
        this.isSubmittingWork = false;
        this.submissionError = err.error?.message || 'Failed to submit work. Please try again.';
        this.cdr.markForCheck();
      }
    });
  }

  startEditSubmission(): void {
    if (this.task?.submission) {
      this.submissionDescription = this.task.submission.description || '';
    }
    this.isEditingSubmission = true;
    this.selectedFiles = [];
    this.selectedFilePreviews = [];
    this.cdr.markForCheck();
  }

  cancelEditSubmission(): void {
    this.isEditingSubmission = false;
    this.submissionDescription = '';
    this.selectedFiles = [];
    this.selectedFilePreviews = [];
    this.submissionError = '';
    this.cdr.markForCheck();
  }

  formatFileSize(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  getFullFileUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${getBackendUrl()}${url}`;
  }

  isImageAttachment(attachment: any): boolean {
    if (!attachment) return false;
    if (attachment.fileType && attachment.fileType.startsWith('image/')) return true;
    const url = (attachment.fileUrl || attachment.fileName || '').toLowerCase();
    return url.endsWith('.png') || url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.webp') || url.endsWith('.gif');
  }

  openImageModal(url: string): void {
    this.previewModalImage = this.getFullFileUrl(url);
    this.cdr.markForCheck();
  }

  closeImageModal(): void {
    this.previewModalImage = null;
    this.cdr.markForCheck();
  }
}
