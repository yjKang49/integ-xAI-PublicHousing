// apps/admin-web/src/app/features/risk/components/evidence-panel.component.ts
// Phase 2-9: 위험도 산출 근거 패널

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

const LEVEL_COLOR: Record<string, string> = {
  CRITICAL: '#c62828',
  HIGH:     '#e65100',
  MEDIUM:   '#f9a825',
  LOW:      '#2e7d32',
};

@Component({
  selector: 'ax-evidence-panel',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatDividerModule, MatTooltipModule],
  template: `
    @if (score) {
      <div class="evidence-panel">

        <!-- 종합 스코어 헤더 -->
        <div class="score-header">
          <div class="score-circle" [style.border-color]="levelColor(score.level)">
            <span class="score-big" [style.color]="levelColor(score.level)">{{ score.score }}</span>
            <span class="score-sub">/ 100</span>
          </div>
          <div class="score-meta">
            <div class="level-chip" [style.background]="levelColor(score.level)">
              {{ levelLabel(score.level) }}
            </div>
            <div class="target-name">{{ score.targetName }}</div>
            <div class="meta-row">
              <span>신뢰도 {{ (score.confidence * 100) | number:'1.0-0' }}%</span>
              <span>계산 {{ score.calculatedAt | date:'yyyy-MM-dd HH:mm' }}</span>
            </div>
          </div>
        </div>

        <mat-divider class="divider" />

        <!-- 서브스코어 -->
        <div class="section-title">가중 서브스코어</div>
        <div class="sub-score-list">
          @for (entry of subScoreEntries; track entry.key) {
            <div class="sub-row">
              <div class="sub-header-row">
                <span class="sub-key-label">{{ entry.label }}</span>
                <span class="sub-weight">가중치 {{ (entry.weight * 100) | number:'1.0-0' }}%</span>
                <span class="sub-score-val" [style.color]="scoreColor(entry.score)">{{ entry.score | number:'1.0-0' }}점</span>
              </div>
              <div class="sub-bar-bg">
                <div class="sub-bar-fill"
                  [style.width.%]="entry.score"
                  [style.background]="scoreColor(entry.score)">
                </div>
              </div>
              <div class="sub-details">{{ entry.details }}</div>
              <div class="sub-datapoints">근거 데이터: {{ entry.dataPoints }}건</div>
            </div>
          }
        </div>

        <mat-divider class="divider" />

        <!-- 증거 데이터 -->
        <div class="section-title">계산 근거 데이터</div>
        <div class="evidence-grid">
          @if (score.evidence) {
            <div class="ev-item" [class.ev-alert]="score.evidence.unrepairedDefects > 0">
              <mat-icon class="ev-icon">report_problem</mat-icon>
              <div class="ev-content">
                <span class="ev-val">{{ score.evidence.unrepairedDefects }}</span>
                <span class="ev-label">미수리 결함</span>
              </div>
            </div>
            <div class="ev-item" [class.ev-alert]="score.evidence.criticalDefects > 0">
              <mat-icon class="ev-icon">warning</mat-icon>
              <div class="ev-content">
                <span class="ev-val">{{ score.evidence.criticalDefects }}</span>
                <span class="ev-label">긴급 결함</span>
              </div>
            </div>
            <div class="ev-item" [class.ev-alert]="score.evidence.crackThresholdExceedances > 0">
              <mat-icon class="ev-icon">timeline</mat-icon>
              <div class="ev-content">
                <span class="ev-val">{{ score.evidence.crackThresholdExceedances }}</span>
                <span class="ev-label">균열 초과</span>
              </div>
            </div>
            <div class="ev-item" [class.ev-alert]="score.evidence.sensorCriticalCount > 0">
              <mat-icon class="ev-icon">sensors</mat-icon>
              <div class="ev-content">
                <span class="ev-val">{{ score.evidence.sensorCriticalCount }}</span>
                <span class="ev-label">센서 위험</span>
              </div>
            </div>
            <div class="ev-item" [class.ev-alert]="score.evidence.urgentComplaints > 0">
              <mat-icon class="ev-icon">support_agent</mat-icon>
              <div class="ev-content">
                <span class="ev-val">{{ score.evidence.openComplaints }}</span>
                <span class="ev-label">미해결 민원</span>
              </div>
            </div>
            <div class="ev-item">
              <mat-icon class="ev-icon">notifications_active</mat-icon>
              <div class="ev-content">
                <span class="ev-val">{{ score.evidence.activeAlerts }}</span>
                <span class="ev-label">활성 경보</span>
              </div>
            </div>
            @if (score.evidence.assetAgeYears != null) {
              <div class="ev-item">
                <mat-icon class="ev-icon">schedule</mat-icon>
                <div class="ev-content">
                  <span class="ev-val">{{ score.evidence.assetAgeYears }}년</span>
                  <span class="ev-label">설비 경과</span>
                </div>
              </div>
            }
            @if (score.evidence.remainingLifeRatio != null) {
              <div class="ev-item" [class.ev-alert]="score.evidence.remainingLifeRatio < 0.2">
                <mat-icon class="ev-icon">battery_alert</mat-icon>
                <div class="ev-content">
                  <span class="ev-val">{{ (score.evidence.remainingLifeRatio * 100) | number:'1.0-0' }}%</span>
                  <span class="ev-label">잔여 수명</span>
                </div>
              </div>
            }
          }
        </div>

        <!-- 종합 요약 -->
        @if (score.evidence?.evidenceSummary) {
          <div class="summary-box">
            <mat-icon class="summary-icon">summarize</mat-icon>
            <span>{{ score.evidence.evidenceSummary }}</span>
          </div>
        }

      </div>
    }
  `,
  styles: [`
    .evidence-panel { font-size: 13px; }

    .score-header {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 16px;
    }
    .score-circle {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      border: 4px solid #ccc;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .score-big { font-size: 28px; font-weight: 700; line-height: 1; }
    .score-sub { font-size: 11px; color: #aaa; }
    .level-chip {
      display: inline-block;
      color: white;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 12px;
      margin-bottom: 4px;
    }
    .target-name { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
    .meta-row { display: flex; gap: 12px; color: #999; font-size: 11px; }

    .divider { margin: 14px 0; }
    .section-title { font-size: 12px; font-weight: 600; color: #666; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }

    .sub-score-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 8px; }
    .sub-row { background: #fafafa; border-radius: 6px; padding: 10px; }
    .sub-header-row { display: flex; align-items: center; margin-bottom: 6px; }
    .sub-key-label { flex: 1; font-size: 12px; font-weight: 600; }
    .sub-weight { font-size: 11px; color: #aaa; margin-right: 8px; }
    .sub-score-val { font-size: 13px; font-weight: 700; }
    .sub-bar-bg { height: 5px; background: #eeee; border-radius: 3px; margin-bottom: 6px; overflow: hidden; }
    .sub-bar-fill { height: 100%; border-radius: 3px; }
    .sub-details { font-size: 11px; color: #555; margin-bottom: 2px; }
    .sub-datapoints { font-size: 10px; color: #aaa; }

    .evidence-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 8px;
      margin-bottom: 14px;
    }
    .ev-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      background: #f5f5f5;
      border-radius: 6px;
      border-left: 3px solid transparent;
    }
    .ev-item.ev-alert { border-left-color: #e65100; background: #fff3e0; }
    .ev-icon { font-size: 18px; width: 18px; height: 18px; color: #1976d2; }
    .ev-content { display: flex; flex-direction: column; }
    .ev-val { font-size: 16px; font-weight: 700; line-height: 1.1; }
    .ev-label { font-size: 10px; color: #888; }

    .summary-box {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 10px 14px;
      background: #e8f5e9;
      border-radius: 8px;
      font-size: 12px;
      color: #333;
    }
    .summary-icon { font-size: 16px; width: 16px; height: 16px; color: #2e7d32; margin-top: 1px; }
  `],
})
export class EvidencePanelComponent {
  @Input() score: any = null;

  get subScoreEntries(): any[] {
    if (!this.score?.subScores) return [];
    const labels: Record<string, string> = {
      defect: '결함 스코어', crack: '균열 스코어',
      sensor: '센서 스코어', complaint: '민원 스코어', age: '노후도 스코어',
    };
    return Object.entries(this.score.subScores).map(([key, val]: [string, any]) => ({
      key, label: labels[key] ?? key,
      score: val?.score ?? 0,
      weight: val?.weight ?? 0,
      contribution: val?.contribution ?? 0,
      details: val?.details ?? '',
      dataPoints: val?.dataPoints ?? 0,
    }));
  }

  levelColor(level: string): string {
    return LEVEL_COLOR[level] ?? '#888';
  }

  levelLabel(level: string): string {
    const map: Record<string, string> = { CRITICAL: '위험', HIGH: '높음', MEDIUM: '보통', LOW: '낮음' };
    return map[level] ?? level;
  }

  scoreColor(score: number): string {
    if (score >= 76) return '#c62828';
    if (score >= 51) return '#e65100';
    if (score >= 26) return '#f9a825';
    return '#2e7d32';
  }
}
