// apps/api/src/modules/sensors/sensors.service.ts
// Phase 2-8: IoT 센서 기기 CRUD 서비스

import {
  Injectable, NotFoundException, ConflictException, Logger,
} from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { CouchService } from '../../database/couch.service';
import {
  SensorDevice, SensorStatus, SensorType,
  DEFAULT_SENSOR_THRESHOLDS, SENSOR_TYPE_UNITS,
} from '@ax/shared';
import {
  CreateSensorDeviceDto, UpdateSensorDeviceDto, SensorDeviceQueryDto,
} from './dto/sensor.dto';

@Injectable()
export class SensorsService {
  private readonly logger = new Logger(SensorsService.name);

  constructor(private readonly couch: CouchService) {}

  // ── 센서 등록 ──────────────────────────────────────────────────────
  async create(orgId: string, dto: CreateSensorDeviceDto, createdBy: string): Promise<SensorDevice> {
    // deviceKey 중복 확인
    const existing = await this.findByDeviceKey(orgId, dto.deviceKey);
    if (existing) throw new ConflictException(`deviceKey '${dto.deviceKey}'가 이미 사용 중입니다.`);

    const now = new Date().toISOString();
    const id = `sensorDevice:${orgId}:snr_${Date.now()}_${uuid().slice(0, 8)}`;

    const defaults = DEFAULT_SENSOR_THRESHOLDS[dto.sensorType];

    const device: SensorDevice = {
      _id: id,
      docType: 'sensorDevice',
      orgId,
      complexId: dto.complexId,
      buildingId: dto.buildingId,
      floorId: dto.floorId,
      zoneId: dto.zoneId,
      assetId: dto.assetId,
      name: dto.name,
      deviceKey: dto.deviceKey,
      sensorType: dto.sensorType,
      status: SensorStatus.ACTIVE,
      locationDescription: dto.locationDescription,
      latitude: dto.latitude,
      longitude: dto.longitude,
      thresholds: {
        unit: dto.thresholds.unit || SENSOR_TYPE_UNITS[dto.sensorType],
        warningMin: dto.thresholds.warningMin ?? defaults.warningMin,
        warningMax: dto.thresholds.warningMax ?? defaults.warningMax,
        criticalMin: dto.thresholds.criticalMin ?? defaults.criticalMin,
        criticalMax: dto.thresholds.criticalMax ?? defaults.criticalMax,
      },
      manufacturer: dto.manufacturer,
      model: dto.model,
      installDate: dto.installDate,
      batteryLevel: dto.batteryLevel,
      firmwareVersion: dto.firmwareVersion,
      isActive: true,
      notes: dto.notes,
      createdAt: now,
      updatedAt: now,
      createdBy,
      updatedBy: createdBy,
    };

    return this.couch.create(orgId, device);
  }

  // ── 목록 조회 ──────────────────────────────────────────────────────
  async findAll(orgId: string, query: SensorDeviceQueryDto) {
    const selector: Record<string, any> = { docType: 'sensorDevice', orgId };
    if (query.complexId)  selector.complexId  = query.complexId;
    if (query.sensorType) selector.sensorType = query.sensorType;
    if (query.status)     selector.status     = query.status;
    if (query.buildingId) selector.buildingId = query.buildingId;

    const page  = query.page  ? +query.page  : 1;
    const limit = Math.min(query.limit ? +query.limit : 50, 200);

    const { docs } = await this.couch.find<SensorDevice>(orgId, selector, {
      limit: limit + 1,
      skip: (page - 1) * limit,
      sort: [{ createdAt: 'desc' }],
    });

    const hasNext = docs.length > limit;
    return { data: hasNext ? docs.slice(0, limit) : docs, meta: { page, limit, hasNext } };
  }

  // ── 단건 조회 (ID) ─────────────────────────────────────────────────
  async findById(orgId: string, id: string): Promise<SensorDevice> {
    const doc = await this.couch.findById<SensorDevice>(orgId, id);
    if (!doc || doc._deleted) throw new NotFoundException(`센서 ${id}를 찾을 수 없습니다.`);
    return doc;
  }

  // ── 단건 조회 (deviceKey) ─────────────────────────────────────────
  async findByDeviceKey(orgId: string, deviceKey: string): Promise<SensorDevice | null> {
    const { docs } = await this.couch.find<SensorDevice>(orgId, {
      docType: 'sensorDevice',
      orgId,
      deviceKey,
    }, { limit: 1 });
    return docs[0] ?? null;
  }

  // ── 수정 ──────────────────────────────────────────────────────────
  async update(orgId: string, id: string, dto: UpdateSensorDeviceDto, updatedBy: string): Promise<SensorDevice> {
    const device = await this.findById(orgId, id);
    const now = new Date().toISOString();

    const updated: SensorDevice = {
      ...device,
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.locationDescription !== undefined && { locationDescription: dto.locationDescription }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.batteryLevel !== undefined && { batteryLevel: dto.batteryLevel }),
      ...(dto.firmwareVersion !== undefined && { firmwareVersion: dto.firmwareVersion }),
      ...(dto.buildingId !== undefined && { buildingId: dto.buildingId }),
      ...(dto.floorId !== undefined && { floorId: dto.floorId }),
      ...(dto.zoneId !== undefined && { zoneId: dto.zoneId }),
      ...(dto.assetId !== undefined && { assetId: dto.assetId }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.thresholds && { thresholds: { ...device.thresholds, ...dto.thresholds } }),
      updatedAt: now,
      updatedBy,
    };

    return this.couch.update(orgId, updated);
  }

  // ── lastSeen / lastValue 갱신 (ingestion 시 호출) ─────────────────
  async updateLastSeen(orgId: string, deviceId: string, value: number, seenAt: string): Promise<void> {
    try {
      const device = await this.findById(orgId, deviceId);
      await this.couch.update(orgId, {
        ...device,
        lastSeenAt: seenAt,
        lastValue: value,
        lastValueAt: seenAt,
        status: SensorStatus.ACTIVE,
        updatedAt: seenAt,
        updatedBy: 'system',
      });
    } catch (err) {
      this.logger.warn(`lastSeen 갱신 실패 (${deviceId}): ${err}`);
    }
  }

  // ── 삭제 (soft) ────────────────────────────────────────────────────
  async remove(orgId: string, id: string): Promise<void> {
    await this.findById(orgId, id); // 존재 확인
    await this.couch.softDelete(orgId, id);
  }
}
