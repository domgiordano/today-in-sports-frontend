import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { AuthCallbackComponent } from './pages/auth-callback/auth-callback.component';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { CommonModule } from '@angular/common';
import { DocsComponent } from './pages/docs/docs.component';
import { FormsModule } from '@angular/forms';
import { LandingComponent } from './pages/landing/landing.component';
import { PlayComponent } from './pages/play/play.component';
import { AccountComponent } from './pages/account/account.component';
import { FriendsComponent } from './pages/friends/friends.component';
import { GroupsComponent } from './pages/groups/groups.component';
import { SharedModule } from './shared/shared.module';
import { SigninComponent } from './pages/signin/signin.component';
import { StatsComponent } from './pages/stats/stats.component';

@NgModule({
  declarations: [
    FriendsComponent,
    GroupsComponent,
    AppComponent,
    SigninComponent,
    StatsComponent,
    AuthCallbackComponent,
    LandingComponent,
    DocsComponent,
    PlayComponent,
    AccountComponent,
  ],
  imports: [
    SharedModule,
    BrowserModule,
    CommonModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule,
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
