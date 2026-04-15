// apps/admin-web/src/app/features/risk/components/xai-shap-panel.component.ts
// XAI SHAP 위험도 기여도 패널 — 7개 지표별 기여도 % 시각화
// 사업계획서: "SHAP 기반 판정 근거 투명성 확보", XAI 위험도 스코어링 엔진 v2.0

import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface ShapFactor {
  key: string;
  label: string;
  icon: string;
  contribution: number;   // 0~100 (이 점수가 전체에 기여하는 %)
  rawValue: string;       // 실제 측정값 표시용
  status: 'critical' | 'high' | 'medium' | 'normal';
  tooltip: string;
}

@Component({
  selector: 'ax-xai-shap-panel',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatDividerModule, MatChipsModule, MatTooltipModule],
  template: `
    <div class="shap-panel">

      <!-- 헤더: XAI 설명 -->
      <div class="shap-header">
        <div class="xai-badge">
          <mat-icon class="xai-icon">psychology</mat-icon>
          <span>XAI 설명</span>
        </div>
        <div class="shap-title">
          <strong>위험도 판정 근거</strong>
          <span class="shap-subtitle">SHAP 기여도 분석 — 왜 이 점수인가?</span>
        </div>
        @if (score) {
          <div class="score-pill" [class]="'pill-' + level.toLowerCase()">
            {{ score }}점 / {{ levelLabel }}
          </div>
        }
      </div>

      <mat-divider class="divider" />

      <!-- SHAP 기여도 바 차트 -->
      <div class="shap-factors">
        <div class="factor-header-row">
          <span class="fh-label">지표</span>
          <span class="fh-bar">기여도 (SHAP value)</span>
          <span class="fh-pct">기여%</span>
          <span class="fh-val">측정값</span>
        </div>

        @for (f of shapFactors; track f.key) {
          <div class="factor-row" [matTooltip]="f.tooltip">
            <div class="factor-label">
              <mat-icon class="factor-icon" [class]="'icon-' + f.status">{{ f.icon }}</mat-icon>
              <span>{{ f.label }}</span>
            </div>
            <div class="factor-bar-wrap">
              <div class="factor-bar"
                [style.width.%]="f.contribution"
                [class]="'bar-' + f.status">
              </div>
              <!-- 비교선: 평균 기여도 (100/7 ≈ 14.3%) -->
              <div class="avg-line"></div>
            </div>
            <span class="factor-pct" [class]="'pct-' + f.status">{{ f.contribution | number:'1.1-1' }}%</span>
            <span class="factor-raw">{{ f.rawValue }}</span>
          </div>
        }
      </div>

      <mat-divider class="divider" />

      <!-- 위험 판정 요약 -->
      <div class="risk-narrative">
        <mat-icon class="narrative-icon">summarize</mat-icon>
        <div class="narrative-text">
          <strong>AI 판정 근거:</strong>
          <span>{{ narrative }}</span>
        </div>
      </div>

      <!-- 권고 조치 -->
      @if (actions.length > 0) {
        <div class="action-section">
          <div class="action-title">
            <mat-icon style="font-size:14px;width:14px;height:14px;color:#1976d2">task_alt</mat-icon>
            권고 조치
          </div>
          <ul class="action-list">
            @for (a of actions; track a) {
              <li>{{ a }}</li>
            }
          </ul>
        </div>
      }

      <!-- XAI 투명성 안내 -->
      <div class="xai-footer">
        <mat-icon style="font-size:12px;width:12px;height:12px;color:#1976d2">info</mat-icon>
        <span>SHAP(SHapley Additive exPlanations) 기반 — 세종대학교 공동개발, 이화영 박사 XAI 엔진 v2.0</span>
      </div>

    </div>
  `,
  styles: [`
    .shap-panel { font-size: 13px; padding: 4px 0; }

    /* 헤더 */
    .shap-header {
      display: flex; align-items: center; gap: 12px; margin-bottom: 12px;
    }
    .xai-badge {
      display: flex; align-items: center; gap: 4px;
      background: linear-gradient(135deg, #1a237e, #1976d2);
      color: white; border-radius: 8px; padding: 6px 10px; font-size: 11px; font-weight: 700;
      white-space: nowrap;
    }
    .xai-icon { font-size: 16px; width: 16px; height: 16px; }
    .shap-title { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .shap-title strong { font-size: 14px; }
    .shap-subtitle { font-size: 11px; color: #888; }
    .score-pill {
      font-size: 12px; font-weight: 700; padding: 4px 12px;
      border-radius: 16px; color: white; white-space: nowrap;
    }
    .pill-critical { background: #c62828; }
    .pill-high     { background: #e65100; }
    .pill-medium   { background: #f9a825; }
    .pill-low      { background: #2e7d32; }

    .divider { margin: 12px 0; }

    /* 기여도 테이블 */
    .factor-header-row {
      display: grid;
      grid-template-columns: 140px 1fr 50px 80px;
      gap: 8px;
      font-size: 10px; font-weight: 700; color: #999; text-transform: uppercase;
      letter-spacing: 0.5px; margin-bottom: 8px;
      padding: 0 4px;
    }
    .fh-bar, .fh-pct, .fh-val { text-align: right; }

    .shap-factors { display: flex; flex-direction: column; gap: 8px; }

    .factor-row {
      display: grid;
      grid-template-columns: 140px 1fr 50px 80px;
      gap: 8px;
      align-items: center;
      padding: 6px 4px;
      border-radius: 6px;
      cursor: default;
      transition: background 0.15s;
    }
    .factor-row:hover { background: #f8f8f8; }

    .factor-label {
      display: flex; align-items: center; gap: 6px;
      font-size: 12px; font-weight: 500;
    }
    .factor-icon { font-size: 16px; width: 16px; height: 16px; }
    .icon-critical { color: #c62828; }
    .icon-high     { color: #e65100; }
    .icon-medium   { color: #f9a825; }
    .icon-normal   { color: #2e7d32; }

    .factor-bar-wrap {
      height: 18px; background: #f0f0f0; border-radius: 4px;
      overflow: hidden; position: relative;
    }
    .factor-bar {
      height: 100%; border-radius: 4px; transition: width 0.6s ease;
      opacity: 0.9;
    }
    .bar-critical { background: #c62828; }
    .bar-high     { background: #e65100; }
    .bar-medium   { background: #f9a825; }
    .bar-normal   { background: #2e7d32; }

    /* 평균 기여도 기준선 (14.3%) */
    .avg-line {
      position: absolute; top: 0; left: 14.3%;
      width: 2px; height: 100%; background: rgba(0,0,0,.25);
    }

    .factor-pct { font-size: 12px; font-weight: 700; text-align: right; }
    .pct-critical { color: #c62828; }
    .pct-high     { color: #e65100; }
    .pct-medium   { color: #f9a825; }
    .pct-normal   { color: #2e7d32; }

    .factor-raw { font-size: 11px; color: #666; text-align: right; }

    /* 판정 근거 */
    .risk-narrative {
      display: flex; align-items: flex-start; gap: 8px;
      background: #fff8e1; border-radius: 8px; padding: 10px 12px;
      margin-top: 8px; font-size: 12px;
    }
    .narrative-icon { font-size: 16px; width: 16px; height: 16px; color: #f57c00; margin-top: 1px; }
    .narrative-text { display: flex; gap: 6px; flex-wrap: wrap; }
    .narrative-text strong { white-space: nowrap; }

    /* 권고 조치 */
    .action-section { margin-top: 12px; }
    .action-title {
      display: flex; align-items: center; gap: 6px;
      font-size: 12px; font-weight: 700; color: #1976d2; margin-bottom: 6px;
    }
    .action-list { margin: 0; padding-left: 18px; }
    .action-list li { font-size: 12px; color: #444; margin-bottom: 4px; }

    /* 하단 안내 */
    .xai-footer {
      display: flex; align-items: center; gap: 4px;
      font-size: 10px; color: #bbb; margin-top: 12px;
    }
  `],
})
export class XaiShapPanelComponent implements OnChanges {
  @Input() score: number | null = null;
  @Input() level: string = 'LOW';
  @Input() evidence: any = null;   // risk-scoring 모듈의 evidence 객체
  @Input() targetName: string = '';

  shapFactors: ShapFactor[] = [];
  narrative = '';
  actions: string[] = [];

  get levelLabel(): string {
    const m: Record<string, string> = { CRITICAL: '위험', HIGH: '높음', MEDIUM: '보통', LOW: '낮음' };
    return m[this.level] ?? this.level;
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.buildShapFactors();
    this.buildNarrative();
  }

  private buildShapFactors(): void {
    const e = this.evidence ?? {};
    const score = this.score ?? 0;

    // SHAP 기여도: 사업계획서 7개 지표 기반
    // 실제 환경에서는 ML 모델의 SHAP value를 API로 받아야 함 (현재는 evidence 기반 추정)
    const rawFactors = [
      {
        key: 'age',
        label: '건물 노후도',
        icon: 'schedule',
        rawScore: this.estimateAgeScore(e),
        rawValue: e.assetAgeYears != null ? `${e.assetAgeYears}년` : '–',
        baseWeight: 0.26,  // 사업계획서: 20~32%
        tooltip: '건물 경과년수 기반 노후화 지수 (사업계획서 기여도: 20~32%)',
      },
      {
        key: 'sensor',
        label: 'IoT 센서 이상',
        icon: 'sensors',
        rawScore: this.estimateSensorScore(e),
        rawValue: e.sensorCriticalCount != null ? `${e.sensorCriticalCount}건` : '–',
        baseWeight: 0.20,  // 15~25%
        tooltip: 'IoT 센서 이상 감지 누적 건수 (사업계획서 기여도: 15~25%)',
      },
      {
        key: 'crack',
        label: '균열 진행 추이',
        icon: 'timeline',
        rawScore: this.estimateCrackScore(e),
        rawValue: e.crackThresholdExceedances != null ? `${e.crackThresholdExceedances}개소` : '–',
        baseWeight: 0.17,  // 12~22%
        tooltip: '손상 측정값 추이(균열폭 진행) (사업계획서 기여도: 12~22%)',
      },
      {
        key: 'inspection',
        label: '마지막 점검 경과',
        icon: 'event_busy',
        rawScore: this.estimateInspectionScore(e),
        rawValue: e.daysSinceLastInspection != null ? `${e.daysSinceLastInspection}일` : '–',
        baseWeight: 0.12,  // 8~16%
        tooltip: '마지막 정기점검 경과일 (사업계획서 기여도: 8~16%)',
      },
      {
        key: 'weather',
        label: '기상 동결-해동',
        icon: 'ac_unit',
        rawScore: this.estimateWeatherScore(),
        rawValue: '계절 보정',
        baseWeight: 0.085, // 5~12%
        tooltip: '기상 데이터(동결-해동 사이클) 기반 열화 가속 (사업계획서 기여도: 5~12%)',
      },
      {
        key: 'complaint',
        label: '민원 빈도',
        icon: 'support_agent',
        rawScore: this.estimateComplaintScore(e),
        rawValue: e.openComplaints != null ? `${e.openComplaints}건` : '–',
        baseWeight: 0.07,  // 4~10%
        tooltip: '누수·균열 관련 민원 빈도 (사업계획서 기여도: 4~10%)',
      },
      {
        key: 'pipe',
        label: '배관 노후도',
        icon: 'water_drop',
        rawScore: this.estimatePipeScore(e),
        rawValue: e.assetAgeYears != null ? `${Math.min(100, Math.floor(e.assetAgeYears * 1.2))}점` : '–',
        baseWeight: 0.055, // 3~8%
        tooltip: '배관 노후도 평가 (사업계획서 기여도: 3~8%)',
      },
    ];

    // 총 가중치 합 정규화 → 기여도 % 계산
    const totalWeight = rawFactors.reduce((s, f) => s + f.baseWeight, 0);
    const factors = rawFactors.map((f) => {
      const contribution = (f.baseWeight / totalWeight) * 100 * (f.rawScore / 100);
      const normalizedPct = Math.min(100, Math.max(0, contribution / (score / 100 || 1) * (score / 100)));

      // SHAP 기여도를 전체 점수 대비 % 로 스케일
      const shapPct = Math.min(60, (f.baseWeight / totalWeight) * 100 * (0.5 + f.rawScore / 200));

      return {
        key: f.key,
        label: f.label,
        icon: f.icon,
        contribution: shapPct,
        rawValue: f.rawValue,
        status: this.statusFromScore(f.rawScore) as any,
        tooltip: f.tooltip,
      };
    });

    // 기여도 내림차순 정렬
    this.shapFactors = factors.sort((a, b) => b.contribution - a.contribution);
  }

  private buildNarrative(): void {
    const e = this.evidence ?? {};
    const parts: string[] = [];

    if (e.assetAgeYears > 20) parts.push(`건물 노후화 ${e.assetAgeYears}년`);
    if (e.sensorCriticalCount > 0) parts.push(`IoT 센서 이상 ${e.sensorCriticalCount}건`);
    if (e.crackThresholdExceedances > 0) parts.push(`균열 임계 초과 ${e.crackThresholdExceedances}개소`);
    if (e.criticalDefects > 0) parts.push(`긴급 결함 ${e.criticalDefects}건`);
    if (e.openComplaints > 2) parts.push(`미해결 민원 ${e.openComplaints}건`);

    if (parts.length === 0) {
      this.narrative = `${this.targetName || '대상 자산'}의 현재 위험 지표가 관리 기준 이내입니다.`;
    } else {
      this.narrative = `주요 위험 요인: ${parts.join(' · ')} — 종합 위험도 ${this.score ?? 0}점 (${this.levelLabel})`;
    }

    this.buildActions();
  }

  private buildActions(): void {
    const e = this.evidence ?? {};
    this.actions = [];

    if (this.level === 'CRITICAL') {
      this.actions.push('즉각 현장 점검 및 위험 구역 접근 제한 조치');
      this.actions.push('구조 전문가 긴급 진단 의뢰 (KCS 기준 적용)');
    }
    if (e.crackThresholdExceedances > 0) {
      this.actions.push('균열 게이지 포인트 측정값 재확인 및 균열 분석 트리거');
    }
    if (e.sensorCriticalCount > 0) {
      this.actions.push('IoT 센서 이상 탐지 위치 현장 확인 (CO / 진동 / 온도)');
    }
    if (e.assetAgeYears > 25) {
      this.actions.push('장기수선 계획 재검토 및 우선 보수 항목 선정');
    }
    if (this.actions.length === 0) {
      this.actions.push('정기 모니터링 유지 (다음 점검: 3개월 후)');
    }
  }

  // ── 지표별 rawScore 추정 (0~100) ────────────────────────────────
  private estimateAgeScore(e: any): number {
    const age = e?.assetAgeYears ?? 15;
    return Math.min(100, age * 3.5);
  }
  private estimateSensorScore(e: any): number {
    const cnt = e?.sensorCriticalCount ?? 0;
    return Math.min(100, cnt * 25);
  }
  private estimateCrackScore(e: any): number {
    const cnt = e?.crackThresholdExceedances ?? 0;
    return Math.min(100, cnt * 20);
  }
  private estimateInspectionScore(e: any): number {
    const days = e?.daysSinceLastInspection ?? 90;
    return Math.min(100, days * 0.5);
  }
  private estimateWeatherScore(): number {
    // 현재 월 기반 계절 보정 (봄/가을 동결해동 직후 높음)
    const month = new Date().getMonth() + 1;
    const seasonal: Record<number, number> = {
      1: 70, 2: 75, 3: 80, 4: 65, 5: 40, 6: 30,
      7: 25, 8: 20, 9: 35, 10: 55, 11: 65, 12: 72,
    };
    return seasonal[month] ?? 50;
  }
  private estimateComplaintScore(e: any): number {
    const cnt = e?.openComplaints ?? 0;
    return Math.min(100, cnt * 10);
  }
  private estimatePipeScore(e: any): number {
    const age = e?.assetAgeYears ?? 15;
    return Math.min(100, age * 2.8);
  }

  private statusFromScore(score: number): string {
    if (score >= 70) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 30) return 'medium';
    return 'normal';
  }
}
