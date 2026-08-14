import { Component, OnInit } from '@angular/core';

import {
  NarrativeCandidate,
  NarrativeDraft,
  NarrativeService,
} from '../../../services/narrative.service';

/**
 * Write a question from a cited sentence.
 *
 * The one panel in this portal where a question is authored rather than
 * approved. That is deliberate and narrow: narrative events — somebody named
 * as a starter, a manager sacked, a record broken off the field — exist in no
 * dataset, so the only way to ask about them is for a person to read what a
 * newspaper wrote and put a question to it.
 *
 * The layout is the safety property. The sentence sits beside the form and
 * stays on screen while the question is typed, because the rule for this
 * source is that a question may not state anything its sentence does not, and
 * a rule nobody can see while working is a rule that gets broken.
 *
 * Discarding is a first-class action rather than an afterthought. Most
 * articles are not worth a question, and a queue that keeps re-offering them
 * is a queue nobody finishes.
 */
@Component({
  selector: 'app-narrative-panel',
  templateUrl: './narrative-panel.component.html',
  styleUrls: ['./narrative-panel.component.scss'],
})
export class NarrativePanelComponent implements OnInit {
  candidates: NarrativeCandidate[] = [];
  index = 0;
  loading = true;
  error = '';
  saving = false;
  written = 0;
  discarded = 0;

  type: NarrativeDraft['type'] = 'mc';
  prompt = '';
  answer = '';
  distractors = ['', '', ''];
  clues = ['', '', ''];
  tolerance: number | null = null;

  constructor(private readonly narrative: NarrativeService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.narrative.list('needs_review').subscribe({
      next: (rows) => {
        // A candidate with no sentence or no link cannot produce a verifiable
        // question. The API flags them rather than hiding them, and they are
        // filtered here so the queue is only work that can be done.
        this.candidates = rows.filter((r) => r.usable);
        this.loading = false;
      },
      error: () => {
        this.error = 'Could not load narrative candidates.';
        this.loading = false;
      },
    });
  }

  get current(): NarrativeCandidate | null {
    return this.candidates[this.index] ?? null;
  }

  get remaining(): number {
    return Math.max(this.candidates.length - this.index, 0);
  }

  /**
   * The check that catches the most common hand-written mistake.
   *
   * An answer sitting inside its own prompt is invisible while typing and
   * fatal once shipped. The server rejects it too — this only surfaces it
   * before the round trip.
   */
  get answerInPrompt(): boolean {
    const a = String(this.answer ?? '').trim().toLowerCase();
    return !!a && this.prompt.toLowerCase().includes(a);
  }

  get canSave(): boolean {
    if (this.saving || !this.current) return false;
    if (this.prompt.trim().length < 15) return false;
    if (!String(this.answer ?? '').trim()) return false;
    if (this.answerInPrompt) return false;
    if (this.type === 'mc') {
      return this.distractors.filter((d) => d.trim()).length >= 3;
    }
    if (this.type === 'clue') {
      return this.clues.filter((c) => c.trim()).length >= 3;
    }
    return true;
  }

  save(): void {
    const candidate = this.current;
    if (!candidate || !this.canSave) return;

    const fields: NarrativeDraft = {
      type: this.type,
      prompt: this.prompt.trim(),
      answer:
        this.type === 'numeric' ? Number(this.answer) : String(this.answer).trim(),
    };
    if (this.type === 'mc') {
      fields.distractors = this.distractors.map((d) => d.trim()).filter(Boolean);
    }
    if (this.type === 'clue') {
      fields.clues = this.clues.map((c) => c.trim()).filter(Boolean);
    }
    if (this.type === 'numeric' && this.tolerance !== null) {
      fields.tolerance = this.tolerance;
    }

    this.saving = true;
    this.error = '';
    this.narrative.write(candidate, fields).subscribe({
      next: () => {
        this.written += 1;
        this.saving = false;
        this.advance();
      },
      error: (err) => {
        // The server's own validation message, verbatim. Rewording it here
        // would mean maintaining the same rules in two places and drifting.
        this.error = err?.error?.message ?? 'Could not save that question.';
        this.saving = false;
      },
    });
  }

  discard(): void {
    const candidate = this.current;
    if (!candidate || this.saving) return;
    this.saving = true;
    this.narrative.discard(candidate).subscribe({
      next: () => {
        this.discarded += 1;
        this.saving = false;
        this.advance();
      },
      error: () => {
        this.error = 'Could not discard that candidate.';
        this.saving = false;
      },
    });
  }

  skip(): void {
    // Skipping leaves the candidate in the queue. It is the honest action for
    // "not now" — discarding would be a decision this person has not made.
    this.advance();
  }

  private advance(): void {
    this.index += 1;
    this.reset();
  }

  reset(): void {
    this.prompt = '';
    this.answer = '';
    this.distractors = ['', '', ''];
    this.clues = ['', '', ''];
    this.tolerance = null;
    this.error = '';
  }

  addDistractor(): void {
    this.distractors.push('');
  }

  addClue(): void {
    this.clues.push('');
  }

  trackByIndex(index: number): number {
    return index;
  }
}
