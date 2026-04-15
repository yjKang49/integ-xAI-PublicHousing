// apps/api/src/modules/risk-scoring/risk-scoring.service.ts
// Phase 2-9: 위험도 스코어 계산 서비스 (동기 계산 + Bull 큐 트리거)

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { v4 as uuid } from 'uuid';
import { CouchService } from '../../database/couch.service';
import {
  RiskScore, RiskLevel, RiskTargetType,
  scoreToLevel, RISK_WEIGHTS,
  calcDefectScore, calcCrackScore, calcSensorScore,
  calcComplaintScore, calcAgeScore,
  JobType,
} from '@ax/shared';
import { TriggerRiskCalculationDto, RiskScoreQueryDto } from './dto/risk-scoring.dto';

@Injectable()
export class RiskScoringService {
  private readonly logger = new Logger(RiskScoringService.name);

  constructor(
    private readonly couch: CouchService,
    @InjectQueue('job-queue') private readonly queue: Queue,
  ) {}

  // ── 위험도 계산 트리거 (Bull 큐 방식) ─────────────────────────────
  async triggerCalculation(
    orgId: string, dto: TriggerRiskCalculationDto, triggeredBy: string,
  ) {
    const now = new Date().toISOString();
    const id = `riskScore:${orgId}:rsk_${Date.now()}_${uuid().slice(0, 8)}`;

    // 빈 RiskScore 문서 먼저 생성
    const placeholder: any = {
      _id: id, docType: 'riskScore', orgId,
      complexId: dto.complexId, targetType: dto.targetType,
      targetId: dto.targetId, targetName: dto.targetName,
      score: 0, level: RiskLevel.LOW, confidence: 0,
      calculatedAt: now, isLatest: false,
      subScores: {}, evidence: { evidenceSummary: '계산 중...' },
      createdAt: now, updatedAt: now, createdBy: triggeredBy, updatedBy: triggeredBy,
    };
    await this.couch.create(orgId, placeholder);

    // Bull 큐에 계산 작업 등록
    await this.queue.add(JobType.RISK_SCORE_CALCULATE, {
      jobType: JobType.RISK_SCORE_CALCULATE,
      riskScoreId: id, complexId: dto.complexId,
      targetType: dto.targetType, targetId: dto.targetId,
      targetName: dto.targetName,
      generateRecommendation: dto.generateRecommendation ?? true,
    });

    return { riskScoreId: id, status: 'QUEUED', message: '위험도 계산이 시작됐습니다.' };
  }

  // ── 즉시 계산 (동기, API에서 직접 호출) ──────────────────────────
  async calculateNow(
    orgId: string, dto: TriggerRiskCalculationDto, triggeredBy: string,
  ): Promise<RiskScore> {
    const now = new Date().toISOString();
    const id = `riskScore:${orgId}:rsk_${Date.now()}_${uuid().slice(0, 8)}`;

    const result = await this.computeRiskScore(orgId, dto.complexId, dto.targetType, dto.targetId, dto.targetName);

    // 기존 isLatest=true → false로 변경
    await this.markPreviousNotLatest(orgId, dto.targetId);

    const doc: RiskScore = {
      _id: id, docType: 'riskScore', orgId,
      complexId: dto.complexId, targetType: dto.targetType,
      targetId: dto.targetId, targetName: dto.targetName,
      score: result.score, level: result.level, confidence: result.confidence,
      calculatedAt: now, isLatest: true,
      subScores: result.subScores, evidence: result.evidence,
      createdAt: now, updatedAt: now, createdBy: triggeredBy, updatedBy: triggeredBy,
    };

    return this.couch.create(orgId, doc);
  }

  // ── 핵심 계산 로직 ─────────────────────────────────────────────────
  async computeRiskScore(
    orgId: string, complexId: string,
    targetType: RiskTargetType, targetId: string, targetName: string,
  ) {
    // 1. 결함 데이터 수집
    const defectSelector: Record<string, any> = {
      docType: 'defect', orgId, complexId, isRepaired: false,
    };
    if (targetType === RiskTargetType.ASSET)    defectSelector.assetId    = targetId;
    if (targetType === RiskTargetType.ZONE)     defectSelector.zoneId     = targetId;
    if (targetType === RiskTargetType.BUILDING) defectSelector.buildingId = targetId;

    const { docs: defects } = await this.couch.find(orgId, defectSelector, { limit: 500 });
    const criticalDefects = defects.filter((d: any) => d.severity === 'CRITICAL').length;
    const highDefects = defects.filter((d: any) => d.severity === 'HIGH').length;
    const mediumDefects = defects.filter((d: any) => d.severity === 'MEDIUM').length;

    // 전체 결함 수 (미수리 포함)
    const { docs: allDefects } = await this.couch.find(orgId, {
      ...defectSelector, isRepaired: undefined,
    }, { limit: 500 });

    const defectResult = calcDefectScore(defects.length, criticalDefects, highDefects, mediumDefects, allDefects.length);

    // 2. 균열 데이터 수집
    const crackSelector: Record<string, any> = { docType: 'crackMeasurement', orgId, complexId };
    if (targetType === RiskTargetType.BUILDING) crackSelector.buildingId = targetId;
    const { docs: cracks } = await this.couch.find(orgId, crackSelector, { limit: 200 });
    const exceedCracks = cracks.filter((c: any) => c.exceedsThreshold).length;
    const maxWidth = cracks.length > 0
      ? Math.max(...cracks.map((c: any) => c.measuredWidthMm ?? 0)) : undefined;
    const crackResult = calcCrackScore(exceedCracks, maxWidth);

    // 3. 센서 데이터 수집 (최근 24시간)
    const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const sensorSelector: Record<string, any> = {
      docType: 'sensorReading', orgId, complexId,
      recordedAt: { $gte: yesterday },
    };
    const { docs: readings } = await this.couch.find(orgId, sensorSelector, { limit: 1000 });
    const criticalReadings = readings.filter((r: any) => r.thresholdStatus === 'CRITICAL').length;
    const warningReadings  = readings.filter((r: any) => r.thresholdStatus === 'WARNING').length;
    const sensorResult = calcSensorScore(criticalReadings, warningReadings);

    // 4. 민원 데이터 수집
    const complaintSelector: Record<string, any> = {
      docType: 'complaint', orgId, complexId,
      status: { $nin: ['RESOLVED', 'CLOSED'] },
    };
    const { docs: complaints } = await this.couch.find(orgId, complaintSelector, { limit: 200 });
    const urgentComplaints = complaints.filter((c: any) => c.priority === 'URGENT').length;
    const highComplaints   = complaints.filter((c: any) => c.priority === 'HIGH').length;
    const complaintResult = calcComplaintScore(complaints.length, urgentComplaints, highComplaints);

    // 5. 자산 노후도 (ASSET 타겟인 경우만)
    let ageYears: number | undefined;
    let serviceLifeYears: number | undefined;
    if (targetType === RiskTargetType.ASSET) {
      const asset = await this.couch.findById<any>(orgId, targetId).catch(() => null);
      if (asset?.installDate) {
        ageYears = (Date.now() - new Date(asset.installDate).getTime()) / (365.25 * 86400_000);
        serviceLifeYears = asset.serviceLifeYears;
      }
    }
    const ageResult = calcAgeScore(ageYears, serviceLifeYears);

    // 6. 활성 경보 수
    const { docs: alerts } = await this.couch.find(orgId, {
      docType: 'alert', orgId, complexId, status: 'ACTIVE',
    }, { limit: 100 });
    const criticalAlerts = alerts.filter((a: any) => a.severity === 'CRITICAL').length;

    // 7. 가중 합산
    const W = RISK_WEIGHTS;
    const rawScore =
      defectResult.score   * W.defect    +
      crackResult.score    * W.crack     +
      sensorResult.score   * W.sensor    +
      complaintResult.score* W.complaint +
      ageResult.score      * W.age;

    const score = Math.min(Math.round(rawScore), 100);
    const level = scoreToLevel(score);

    // 신뢰도 = 근거 데이터 보유 비율
    const dataPoints = [defects.length, cracks.length, readings.length, complaints.length];
    const confidence = Math.min(
      dataPoints.filter((n) => n > 0).length / dataPoints.length + 0.1,
      1.0,
    );

    const evidenceSummary = [
      defects.length  > 0 ? `미수리 결함 ${defects.length}건 (긴급 ${criticalDefects}건)` : null,
      exceedCracks    > 0 ? `균열 임계치 초과 ${exceedCracks}건` : null,
      criticalReadings> 0 ? `센서 위험 이상 ${criticalReadings}건` : null,
      complaints.length>0 ? `미해결 민원 ${complaints.length}건` : null,
      ageYears != null    ? `설비 경과 ${Math.round(ageYears)}년` : null,
    ].filter(Boolean).join(', ') || '근거 데이터 없음';

    return {
      score, level, confidence,
      subScores: {
        defect:    { score: defectResult.score,    weight: W.defect,    contribution: defectResult.score * W.defect,    details: defectResult.details,    dataPoints: defects.length },
        crack:     { score: crackResult.score,     weight: W.crack,     contribution: crackResult.score * W.crack,      details: crackResult.details,     dataPoints: cracks.length },
        sensor:    { score: sensorResult.score,    weight: W.sensor,    contribution: sensorResult.score * W.sensor,    details: sensorResult.details,    dataPoints: readings.length },
        complaint: { score: complaintResult.score, weight: W.complaint, contribution: complaintResult.score * W.complaint, details: complaintResult.details,dataPoints: complaints.length },
        age:       { score: ageResult.score,       weight: W.age,       contribution: ageResult.score * W.age,          details: ageResult.details,       dataPoints: ageYears != null ? 1 : 0 },
      },
      evidence: {
        unrepairedDefects: defects.length, criticalDefects, highDefects,
        crackThresholdExceedances: exceedCracks, maxCrackWidthMm: maxWidth,
        openComplaints: complaints.length, urgentComplaints,
        activeAlerts: alerts.length, criticalAlerts,
        sensorAnomalies: warningReadings + criticalReadings, sensorCriticalCount: criticalReadings,
        assetAgeYears: ageYears ? Math.round(ageYears * 10) / 10 : undefined,
        serviceLifeYears, remainingLifeRatio: ageResult.remainingLifeRatio,
        evidenceSummary,
      },
    };
  }

  // ── 목록 조회 ──────────────────────────────────────────────────────
  async findAll(orgId: string, query: RiskScoreQueryDto) {
    const selector: Record<string, any> = { docType: 'riskScore', orgId, isLatest: true };
    if (query.complexId)  selector.complexId  = query.complexId;
    if (query.targetType) selector.targetType = query.targetType;
    if (query.targetId)   selector.targetId   = query.targetId;
    if (query.level)      selector.level      = query.level;

    const page  = query.page  ? +query.page  : 1;
    const limit = Math.min(query.limit ? +query.limit : 50, 200);

    const { docs } = await this.couch.find<RiskScore>(orgId, selector, {
      limit: limit + 1, skip: (page - 1) * limit,
      sort: [{ calculatedAt: 'desc' }],
    });

    const hasNext = docs.length > limit;
    return { data: hasNext ? docs.slice(0, limit) : docs, meta: { page, limit, hasNext } };
  }

  async findById(orgId: string, id: string): Promise<RiskScore> {
    const doc = await this.couch.findById<RiskScore>(orgId, id);
    if (!doc || doc._deleted) throw new NotFoundException(`위험도 스코어 ${id}를 찾을 수 없습니다.`);
    return doc;
  }

  // ── 워커 결과 저장 ─────────────────────────────────────────────────
  async saveWorkerResult(orgId: string, body: {
    riskScoreId: string; score: number; level: RiskLevel; confidence: number;
    subScores: any; evidence: any;
  }) {
    const doc = await this.couch.findById<RiskScore>(orgId, body.riskScoreId);
    if (!doc) throw new Error(`RiskScore ${body.riskScoreId} not found`);

    await this.markPreviousNotLatest(orgId, doc.targetId);

    const now = new Date().toISOString();
    await this.couch.update(orgId, {
      ...doc,
      score: body.score, level: body.level, confidence: body.confidence,
      subScores: body.subScores, evidence: body.evidence,
      calculatedAt: now, isLatest: true,
      updatedAt: now, updatedBy: 'system:worker',
    });
  }

  // ── 내부 유틸 ──────────────────────────────────────────────────────
  async markPreviousNotLatest(orgId: string, targetId: string) {
    const { docs } = await this.couch.find<RiskScore>(orgId, {
      docType: 'riskScore', orgId, targetId, isLatest: true,
    }, { limit: 10 });

    for (const doc of docs) {
      await this.couch.update(orgId, { ...doc, isLatest: false, updatedAt: new Date().toISOString(), updatedBy: 'system' });
    }
  }
}
