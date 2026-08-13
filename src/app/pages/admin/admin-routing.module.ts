import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AdminComponent } from './admin.component';
import { BankPanelComponent } from './bank-panel/bank-panel.component';
import { ReviewPanelComponent } from './review-panel/review-panel.component';
import { SchedulePanelComponent } from './schedule-panel/schedule-panel.component';
import { EventsPanelComponent } from './events-panel/events-panel.component';
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
      { path: 'rejected', component: RejectedPanelComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}
