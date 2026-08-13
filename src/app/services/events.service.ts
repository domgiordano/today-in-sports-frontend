import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, of } from 'rxjs';

import { SportEvent } from '../models/event.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EventsService {
  constructor(private readonly http: HttpClient) {}

  private get preview(): boolean {
    return environment.useLocalSample;
  }

  /**
   * Events are partitioned by calendar date, so a date is required rather than
   * optional — there is no "all events" query, by design.
   */
  forDate(mmdd: string, sport?: string): Observable<SportEvent[]> {
    if (this.preview) return of([]);
    const params = new URLSearchParams({ mmdd });
    if (sport) params.set('sport', sport);
    return this.http
      .get<{ events: SportEvent[] }>(
        `${environment.apiBase}/admin/events?${params.toString()}`,
      )
      .pipe(map((r) => r.events ?? []));
  }
}
