// apps/admin-web/src/app/features/viewer/data-access/markers.api.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { DefectMarker3D } from '@ax/shared';
import { CreateMarkerInput, UpdateMarkerInput } from '@ax/shared';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MarkersApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/markers`;

  /** Load all visible markers for a building (primary viewer call) */
  getByBuilding(
    buildingId: string,
    opts: { sessionId?: string; severity?: string } = {},
  ): Observable<DefectMarker3D[]> {
    let params = new HttpParams();
    if (opts.sessionId) params = params.set('sessionId', opts.sessionId);
    if (opts.severity) params = params.set('severity', opts.severity);

    return this.http
      .get<any>(`${this.base}/building/${encodeURIComponent(buildingId)}`, { params })
      .pipe(map((r) => r.data ?? r));
  }

  /** Load markers associated with a specific defect */
  getByDefect(defectId: string): Observable<DefectMarker3D[]> {
    return this.http
      .get<any>(`${this.base}/defect/${encodeURIComponent(defectId)}`)
      .pipe(map((r) => r.data ?? r));
  }

  get(markerId: string): Observable<DefectMarker3D> {
    return this.http
      .get<any>(`${this.base}/${encodeURIComponent(markerId)}`)
      .pipe(map((r) => r.data ?? r));
  }

  create(dto: CreateMarkerInput): Observable<DefectMarker3D> {
    return this.http
      .post<any>(this.base, dto)
      .pipe(map((r) => r.data ?? r));
  }

  update(id: string, dto: UpdateMarkerInput): Observable<DefectMarker3D> {
    return this.http
      .patch<any>(`${this.base}/${encodeURIComponent(id)}`, dto)
      .pipe(map((r) => r.data ?? r));
  }

  hide(id: string): Observable<DefectMarker3D> {
    return this.http
      .delete<any>(`${this.base}/${encodeURIComponent(id)}`)
      .pipe(map((r) => r.data ?? r));
  }
}
