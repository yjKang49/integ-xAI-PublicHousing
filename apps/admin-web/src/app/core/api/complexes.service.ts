import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Complex {
  _id: string; _rev?: string;
  name: string; address: string;
  totalUnits: number; totalBuildings: number;
  builtYear: number; managedBy: string;
  latitude?: number; longitude?: number;
  tags: string[]; qrCode: string;
  createdAt: string; updatedAt: string;
}

export interface CreateComplexDto {
  name: string; address: string;
  totalUnits: number; totalBuildings: number;
  builtYear: number; managedBy: string;
  latitude?: number; longitude?: number;
  tags?: string[];
}

@Injectable({ providedIn: 'root' })
export class ComplexesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/complexes`;

  list(): Observable<Complex[]> {
    return this.http.get<any>(this.base).pipe(map((r) => r.data ?? r));
  }

  get(id: string): Observable<Complex> {
    return this.http.get<any>(`${this.base}/${encodeURIComponent(id)}`).pipe(
      map((r) => r.data ?? r),
    );
  }

  create(dto: CreateComplexDto): Observable<Complex> {
    return this.http.post<any>(this.base, dto).pipe(map((r) => r.data ?? r));
  }

  update(id: string, dto: Partial<CreateComplexDto>): Observable<Complex> {
    return this.http.patch<any>(`${this.base}/${encodeURIComponent(id)}`, dto).pipe(
      map((r) => r.data ?? r),
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${encodeURIComponent(id)}`);
  }
}
