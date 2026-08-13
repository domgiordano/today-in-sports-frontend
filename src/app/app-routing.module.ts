import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthCallbackComponent } from './pages/auth-callback/auth-callback.component';
import { AuthGuard } from './guards/auth.guard';
import { DocsComponent } from './pages/docs/docs.component';
import { LandingComponent } from './pages/landing/landing.component';
import { PlayComponent } from './pages/play/play.component';
import { SigninComponent } from './pages/signin/signin.component';

const routes: Routes = [
  // The public face. Previously this redirected straight to /admin, which meant
  // an unauthenticated visitor bounced to a sign-in wall with no idea what the
  // product was.
  { path: '', component: LandingComponent },
  { path: 'docs', component: DocsComponent },
  // Playable without an account. Signing in is offered after the round, not
  // required before it.
  { path: 'play', component: PlayComponent },
  { path: 'signin', component: SigninComponent },
  { path: 'auth/callback', component: AuthCallbackComponent },
  {
    path: 'admin',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./pages/admin/admin.module').then((m) => m.AdminModule),
  },
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { anchorScrolling: 'enabled' })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
