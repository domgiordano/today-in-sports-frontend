import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';

import {
  DateProgress,
  Question,
  QuestionBundle,
  QuestionStatus,
} from '../models/question.model';
import { environment } from '../../environments/environment';

/**
 * Review state for the question bank.
 *
 * Runs in two modes behind one interface:
 *
 *  - **Preview** (`useLocalSample`): reads a bundled sample of real generated
 *    questions and holds decisions in memory. This exists so the portal is
 *    usable before any infrastructure does, and so the question copy can be
 *    judged without an AWS account.
 *  - **Live**: reads and writes the admin API.
 *
 * Decisions are applied optimistically in both modes. A failed write rolls the
 * row back and surfaces the error rather than leaving the UI claiming a save
 * that did not happen.
 */
@Injectable({ providedIn: 'root' })
export class QuestionsService {
  private readonly questions$ = new BehaviorSubject<Question[]>([]);
  private readonly decisions = new Map<string, QuestionStatus>();
  private readonly reasons = new Map<string, string>();

  generatedAt = '';
  totalGenerated = 0;
  lastError = '';

  /** Per-date progress for the upcoming window, from the review queue. */
  dates: DateProgress[] = [];
  shortDates = 0;
  target = 6;

  get preview(): boolean {
    return environment.useLocalSample;
  }

  constructor(private readonly http: HttpClient) {}

  load(): Observable<Question[]> {
    // The scoped queue, not the whole bank. Nine thousand drafts is not a
    // review task; the next three weeks of short dates is.
    const url = this.preview
      ? 'assets/questions.sample.json'
      : `${environment.apiBase}/admin/review-queue?days=21`;

    return this.http.get<QuestionBundle>(url).pipe(
      tap((bundle) => {
        // The API returns {questions, dates, ...}; the bundled sample adds
        // generatedAt and a corpus total. Accept either.
        this.generatedAt = bundle.generatedAt ?? '';
        this.totalGenerated = bundle.total ?? bundle.questions?.length ?? 0;
        this.dates = bundle.dates ?? [];
        this.shortDates = bundle.shortDates ?? 0;
        this.target = bundle.target ?? 6;
      }),
      map((bundle) => bundle.questions ?? []),
      tap((questions) => this.questions$.next(questions)),
    );
  }

  all(): Observable<Question[]> {
    return this.questions$.asObservable();
  }

  snapshot(): Question[] {
    return this.questions$.value;
  }

  statusOf(q: Question): QuestionStatus {
    return this.decisions.get(q.questionId) ?? q.status;
  }

  reasonOf(q: Question): string {
    return this.reasons.get(q.questionId) ?? '';
  }

  pending(): Question[] {
    return this.snapshot().filter((q) => this.statusOf(q) === 'draft');
  }

  /**
   * How many more approvals the date behind this candidate still wants,
   * counting what has been approved in this session.
   *
   * This is what makes the queue shrink while you work: once a date is
   * satisfied, its remaining candidates stop being asked about. Without it
   * you would keep reviewing August 14 long after August 14 was done.
   */
  remainingFor(forDate: string | undefined): number {
    if (!forDate) return 1; // No date hint (preview mode) — always reviewable.

    const entry = this.dates.find((d) => d.quizDate === forDate);
    if (!entry) return 1;

    const approvedNow = this.snapshot().filter(
      (q) => q._forDate === forDate && this.statusOf(q) === 'approved',
    ).length;

    return entry.needed - approvedNow;
  }

  /** Dates in the window that still want questions, after this session's work. */
  outstandingDates(): DateProgress[] {
    return this.dates.filter((d) => this.remainingFor(d.quizDate) > 0);
  }

  approve(q: Question): void {
    this.decide(q, 'approved');
  }

  reject(q: Question, reason: string): void {
    // The API rejects a rejection without a reason, and so does this — the
    // reason is the only signal for fixing the template that produced it.
    if (!reason) {
      this.lastError = 'A rejection needs a reason.';
      return;
    }
    this.decide(q, 'rejected', reason);
  }

  private decide(q: Question, status: QuestionStatus, reason?: string): void {
    const previous = this.decisions.get(q.questionId);
    this.decisions.set(q.questionId, status);
    if (reason) this.reasons.set(q.questionId, reason);
    this.questions$.next(this.snapshot());
    this.lastError = '';

    if (this.preview) return;

    const action = status === 'approved' ? 'approve' : 'reject';
    this.http
      .post(`${environment.apiBase}/admin/questions/${q.questionId}/review`, {
        action,
        reason,
      })
      .pipe(
        catchError((err) => {
          // Roll back rather than show a save that did not happen.
          if (previous === undefined) this.decisions.delete(q.questionId);
          else this.decisions.set(q.questionId, previous);
          this.reasons.delete(q.questionId);
          this.questions$.next(this.snapshot());
          this.lastError = `Could not save that decision. ${err.status ?? ''}`.trim();
          return of(null);
        }),
      )
      .subscribe();
  }

  reset(q: Question): void {
    this.decisions.delete(q.questionId);
    this.reasons.delete(q.questionId);
    this.questions$.next(this.snapshot());
  }

  counts(): { approved: number; rejected: number; pending: number } {
    const all = this.snapshot();
    let approved = 0;
    let rejected = 0;
    for (const q of all) {
      const s = this.statusOf(q);
      if (s === 'approved') approved++;
      else if (s === 'rejected') rejected++;
    }
    return { approved, rejected, pending: all.length - approved - rejected };
  }

  /**
   * Per-date counts for the heatmap.
   *
   * In live mode the API computes this across the whole bank, which is the
   * number that matters — the local list is only one page of it.
   */
  coverageByDate(): Map<string, number> {
    const out = new Map<string, number>();
    for (const q of this.snapshot()) {
      if (this.statusOf(q) === 'rejected') continue;
      out.set(q.mmdd, (out.get(q.mmdd) ?? 0) + 1);
    }
    return out;
  }

  loadCoverage(): Observable<Map<string, number>> {
    if (this.preview) return of(this.coverageByDate());

    return this.http
      .get<{ coverage: Record<string, number> }>(
        `${environment.apiBase}/admin/bank/coverage`,
      )
      .pipe(
        map((r) => new Map(Object.entries(r.coverage ?? {}))),
        catchError(() => of(this.coverageByDate())),
      );
  }
}
