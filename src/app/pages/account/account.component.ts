import { Component, OnInit } from '@angular/core';

import { COUNTRIES, subdivisionsFor } from '../../shared/regions';
import { ActivatedRoute } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { HistoryService } from '../../services/history.service';
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
    readonly history: HistoryService,
    route: ActivatedRoute,
  ) {
    this.section = route.snapshot.data['section'] === 'settings' ? 'settings' : 'profile';
  }

  /** The data carries codes; a person reads names. */
  readonly sportNames: Record<string, string> = {
    nfl: 'NFL', nba: 'NBA', mlb: 'MLB', nhl: 'NHL',
    soccer: 'Soccer', f1: 'F1', golf: 'Golf', tennis: 'Tennis',
    ncaaf: 'College football', ncaab: 'College basketball',
  };

  sportName(code: string): string {
    return this.sportNames[code] ?? code.toUpperCase();
  }

  /** "3 Sep", because a strip of thirty ISO dates is unreadable. */
  dayLabel(iso: string): string {
    const d = new Date(`${iso}T00:00:00Z`);
    return d.toLocaleDateString(undefined,
      { day: 'numeric', month: 'short', timeZone: 'UTC' });
  }

  cellTitle(day: { date: string; round: { points: number; correct: number; total: number } | null }): string {
    if (!day.round) return `${this.dayLabel(day.date)} — no round`;
    const r = day.round;
    return `${this.dayLabel(day.date)} — ${r.points} points, ${r.correct}/${r.total}`;
  }

  ngOnInit(): void {
    // Reading the profile is also what creates it, so a first visit needs no
    // special case here.
    this.profile.load().subscribe({
      next: (me) => {
        this.country = me.country ?? '';
        this.subdivision = me.subdivision ?? '';
        this.displayName = me.displayName ?? '';
        this.username = me.username ?? '';
        this.loading = false;
      },
      error: () => (this.loading = false),
    });

    // Separate from the profile call rather than folded into it: /me is read
    // on every page load for the onboarding check, and thirty days of rounds
    // is not worth fetching each time somebody opens a menu.
    this.history.load().subscribe({ error: () => undefined });
  }

  readonly countries = COUNTRIES;

  country = '';
  subdivision = '';
  savingRegion = false;
  regionSaved = false;

  displayName = '';
  username = '';
  savingName = false;
  nameError = '';

  locating = false;
  locateError = '';

  /** Only offered where the set is closed; elsewhere the field stays free text. */
  get subdivisions(): string[] {
    return subdivisionsFor(this.country);
  }

  onCountryChange(): void {
    // A state does not survive a change of country.
    this.subdivision = '';
    this.regionSaved = false;
  }

  /**
   * Fill the pickers from the device's own location.
   *
   * On a button, never on load. The rollup treats region as self-declared and
   * deliberately does not derive it from an IP address; asking the browser for
   * GPS the moment someone opens settings would go further than that, not
   * less far. This asks, fills the two fields, and still waits for Save.
   */
  useMyLocation(): void {
    if (this.locating || !navigator.geolocation) {
      this.locateError = navigator.geolocation ? '' : 'This browser cannot share a location.';
      return;
    }
    this.locating = true;
    this.locateError = '';

    navigator.geolocation.getCurrentPosition(
      (pos) => this.lookUp(pos.coords.latitude, pos.coords.longitude),
      () => {
        this.locating = false;
        this.locateError = 'Location not shared. Pick from the lists instead.';
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 },
    );
  }

  /**
   * Coordinates to a country and state, coarsely.
   *
   * zoom=5 asks Nominatim for the region rather than the street: the profile
   * stores a country and optionally a state, so requesting an address would be
   * fetching precision in order to throw it away.
   */
  private lookUp(lat: number, lng: number): void {
    const url = 'https://nominatim.openstreetmap.org/reverse'
      + `?format=jsonv2&zoom=5&lat=${lat}&lon=${lng}`;

    fetch(url, { headers: { Accept: 'application/json' } })
      .then((r) => r.json())
      .then((data) => {
        const address = data?.address ?? {};
        const code = String(address.country_code ?? '').toUpperCase();
        this.country = this.countries.some((c) => c.code === code) ? code : '';
        // A value the picker does not contain cannot be selected, and setting
        // one leaves the control blank with a state stored behind it. Where the
        // list is closed the name has to be in it; where it is free text
        // anything goes.
        const state = String(address.state ?? address.region ?? '');
        const closed = subdivisionsFor(this.country);
        this.subdivision = !closed.length || closed.includes(state) ? state : '';
        if (!this.country) this.locateError = 'Could not place that. Pick from the lists.';
        this.locating = false;
      })
      .catch(() => {
        this.locating = false;
        this.locateError = 'Lookup failed. Pick from the lists instead.';
      });
  }

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

  saveDisplayName(): void {
    const trimmed = this.displayName.trim();
    if (this.savingName) return;
    if (!trimmed) {
      this.nameError = 'A name cannot be empty.';
      return;
    }
    this.savingName = true;
    this.nameError = '';

    // Both go in one request, as they do at onboarding: the handle is claimed
    // first server-side, so a rejected username does not leave the display
    // name changed and the two out of step.
    this.profile.setIdentity(trimmed, this.username).subscribe({
      next: () => (this.savingName = false),
      error: (err) => {
        this.savingName = false;
        // The server's reason is the useful one — "that username is taken".
        this.nameError = err?.error?.error?.message
          || 'Could not save that. Try again.';
      },
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
