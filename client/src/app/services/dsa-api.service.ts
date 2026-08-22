import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DsaCompleteRequest {
  problemUrl?: string;
  problemTitle?: string;
  approach?: string;
  trick?: string;
  xp: number;
  comments?: string;
  speedDemon?: boolean;
}

export interface DsaCompleteResponse {
  success: boolean;
  message: string;
  problemLabel: string;
  problemsSerial: number;
  logSerial: number;
  xp: number;
  speedDemon: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DsaApiService {
  private readonly baseUrl = `${environment.apiBaseUrl}/dsa`;

  constructor(private readonly http: HttpClient) {}

  complete(payload: DsaCompleteRequest): Observable<DsaCompleteResponse> {
    return this.http.post<DsaCompleteResponse>(`${this.baseUrl}/complete`, payload);
  }
}
