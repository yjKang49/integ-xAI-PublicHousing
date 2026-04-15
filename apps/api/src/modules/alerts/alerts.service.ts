import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { CouchService } from '../../database/couch.service';
import { Alert, AlertStatus, AlertType, SeverityLevel } from '@ax/shared';
import { CreateAlertDto, AlertQueryDto } from './dto/alert.dto';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(private readonly couch: CouchService) {}

  // ── 알림 생성 (서비스 내부 / 외부 호출 공용) ──────────────────
  async create(orgId: string, dto: CreateAlertDto, createdBy: string): Promise<Alert> {
    const now = new Date().toISOString();
    const id = `alert:${orgId}:alt_${Date.now()}_${uuid().slice(0, 8)}`;

    const alert: Alert = {
      _id: id,
      docType: 'alert',
      orgId,
      complexId: dto.complexId,
      alertType: dto.alertType,
      status: AlertStatus.ACTIVE,
      severity: dto.severity,
      title: dto.title,
      message: dto.message,
      sourceEntityType: dto.sourceEntityType,
      sourceEntityId: dto.sourceEntityId,
      assignedTo: dto.assignedTo ?? [],
      expiresAt: dto.expiresAt,
      createdAt: now,
      updatedAt: now,
      createdBy,
      updatedBy: createdBy,
    };

    return this.couch.create(orgId, alert);
  }

  // ── 목록 조회 ──────────────────────────────────────────────────
  async findAll(orgId: string, query: AlertQueryDto) {
    const selector: Record<string, any> = { docType: 'alert', orgId };
    if (query.status)    selector.status    = query.status;
    if (query.severity)  selector.severity  = query.severity;
    if (query.alertType) selector.alertType = query.alertType;
    if (query.complexId) selector.complexId = query.complexId;

    const page  = query.page  ? +query.page  : 1;
    const limit = Math.min(query.limit ? +query.limit : 20, 100);

    const { docs } = await this.couch.find<Alert>(orgId, selector, {
      limit: limit + 1,
      skip: (page - 1) * limit,
      sort: [{ createdAt: 'desc' }],
    });

    const hasNext = docs.length > limit;
    return { data: hasNext ? docs.slice(0, limit) : docs, meta: { page, limit, hasNext } };
  }

  // ── 단건 조회 ──────────────────────────────────────────────────
  async findById(orgId: string, id: string): Promise<Alert> {
    const doc = await this.couch.findById<Alert>(orgId, id);
    if (!doc || doc._deleted) throw new NotFoundException(`알림 ${id}를 찾을 수 없습니다.`);
    return doc;
  }

  // ── 확인(인지) 처리 ────────────────────────────────────────────
  async acknowledge(orgId: string, id: string, userId: string): Promise<Alert> {
    const alert = await this.findById(orgId, id);
    if (alert.status !== AlertStatus.ACTIVE) {
      throw new BadRequestException(`이미 ${alert.status} 상태의 알림입니다.`);
    }
    const now = new Date().toISOString();
    return this.couch.update(orgId, {
      ...alert,
      status: AlertStatus.ACKNOWLEDGED,
      acknowledgedBy: userId,
      acknowledgedAt: now,
      updatedAt: now,
      updatedBy: userId,
    });
  }

  // ── 해결 처리 ──────────────────────────────────────────────────
  async resolve(orgId: string, id: string, userId: string): Promise<Alert> {
    const alert = await this.findById(orgId, id);
    if (alert.status === AlertStatus.RESOLVED) {
      throw new BadRequestException('이미 해결된 알림입니다.');
    }
    const now = new Date().toISOString();
    return this.couch.update(orgId, {
      ...alert,
      status: AlertStatus.RESOLVED,
      resolvedBy: userId,
      resolvedAt: now,
      updatedAt: now,
      updatedBy: userId,
    });
  }

  // ── 활성 알림 수 (대시보드용) ──────────────────────────────────
  async countActive(orgId: string, complexId?: string): Promise<Record<SeverityLevel, number>> {
    const selector: Record<string, any> = {
      docType: 'alert',
      orgId,
      status: AlertStatus.ACTIVE,
    };
    if (complexId) selector.complexId = complexId;

    const { docs } = await this.couch.find<Alert>(orgId, selector, { limit: 1000 });

    const counts: Record<SeverityLevel, number> = {
      [SeverityLevel.LOW]: 0,
      [SeverityLevel.MEDIUM]: 0,
      [SeverityLevel.HIGH]: 0,
      [SeverityLevel.CRITICAL]: 0,
    };
    for (const a of docs) counts[a.severity] = (counts[a.severity] ?? 0) + 1;
    return counts;
  }

  // ── 내부 유틸: 중복 없이 알림 생성 ────────────────────────────
  async createIfNotExists(
    orgId: string,
    alertType: AlertType,
    sourceEntityId: string,
    payload: Omit<CreateAlertDto, 'alertType' | 'sourceEntityId'>,
    createdBy = 'system',
  ): Promise<Alert | null> {
    // 동일 엔티티에 대한 ACTIVE 알림이 이미 있으면 생성 안 함
    const { docs } = await this.couch.find<Alert>(orgId, {
      docType: 'alert',
      orgId,
      alertType,
      sourceEntityId,
      status: AlertStatus.ACTIVE,
    }, { limit: 1 });

    if (docs.length > 0) return null;

    return this.create(orgId, {
      ...payload,
      alertType,
      sourceEntityId,
    }, createdBy);
  }
}
