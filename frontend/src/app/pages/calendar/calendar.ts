import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../services/auth.service';

export interface CalendarDay {
  date: Date;
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  tasks: any[];
}

export interface TimelineGroup {
  title: string;
  badgeClass: string;
  tasks: any[];
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './calendar.html',
  styleUrl: './calendar.css'
})
export class Calendar implements OnInit {

  isManager = false;
  isLoading = false;
  errorMessage = '';

  allTasks: any[] = [];
  filteredTasks: any[] = [];

  viewMode: 'month' | 'timeline' = 'month';
  statusFilter: string = 'all';

  currentDate = new Date();
  currentYear = this.currentDate.getFullYear();
  currentMonthIndex = this.currentDate.getMonth();

  monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  calendarDays: CalendarDay[] = [];
  selectedDay: CalendarDay | null = null;

  timelineGroups: TimelineGroup[] = [];

  constructor(
    private taskService: TaskService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.isManager = this.authService.isManager();
    this.loadTasks();
  }

  loadTasks(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.taskService.getTasks({ limit: 100 }).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res && res.data) {
          this.allTasks = res.data;
        } else if (Array.isArray(res)) {
          this.allTasks = res;
        }
        this.applyFilter();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Failed to load task schedules.';
        this.cdr.markForCheck();
      }
    });
  }

  onFilterChange(): void {
    this.applyFilter();
  }

  applyFilter(): void {
    if (this.statusFilter === 'all') {
      this.filteredTasks = [...this.allTasks];
    } else {
      this.filteredTasks = this.allTasks.filter(t => t.status === this.statusFilter);
    }

    this.buildCalendarGrid();
    this.buildTimeline();
    this.cdr.markForCheck();
  }

  setViewMode(mode: 'month' | 'timeline'): void {
    this.viewMode = mode;
    this.cdr.markForCheck();
  }

  prevMonth(): void {
    if (this.currentMonthIndex === 0) {
      this.currentMonthIndex = 11;
      this.currentYear--;
    } else {
      this.currentMonthIndex--;
    }
    this.buildCalendarGrid();
    this.cdr.markForCheck();
  }

  nextMonth(): void {
    if (this.currentMonthIndex === 11) {
      this.currentMonthIndex = 0;
      this.currentYear++;
    } else {
      this.currentMonthIndex++;
    }
    this.buildCalendarGrid();
    this.cdr.markForCheck();
  }

  goToToday(): void {
    const today = new Date();
    this.currentYear = today.getFullYear();
    this.currentMonthIndex = today.getMonth();
    this.buildCalendarGrid();
    this.cdr.markForCheck();
  }

  buildCalendarGrid(): void {
    const year = this.currentYear;
    const month = this.currentMonthIndex;

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const firstDayWeekday = firstDayOfMonth.getDay(); // 0 = Sun, 1 = Mon ...
    const totalDaysInMonth = lastDayOfMonth.getDate();

    const days: CalendarDay[] = [];
    const todayStr = this.formatDateKey(new Date());

    // Previous month padding days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayWeekday - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      const key = this.formatDateKey(d);
      days.push({
        date: d,
        dateKey: key,
        dayNumber: d.getDate(),
        isCurrentMonth: false,
        isToday: key === todayStr,
        tasks: this.getTasksForDate(d)
      });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
      const d = new Date(year, month, dayNum);
      const key = this.formatDateKey(d);
      days.push({
        date: d,
        dateKey: key,
        dayNumber: dayNum,
        isCurrentMonth: true,
        isToday: key === todayStr,
        tasks: this.getTasksForDate(d)
      });
    }

    // Next month padding days to complete 35 or 42 grid cells
    const remaining = 35 - (days.length % 35);
    const paddingTarget = days.length <= 35 ? 35 : 42;
    const nextMonthDaysToAdd = paddingTarget - days.length;

    for (let dayNum = 1; dayNum <= nextMonthDaysToAdd; dayNum++) {
      const d = new Date(year, month + 1, dayNum);
      const key = this.formatDateKey(d);
      days.push({
        date: d,
        dateKey: key,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: key === todayStr,
        tasks: this.getTasksForDate(d)
      });
    }

    this.calendarDays = days;

    // Refresh selectedDay if currently open
    if (this.selectedDay) {
      const refreshed = days.find(d => d.dateKey === this.selectedDay!.dateKey);
      this.selectedDay = refreshed || null;
    }
  }

  getTasksForDate(date: Date): any[] {
    const targetKey = this.formatDateKey(date);
    return this.filteredTasks.filter(t => {
      if (!t.dueDate) return false;
      const dueKey = this.formatDateKey(new Date(t.dueDate));
      return dueKey === targetKey;
    });
  }

  formatDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  selectDay(day: CalendarDay): void {
    this.selectedDay = day;
    this.cdr.markForCheck();
  }

  closeDayDetail(): void {
    this.selectedDay = null;
    this.cdr.markForCheck();
  }

  isOverdue(task: any): boolean {
    if (!task || !task.dueDate || task.status === 'completed') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(task.dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  }

  buildTimeline(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + 7);

    const overdueTasks: any[] = [];
    const todayTasks: any[] = [];
    const tomorrowTasks: any[] = [];
    const thisWeekTasks: any[] = [];
    const laterTasks: any[] = [];
    const noDueDateTasks: any[] = [];

    this.filteredTasks.forEach(task => {
      if (!task.dueDate) {
        noDueDateTasks.push(task);
        return;
      }

      const due = new Date(task.dueDate);
      due.setHours(0, 0, 0, 0);

      if (due < today && task.status !== 'completed') {
        overdueTasks.push(task);
      } else if (due.getTime() === today.getTime()) {
        todayTasks.push(task);
      } else if (due.getTime() === tomorrow.getTime()) {
        tomorrowTasks.push(task);
      } else if (due > tomorrow && due <= endOfWeek) {
        thisWeekTasks.push(task);
      } else {
        laterTasks.push(task);
      }
    });

    const groups: TimelineGroup[] = [];

    if (overdueTasks.length > 0) {
      groups.push({
        title: '⚠️ Overdue Tasks',
        badgeClass: 'badge-overdue',
        tasks: overdueTasks
      });
    }

    if (todayTasks.length > 0) {
      groups.push({
        title: '📍 Due Today',
        badgeClass: 'badge-today',
        tasks: todayTasks
      });
    }

    if (tomorrowTasks.length > 0) {
      groups.push({
        title: '⏰ Due Tomorrow',
        badgeClass: 'badge-tomorrow',
        tasks: tomorrowTasks
      });
    }

    if (thisWeekTasks.length > 0) {
      groups.push({
        title: '🗓️ Due This Week',
        badgeClass: 'badge-week',
        tasks: thisWeekTasks
      });
    }

    if (laterTasks.length > 0) {
      groups.push({
        title: '📌 Later Upcoming',
        badgeClass: 'badge-later',
        tasks: laterTasks
      });
    }

    if (noDueDateTasks.length > 0) {
      groups.push({
        title: '📝 No Due Date Assigned',
        badgeClass: 'badge-none',
        tasks: noDueDateTasks
      });
    }

    this.timelineGroups = groups;
  }
}
