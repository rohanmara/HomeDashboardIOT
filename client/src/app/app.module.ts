import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { SessionPageComponent } from './pages/session-page/session-page.component';
import { AnalyticsPageComponent } from './pages/analytics-page/analytics-page.component';
import { TvPageComponent } from './pages/tv-page/tv-page.component';

@NgModule({
  declarations: [
    AppComponent,
    HomePageComponent,
    SessionPageComponent,
    AnalyticsPageComponent,
    TvPageComponent
  ],
  imports: [BrowserModule, FormsModule, HttpClientModule, AppRoutingModule],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
