import { Component, OnInit } from '@angular/core';

import { QuizzesService } from '../../../services/quizzes.service';
import { PublishedRunway, Quiz } from '../../../models/quiz.model';

/**
 * The publishing surface.
 *
 * A quiz is only real once it is published, and publishing is irreversible in
 * one specific way: it marks every question used, so none can resurface on this
 * calendar date in a later year. That is the whole no-repeat guarantee, so the
 * screen shows what would be spent before spending it.
 *
 * The assembler reports which constraints it had to relax on each day. Those
 * warnings are surfaced rather than hidden, because a five-question quiz that
 * is entirely baseball is a content gap worth seeing, not a success.
 */
@Component({
  selector: 'app-schedule-panel',
  templateUrl: './schedule-panel.component.html',
  styleUrls: ['./schedule-panel.component.scss'],
})
export class SchedulePanelComponent implements OnInit {
  quizzes: Quiz[] = [];
  loading = true;
  error = '';
  busyDate = '';
  days = 30;

  /**
   * How long the game stays up without anybody doing anything.
   *
   * Worth a banner rather than a column, because the failure is silent and
   * total: publishing is manual, so the run of published days always ends
   * before the assembled one, and the morning after it ends every player gets
   * "no published quiz" instead of a game.
   */
  published: PublishedRunway | null = null;

  /** Below this, publishing is the most urgent thing on the board. */
  static readonly RUNWAY_WARNING_DAYS = 14;

  get runwayIsShort(): boolean {
    return (
      !!this.published &&
      this.published.runwayDays < SchedulePanelComponent.RUNWAY_WARNING_DAYS
    );
  }

  constructor(readonly quizzesService: QuizzesService) {}

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading = true;
    this.quizzesService.listWithRunway().subscribe({
      next: ({ quizzes, published }) => {
        this.quizzes = quizzes;
        this.published = published;
        this.loading = false;
      },
      error: () => {
        this.error = 'Could not load the schedule.';
        this.loading = false;
      },
    });
  }

  assemble(): void {
    this.loading = true;
    this.quizzesService.assemble(this.days).subscribe({
      next: () => this.refresh(),
      error: () => {
        this.error = 'Assembly failed.';
        this.loading = false;
      },
    });
  }

  publish(quiz: Quiz): void {
    if (!this.canPublish(quiz)) return;
    this.busyDate = quiz.quizDate;
    this.quizzesService.setStatus(quiz.quizDate, 'published').subscribe({
      next: () => {
        this.busyDate = '';
        this.refresh();
      },
      error: () => {
        this.error = `Could not publish ${quiz.quizDate}.`;
        this.busyDate = '';
      },
    });
  }

  /** A short day is a content gap, not something to ship. */
  canPublish(quiz: Quiz): boolean {
    return quiz.status !== 'published' && quiz.questionIds.length === 5;
  }

  sportMix(quiz: Quiz): string {
    const mix = quiz.sportMix ?? {};
    const parts = Object.entries(mix).map(([sport, n]) => `${sport} ${n}`);
    return parts.length ? parts.join(' · ') : '—';
  }

  distinctSports(quiz: Quiz): number {
    return Object.keys(quiz.sportMix ?? {}).length;
  }

  ladder(quiz: Quiz): string {
    return (quiz.tierLadder ?? []).join(' → ') || '—';
  }

  weekday(date: string): string {
    return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
      weekday: 'short',
      timeZone: 'UTC',
    });
  }
}
