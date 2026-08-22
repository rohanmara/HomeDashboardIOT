import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

type ShellNav = 'home' | 'study' | 'tv';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  standalone: false
})
export class AppComponent {
  readonly title = 'Home Hub';
  activeNav: ShellNav = 'home';

  constructor(private readonly router: Router) {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.activeNav = this.resolveNav(event.urlAfterRedirects);
      });

    this.activeNav = this.resolveNav(this.router.url);
  }

  private resolveNav(url: string): ShellNav {
    if (url.startsWith('/study')) {
      return 'study';
    }
    if (url.startsWith('/tv')) {
      return 'tv';
    }
    return 'home';
  }
}
