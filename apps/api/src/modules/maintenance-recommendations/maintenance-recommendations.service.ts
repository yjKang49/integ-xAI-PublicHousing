// apps/api/src/modules/maintenance-recommendations/maintenance-recommendations.service.ts
// Phase 2-9: 장기수선 권장 서비스

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { CouchService } from '../../database/couch.service';
import {
  MaintenanceRecommendation, RiskScore, RiskLevel, MaintenanceType,
  RecommendationStatus, RiskTargetType,
  riskLevelToMaintenanceType, calcSuggestedTimeline, riskLevelToPriority,
  COST_BAND_BY_TYPE,
} from '@ax/shared';
import {
  MaintenanceRecommendationQueryDto,
  UpdateRecommendationStatusDto,
} from './dto/maintenance-recommendation.dto';

@Injectable()
export class MaintenanceRecommendationsService {
  private readonly logger = new Logger(MaintenanceRecommendationsService.name);

  constructor(private readonly couch: CouchService) {}

  // ── 위험도 스코어 기반 권장 생성 ────────────────────────────────────────

  async generateFromRiskScore(
    orgId: string, riskScoreId: string, triggeredBy: string,
  ): Promise<MaintenanceRecommendation> {
    const riskScore = await this.couch.findById<RiskScore>(orgId, riskScoreId);
    if (!riskScore) throw new NotFoundException(`RiskScore ${riskScoreId} not found`);

    const now = new Date().toISOString();
    const id = `maintenanceRecommendation:${orgId}:rec_${Date.now()}_${uuid().slice(0, 8)}`;

    const maintenanceType = riskLevelToMaintenanceType(riskScore.level);
    const timeline = calcSuggestedTimeline(riskScore.level);
    const priority = riskLevelToPriority(riskScore.level);
    const costBase = COST_BAND_BY_TYPE[maintenanceType];

    const reasoning = this.buildReasoning(riskScore);

    const doc: MaintenanceRecommendation = {
      _id: id,
      docType: 'maintenanceRecommendation',
      orgId,
      complexId: riskScore.complexId,
      riskScoreId,
      targetType: riskScore.targetType,
      targetId: riskScore.targetId,
      targetName: riskScore.targetName,
      riskScore: riskScore.score,
      riskLevel: riskScore.level,
      maintenanceType,
      priority,
      suggestedTimeline: timeline,
      estimatedCostBand: { ...costBase, currency: 'KRW' },
      evidenceSummary: riskScore.evidence.evidenceSummary,
      reasoning,
      status: RecommendationStatus.PENDING,
      createdAt: now, updatedAt: now,
      createdBy: triggeredBy, updatedBy: triggeredBy,
    };

    return this.couch.create<MaintenanceRecommendation>(orgId, doc);
  }

  // ── 목록 조회 ────────────────────────────────────────────────────────────

  async findAll(orgId: string, query: MaintenanceRecommendationQueryDto) {
    const selector: Record<string, any> = { docType: 'maintenanceRecommendation', orgId };
    if (query.complexId)      selector.complexId      = query.complexId;
    if (query.targetId)       selector.targetId       = query.targetId;
    if (query.riskLevel)      selector.riskLevel      = query.riskLevel;
    if (query.maintenanceType)selector.maintenanceType= query.maintenanceType;
    if (query.status)         selector.status         = query.status;

    const page  = query.page  ? +query.page  : 1;
    const limit = Math.min(query.limit ? +query.limit : 50, 200);

    const { docs } = await this.couch.find<MaintenanceRecommendation>(orgId, selector, {
      limit: limit + 1, skip: (page - 1) * limit,
      sort: [{ createdAt: 'desc' }],
    });

    const hasNext = docs.length > limit;
    return { data: hasNext ? docs.slice(0, limit) : docs, meta: { page, limit, hasNext } };
  }

  async findById(orgId: string, id: string): Promise<MaintenanceRecommendation> {
    const doc = await this.couch.findById<MaintenanceRecommendation>(orgId, id);
    if (!doc || doc._deleted) throw new NotFoundException(`권장 문서 ${id}를 찾을 수 없습니다.`);
    return doc;
  }

  // ── 상태 업데이트 ─────────────────────────────────────────────────────────

  async updateStatus(
    orgId: string, id: string,
    dto: UpdateRecommendationStatusDto, updatedBy: string,
  ): Promise<MaintenanceRecommendation> {
    const doc = await this.findById(orgId, id);
    const updated = {
      ...doc,
      status: dto.status,
      reviewNote: dto.reviewNote,
      reviewedBy: updatedBy,
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy,
    };
    return this.couch.update<MaintenanceRecommendation>(orgId, updated);
  }

  // ── 워커 내부 호출: RiskScore 계산 완료 후 자동 생성 ─────────────────────

  async createFromWorker(orgId: string, riskScoreId: string): Promise<MaintenanceRecommendation> {
    return this.generateFromRiskScore(orgId, riskScoreId, 'system:worker');
  }

  // ── 내부 헬퍼 ────────────────────────────────────────────────────────────

  private buildReasoning(rs: RiskScore): string[] {
    const lines: string[] = [];
    const e = rs.evidence;
    const s = rs.subScores;

    lines.push(`종합 위험도 ${rs.score}점 (${rs.level}) — 신뢰도 ${Math.round(rs.confidence * 100)}%`);

    if (e.unrepairedDefects > 0)
      lines.push(`미수리 결함 ${e.unrepairedDefects}건 (긴급 ${e.criticalDefects}건) — 결함 서브스코어 ${Math.round(s.defect.score)}점`);

    if (e.crackThresholdExceedances > 0)
      lines.push(`균열 임계치 초과 ${e.crackThresholdExceedances}건${e.maxCrackWidthMm != null ? `, 최대 폭 ${e.maxCrackWidthMm.toFixed(1)}mm` : ''} — 균열 서브스코어 ${Math.round(s.crack.score)}점`);

    if (e.sensorAnomalies > 0)
      lines.push(`센서 이상 ${e.sensorAnomalies}건 (위험 ${e.sensorCriticalCount}건) — 센서 서브스코어 ${Math.round(s.sensor.score)}점`);

    if (e.openComplaints > 0)
      lines.push(`미해결 민원 ${e.openComplaints}건 (긴급 ${e.urgentComplaints}건) — 민원 서브스코어 ${Math.round(s.complaint.score)}점`);

    if (e.assetAgeYears != null)
      lines.push(`설비 경과 ${e.assetAgeYears}년${e.remainingLifeRatio != null ? `, 잔여수명 ${Math.round(e.remainingLifeRatio * 100)}%` : ''} — 노후도 서브스코어 ${Math.round(s.age.score)}점`);

    if (lines.length === 1)
      lines.push('근거 데이터 부족 — 추가 점검 후 재계산 권장');

    return lines;
  }
}
