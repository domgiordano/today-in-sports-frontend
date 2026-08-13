import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { PlayService } from '../../services/play.service';

/**
 * Profile and settings.
 *
 * One component, two routes — they share an identity header and differ only in
 * the panel below, and splitting them would duplicate that for no gain.
 *
 * Deliberately honest about what does not exist yet: streaks and history need
 * play data that has not been collected, and saying so beats showing a zero
 * that looks like a bug.
 */
@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss'],
})
export class AccountComponent {
  readonly section: 'profile' | 'settings';

  constructor(
    readonly auth: AuthService,
    readonly play: PlayService,
    route: ActivatedRoute,
  ) {
    this.section = route.snapshot.data['section'] === 'settings' ? 'settings' : 'profile';
  }

  get deviceId(): string {
    return this.play.deviceId;
  }

  signOut(): void {
    this.auth.signOut();
    window.location.href = '/';
  }
}
