import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';
import { getBackendUrl } from '../config/api.config';

export interface AppNotification {
  id: string;
  type:
    | 'task_assigned'
    | 'status_updated'
    | 'work_submitted'
    | 'task_message'
    | 'general';
  title: string;
  message: string;
  taskId?: string;
  read: boolean;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | null = null;
  private currentUserId: string | null = null;

  private apiUrl: string;
  private serverUrl: string;

  private messageSubject = new Subject<any>();
  private statusSubject = new Subject<any>();
  private submissionSubject = new Subject<any>();
  private notificationSubject = new Subject<AppNotification>();

  private notificationsList: AppNotification[] = [];
  private notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);

  public notifications$ = this.notificationsSubject.asObservable();
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(
    private authService: AuthService,
    private http: HttpClient
  ) {
    const backendUrl = getBackendUrl();
    this.apiUrl = `${backendUrl}/api/notifications`;
    this.serverUrl = backendUrl;

    this.initSocket();

    this.authService.currentUser$.subscribe(user => {
      const newUserId = user
        ? (user.id || user._id)?.toString()
        : null;

      this.handleUserChange(newUserId);
    });
  }

  public initSocket(): void {
    if (this.socket && this.socket.connected) {
      return;
    }

    this.socket = io(this.serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);

      if (this.currentUserId) {
        this.socket?.emit('join_user', this.currentUserId);
      }
    });

    this.socket.on('disconnect', reason => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', error => {
      console.warn('Socket connection error:', error.message);
    });

    this.socket.on('notification', (payload: any) => {
      if (!this.currentUserId) return;

      const notifId =
        payload.id ||
        payload._id ||
        'notif_' +
          Date.now() +
          '_' +
          Math.random().toString(36).substring(2, 7);

      if (this.notificationsList.some(n => n.id === notifId)) {
        return;
      }

      const notif: AppNotification = {
        id: notifId,
        type: payload.type || 'general',
        title: payload.title || 'TaskFlow Alert',
        message: payload.message || '',
        taskId: payload.taskId,
        read: payload.read || false,
        createdAt: payload.createdAt || new Date().toISOString()
      };

      this.addNotification(notif);
      this.notificationSubject.next(notif);
    });

    this.socket.on('new_message', (data: any) => {
      this.messageSubject.next(data);
    });

    this.socket.on('task_status_changed', (data: any) => {
      this.statusSubject.next(data);
    });

    this.socket.on('work_submitted', (data: any) => {
      this.submissionSubject.next(data);
    });
  }

  private handleUserChange(newUserId: string | null): void {
    if (this.currentUserId && this.currentUserId !== newUserId) {
      if (this.socket && this.socket.connected) {
        this.socket.emit('leave_user', this.currentUserId);
      }
    }

    this.currentUserId = newUserId;

    if (!newUserId) {
      this.notificationsList = [];
      this.notificationsSubject.next([]);
      this.unreadCountSubject.next(0);
    } else {
      this.loadPersistedNotifications();
      this.fetchNotificationsFromApi();

      if (this.socket && this.socket.connected) {
        this.socket.emit('join_user', newUserId);
      }
    }
  }

  public rejoinUserRoom(): void {
    const user = this.authService.getUser();

    const userId = user
      ? (user.id || user._id)?.toString()
      : null;

    this.handleUserChange(userId);
  }

  public onLogout(): void {
    this.handleUserChange(null);
  }

  public fetchNotificationsFromApi(): void {
    if (!this.currentUserId || !this.authService.getToken()) {
      return;
    }

    this.http.get<any>(this.apiUrl).subscribe({
      next: (res) => {
        if (res && res.success && Array.isArray(res.data)) {
          this.notificationsList = res.data.map((item: any) => ({
            id: (item._id || item.id).toString(),
            type: item.type || 'general',
            title: item.title || 'TaskFlow Alert',
            message: item.message || '',
            taskId: item.taskId
              ? (item.taskId._id || item.taskId).toString()
              : undefined,
            read: !!item.read,
            createdAt: item.createdAt || new Date().toISOString()
          }));

          const unread =
            typeof res.unreadCount === 'number'
              ? res.unreadCount
              : this.notificationsList.filter(n => !n.read).length;

          this.notificationsSubject.next([
            ...this.notificationsList
          ]);

          this.unreadCountSubject.next(unread);

          this.persistNotifications();
        }
      },

      error: (err) => {
        console.warn(
          'Could not fetch notifications from backend API:',
          err?.message || err
        );
      }
    });
  }

  public joinTask(taskId: string): void {
    if (this.socket && taskId) {
      this.socket.emit('join_task', taskId.toString());
    }
  }

  public leaveTask(taskId: string): void {
    if (this.socket && taskId) {
      this.socket.emit('leave_task', taskId.toString());
    }
  }

  public onNewMessage(): Observable<any> {
    return this.messageSubject.asObservable();
  }

  public onStatusChanged(): Observable<any> {
    return this.statusSubject.asObservable();
  }

  public onWorkSubmitted(): Observable<any> {
    return this.submissionSubject.asObservable();
  }

  public onNotification(): Observable<AppNotification> {
    return this.notificationSubject.asObservable();
  }

  private addNotification(notif: AppNotification): void {
    this.notificationsList.unshift(notif);

    if (this.notificationsList.length > 40) {
      this.notificationsList = this.notificationsList.slice(0, 40);
    }

    this.updateNotificationState();
  }

  public markAsRead(id: string): void {
    const item = this.notificationsList.find(
      n => n.id === id
    );

    if (item) {
      item.read = true;
      this.updateNotificationState();
    }

    if (this.currentUserId && this.authService.getToken()) {
      this.http
        .put(`${this.apiUrl}/${id}/read`, {})
        .subscribe({
          error: (err) =>
            console.warn(
              'Could not mark notification as read on server:',
              err
            )
        });
    }
  }

  public markAllAsRead(): void {
    this.notificationsList.forEach(
      n => (n.read = true)
    );

    this.updateNotificationState();

    if (this.currentUserId && this.authService.getToken()) {
      this.http
        .put(`${this.apiUrl}/mark-all-read`, {})
        .subscribe({
          error: (err) =>
            console.warn(
              'Could not mark all notifications as read on server:',
              err
            )
        });
    }
  }

  public clearAll(): void {
    this.notificationsList = [];

    this.updateNotificationState();

    if (
      typeof window !== 'undefined' &&
      window.localStorage &&
      this.currentUserId
    ) {
      localStorage.removeItem(
        this.getStorageKey()
      );
    }

    if (this.currentUserId && this.authService.getToken()) {
      this.http
        .delete(this.apiUrl)
        .subscribe({
          error: (err) =>
            console.warn(
              'Could not clear notifications on server:',
              err
            )
        });
    }
  }

  private updateNotificationState(): void {
    this.notificationsSubject.next([
      ...this.notificationsList
    ]);

    const unread =
      this.notificationsList.filter(
        n => !n.read
      ).length;

    this.unreadCountSubject.next(unread);

    this.persistNotifications();
  }

  private getStorageKey(): string {
    return this.currentUserId
      ? `tf_notifications_${this.currentUserId}`
      : 'tf_notifications_guest';
  }

  private persistNotifications(): void {
    if (
      typeof window !== 'undefined' &&
      window.localStorage &&
      this.currentUserId
    ) {
      try {
        localStorage.setItem(
          this.getStorageKey(),
          JSON.stringify(this.notificationsList)
        );
      } catch (e) {
        console.warn(
          'Could not persist notifications',
          e
        );
      }
    }
  }

  private loadPersistedNotifications(): void {
    if (
      typeof window !== 'undefined' &&
      window.localStorage
    ) {
      try {
        if (localStorage.getItem('tf_notifications')) {
          localStorage.removeItem(
            'tf_notifications'
          );
        }

        if (!this.currentUserId) {
          this.notificationsList = [];
          this.notificationsSubject.next([]);
          this.unreadCountSubject.next(0);
          return;
        }

        const raw = localStorage.getItem(
          this.getStorageKey()
        );

        if (raw) {
          this.notificationsList =
            JSON.parse(raw);
        } else {
          this.notificationsList = [];
        }

        this.notificationsSubject.next([
          ...this.notificationsList
        ]);

        const unread =
          this.notificationsList.filter(
            n => !n.read
          ).length;

        this.unreadCountSubject.next(unread);
      } catch (e) {
        this.notificationsList = [];
        this.notificationsSubject.next([]);
        this.unreadCountSubject.next(0);
      }
    }
  }
}

