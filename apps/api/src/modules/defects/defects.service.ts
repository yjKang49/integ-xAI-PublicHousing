// apps/api/src/modules/defects/defects.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { CouchService } from '../../database/couch.service';
import { Defect, SeverityLevel, AlertType, Alert } from '@ax/shared';
import { CreateDefectRequest, UpdateDefectRequest, DefectListQuery } from '@ax/shared';

@Injectable()
export class DefectsService {
  constructor(private readonly couch: CouchService) {}

  async create(orgId: string, dto: CreateDefectRequest, userId: string): Promise<Defect> {
    const now = new Date().toISOString();
    const id = `defect:${orgId}:def_${Date.now()}_${uuid().slice(0, 8)}`;

    const defect: Defect = {
      _id: id,
      docType: 'defect',
      orgId,
      ...dto,
      mediaIds: dto.mediaIds ?? [],
      isRepaired: false,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    };

    const saved = await this.couch.create(orgId, defect);

    // Auto-create alert for CRITICAL severity
    if (dto.severity === SeverityLevel.CRITICAL) {
      await this.createCriticalAlert(orgId, saved, userId);
    }

    return saved;
  }

  async findById(orgId: string, id: string): Promise<Defect> {
    const defect = await this.couch.findById<Defect>(orgId, id);
    if (!defect || defect._deleted) throw new NotFoundException(`Defect ${id} not found`);
    if (defect.orgId !== orgId) throw new ForbiddenException();
    return defect;
  }

  async findAll(orgId: string, query: DefectListQuery) {
    const selector: Record<string, any> = {
      docType: 'defect',
      orgId,
    };

    if (query.complexId) selector.complexId = query.complexId;
    if (query.buildingId) selector.buildingId = query.buildingId;
    if (query.sessionId) selector.sessionId = query.sessionId;
    if (query.defectType) selector.defectType = query.defectType;
    if (query.severity) selector.severity = query.severity;
    if (query.isRepaired !== undefined) selector.isRepaired = query.isRepaired;

    if (query.dateFrom || query.dateTo) {
      selector.createdAt = {};
      if (query.dateFrom) selector.createdAt.$gte = query.dateFrom;
      if (query.dateTo) selector.createdAt.$lte = query.dateTo;
    }

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const { docs } = await this.couch.find<Defect>(orgId, selector, {
      limit: limit + 1,
      skip,
      sort: [{ createdAt: (query.order ?? 'desc') as 'asc' | 'desc' }],
    });

    const hasNext = docs.length > limit;
    const data = hasNext ? docs.slice(0, limit) : docs;

    return {
      data,
      meta: { total: -1, page, limit, hasNext },
    };
  }

  async update(orgId: string, id: string, dto: UpdateDefectRequest, userId: string): Promise<Defect> {
    const defect = await this.findById(orgId, id);

    const updated: Defect = {
      ...defect,
      ...dto,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };

    return this.couch.update(orgId, updated);
  }

  private async createCriticalAlert(orgId: string, defect: Defect, userId: string): Promise<void> {
    const now = new Date().toISOString();
    const alert: Alert = {
      _id: `alert:${orgId}:alrt_${Date.now()}_${uuid().slice(0, 8)}`,
      docType: 'alert',
      orgId,
      complexId: defect.complexId,
      alertType: AlertType.DEFECT_CRITICAL,
      status: 'ACTIVE' as any,
      severity: SeverityLevel.CRITICAL,
      title: `긴급 결함 등록: ${defect.defectType}`,
      message: `${defect.locationDescription} — ${defect.description}`,
      sourceEntityType: 'defect',
      sourceEntityId: defect._id,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    };
    await this.couch.create(orgId, alert);
  }
}
