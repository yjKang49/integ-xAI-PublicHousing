// apps/mobile-app/src/app/features/viewer/markers-api-mobile.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { DefectMarker3D } from '@ax/shared';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MarkersApiMobileService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/markers`;

  getByBuilding(
    buildingId: string,
    opts: { sessionId?: string } = {},
  ): Observable<DefectMarker3D[]> {
    let params = new HttpParams();
    if (opts.sessionId) params = params.set('sessionId', opts.sessionId);
    return this.http
      .get<any>(`${this.base}/building/${encodeURIComponent(buildingId)}`, { params })
      .pipe(map((r) => r.data ?? r));
  }
}
