import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Building {
  _id: string; _rev?: string;
  complexId: string; orgId: string;
  name: string; code: string;
  totalFloors: number; undergroundFloors: number;
  totalUnits: number; builtDate: string;
  structureType: string; qrCode: string;
  createdAt: string; updatedAt: string;
}

export interface CreateBuildingDto {
  complexId: string;
  name: string; code: string;
  totalFloors: number; undergroundFloors: number;
  totalUnits: number; builtDate: string;
  structureType: string;
}

@Injectable({ providedIn: 'root' })
export class BuildingsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/buildings`;

  listByComplex(complexId: string): Observable<Building[]> {
    return this.http.get<any>(`${this.base}?complexId=${encodeURIComponent(complexId)}`).pipe(
      map((r) => r.data ?? r),
    );
  }

  create(dto: CreateBuildingDto): Observable<Building> {
    return this.http.post<any>(this.base, dto).pipe(map((r) => r.data ?? r));
  }

  update(id: string, dto: Partial<CreateBuildingDto>): Observable<Building> {
    return this.http.patch<any>(`${this.base}/${encodeURIComponent(id)}`, dto).pipe(
      map((r) => r.data ?? r),
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${encodeURIComponent(id)}`);
  }
}
