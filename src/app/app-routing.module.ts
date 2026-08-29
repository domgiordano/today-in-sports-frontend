import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthCallbackComponent } from './pages/auth-callback/auth-callback.component';
import { AccountComponent } from './pages/account/account.component';
import { AdminGuard } from './guards/auth.guard';
import { SignedInGuard } from './guards/signed-in.guard';
import { DocsComponent } from './pages/docs/docs.component';
import { LandingComponent } from './pages/landing/landing.component';
import { FriendsComponent } from './pages/friends/friends.component';
import { GroupsComponent } from './pages/groups/groups.component';
import { PlayComponent } from './pages/play/play.component';
import { SigninComponent } from './pages/signin/signin.component';
import { StatsComponent } from './pages/stats/stats.component';

const routes: Routes = [
  // The public face. Previously this redirected straight to /admin, which meant
  // an unauthenticated visitor bounced to a sign-in wall with no idea what the
  // product was.
  { path: '', component: LandingComponent },
  { path: 'docs', component: DocsComponent },
  // Playable without an account. Signing in is offered after the round, not
  // required before it.
  { path: 'play', component: PlayComponent },
  // Public: the rollup is aggregate and carries no player in it.
  { path: 'stats', component: StatsComponent },
  { path: 'groups', component: GroupsComponent, canActivate: [SignedInGuard] },
  // Not guarded: the page explains what friends are and offers a sign-in, which
  // is a better landing than a redirect for somebody following a link.
  { path: 'friends', component: FriendsComponent },
  { path: 'profile', component: AccountComponent, canActivate: [SignedInGuard],
    data: { section: 'profile' } },
  { path: 'settings', component: AccountComponent, canActivate: [SignedInGuard],
    data: { section: 'settings' } },
  { path: 'signin', component: SigninComponent },
  { path: 'auth/callback', component: AuthCallbackComponent },
  {
    path: 'admin',
    canActivate: [AdminGuard],
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
