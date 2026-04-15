// apps/api/src/modules/sensor-readings/sensor-readings.service.ts
// Phase 2-8: 센서 측정값 수집 & 시계열 조회 서비스

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { CouchService } from '../../database/couch.service';
import { SensorsService } from '../sensors/sensors.service';
import { AlertsService } from '../alerts/alerts.service';
import {
  SensorReading, SensorReadingQuality,
  AlertType, SeverityLevel,
  evaluateThreshold, THRESHOLD_SEVERITY_MAP,
} from '@ax/shared';
import { IngestReadingDto, BatchIngestDto, SensorReadingQueryDto } from './dto/sensor-reading.dto';

@Injectable()
export class SensorReadingsService {
  private readonly logger = new Logger(SensorReadingsService.name);

  constructor(
    private readonly couch: CouchService,
    private readonly sensors: SensorsService,
    private readonly alerts: AlertsService,
  ) {}

  // ── 단일 ingestion ──────────────────────────────────────────────────
  async ingest(orgId: string, dto: IngestReadingDto): Promise<SensorReading> {
    const device = await this.sensors.findByDeviceKey(orgId, dto.deviceKey);
    if (!device) throw new BadRequestException(`deviceKey '${dto.deviceKey}'에 해당하는 센서가 없습니다.`);
    if (!device.isActive) throw new BadRequestException(`센서 '${dto.deviceKey}'가 비활성 상태입니다.`);

    const now = new Date().toISOString();
    const recordedAt = dto.recordedAt ?? now;
    const thresholdStatus = evaluateThreshold(dto.value, device.thresholds);
    const id = `sensorReading:${orgId}:srd_${Date.now()}_${uuid().slice(0, 8)}`;

    const reading: SensorReading = {
      _id: id,
      docType: 'sensorReading',
      orgId,
      deviceId: device._id,
      deviceKey: device.deviceKey,
      complexId: device.complexId,
      sensorType: device.sensorType,
      value: dto.value,
      unit: device.thresholds.unit,
      quality: dto.quality ?? SensorReadingQuality.GOOD,
      recordedAt,
      thresholdStatus,
      source: 'REST_INGEST',
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
      updatedBy: 'system',
    };

    const saved = await this.couch.create(orgId, reading);

    // lastSeen 갱신 (비동기, 실패해도 ingestion 성공)
    this.sensors.updateLastSeen(orgId, device._id, dto.value, recordedAt).catch(() => {});

    // 임계치 초과 시 Alert 생성 (중복 방지)
    if (thresholdStatus !== 'NORMAL') {
      await this.createThresholdAlert(orgId, saved, thresholdStatus).catch((err) =>
        this.logger.warn(`Alert 생성 실패 (${device.deviceKey}): ${err?.message}`),
      );
    }

    return saved;
  }

  // ── Batch ingestion ─────────────────────────────────────────────────
  async batchIngest(orgId: string, dto: BatchIngestDto): Promise<{ success: number; failed: number; errors: string[] }> {
    const errors: string[] = [];
    let success = 0;
    let failed = 0;

    for (const r of dto.readings) {
      try {
        await this.ingest(orgId, r);
        success++;
      } catch (err: any) {
        failed++;
        errors.push(`[${r.deviceKey}] ${err?.message ?? '알 수 없는 오류'}`);
      }
    }

    return { success, failed, errors };
  }

  // ── 시계열 조회 ────────────────────────────────────────────────────
  async findReadings(orgId: string, query: SensorReadingQueryDto): Promise<{ data: SensorReading[]; meta: any }> {
    const selector: Record<string, any> = { docType: 'sensorReading', orgId };
    if (query.deviceId)  selector.deviceId  = query.deviceId;
    if (query.deviceKey) selector.deviceKey = query.deviceKey;
    if (query.complexId) selector.complexId = query.complexId;

    // 시간 범위 필터
    if (query.from || query.to) {
      selector.recordedAt = {};
      if (query.from) selector.recordedAt.$gte = query.from;
      if (query.to)   selector.recordedAt.$lte = query.to;
    }

    const limit = Math.min(query.limit ? +query.limit : 100, 1000);

    const { docs } = await this.couch.find<SensorReading>(orgId, selector, {
      limit,
      sort: [{ recordedAt: 'desc' }],
    });

    return { data: docs, meta: { limit, count: docs.length } };
  }

  // ── 최신값 조회 (센서 기기별 마지막 1개) ──────────────────────────
  async findLatestByDevice(orgId: string, deviceId: string): Promise<SensorReading | null> {
    const { docs } = await this.couch.find<SensorReading>(orgId, {
      docType: 'sensorReading',
      orgId,
      deviceId,
    }, { limit: 1, sort: [{ recordedAt: 'desc' }] });
    return docs[0] ?? null;
  }

  // ── Alert 생성 (중복 방지) ──────────────────────────────────────────
  private async createThresholdAlert(
    orgId: string,
    reading: SensorReading,
    status: 'WARNING' | 'CRITICAL',
  ): Promise<void> {
    const device = await this.sensors.findById(orgId, reading.deviceId).catch(() => null);
    if (!device) return;

    const severity = THRESHOLD_SEVERITY_MAP[status] as SeverityLevel;
    const label = status === 'CRITICAL' ? '위험' : '주의';

    await this.alerts.createIfNotExists(
      orgId,
      AlertType.IOT_THRESHOLD,
      reading.deviceId,
      {
        complexId: reading.complexId,
        severity,
        title: `[IoT ${label}] ${device.name} 임계치 초과`,
        message: `센서(${device.deviceKey}) 측정값 ${reading.value}${reading.unit}이 ${label} 임계치를 초과했습니다.`,
        sourceEntityType: 'sensorDevice',
      },
      'system',
    );
  }
}
