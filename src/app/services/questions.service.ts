import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';

import { Question, QuestionBundle, QuestionStatus } from '../models/question.model';
import { environment } from '../../environments/environment';

/**
 * Review state for the question bank.
 *
 * In preview mode this reads a bundled sample of real generated questions so
 * the portal is usable before any infrastructure exists. Decisions are held in
 * memory and are not persisted — swapping `environment.useLocalSample` to false
 * points the same interface at the admin API.
 */
@Injectable({ providedIn: 'root' })
export class QuestionsService {
  private readonly questions$ = new BehaviorSubject<Question[]>([]);
  private readonly decisions = new Map<string, QuestionStatus>();
  private readonly reasons = new Map<string, string>();

  generatedAt = '';
  totalGenerated = 0;

  constructor(private readonly http: HttpClient) {}

  load(): Observable<Question[]> {
    const url = environment.useLocalSample
      ? 'assets/questions.sample.json'
      : `${environment.apiBase}/admin/questions`;

    return this.http.get<QuestionBundle>(url).pipe(
      tap((bundle) => {
        this.generatedAt = bundle.generatedAt;
        this.totalGenerated = bundle.total ?? bundle.questions.length;
      }),
      map((bundle) => bundle.questions),
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

  /** Questions still awaiting a decision, in bank order. */
  pending(): Question[] {
    return this.snapshot().filter((q) => this.statusOf(q) === 'draft');
  }

  approve(q: Question): void {
    this.decisions.set(q.questionId, 'approved');
    this.questions$.next(this.snapshot());
  }

  reject(q: Question, reason: string): void {
    this.decisions.set(q.questionId, 'rejected');
    this.reasons.set(q.questionId, reason);
    this.questions$.next(this.snapshot());
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

  /** Approved-unused counts per calendar date, for the coverage heatmap. */
  coverageByDate(): Map<string, number> {
    const out = new Map<string, number>();
    for (const q of this.snapshot()) {
      if (this.statusOf(q) === 'rejected') continue;
      out.set(q.mmdd, (out.get(q.mmdd) ?? 0) + 1);
    }
    return out;
  }
}
