import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AdminComponent } from './admin.component';
import { BankPanelComponent } from './bank-panel/bank-panel.component';
import { ReviewPanelComponent } from './review-panel/review-panel.component';
import { SchedulePanelComponent } from './schedule-panel/schedule-panel.component';

const routes: Routes = [
  {
    path: '',
    component: AdminComponent,
    children: [
      { path: '', redirectTo: 'review', pathMatch: 'full' },
      { path: 'review', component: ReviewPanelComponent },
      { path: 'bank', component: BankPanelComponent },
      { path: 'schedule', component: SchedulePanelComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}
