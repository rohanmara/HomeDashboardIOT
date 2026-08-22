export type StudyFlow = 'focus' | 'gaming';
export type SessionSource = 'dashboard' | 'esp32' | 'api';
export type AnalyticsRange = 'day' | 'week' | 'month' | 'year';

export interface StudySession {
  id: number;
  flow: StudyFlow;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  source: SessionSource;
}

export interface AnalyticsBucket {
  date: string;
  label: string;
  totalSeconds: number;
  sessionCount: number;
}

export interface AnalyticsSummary {
  range: AnalyticsRange;
  granularity: 'hour' | 'day' | 'month';
  rangeStart: string;
  rangeEnd: string;
  totalSeconds: number;
  sessionCount: number;
  averageSeconds: number;
  buckets: AnalyticsBucket[];
  sessions: StudySession[];
}
