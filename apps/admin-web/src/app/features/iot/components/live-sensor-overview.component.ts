// apps/admin-web/src/app/features/iot/components/live-sensor-overview.component.ts
// IoT 5센서 실시간 모니터링 개요 — 사업계획서 PAGE 5 구현
// 온도·습도·전력·진동·CO 5개 센서 + 임계값 경고 + AI 이상탐지 상태

import {
  Component, OnInit, OnDestroy, Input, Output, EventEmitter, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';

export interface LiveSensorConfig {
  type: string;
  label: string;
  icon: string;
  unit: string;
  warnThreshold: number;
  criticalThreshold: number;
  color: string;
  min: number;
  max: number;
  aiNote: string;       // AI 탐지 관련 설명
  actionNote: string;   // 임계치 초과 시 자동 조치
}

export interface LiveSensorData {
  sensorType: string;
  currentValue: number;
  status: 'normal' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  lastUpdated: Date;
  history: number[];    // 최근 12개 값 (미니 스파크라인용)
  aiAnomalyScore?: number;   // 0~1 (AI 이상탐지 점수)
  aiAnomaly?: boolean;       // AI 이상 탐지 여부
}

export const SENSOR_CONFIGS: LiveSensorConfig[] = [
  {
    type: 'TEMPERATURE', label: '온도', icon: 'thermostat',
    unit: '°C', warnThreshold: 32, criticalThreshold: 35,
    color: '#e65100', min: 15, max: 45,
    aiNote: 'LSTM 시계열 예측 — 이상 급등 전 선제 경보',
    actionNote: '35°C 초과 시 담당자 문자 + 냉방 자동 강화',
  },
  {
    type: 'HUMIDITY', label: '습도', icon: 'water_drop',
    unit: '%', warnThreshold: 80, criticalThreshold: 85,
    color: '#0288d1', min: 30, max: 95,
    aiNote: 'AutoEncoder 기반 이상 패턴 탐지',
    actionNote: '85% 초과 시 환기 개선 권고 + 곰팡이 위험 경보',
  },
  {
    type: 'POWER', label: '전력', icon: 'bolt',
    unit: 'kWh', warnThreshold: 15, criticalThreshold: 20,
    color: '#f9a825', min: 0, max: 30,
    aiNote: 'RL 기반 HVAC 최적 제어 — 에너지 14% 절감',
    actionNote: '통상 3배 초과 시 에너지팀 확인 + RL 제어 개입',
  },
  {
    type: 'VIBRATION', label: '진동', icon: 'vibration',
    unit: 'g', warnThreshold: 0.3, criticalThreshold: 0.5,
    color: '#c62828', min: 0, max: 1,
    aiNote: 'Isolation Forest — 구조적 이상 진동 식별',
    actionNote: '0.5g 초과 시 구조 전문가 즉시 요청',
  },
  {
    type: 'CO', label: 'CO 농도', icon: 'air',
    unit: 'ppm', warnThreshold: 8, criticalThreshold: 10,
    color: '#6a1b9a', min: 0, max: 20,
    aiNote: '1D-CNN — CO 이상 농도 패턴 분류',
    actionNote: '10ppm 초과 시 환기팀 즉시 출동 + 입주민 대피 안내',
  },
];

/** 데모용 시뮬레이션 데이터 생성 */
function generateMockSensorData(config: LiveSensorConfig): LiveSensorData {
  // 현실적인 공공임대주택 센서값 범위로 생성
  const baseValues: Record<string, number> = {
    TEMPERATURE: 26, HUMIDITY: 65, POWER: 8, VIBRATION: 0.05, CO: 3,
  };
  const noise: Record<string, number> = {
    TEMPERATURE: 6, HUMIDITY: 20, POWER: 8, VIBRATION: 0.25, CO: 7,
  };

  const base = baseValues[config.type] ?? config.min;
  const n = noise[config.type] ?? 1;
  const history = Array.from({ length: 12 }, (_, i) =>
    Math.max(config.min, Math.min(config.max, base + (Math.random() - 0.45) * n * (1 + i * 0.05)))
  );
  const current = history[history.length - 1];

  let status: 'normal' | 'warning' | 'critical' = 'normal';
  if (current >= config.criticalThreshold) status = 'critical';
  else if (current >= config.warnThreshold) status = 'warning';

  const prev = history[history.length - 2] ?? current;
  const trend = current > prev + 0.5 ? 'up' : current < prev - 0.5 ? 'down' : 'stable';

  const aiAnomalyScore = status === 'critical' ? 0.8 + Math.random() * 0.2
    : status === 'warning' ? 0.4 + Math.random() * 0.3
    : Math.random() * 0.2;

  return {
    sensorType: config.type,
    currentValue: current,
    status,
    trend,
    lastUpdated: new Date(),
    history,
    aiAnomalyScore,
    aiAnomaly: aiAnomalyScore > 0.5,
  };
}

@Component({
  selector: 'ax-live-sensor-overview',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatIconModule, MatChipsModule, MatTooltipModule, MatButtonModule],
  template: `
    <div class="live-header">
      <div class="live-title">
        <mat-icon class="live-pulse-icon">sensors</mat-icon>
        <span>IoT 실시간 센서 모니터링</span>
        <span class="live-badge">LIVE</span>
      </div>
      <div class="live-meta">
        <span class="last-update">마지막 갱신: {{ lastUpdate() | date:'HH:mm:ss' }}</span>
        <span class="update-interval">30초 자동 갱신</span>
      </div>
    </div>

    <!-- AI 이상탐지 경보 배너 -->
    @if (criticalSensors().length > 0) {
      <div class="alert-banner critical-banner">
        <mat-icon>warning</mat-icon>
        <strong>AI 이상 탐지:</strong>
        {{ criticalSensors().join(' · ') }} — 즉각 조치 필요
        <button mat-button style="color:white;margin-left:auto" routerLink="/alerts">경보 관리</button>
      </div>
    } @else if (warningSensors().length > 0) {
      <div class="alert-banner warning-banner">
        <mat-icon>notifications</mat-icon>
        <strong>주의:</strong>
        {{ warningSensors().join(' · ') }} — 임계값 초과 모니터링 중
      </div>
    }

    <!-- 5센서 카드 그리드 -->
    <div class="sensor-overview-grid">
      @for (config of sensorConfigs; track config.type) {
        @if (getSensorData(config.type); as data) {
          <div class="sensor-live-card"
            [class.card-warning]="data.status === 'warning'"
            [class.card-critical]="data.status === 'critical'"
            (click)="sensorClick.emit({ config, data })"
            [matTooltip]="config.aiNote">

            <!-- 카드 헤더 -->
            <div class="slc-header">
              <mat-icon class="slc-icon" [style.color]="config.color">{{ config.icon }}</mat-icon>
              <span class="slc-label">{{ config.label }}</span>
              <div class="slc-status">
                <span class="status-dot"
                  [class.dot-normal]="data.status === 'normal'"
                  [class.dot-warning]="data.status === 'warning'"
                  [class.dot-critical]="data.status === 'critical'">
                </span>
                <span class="status-text"
                  [class.text-normal]="data.status === 'normal'"
                  [class.text-warning]="data.status === 'warning'"
                  [class.text-critical]="data.status === 'critical'">
                  {{ statusLabel(data.status) }}
                </span>
              </div>
            </div>

            <!-- 현재 값 -->
            <div class="slc-value-row">
              <span class="slc-value"
                [style.color]="data.status === 'critical' ? '#c62828' : data.status === 'warning' ? '#e65100' : config.color">
                {{ data.currentValue | number:'1.1-2' }}
              </span>
              <span class="slc-unit">{{ config.unit }}</span>
              <mat-icon class="trend-icon"
                [class.trend-up]="data.trend === 'up'"
                [class.trend-down]="data.trend === 'down'"
                [class.trend-stable]="data.trend === 'stable'">
                {{ data.trend === 'up' ? 'trending_up' : data.trend === 'down' ? 'trending_down' : 'trending_flat' }}
              </mat-icon>
            </div>

            <!-- 미니 스파크라인 (SVG) -->
            <svg class="sparkline" viewBox="0 0 120 30" preserveAspectRatio="none">
              <polyline
                [attr.points]="getSparkPoints(data.history, config)"
                fill="none"
                [attr.stroke]="data.status === 'critical' ? '#c62828' : data.status === 'warning' ? '#e65100' : config.color"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"/>
              <!-- 임계값 선 -->
              <line
                x1="0" [attr.y1]="getThresholdY(config.criticalThreshold, config)"
                x2="120" [attr.y2]="getThresholdY(config.criticalThreshold, config)"
                stroke="#c62828" stroke-width="1" stroke-dasharray="4,3" opacity="0.5"/>
            </svg>

            <!-- AI 이상탐지 점수 -->
            <div class="ai-score-row">
              <span class="ai-score-label">
                <mat-icon style="font-size:12px;width:12px;height:12px;color:#1976d2">psychology</mat-icon>
                AI 이상탐지
              </span>
              <div class="ai-score-bar">
                <div class="ai-score-fill"
                  [style.width.%]="(data.aiAnomalyScore ?? 0) * 100"
                  [class.fill-ok]="!data.aiAnomaly"
                  [class.fill-warn]="data.aiAnomaly">
                </div>
              </div>
              <span class="ai-score-val"
                [class.score-ok]="!data.aiAnomaly"
                [class.score-warn]="data.aiAnomaly">
                {{ ((data.aiAnomalyScore ?? 0) * 100) | number:'1.0-0' }}%
              </span>
            </div>

            <!-- 임계값 -->
            <div class="threshold-info">
              <span>경고: {{ config.warnThreshold }}{{ config.unit }}</span>
              <span>위험: {{ config.criticalThreshold }}{{ config.unit }}</span>
            </div>

            <!-- 자동 조치 -->
            @if (data.status !== 'normal') {
              <div class="action-note" [class.action-critical]="data.status === 'critical'">
                <mat-icon style="font-size:12px;width:12px;height:12px">bolt</mat-icon>
                {{ config.actionNote }}
              </div>
            }
          </div>
        }
      }
    </div>

    <!-- 요약 통계 -->
    <div class="summary-row">
      <div class="sum-item">
        <mat-icon style="color:#2e7d32">check_circle</mat-icon>
        <span>정상: {{ normalCount() }}개</span>
      </div>
      <div class="sum-item sum-warn">
        <mat-icon style="color:#e65100">warning</mat-icon>
        <span>주의: {{ warningCount() }}개</span>
      </div>
      <div class="sum-item sum-crit">
        <mat-icon style="color:#c62828">dangerous</mat-icon>
        <span>위험: {{ criticalCount() }}개</span>
      </div>
      <div class="sum-item sum-ai">
        <mat-icon style="color:#1976d2">psychology</mat-icon>
        <span>AI 이상탐지: {{ aiAnomalyCount() }}개</span>
      </div>
    </div>
  `,
  styles: [`
    /* 헤더 */
    .live-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
    .live-title { display:flex; align-items:center; gap:8px; font-size:15px; font-weight:600; }
    .live-pulse-icon { color:#1976d2; animation:pulse-blue 2s infinite; }
    @keyframes pulse-blue { 0%,100%{opacity:1} 50%{opacity:.4} }
    .live-badge {
      font-size:10px; font-weight:800; letter-spacing:1px;
      background:#c62828; color:white; border-radius:4px; padding:1px 6px;
      animation:pulse-red 1.5s infinite;
    }
    @keyframes pulse-red { 0%,100%{opacity:1} 50%{opacity:.5} }
    .live-meta { display:flex; flex-direction:column; align-items:flex-end; gap:2px; }
    .last-update { font-size:11px; color:#888; }
    .update-interval { font-size:10px; color:#bbb; }

    /* 경보 배너 */
    .alert-banner {
      display:flex; align-items:center; gap:8px;
      border-radius:8px; padding:10px 16px; margin-bottom:12px;
      font-size:13px;
    }
    .critical-banner { background:#ffebee; color:#c62828; border-left:4px solid #c62828; }
    .warning-banner  { background:#fff3e0; color:#e65100; border-left:4px solid #e65100; }

    /* 센서 그리드 */
    .sensor-overview-grid {
      display:grid; grid-template-columns:repeat(5,1fr); gap:12px;
      margin-bottom:16px;
    }
    .sensor-live-card {
      border-radius:10px; border:2px solid #eee;
      padding:12px; background:white; cursor:pointer;
      transition:box-shadow .15s, border-color .15s;
    }
    .sensor-live-card:hover { box-shadow:0 4px 16px rgba(0,0,0,.1); }
    .card-warning { border-color:#e65100; background:#fff8f0; }
    .card-critical { border-color:#c62828; background:#fff5f5; animation:card-pulse 2s infinite; }
    @keyframes card-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(198,40,40,.3)} 50%{box-shadow:0 0 0 6px rgba(198,40,40,0)} }

    /* 카드 내부 */
    .slc-header { display:flex; align-items:center; gap:6px; margin-bottom:8px; }
    .slc-icon { font-size:18px; width:18px; height:18px; }
    .slc-label { font-size:12px; font-weight:600; flex:1; }
    .slc-status { display:flex; align-items:center; gap:3px; }
    .status-dot { width:8px; height:8px; border-radius:50%; }
    .dot-normal   { background:#2e7d32; }
    .dot-warning  { background:#e65100; animation:pulse-dot 2s infinite; }
    .dot-critical { background:#c62828; animation:pulse-dot 1s infinite; }
    @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:.3} }
    .status-text { font-size:10px; }
    .text-normal   { color:#2e7d32; }
    .text-warning  { color:#e65100; }
    .text-critical { color:#c62828; font-weight:700; }

    .slc-value-row { display:flex; align-items:baseline; gap:3px; margin-bottom:6px; }
    .slc-value { font-size:24px; font-weight:800; line-height:1; }
    .slc-unit { font-size:12px; color:#888; }
    .trend-icon { font-size:16px; width:16px; height:16px; margin-left:auto; }
    .trend-up { color:#c62828; }
    .trend-down { color:#2e7d32; }
    .trend-stable { color:#888; }

    /* 스파크라인 */
    .sparkline { width:100%; height:30px; display:block; margin-bottom:8px; }

    /* AI 이상탐지 */
    .ai-score-row { display:flex; align-items:center; gap:4px; margin-bottom:6px; }
    .ai-score-label { display:flex; align-items:center; gap:2px; font-size:10px; color:#888; white-space:nowrap; }
    .ai-score-bar { flex:1; height:5px; background:#eee; border-radius:3px; overflow:hidden; }
    .ai-score-fill { height:100%; border-radius:3px; transition:width .5s; }
    .fill-ok   { background:#2e7d32; }
    .fill-warn { background:#c62828; }
    .ai-score-val { font-size:10px; font-weight:700; width:28px; text-align:right; }
    .score-ok   { color:#2e7d32; }
    .score-warn { color:#c62828; }

    .threshold-info { display:flex; justify-content:space-between; font-size:10px; color:#bbb; margin-bottom:4px; }

    .action-note {
      font-size:10px; background:#fff3e0; color:#e65100;
      border-radius:4px; padding:4px 6px; display:flex; align-items:flex-start; gap:3px; line-height:1.3;
    }
    .action-critical { background:#ffebee; color:#c62828; }

    /* 요약 통계 */
    .summary-row { display:flex; gap:20px; font-size:12px; }
    .sum-item { display:flex; align-items:center; gap:4px; }
    .sum-warn strong { color:#e65100; }
    .sum-crit strong { color:#c62828; }
    .sum-ai { color:#1976d2; }
  `],
})
export class LiveSensorOverviewComponent implements OnInit, OnDestroy {
  @Output() sensorClick = new EventEmitter<{ config: LiveSensorConfig; data: LiveSensorData }>();

  readonly sensorConfigs = SENSOR_CONFIGS;
  readonly lastUpdate = signal<Date>(new Date());

  private sensorDataMap = new Map<string, LiveSensorData>();
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  // 집계
  readonly normalCount  = () => this.allData().filter((d) => d.status === 'normal').length;
  readonly warningCount = () => this.allData().filter((d) => d.status === 'warning').length;
  readonly criticalCount = () => this.allData().filter((d) => d.status === 'critical').length;
  readonly aiAnomalyCount = () => this.allData().filter((d) => d.aiAnomaly).length;
  readonly criticalSensors = () => this.sensorConfigs
    .filter((c) => this.getSensorData(c.type)?.status === 'critical')
    .map((c) => c.label);
  readonly warningSensors = () => this.sensorConfigs
    .filter((c) => this.getSensorData(c.type)?.status === 'warning')
    .map((c) => c.label);

  private allData(): LiveSensorData[] {
    return SENSOR_CONFIGS.map((c) => this.sensorDataMap.get(c.type)).filter(Boolean) as LiveSensorData[];
  }

  ngOnInit(): void {
    this.refreshAll();
    // 30초 자동 갱신
    this.refreshTimer = setInterval(() => this.refreshAll(), 30_000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  refreshAll(): void {
    SENSOR_CONFIGS.forEach((c) => {
      this.sensorDataMap.set(c.type, generateMockSensorData(c));
    });
    this.lastUpdate.set(new Date());
  }

  getSensorData(type: string): LiveSensorData | undefined {
    return this.sensorDataMap.get(type);
  }

  // SVG 스파크라인 포인트 계산
  getSparkPoints(history: number[], config: LiveSensorConfig): string {
    const w = 120;
    const h = 30;
    const range = config.max - config.min || 1;
    return history
      .map((v, i) => {
        const x = (i / (history.length - 1)) * w;
        const y = h - ((v - config.min) / range) * h;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  getThresholdY(threshold: number, config: LiveSensorConfig): number {
    const range = config.max - config.min || 1;
    return 30 - ((threshold - config.min) / range) * 30;
  }

  statusLabel(s: string): string {
    return { normal: '정상', warning: '주의', critical: '위험' }[s] ?? s;
  }
}
