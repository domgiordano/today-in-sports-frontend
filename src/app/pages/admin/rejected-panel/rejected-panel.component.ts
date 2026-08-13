import { Component, OnInit } from '@angular/core';

import { QuestionsService } from '../../../services/questions.service';
import { Question, REASON_LABEL } from '../../../models/question.model';

/**
 * Rejected questions, grouped by why.
 *
 * Rejections are kept rather than deleted because the reason is the only signal
 * for fixing the thing that produced a bad question. A cluster of "factually
 * wrong" against one detector is a detector bug; a cluster of "reads awkwardly"
 * against one template is a wording problem. Those are the two most valuable
 * pieces of feedback the whole pipeline generates.
 */
@Component({
  selector: 'app-rejected-panel',
  templateUrl: './rejected-panel.component.html',
  styleUrls: ['./rejected-panel.component.scss'],
})
export class RejectedPanelComponent implements OnInit {
  groups: { reason: string; questions: Question[] }[] = [];
  byDetector: { detector: string; count: number }[] = [];
  total = 0;

  readonly reasonLabel = REASON_LABEL;

  constructor(private readonly questions: QuestionsService) {}

  ngOnInit(): void {
    this.questions.all().subscribe(() => this.rebuild());
    this.rebuild();
  }

  private rebuild(): void {
    const rejected = this.questions
      .snapshot()
      .filter((q) => this.questions.statusOf(q) === 'rejected');

    this.total = rejected.length;

    const byReason = new Map<string, Question[]>();
    const byDetector = new Map<string, number>();
    for (const q of rejected) {
      const reason = this.questions.reasonOf(q) || q.rejectionReason || 'no reason given';
      if (!byReason.has(reason)) byReason.set(reason, []);
      byReason.get(reason)!.push(q);
      byDetector.set(q.sourceReason, (byDetector.get(q.sourceReason) ?? 0) + 1);
    }

    this.groups = [...byReason.entries()]
      .map(([reason, questions]) => ({ reason, questions }))
      .sort((a, b) => b.questions.length - a.questions.length);

    this.byDetector = [...byDetector.entries()]
      .map(([detector, count]) => ({ detector, count }))
      .sort((a, b) => b.count - a.count);
  }
}
