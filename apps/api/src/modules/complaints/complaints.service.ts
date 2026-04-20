// apps/api/src/modules/complaints/complaints.service.ts
import {
  Injectable, NotFoundException, ForbiddenException, UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { v4 as uuid } from 'uuid';
import { CouchService } from '../../database/couch.service';
import {
  Complaint, ComplaintStatus, ComplaintEvent,
  AlertType, Alert, SeverityLevel,
} from '@ax/shared';
import { CreateComplaintRequest, UpdateComplaintRequest } from '@ax/shared';
import { AutomationRulesService } from '../automation-rules/automation-rules.service';

const CACHE_TTL = 10;

/** Valid complaint status transitions — OPEN/TRIAGED are new, RECEIVED kept for compat */
const STATUS_TRANSITIONS: Record<string, ComplaintStatus[]> = {
  OPEN:        [ComplaintStatus.TRIAGED, ComplaintStatus.ASSIGNED, ComplaintStatus.CLOSED],
  RECEIVED:    [ComplaintStatus.TRIAGED, ComplaintStatus.ASSIGNED, ComplaintStatus.CLOSED],
  TRIAGED:     [ComplaintStatus.ASSIGNED, ComplaintStatus.CLOSED],
  ASSIGNED:    [ComplaintStatus.IN_PROGRESS, ComplaintStatus.OPEN, ComplaintStatus.CLOSED],
  IN_PROGRESS: [ComplaintStatus.RESOLVED, ComplaintStatus.ASSIGNED],
  RESOLVED:    [ComplaintStatus.CLOSED],
  CLOSED:      [],
};

@Injectable()
export class ComplaintsService {
  private readonly computingKeys = new Set<string>();

  constructor(
    private readonly couch: CouchService,
    private readonly automationRules: AutomationRulesService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async create(orgId: string, dto: CreateComplaintRequest, userId: string): Promise<Complaint> {
    const now = new Date().toISOString();
    const id = `complaint:${orgId}:cmp_${Date.now()}_${uuid().slice(0, 8)}`;

    const initialEvent: ComplaintEvent = {
      timestamp: now,
      fromStatus: null,
      toStatus: ComplaintStatus.OPEN,
      actorId: userId,
      notes: '민원 접수',
    };

    const complaint: Complaint = {
      _id: id,
      docType: 'complaint',
      orgId,
      complexId: dto.complexId,
      buildingId: (dto as any).buildingId,
      unitNumber: (dto as any).unitNumber,
      category: dto.category,
      title: dto.title,
      description: dto.description,
      status: ComplaintStatus.OPEN,
      priority: (dto as any).priority ?? 'MEDIUM',
      submittedBy: dto.submittedBy,
      submittedPhone: (dto as any).submittedPhone,
      submittedAt: now,
      dueDate: (dto as any).dueDate,
      mediaIds: dto.mediaIds ?? [],
      classificationHint: (dto as any).classificationHint,
      timeline: [initialEvent],
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    };

    const saved = await this.couch.create(orgId, complaint);

    if ((saved as any).priority === 'URGENT') {
      await this.createUrgentAlert(orgId, saved, userId);
    }

    return saved;
  }

  async findById(orgId: string, id: string): Promise<Complaint> {
    const doc = await this.couch.findById<Complaint>(orgId, id);
    if (!doc || doc._deleted) throw new NotFoundException(`Complaint ${id} not found`);
    if (doc.orgId !== orgId) throw new ForbiddenException();
    return doc;
  }

  async findAll(orgId: string, query: any) {
    const cacheKey = `complaints:list:${orgId}:${JSON.stringify(query)}`;
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
      const selector: Record<string, any> = { docType: 'complaint', orgId };
      if (query.complexId)   selector.complexId   = query.complexId;
      if (query.status)      selector.status      = query.status;
      if (query.category)    selector.category    = query.category;
      if (query.assignedTo)  selector.assignedTo  = query.assignedTo;
      if (query.priority)    selector.priority    = query.priority;

      if (query.overdueOnly === 'true' || query.overdueOnly === true) {
        selector.dueDate = { $lt: new Date().toISOString() };
        selector.status  = { $nin: ['RESOLVED', 'CLOSED'] };
      }

      const page  = query.page  ? +query.page  : 1;
      const limit = Math.min(query.limit ? +query.limit : 20, 100);

      // Count total matching documents (fields:['_id'] minimizes data transfer)
      const { docs: countDocs } = await this.couch.find<{ _id: string }>(orgId, selector, {
        limit: 0,
        fields: ['_id'],
      });
      const total = countDocs.length;

      const { docs } = await this.couch.find<Complaint>(orgId, selector, {
        limit: limit + 1,
        skip: (page - 1) * limit,
        sort: [{ submittedAt: 'desc' }],
      });

      const hasNext = docs.length > limit;
      const result = { data: hasNext ? docs.slice(0, limit) : docs, meta: { page, limit, hasNext, total } };
      await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
      return result;
    } finally {
      this.computingKeys.delete(cacheKey);
    }
  }

  async updateStatus(
    orgId: string,
    id: string,
    dto: UpdateComplaintRequest & { classificationHint?: string; workOrderId?: string },
    userId: string,
  ): Promise<Complaint> {
    const complaint = await this.findById(orgId, id);
    const prevStatus = complaint.status; // 자동화 훅을 위해 이전 상태 보존
    (complaint as any)._prevStatus = prevStatus;
    const now = new Date().toISOString();

    // ── Status transition ────────────────────────────────────────
    if (dto.status && dto.status !== complaint.status) {
      this.validateTransition(complaint.status, dto.status as ComplaintStatus);

      const event: ComplaintEvent = {
        timestamp: now,
        fromStatus: complaint.status,
        toStatus: dto.status as ComplaintStatus,
        actorId: userId,
        notes: dto.notes,
      };
      complaint.timeline = [...complaint.timeline, event];

      if (dto.status === ComplaintStatus.RESOLVED) {
        complaint.resolvedAt = now;
        complaint.resolutionNotes = dto.resolutionNotes;
      }
      if (dto.status === ComplaintStatus.CLOSED) {
        complaint.closedAt = now;
        if (dto.satisfactionScore != null) complaint.satisfactionScore = dto.satisfactionScore;
        if (dto.satisfactionFeedback) complaint.satisfactionFeedback = dto.satisfactionFeedback;
      }
      complaint.status = dto.status as ComplaintStatus;
    }

    // ── Assignee ────────────────────────────────────────────────
    if (dto.assignedTo && dto.assignedTo !== complaint.assignedTo) {
      complaint.assignedTo  = dto.assignedTo;
      complaint.assignedAt  = now;
      complaint.status      = ComplaintStatus.ASSIGNED;

      const assignEvent: ComplaintEvent = {
        timestamp: now,
        fromStatus: complaint.status,
        toStatus: ComplaintStatus.ASSIGNED,
        actorId: userId,
        notes: `담당자 배정: ${dto.assignedTo}`,
      };
      complaint.timeline = [...complaint.timeline, assignEvent];
    }

    // ── Scalar updates ──────────────────────────────────────────
    if (dto.dueDate) complaint.dueDate = dto.dueDate;
    if (dto.priority) (complaint as any).priority = dto.priority;
    if (dto.classificationHint) complaint.classificationHint = dto.classificationHint;
    if ((dto as any).aiSuggestion) complaint.aiSuggestion = (dto as any).aiSuggestion;
    if ((dto as any).workOrderId) complaint.workOrderId = (dto as any).workOrderId;

    complaint.updatedAt = now;
    complaint.updatedBy = userId;

    const updated = await this.couch.update(orgId, complaint);

    // 상태 변경 시 자동화 룰 훅 (fire-and-forget)
    if (dto.status && dto.status !== (complaint as any)._prevStatus) {
      void this.automationRules.checkStatusChangeTriggers(
        orgId,
        'complaint',
        updated._id,
        updated as unknown as Record<string, unknown>,
        (complaint as any)._prevStatus ?? null,
        dto.status,
      );
    }

    return updated;
  }

  private validateTransition(from: ComplaintStatus, to: ComplaintStatus): void {
    const allowed = STATUS_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new UnprocessableEntityException(
        `민원 상태를 '${from}'에서 '${to}'으로 변경할 수 없습니다.`,
      );
    }
  }

  private async createUrgentAlert(orgId: string, complaint: Complaint, userId: string): Promise<void> {
    const now = new Date().toISOString();
    const alert: Alert = {
      _id: `alert:${orgId}:alrt_${Date.now()}_${uuid().slice(0, 8)}`,
      docType: 'alert',
      orgId,
      complexId: complaint.complexId,
      alertType: AlertType.COMPLAINT_OVERDUE,
      status: 'ACTIVE' as any,
      severity: SeverityLevel.HIGH,
      title: `긴급 민원 접수: ${complaint.title}`,
      message: complaint.description.slice(0, 200),
      sourceEntityType: 'complaint',
      sourceEntityId: complaint._id,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    };
    await this.couch.create(orgId, alert);
  }
}
