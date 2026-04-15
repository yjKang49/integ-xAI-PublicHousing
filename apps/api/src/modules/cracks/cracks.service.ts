import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { CouchService } from '../../database/couch.service';
import { CrackGaugePoint, CrackMeasurement, AlertType, SeverityLevel } from '@ax/shared';
import { AlertsService } from '../alerts/alerts.service';
import {
  CreateGaugePointDto, UpdateGaugePointDto,
  CreateMeasurementDto, MeasurementQueryDto,
} from './dto/crack.dto';

@Injectable()
export class CracksService {
  private readonly logger = new Logger(CracksService.name);

  constructor(
    private readonly couch: CouchService,
    private readonly alerts: AlertsService,
  ) {}

  // ── GaugePoint ────────────────────────────────────────────────

  async createGaugePoint(orgId: string, dto: CreateGaugePointDto, userId: string): Promise<CrackGaugePoint> {
    const now = new Date().toISOString();
    const id  = `crackGaugePoint:${orgId}:cgp_${Date.now()}_${uuid().slice(0, 8)}`;

    const point: CrackGaugePoint = {
      _id: id,
      docType: 'crackGaugePoint',
      orgId,
      complexId: dto.complexId,
      buildingId: dto.buildingId,
      floorId: dto.floorId,
      zoneId: dto.zoneId,
      name: dto.name,
      description: dto.description,
      qrCode: `AX:crackGauge:${orgId}:${id}`,
      installDate: dto.installDate,
      baselineWidthMm: dto.baselineWidthMm,
      thresholdMm: dto.thresholdMm,
      location: dto.location,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    };

    return this.couch.create(orgId, point);
  }

  async findGaugePoints(orgId: string, query: {
    complexId?: string; buildingId?: string; isActive?: boolean;
    page?: number; limit?: number;
  }) {
    const selector: Record<string, any> = { docType: 'crackGaugePoint', orgId };
    if (query.complexId)            selector.complexId  = query.complexId;
    if (query.buildingId)           selector.buildingId = query.buildingId;
    if (query.isActive !== undefined) selector.isActive = query.isActive;

    const page  = query.page  ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);

    const { docs } = await this.couch.find<CrackGaugePoint>(orgId, selector, {
      limit: limit + 1,
      skip: (page - 1) * limit,
      sort: [{ createdAt: 'desc' }],
    });

    const hasNext = docs.length > limit;
    return { data: hasNext ? docs.slice(0, limit) : docs, meta: { page, limit, hasNext } };
  }

  async findGaugePointById(orgId: string, id: string): Promise<CrackGaugePoint> {
    const doc = await this.couch.findById<CrackGaugePoint>(orgId, id);
    if (!doc || doc._deleted) throw new NotFoundException(`균열 게이지 포인트 ${id}를 찾을 수 없습니다.`);
    return doc;
  }

  async updateGaugePoint(orgId: string, id: string, dto: UpdateGaugePointDto, userId: string): Promise<CrackGaugePoint> {
    const point = await this.findGaugePointById(orgId, id);
    return this.couch.update(orgId, {
      ...point,
      ...dto,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    });
  }

  async removeGaugePoint(orgId: string, id: string): Promise<void> {
    await this.findGaugePointById(orgId, id);
    await this.couch.softDelete(orgId, id);
  }

  // ── Measurement ───────────────────────────────────────────────

  async createMeasurement(orgId: string, dto: CreateMeasurementDto, userId: string): Promise<CrackMeasurement> {
    const point = await this.findGaugePointById(orgId, dto.gaugePointId);
    const now   = new Date().toISOString();
    const id    = `crackMeasurement:${orgId}:cm_${Date.now()}_${uuid().slice(0, 8)}`;

    // 이전 측정값 조회 → changeFromLastMm 계산
    const { docs: prev } = await this.couch.find<CrackMeasurement>(orgId, {
      docType: 'crackMeasurement',
      orgId,
      gaugePointId: dto.gaugePointId,
    }, { limit: 1, sort: [{ measuredAt: 'desc' }] });

    const effectiveWidth = dto.isManualOverride && dto.manualWidthMm != null
      ? dto.manualWidthMm
      : dto.measuredWidthMm;

    const changeFromBaselineMm = parseFloat((effectiveWidth - point.baselineWidthMm).toFixed(3));
    const changeFromLastMm     = prev.length > 0
      ? parseFloat((effectiveWidth - prev[0].measuredWidthMm).toFixed(3))
      : undefined;
    const exceedsThreshold = effectiveWidth >= point.thresholdMm;

    const measurement: CrackMeasurement = {
      _id: id,
      docType: 'crackMeasurement',
      orgId,
      gaugePointId: dto.gaugePointId,
      complexId: dto.complexId,
      sessionId: dto.sessionId,
      measuredBy: userId,
      measuredAt: dto.measuredAt,
      capturedImageKey: dto.capturedImageKey,
      roiImageKey: dto.roiImageKey,
      measuredWidthMm: effectiveWidth,
      changeFromBaselineMm,
      changeFromLastMm,
      isManualOverride: dto.isManualOverride,
      manualWidthMm: dto.manualWidthMm,
      autoConfidence: dto.autoConfidence,
      graduationCount: dto.graduationCount,
      scaleMmPerGraduation: dto.scaleMmPerGraduation,
      exceedsThreshold,
      notes: dto.notes,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    };

    const saved = await this.couch.create(orgId, measurement);

    // 임계값 초과 시 알림 생성 (중복 방지)
    if (exceedsThreshold) {
      try {
        await this.alerts.createIfNotExists(
          orgId,
          AlertType.CRACK_THRESHOLD,
          dto.gaugePointId,
          {
            complexId: dto.complexId,
            severity: SeverityLevel.HIGH,
            title: `균열 임계치 초과: ${point.name}`,
            message: `측정값 ${effectiveWidth}mm가 임계치 ${point.thresholdMm}mm를 초과했습니다. (기준 대비 +${changeFromBaselineMm}mm)`,
            sourceEntityType: 'crackMeasurement',
          },
          userId,
        );
        // 알림이 생성됐으면 측정값에 연결
        const { docs: newAlerts } = await this.couch.find<any>(orgId, {
          docType: 'alert',
          orgId,
          alertType: AlertType.CRACK_THRESHOLD,
          sourceEntityId: dto.gaugePointId,
        }, { limit: 1, sort: [{ createdAt: 'desc' }] });
        if (newAlerts.length > 0) {
          await this.couch.update(orgId, { ...saved, alertId: newAlerts[0]._id });
        }
      } catch (e) {
        this.logger.warn(`알림 생성 실패: ${e.message}`);
      }
    }

    return saved;
  }

  async findMeasurements(orgId: string, query: MeasurementQueryDto) {
    const selector: Record<string, any> = { docType: 'crackMeasurement', orgId };
    if (query.gaugePointId) selector.gaugePointId = query.gaugePointId;
    if (query.complexId)    selector.complexId    = query.complexId;
    if (query.from || query.to) {
      selector.measuredAt = {
        ...(query.from && { $gte: query.from }),
        ...(query.to   && { $lte: query.to }),
      };
    }

    const page  = query.page  ? +query.page  : 1;
    const limit = Math.min(query.limit ? +query.limit : 30, 200);

    const { docs } = await this.couch.find<CrackMeasurement>(orgId, selector, {
      limit: limit + 1,
      skip: (page - 1) * limit,
      sort: [{ measuredAt: 'desc' }],
    });

    const hasNext = docs.length > limit;
    return { data: hasNext ? docs.slice(0, limit) : docs, meta: { page, limit, hasNext } };
  }

  async findMeasurementById(orgId: string, id: string): Promise<CrackMeasurement> {
    const doc = await this.couch.findById<CrackMeasurement>(orgId, id);
    if (!doc || doc._deleted) throw new NotFoundException(`균열 측정값 ${id}를 찾을 수 없습니다.`);
    return doc;
  }

  // ── 추세 분석 (게이지 포인트별 시계열) ────────────────────────
  async getTrend(orgId: string, gaugePointId: string, days = 90): Promise<{
    gaugePoint: CrackGaugePoint;
    measurements: CrackMeasurement[];
    trend: 'STABLE' | 'INCREASING' | 'DECREASING';
    latestWidthMm: number | null;
  }> {
    const point = await this.findGaugePointById(orgId, gaugePointId);

    const from = new Date(Date.now() - days * 86400000).toISOString();
    const { docs } = await this.couch.find<CrackMeasurement>(orgId, {
      docType: 'crackMeasurement',
      orgId,
      gaugePointId,
      measuredAt: { $gte: from },
    }, { limit: 500, sort: [{ measuredAt: 'asc' }] });

    let trend: 'STABLE' | 'INCREASING' | 'DECREASING' = 'STABLE';
    if (docs.length >= 3) {
      const first = docs[0].measuredWidthMm;
      const last  = docs[docs.length - 1].measuredWidthMm;
      const delta = last - first;
      if (delta > 0.1)       trend = 'INCREASING';
      else if (delta < -0.1) trend = 'DECREASING';
    }

    return {
      gaugePoint: point,
      measurements: docs,
      trend,
      latestWidthMm: docs.length > 0 ? docs[docs.length - 1].measuredWidthMm : null,
    };
  }
}
