import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Zone {
  _id: string; _rev?: string;
  floorId: string; buildingId: string; complexId: string; orgId: string;
  name: string; code: string; description?: string; qrCode: string;
  createdAt: string; updatedAt: string;
}

export interface CreateZoneDto {
  floorId: string; buildingId: string; complexId: string;
  name: string; code: string; description?: string;
}

@Injectable({ providedIn: 'root' })
export class ZonesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/zones`;

  listByFloor(floorId: string): Observable<Zone[]> {
    return this.http.get<any>(`${this.base}?floorId=${encodeURIComponent(floorId)}`).pipe(
      map((r) => r.data ?? r),
    );
  }

  create(dto: CreateZoneDto): Observable<Zone> {
    return this.http.post<any>(this.base, dto).pipe(map((r) => r.data ?? r));
  }

  update(id: string, dto: Partial<CreateZoneDto>): Observable<Zone> {
    return this.http.patch<any>(`${this.base}/${encodeURIComponent(id)}`, dto).pipe(
      map((r) => r.data ?? r),
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${encodeURIComponent(id)}`);
  }
}
