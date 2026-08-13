import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';

interface DemoQuestion {
  tier: number;
  sport: string;
  prompt: string;
  answer: string;
  options: string[];
}

interface Stat {
  label: string;
  value: number;
  suffix?: string;
  shown: number;
}

/**
 * Public landing page.
 *
 * Every number and every question on this page is real — pulled from the actual
 * corpus, not invented for the mockup. That is the point of the page: the
 * product's claim is that nothing is made up, so the marketing had better not
 * be either.
 *
 * Motion is used where it carries information — a counter arriving at a real
 * figure, the calendar filling in month by month to show winter is covered —
 * and nowhere else. All of it is disabled under prefers-reduced-motion.
 */
@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  @ViewChild('statsBlock') statsBlock?: ElementRef<HTMLElement>;
  @ViewChild('calendarBlock') calendarBlock?: ElementRef<HTMLElement>;

  /** Real corpus figures. */
  readonly stats: Stat[] = [
    { label: 'games scanned', value: 235512, shown: 0 },
    { label: 'notable events found', value: 11488, shown: 0 },
    { label: 'questions generated', value: 8855, shown: 0 },
    { label: 'of 366 days covered', value: 365, shown: 0 },
  ];

  readonly spanFrom = 1871;
  readonly spanTo = 2026;

  /** Events per month, from the real corpus. Drives the calendar bars. */
  readonly monthly = [597, 518, 511, 1885, 1556, 936, 780, 953, 1400, 1310, 515, 527];
  readonly monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  monthsRevealed = 0;

  readonly sports = [
    { name: 'Baseball', count: 5678 },
    { name: 'Basketball', count: 1898 },
    { name: 'Hockey', count: 1837 },
    { name: 'Soccer', count: 1687 },
    { name: 'Formula One', count: 262 },
    { name: 'Football', count: 126 },
  ];

  readonly ladder = [
    { tier: 1, label: 'Last year', hint: 'a warm-up' },
    { tier: 2, label: '2 to 5 years', hint: '' },
    { tier: 3, label: '5 to 15 years', hint: '' },
    { tier: 4, label: '15 to 30 years', hint: '' },
    { tier: 5, label: '30 years and back', hint: 'the deep end' },
  ];

  /** Real questions, straight from the bank. */
  readonly demos: DemoQuestion[] = [
    {
      tier: 1, sport: 'Football',
      prompt: 'Who won Super Bowl 59, played on February 9, 2025?',
      answer: 'Philadelphia Eagles',
      options: ['Kansas City Chiefs', 'Philadelphia Eagles',
                'San Francisco 49ers', 'Baltimore Ravens'],
    },
    {
      tier: 3, sport: 'Formula One',
      prompt: 'The Indian Grand Prix on October 27, 2013 decided the drivers’ championship. Who won the race itself?',
      answer: 'Sebastian Vettel',
      options: ['Fernando Alonso', 'Sebastian Vettel',
                'Lewis Hamilton', 'Kimi Räikkönen'],
    },
    {
      tier: 5, sport: 'Baseball',
      prompt: 'On June 14, 1965, which future star made his first appearance, going on to 1,386 starts?',
      answer: 'Steve Carlton',
      options: ['Nolan Ryan', 'Tom Seaver', 'Steve Carlton', 'Don Sutton'],
    },
  ];

  demoIndex = 0;
  chosen: string | null = null;

  private frames: number[] = [];
  private timers: number[] = [];
  private observers: IntersectionObserver[] = [];

  get demo(): DemoQuestion {
    return this.demos[this.demoIndex];
  }

  get reduceMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  ngAfterViewInit(): void {
    if (this.reduceMotion) {
      this.stats.forEach((s) => (s.shown = s.value));
      this.monthsRevealed = 12;
      return;
    }
    this.whenVisible(this.statsBlock, () => this.stats.forEach((s, i) =>
      this.countUp(s, 900 + i * 120)));
    this.whenVisible(this.calendarBlock, () => this.revealMonths());
  }

  ngOnDestroy(): void {
    this.frames.forEach((f) => cancelAnimationFrame(f));
    this.timers.forEach((t) => clearTimeout(t));
    this.observers.forEach((o) => o.disconnect());
  }

  private whenVisible(ref: ElementRef<HTMLElement> | undefined, run: () => void): void {
    if (!ref) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          run();
          observer.disconnect();
        }
      }
    }, { threshold: 0.25 });
    observer.observe(ref.nativeElement);
    this.observers.push(observer);
  }

  /** Ease-out so the number decelerates into its real value. */
  private countUp(stat: Stat, duration: number): void {
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      stat.shown = Math.round(stat.value * eased);
      if (t < 1) this.frames.push(requestAnimationFrame(step));
    };
    this.frames.push(requestAnimationFrame(step));
  }

  private revealMonths(): void {
    for (let i = 1; i <= 12; i++) {
      this.timers.push(
        window.setTimeout(() => (this.monthsRevealed = i), i * 90) as unknown as number,
      );
    }
  }

  barHeight(count: number): number {
    const max = Math.max(...this.monthly);
    // A floor, so a quiet month still reads as covered rather than absent —
    // which is the whole point of the multi-sport corpus.
    return Math.max(8, Math.round((count / max) * 100));
  }

  choose(option: string): void {
    if (this.chosen) return;
    this.chosen = option;
    this.timers.push(window.setTimeout(() => this.nextDemo(), 2600) as unknown as number);
  }

  nextDemo(): void {
    this.chosen = null;
    this.demoIndex = (this.demoIndex + 1) % this.demos.length;
  }

  isCorrect(option: string): boolean {
    return this.chosen !== null && option === this.demo.answer;
  }

  isWrongChoice(option: string): boolean {
    return this.chosen === option && option !== this.demo.answer;
  }

  format(n: number): string {
    return n.toLocaleString('en-US');
  }
}
