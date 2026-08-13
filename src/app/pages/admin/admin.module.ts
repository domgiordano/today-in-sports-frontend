import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AdminComponent } from './admin.component';
import { AdminRoutingModule } from './admin-routing.module';
import { BankPanelComponent } from './bank-panel/bank-panel.component';
import { SchedulePanelComponent } from './schedule-panel/schedule-panel.component';
import { ReviewPanelComponent } from './review-panel/review-panel.component';

@NgModule({
  declarations: [
    AdminComponent,
    ReviewPanelComponent,
    BankPanelComponent,
    SchedulePanelComponent,
  ],
  imports: [CommonModule, FormsModule, AdminRoutingModule],
})
export class AdminModule {}
