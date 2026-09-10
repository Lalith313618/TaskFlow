import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, concat } from 'rxjs';
import { tap } from 'rxjs/operators';
import { getBackendUrl } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class TaskService {

  private apiUrl = `${getBackendUrl()}/api/tasks`;
  private adminUrl = `${getBackendUrl()}/api/admin`;

  // In-memory cache for instant section switching (Stale-While-Revalidate)
  private tasksCache = new Map<string, any>();
  private statsCache: any = null;
  private internsCache: any = null;

  // One-time flash notification for task assignment / creation
  private pendingFlashMessage: string | null = null;
  private pendingNewTask: any | null = null;

  constructor(private http: HttpClient) {}

  setPendingAssignment(task: any, message: string): void {
    this.pendingNewTask = task;
    this.pendingFlashMessage = message;
  }

  consumePendingAssignment(): { task: any | null; message: string | null } {
    const data = {
      task: this.pendingNewTask,
      message: this.pendingFlashMessage
    };
    this.pendingNewTask = null;
    this.pendingFlashMessage = null;
    return data;
  }

  clearTasksCache(): void {
    this.tasksCache.clear();
  }

  clearInternsCache(): void {
    this.internsCache = null;
    try {
      localStorage.removeItem('taskflow_cached_interns');
    } catch (_) {}
  }

  createTask(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data).pipe(
      tap(() => this.clearTasksCache())
    );
  }

  getTasks(params?: any, forceRefresh = false): Observable<any> {
    let httpParams = new HttpParams();

    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }

    const cacheKey = httpParams.toString() || 'all';
    const fetch$ = this.http.get<any>(this.apiUrl, { params: httpParams }).pipe(
      tap(res => {
        if (res && res.success) {
          this.tasksCache.set(cacheKey, res);
        }
      })
    );

    let cached = this.tasksCache.get(cacheKey);
    // If not in memory and requesting default page 1, check persistent localStorage
    if (!cached && cacheKey.includes('page=1') && !params?.search && !params?.status && !params?.priority && !params?.internId) {
      try {
        const local = localStorage.getItem('taskflow_cached_tasks');
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) {
            cached = {
              success: true,
              data: parsed,
              pagination: { currentPage: 1, totalPages: 1, totalTasks: parsed.length }
            };
            this.tasksCache.set(cacheKey, cached);
          }
        }
      } catch (_) {}
    }

    if (!forceRefresh && cached) {
      // Emit cached data immediately (0ms latency), then fetch fresh data in background
      return concat(of(cached), fetch$);
    }

    return fetch$;
  }

  getTaskById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  updateTask(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data).pipe(
      tap(() => this.clearTasksCache())
    );
  }

  updateTaskStatus(id: string, status: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/status`, { status }).pipe(
      tap(() => this.clearTasksCache())
    );
  }

  deleteTask(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.clearTasksCache())
    );
  }

  getTaskStats(forceRefresh = false): Observable<any> {
    const fetch$ = this.http.get<any>(`${this.apiUrl}/stats`).pipe(
      tap(res => {
        if (res && res.success) {
          this.statsCache = res;
          try {
            localStorage.setItem('taskflow_cached_stats', JSON.stringify(res.data));
          } catch (_) {}
        }
      })
    );

    let cached = this.statsCache;
    if (!cached) {
      try {
        const local = localStorage.getItem('taskflow_cached_stats');
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed && typeof parsed === 'object') {
            cached = { success: true, data: parsed };
            this.statsCache = cached;
          }
        }
      } catch (_) {}
    }

    if (!forceRefresh && cached) {
      // Return cached stats immediately (0ms), then refresh silently in background
      return concat(of(cached), fetch$);
    }

    return fetch$;
  }

  getResponses(taskId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${taskId}/responses`);
  }

  addResponse(taskId: string, message: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${taskId}/responses`, { message });
  }

  submitWork(taskId: string, formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/${taskId}/submission`, formData).pipe(
      tap(() => this.clearTasksCache())
    );
  }

  getInterns(forceRefresh = false): Observable<any> {
    const fetch$ = this.http.get<any>(`${this.adminUrl}/interns`).pipe(
      tap(res => {
        if (res && res.success) {
          this.internsCache = res;
          try {
            localStorage.setItem('taskflow_cached_interns', JSON.stringify(res.data));
          } catch (_) {}
        }
      })
    );

    let cached = this.internsCache;
    if (!cached) {
      try {
        const local = localStorage.getItem('taskflow_cached_interns');
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) {
            cached = { success: true, data: parsed };
            this.internsCache = cached;
          }
        }
      } catch (_) {}
    }

    if (!forceRefresh && cached) {
      // Return cached interns immediately, then refresh silently in background
      return concat(of(cached), fetch$);
    }

    return fetch$;
  }

  getInternById(internId: string): Observable<any> {
    return this.http.get(`${this.adminUrl}/interns/${internId}`);
  }

  createIntern(data: { name: string; email: string; password: string }): Observable<any> {
    return this.http.post(`${this.adminUrl}/interns`, data).pipe(
      tap(() => this.clearInternsCache())
    );
  }

  updateIntern(internId: string, data: { name?: string; email?: string; password?: string }): Observable<any> {
    return this.http.put(`${this.adminUrl}/interns/${internId}`, data).pipe(
      tap(() => this.clearInternsCache())
    );
  }

  deleteIntern(internId: string): Observable<any> {
    return this.http.delete(`${this.adminUrl}/interns/${internId}`).pipe(
      tap(() => this.clearInternsCache())
    );
  }
}
