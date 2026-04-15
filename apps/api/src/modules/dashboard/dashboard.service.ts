// apps/api/src/modules/dashboard/dashboard.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { CouchService } from '../../database/couch.service';
import { DashboardResponse } from '@ax/shared';

const CACHE_TTL = 60; // seconds

@Injectable()
export class DashboardService {
  constructor(
    private readonly couch: CouchService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async getDashboard(orgId: string, complexId?: string): Promise<DashboardResponse> {
    const cacheKey = `dashboard:${orgId}:${complexId ?? 'all'}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const data = await this.computeDashboard(orgId, complexId);
    await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(data));
    return data;
  }

  private async computeDashboard(orgId: string, complexId?: string): Promise<DashboardResponse> {
    const baseFilter = complexId ? { complexId } : {};

    // --- Defect counts ---
    const { docs: criticalDefects } = await this.couch.find(orgId, {
      docType: 'defect', orgId, ...baseFilter, severity: 'CRITICAL', isRepaired: false,
    }, { limit: 0 });
    const { docs: highDefects } = await this.couch.find(orgId, {
      docType: 'defect', orgId, ...baseFilter, severity: 'HIGH', isRepaired: false,
    }, { limit: 0 });
    const { docs: unrepairedDefects } = await this.couch.find(orgId, {
      docType: 'defect', orgId, ...baseFilter, isRepaired: false,
    }, { limit: 0 });

    // --- Alerts ---
    const { docs: activeAlerts } = await this.couch.find(orgId, {
      docType: 'alert', orgId, ...baseFilter, status: 'ACTIVE',
    }, { limit: 100 });

    // --- Complaints ---
    const { docs: pendingComplaints } = await this.couch.find(orgId, {
      docType: 'complaint', orgId, ...baseFilter,
      status: { $in: ['RECEIVED', 'ASSIGNED'] },
    }, { limit: 0 });
    const now = new Date().toISOString();
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const { docs: overdueComplaints } = await this.couch.find(orgId, {
      docType: 'complaint', orgId, ...baseFilter,
      status: { $nin: ['RESOLVED', 'CLOSED'] },
      dueDate: { $lt: now },
    }, { limit: 0 });

    // --- Resolved complaints (for avg resolution time) ---
    const { docs: resolvedComplaints } = await this.couch.find<{ submittedAt: string; resolvedAt: string }>(orgId, {
      docType: 'complaint', orgId, ...baseFilter,
      status: { $in: ['RESOLVED', 'CLOSED'] },
      resolvedAt: { $gt: '' },
    }, { limit: 500, fields: ['submittedAt', 'resolvedAt'] });

    const avgResolutionHours = resolvedComplaints.length > 0
      ? Math.round(
          resolvedComplaints.reduce((sum: number, c: any) => {
            const diffMs = new Date(c.resolvedAt).getTime() - new Date(c.submittedAt).getTime();
            return sum + diffMs / (1000 * 60 * 60);
          }, 0) / resolvedComplaints.length,
        )
      : 0;

    // --- Projects ---
    const { docs: activeProjects } = await this.couch.find(orgId, {
      docType: 'inspectionProject', orgId, ...baseFilter,
      status: { $in: ['PLANNED', 'IN_PROGRESS', 'PENDING_REVIEW'] },
    }, { limit: 0 });

    // --- Overdue inspections & completed this month ---
    const { docs: allSessions } = await this.couch.find(orgId, {
      docType: 'inspectionSession', orgId, ...baseFilter,
    }, { limit: 1000, fields: ['status', 'scheduledDate', 'completedAt'] });

    const overdueInspections = allSessions.filter((s: any) =>
      s.status !== 'COMPLETED' && s.scheduledDate && s.scheduledDate < now,
    ).length;

    const completedThisMonth = allSessions.filter((s: any) =>
      s.status === 'COMPLETED' && s.completedAt && s.completedAt >= monthStart,
    ).length;

    // --- Crack threshold exceedances ---
    const { docs: thresholdExceedances } = await this.couch.find(orgId, {
      docType: 'crackMeasurement', orgId, ...baseFilter, exceedsThreshold: true,
    }, { limit: 200 });

    const { docs: activeGaugePoints } = await this.couch.find(orgId, {
      docType: 'crackGaugePoint', orgId, ...baseFilter, isActive: true,
    }, { limit: 0 });

    // --- Crack threshold alerts (specific CRACK_THRESHOLD type) ---
    const { docs: crackAlerts } = await this.couch.find(orgId, {
      docType: 'alert', orgId, ...baseFilter,
      alertType: 'CRACK_THRESHOLD', status: 'ACTIVE',
    }, { limit: 100 });

    // --- Crack trend (last 7 measurements per active gauge) ---
    const { docs: recentMeasurements } = await this.couch.find(orgId, {
      docType: 'crackMeasurement', orgId, ...baseFilter,
    }, { limit: 500, sort: [{ measuredAt: 'desc' }], fields: ['gaugePointId', 'widthMm', 'measuredAt', 'exceedsThreshold'] });

    // Group by gaugePointId, keep last 7 per gauge
    const gaugeMap = new Map<string, { widthMm: number; measuredAt: string; exceedsThreshold: boolean }[]>();
    for (const m of recentMeasurements as any[]) {
      const arr = gaugeMap.get(m.gaugePointId) ?? [];
      if (arr.length < 7) arr.push({ widthMm: m.widthMm, measuredAt: m.measuredAt, exceedsThreshold: m.exceedsThreshold });
      gaugeMap.set(m.gaugePointId, arr);
    }
    const crackTrendSummary = Array.from(gaugeMap.entries()).map(([gaugePointId, measurements]) => {
      const latestMm = measurements[0]?.widthMm ?? 0;
      const oldestMm = measurements[measurements.length - 1]?.widthMm ?? latestMm;
      const trend: 'UP' | 'STABLE' | 'DOWN' =
        latestMm > oldestMm ? 'UP' : latestMm < oldestMm ? 'DOWN' : 'STABLE';
      return { gaugeId: gaugePointId, name: gaugePointId, latestMm, trend };
    });

    // --- Defect distribution by type ---
    const { docs: allDefects } = await this.couch.find(orgId, {
      docType: 'defect', orgId, ...baseFilter,
    }, { limit: 1000, fields: ['defectType', 'isRepaired'] });

    const defectTypeMap = allDefects.reduce((acc: Record<string, number>, d: any) => {
      acc[d.defectType] = (acc[d.defectType] ?? 0) + 1;
      return acc;
    }, {});

    const totalDefects = allDefects.length;
    const complaintTotal = pendingComplaints.length + resolvedComplaints.length + overdueComplaints.length;
    const totalSessions = allSessions.length;

    // --- preventiveMaintenanceSavingsEstimate ---
    // 조기 발견 결함(MEDIUM/LOW) × 긴급 보수 대비 절감 추산
    const earlyFoundDefects = allDefects.filter(
      (d: any) => d.severity === 'MEDIUM' || d.severity === 'LOW',
    ).length;
    // 긴급 보수 평균 200만원, 예방 보수는 30% 수준 → 절감 = 결함수 × 140만원
    const preventiveMaintenanceSavingsEstimate = earlyFoundDefects * 1_400_000;

    return {
      criticalDefects: criticalDefects.length,
      highDefects: highDefects.length,
      unrepairedDefects: unrepairedDefects.length,
      activeAlerts: activeAlerts.length,
      pendingComplaints: pendingComplaints.length,
      overdueComplaints: overdueComplaints.length,
      avgResolutionHours,
      activeProjects: activeProjects.length,
      overdueInspections,
      completedThisMonth,
      thresholdExceedances: thresholdExceedances.length,
      activeGaugePoints: activeGaugePoints.length,
      crackAlertCount: crackAlerts.length,
      complaintResolutionRate: complaintTotal > 0
        ? Math.round((resolvedComplaints.length / complaintTotal) * 100)
        : 0,
      inspectionCompletionRate: totalSessions > 0
        ? Math.round((completedThisMonth / totalSessions) * 100)
        : 0,
      defectRepairRate: totalDefects > 0
        ? Math.round(((totalDefects - unrepairedDefects.length) / totalDefects) * 100)
        : 100,
      preventiveMaintenanceSavingsEstimate,
      recentAlerts: activeAlerts.slice(0, 5).map((a: any) => ({
        id: a._id,
        title: a.title,
        severity: a.severity,
        createdAt: a.createdAt,
      })),
      recentComplaints: pendingComplaints.slice(0, 5).map((c: any) => ({
        id: c._id,
        title: c.title,
        status: c.status,
        submittedAt: c.submittedAt,
      })),
      defectsByType: Object.entries(defectTypeMap).map(([type, count]) => ({ type, count })),
      crackTrendSummary,
    };
  }
}
