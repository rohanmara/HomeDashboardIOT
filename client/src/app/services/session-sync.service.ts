import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { StudySession } from '../models/session.model';
import { environment } from '../../environments/environment';

export interface SessionUpdatedEvent {
  action: 'started' | 'stopped' | 'sync';
  session: StudySession | null;
  activeSession: StudySession | null;
}

@Injectable({
  providedIn: 'root'
})
export class SessionSyncService implements OnDestroy {
  private readonly activeSessionSubject = new BehaviorSubject<StudySession | null>(
    null
  );
  private readonly sessionEventsSubject =
    new BehaviorSubject<SessionUpdatedEvent | null>(null);
  private readonly socket: Socket;

  readonly activeSession$: Observable<StudySession | null> =
    this.activeSessionSubject.asObservable();
  readonly sessionEvents$: Observable<SessionUpdatedEvent | null> =
    this.sessionEventsSubject.asObservable();

  constructor(private readonly ngZone: NgZone) {
    this.socket = io(environment.socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000
    });

    this.socket.on('session:updated', (payload: SessionUpdatedEvent) => {
      this.ngZone.run(() => {
        this.activeSessionSubject.next(payload.activeSession ?? null);
        this.sessionEventsSubject.next(payload);
      });
    });

    this.socket.on('connect_error', (error: Error) => {
      console.warn('Session sync socket error:', error.message);
    });
  }

  ngOnDestroy(): void {
    this.socket.disconnect();
  }
}
