import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../environments/environment';

export interface Group {
  groupId: string;
  name: string;
  ownerId: string;
  memberCount: number;
  createdAt?: string;
  inviteCode?: string;
}

/**
 * Friend groups.
 *
 * There is no "browse groups" call and there never will be — you join one by
 * being given its code, which is what keeps a small private group private.
 */
@Injectable({ providedIn: 'root' })
export class GroupsService {
  groups: Group[] = [];
  maxMembers = 50;
  lastError = '';

  constructor(private readonly http: HttpClient) {}

  private base = `${environment.apiBase}/account`;

  load(): Observable<{ groups: Group[]; maxMembers: number }> {
    return this.http
      .get<{ groups: Group[]; maxMembers: number }>(`${this.base}/groups`)
      .pipe(
        tap((r) => {
          this.groups = r.groups ?? [];
          this.maxMembers = r.maxMembers ?? 50;
        }),
      );
  }

  private act(body: Record<string, unknown>): Observable<{ group?: Group }> {
    return this.http.post<{ group?: Group }>(`${this.base}/groups-action`, body);
  }

  create(name: string) {
    return this.act({ action: 'create', name });
  }

  join(inviteCode: string) {
    return this.act({ action: 'join', inviteCode: inviteCode.trim().toUpperCase() });
  }

  leave(groupId: string) {
    return this.act({ action: 'leave', groupId });
  }

  regenerateCode(groupId: string) {
    return this.act({ action: 'regenerate-code', groupId });
  }
}
