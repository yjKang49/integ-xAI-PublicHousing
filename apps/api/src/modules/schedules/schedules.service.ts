import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { CouchService } from '../../database/couch.service';
import { Schedule, AlertType, SeverityLevel } from '@ax/shared';
import { AlertsService } from '../alerts/alerts.service';
import { CreateScheduleDto, UpdateScheduleDto, ScheduleQueryDto, Recurrence } from './dto/schedule.dto';

@Injectable()
export class SchedulesService {
  private readonly logger = new Logger(SchedulesService.name);

  constructor(
    private readonly couch: CouchService,
    private readonly alerts: AlertsService,
  ) {}

  // ── CRUD ──────────────────────────────────────────────────────

  async create(orgId: string, dto: CreateScheduleDto, userId: string): Promise<Schedule> {
    const now = new Date().toISOString();
    const id  = `schedule:${orgId}:sch_${Date.now()}_${uuid().slice(0, 8)}`;

    const schedule: Schedule = {
      _id: id,
      docType: 'schedule',
      orgId,
      complexId: dto.complexId,
      title: dto.title,
      description: dto.description,
      scheduleType: dto.scheduleType,
      recurrence: dto.recurrence,
      nextOccurrence: dto.nextOccurrence,
      assignedTo: dto.assignedTo,
      isActive: true,
      overdueAlertDays: dto.overdueAlertDays ?? 3,
      linkedProjectId: dto.linkedProjectId,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    };

    return this.couch.create(orgId, schedule);
  }

  async findAll(orgId: string, query: ScheduleQueryDto) {
    const selector: Record<string, any> = { docType: 'schedule', orgId };
    if (query.complexId)    selector.complexId    = query.complexId;
    if (query.scheduleType) selector.scheduleType = query.scheduleType;
    if (query.isActive !== undefined) selector.isActive = query.isActive === 'true';

    const page  = query.page  ? +query.page  : 1;
    const limit = Math.min(query.limit ? +query.limit : 20, 100);

    const { docs } = await this.couch.find<Schedule>(orgId, selector, {
      limit: limit + 1,
      skip: (page - 1) * limit,
      sort: [{ nextOccurrence: 'asc' }],
    });

    const hasNext = docs.length > limit;
    return { data: hasNext ? docs.slice(0, limit) : docs, meta: { page, limit, hasNext } };
  }

  async findById(orgId: string, id: string): Promise<Schedule> {
    const doc = await this.couch.findById<Schedule>(orgId, id);
    if (!doc || doc._deleted) throw new NotFoundException(`일정 ${id}를 찾을 수 없습니다.`);
    return doc;
  }

  async update(orgId: string, id: string, dto: UpdateScheduleDto, userId: string): Promise<Schedule> {
    const schedule = await this.findById(orgId, id);
    return this.couch.update(orgId, {
      ...schedule,
      ...dto,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    });
  }

  async remove(orgId: string, id: string): Promise<void> {
    await this.findById(orgId, id);
    await this.couch.softDelete(orgId, id);
  }

  // ── 완료 처리 → 다음 발생일 자동 계산 ────────────────────────
  async complete(orgId: string, id: string, userId: string): Promise<Schedule> {
    const schedule = await this.findById(orgId, id);
    const now = new Date().toISOString();
    const next = this.calcNextOccurrence(schedule.nextOccurrence, schedule.recurrence);

    return this.couch.update(orgId, {
      ...schedule,
      lastOccurrence: schedule.nextOccurrence,
      nextOccurrence: next ?? schedule.nextOccurrence,
      isActive: next !== null,   // ONCE 타입은 완료 후 비활성화
      updatedAt: now,
      updatedBy: userId,
    });
  }

  // ── 기한 초과 일정 점검 + 알림 생성 ───────────────────────────
  async checkOverdue(orgId: string): Promise<{ checked: number; alerted: number }> {
    const { docs } = await this.couch.find<Schedule>(orgId, {
      docType: 'schedule',
      orgId,
      isActive: true,
    }, { limit: 500 });

    let alerted = 0;
    const now = Date.now();

    for (const sch of docs) {
      const next     = new Date(sch.nextOccurrence).getTime();
      const daysLeft = (next - now) / 86400000;

      if (daysLeft <= -(sch.overdueAlertDays)) {
        try {
          const created = await this.alerts.createIfNotExists(
            orgId,
            AlertType.INSPECTION_OVERDUE,
            sch._id,
            {
              complexId: sch.complexId,
              severity: SeverityLevel.MEDIUM,
              title: `점검 일정 기한 초과: ${sch.title}`,
              message: `예정일 ${sch.nextOccurrence.slice(0, 10)}에서 ${Math.abs(Math.floor(daysLeft))}일 초과됐습니다.`,
              sourceEntityType: 'schedule',
            },
            'system',
          );
          if (created) alerted++;
        } catch (e) {
          this.logger.warn(`기한초과 알림 생성 실패 ${sch._id}: ${e.message}`);
        }
      }
    }

    return { checked: docs.length, alerted };
  }

  // ── 다음 발생일 계산 유틸 ──────────────────────────────────────
  private calcNextOccurrence(current: string, recurrence: Recurrence): string | null {
    if (recurrence === 'ONCE') return null;

    const d = new Date(current);
    switch (recurrence) {
      case 'WEEKLY':    d.setDate(d.getDate() + 7);    break;
      case 'MONTHLY':   d.setMonth(d.getMonth() + 1);  break;
      case 'QUARTERLY': d.setMonth(d.getMonth() + 3);  break;
      case 'ANNUALLY':  d.setFullYear(d.getFullYear() + 1); break;
    }
    return d.toISOString();
  }
}
