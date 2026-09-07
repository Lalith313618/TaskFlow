import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';

export interface AppNotification {
  id: string;
  type: 'task_assigned' | 'status_updated' | 'work_submitted' | 'task_message' | 'general';
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

  private messageSubject = new Subject<any>();
  private statusSubject = new Subject<any>();
  private submissionSubject = new Subject<any>();
  private notificationSubject = new Subject<AppNotification>();

  private notificationsList: AppNotification[] = [];
  private notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);

  public notifications$ = this.notificationsSubject.asObservable();
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private authService: AuthService) {
    this.loadPersistedNotifications();
    this.initSocket();
  }

  public initSocket(): void {
    if (this.socket && this.socket.connected) {
      return;
    }

    const host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
    const serverUrl = `http://${host}:5000`;

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000
    });

    this.socket.on('connect', () => {
      this.rejoinUserRoom();
    });

    // Listen to personal notification events
    this.socket.on('notification', (payload: any) => {
      const notif: AppNotification = {
        id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        type: payload.type || 'general',
        title: payload.title || 'TaskFlow Alert',
        message: payload.message || '',
        taskId: payload.taskId,
        read: false,
        createdAt: payload.createdAt || new Date().toISOString()
      };

      this.addNotification(notif);
      this.notificationSubject.next(notif);
    });

    // Listen to task room specific events
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

  public rejoinUserRoom(): void {
    const user = this.authService.getUser();
    const userId = user?.id || user?._id;
    if (this.socket && userId) {
      this.socket.emit('join_user', userId.toString());
    }
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

  // Observable accessors
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

  // Notification management
  private addNotification(notif: AppNotification): void {
    this.notificationsList.unshift(notif);
    // Keep last 30 notifications
    if (this.notificationsList.length > 30) {
      this.notificationsList = this.notificationsList.slice(0, 30);
    }
    this.updateNotificationState();
  }

  public markAsRead(id: string): void {
    const item = this.notificationsList.find(n => n.id === id);
    if (item) {
      item.read = true;
      this.updateNotificationState();
    }
  }

  public markAllAsRead(): void {
    this.notificationsList.forEach(n => n.read = true);
    this.updateNotificationState();
  }

  public clearAll(): void {
    this.notificationsList = [];
    this.updateNotificationState();
  }

  private updateNotificationState(): void {
    this.notificationsSubject.next([...this.notificationsList]);
    const unread = this.notificationsList.filter(n => !n.read).length;
    this.unreadCountSubject.next(unread);
    this.persistNotifications();
  }

  private persistNotifications(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem('tf_notifications', JSON.stringify(this.notificationsList));
      } catch (e) {
        console.warn('Could not persist notifications', e);
      }
    }
  }

  private loadPersistedNotifications(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = localStorage.getItem('tf_notifications');
        if (raw) {
          this.notificationsList = JSON.parse(raw);
          this.notificationsSubject.next([...this.notificationsList]);
          const unread = this.notificationsList.filter(n => !n.read).length;
          this.unreadCountSubject.next(unread);
        }
      } catch (e) {
        this.notificationsList = [];
      }
    }
  }
}
