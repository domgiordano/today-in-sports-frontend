import { Component, OnDestroy, OnInit } from '@angular/core';

import { AuthUiService } from '../../services/auth-ui.service';
import {
  AnswerResponse,
  LeaderboardResponse,
  PlayQuestion,
  PlayService,
} from '../../services/play.service';

/** Where the running question's clock started, so leaving does not reset it. */
const CLOCK_KEY = 'tis.clock';

type Phase = 'intro' | 'loading' | 'playing' | 'revealing' | 'finished' | 'unavailable' | 'error';

/**
 * The quiz.
 *
 * No account required — that is the point. A visitor plays, scores, sees where
 * they landed and can put a name to it; signing in is offered afterwards as a
 * way to keep the result, not as a gate in front of it.
 *
 * Nothing here decides anything: the answer is graded on the server, the clock
 * runs on the server, and the score arrives with the verdict. The local timer is
 * presentational — it shows the player their time, it does not report it.
 */
@Component({
  selector: 'app-play',
  templateUrl: './play.component.html',
  styleUrls: ['./play.component.scss'],
})
export class PlayComponent implements OnInit, OnDestroy {
  phase: Phase = 'loading';
  error = '';

  quizDate = '';
  question?: PlayQuestion;
  totalPoints = 0;
  correctCount = 0;
  total = 5;
  resumed = false;

  /** Presentational only — the server times the real thing. */
  elapsed = 0;
  private tickHandle?: number;
  private startedAt = 0;

  selected: string | null = null;
  typed = '';
  numericGuess: number | null = null;

  /** Options arrive only if the player asks for them, and cost credit. */
  hintOptions: string[] | null = null;
  hintCost = 0;
  takingHint = false;

  /** Ordering: the player's working arrangement, tap-to-place. */
  ordered: string[] = [];
  /** Pick-four: which names are currently selected. */
  chosen: string[] = [];
  /** Map: where the player tapped, and the true point once revealed. */
  mapGuess: { lat: number; lng: number } | null = null;
  mapTruth: { lat: number; lng: number } | null = null;
  /** Clue ladder: rungs revealed so far, and what the answer is worth now. */
  clues: string[] = [];
  clueValue = 100;
  lastResult?: AnswerResponse;
  submitting = false;

  /** Earned this round, shown as a moment rather than left in a profile. */
  newBadges: { id: string; name: string; description: string }[] = [];
  streak = 0;
  badgeIndex = 0;

  board?: LeaderboardResponse;
  name = '';
  nameSaved = false;
  savingName = false;

  constructor(
    readonly play: PlayService,
    private readonly authUi: AuthUiService,
  ) {}

  /** Opens the toolbar dropdown rather than navigating away mid-result. */
  createAccount(): void {
    this.authUi.open('signup');
  }

  ngOnInit(): void {
    // Offered, not enforced. Signing in keeps a score across days, so it is
    // worth asking before the first question rather than after the last —
    // but playing without an account stays one click away, because that is
    // the product's own promise.
    if (this.signedIn) {
      this.begin();
      return;
    }
    this.phase = 'intro';
  }

  /** Start regardless — the intro is a prompt, not a gate. */
  playAnyway(): void {
    this.begin();
  }

  signInFirst(): void {
    this.authUi.open('signin');
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  get signedIn(): boolean {
    return this.play.signedIn;
  }

  get progressPct(): number {
    if (!this.question) return 100;
    return (this.question.index / this.question.total) * 100;
  }

  /**
   * The sport, as a person would say it.
   *
   * `sport` is a routing key first — it decides which templates see an event —
   * so its values read like database codes. `news` is the one that forced this
   * to exist: narrative questions carry it because they belong to no dataset,
   * and a chip reading "news" tells a player nothing. They carry the paper's
   * own section instead, which is the actual sport.
   */
  get sportLabel(): string {
    if (!this.question) return '';
    const sport = this.question.sport;
    if (sport === 'news') return this.question.league || 'Sport';
    return (
      { mlb: 'MLB', nhl: 'NHL', nba: 'NBA', nfl: 'NFL', f1: 'F1', soccer: 'Soccer' }[
        sport
      ] ?? sport
    );
  }

  // ------------------------------------------------------------- lifecycle

  begin(): void {
    this.phase = 'loading';
    this.play.start().subscribe({
      next: (res) => {
        this.quizDate = res.quizDate;
        this.totalPoints = res.totalPoints ?? 0;
        this.resumed = !!res.resumed;

        if (res.state === 'complete') {
          this.correctCount = res.correctCount ?? 0;
          this.total = res.total ?? 5;
          this.finish();
          return;
        }
        this.question = res.question;
        this.total = res.question?.total ?? 5;
        this.clues = res.question?.clues ?? [];
        this.phase = 'playing';
        this.startTimer();
      },
      error: (err) => {
        // 404 means no quiz is published for today — a content gap, not a fault
        // the player caused, so it gets its own screen rather than an error.
        if (err?.status === 404) {
          this.phase = 'unavailable';
          return;
        }
        this.error = 'Could not start today’s quiz.';
        this.phase = 'error';
      },
    });
  }

  /**
   * Start the clock, or pick it back up where it was.
   *
   * It ran on performance.now(), which is measured from page load, and reset
   * elapsed to zero every time. Leaving the quiz and coming back therefore
   * handed you a brand new clock on the same question — a free reset of the
   * speed bonus for anyone who reloaded. The anchor is wall-clock time now,
   * remembered against the question it belongs to.
   */
  private startTimer(): void {
    this.stopTimer();
    this.startedAt = this.clockAnchor();
    this.tick();
    this.tickHandle = window.setInterval(() => this.tick(), 100);
  }

  private tick(): void {
    this.elapsed = Math.max(0, (Date.now() - this.startedAt) / 1000);
  }

  /**
   * When this question's clock started. Written once and read back on return,
   * so time away counts — leaving is not a way to stop the clock.
   */
  private clockAnchor(): number {
    const id = this.question?.questionId;
    if (!id) return Date.now();
    const key = `${this.quizDate}:${id}`;

    try {
      const raw = localStorage.getItem(CLOCK_KEY);
      const saved = raw ? (JSON.parse(raw) as { key: string; at: number }) : null;
      if (saved?.key === key && typeof saved.at === 'number') return saved.at;

      const at = Date.now();
      localStorage.setItem(CLOCK_KEY, JSON.stringify({ key, at }));
      return at;
    } catch {
      // Storage refused — private browsing, most likely. A fresh clock is a
      // better outcome than no quiz.
      return Date.now();
    }
  }

  private stopTimer(): void {
    if (this.tickHandle) window.clearInterval(this.tickHandle);
    this.tickHandle = undefined;
  }

  // ---------------------------------------------------------------- answer

  choose(option: string): void {
    if (this.phase !== 'playing') return;
    this.selected = option;
    this.typed = option;
  }

  /**
   * Trade points for the four options.
   *
   * A round trip, not a local reveal: the options never travelled with the
   * question, so the server knows the hint was taken because it was the one
   * that handed them over.
   */
  takeHint(): void {
    if (!this.question || this.takingHint) return;
    if (this.question.type !== 'clue' && this.hintOptions) return;
    this.takingHint = true;
    this.play.hint(this.question.index).subscribe({
      next: (res) => {
        this.takingHint = false;
        if (res.options) this.hintOptions = res.options;
        if (res.clues) this.clues = res.clues;
        if (res.clues) this.clueValue = Math.round(res.creditMultiplier * 100);
        else this.hintCost = Math.round((1 - res.creditMultiplier) * 100);
      },
      error: () => {
        this.takingHint = false;
        this.error = 'Could not fetch the options.';
      },
    });
  }

  get hintPenaltyLabel(): string {
    return `${this.hintCost}% fewer points`;
  }

  // ------------------------------------------------------------- ordering

  /**
   * Tap to place, rather than drag.
   *
   * Drag is the obvious interaction and the wrong default: on a phone it is
   * easy to mis-drop and there is no undo mid-gesture. Tapping an item moves it
   * to the end of the arrangement; tapping it again takes it back out.
   */
  place(item: string): void {
    if (this.phase !== 'playing') return;
    const at = this.ordered.indexOf(item);
    if (at >= 0) this.ordered.splice(at, 1);
    else this.ordered.push(item);
  }

  /** The correct order, narrowed — correctAnswer is a union across formats. */
  get correctOrder(): string[] {
    const a = this.lastResult?.correctAnswer;
    return Array.isArray(a) ? a : [];
  }

  /**
   * Toggle a name in a pick-four question.
   *
   * Selecting past the limit is blocked rather than silently ignored: the
   * scoring subtracts wrong picks, so letting somebody pick all eight would be
   * handing them a zero without telling them.
   */
  toggleChoice(name: string): void {
    if (this.phase !== 'playing') return;
    const at = this.chosen.indexOf(name);
    if (at >= 0) {
      this.chosen.splice(at, 1);
      return;
    }
    if (this.chosen.length >= (this.question?.chooseCount ?? 4)) return;
    this.chosen.push(name);
  }

  isChosen(name: string): boolean {
    return this.chosen.includes(name);
  }

  get chooseRemaining(): number {
    return (this.question?.chooseCount ?? 0) - this.chosen.length;
  }

  wasCorrectChoice(name: string): boolean {
    const a = this.lastResult?.correctAnswer;
    return Array.isArray(a) && a.includes(name);
  }

  onMapPick(point: { lat: number; lng: number }): void {
    this.mapGuess = point;
  }

  positionOf(item: string): number {
    return this.ordered.indexOf(item) + 1;
  }

  get orderingComplete(): boolean {
    return this.ordered.length === (this.question?.items?.length ?? 0);
  }

  /** "Clue 2 of 5" — without it the ladder gives no sense of how far it runs. */
  get clueProgress(): string {
    const total = this.question?.clueCount ?? 0;
    return `Clue ${this.clues.length} of ${total}`;
  }

  get moreCluesLeft(): boolean {
    const q = this.question;
    if (!q || q.type !== 'clue') return false;
    return this.clues.length < (q.clueCount ?? 0);
  }

  canSubmit(): boolean {
    if (this.phase !== 'playing' || this.submitting) return false;
    if (this.question?.type === 'numeric') return this.numericGuess !== null;
    if (this.question?.type === 'ordering') return this.orderingComplete;
    if (this.question?.type === 'map') return this.mapGuess !== null;
    if (this.question?.type === 'multi') return this.chooseRemaining === 0;
    return this.typed.trim().length > 0;
  }

  submit(): void {
    if (!this.canSubmit() || !this.question) return;
    this.submitting = true;
    this.stopTimer();

    const value =
      this.question.type === 'numeric' ? this.numericGuess
      : this.question.type === 'ordering' ? this.ordered
      : this.question.type === 'map' ? this.mapGuess
      : this.question.type === 'multi' ? this.chosen
      : this.typed.trim();

    this.play.answer(this.question.index, value).subscribe({
      next: (res) => {
        this.submitting = false;
        this.lastResult = res;
        this.totalPoints = res.totalPoints;
        this.phase = 'revealing';

        // Drops the true pin and draws the line to the guess.
        if (this.question?.type === 'map') {
          this.mapTruth = res.correctAnswer as { lat: number; lng: number };
        }

        if (res.state === 'complete') {
          this.correctCount = res.correctCount ?? 0;
          this.total = res.total ?? this.total;
          this.streak = res.streak ?? 0;
          this.newBadges = res.newBadges ?? [];
          this.badgeIndex = 0;
        }
      },
      error: () => {
        this.submitting = false;
        this.error = 'Could not submit that answer.';
        this.phase = 'error';
      },
    });
  }

  next(): void {
    const res = this.lastResult;
    this.selected = null;
    this.typed = '';
    this.numericGuess = null;
    this.hintOptions = null;
    this.hintCost = 0;
    this.ordered = [];
    this.clues = [];
    this.clueValue = 100;
    this.mapGuess = null;
    this.mapTruth = null;
    this.chosen = [];
    this.lastResult = undefined;

    if (!res || res.state === 'complete') {
      this.finish();
      return;
    }
    this.question = res.question;
    this.clues = res.question?.clues ?? [];
    this.phase = 'playing';
    this.startTimer();
  }

  // ---------------------------------------------------------------- finish

  private finish(): void {
    this.stopTimer();
    this.phase = 'finished';
    this.loadBoard();
  }

  loadBoard(): void {
    this.play.leaderboard().subscribe({
      next: (board) => {
        this.board = board;
        if (board.you?.name) {
          this.name = board.you.name;
          this.nameSaved = true;
        }
      },
      error: () => { /* the score still stands without a board */ },
    });
  }

  saveName(): void {
    const trimmed = this.name.trim();
    if (!trimmed || this.savingName) return;
    this.savingName = true;
    this.play.setName(trimmed).subscribe({
      next: () => {
        this.savingName = false;
        this.nameSaved = true;
        this.loadBoard();
      },
      error: () => {
        this.savingName = false;
        this.error = 'Could not save that name.';
      },
    });
  }

  /** Share text. No emoji — the grid is drawn with block characters. */
  shareText(): string {
    const marks = (this.board?.you?.correct ?? this.correctCount);
    const filled = '▮'.repeat(marks) + '▯'.repeat(Math.max(0, this.total - marks));
    return `Today in Sports — ${this.quizDate}\n${filled}  ${this.totalPoints} pts\ntodayinsports.app`;
  }

  copyShare(): void {
    void navigator.clipboard?.writeText(this.shareText());
  }

  get currentBadge() {
    return this.newBadges[this.badgeIndex];
  }

  /** One at a time — three badges at once is a list, not a moment. */
  dismissBadge(): void {
    this.badgeIndex++;
  }

  get streakLabel(): string {
    if (this.streak <= 1) return '';
    return `${this.streak} days in a row`;
  }

  accuracyLabel(): string {
    return `${this.correctCount} of ${this.total}`;
  }
}
