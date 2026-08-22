import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AnalyticsRange,
  AnalyticsSummary,
  SessionSource,
  StudyFlow,
  StudySession
} from '../models/session.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SessionApiService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  getActiveSession(): Observable<StudySession | null> {
    return this.http.get<StudySession | null>(`${this.baseUrl}/sessions/active`);
  }

  startSession(
    flow: StudyFlow = 'focus',
    source: SessionSource = 'dashboard'
  ): Observable<StudySession> {
    return this.http.post<StudySession>(`${this.baseUrl}/sessions/start`, {
      flow,
      source
    });
  }

  stopSession(): Observable<StudySession> {
    return this.http.post<StudySession>(`${this.baseUrl}/sessions/stop`, {});
  }

  getAnalytics(range: AnalyticsRange): Observable<AnalyticsSummary> {
    return this.http.get<AnalyticsSummary>(`${this.baseUrl}/analytics`, {
      params: { range }
    });
  }
}
