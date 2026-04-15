import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Floor {
  _id: string; _rev?: string;
  buildingId: string; complexId: string; orgId: string;
  floorNumber: number; floorName: string; area: number;
  zones: string[]; createdAt: string; updatedAt: string;
}

export interface CreateFloorDto {
  buildingId: string; complexId: string;
  floorNumber: number; floorName: string; area: number;
}

@Injectable({ providedIn: 'root' })
export class FloorsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/floors`;

  listByBuilding(buildingId: string): Observable<Floor[]> {
    return this.http.get<any>(`${this.base}?buildingId=${encodeURIComponent(buildingId)}`).pipe(
      map((r) => r.data ?? r),
    );
  }

  create(dto: CreateFloorDto): Observable<Floor> {
    return this.http.post<any>(this.base, dto).pipe(map((r) => r.data ?? r));
  }

  update(id: string, dto: Partial<CreateFloorDto>): Observable<Floor> {
    return this.http.patch<any>(`${this.base}/${encodeURIComponent(id)}`, dto).pipe(
      map((r) => r.data ?? r),
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${encodeURIComponent(id)}`);
  }
}
