// apps/admin-web/src/app/features/diagnosis/components/opinion-editor.component.ts
// 진단 의견 편집 패널 — AI 초안 표시, 인라인 편집, 검토 이력, 검토 액션
import {
  Component, Input, Output, EventEmitter, OnChanges, SimpleChanges,
  ChangeDetectionStrategy,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms'
import { MatCardModule } from '@angular/material/card'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatChipsModule } from '@angular/material/chips'
import { MatDividerModule } from '@angular/material/divider'
import { MatExpansionModule } from '@angular/material/expansion'
import { MatTooltipModule } from '@angular/material/tooltip'
import { MatProgressBarModule } from '@angular/material/progress-bar'
import {
  DiagnosisOpinion, DiagnosisOpinionStatus, DiagnosisUrgency,
} from '@ax/shared'

export interface OpinionReviewSubmit {
  action: 'APPROVE' | 'REJECT' | 'REQUEST_REVISION'
  reviewNote?: string
  finalEdits?: {
    summary?: string
    technicalOpinionDraft?: string
    urgency?: DiagnosisUrgency
    estimatedPriorityScore?: number
  }
}

export interface OpinionUpdateSubmit {
  summary?: string
  technicalOpinionDraft?: string
  urgency?: DiagnosisUrgency
  estimatedPriorityScore?: number
}

const URGENCY_LABELS: Record<string, string> = {
  IMMEDIATE: '즉시 조치',
  URGENT:    '긴급 (1주)',
  ROUTINE:   '일반 (1개월)',
  PLANNED:   '계획 정비',
}

const URGENCY_COLORS: Record<string, string> = {
  IMMEDIATE: '#c62828',
  URGENT:    '#e65100',
  ROUTINE:   '#f57f17',
  PLANNED:   '#2e7d32',
}

@Component({
  selector: 'ax-opinion-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatChipsModule, MatDividerModule,
    MatExpansionModule, MatTooltipModule, MatProgressBarModule,
  ],
  template: `
    <div class="editor-container" *ngIf="opinion">

      <!-- 상태 헤더 -->
      <div class="status-row">
        <mat-chip [class]="'status-chip ' + opinion.status.toLowerCase()">
          {{ statusLabel(opinion.status) }}
        </mat-chip>
        <mat-chip
          class="urgency-chip"
          [style.background]="urgencyColor(opinion.urgency)"
          [style.color]="'white'"
        >
          {{ urgencyLabel(opinion.urgency) }}
        </mat-chip>
        <div class="priority-score">
          우선순위 {{ opinion.estimatedPriorityScore }}점
          <mat-progress-bar
            [value]="opinion.estimatedPriorityScore"
            [color]="opinion.estimatedPriorityScore >= 80 ? 'warn' : opinion.estimatedPriorityScore >= 50 ? 'accent' : 'primary'"
            class="score-bar"
          />
        </div>
        <div class="spacer"></div>
        <div class="model-info">
          <mat-icon class="info-icon" [matTooltip]="'모델: ' + opinion.model + ' · 신뢰도: ' + (opinion.confidence * 100 | number:'1.0-0') + '%'">info_outline</mat-icon>
          {{ opinion.modelVersion }} · 신뢰도 {{ (opinion.confidence * 100) | number:'1.0-0' }}%
        </div>
      </div>

      <mat-divider />

      <!-- 편집 모드 / 표시 모드 토글 -->
      @if (!editMode) {
        <!-- 읽기 전용 표시 -->
        <div class="view-section">
          <div class="field-label">한 줄 요약</div>
          <div class="summary-text">{{ opinion.summary || '(요약 없음)' }}</div>
        </div>

        <div class="view-section">
          <div class="field-label">기술 의견 초안</div>
          <div class="opinion-text" [innerHTML]="renderedOpinion"></div>
        </div>

        @if (canEdit) {
          <button mat-stroked-button (click)="startEdit()">
            <mat-icon>edit</mat-icon> 내용 수정
          </button>
        }
      } @else {
        <!-- 편집 폼 -->
        <form [formGroup]="editForm" class="edit-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>한 줄 요약 (50자 이내)</mat-label>
            <input matInput formControlName="summary" maxlength="50" />
            <mat-hint align="end">{{ editForm.value.summary?.length ?? 0 }}/50</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>기술 의견 초안</mat-label>
            <textarea matInput formControlName="technicalOpinionDraft" rows="8"></textarea>
          </mat-form-field>

          <div class="edit-row">
            <mat-form-field appearance="outline" class="half-width">
              <mat-label>긴급도</mat-label>
              <mat-select formControlName="urgency">
                <mat-option value="IMMEDIATE">즉시 조치</mat-option>
                <mat-option value="URGENT">긴급 (1주)</mat-option>
                <mat-option value="ROUTINE">일반 (1개월)</mat-option>
                <mat-option value="PLANNED">계획 정비</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="half-width">
              <mat-label>우선순위 점수 (0~100)</mat-label>
              <input matInput type="number" formControlName="estimatedPriorityScore" min="0" max="100" />
            </mat-form-field>
          </div>

          <div class="edit-actions">
            <button mat-flat-button color="primary" type="button" (click)="saveEdit()" [disabled]="loading">
              <mat-icon>save</mat-icon> 저장
            </button>
            <button mat-button type="button" (click)="cancelEdit()">취소</button>
          </div>
        </form>
      }

      <!-- 수정 이력 -->
      @if (opinion.editHistory?.length) {
        <mat-expansion-panel class="history-panel">
          <mat-expansion-panel-header>
            <mat-panel-title>수정 이력 ({{ opinion.editHistory!.length }}건)</mat-panel-title>
          </mat-expansion-panel-header>
          @for (edit of opinion.editHistory; track edit.editedAt) {
            <div class="history-item">
              <div class="history-meta">
                {{ edit.editedAt | date:'MM/dd HH:mm' }} · {{ edit.editedBy }} · {{ edit.field }}
              </div>
              <div class="history-diff">
                <span class="old-val">{{ edit.previousValue | slice:0:60 }}{{ edit.previousValue.length > 60 ? '…' : '' }}</span>
                <mat-icon>arrow_forward</mat-icon>
                <span class="new-val">{{ edit.newValue | slice:0:60 }}{{ edit.newValue.length > 60 ? '…' : '' }}</span>
              </div>
            </div>
          }
        </mat-expansion-panel>
      }

      <!-- 기존 검토 결과 표시 -->
      @if (opinion.reviewedAt && opinion.status !== DiagnosisOpinionStatus.DRAFT) {
        <div class="review-result" [class.approved]="opinion.status === 'APPROVED'" [class.rejected]="opinion.status === 'REJECTED'">
          <mat-icon>{{ opinion.status === 'APPROVED' ? 'verified' : opinion.status === 'REJECTED' ? 'cancel' : 'rate_review' }}</mat-icon>
          <div class="review-content">
            <div class="review-action">{{ statusLabel(opinion.status) }}</div>
            @if (opinion.reviewNote) {
              <div class="review-note">{{ opinion.reviewNote }}</div>
            }
            <div class="review-meta">{{ opinion.reviewedAt | date:'MM/dd HH:mm' }} · {{ opinion.reviewedBy }}</div>
          </div>
        </div>
      }

      <!-- 검토 폼 -->
      @if (canReview) {
        <mat-divider />
        <div class="review-section">
          <div class="section-title">검토 결정</div>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>검토 메모 (선택)</mat-label>
            <textarea matInput [(ngModel)]="reviewNote" rows="2"></textarea>
          </mat-form-field>
          <div class="review-actions">
            <button mat-flat-button color="primary" (click)="submitReview('APPROVE')" [disabled]="loading">
              <mat-icon>check_circle</mat-icon> 승인
            </button>
            <button mat-stroked-button color="accent" (click)="submitReview('REQUEST_REVISION')" [disabled]="loading">
              <mat-icon>rate_review</mat-icon> 재검토 요청
            </button>
            <button mat-stroked-button color="warn" (click)="submitReview('REJECT')" [disabled]="loading">
              <mat-icon>cancel</mat-icon> 기각
            </button>
          </div>
          <div class="approve-note">
            <mat-icon>info_outline</mat-icon>
            승인 후 연결된 보수 추천 항목을 개별 승인하면 PDF 보고서에 포함됩니다.
          </div>
        </div>
      }

      @if (opinion.status === DiagnosisOpinionStatus.APPROVED) {
        <div class="report-ready">
          <mat-icon>picture_as_pdf</mat-icon>
          승인 완료 — 보수 추천 개별 승인 후 다음 보고서에 자동 포함됩니다.
        </div>
      }
    </div>
  `,
  styles: [`
    .editor-container { display: flex; flex-direction: column; gap: 12px; padding: 12px; }
    .status-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
    .status-chip { font-size: 12px; height: 24px; }
    .status-chip.draft     { background: #f3e5f5; color: #6a1b9a; }
    .status-chip.reviewing { background: #e3f2fd; color: #1565c0; }
    .status-chip.approved  { background: #e8f5e9; color: #2e7d32; }
    .status-chip.rejected  { background: #ffebee; color: #c62828; }
    .urgency-chip { font-size: 12px; height: 24px; }
    .priority-score { display: flex; flex-direction: column; gap: 2px; min-width: 120px; font-size: 12px; }
    .score-bar { height: 4px; }
    .spacer { flex: 1; }
    .model-info { font-size: 11px; color: #888; display: flex; align-items: center; gap: 4px; }
    .info-icon { font-size: 14px; width: 14px; height: 14px; cursor: help; }
    .view-section { display: flex; flex-direction: column; gap: 4px; }
    .field-label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
    .summary-text { font-size: 15px; font-weight: 600; color: #1a237e; }
    .opinion-text {
      font-size: 14px; line-height: 1.6; color: #333;
      background: #fafafa; border-radius: 6px; padding: 12px;
      white-space: pre-wrap;
    }
    .edit-form { display: flex; flex-direction: column; gap: 8px; }
    .full-width { width: 100%; }
    .half-width { width: calc(50% - 4px); }
    .edit-row { display: flex; gap: 8px; }
    .edit-actions { display: flex; gap: 8px; }
    .history-panel { margin-top: 4px; }
    .history-item { margin-bottom: 8px; }
    .history-meta { font-size: 11px; color: #888; margin-bottom: 2px; }
    .history-diff { display: flex; align-items: center; gap: 4px; font-size: 12px; }
    .old-val { color: #c62828; text-decoration: line-through; background: #ffebee; padding: 2px 4px; border-radius: 2px; }
    .new-val { color: #2e7d32; background: #e8f5e9; padding: 2px 4px; border-radius: 2px; }
    .review-result {
      display: flex; gap: 8px; align-items: flex-start;
      padding: 10px 14px; border-radius: 6px; font-size: 13px;
    }
    .review-result.approved { background: #e8f5e9; color: #2e7d32; }
    .review-result.rejected { background: #ffebee; color: #c62828; }
    .review-content { display: flex; flex-direction: column; gap: 2px; }
    .review-action { font-weight: 600; }
    .review-note { color: #555; }
    .review-meta { font-size: 11px; color: #888; }
    .review-section { display: flex; flex-direction: column; gap: 8px; }
    .section-title { font-size: 13px; font-weight: 600; color: #333; }
    .review-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .approve-note {
      display: flex; align-items: center; gap: 6px;
      font-size: 12px; color: #666; padding: 6px 10px;
      background: #e3f2fd; border-radius: 4px;
    }
    .approve-note mat-icon { font-size: 14px; width: 14px; height: 14px; color: #1565c0; }
    .report-ready {
      display: flex; align-items: center; gap: 8px;
      background: #e8f5e9; color: #2e7d32; padding: 10px 14px; border-radius: 6px; font-size: 13px;
    }
  `],
})
export class OpinionEditorComponent implements OnChanges {
  @Input() opinion: DiagnosisOpinion | null = null
  @Input() loading = false
  @Output() save = new EventEmitter<OpinionUpdateSubmit>()
  @Output() review = new EventEmitter<OpinionReviewSubmit>()

  readonly DiagnosisOpinionStatus = DiagnosisOpinionStatus

  editMode = false
  reviewNote = ''

  editForm = new FormBuilder().group({
    summary: ['', [Validators.maxLength(50)]],
    technicalOpinionDraft: [''],
    urgency: [DiagnosisUrgency.ROUTINE as string],
    estimatedPriorityScore: [0, [Validators.min(0), Validators.max(100)]],
  })

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['opinion'] && this.opinion) {
      this.editMode = false
      this.reviewNote = ''
    }
  }

  get canEdit(): boolean {
    if (!this.opinion) return false
    return this.opinion.status !== DiagnosisOpinionStatus.APPROVED
  }

  get canReview(): boolean {
    if (!this.opinion) return false
    return (
      this.opinion.status === DiagnosisOpinionStatus.DRAFT ||
      this.opinion.status === DiagnosisOpinionStatus.REVIEWING
    ) && !!this.opinion.summary
  }

  get renderedOpinion(): string {
    // 기본적인 마크다운 → HTML 변환 (## → h3, ** → strong, - → li)
    const text = this.opinion?.technicalOpinionDraft ?? ''
    return text
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^- (.+)$/gm, '• $1')
      .replace(/\n/g, '<br>')
  }

  startEdit(): void {
    if (!this.opinion) return
    this.editForm.setValue({
      summary: this.opinion.summary ?? '',
      technicalOpinionDraft: this.opinion.technicalOpinionDraft ?? '',
      urgency: this.opinion.urgency,
      estimatedPriorityScore: this.opinion.estimatedPriorityScore,
    })
    this.editMode = true
  }

  cancelEdit(): void {
    this.editMode = false
  }

  saveEdit(): void {
    const v = this.editForm.value
    this.save.emit({
      summary: v.summary || undefined,
      technicalOpinionDraft: v.technicalOpinionDraft || undefined,
      urgency: v.urgency as DiagnosisUrgency,
      estimatedPriorityScore: Number(v.estimatedPriorityScore),
    })
    this.editMode = false
  }

  submitReview(action: 'APPROVE' | 'REJECT' | 'REQUEST_REVISION'): void {
    this.review.emit({
      action,
      reviewNote: this.reviewNote || undefined,
    })
  }

  urgencyLabel(u: string): string {
    return URGENCY_LABELS[u] ?? u
  }

  urgencyColor(u: string): string {
    return URGENCY_COLORS[u] ?? '#666'
  }

  statusLabel(s: DiagnosisOpinionStatus | string): string {
    const map: Record<string, string> = {
      DRAFT: '초안', REVIEWING: '검토중', APPROVED: '승인', REJECTED: '기각',
    }
    return map[s] ?? s
  }
}
