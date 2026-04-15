// apps/admin-web/src/app/features/drone/data-access/drone.api.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface CreateDroneMissionDto {
  complexId: string;
  buildingId?: string;
  sessionId?: string;
  title: string;
  description?: string;
  pilot: string;
  flightDate: string;
  droneModel?: string;
  weatherCondition?: string;
}

export interface InitDroneMediaUploadDto {
  fileName: string;
  mimeType: string;
  fileSize: number;
  mediaType: 'VIDEO' | 'IMAGE';
  capturedAt?: string;
}

export interface CompleteDroneMediaUploadDto {
  capturedAt?: string;
  gpsLat?: number;
  gpsLng?: number;
  gpsAlt?: number;
}

export interface DroneMissionListParams {
  complexId?: string;
  sessionId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class DroneApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/drone-missions`;

  // ── 미션 CRUD ──────────────────────────────────────────────────────────────

  list(params: DroneMissionListParams = {}): Observable<any> {
    const qs = new URLSearchParams();
    if (params.complexId) qs.set('complexId', params.complexId);
    if (params.sessionId) qs.set('sessionId', params.sessionId);
    if (params.status)    qs.set('status',    params.status);
    if (params.page)      qs.set('page',      String(params.page));
    if (params.limit)     qs.set('limit',     String(params.limit));
    const q = qs.toString();
    return this.http.get<any>(q ? `${this.base}?${q}` : this.base);
  }

  getById(missionId: string): Observable<any> {
    return this.http.get<any>(`${this.base}/${encodeURIComponent(missionId)}`);
  }

  create(dto: CreateDroneMissionDto): Observable<any> {
    return this.http.post<any>(this.base, dto);
  }

  update(missionId: string, dto: Partial<CreateDroneMissionDto>): Observable<any> {
    return this.http.patch<any>(`${this.base}/${encodeURIComponent(missionId)}`, dto);
  }

  // ── 미디어 업로드 ────────────────────────────────────────────────────────────

  initMediaUpload(missionId: string, dto: InitDroneMediaUploadDto): Observable<any> {
    return this.http.post<any>(
      `${this.base}/${encodeURIComponent(missionId)}/media/upload/init`,
      dto,
    );
  }

  completeMediaUpload(
    missionId: string,
    mediaItemId: string,
    dto: CompleteDroneMediaUploadDto = {},
  ): Observable<any> {
    return this.http.patch<any>(
      `${this.base}/${encodeURIComponent(missionId)}/media/${encodeURIComponent(mediaItemId)}/complete`,
      dto,
    );
  }

  removeMedia(missionId: string, mediaItemId: string): Observable<any> {
    return this.http.delete<any>(
      `${this.base}/${encodeURIComponent(missionId)}/media/${encodeURIComponent(mediaItemId)}`,
    );
  }

  /** S3 pre-signed URL에 파일 직접 PUT */
  uploadFileToS3(uploadUrl: string, file: File): Observable<any> {
    return this.http.put(uploadUrl, file, {
      headers: { 'Content-Type': file.type },
      reportProgress: true,
      observe: 'events',
    });
  }

  // ── AI 분석 / 프레임 ─────────────────────────────────────────────────────────

  startAnalysis(missionId: string): Observable<any> {
    return this.http.post<any>(
      `${this.base}/${encodeURIComponent(missionId)}/analyze`,
      {},
    );
  }

  listFrames(missionId: string, page = 1, limit = 50): Observable<any> {
    return this.http.get<any>(
      `${this.base}/${encodeURIComponent(missionId)}/frames?page=${page}&limit=${limit}`,
    );
  }

  // ── 분석 파이프라인 상태 ──────────────────────────────────────────────────────

  getPipelineStatus(missionId: string): Observable<any> {
    return this.http.get<any>(
      `${environment.apiUrl}/media-analysis/mission/${encodeURIComponent(missionId)}`,
    );
  }
}
