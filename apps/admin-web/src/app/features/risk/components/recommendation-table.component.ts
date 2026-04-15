// apps/admin-web/src/app/features/risk/components/recommendation-table.component.ts
// Phase 2-9: 장기수선 권장 테이블

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';

const STATUS_LABEL: Record<string, string> = {
  PENDING:     '검토 대기',
  APPROVED:    '승인됨',
  IN_PROGRESS: '진행 중',
  COMPLETED:   '완료',
  DEFERRED:    '연기됨',
  REJECTED:    '반려됨',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING:     '#f57c00',
  APPROVED:    '#1976d2',
  IN_PROGRESS: '#6a1b9a',
  COMPLETED:   '#2e7d32',
  DEFERRED:    '#607d8b',
  REJECTED:    '#c62828',
};

const TYPE_LABEL: Record<string, string> = {
  IMMEDIATE_REPAIR:      '즉시 보수',
  SHORT_TERM_REPAIR:     '단기 보수',
  SCHEDULED_MAINTENANCE: '계획 유지보수',
  ROUTINE_INSPECTION:    '일상 점검',
  REPLACEMENT:           '교체 (장기수선)',
};

const PRIORITY_LABEL: Record<string, string> = {
  IMMEDIATE: '즉시', HIGH: '높음', MEDIUM: '보통', LOW: '낮음',
};

const PRIORITY_COLOR: Record<string, string> = {
  IMMEDIATE: '#c62828', HIGH: '#e65100', MEDIUM: '#f9a825', LOW: '#2e7d32',
};

@Component({
  selector: 'ax-recommendation-table',
  standalone: true,
  imports: [
    CommonModule, MatIconModule, MatButtonModule,
    MatChipsModule, MatTooltipModule, MatMenuModule,
  ],
  template: `
    @if (!items || items.length === 0) {
      <div class="empty-state">
        <mat-icon>assignment_turned_in</mat-icon>
        <p>장기수선 권장 데이터가 없습니다.</p>
      </div>
    } @else {
      <div class="table-wrap">
        <table class="rec-table">
          <thead>
            <tr>
              <th>대상</th>
              <th>권장 유형</th>
              <th>우선순위</th>
              <th>예상 일정</th>
              <th>예상 비용</th>
              <th>상태</th>
              <th>근거 요약</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (rec of items; track rec._id) {
              <tr (click)="select.emit(rec)" class="rec-row">
                <td>
                  <div class="target-cell">
                    <span class="target-name">{{ rec.targetName }}</span>
                    <span class="target-type">{{ targetTypeLabel(rec.targetType) }}</span>
                  </div>
                </td>
                <td>
                  <span class="type-chip">{{ typeLabel(rec.maintenanceType) }}</span>
                </td>
                <td>
                  <span class="priority-dot" [style.background]="priorityColor(rec.priority)"></span>
                  <span class="priority-text" [style.color]="priorityColor(rec.priority)">
                    {{ priorityLabel(rec.priority) }}
                  </span>
                </td>
                <td class="date-cell">
                  <div>{{ rec.suggestedTimeline?.label }}</div>
                  <div class="date-range">
                    {{ rec.suggestedTimeline?.earliest }} ~
                    {{ rec.suggestedTimeline?.latest }}
                  </div>
                </td>
                <td class="cost-cell">
                  @if (rec.estimatedCostBand) {
                    <span>{{ formatCost(rec.estimatedCostBand.min) }} ~ {{ formatCost(rec.estimatedCostBand.max) }}</span>
                  }
                </td>
                <td>
                  <span
                    class="status-badge"
                    [style.background]="statusColor(rec.status)"
                  >{{ statusLabel(rec.status) }}</span>
                </td>
                <td class="summary-cell">
                  <span [matTooltip]="rec.evidenceSummary">
                    {{ (rec.evidenceSummary || '').slice(0, 40) }}{{ rec.evidenceSummary?.length > 40 ? '...' : '' }}
                  </span>
                </td>
                <td>
                  <button mat-icon-button [matMenuTriggerFor]="menu" (click)="$event.stopPropagation()">
                    <mat-icon>more_vert</mat-icon>
                  </button>
                  <mat-menu #menu="matMenu">
                    <button mat-menu-item (click)="action.emit({ rec, act: 'APPROVED' })">
                      <mat-icon>check_circle</mat-icon> 승인
                    </button>
                    <button mat-menu-item (click)="action.emit({ rec, act: 'DEFERRED' })">
                      <mat-icon>schedule</mat-icon> 연기
                    </button>
                    <button mat-menu-item (click)="action.emit({ rec, act: 'REJECTED' })">
                      <mat-icon>cancel</mat-icon> 반려
                    </button>
                    <button mat-menu-item (click)="action.emit({ rec, act: 'IN_PROGRESS' })">
                      <mat-icon>play_circle</mat-icon> 진행 중
                    </button>
                    <button mat-menu-item (click)="action.emit({ rec, act: 'COMPLETED' })">
                      <mat-icon>task_alt</mat-icon> 완료 처리
                    </button>
                  </mat-menu>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: [`
    .empty-state { text-align: center; padding: 40px; color: #bbb; }
    .empty-state mat-icon { font-size: 40px; width: 40px; height: 40px; display: block; margin: 0 auto 12px; }
    .empty-state p { margin: 0; }

    .table-wrap { overflow-x: auto; }
    .rec-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .rec-table th {
      background: #f5f5f5;
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
      font-size: 11px;
      color: #666;
      font-weight: 600;
      white-space: nowrap;
    }
    .rec-table td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
    .rec-row { cursor: pointer; }
    .rec-row:hover td { background: #f5f9ff; }

    .target-cell { display: flex; flex-direction: column; }
    .target-name { font-weight: 600; }
    .target-type { font-size: 11px; color: #999; }

    .type-chip {
      display: inline-block;
      background: #e3f2fd;
      color: #1565c0;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 10px;
      white-space: nowrap;
    }

    .priority-dot {
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      margin-right: 5px;
      vertical-align: middle;
    }
    .priority-text { font-size: 12px; font-weight: 600; vertical-align: middle; }

    .date-cell { white-space: nowrap; font-size: 12px; }
    .date-range { font-size: 10px; color: #aaa; margin-top: 2px; }

    .cost-cell { font-size: 12px; white-space: nowrap; }

    .status-badge {
      display: inline-block;
      color: white;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 10px;
      white-space: nowrap;
    }

    .summary-cell { font-size: 12px; color: #666; max-width: 200px; }
  `],
})
export class RecommendationTableComponent {
  @Input() items: any[] = [];
  @Output() select = new EventEmitter<any>();
  @Output() action = new EventEmitter<{ rec: any; act: string }>();

  statusLabel(s: string): string  { return STATUS_LABEL[s]   ?? s; }
  statusColor(s: string): string  { return STATUS_COLOR[s]   ?? '#888'; }
  typeLabel(t: string): string    { return TYPE_LABEL[t]     ?? t; }
  priorityLabel(p: string): string{ return PRIORITY_LABEL[p] ?? p; }
  priorityColor(p: string): string{ return PRIORITY_COLOR[p] ?? '#888'; }

  targetTypeLabel(type: string): string {
    const m: Record<string, string> = { ASSET: '설비', ZONE: '구역', BUILDING: '동', COMPLEX: '단지' };
    return m[type] ?? type;
  }

  formatCost(n: number): string {
    if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(0)}억`;
    if (n >= 10_000)      return `${(n / 10_000).toLocaleString('ko')}만원`;
    return n.toLocaleString('ko') + '원';
  }
}
