// apps/admin-web/src/app/features/diagnosis/components/recommendation-panel.component.ts
// 보수 추천 패널 — DiagnosisOpinion에 연결된 RepairRecommendation 목록 표시 및 승인
import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { MatCardModule } from '@angular/material/card'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatChipsModule } from '@angular/material/chips'
import { MatDividerModule } from '@angular/material/divider'
import { MatTooltipModule } from '@angular/material/tooltip'
import { RepairRecommendation, RepairTimeline } from '@ax/shared'

const TIMELINE_LABELS: Record<string, string> = {
  IMMEDIATE:       '즉시 (24h)',
  WITHIN_1_WEEK:   '1주 이내',
  WITHIN_1_MONTH:  '1개월 이내',
  WITHIN_3_MONTHS: '3개월 이내',
  ANNUAL_PLAN:     '연간 계획',
}

const TIMELINE_COLORS: Record<string, string> = {
  IMMEDIATE:       '#c62828',
  WITHIN_1_WEEK:   '#e65100',
  WITHIN_1_MONTH:  '#f57f17',
  WITHIN_3_MONTHS: '#2e7d32',
  ANNUAL_PLAN:     '#1565c0',
}

@Component({
  selector: 'ax-recommendation-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatDividerModule, MatTooltipModule,
  ],
  template: `
    <div class="rec-panel">
      <div class="panel-header">
        <mat-icon>build</mat-icon>
        <span>보수·보강 추천 ({{ recommendations.length }}건)</span>
      </div>

      @if (recommendations.length === 0) {
        <div class="empty-recs">
          <span>추천 항목이 없습니다.</span>
        </div>
      } @else {
        @for (rec of sortedRecs; track rec._id) {
          <mat-card class="rec-card" [class.approved]="rec.isApproved">
            <mat-card-content>
              <div class="rec-header">
                <div class="rank-badge">{{ rec.priorityRank }}</div>
                <div class="rec-title">{{ rec.recommendedAction }}</div>
                <mat-chip
                  class="timeline-chip"
                  [style.background]="timelineColor(rec.recommendedTimeline)"
                  [style.color]="'white'"
                >
                  {{ timelineLabel(rec.recommendedTimeline) }}
                </mat-chip>
              </div>

              @if (rec.actionDetail) {
                <div class="rec-detail">{{ rec.actionDetail }}</div>
              }

              @if (rec.kcsStandardRef) {
                <div class="kcs-ref">
                  <mat-icon class="kcs-icon">gavel</mat-icon>
                  {{ rec.kcsStandardRef }}
                  @if (rec.kcsComplianceNote) {
                    <span class="kcs-note">— {{ rec.kcsComplianceNote }}</span>
                  }
                </div>
              }

              @if (rec.estimatedCostRange) {
                <div class="cost-range">
                  <mat-icon>payments</mat-icon>
                  {{ rec.estimatedCostRange.min | number }} ~ {{ rec.estimatedCostRange.max | number }}원
                </div>
              }

              <mat-divider />

              <div class="rec-footer">
                @if (rec.isApproved) {
                  <div class="approved-badge">
                    <mat-icon>verified</mat-icon>
                    <span>승인 완료</span>
                    @if (rec.approvedAt) {
                      <span class="approved-meta">{{ rec.approvedAt | date:'MM/dd' }}</span>
                    }
                  </div>
                  <button mat-icon-button color="warn" [matTooltip]="'승인 취소'" (click)="onCancelApprove(rec)" [disabled]="loading">
                    <mat-icon>undo</mat-icon>
                  </button>
                } @else {
                  <div class="pending-badge">
                    <mat-icon>pending</mat-icon>
                    <span>승인 대기</span>
                  </div>
                  <button mat-stroked-button color="primary" (click)="onApprove(rec)" [disabled]="loading || !canApprove">
                    <mat-icon>check_circle</mat-icon> 승인
                  </button>
                }
              </div>
            </mat-card-content>
          </mat-card>
        }
      }
    </div>
  `,
  styles: [`
    .rec-panel { display: flex; flex-direction: column; gap: 8px; }
    .panel-header { display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 14px; padding: 4px 0; color: #333; }
    .empty-recs { color: #999; font-size: 13px; padding: 8px; text-align: center; }
    .rec-card { margin: 0; }
    .rec-card.approved { border-left: 3px solid #4caf50; }
    .rec-header { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px; }
    .rank-badge {
      background: #1a237e; color: white;
      width: 24px; height: 24px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700; flex-shrink: 0; margin-top: 2px;
    }
    .rec-title { flex: 1; font-weight: 600; font-size: 14px; line-height: 1.3; }
    .timeline-chip { font-size: 11px; height: 20px; flex-shrink: 0; }
    .rec-detail { font-size: 13px; color: #555; margin: 4px 0 6px 32px; line-height: 1.4; }
    .kcs-ref {
      display: flex; align-items: center; gap: 4px;
      font-size: 12px; color: #1565c0; margin: 4px 0 4px 32px;
    }
    .kcs-icon { font-size: 14px; width: 14px; height: 14px; }
    .kcs-note { color: #666; }
    .cost-range {
      display: flex; align-items: center; gap: 4px;
      font-size: 12px; color: #666; margin: 4px 0 4px 32px;
    }
    .cost-range mat-icon { font-size: 14px; width: 14px; height: 14px; color: #4caf50; }
    mat-divider { margin: 8px 0; }
    .rec-footer { display: flex; align-items: center; justify-content: space-between; }
    .approved-badge { display: flex; align-items: center; gap: 4px; color: #2e7d32; font-size: 13px; font-weight: 600; }
    .approved-badge mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .approved-meta { font-size: 11px; color: #666; margin-left: 4px; }
    .pending-badge { display: flex; align-items: center; gap: 4px; color: #999; font-size: 13px; }
    .pending-badge mat-icon { font-size: 18px; width: 18px; height: 18px; }
  `],
})
export class RecommendationPanelComponent {
  @Input() recommendations: RepairRecommendation[] = []
  @Input() loading = false
  @Input() canApprove = false
  @Output() approve = new EventEmitter<RepairRecommendation>()
  @Output() cancelApprove = new EventEmitter<RepairRecommendation>()

  get sortedRecs(): RepairRecommendation[] {
    return [...this.recommendations].sort((a, b) => a.priorityRank - b.priorityRank)
  }

  timelineLabel(t: string): string {
    return TIMELINE_LABELS[t] ?? t
  }

  timelineColor(t: string): string {
    return TIMELINE_COLORS[t] ?? '#666'
  }

  onApprove(rec: RepairRecommendation): void {
    this.approve.emit(rec)
  }

  onCancelApprove(rec: RepairRecommendation): void {
    this.cancelApprove.emit(rec)
  }
}
