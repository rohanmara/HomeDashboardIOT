import { Component, OnInit } from '@angular/core';
import { TvApiService, TvShow } from '../../services/tv-api.service';

@Component({
  selector: 'app-tv-page',
  templateUrl: './tv-page.component.html',
  styleUrl: './tv-page.component.scss',
  standalone: false
})
export class TvPageComponent implements OnInit {
  shows: TvShow[] = [];
  isBusy = false;
  isLoadingShows = true;
  statusMessage = '';
  errorMessage = '';

  constructor(private readonly tvApi: TvApiService) {}

  ngOnInit(): void {
    this.tvApi.listShows().subscribe({
      next: (response) => {
        this.shows = response.shows ?? [];
        this.isLoadingShows = false;
      },
      error: () => {
        this.isLoadingShows = false;
        this.errorMessage =
          'Could not load shows. Is the API running on port 3000?';
      }
    });
  }

  togglePower(): void {
    this.runCommand('Toggling TV power…', () => this.tvApi.togglePower());
  }

  goHome(): void {
    this.runCommand('Going to TV home…', () => this.tvApi.goHome());
  }

  playShow(show: TvShow): void {
    this.runCommand(
      `Opening ${show.titleMr} (${show.title})…`,
      () => this.tvApi.playShow(show.id)
    );
  }

  appLabel(app: TvShow['app']): string {
    return app === 'zee5' ? 'Zee5' : 'Hotstar';
  }

  private runCommand(
    pendingMessage: string,
    request: () => ReturnType<TvApiService['togglePower']>
  ): void {
    if (this.isBusy) {
      return;
    }

    this.isBusy = true;
    this.errorMessage = '';
    this.statusMessage = pendingMessage;

    request().subscribe({
      next: (response) => {
        this.statusMessage = response.warning
          ? `${response.message} (${response.warning})`
          : response.message;
        this.isBusy = false;
      },
      error: (error: unknown) => {
        this.statusMessage = '';
        this.errorMessage = this.readError(
          error,
          'TV command failed. Is the API running and the TV reachable?'
        );
        this.isBusy = false;
      }
    });
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
