// apps/admin-web/src/app/features/risk/components/risk-heatmap.component.ts
// Phase 2-9: 위험도 히트맵 (대상별 색상 바 시각화)

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

const LEVEL_COLOR: Record<string, string> = {
  CRITICAL: '#c62828',
  HIGH:     '#e65100',
  MEDIUM:   '#f9a825',
  LOW:      '#2e7d32',
};

const LEVEL_LABEL: Record<string, string> = {
  CRITICAL: '위험',
  HIGH:     '높음',
  MEDIUM:   '보통',
  LOW:      '낮음',
};

@Component({
  selector: 'ax-risk-heatmap',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="heatmap-container">
      @if (!items || items.length === 0) {
        <div class="empty-state">
          <mat-icon>assessment</mat-icon>
          <p>위험도 데이터가 없습니다.</p>
        </div>
      } @else {
        <div class="heatmap-grid">
          @for (item of items; track item._id) {
            <div
              class="heatmap-cell"
              [style.border-left-color]="levelColor(item.level)"
              [matTooltip]="tooltip(item)"
              (click)="select.emit(item)"
            >
              <div class="cell-header">
                <span class="level-badge" [style.background]="levelColor(item.level)">
                  {{ levelLabel(item.level) }}
                </span>
                <span class="score-num" [style.color]="levelColor(item.level)">
                  {{ item.score }}
                </span>
              </div>
              <div class="cell-name">{{ item.targetName }}</div>
              <div class="cell-type">{{ targetTypeLabel(item.targetType) }}</div>

              <!-- 스코어 바 -->
              <div class="score-bar-bg">
                <div
                  class="score-bar-fill"
                  [style.width.%]="item.score"
                  [style.background]="levelColor(item.level)"
                ></div>
              </div>

              <!-- 서브스코어 요약 -->
              @if (item.subScores) {
                <div class="sub-scores">
                  @for (entry of subScoreEntries(item.subScores); track entry.key) {
                    <div class="sub-item">
                      <span class="sub-label">{{ entry.label }}</span>
                      <div class="sub-bar-bg">
                        <div
                          class="sub-bar-fill"
                          [style.width.%]="entry.score"
                          [style.background]="subBarColor(entry.score)"
                        ></div>
                      </div>
                      <span class="sub-val">{{ entry.score | number:'1.0-0' }}</span>
                    </div>
                  }
                </div>
              }

              <div class="cell-footer">
                <span class="confidence">신뢰도 {{ (item.confidence * 100) | number:'1.0-0' }}%</span>
                <span class="calc-date">{{ item.calculatedAt | date:'MM/dd HH:mm' }}</span>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .heatmap-container { width: 100%; }
    .heatmap-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 12px;
    }

    .heatmap-cell {
      background: white;
      border: 1px solid #e0e0e0;
      border-left: 4px solid #ccc;
      border-radius: 8px;
      padding: 14px;
      cursor: pointer;
      transition: box-shadow 0.15s, transform 0.1s;
    }
    .heatmap-cell:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transform: translateY(-2px);
    }

    .cell-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .level-badge {
      color: white;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 10px;
    }
    .score-num {
      font-size: 24px;
      font-weight: 700;
    }

    .cell-name {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .cell-type { font-size: 11px; color: #888; margin-bottom: 8px; }

    .score-bar-bg {
      height: 6px;
      background: #f0f0f0;
      border-radius: 3px;
      margin-bottom: 10px;
      overflow: hidden;
    }
    .score-bar-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }

    .sub-scores { margin-bottom: 8px; }
    .sub-item {
      display: grid;
      grid-template-columns: 36px 1fr 28px;
      align-items: center;
      gap: 4px;
      margin-bottom: 3px;
    }
    .sub-label { font-size: 10px; color: #999; }
    .sub-bar-bg { height: 4px; background: #f0f0f0; border-radius: 2px; overflow: hidden; }
    .sub-bar-fill { height: 100%; border-radius: 2px; }
    .sub-val { font-size: 10px; color: #777; text-align: right; }

    .cell-footer {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #aaa;
    }

    .empty-state {
      text-align: center;
      padding: 60px;
      color: #bbb;
    }
    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      display: block;
      margin: 0 auto 12px;
    }
    .empty-state p { margin: 0; }
  `],
})
export class RiskHeatmapComponent {
  @Input() items: any[] = [];
  @Output() select = new EventEmitter<any>();

  levelColor(level: string): string {
    return LEVEL_COLOR[level] ?? '#888';
  }

  levelLabel(level: string): string {
    return LEVEL_LABEL[level] ?? level;
  }

  targetTypeLabel(type: string): string {
    const map: Record<string, string> = {
      ASSET: '설비', ZONE: '구역', BUILDING: '동', COMPLEX: '단지',
    };
    return map[type] ?? type;
  }

  subScoreEntries(subScores: any): { key: string; label: string; score: number }[] {
    const labels: Record<string, string> = {
      defect: '결함', crack: '균열', sensor: '센서', complaint: '민원', age: '노후',
    };
    return Object.entries(subScores).map(([key, val]: [string, any]) => ({
      key,
      label: labels[key] ?? key,
      score: val?.score ?? 0,
    }));
  }

  subBarColor(score: number): string {
    if (score >= 76) return '#c62828';
    if (score >= 51) return '#e65100';
    if (score >= 26) return '#f9a825';
    return '#2e7d32';
  }

  tooltip(item: any): string {
    return `${item.targetName} — ${LEVEL_LABEL[item.level] ?? item.level} (${item.score}점)\n${item.evidence?.evidenceSummary ?? ''}`;
  }
}
