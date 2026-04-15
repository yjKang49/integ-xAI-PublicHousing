// apps/admin-web/src/app/features/ai-detections/data-access/ai-detections.api.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

// ── 로컬 타입 ─────────────────────────────────────────────────────────────────

export type CandidateReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROMOTED';
export type CandidateDefectType =
  | 'CRACK' | 'LEAK' | 'DELAMINATION' | 'SPOILING'
  | 'CORROSION' | 'EFFLORESCENCE' | 'FIRE_RISK_CLADDING' | 'OTHER';
export type CandidateSourceType = 'DRONE_FRAME' | 'DRONE_IMAGE' | 'MOBILE_PHOTO' | 'MANUAL';

export interface DefectCandidate {
  _id: string;
  orgId: string;
  complexId: string;
  buildingId?: string;
  sourceType: CandidateSourceType;
  sourceMediaId: string;
  sourceMissionId?: string;
  sourceFrameId?: string;
  storageKey: string;
  defectType: CandidateDefectType;
  confidence: number;
  confidenceLevel: 'AUTO_ACCEPT' | 'REQUIRES_REVIEW' | 'MANUAL_REQUIRED';
  bbox: [number, number, number, number];
  suggestedSeverity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  aiCaption?: string;
  kcsStandardRef?: string;
  kcsExceedsLimit?: boolean;
  modelVersion: string;
  detectionMethod: string;
  reviewStatus: CandidateReviewStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  promotedDefectId?: string;
  detectionJobId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CandidateListParams {
  complexId?: string;
  buildingId?: string;
  sourceType?: CandidateSourceType;
  sourceMissionId?: string;
  defectType?: CandidateDefectType;
  reviewStatus?: CandidateReviewStatus;
  confidenceLevel?: 'AUTO_ACCEPT' | 'REQUIRES_REVIEW' | 'MANUAL_REQUIRED';
  page?: number;
  limit?: number;
}

export interface TriggerDetectionDto {
  complexId: string;
  buildingId?: string;
  sourceType: CandidateSourceType;
  sourceMediaId: string;
  sourceMissionId?: string;
  sourceFrameId?: string;
  storageKey: string;
  model?: 'MASK_RCNN' | 'Y_MASKNET' | 'MOCK';
  confidenceThreshold?: number;
  maxDetections?: number;
}

export interface ReviewCandidateDto {
  reviewStatus: 'APPROVED' | 'REJECTED';
  reviewNote?: string;
}

export interface PromoteCandidateDto {
  defectType?: string;
  severity?: string;
  description?: string;
  locationDescription?: string;
  sessionId?: string;
  projectId?: string;
}

export interface DetectionStats {
  pending: number;
  approved: number;
  rejected: number;
  promoted: number;
  total: number;
}

// ── API 서비스 ────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class AiDetectionsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}`;

  // ── 탐지 트리거 ───────────────────────────────────────────────────────────────

  trigger(dto: TriggerDetectionDto): Observable<{ jobId: string; status: string }> {
    return this.http.post<any>(`${this.base}/ai-detections/trigger`, dto);
  }

  triggerMission(
    missionId: string,
    options: { model?: string; confidenceThreshold?: number } = {},
  ): Observable<{ jobsCreated: number; jobIds: string[] }> {
    return this.http.post<any>(
      `${this.base}/ai-detections/missions/${encodeURIComponent(missionId)}/trigger`,
      options,
    );
  }

  // ── 결함 후보 CRUD ────────────────────────────────────────────────────────────

  listCandidates(params: CandidateListParams = {}): Observable<{
    data: DefectCandidate[];
    meta: { total: number; page: number; limit: number; hasNext: boolean };
  }> {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) qs.set(k, String(v));
    });
    const q = qs.toString();
    return this.http.get<any>(
      q ? `${this.base}/defect-candidates?${q}` : `${this.base}/defect-candidates`,
    );
  }

  getCandidateById(id: string): Observable<DefectCandidate> {
    return this.http.get<DefectCandidate>(
      `${this.base}/defect-candidates/${encodeURIComponent(id)}`,
    );
  }

  listMissionCandidates(
    missionId: string,
    params: { defectType?: string; reviewStatus?: string; page?: number; limit?: number } = {},
  ): Observable<{ data: DefectCandidate[]; meta: any }> {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) qs.set(k, String(v));
    });
    const q = qs.toString();
    return this.http.get<any>(
      `${this.base}/ai-detections/missions/${encodeURIComponent(missionId)}/candidates${q ? '?' + q : ''}`,
    );
  }

  // ── 검토 ─────────────────────────────────────────────────────────────────────

  review(id: string, dto: ReviewCandidateDto): Observable<DefectCandidate> {
    return this.http.patch<DefectCandidate>(
      `${this.base}/defect-candidates/${encodeURIComponent(id)}/review`,
      dto,
    );
  }

  // ── Defect 승격 ───────────────────────────────────────────────────────────────

  promote(
    id: string,
    dto: PromoteCandidateDto = {},
  ): Observable<{ candidate: DefectCandidate; defect: any }> {
    return this.http.post<any>(
      `${this.base}/defect-candidates/${encodeURIComponent(id)}/promote`,
      dto,
    );
  }

  // ── 통계 ─────────────────────────────────────────────────────────────────────

  getStats(complexId?: string): Observable<DetectionStats> {
    const q = complexId ? `?complexId=${encodeURIComponent(complexId)}` : '';
    return this.http.get<DetectionStats>(`${this.base}/ai-detections/stats${q}`);
  }
}
