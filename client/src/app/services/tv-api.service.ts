import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TvShow {
  id: string;
  title: string;
  titleMr: string;
  app: 'hotstar' | 'zee5';
  deepLink: string;
}

export interface TvCommandResponse {
  success: boolean;
  flow?: number;
  action?: 'power' | 'show' | 'home';
  show?: { id: string; title: string; app: string };
  message: string;
  warning?: string;
  details?: unknown;
  target?: string;
}

export interface TvShowsResponse {
  success: boolean;
  shows: TvShow[];
}

@Injectable({
  providedIn: 'root'
})
export class TvApiService {
  private readonly baseUrl = '/esp32';

  constructor(private readonly http: HttpClient) {}

  listShows(): Observable<TvShowsResponse> {
    return this.http.get<TvShowsResponse>(`${this.baseUrl}/tv/shows`);
  }

  togglePower(): Observable<TvCommandResponse> {
    return this.http.post<TvCommandResponse>(`${this.baseUrl}/tv`, {
      device: 'dashboard',
      event: 'tv_command',
      action: 1
    });
  }

  goHome(): Observable<TvCommandResponse> {
    return this.http.post<TvCommandResponse>(`${this.baseUrl}/tv`, {
      device: 'dashboard',
      event: 'tv_command',
      action: 3
    });
  }

  playShow(showId: string): Observable<TvCommandResponse> {
    return this.http.post<TvCommandResponse>(`${this.baseUrl}/tv`, {
      device: 'dashboard',
      event: 'tv_command',
      action: 2,
      show: showId
    });
  }
}
