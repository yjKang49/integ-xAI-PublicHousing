// apps/admin-web/src/app/features/cracks/components/crack-metrics-panel.component.ts
// 균열 분석 수치 패널 — 폭/길이, 신뢰도, 샘플 그래프, 검토 액션
import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms'
import { MatCardModule } from '@angular/material/card'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatChipsModule } from '@angular/material/chips'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatDividerModule } from '@angular/material/divider'
import { MatProgressBarModule } from '@angular/material/progress-bar'
import { MatTooltipModule } from '@angular/material/tooltip'
import { CrackAnalysisResult, CrackAnalysisStatus, CrackAnalysisReviewStatus } from '@ax/shared'

export interface ReviewSubmit {
  reviewStatus: 'ACCEPTED' | 'CORRECTED' | 'REJECTED'
  reviewNote?: string
  manualCorrection?: {
    correctedWidthMm: number
    correctedLengthMm?: number
    correctionNote?: string
  }
}

@Component({
  selector: 'ax-crack-metrics-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatDividerModule, MatProgressBarModule, MatTooltipModule,
  ],
  template: `
    <div class="metrics-panel" *ngIf="result">

      <!-- 상태 헤더 -->
      <div class="status-row">
        <mat-chip [class]="'status-chip ' + result.analysisStatus.toLowerCase()">
          {{ statusLabel(result.analysisStatus) }}
        </mat-chip>
        <mat-chip [class]="'review-chip ' + result.reviewStatus.toLowerCase()">
          {{ reviewLabel(result.reviewStatus) }}
        </mat-chip>
        <span class="model-ver">{{ result.modelVersion }}</span>
      </div>

      <mat-divider />

      <!-- 주요 수치 -->
      <div class="metrics-grid">
        <div class="metric-card primary">
          <div class="metric-label">최종 확정 폭</div>
          <div class="metric-value">{{ result.finalWidthMm | number:'1.3-3' }}<span class="unit">mm</span></div>
          @if (result.manualCorrection) {
            <div class="metric-note">수동 보정값</div>
          }
        </div>
        <div class="metric-card">
          <div class="metric-label">최종 확정 길이</div>
          <div class="metric-value">
            {{ result.finalLengthMm != null ? (result.finalLengthMm | number:'1.1-1') : '—' }}<span class="unit" *ngIf="result.finalLengthMm != null">mm</span>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-label">종합 신뢰도</div>
          <div class="metric-value" [class.low-confidence]="result.confidence < 0.6">
            {{ (result.confidence * 100) | number:'1.0-0' }}<span class="unit">%</span>
          </div>
          <mat-progress-bar
            [value]="result.confidence * 100"
            [color]="result.confidence >= 0.8 ? 'primary' : result.confidence >= 0.6 ? 'accent' : 'warn'"
          />
        </div>
        <div class="metric-card" *ngIf="result.processingTimeMs">
          <div class="metric-label">처리 시간</div>
          <div class="metric-value">{{ result.processingTimeMs }}<span class="unit">ms</span></div>
        </div>
      </div>

      <!-- 신뢰도 분해 -->
      @if (result.confidenceBreakdown) {
        <div class="section-title">신뢰도 분해</div>
        <div class="confidence-breakdown">
          <div class="cb-row">
            <span>균열 검출</span>
            <mat-icon [class]="result.confidenceBreakdown.crackDetected ? 'ok' : 'fail'">
              {{ result.confidenceBreakdown.crackDetected ? 'check_circle' : 'cancel' }}
            </mat-icon>
          </div>
          <div class="cb-row">
            <span>눈금 검출</span>
            <mat-icon [class]="result.confidenceBreakdown.graduationsDetected ? 'ok' : 'warn'">
              {{ result.confidenceBreakdown.graduationsDetected ? 'check_circle' : 'warning' }}
            </mat-icon>
          </div>
          <div class="cb-row">
            <span>캘리브레이션</span>
            <span class="cb-val">{{ (result.confidenceBreakdown.calibrationConfidence * 100) | number:'1.0-0' }}%</span>
          </div>
          <div class="cb-row">
            <span>윤곽 품질</span>
            <span class="cb-val">{{ (result.confidenceBreakdown.contourQuality * 100) | number:'1.0-0' }}%</span>
          </div>
        </div>
      }

      <!-- CV 분석 원시 수치 -->
      @if (result.analysis) {
        <div class="section-title">CV 분석 원시 결과</div>
        <div class="raw-metrics">
          <div class="raw-row"><span>최대 폭</span><span>{{ result.analysis.maxWidthMm | number:'1.3-3' }}mm ({{ result.analysis.maxWidthPx }}px)</span></div>
          <div class="raw-row"><span>평균 폭</span><span>{{ result.analysis.avgWidthMm | number:'1.3-3' }}mm</span></div>
          <div class="raw-row"><span>길이</span><span>{{ result.analysis.lengthMm | number:'1.1-1' }}mm ({{ result.analysis.lengthPx }}px)</span></div>
          <div class="raw-row"><span>면적</span><span>{{ result.analysis.crackAreaPx }}px²</span></div>
          <div class="raw-row"><span>방향</span><span>{{ result.analysis.orientationDeg | number:'1.0-0' }}°</span></div>
          <div class="raw-row"><span>마스크</span><span>{{ result.analysis.mask ? '추출됨' : '없음' }}</span></div>
          <div class="raw-row"><span>골격선</span><span>{{ result.analysis.skeleton ? (result.analysis.skeleton.totalLengthPx + 'px') : '없음' }}</span></div>
        </div>

        <!-- 폭 샘플 미니 차트 -->
        @if (result.analysis.widthSamples?.length) {
          <div class="section-title">폭 샘플링</div>
          <div class="width-samples">
            @for (sample of result.analysis.widthSamples; track sample.position) {
              <div class="sample-bar-wrapper" [matTooltip]="'위치 ' + (sample.position * 100 | number:'1.0-0') + '% — ' + (sample.widthMm | number:'1.3-3') + 'mm'">
                <div
                  class="sample-bar"
                  [style.height.%]="(sample.widthMm / maxSampleWidth) * 100"
                ></div>
                <div class="sample-label">{{ sample.widthMm | number:'1.2-2' }}</div>
              </div>
            }
          </div>
        }
      }

      <!-- 캘리브레이션 파라미터 -->
      @if (result.calibration) {
        <div class="section-title">캘리브레이션</div>
        <div class="raw-metrics">
          <div class="raw-row"><span>눈금 1칸</span><span>{{ result.calibration.mmPerGraduation }}mm</span></div>
          <div class="raw-row"><span>px/mm 비율</span><span>{{ result.calibration.pxPerMm | number:'1.2-2' }}</span></div>
          <div class="raw-row"><span>검출 눈금 수</span><span>{{ result.calibration.graduationCount }}</span></div>
          <div class="raw-row"><span>수동 보정</span><span>{{ result.calibration.isManualCalibration ? '예' : '아니오' }}</span></div>
        </div>
      }

      <!-- 실패 원인 -->
      @if (result.failureReason) {
        <div class="failure-reason">
          <mat-icon>error_outline</mat-icon>
          <span>{{ result.failureReason }}</span>
        </div>
      }

      <!-- 기존 수동 보정값 -->
      @if (result.manualCorrection) {
        <mat-divider />
        <div class="section-title">수동 보정값</div>
        <div class="raw-metrics">
          <div class="raw-row"><span>보정 폭</span><span>{{ result.manualCorrection.correctedWidthMm | number:'1.3-3' }}mm</span></div>
          <div class="raw-row" *ngIf="result.manualCorrection.correctedLengthMm">
            <span>보정 길이</span><span>{{ result.manualCorrection.correctedLengthMm | number:'1.1-1' }}mm</span>
          </div>
          <div class="raw-row" *ngIf="result.manualCorrection.correctionNote">
            <span>사유</span><span>{{ result.manualCorrection.correctionNote }}</span>
          </div>
          <div class="raw-row"><span>보정자</span><span>{{ result.manualCorrection.correctedBy }}</span></div>
        </div>
      }

      <!-- 검토 폼 (분석 완료 또는 실패이고 아직 검토 전) -->
      @if (canReview) {
        <mat-divider />
        <div class="section-title">분석 결과 검토</div>

        <form [formGroup]="reviewForm" class="review-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>검토 메모 (선택)</mat-label>
            <textarea matInput formControlName="reviewNote" rows="2"></textarea>
          </mat-form-field>

          @if (showCorrectionForm) {
            <mat-form-field appearance="outline" class="half-width">
              <mat-label>보정 폭 (mm)</mat-label>
              <input matInput type="number" formControlName="correctedWidthMm" step="0.001" min="0" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="half-width">
              <mat-label>보정 길이 (mm)</mat-label>
              <input matInput type="number" formControlName="correctedLengthMm" step="0.1" min="0" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>보정 사유</mat-label>
              <input matInput formControlName="correctionNote" />
            </mat-form-field>
          }

          <div class="review-actions">
            <button mat-stroked-button color="primary" type="button" (click)="submitReview('ACCEPTED')" [disabled]="loading">
              <mat-icon>check_circle</mat-icon> 수용
            </button>
            <button mat-stroked-button color="accent" type="button" (click)="toggleCorrectionForm()" [disabled]="loading">
              <mat-icon>edit</mat-icon> {{ showCorrectionForm ? '보정 취소' : '수동 보정' }}
            </button>
            <button mat-stroked-button color="warn" type="button" (click)="submitReview('REJECTED')" [disabled]="loading">
              <mat-icon>cancel</mat-icon> 기각
            </button>
          </div>
        </form>
      }

      <!-- 이미 검토된 경우 -->
      @if (!canReview && result.reviewStatus !== CrackAnalysisReviewStatus.PENDING) {
        <div class="review-done">
          <mat-icon>verified</mat-icon>
          <span>검토 완료: {{ reviewLabel(result.reviewStatus) }}</span>
          @if (result.reviewedAt) {
            <span class="review-meta">{{ result.reviewedAt | date:'short' }} · {{ result.reviewedBy }}</span>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .metrics-panel { padding: 16px; display: flex; flex-direction: column; gap: 12px; overflow-y: auto; }
    .status-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .model-ver { margin-left: auto; font-size: 11px; color: #666; }
    .status-chip, .review-chip { font-size: 12px; height: 24px; }
    .status-chip.completed { background: #e8f5e9; color: #2e7d32; }
    .status-chip.failed { background: #ffebee; color: #c62828; }
    .status-chip.running { background: #e3f2fd; color: #1565c0; }
    .status-chip.pending { background: #fff3e0; color: #e65100; }
    .review-chip.accepted { background: #e8f5e9; color: #2e7d32; }
    .review-chip.corrected { background: #e3f2fd; color: #1565c0; }
    .review-chip.rejected { background: #ffebee; color: #c62828; }
    .review-chip.pending { background: #f3e5f5; color: #6a1b9a; }
    .metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .metric-card {
      background: #f5f5f5; border-radius: 8px; padding: 12px;
      display: flex; flex-direction: column; gap: 4px;
    }
    .metric-card.primary { background: #e8f4fd; }
    .metric-label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
    .metric-value { font-size: 24px; font-weight: 700; color: #1a237e; }
    .metric-value.low-confidence { color: #c62828; }
    .metric-note { font-size: 11px; color: #1565c0; font-style: italic; }
    .unit { font-size: 14px; font-weight: 400; color: #666; margin-left: 2px; }
    .section-title { font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
    .confidence-breakdown, .raw-metrics { display: flex; flex-direction: column; gap: 6px; }
    .cb-row, .raw-row {
      display: flex; justify-content: space-between; align-items: center;
      font-size: 13px; padding: 4px 8px; background: #fafafa; border-radius: 4px;
    }
    .cb-val { font-weight: 600; color: #333; }
    mat-icon.ok { color: #4caf50; font-size: 20px; }
    mat-icon.fail { color: #f44336; font-size: 20px; }
    mat-icon.warn { color: #ff9800; font-size: 20px; }
    .width-samples {
      display: flex; gap: 4px; align-items: flex-end;
      height: 60px; padding: 4px 8px; background: #fafafa; border-radius: 4px;
    }
    .sample-bar-wrapper { display: flex; flex-direction: column; align-items: center; flex: 1; height: 100%; justify-content: flex-end; }
    .sample-bar { background: #1565c0; width: 100%; border-radius: 2px 2px 0 0; min-height: 2px; }
    .sample-label { font-size: 9px; color: #666; white-space: nowrap; }
    .failure-reason {
      display: flex; gap: 8px; align-items: center;
      background: #ffebee; color: #c62828; padding: 8px 12px; border-radius: 4px; font-size: 13px;
    }
    .review-form { display: flex; flex-direction: column; gap: 8px; }
    .full-width { width: 100%; }
    .half-width { width: calc(50% - 4px); }
    .review-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .review-done {
      display: flex; align-items: center; gap: 8px;
      background: #e8f5e9; color: #2e7d32; padding: 10px 14px; border-radius: 6px; font-size: 14px;
    }
    .review-meta { font-size: 11px; color: #666; margin-left: auto; }
  `],
})
export class CrackMetricsPanelComponent {
  @Input() result: CrackAnalysisResult | null = null
  @Input() loading = false
  @Output() reviewed = new EventEmitter<ReviewSubmit>()

  readonly CrackAnalysisReviewStatus = CrackAnalysisReviewStatus
  showCorrectionForm = false

  reviewForm = new FormBuilder().group({
    reviewNote: [''],
    correctedWidthMm: [null as number | null, [Validators.min(0)]],
    correctedLengthMm: [null as number | null, [Validators.min(0)]],
    correctionNote: [''],
  })

  get canReview(): boolean {
    if (!this.result) return false
    return (
      (this.result.analysisStatus === CrackAnalysisStatus.COMPLETED ||
       this.result.analysisStatus === CrackAnalysisStatus.FAILED) &&
      this.result.reviewStatus === CrackAnalysisReviewStatus.PENDING
    )
  }

  get maxSampleWidth(): number {
    return Math.max(...(this.result?.analysis?.widthSamples?.map(s => s.widthMm) ?? [1]), 0.001)
  }

  toggleCorrectionForm(): void {
    this.showCorrectionForm = !this.showCorrectionForm
  }

  submitReview(reviewStatus: 'ACCEPTED' | 'CORRECTED' | 'REJECTED'): void {
    const payload: ReviewSubmit = {
      reviewStatus,
      reviewNote: this.reviewForm.value.reviewNote || undefined,
    }

    if (reviewStatus === 'CORRECTED' && this.showCorrectionForm) {
      const correctedWidthMm = this.reviewForm.value.correctedWidthMm
      if (!correctedWidthMm || correctedWidthMm <= 0) {
        alert('보정 폭(mm)을 입력해주세요.')
        return
      }
      payload.manualCorrection = {
        correctedWidthMm,
        correctedLengthMm: this.reviewForm.value.correctedLengthMm ?? undefined,
        correctionNote: this.reviewForm.value.correctionNote || undefined,
      }
    }

    this.reviewed.emit(payload)
  }

  statusLabel(status: CrackAnalysisStatus): string {
    const map: Record<string, string> = {
      PENDING: '대기', RUNNING: '분석중', COMPLETED: '완료', FAILED: '실패', OVERRIDDEN: '수동보정',
    }
    return map[status] ?? status
  }

  reviewLabel(status: CrackAnalysisReviewStatus): string {
    const map: Record<string, string> = {
      PENDING: '검토대기', ACCEPTED: '수용', CORRECTED: '수동보정', REJECTED: '기각',
    }
    return map[status] ?? status
  }
}
