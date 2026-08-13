import { Component } from '@angular/core';

interface DocSection {
  id: string;
  label: string;
}

/**
 * Public documentation.
 *
 * Deliberately concrete: real thresholds, real sources, real scoring numbers.
 * A docs page that says "we use advanced algorithms" is worth nothing, and this
 * product's entire claim is that its workings can be checked.
 */
@Component({
  selector: 'app-docs',
  templateUrl: './docs.component.html',
  styleUrls: ['./docs.component.scss'],
})
export class DocsComponent {
  readonly sections: DocSection[] = [
    { id: 'what', label: 'What it is' },
    { id: 'where', label: 'Where questions come from' },
    { id: 'notable', label: 'What counts as notable' },
    { id: 'scoring', label: 'Scoring' },
    { id: 'fair', label: 'Keeping it fair' },
    { id: 'sources', label: 'Data sources' },
    { id: 'faq', label: 'Questions' },
  ];

  active = 'what';

  readonly sources = [
    { name: 'Retrosheet', sport: 'Baseball', span: '1871 onwards',
      note: 'Complete game logs. Commercial use granted with attribution.' },
    { name: 'balldontlie', sport: 'Basketball', span: '1946 onwards', note: 'NBA game results.' },
    { name: 'NHL', sport: 'Hockey', span: '1918 onwards', note: 'Official league API, including playoff series state.' },
    { name: 'openfootball', sport: 'Soccer', span: '2010 onwards', note: 'Ten European leagues. Public domain.' },
    { name: 'f1db', sport: 'Formula One', span: '1950 onwards', note: 'Every Grand Prix. CC-BY-4.0.' },
    { name: 'nflverse', sport: 'Football', span: '1999 onwards', note: 'Schedules and results.' },
  ];

  readonly tiers = [
    { q: 1, range: 'Within the last year', points: 100 },
    { q: 2, range: 'Two to five years back', points: 150 },
    { q: 3, range: 'Five to fifteen years back', points: 200 },
    { q: 4, range: 'Fifteen to thirty years back', points: 250 },
    { q: 5, range: 'Thirty years and beyond', points: 300 },
  ];

  jumpTo(id: string): void {
    this.active = id;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
