import { Component, OnInit } from '@angular/core';

import { QuestionsService } from '../../services/questions.service';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
})
export class AdminComponent implements OnInit {
  loading = true;
  error = '';

  readonly tabs = [
    { path: 'review', label: 'Review' },
    { path: 'bank', label: 'Bank' },
  ];

  constructor(readonly questions: QuestionsService) {}

  ngOnInit(): void {
    this.questions.load().subscribe({
      next: () => (this.loading = false),
      error: (err) => {
        this.error = 'Could not load the question bank.';
        this.loading = false;
        console.error(err);
      },
    });
  }
}
