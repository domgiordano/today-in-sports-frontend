import { ChangeDetectionStrategy, Component, HostListener, OnDestroy, OnInit, output, signal } from '@angular/core';

import { SharedModule } from '../shared/shared.module';
import { BallKind } from '../pages/landing/sport-ball.component';

// Against the timeline in intro.component.scss: the overlay has faded out by then.
export const INTRO_LENGTH = 5000;
const SKIP_FADE = 250;

export interface CalendarSheet {
  month: string;
  day: number;
  weekday: string;
}

export function sheetFor(date: Date): CalendarSheet {
  return {
    month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: date.getDate(),
    weekday: date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase(),
  };
}

// setDate rather than subtracting 24h, which lands two days back after a 23-hour DST day.
export function dayBefore(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d;
}

interface Ball {
  kind: BallKind;
  fill: string;
  seam: string;
}

// The board's own lamps: chalk, amber, red. Hex because they are SVG attributes.
const BALLS: Ball[] = [
  { kind: 'baseball', fill: '#eef2f7', seam: '#d6212f' },
  { kind: 'basketball', fill: '#f5a524', seam: '#0b1220' },
  { kind: 'football', fill: '#d6212f', seam: '#eef2f7' },
  { kind: 'soccer', fill: '#eef2f7', seam: '#0b1220' },
  { kind: 'puck', fill: '#333d49', seam: '#f5a524' },
];

/**
 * The first-load hook: yesterday tears off the calendar, the sports bounce in,
 * a ticker runs, and the board lights up the logo. CSS on transforms and
 * opacity only. AppComponent mounts it when the head script in index.html has
 * set html[data-intro="play"].
 */
@Component({
  selector: 'app-intro',
  standalone: true,
  imports: [SharedModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './intro.component.html',
  styleUrls: ['./intro.component.scss'],
})
export class IntroComponent implements OnInit, OnDestroy {
  readonly done = output<void>();

  readonly today = sheetFor(new Date());
  readonly yesterday = sheetFor(dayBefore(new Date()));
  readonly balls = BALLS;
  readonly ticker = [
    'On this date',
    `${this.today.month} ${this.today.day}`,
    'Baseball',
    'Basketball',
    'Football',
    'Soccer',
    'Hockey',
    'Racing',
    '5 questions',
    'Every day',
  ];
  readonly leaving = signal(false);

  private timer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.timer = setTimeout(() => this.done.emit(), INTRO_LENGTH);
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
  }

  @HostListener('document:keydown.escape')
  skip(): void {
    if (this.leaving()) return;
    this.leaving.set(true);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.done.emit(), SKIP_FADE);
  }
}
