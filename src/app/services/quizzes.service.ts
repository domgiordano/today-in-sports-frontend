import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, of } from 'rxjs';

import { PublishedRunway, Quiz, QuizStatus } from '../models/quiz.model';
import { environment } from '../../environments/environment';

/**
 * Scheduling and publishing.
 *
 * In preview mode there is no backend, so this returns an empty schedule rather
 * than inventing quizzes — a fabricated schedule would imply content exists
 * that does not.
 */
@Injectable({ providedIn: 'root' })
export class QuizzesService {
  constructor(private readonly http: HttpClient) {}

  private get preview(): boolean {
    return environment.useLocalSample;
  }

  list(): Observable<Quiz[]> {
    if (this.preview) return of([]);
    return this.http
      .get<{ quizzes: Quiz[] }>(`${environment.apiBase}/admin/quizzes`)
      .pipe(map((r) => r.quizzes ?? []));
  }

  /** The schedule plus how many days are actually published. */
  listWithRunway(): Observable<{ quizzes: Quiz[]; published: PublishedRunway }> {
    if (this.preview) {
      return of({
        quizzes: [],
        published: { runwayDays: 0, publishedThrough: null, goesDarkOn: '' },
      });
    }
    return this.http
      .get<{ quizzes: Quiz[]; published: PublishedRunway }>(
        `${environment.apiBase}/admin/quizzes`,
      )
      .pipe(
        map((r) => ({
          quizzes: r.quizzes ?? [],
          published: r.published ?? {
            runwayDays: 0,
            publishedThrough: null,
            goesDarkOn: '',
          },
        })),
      );
  }

  assemble(days: number): Observable<unknown> {
    if (this.preview) return of(null);
    return this.http.post(`${environment.apiBase}/admin/quizzes-assemble`, {
      days,
    });
  }

  setStatus(quizDate: string, status: QuizStatus): Observable<unknown> {
    if (this.preview) return of(null);
    return this.http.patch(
      `${environment.apiBase}/admin/quizzes-update`,
      { action: 'status', status, quizDate },
    );
  }

  swapQuestion(quizDate: string, index: number, questionId: string): Observable<unknown> {
    if (this.preview) return of(null);
    return this.http.patch(
      `${environment.apiBase}/admin/quizzes-update`,
      { action: 'swap', index, questionId, quizDate },
    );
  }
}
