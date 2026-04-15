import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Defect, DefectMedia, DefectMarker3D } from '@ax/shared';
import { environment } from '../../../environments/environment';

export interface DefectListQuery {
  complexId?: string;
  buildingId?: string;
  sessionId?: string;
  defectType?: string;
  severity?: string;
  isRepaired?: boolean;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class DefectsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/defects`;
  private readonly mediaBase = `${environment.apiUrl}/media`;
  private readonly markerBase = `${environment.apiUrl}/markers`;

  list(query: DefectListQuery = {}): Observable<{ data: Defect[]; meta: any }> {
    let params = new HttpParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<any>(this.base, { params }).pipe(map((r) => r.data ? r : { data: r, meta: {} }));
  }

  get(id: string): Observable<Defect> {
    return this.http.get<any>(`${this.base}/${encodeURIComponent(id)}`).pipe(
      map((r) => r.data ?? r),
    );
  }

  update(id: string, dto: Partial<Defect>): Observable<Defect> {
    return this.http.patch<any>(`${this.base}/${encodeURIComponent(id)}`, dto).pipe(
      map((r) => r.data ?? r),
    );
  }

  markRepaired(id: string, repairNotes: string): Observable<Defect> {
    return this.update(id, { isRepaired: true, repairNotes, repairedAt: new Date().toISOString() });
  }

  // Media — get download URL by mediaId
  getMediaUrl(mediaId: string): Observable<{ url: string; expiresIn: number }> {
    return this.http.get<any>(`${this.mediaBase}/${encodeURIComponent(mediaId)}/url`).pipe(
      map((r) => r.data ?? r),
    );
  }

  // Media — get download URL by storageKey (internal use)
  getDownloadUrl(storageKey: string): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(`${this.mediaBase}/download-url`, {
      params: { storageKey },
    });
  }

  // Markers
  getMarkersByBuilding(buildingId: string, sessionId?: string): Observable<DefectMarker3D[]> {
    let params = new HttpParams();
    if (sessionId) params = params.set('sessionId', sessionId);
    return this.http.get<any>(`${this.markerBase}/building/${encodeURIComponent(buildingId)}`, { params }).pipe(
      map((r) => r.data ?? r),
    );
  }

  getMarkersByDefect(defectId: string): Observable<DefectMarker3D[]> {
    return this.http.get<any>(`${this.markerBase}/defect/${encodeURIComponent(defectId)}`).pipe(
      map((r) => r.data ?? r),
    );
  }
}
