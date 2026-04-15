// apps/admin-web/src/app/features/complexes/data-access/complexes.api.ts
/**
 * Unified data access for the facility hierarchy:
 * Complex → Building → Floor → Zone
 *
 * Wraps individual API services and adds the tree endpoint.
 * Components should prefer this over injecting multiple services.
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

// Re-export types from core/api services for convenience
export type { Complex, CreateComplexDto } from '../../../core/api/complexes.service';
export type { Building, CreateBuildingDto } from '../../../core/api/buildings.service';
export type { Floor, CreateFloorDto } from '../../../core/api/floors.service';
export type { Zone, CreateZoneDto } from '../../../core/api/zones.service';

import type { Complex } from '../../../core/api/complexes.service';
import type { Building } from '../../../core/api/buildings.service';
import type { Floor } from '../../../core/api/floors.service';
import type { Zone } from '../../../core/api/zones.service';

export interface FloorWithZones extends Omit<Floor, 'zones'> {
  zones: Zone[];
}

export interface BuildingWithFloors extends Building {
  floors: FloorWithZones[];
}

export interface ComplexTree extends Complex {
  buildings: BuildingWithFloors[];
}

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class ComplexesApi {
  private readonly http = inject(HttpClient);

  // ── Complex ──────────────────────────────────────────────────────────────────

  listComplexes(): Observable<Complex[]> {
    return this.http.get<any>(`${API}/complexes`).pipe(map((r) => r.data ?? r));
  }

  getComplex(id: string): Observable<Complex> {
    return this.http.get<any>(`${API}/complexes/${enc(id)}`).pipe(map((r) => r.data ?? r));
  }

  /** Returns full hierarchy: complex + buildings + floors + zones in one call */
  getComplexTree(complexId: string): Observable<ComplexTree> {
    return this.http
      .get<any>(`${API}/complexes/${enc(complexId)}/tree`)
      .pipe(map((r) => r.data ?? r));
  }

  createComplex(dto: any): Observable<Complex> {
    return this.http.post<any>(`${API}/complexes`, dto).pipe(map((r) => r.data ?? r));
  }

  updateComplex(id: string, dto: any): Observable<Complex> {
    return this.http.patch<any>(`${API}/complexes/${enc(id)}`, dto).pipe(map((r) => r.data ?? r));
  }

  deleteComplex(id: string): Observable<void> {
    return this.http.delete<void>(`${API}/complexes/${enc(id)}`);
  }

  // ── Building ─────────────────────────────────────────────────────────────────

  listBuildings(complexId: string): Observable<Building[]> {
    return this.http
      .get<any>(`${API}/buildings?complexId=${enc(complexId)}`)
      .pipe(map((r) => r.data ?? r));
  }

  createBuilding(dto: any): Observable<Building> {
    return this.http.post<any>(`${API}/buildings`, dto).pipe(map((r) => r.data ?? r));
  }

  updateBuilding(id: string, dto: any): Observable<Building> {
    return this.http.patch<any>(`${API}/buildings/${enc(id)}`, dto).pipe(map((r) => r.data ?? r));
  }

  deleteBuilding(id: string): Observable<void> {
    return this.http.delete<void>(`${API}/buildings/${enc(id)}`);
  }

  // ── Floor ────────────────────────────────────────────────────────────────────

  listFloors(buildingId: string): Observable<Floor[]> {
    return this.http
      .get<any>(`${API}/floors?buildingId=${enc(buildingId)}`)
      .pipe(map((r) => r.data ?? r));
  }

  createFloor(dto: any): Observable<Floor> {
    return this.http.post<any>(`${API}/floors`, dto).pipe(map((r) => r.data ?? r));
  }

  updateFloor(id: string, dto: any): Observable<Floor> {
    return this.http.patch<any>(`${API}/floors/${enc(id)}`, dto).pipe(map((r) => r.data ?? r));
  }

  deleteFloor(id: string): Observable<void> {
    return this.http.delete<void>(`${API}/floors/${enc(id)}`);
  }

  // ── Zone ─────────────────────────────────────────────────────────────────────

  listZonesByFloor(floorId: string): Observable<Zone[]> {
    return this.http
      .get<any>(`${API}/zones?floorId=${enc(floorId)}`)
      .pipe(map((r) => r.data ?? r));
  }

  listZonesByBuilding(buildingId: string): Observable<Zone[]> {
    return this.http
      .get<any>(`${API}/zones?buildingId=${enc(buildingId)}`)
      .pipe(map((r) => r.data ?? r));
  }

  createZone(dto: any): Observable<Zone> {
    return this.http.post<any>(`${API}/zones`, dto).pipe(map((r) => r.data ?? r));
  }

  updateZone(id: string, dto: any): Observable<Zone> {
    return this.http.patch<any>(`${API}/zones/${enc(id)}`, dto).pipe(map((r) => r.data ?? r));
  }

  deleteZone(id: string): Observable<void> {
    return this.http.delete<void>(`${API}/zones/${enc(id)}`);
  }
}

function enc(id: string): string {
  return encodeURIComponent(id);
}
