import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { StudySession } from '../../models/session.model';
import { DsaApiService } from '../../services/dsa-api.service';
import { SessionApiService } from '../../services/session-api.service';
import { SessionSyncService } from '../../services/session-sync.service';
import { formatClock } from '../../utils/duration.util';

@Component({
  selector: 'app-session-page',
  templateUrl: './session-page.component.html',
  styleUrl: './session-page.component.scss',
  standalone: false
})
export class SessionPageComponent implements OnInit, OnDestroy {
  activeSession: StudySession | null = null;
  elapsedSeconds = 0;
  isBusy = false;
  errorMessage = '';
  readonly formatClock = formatClock;

  readonly xpOptions = [10, 15, 25, 35, 40];
  problemInput = '';
  approach = '';
  trick = '';
  comments = '';
  xp = 25;
  speedDemon = false;
  isLoggingProblem = false;
  dsaSuccessMessage = '';
  dsaErrorMessage = '';

  private readonly subscriptions = new Subscription();

  constructor(
    private readonly sessionApi: SessionApiService,
    private readonly sessionSync: SessionSyncService,
    private readonly dsaApi: DsaApiService
  ) {}

  ngOnInit(): void {
    this.refreshActiveSession();
    this.subscriptions.add(
      this.sessionSync.activeSession$.subscribe((session) => {
        this.activeSession = session;
        this.tickElapsed();
        if (session) {
          this.errorMessage = '';
        }
      })
    );
    this.subscriptions.add(interval(1000).subscribe(() => this.tickElapsed()));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get isActive(): boolean {
    return this.activeSession !== null;
  }

  toggleSession(): void {
    if (this.isBusy) {
      return;
    }

    if (this.isActive) {
      this.stopSession();
      return;
    }

    this.startSession();
  }

  logSolvedProblem(): void {
    const input = this.problemInput.trim();
    if (!input || this.isLoggingProblem) {
      return;
    }

    this.isLoggingProblem = true;
    this.dsaSuccessMessage = '';
    this.dsaErrorMessage = '';

    const looksLikeUrl = /leetcode\.com\/problems\//i.test(input);

    this.subscriptions.add(
      this.dsaApi
        .complete({
          problemUrl: looksLikeUrl ? input : undefined,
          problemTitle: looksLikeUrl ? undefined : input,
          approach: this.approach.trim(),
          trick: this.trick.trim(),
          comments: this.comments.trim(),
          xp: this.xp,
          speedDemon: this.speedDemon
        })
        .subscribe({
          next: (response) => {
            this.dsaSuccessMessage = response.message;
            this.problemInput = '';
            this.approach = '';
            this.trick = '';
            this.comments = '';
            this.speedDemon = false;
            this.xp = 25;
            this.isLoggingProblem = false;
          },
          error: (error: unknown) => {
            this.dsaErrorMessage = this.readError(
              error,
              'Could not write to Google Sheet. Is the service account set up?'
            );
            this.isLoggingProblem = false;
          }
        })
    );
  }

  private startSession(): void {
    this.isBusy = true;
    this.errorMessage = '';
    this.subscriptions.add(
      this.sessionApi.startSession('focus', 'dashboard').subscribe({
        next: (session) => {
          this.activeSession = session;
          this.tickElapsed();
          this.isBusy = false;
        },
        error: (error: unknown) => {
          this.errorMessage = this.readError(error, 'Could not start session.');
          this.isBusy = false;
        }
      })
    );
  }

  private stopSession(): void {
    this.isBusy = true;
    this.errorMessage = '';
    this.subscriptions.add(
      this.sessionApi.stopSession().subscribe({
        next: () => {
          this.activeSession = null;
          this.elapsedSeconds = 0;
          this.isBusy = false;
        },
        error: (error: unknown) => {
          this.errorMessage = this.readError(error, 'Could not stop session.');
          this.isBusy = false;
        }
      })
    );
  }

  private refreshActiveSession(): void {
    this.subscriptions.add(
      this.sessionApi.getActiveSession().subscribe({
        next: (session) => {
          this.activeSession = session;
          this.tickElapsed();
        },
        error: (error: unknown) => {
          this.errorMessage = this.readError(
            error,
            'Cannot reach the study API. Is the server running on port 3000?'
          );
        }
      })
    );
  }

  private tickElapsed(): void {
    if (!this.activeSession) {
      this.elapsedSeconds = 0;
      return;
    }

    const startedMs = Date.parse(this.activeSession.startedAt);
    this.elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedMs) / 1000));
  }

  private readError(error: unknown, fallback: string): string {
    if (
      typeof error === 'object' &&
      error !== null &&
      'error' in error &&
      typeof (error as { error: unknown }).error === 'object' &&
      (error as { error: { message?: string } }).error !== null &&
      typeof (error as { error: { message?: string } }).error.message === 'string'
    ) {
      return (error as { error: { message: string } }).error.message;
    }

    return fallback;
  }
}
