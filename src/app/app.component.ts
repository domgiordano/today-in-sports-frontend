import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  // The onboarding prompt sits outside the outlet on purpose: it has to reach
  // somebody wherever they land after signing in, and putting it on one page
  // would mean anyone arriving on another never sees it.
  template: `
    <router-outlet></router-outlet>
    <app-onboarding></app-onboarding>
  `,
})
export class AppComponent {}
