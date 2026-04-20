import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { v4 as uuid } from 'uuid';
import { CouchService } from '../../database/couch.service';
import {
  KPIRecord, Complaint, Defect, InspectionProject,
  ComplaintStatus, SeverityLevel,
} from '@ax/shared';

const CACHE_TTL = 30;

@Injectable()
export class KpiService {
  private readonly logger = new Logger(KpiService.name);
  private readonly computingKeys = new Set<string>();

  constructor(
    private readonly couch: CouchService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  // ── KPI 조회 (저장된 레코드) ──────────────────────────────────
  async findAll(orgId: string, complexId?: string, limit = 12) {
    const selector: Record<string, any> = { docType: 'kpiRecord', orgId };
    if (complexId) selector.complexId = complexId;

    const { docs } = await this.couch.find<KPIRecord>(orgId, selector, {
      limit,
      sort: [{ periodStart: 'desc' }],
    });
    return docs;
  }

  // ── KPI 실시간 계산 및 저장 ────────────────────────────────────
  async compute(orgId: string, complexId: string, periodStart: string, periodEnd: string): Promise<KPIRecord> {
    const [complaints, defects, projects] = await Promise.all([
      this.fetchComplaints(orgId, complexId, periodStart, periodEnd),
      this.fetchDefects(orgId, complexId, periodStart, periodEnd),
      this.fetchProjects(orgId, complexId, periodStart, periodEnd),
    ]);

    // ── 민원 KPI ─────────────────────────────────────────────────
    const totalComplaints    = complaints.length;
    const resolvedComplaints = complaints.filter(
      (c) => c.status === ComplaintStatus.RESOLVED || c.status === ComplaintStatus.CLOSED,
    ).length;

    const resolutionHours = complaints
      .filter((c) => c.resolvedAt && c.submittedAt)
      .map((c) => (new Date(c.resolvedAt!).getTime() - new Date(c.submittedAt).getTime()) / 3600000);
    const avgResolutionHours = resolutionHours.length
      ? parseFloat((resolutionHours.reduce((s, h) => s + h, 0) / resolutionHours.length).toFixed(1))
      : 0;

    const scores = complaints.filter((c) => c.satisfactionScore != null).map((c) => c.satisfactionScore!);
    const avgSatisfactionScore = scores.length
      ? parseFloat((scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(2))
      : undefined;

    // ── 점검 KPI ─────────────────────────────────────────────────
    const totalInspections     = projects.length;
    const completedInspections = projects.filter((p) => p.status === 'COMPLETED').length;
    const overdueInspections   = projects.filter(
      (p) => p.status !== 'COMPLETED' && p.status !== 'CANCELLED' &&
             p.plannedEndDate < new Date().toISOString(),
    ).length;

    const inspHours = projects
      .filter((p) => p.actualStartDate && p.actualEndDate)
      .map((p) =>
        (new Date(p.actualEndDate!).getTime() - new Date(p.actualStartDate!).getTime()) / 3600000,
      );
    const avgInspectionHours = inspHours.length
      ? parseFloat((inspHours.reduce((s, h) => s + h, 0) / inspHours.length).toFixed(1))
      : 0;

    // ── 결함 KPI ─────────────────────────────────────────────────
    const totalDefects    = defects.length;
    const criticalDefects = defects.filter((d) => d.severity === SeverityLevel.CRITICAL).length;
    const repairedDefects = defects.filter((d) => d.isRepaired).length;

    // ── 비용 KPI (연동 전: 기본값 0) ─────────────────────────────
    const preventiveMaintenanceCost = 0;
    const correctiveMaintenanceCost = 0;

    // ── 파생 지표 ─────────────────────────────────────────────────
    const complaintResolutionRate = totalComplaints
      ? parseFloat((resolvedComplaints / totalComplaints).toFixed(4))
      : 0;
    const inspectionCompletionRate = totalInspections
      ? parseFloat((completedInspections / totalInspections).toFixed(4))
      : 0;
    const defectRepairRate = totalDefects
      ? parseFloat((repairedDefects / totalDefects).toFixed(4))
      : 0;

    const now = new Date().toISOString();
    const id  = `kpiRecord:${orgId}:kpi_${uuid().slice(0, 12)}`;

    const record: KPIRecord = {
      _id: id,
      docType: 'kpiRecord',
      orgId,
      complexId,
      periodStart,
      periodEnd,
      totalComplaints,
      resolvedComplaints,
      avgResolutionHours,
      totalInspections,
      completedInspections,
      overdueInspections,
      avgInspectionHours,
      totalDefects,
      criticalDefects,
      repairedDefects,
      preventiveMaintenanceCost,
      correctiveMaintenanceCost,
      avgSatisfactionScore,
      complaintResolutionRate,
      inspectionCompletionRate,
      defectRepairRate,
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
      updatedBy: 'system',
    };

    return this.couch.create(orgId, record);
  }

  // ── 월별 자동 집계 (cron 연동용) ─────────────────────────────
  async computeCurrentMonth(orgId: string, complexId: string): Promise<KPIRecord> {
    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    return this.compute(orgId, complexId, start, end);
  }

  // ── 대시보드 요약 (최신 KPI + 현재 월 실시간 지표) ────────────
  async getSummary(orgId: string, complexId: string) {
    const cacheKey = `kpi:summary:${orgId}:${complexId ?? 'all'}`;
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
      // 저장된 최근 KPI 레코드
      const { docs: history } = await this.couch.find<KPIRecord>(orgId, {
        docType: 'kpiRecord',
        orgId,
        complexId,
      }, { limit: 6, sort: [{ periodStart: 'desc' }] });

      // 현재 월 실시간 집계
      const now   = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const end   = now.toISOString();

      const [complaints, defects] = await Promise.all([
        this.fetchComplaints(orgId, complexId, start, end),
        this.fetchDefects(orgId, complexId, start, end),
      ]);

      const result = {
        history,
        currentMonth: {
          totalComplaints: complaints.length,
          resolvedComplaints: complaints.filter(
            (c) => c.status === ComplaintStatus.RESOLVED || c.status === ComplaintStatus.CLOSED,
          ).length,
          totalDefects: defects.length,
          criticalDefects: defects.filter((d) => d.severity === SeverityLevel.CRITICAL).length,
          repairedDefects: defects.filter((d) => d.isRepaired).length,
        },
      };
      await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
      return result;
    } finally {
      this.computingKeys.delete(cacheKey);
    }
  }

  // ── 내부 헬퍼 ─────────────────────────────────────────────────
  private async fetchComplaints(orgId: string, complexId: string, from: string, to: string) {
    const { docs } = await this.couch.find<Complaint>(orgId, {
      docType: 'complaint',
      orgId,
      complexId,
      submittedAt: { $gte: from, $lte: to },
    }, { limit: 1000 });
    return docs;
  }

  private async fetchDefects(orgId: string, complexId: string, from: string, to: string) {
    const { docs } = await this.couch.find<Defect>(orgId, {
      docType: 'defect',
      orgId,
      complexId,
      createdAt: { $gte: from, $lte: to },
    }, { limit: 1000 });
    return docs;
  }

  private async fetchProjects(orgId: string, complexId: string, from: string, to: string) {
    const { docs } = await this.couch.find<InspectionProject>(orgId, {
      docType: 'inspectionProject',
      orgId,
      complexId,
      plannedStartDate: { $gte: from, $lte: to },
    }, { limit: 500 });
    return docs;
  }
}
