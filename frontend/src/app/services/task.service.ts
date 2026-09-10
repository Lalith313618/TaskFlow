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
    this.statsCache = null;
  }

  clearInternsCache(): void {
    this.internsCache = null;
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

    const cached = this.tasksCache.get(cacheKey);
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
        }
      })
    );

    if (!forceRefresh && this.statsCache) {
      // Return cached stats immediately, then refresh silently in background
      return concat(of(this.statsCache), fetch$);
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
        }
      })
    );

    if (!forceRefresh && this.internsCache) {
      // Return cached interns immediately, then refresh silently in background
      return concat(of(this.internsCache), fetch$);
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
