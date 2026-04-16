import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { CouchService } from '../../database/couch.service';
import {
  InspectionProject, InspectionSession, InspectionStatus, SessionStatus,
  ChecklistItem, ChecklistTemplate,
} from '@ax/shared';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateProjectStatusDto, UpdateProjectAssignmentDto } from './dto/update-project.dto';
import { UpdateSessionStatusDto, ChecklistItemUpdateDto } from './dto/update-session.dto';

const PLATFORM_DB = '_platform';

/** Fallback template when no CouchDB template is found */
const BUILTIN_CHECKLIST: Omit<ChecklistItem, 'id' | 'result' | 'notes' | 'photoUrls'>[] = [
  { category: '구조체', description: '기초/기둥 균열 여부', order: 1 },
  { category: '구조체', description: '보/슬래브 처짐 및 균열', order: 2 },
  { category: '구조체', description: '내력벽 균열 및 변형', order: 3 },
  { category: '구조체', description: '계단 구조체 균열', order: 4 },
  { category: '외벽', description: '외벽 균열 (폭/길이 확인)', order: 5 },
  { category: '외벽', description: '외벽 타일 박리/탈락', order: 6 },
  { category: '외벽', description: '외벽 백태/부식', order: 7 },
  { category: '외벽', description: '창호 실링 상태', order: 8 },
  { category: '방수/누수', description: '지하주차장 천장 누수 흔적', order: 9 },
  { category: '방수/누수', description: '옥상 방수층 상태', order: 10 },
  { category: '방수/누수', description: '배관 주변 누수 여부', order: 11 },
  { category: '공용설비', description: '복도/계단 조명 상태', order: 12 },
  { category: '공용설비', description: '소화기/소방시설 점검', order: 13 },
  { category: '공용설비', description: '엘리베이터 홀/문 상태', order: 14 },
  { category: '마감', description: '복도 바닥 마감 파손', order: 15 },
  { category: '마감', description: '벽체 페인트 박리', order: 16 },
];

const SESSION_STATUS_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  [SessionStatus.DRAFT]:       [SessionStatus.ASSIGNED, SessionStatus.IN_PROGRESS],
  [SessionStatus.ASSIGNED]:    [SessionStatus.IN_PROGRESS, SessionStatus.DRAFT],
  [SessionStatus.IN_PROGRESS]: [SessionStatus.SUBMITTED],
  [SessionStatus.SUBMITTED]:   [SessionStatus.APPROVED, SessionStatus.IN_PROGRESS],
  [SessionStatus.APPROVED]:    [],
};

@Injectable()
export class ProjectsService {
  constructor(private readonly couch: CouchService) {}

  // ── Projects ──────────────────────────────────────────────────────────────

  async createProject(orgId: string, dto: CreateProjectDto, userId: string): Promise<InspectionProject> {
    const now = new Date().toISOString();
    const id = `inspectionProject:${orgId}:prj_${uuid().slice(0, 12)}`;

    const project: InspectionProject = {
      _id: id,
      docType: 'inspectionProject',
      orgId,
      complexId: dto.complexId,
      name: dto.name,
      round: dto.round,
      inspectionType: dto.inspectionType,
      status: InspectionStatus.PLANNED,
      plannedStartDate: dto.plannedStartDate,
      plannedEndDate: dto.plannedEndDate,
      leadInspectorId: dto.leadInspectorId,
      reviewerId: dto.reviewerId,
      description: dto.description,
      sessionIds: [],
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    };

    return this.couch.create(orgId, project);
  }

  async findProjectById(orgId: string, id: string): Promise<InspectionProject> {
    const doc = await this.couch.findById<InspectionProject>(orgId, id);
    if (!doc || doc._deleted) throw new NotFoundException(`Project ${id} not found`);
    return doc;
  }

  async findProjects(orgId: string, query: {
    complexId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const selector: Record<string, any> = { docType: 'inspectionProject', orgId };
    if (query.complexId) selector.complexId = query.complexId;
    if (query.status) selector.status = query.status;

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);

    const { docs } = await this.couch.find<InspectionProject>(orgId, selector, {
      limit: limit + 1,
      skip: (page - 1) * limit,
      sort: [{ createdAt: 'desc' }],
    });

    const hasNext = docs.length > limit;
    return { data: hasNext ? docs.slice(0, limit) : docs, meta: { page, limit, hasNext } };
  }

  async updateProjectStatus(
    orgId: string,
    id: string,
    dto: UpdateProjectStatusDto,
    userId: string,
  ): Promise<InspectionProject> {
    const project = await this.findProjectById(orgId, id);
    return this.couch.update(orgId, {
      ...project,
      ...(dto.status && { status: dto.status }),
      ...(dto.notes && { description: dto.notes }),
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    });
  }

  async updateProjectAssignment(
    orgId: string,
    id: string,
    dto: UpdateProjectAssignmentDto,
    userId: string,
  ): Promise<InspectionProject> {
    const project = await this.findProjectById(orgId, id);
    return this.couch.update(orgId, {
      ...project,
      ...(dto.leadInspectorId !== undefined && { leadInspectorId: dto.leadInspectorId }),
      ...(dto.reviewerId !== undefined && { reviewerId: dto.reviewerId }),
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    });
  }

  // ── Sessions ──────────────────────────────────────────────────────────────

  async createSession(
    orgId: string,
    projectId: string,
    dto: CreateSessionDto,
    userId: string,
  ): Promise<InspectionSession> {
    const project = await this.findProjectById(orgId, projectId);
    const now = new Date().toISOString();
    const sessionId = `inspectionSession:${orgId}:ses_${uuid().slice(0, 12)}`;

    // Load checklist from template if specified, else use builtin
    const templateItems = dto.checklistTemplateId
      ? await this.loadTemplateItems(dto.checklistTemplateId)
      : BUILTIN_CHECKLIST;

    const checklistItems: ChecklistItem[] = templateItems.map((t) => ({
      ...t,
      id: uuid(),
      result: null,
    }));

    const session: InspectionSession = {
      _id: sessionId,
      docType: 'inspectionSession',
      orgId,
      projectId,
      complexId: dto.complexId,
      buildingId: dto.buildingId,
      floorId: dto.floorId,
      zoneId: dto.zoneId,
      inspectorId: dto.inspectorId ?? userId,
      status: dto.inspectorId ? SessionStatus.ASSIGNED : SessionStatus.DRAFT,
      checklistTemplateId: dto.checklistTemplateId,
      checklistItems,
      defectCount: 0,
      weatherCondition: dto.weatherCondition,
      temperature: dto.temperature,
      humidity: dto.humidity,
      notes: dto.notes,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    };

    const saved = await this.couch.create(orgId, session);

    // Link session to project
    await this.couch.update(orgId, {
      ...project,
      sessionIds: [...(project.sessionIds ?? []), sessionId],
      status: InspectionStatus.IN_PROGRESS,
      actualStartDate: project.actualStartDate ?? now,
      updatedAt: now,
      updatedBy: userId,
    });

    return saved;
  }

  async findSessionsByProject(orgId: string, projectId: string): Promise<InspectionSession[]> {
    const { docs } = await this.couch.find<InspectionSession>(
      orgId,
      { docType: 'inspectionSession', orgId, projectId },
      { sort: [{ createdAt: 'asc' }] },
    );
    return docs;
  }

  async findSessionsByInspector(orgId: string, inspectorId: string): Promise<InspectionSession[]> {
    const { docs } = await this.couch.find<InspectionSession>(
      orgId,
      { docType: 'inspectionSession', orgId, inspectorId },
      { sort: [{ createdAt: 'desc' }], limit: 50 },
    );
    return docs;
  }

  async findSessionById(orgId: string, id: string): Promise<InspectionSession> {
    const doc = await this.couch.findById<InspectionSession>(orgId, id);
    if (!doc || doc._deleted) throw new NotFoundException(`Session ${id} not found`);
    return doc;
  }

  async getChecklist(orgId: string, sessionId: string): Promise<ChecklistItem[]> {
    const session = await this.findSessionById(orgId, sessionId);
    return session.checklistItems ?? [];
  }

  async updateSessionStatus(
    orgId: string,
    sessionId: string,
    dto: UpdateSessionStatusDto,
    userId: string,
  ): Promise<InspectionSession> {
    const session = await this.findSessionById(orgId, sessionId);

    if (dto.status) {
      const allowed = SESSION_STATUS_TRANSITIONS[session.status] ?? [];
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(
          `Cannot transition from ${session.status} to ${dto.status}. Allowed: [${allowed.join(', ')}]`,
        );
      }
    }

    const now = new Date().toISOString();
    const updates: Partial<InspectionSession> = {
      ...(dto.status && { status: dto.status }),
      ...(dto.notes && { notes: dto.notes }),
      updatedAt: now,
      updatedBy: userId,
    };

    // Timestamp fields
    if (dto.status === SessionStatus.IN_PROGRESS && !session.startedAt) {
      (updates as any).startedAt = now;
    }
    if (dto.status === SessionStatus.SUBMITTED) {
      (updates as any).submittedAt = now;
    }
    if (dto.status === SessionStatus.APPROVED) {
      (updates as any).approvedAt = now;
    }

    return this.couch.update(orgId, { ...session, ...updates });
  }

  async updateChecklist(
    orgId: string,
    sessionId: string,
    items: ChecklistItemUpdateDto[],
    userId: string,
  ): Promise<InspectionSession> {
    const session = await this.findSessionById(orgId, sessionId);
    const updateMap = new Map(items.map((i) => [i.id, i]));
    const updated: ChecklistItem[] = session.checklistItems.map((item) => {
      const u = updateMap.get(item.id);
      return u ? { ...item, result: u.result, notes: u.notes ?? item.notes } : item;
    });
    return this.couch.update(orgId, {
      ...session,
      checklistItems: updated,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    });
  }

  // ── Checklist Templates ───────────────────────────────────────────────────

  async listTemplates(): Promise<ChecklistTemplate[]> {
    const { docs } = await this.couch.find<ChecklistTemplate>(
      PLATFORM_DB,
      { docType: 'checklistTemplate', isActive: true },
      { limit: 50, sort: [{ createdAt: 'desc' }] },
    );
    return docs;
  }

  async findTemplateById(id: string): Promise<ChecklistTemplate> {
    const doc = await this.couch.findById<ChecklistTemplate>(PLATFORM_DB, id);
    if (!doc || doc._deleted) throw new NotFoundException(`Template ${id} not found`);
    return doc;
  }

  private async loadTemplateItems(templateId: string) {
    try {
      const tpl = await this.findTemplateById(templateId);
      return tpl.items;
    } catch {
      return BUILTIN_CHECKLIST;
    }
  }
}
