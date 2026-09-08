import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TaskService {

  private host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
  private apiUrl = `http://${this.host}:5000/api/tasks`;
  private adminUrl = `http://${this.host}:5000/api/admin`;

  constructor(private http: HttpClient) {}

  createTask(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  getTasks(params?: any): Observable<any> {
    let httpParams = new HttpParams();

    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }

    return this.http.get(this.apiUrl, {
      params: httpParams
    });
  }

  getTaskById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  updateTask(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  updateTaskStatus(id: string, status: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/status`, { status });
  }

  deleteTask(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getTaskStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats`);
  }

  getResponses(taskId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${taskId}/responses`);
  }

  addResponse(taskId: string, message: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${taskId}/responses`, { message });
  }

  submitWork(taskId: string, formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/${taskId}/submission`, formData);
  }

  getInterns(): Observable<any> {
    return this.http.get(`${this.adminUrl}/interns`);
  }

  getInternById(internId: string): Observable<any> {
    return this.http.get(`${this.adminUrl}/interns/${internId}`);
  }

  createIntern(data: { name: string; email: string; password: string }): Observable<any> {
    return this.http.post(`${this.adminUrl}/interns`, data);
  }

  updateIntern(internId: string, data: { name?: string; email?: string; password?: string }): Observable<any> {
    return this.http.put(`${this.adminUrl}/interns/${internId}`, data);
  }

  deleteIntern(internId: string): Observable<any> {
    return this.http.delete(`${this.adminUrl}/interns/${internId}`);
  }
}
