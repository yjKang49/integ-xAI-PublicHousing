// apps/api/src/modules/work-orders/work-orders.service.ts
import {
  Injectable, NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { v4 as uuid } from 'uuid';
import { CouchService } from '../../database/couch.service';
import { WorkOrder, WorkOrderStatus, WorkOrderEvent, ComplaintStatus } from '@ax/shared';
import { WORK_ORDER_TRANSITIONS } from '@ax/shared';
import { CreateWorkOrderDto, UpdateWorkOrderDto, WorkOrderQueryDto } from './dto/work-order.dto';

const CACHE_TTL = 10;

@Injectable()
export class WorkOrdersService {
  private readonly computingKeys = new Set<string>();

  constructor(
    private readonly couch: CouchService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async create(orgId: string, dto: CreateWorkOrderDto, userId: string): Promise<WorkOrder> {
    const now = new Date().toISOString();
    const id  = `workOrder:${orgId}:wo_${Date.now()}_${uuid().slice(0, 8)}`;

    const initialEvent: WorkOrderEvent = {
      timestamp: now,
      fromStatus: null,
      toStatus: WorkOrderStatus.OPEN,
      actorId: userId,
      notes: '작업지시 생성',
    };

    const workOrder: WorkOrder = {
      _id: id,
      docType: 'workOrder',
      orgId,
      complexId: dto.complexId,
      buildingId: dto.buildingId,
      complaintId: dto.complaintId,
      defectId: dto.defectId,
      title: dto.title,
      description: dto.description,
      assignedTo: dto.assignedTo,
      scheduledDate: dto.scheduledDate,
      status: WorkOrderStatus.OPEN,
      priority: dto.priority ?? 'MEDIUM',
      estimatedCost: dto.estimatedCost,
      vendor: dto.vendor,
      mediaIds: dto.mediaIds ?? [],
      timeline: [initialEvent],
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    };

    const saved = await this.couch.create(orgId, workOrder);

    // Back-link: update complaint.workOrderId
    if (dto.complaintId) {
      try {
        const complaint = await this.couch.findById<any>(orgId, dto.complaintId);
        if (complaint && !complaint._deleted) {
          await this.couch.update(orgId, {
            ...complaint,
            workOrderId: id,
            status: ComplaintStatus.IN_PROGRESS,
            updatedAt: now,
            updatedBy: userId,
          });
        }
      } catch {
        // Non-fatal
      }
    }

    return saved;
  }

  async findById(orgId: string, id: string): Promise<WorkOrder> {
    const doc = await this.couch.findById<WorkOrder>(orgId, id);
    if (!doc || doc._deleted) throw new NotFoundException(`WorkOrder ${id} not found`);
    return doc;
  }

  async findAll(orgId: string, query: WorkOrderQueryDto) {
    const cacheKey = `workOrders:list:${orgId}:${JSON.stringify(query)}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Cache stampede prevention: poll until the computing request finishes
    while (this.computingKeys.has(cacheKey)) {
      await new Promise(r => setTimeout(r, 150));
      const retry = await this.redis.get(cacheKey);
      if (retry) return JSON.parse(retry);
    }

    this.computingKeys.add(cacheKey);
    // Double-check cache after acquiring lock (another request may have just finished)
    const fresh = await this.redis.get(cacheKey);
    if (fresh) { this.computingKeys.delete(cacheKey); return JSON.parse(fresh); }

    try {
      const selector: Record<string, any> = { docType: 'workOrder', orgId };
      if (query.complexId)   selector.complexId   = query.complexId;
      if (query.complaintId) selector.complaintId = query.complaintId;
      if (query.status)      selector.status      = query.status;
      if (query.assignedTo)  selector.assignedTo  = query.assignedTo;

      const page  = query.page  ? +query.page  : 1;
      const limit = Math.min(query.limit ? +query.limit : 20, 100);

      const { docs } = await this.couch.find<WorkOrder>(orgId, selector, {
        limit: limit + 1,
        skip: (page - 1) * limit,
        sort: [{ scheduledDate: 'asc' }],
      });

      const hasNext = docs.length > limit;
      const result = { data: hasNext ? docs.slice(0, limit) : docs, meta: { page, limit, hasNext } };
      await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
      return result;
    } finally {
      this.computingKeys.delete(cacheKey);
    }
  }

  async update(orgId: string, id: string, dto: UpdateWorkOrderDto, userId: string): Promise<WorkOrder> {
    const wo  = await this.findById(orgId, id);
    const now = new Date().toISOString();

    if (dto.status && dto.status !== wo.status) {
      this.validateTransition(wo.status, dto.status);

      const event: WorkOrderEvent = {
        timestamp: now,
        fromStatus: wo.status,
        toStatus: dto.status,
        actorId: userId,
        notes: dto.notes,
      };
      wo.timeline = [...wo.timeline, event];

      if (dto.status === WorkOrderStatus.IN_PROGRESS && !wo.startedAt) {
        wo.startedAt = now;
      }
      if (dto.status === WorkOrderStatus.COMPLETED) {
        wo.completedAt = now;
        // Back-link: if complaint is still IN_PROGRESS, move to RESOLVED
        if (wo.complaintId) {
          try {
            const complaint = await this.couch.findById<any>(orgId, wo.complaintId);
            if (complaint && !complaint._deleted && complaint.status === ComplaintStatus.IN_PROGRESS) {
              await this.couch.update(orgId, {
                ...complaint,
                status: ComplaintStatus.RESOLVED,
                resolvedAt: now,
                resolutionNotes: dto.actionNotes ?? '작업지시 완료',
                updatedAt: now,
                updatedBy: userId,
              });
            }
          } catch {
            // Non-fatal
          }
        }
      }
      wo.status = dto.status;
    }

    if (dto.assignedTo !== undefined)    wo.assignedTo  = dto.assignedTo;
    if (dto.scheduledDate !== undefined) wo.scheduledDate = dto.scheduledDate;
    if (dto.priority !== undefined)      (wo as any).priority = dto.priority;
    if (dto.estimatedCost !== undefined) wo.estimatedCost = dto.estimatedCost;
    if (dto.actualCost !== undefined)    wo.actualCost = dto.actualCost;
    if (dto.vendor !== undefined)        wo.vendor = dto.vendor;
    if (dto.actionNotes !== undefined)   wo.actionNotes = dto.actionNotes;
    if (dto.notes !== undefined)         wo.notes = dto.notes;
    if (dto.mediaIds !== undefined)      wo.mediaIds = [...(wo.mediaIds ?? []), ...dto.mediaIds];

    wo.updatedAt = now;
    wo.updatedBy = userId;

    return this.couch.update(orgId, wo);
  }

  /** Inspector: start working on the order */
  async start(orgId: string, id: string, userId: string): Promise<WorkOrder> {
    return this.update(orgId, id, { status: WorkOrderStatus.IN_PROGRESS, notes: '현장 조치 시작' }, userId);
  }

  /** Inspector: complete with field action notes */
  async complete(
    orgId: string,
    id: string,
    dto: { actionNotes: string; actualCost?: number; mediaIds?: string[] },
    userId: string,
  ): Promise<WorkOrder> {
    return this.update(orgId, id, {
      status: WorkOrderStatus.COMPLETED,
      actionNotes: dto.actionNotes,
      actualCost: dto.actualCost,
      mediaIds: dto.mediaIds,
      notes: '현장 조치 완료',
    }, userId);
  }

  private validateTransition(from: WorkOrderStatus, to: WorkOrderStatus): void {
    const allowed = WORK_ORDER_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new UnprocessableEntityException(
        `작업지시 상태를 '${from}'에서 '${to}'으로 변경할 수 없습니다.`,
      );
    }
  }
}
