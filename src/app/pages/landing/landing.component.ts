import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
} from '@angular/core';

import { BallKind } from './sport-ball.component';

interface DemoQuestion {
  tier: number;
  sport: string;
  ball: BallKind;
  prompt: string;
  answer: string;
  options: string[];
  /** Seconds the simulated player "thinks" for — drives the speed bonus. */
  thinkFor: number;
  /** What the simulated player picks. One miss keeps it honest. */
  picks: string;
}

interface Stat {
  label: string;
  value: number;
  shown: number;
}

interface Section {
  id: string;
  label: string;
  ball: BallKind;
}

/**
 * Public landing page.
 *
 * Every number and every question here is real, pulled from the actual corpus.
 * The product's claim is that nothing is invented, so the page that makes that
 * claim had better not invent anything either.
 *
 * Motion is used where it carries meaning — a counter arriving at a real
 * figure, the calendar filling in to show winter is covered, a ball whose sport
 * changes as you move through the sections. All of it is off under
 * prefers-reduced-motion.
 */
@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  @ViewChild('statsBlock') statsBlock?: ElementRef<HTMLElement>;
  @ViewChild('calendarBlock') calendarBlock?: ElementRef<HTMLElement>;
  @ViewChild('demoBlock') demoBlock?: ElementRef<HTMLElement>;

  /** Section jump list, doubling as the scroll-spy model. */
  readonly sections: Section[] = [
    { id: 'top', label: 'Top', ball: 'baseball' },
    { id: 'how', label: 'How it works', ball: 'basketball' },
    { id: 'ladder', label: 'The ladder', ball: 'football' },
    { id: 'demo', label: 'Try one', ball: 'soccer' },
    { id: 'coverage', label: 'Coverage', ball: 'puck' },
    { id: 'sources', label: 'Sources', ball: 'tyre' },
  ];

  activeSection = 'top';
  scrollProgress = 0;
  scrolled = false;
  sidebarOpen = false;

  /** Real corpus figures. */
  readonly stats: Stat[] = [
    { label: 'games scanned', value: 235512, shown: 0 },
    { label: 'notable events found', value: 11488, shown: 0 },
    { label: 'questions generated', value: 8855, shown: 0 },
    { label: 'of 366 days covered', value: 365, shown: 0 },
  ];

  readonly spanFrom = 1871;
  readonly spanTo = 2026;

  readonly monthly = [597, 518, 511, 1885, 1556, 936, 780, 953, 1400, 1310, 515, 527];
  readonly monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  monthsRevealed = 0;

  readonly sports: { name: string; count: number; ball: BallKind }[] = [
    { name: 'Baseball', count: 5678, ball: 'baseball' },
    { name: 'Basketball', count: 1898, ball: 'basketball' },
    { name: 'Hockey', count: 1837, ball: 'puck' },
    { name: 'Soccer', count: 1687, ball: 'soccer' },
    { name: 'Formula One', count: 262, ball: 'tyre' },
    { name: 'Football', count: 126, ball: 'football' },
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
      tier: 1, sport: 'Football', ball: 'football',
      prompt: 'Who won Super Bowl 59, played on February 9, 2025?',
      answer: 'Philadelphia Eagles',
      options: ['Kansas City Chiefs', 'Philadelphia Eagles',
                'San Francisco 49ers', 'Baltimore Ravens'],
      thinkFor: 4.2, picks: 'Philadelphia Eagles',
    },
    {
      tier: 3, sport: 'Formula One', ball: 'tyre',
      prompt: 'The Indian Grand Prix on October 27, 2013 decided the drivers’ championship. Who won the race itself?',
      answer: 'Sebastian Vettel',
      options: ['Fernando Alonso', 'Sebastian Vettel',
                'Lewis Hamilton', 'Kimi Räikkönen'],
      thinkFor: 11.6, picks: 'Sebastian Vettel',
    },
    {
      tier: 5, sport: 'Baseball', ball: 'baseball',
      prompt: 'On June 14, 1965, which future star made his first appearance, going on to 1,386 starts?',
      answer: 'Steve Carlton',
      options: ['Nolan Ryan', 'Tom Seaver', 'Steve Carlton', 'Don Sutton'],
      // Deliberately wrong: a demo where every answer lands is not honest, and
      // a miss is the only way to show that a wrong answer earns nothing.
      thinkFor: 7.4, picks: 'Nolan Ryan',
    },
  ];

  // ---- auto-playing demo reel -------------------------------------------
  //
  // Runs itself rather than waiting to be clicked. Two reasons: a visitor
  // should not have to work to see what the product does, and the scoring —
  // which is the interesting part — only shows when an answer is timed. Each
  // question carries its own "thinking time" so the speed bonus visibly
  // differs between a quick answer and a laboured one.
  demoIndex = 0;
  demoPhase: 'asking' | 'chosen' | 'scored' = 'asking';
  demoChoice: string | null = null;
  elapsed = 0;
  awarded = { base: 0, bonus: 0, correct: false };
  runningTotal = 0;
  demoPaused = false;

  private frames: number[] = [];
  private timers: number[] = [];
  private observers: IntersectionObserver[] = [];
  private ticking = false;

  get demo(): DemoQuestion {
    return this.demos[this.demoIndex];
  }

  /** The rolling ball takes its sport from whichever section is in view. */
  get activeBall(): BallKind {
    return this.sections.find((s) => s.id === this.activeSection)?.ball ?? 'baseball';
  }

  get reduceMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  ngAfterViewInit(): void {
    this.trackSections();

    if (this.reduceMotion) {
      this.stats.forEach((s) => (s.shown = s.value));
      this.monthsRevealed = 12;
      return;
    }
    this.whenVisible(this.statsBlock, () =>
      this.stats.forEach((s, i) => this.countUp(s, 900 + i * 120)));
    this.whenVisible(this.calendarBlock, () => this.revealMonths());
    this.whenVisible(this.demoBlock, () => this.startReel());
  }

  ngOnDestroy(): void {
    this.frames.forEach((f) => cancelAnimationFrame(f));
    this.timers.forEach((t) => clearTimeout(t));
    this.observers.forEach((o) => o.disconnect());
  }

  // ------------------------------------------------------------ scrolling

  @HostListener('window:scroll')
  onScroll(): void {
    // Coalesced into a frame: a raw scroll handler fires far more often than
    // the screen refreshes and makes the whole page feel heavy.
    if (this.ticking) return;
    this.ticking = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      this.scrollProgress = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      this.scrolled = window.scrollY > 40;
      this.ticking = false;
    });
  }

  private trackSections(): void {
    const observer = new IntersectionObserver(
      (entries) => {
        // The entry nearest the top of the viewport wins, so a tall section
        // does not keep the highlight while a short one scrolls past.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length) this.activeSection = visible[0].target.id;
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 },
    );
    for (const s of this.sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    this.observers.push(observer);
  }

  jumpTo(id: string): void {
    this.sidebarOpen = false;
    document.getElementById(id)?.scrollIntoView({
      behavior: this.reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  // ----------------------------------------------------------- animation

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

  /** Ease-out, so the number decelerates into its real value. */
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

  // ---------------------------------------------------------------- demo

  // ---- the reel ---------------------------------------------------------

  private startReel(): void {
    if (this.reduceMotion) {
      // No animation: show one finished question so the mechanic is still legible.
      this.demoPhase = 'scored';
      this.demoChoice = this.demo.picks;
      this.elapsed = this.demo.thinkFor;
      this.score();
      return;
    }
    this.runQuestion();
  }

  private runQuestion(): void {
    this.demoPhase = 'asking';
    this.demoChoice = null;
    this.elapsed = 0;

    const question = this.demo;
    const started = performance.now();

    const tick = (now: number) => {
      if (this.demoPaused) {
        this.frames.push(requestAnimationFrame(tick));
        return;
      }
      this.elapsed = Math.min(question.thinkFor, (now - started) / 1000);
      if (this.elapsed < question.thinkFor) {
        this.frames.push(requestAnimationFrame(tick));
      } else {
        this.demoChoice = question.picks;
        this.demoPhase = 'chosen';
        this.timers.push(window.setTimeout(() => {
          this.score();
          this.demoPhase = 'scored';
          this.timers.push(window.setTimeout(() => this.advance(), 2600) as unknown as number);
        }, 550) as unknown as number);
      }
    };
    this.frames.push(requestAnimationFrame(tick));
  }

  /**
   * Mirrors the real server-side rules: base by tier, a speed bonus capped at a
   * quarter of base that decays but never hits zero, and nothing at all for a
   * wrong answer.
   */
  private score(): void {
    const q = this.demo;
    const base = [0, 100, 150, 200, 250, 300][q.tier];
    const correct = q.picks === q.answer;

    let fraction: number;
    if (this.elapsed <= 10) fraction = 1;
    else fraction = Math.max(1 - 0.5 * ((this.elapsed - 10) / 20), 0.25);

    const bonus = correct ? Math.round(base * 0.25 * fraction) : 0;
    this.awarded = { base: correct ? base : 0, bonus, correct };
    this.runningTotal += this.awarded.base + bonus;
  }

  private advance(): void {
    const last = this.demoIndex === this.demos.length - 1;
    this.demoIndex = (this.demoIndex + 1) % this.demos.length;
    if (last) this.runningTotal = 0;
    this.runQuestion();
  }

  pauseReel(): void { this.demoPaused = true; }
  resumeReel(): void { this.demoPaused = false; }

  isPicked(option: string): boolean {
    return this.demoChoice === option;
  }

  showsAsCorrect(option: string): boolean {
    return this.demoPhase === 'scored' && option === this.demo.answer;
  }

  showsAsWrong(option: string): boolean {
    return this.demoPhase === 'scored'
      && this.demoChoice === option
      && option !== this.demo.answer;
  }

    format(n: number): string {
    return n.toLocaleString('en-US');
  }
}
