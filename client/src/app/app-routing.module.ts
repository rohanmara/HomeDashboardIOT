import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { SessionPageComponent } from './pages/session-page/session-page.component';
import { AnalyticsPageComponent } from './pages/analytics-page/analytics-page.component';
import { TvPageComponent } from './pages/tv-page/tv-page.component';

const routes: Routes = [
  { path: '', pathMatch: 'full', component: HomePageComponent },
  { path: 'study', component: SessionPageComponent },
  { path: 'study/analytics', component: AnalyticsPageComponent },
  { path: 'tv', component: TvPageComponent },
  { path: 'session', redirectTo: 'study', pathMatch: 'full' },
  { path: 'analytics', redirectTo: 'study/analytics', pathMatch: 'full' },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
