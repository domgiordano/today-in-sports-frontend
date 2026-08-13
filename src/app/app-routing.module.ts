import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthCallbackComponent } from './pages/auth-callback/auth-callback.component';
import { AuthGuard } from './guards/auth.guard';
import { SigninComponent } from './pages/signin/signin.component';

const routes: Routes = [
  { path: '', redirectTo: 'admin', pathMatch: 'full' },
  { path: 'signin', component: SigninComponent },
  { path: 'auth/callback', component: AuthCallbackComponent },
  {
    path: 'admin',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./pages/admin/admin.module').then((m) => m.AdminModule),
  },
  { path: '**', redirectTo: 'admin' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
