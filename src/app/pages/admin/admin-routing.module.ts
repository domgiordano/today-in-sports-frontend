import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AdminComponent } from './admin.component';
import { BankPanelComponent } from './bank-panel/bank-panel.component';
import { ReviewPanelComponent } from './review-panel/review-panel.component';
import { SchedulePanelComponent } from './schedule-panel/schedule-panel.component';
import { ErrorsPanelComponent } from './errors-panel/errors-panel.component';
import { UsersPanelComponent } from './users-panel/users-panel.component';
import { AnalyticsPanelComponent } from './analytics-panel/analytics-panel.component';
import { AnnouncementsPanelComponent } from './announcements-panel/announcements-panel.component';
import { EventsPanelComponent } from './events-panel/events-panel.component';
import { NarrativePanelComponent } from './narrative-panel/narrative-panel.component';
import { FlaggedPanelComponent } from './flagged-panel/flagged-panel.component';
import { RejectedPanelComponent } from './rejected-panel/rejected-panel.component';

const routes: Routes = [
  {
    path: '',
    component: AdminComponent,
    children: [
      { path: '', redirectTo: 'review', pathMatch: 'full' },
      { path: 'review', component: ReviewPanelComponent },
      { path: 'bank', component: BankPanelComponent },
      { path: 'schedule', component: SchedulePanelComponent },
      { path: 'events', component: EventsPanelComponent },
      { path: 'narrative', component: NarrativePanelComponent },
      { path: 'flagged', component: FlaggedPanelComponent },
      { path: 'rejected', component: RejectedPanelComponent },
      { path: 'errors', component: ErrorsPanelComponent },
      { path: 'users', component: UsersPanelComponent },
      { path: 'analytics', component: AnalyticsPanelComponent },
      { path: 'announcements', component: AnnouncementsPanelComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}
