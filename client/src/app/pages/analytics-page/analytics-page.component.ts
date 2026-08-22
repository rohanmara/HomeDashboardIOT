import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AnalyticsRange, AnalyticsSummary } from '../../models/session.model';
import { SessionApiService } from '../../services/session-api.service';
import { SessionSyncService } from '../../services/session-sync.service';
import { formatDuration } from '../../utils/duration.util';

@Component({
  selector: 'app-analytics-page',
  templateUrl: './analytics-page.component.html',
  styleUrl: './analytics-page.component.scss',
  standalone: false
})
export class AnalyticsPageComponent implements OnInit, OnDestroy {
  readonly ranges: AnalyticsRange[] = ['day', 'week', 'month', 'year'];
  readonly formatDuration = formatDuration;

  selectedRange: AnalyticsRange = 'week';
  summary: AnalyticsSummary | null = null;
  isLoading = false;
  errorMessage = '';

  private readonly subscriptions = new Subscription();

  constructor(
    private readonly sessionApi: SessionApiService,
    private readonly sessionSync: SessionSyncService
  ) {}

  ngOnInit(): void {
    this.loadAnalytics(this.selectedRange);
    this.subscriptions.add(
      this.sessionSync.sessionEvents$
        .pipe(
          filter(
            (event) =>
              event !== null &&
              (event.action === 'started' || event.action === 'stopped')
          )
        )
        .subscribe(() => this.loadAnalytics(this.selectedRange))
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  selectRange(range: AnalyticsRange): void {
    if (range === this.selectedRange && this.summary) {
      return;
    }

    this.selectedRange = range;
    this.loadAnalytics(range);
  }

  get maxBucketSeconds(): number {
    if (!this.summary || this.summary.buckets.length === 0) {
      return 1;
    }

    return Math.max(...this.summary.buckets.map((bucket) => bucket.totalSeconds), 1);
  }

  barHeight(totalSeconds: number): number {
    return Math.max(6, Math.round((totalSeconds / this.maxBucketSeconds) * 100));
  }

  get chartTitle(): string {
    switch (this.selectedRange) {
      case 'day':
        return 'Time by hour';
      case 'year':
        return 'Time by month';
      default:
        return 'Time by day';
    }
  }

  get chartSubtitle(): string {
    switch (this.selectedRange) {
      case 'day':
        return '24 hours for today';
      case 'week':
        return 'Monday–Sunday for this week';
      case 'month':
        return 'Every day in the current month';
      case 'year':
        return '12 months for this year';
      default:
        return '';
    }
  }

  private loadAnalytics(range: AnalyticsRange): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.sessionApi.getAnalytics(range).subscribe({
      next: (summary) => {
        this.summary = summary;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage =
          'Could not load analytics. Make sure the API is running.';
        this.isLoading = false;
      }
    });
  }
}
