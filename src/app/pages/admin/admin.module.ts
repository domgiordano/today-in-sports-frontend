import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { SharedModule } from '../../shared/shared.module';

import { AdminComponent } from './admin.component';
import { AdminRoutingModule } from './admin-routing.module';
import { BankPanelComponent } from './bank-panel/bank-panel.component';
import { SchedulePanelComponent } from './schedule-panel/schedule-panel.component';
import { ErrorsPanelComponent } from './errors-panel/errors-panel.component';
import { EventsPanelComponent } from './events-panel/events-panel.component';
import { RejectedPanelComponent } from './rejected-panel/rejected-panel.component';
import { ReviewPanelComponent } from './review-panel/review-panel.component';

@NgModule({
  declarations: [
    AdminComponent,
    ReviewPanelComponent,
    BankPanelComponent,
    SchedulePanelComponent,
    EventsPanelComponent,
    ErrorsPanelComponent,
    RejectedPanelComponent,
  ],
  imports: [CommonModule, FormsModule, AdminRoutingModule, SharedModule],
})
export class AdminModule {}
