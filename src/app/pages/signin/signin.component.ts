import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthUiService } from '../../services/auth-ui.service';

/**
 * A legacy route, kept only so old links and bookmarks resolve.
 *
 * It used to render a page whose only content was another sign-in button, and
 * then briefly redirected to Cognito's hosted UI — which was worse, because the
 * hosted UI cannot be styled and reads as a different product. Now it lands on
 * the app and opens the dropdown, which is where sign-in actually lives.
 */
@Component({
  selector: 'app-signin',
  template: '',
})
export class SigninComponent implements OnInit {
  constructor(
    private readonly authUi: AuthUiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    const mode = this.route.snapshot.queryParamMap.get('mode') === 'signup'
      ? 'signup' : 'signin';
    void this.router.navigate(['/']).then(() => this.authUi.open(mode));
  }
}
