import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
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
export class AccountComponent implements OnInit {
  readonly section: 'profile' | 'settings';

  loading = true;

  constructor(
    readonly auth: AuthService,
    readonly play: PlayService,
    readonly profile: ProfileService,
    route: ActivatedRoute,
  ) {
    this.section = route.snapshot.data['section'] === 'settings' ? 'settings' : 'profile';
  }

  ngOnInit(): void {
    // Reading the profile is also what creates it, so a first visit needs no
    // special case here.
    this.profile.load().subscribe({
      next: (me) => {
        this.country = me.country ?? '';
        this.subdivision = me.subdivision ?? '';
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  country = '';
  subdivision = '';
  savingRegion = false;
  regionSaved = false;

  saveRegion(): void {
    if (this.savingRegion) return;
    this.savingRegion = true;
    this.regionSaved = false;
    this.profile.setRegion(this.country, this.subdivision).subscribe({
      next: () => {
        this.savingRegion = false;
        this.regionSaved = true;
      },
      error: () => (this.savingRegion = false),
    });
  }

  get accuracy(): number {
    const p = this.profile.profile;
    if (!p || !p.playCount) return 0;
    return Math.round((p.totalCorrect / (p.playCount * 5)) * 100);
  }

  get deviceId(): string {
    return this.play.deviceId;
  }

  signOut(): void {
    this.auth.signOut();
    window.location.href = '/';
  }
}
