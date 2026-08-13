import { Component, OnInit } from '@angular/core';

import { QuestionsService } from '../../../services/questions.service';

interface DateCell {
  mmdd: string;
  count: number;
  level: number;
}

/**
 * Coverage across the calendar year.
 *
 * The number that matters is not how many questions exist but how evenly they
 * land: a date-anchored quiz needs roughly 15-20 per calendar date, and MLB
 * alone leaves November through February empty.
 */
@Component({
  selector: 'app-bank-panel',
  templateUrl: './bank-panel.component.html',
  styleUrls: ['./bank-panel.component.scss'],
})
export class BankPanelComponent implements OnInit {
  months: { name: string; cells: DateCell[] }[] = [];
  covered = 0;
  empty = 0;
  thin = 0;

  readonly TARGET = 15;

  private readonly monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  private readonly monthDays = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  constructor(private readonly questions: QuestionsService) {}

  ngOnInit(): void {
    const coverage = this.questions.coverageByDate();

    this.months = this.monthNames.map((name, mi) => {
      const cells: DateCell[] = [];
      for (let d = 1; d <= this.monthDays[mi]; d++) {
        const mmdd = `${String(mi + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const count = coverage.get(mmdd) ?? 0;
        cells.push({ mmdd, count, level: this.level(count) });
      }
      return { name, cells };
    });

    const all = this.months.flatMap((m) => m.cells);
    this.covered = all.filter((c) => c.count > 0).length;
    this.empty = all.filter((c) => c.count === 0).length;
    this.thin = all.filter((c) => c.count > 0 && c.count < this.TARGET).length;
  }

  private level(count: number): number {
    if (count === 0) return 0;
    if (count < 3) return 1;
    if (count < 8) return 2;
    if (count < this.TARGET) return 3;
    return 4;
  }
}
