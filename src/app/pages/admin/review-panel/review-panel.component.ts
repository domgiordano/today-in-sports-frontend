import { Component, HostListener, OnInit } from '@angular/core';

import { QuestionsService } from '../../../services/questions.service';
import {
  Question,
  REASON_LABEL,
  TIER_LABEL,
} from '../../../models/question.model';

/**
 * One question at a time, with its source beside the answer.
 *
 * This is the only recurring manual cost in the whole product — roughly ten
 * minutes twice a week, forever — so it is keyboard-first and shows everything
 * needed to make a call without leaving the screen. Showing the source link
 * inline is what turns review into a five-second verification rather than a
 * research task.
 *
 * If a session ever runs slower than about one question per 30 seconds, fix
 * this screen before generating more inventory.
 */
@Component({
  selector: 'app-review-panel',
  templateUrl: './review-panel.component.html',
  styleUrls: ['./review-panel.component.scss'],
})
export class ReviewPanelComponent implements OnInit {
  queue: Question[] = [];
  index = 0;
  revealed = false;
  rejecting = false;
  rejectReason = '';

  readonly tierLabel = TIER_LABEL;
  readonly reasonLabel = REASON_LABEL;

  readonly rejectReasons = [
    'Factually wrong',
    'Ambiguous wording',
    'Too easy',
    'Too obscure',
    'Duplicate of another question',
    'Reads awkwardly',
  ];

  constructor(readonly questions: QuestionsService) {}

  ngOnInit(): void {
    this.refresh();
  }

  private refresh(): void {
    this.queue = this.questions.pending();
    if (this.index >= this.queue.length) {
      this.index = Math.max(0, this.queue.length - 1);
    }
  }

  get current(): Question | undefined {
    return this.queue[this.index];
  }

  get counts() {
    return this.questions.counts();
  }

  get progress(): string {
    const total = this.questions.snapshot().length;
    const done = total - this.counts.pending;
    return `${done} / ${total}`;
  }

  /** Options in a stable order, so the answer is not always first. */
  options(q: Question): string[] {
    if (q.type !== 'mc' || !q.distractors) return [];
    const all = [String(q.answer), ...q.distractors];
    return all.sort((a, b) => this.hash(q.questionId + a) - this.hash(q.questionId + b));
  }

  private hash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return h;
  }

  isAnswer(q: Question, option: string): boolean {
    return this.revealed && option === String(q.answer);
  }

  approve(): void {
    const q = this.current;
    if (!q) return;
    this.questions.approve(q);
    this.advance();
  }

  beginReject(): void {
    if (this.current) this.rejecting = true;
  }

  confirmReject(reason: string): void {
    const q = this.current;
    if (!q) return;
    this.questions.reject(q, reason);
    this.rejecting = false;
    this.rejectReason = '';
    this.advance();
  }

  cancelReject(): void {
    this.rejecting = false;
    this.rejectReason = '';
  }

  private advance(): void {
    this.revealed = false;
    this.refresh();
  }

  next(): void {
    if (this.index < this.queue.length - 1) {
      this.index++;
      this.revealed = false;
    }
  }

  prev(): void {
    if (this.index > 0) {
      this.index--;
      this.revealed = false;
    }
  }

  toggleReveal(): void {
    this.revealed = !this.revealed;
  }

  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    // Never steal keys while a reason is being typed.
    const tag = (event.target as HTMLElement)?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') {
      if (event.key === 'Escape') this.cancelReject();
      return;
    }

    switch (event.key) {
      case 'a': this.approve(); break;
      case 'r': this.beginReject(); break;
      case 'j': this.next(); break;
      case 'k': this.prev(); break;
      case ' ': event.preventDefault(); this.toggleReveal(); break;
      case 'Escape': this.cancelReject(); break;
      default: return;
    }
  }
}
