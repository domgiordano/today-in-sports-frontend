import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { AuthCallbackComponent } from './pages/auth-callback/auth-callback.component';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { SigninComponent } from './pages/signin/signin.component';

@NgModule({
  declarations: [AppComponent, SigninComponent, AuthCallbackComponent],
  imports: [BrowserModule, HttpClientModule, AppRoutingModule],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
