import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { AppToolbarComponent } from './app-toolbar.component';
import { AnnouncementBannerComponent } from './announcement-banner.component';
import { MapPickerComponent } from './map-picker.component';
import { OnboardingComponent } from './onboarding.component';
import { SportBallComponent } from '../pages/landing/sport-ball.component';

/**
 * The pieces every surface shares.
 *
 * The toolbar lives here rather than in AppModule so that lazily-loaded
 * feature modules can render it too. Admin previously could not, which is why
 * it drew its own navigation and read as a different site.
 */
@NgModule({
  declarations: [
    AppToolbarComponent,
    SportBallComponent,
    MapPickerComponent,
    AnnouncementBannerComponent,
    OnboardingComponent,
  ],
  imports: [CommonModule, FormsModule, RouterModule],
  exports: [
    AppToolbarComponent,
    SportBallComponent,
    MapPickerComponent,
    AnnouncementBannerComponent,
    OnboardingComponent,
  ],
})
export class SharedModule {}
