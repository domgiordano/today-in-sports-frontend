import { Component, OnDestroy, OnInit } from '@angular/core';

import { AuthUiService } from '../../services/auth-ui.service';
import {
  AnswerResponse,
  LeaderboardResponse,
  PlayQuestion,
  PlayService,
} from '../../services/play.service';

type Phase = 'loading' | 'playing' | 'revealing' | 'finished' | 'unavailable' | 'error';

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
  numericGuess: number | null = null;
  lastResult?: AnswerResponse;
  submitting = false;

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
    this.begin();
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

  private startTimer(): void {
    this.stopTimer();
    this.elapsed = 0;
    this.startedAt = performance.now();
    this.tickHandle = window.setInterval(() => {
      this.elapsed = (performance.now() - this.startedAt) / 1000;
    }, 100);
  }

  private stopTimer(): void {
    if (this.tickHandle) window.clearInterval(this.tickHandle);
    this.tickHandle = undefined;
  }

  // ---------------------------------------------------------------- answer

  choose(option: string): void {
    if (this.phase !== 'playing') return;
    this.selected = option;
  }

  canSubmit(): boolean {
    if (this.phase !== 'playing' || this.submitting) return false;
    if (this.question?.type === 'numeric') return this.numericGuess !== null;
    return this.selected !== null;
  }

  submit(): void {
    if (!this.canSubmit() || !this.question) return;
    this.submitting = true;
    this.stopTimer();

    const value = this.question.type === 'numeric' ? this.numericGuess : this.selected;

    this.play.answer(this.question.index, value).subscribe({
      next: (res) => {
        this.submitting = false;
        this.lastResult = res;
        this.totalPoints = res.totalPoints;
        this.phase = 'revealing';

        if (res.state === 'complete') {
          this.correctCount = res.correctCount ?? 0;
          this.total = res.total ?? this.total;
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
    this.numericGuess = null;
    this.lastResult = undefined;

    if (!res || res.state === 'complete') {
      this.finish();
      return;
    }
    this.question = res.question;
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

  accuracyLabel(): string {
    return `${this.correctCount} of ${this.total}`;
  }
}
