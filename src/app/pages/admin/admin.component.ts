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

  /**
   * Grouped by what the tab is for, in the order a day tends to run.
   *
   * The previous order was the order the panels were built, which put Errors
   * eleventh and Review first only by accident. Daily work comes first because
   * it is what the portal is opened for; the content the questions come from
   * next; people after that; and the two health panels last, where you look
   * when something is wrong rather than as a matter of course.
   */
  readonly tabs = [
    // What needs doing today.
    { path: 'review', label: 'Review' },
    { path: 'flagged', label: 'Flagged' },
    { path: 'schedule', label: 'Schedule' },
    // Where the questions come from.
    { path: 'bank', label: 'Bank' },
    { path: 'events', label: 'Events' },
    { path: 'narrative', label: 'Narrative' },
    { path: 'rejected', label: 'Rejected' },
    // Who is playing, and what they are told.
    { path: 'users', label: 'Users' },
    { path: 'announcements', label: 'Announcements' },
    // Checked when something looks wrong.
    { path: 'analytics', label: 'Analytics' },
    { path: 'errors', label: 'Errors' },
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
