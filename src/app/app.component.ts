import { Component, OnInit, ViewChild, ViewContainerRef } from '@angular/core';

@Component({
  selector: 'app-root',
  // The onboarding prompt sits outside the outlet on purpose: it has to reach
  // somebody wherever they land after signing in, and putting it on one page
  // would mean anyone arriving on another never sees it.
  template: `
    <ng-container #introHost></ng-container>
    <div [attr.inert]="introPlaying ? '' : null">
      <router-outlet></router-outlet>
      <app-onboarding></app-onboarding>
    </div>
  `,
})
export class AppComponent implements OnInit {
  @ViewChild('introHost', { read: ViewContainerRef, static: true }) private introHost!: ViewContainerRef;

  // Set by the head script in index.html, which also paints the intro's first frame.
  introPlaying = document.documentElement.dataset['intro'] === 'play';

  ngOnInit(): void {
    if (!this.introPlaying) return;
    // Its own chunk, so nobody past the landing downloads it. A failed download goes straight to the page.
    import('./intro/intro.component').then(
      ({ IntroComponent }) => {
        const ref = this.introHost.createComponent(IntroComponent);
        // app-root is its own stacking context (z-index 1), so the boot frame
        // outside it would paint over the intro. It hands over here.
        document.documentElement.dataset['intro'] = 'playing';
        ref.instance.done.subscribe(() => {
          ref.destroy();
          this.endIntro();
        });
      },
      () => this.endIntro(),
    );
  }

  private endIntro(): void {
    document.documentElement.removeAttribute('data-intro');
    this.introPlaying = false;
  }
}
