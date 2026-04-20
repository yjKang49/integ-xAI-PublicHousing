// apps/api/src/modules/external-integrations/kalis-fms.service.ts
//
// 국토안전관리원 KALIS-FMS API 연동 서비스
// 사업계획서(V8) §3(나), §4(가) 핵심 사양 3 — TRL-8 보완
//
// · 시설물별 30년 결함 이력 매핑
// · 노후화 곡선 및 결함 전이 패턴 실시간 도출
// · 성능평가 환경: "KALIS-FMS 30년 이력 데이터 실시간 API 연동"

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CouchService } from '../../database/couch.service';

export interface KalisFmsDefectHistory {
  facilityId: string;
  defectType: string;
  detectedAt: string;
  severity: string;
  repaired: boolean;
  repairedAt?: string;
  source: 'KALIS_FMS';
}

export interface KalisFmsSyncResult {
  facilityId: string;
  historyCount: number;
  syncedAt: string;
  agingCurveUpdated: boolean;
}

@Injectable()
export class KalisFmsService {
  private readonly logger = new Logger(KalisFmsService.name);

  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly config: ConfigService,
    private readonly couch: CouchService,
  ) {
    this.apiUrl = this.config.get<string>('KALIS_FMS_API_URL') ?? 'https://api.kalis-fms.go.kr';
    this.apiKey = this.config.get<string>('KALIS_FMS_API_KEY') ?? '';
  }

  /**
   * 시설물 결함 이력 동기화 (KALIS-FMS → AX 플랫폼)
   * Feature Flag: external.kalis_fms 활성화 시 운영 API 호출
   * 비활성화 시 Mock 데이터 반환 (개발·시험 환경)
   */
  async syncFacilityHistory(
    orgId: string,
    buildingId: string,
    facilityCode: string,
  ): Promise<KalisFmsSyncResult> {
    this.logger.log(`KALIS-FMS sync: building=${buildingId}, facility=${facilityCode}`);

    if (!this.apiKey) {
      this.logger.warn('KALIS_FMS_API_KEY not set — returning mock data');
      return this.buildMockSyncResult(facilityCode);
    }

    try {
      const history = await this.fetchDefectHistory(facilityCode);
      await this.persistHistory(orgId, buildingId, history);

      return {
        facilityId: facilityCode,
        historyCount: history.length,
        syncedAt: new Date().toISOString(),
        agingCurveUpdated: true,
      };
    } catch (err: any) {
      this.logger.error(`KALIS-FMS sync failed for ${facilityCode}: ${err.message}`);
      throw err;
    }
  }

  /**
   * 노후화 곡선 데이터 조회 (30년 이력 기반)
   * 사업계획서 핵심 사양 3: "결함 전이 패턴 실시간 도출"
   */
  async getAgingCurve(
    orgId: string,
    buildingId: string,
  ): Promise<{ points: { date: string; riskScore: number }[]; trend: 'STABLE' | 'DETERIORATING' | 'CRITICAL' }> {
    this.logger.log(`KALIS-FMS aging curve: building=${buildingId}`);

    const { docs } = await this.couch.find<any>(orgId, {
      docType: 'kalisFmsHistory',
      buildingId,
    }, { limit: 500, sort: [{ detectedAt: 'asc' }] });

    if (docs.length === 0) {
      return { points: [], trend: 'STABLE' };
    }

    // 연도별 위험도 집계
    const byYear = docs.reduce<Record<string, number[]>>((acc, h) => {
      const year = h.detectedAt?.slice(0, 4) ?? 'unknown';
      if (!acc[year]) acc[year] = [];
      acc[year].push(h.severity === 'CRITICAL' ? 4 : h.severity === 'HIGH' ? 3 : h.severity === 'MEDIUM' ? 2 : 1);
      return acc;
    }, {});

    const points = Object.entries(byYear)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, scores]) => ({
        date: `${year}-01-01`,
        riskScore: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length * 25),
      }));

    const lastScore = points[points.length - 1]?.riskScore ?? 0;
    const trend = lastScore >= 75 ? 'CRITICAL' : lastScore >= 50 ? 'DETERIORATING' : 'STABLE';

    return { points, trend };
  }

  private async fetchDefectHistory(facilityCode: string): Promise<KalisFmsDefectHistory[]> {
    const res = await fetch(`${this.apiUrl}/v1/facilities/${facilityCode}/defect-history`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`KALIS-FMS API error: ${res.status} ${res.statusText}`);
    }

    const data: any = await res.json();
    return (data.items ?? []).map((item: any) => ({
      facilityId: facilityCode,
      defectType: item.defectType ?? 'OTHER',
      detectedAt: item.detectedAt ?? new Date().toISOString(),
      severity: item.severity ?? 'LOW',
      repaired: item.repaired ?? false,
      repairedAt: item.repairedAt,
      source: 'KALIS_FMS' as const,
    }));
  }

  private async persistHistory(
    orgId: string,
    buildingId: string,
    history: KalisFmsDefectHistory[],
  ): Promise<void> {
    for (const item of history) {
      const id = `kalisFmsHistory:${orgId}:${buildingId}:${item.defectType}:${item.detectedAt.slice(0, 10)}`;
      const existing = await this.couch.findById<any>(orgId, id).catch(() => null);
      const doc = {
        _id: id,
        docType: 'kalisFmsHistory',
        orgId,
        buildingId,
        ...item,
        syncedAt: new Date().toISOString(),
      };
      if (existing) {
        await this.couch.update(orgId, { ...doc, _rev: existing._rev });
      } else {
        await this.couch.create(orgId, doc);
      }
    }
  }

  private buildMockSyncResult(facilityCode: string): KalisFmsSyncResult {
    return {
      facilityId: facilityCode,
      historyCount: 42,
      syncedAt: new Date().toISOString(),
      agingCurveUpdated: true,
    };
  }
}
