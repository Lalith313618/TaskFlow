import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = `http://${typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost'}:5000/api/auth`;
  private currentUserSubject = new BehaviorSubject<any>(this.getUser());
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) { }

  register(data: {
    name: string;
    email: string;
    password: string;
    role?: 'manager' | 'intern';
    managerAccessCode?: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  login(data: {
    email: string;
    password: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, data);
  }

  getMe(): Observable<any> {
    return this.http.get(`${this.apiUrl}/me`);
  }

  updateProfile(data: {
    name?: string;
    email?: string;
  }): Observable<any> {
    return this.http.put(`${this.apiUrl}/me`, data);
  }

  changePassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Observable<any> {
    return this.http.put(`${this.apiUrl}/change-password`, data);
  }

  saveSession(token: string, user: any): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('token', token);
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
        if (user.role) {
          localStorage.setItem('role', user.role);
        }
      }
    }
    this.currentUserSubject.next(user);
  }

  getToken(): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('token');
    }
    return null;
  }

  getUser(): any {
    if (typeof window !== 'undefined' && window.localStorage) {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    }
    return null;
  }

  getRole(): 'manager' | 'intern' {
    if (typeof window !== 'undefined' && window.localStorage) {
      const role = localStorage.getItem('role');
      if (role === 'manager' || role === 'intern') {
        return role;
      }
    }
    return 'intern';
  }

  isManager(): boolean {
    return this.getRole() === 'manager';
  }

  isIntern(): boolean {
    return this.getRole() === 'intern';
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('role');
    }
    this.currentUserSubject.next(null);
  }
}