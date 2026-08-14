import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';

import { environment } from '../../../../environments/environment';
import { Question } from '../../../models/question.model';
import { QuestionsService } from '../../../services/questions.service';

/**
 * Questions auto-review held back for a person.
 *
 * These had nowhere to appear. The review queue is deliberately narrow — the
 * next three weeks, and only dates still short of a full quiz — which is right
 * for filling gaps and useless for finding a flagged question sitting on some
 * date in April. Once every date had enough approved inventory the queue
 * returned nothing at all, and the flagged questions were invisible rather
 * than waiting.
 *
 * So this fetches drafts directly and groups them by the reason they were
 * held. The grouping is the point: fifty questions flagged for the same reason
 * is one decision about a rule, not fifty decisions about questions.
 */
@Component({
  selector: 'app-flagged-panel',
  templateUrl: './flagged-panel.component.html',
  styleUrls: ['./flagged-panel.component.scss'],
})
export class FlaggedPanelComponent implements OnInit {
  groups: { flag: string; questions: Question[] }[] = [];
  total = 0;
  loading = true;
  error = '';
  open = '';

  constructor(
    private readonly http: HttpClient,
    readonly questions: QuestionsService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    if (environment.useLocalSample) {
      this.loading = false;
      return;
    }
    this.loading = true;
    this.http
      .get<{ questions: Question[] }>(
        `${environment.apiBase}/admin/questions?status=draft&limit=500`,
      )
      .subscribe({
        next: (r) => {
          this.rebuild(r.questions ?? []);
          this.loading = false;
        },
        error: () => {
          this.error = 'Could not load flagged questions.';
          this.loading = false;
        },
      });
  }

  private rebuild(drafts: Question[]): void {
    this.total = drafts.length;
    const byFlag = new Map<string, Question[]>();
    for (const q of drafts) {
      // A draft with no flag is simply unreviewed inventory, not something
      // somebody was asked to look at.
      const flags = q.reviewFlags?.length ? q.reviewFlags : ['no reason recorded'];
      for (const f of flags) {
        if (!byFlag.has(f)) byFlag.set(f, []);
        byFlag.get(f)!.push(q);
      }
    }
    this.groups = [...byFlag.entries()]
      .map(([flag, questions]) => ({ flag, questions }))
      .sort((a, b) => b.questions.length - a.questions.length);
    this.open = this.groups[0]?.flag ?? '';
  }

  toggle(flag: string): void {
    this.open = this.open === flag ? '' : flag;
  }

  approve(q: Question): void {
    this.questions.approve(q);
  }

  reject(q: Question, reason: string): void {
    this.questions.reject(q, reason || 'held on review and not worth keeping');
  }

  statusOf(q: Question): string {
    return this.questions.statusOf(q);
  }
}
