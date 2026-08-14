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

  /**
   * Every source, with a link and its terms.
   *
   * This is attribution, not decoration: Retrosheet and MLBAM both require a
   * visible notice, and several of the others are only usable because somebody
   * published them under a licence that says so. A source that cannot be named
   * here has no business being in the corpus.
   */
  readonly sources = [
    { name: 'Retrosheet', sport: 'Baseball', span: '1871 onwards',
      url: 'https://www.retrosheet.org/',
      note: 'Game logs, transactions and ballparks. Free for non-commercial ' +
            'use with attribution; the information used here was obtained ' +
            'free of charge from and is copyrighted by Retrosheet.' },
    { name: 'MLB Stats API', sport: 'Baseball', span: '1931 onwards',
      url: 'https://statsapi.mlb.com/',
      note: 'Award winners, used both as events and as career honours in ' +
            'clue ladders. Copyright MLB Advanced Media.' },
    { name: 'balldontlie', sport: 'Basketball', span: '1946 onwards',
      url: 'https://www.balldontlie.io/',
      note: 'NBA game results. It returns modern franchise names for ' +
            'historical games, so questions before 2015 do not name the clubs.' },
    { name: 'NHL', sport: 'Hockey', span: '1918 onwards',
      url: 'https://api-web.nhle.com/',
      note: 'Official league API. Team names resolve from the era-specific ' +
            'tricode, so a 1970 game reads "Minnesota North Stars".' },
    { name: 'openfootball', sport: 'Soccer', span: '2010 onwards',
      url: 'https://github.com/openfootball',
      note: 'Ten European leagues. Public domain.' },
    { name: 'f1db', sport: 'Formula One', span: '1950 onwards',
      url: 'https://github.com/f1db/f1db',
      note: 'Every Grand Prix, including circuit coordinates. CC-BY-4.0.' },
    { name: 'nflverse', sport: 'Football', span: '1999 onwards',
      url: 'https://github.com/nflverse',
      note: 'Schedules and results.' },
    { name: 'The Guardian', sport: 'Narrative events', span: '1999 onwards',
      url: 'https://open-platform.theguardian.com/',
      note: 'Sport archive, via the Open Platform. Used for events no dataset ' +
            'records. Only a headline and a link are kept, and every question ' +
            'from it is written by hand against the cited sentence.' },
    { name: 'OpenStreetMap', sport: 'Map questions', span: '—',
      url: 'https://www.openstreetmap.org/copyright',
      note: 'Map tiles. © OpenStreetMap contributors, ODbL.' },
    { name: 'Nominatim', sport: 'Map questions', span: '—',
      url: 'https://nominatim.openstreetmap.org/',
      note: 'City coordinates for defunct ballparks. The pin is the city, not ' +
            'the diamond — well inside the distance the scoring can tell apart.' },
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
