import { Component } from '@angular/core';

interface ModuleCard {
  title: string;
  description: string;
  route: string;
  accent: 'teal' | 'slate';
  cta: string;
}

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
  standalone: false
})
export class HomePageComponent {
  readonly modules: ModuleCard[] = [
    {
      title: 'Study',
      description: 'Start focus sessions and review your study analytics.',
      route: '/study',
      accent: 'teal',
      cta: 'Open study'
    },
    {
      title: 'TV',
      description: 'Toggle power or jump into Hotstar for Lapandav.',
      route: '/tv',
      accent: 'slate',
      cta: 'Open TV'
    }
  ];
}
