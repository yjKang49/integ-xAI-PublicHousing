// apps/admin-web/src/app/features/ai-detections/components/detection-review-panel.component.ts
import {
  Component, Input, Output, EventEmitter, OnInit,
  ChangeDetectionStrategy, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  DefectCandidate, AiDetectionsApi,
  ReviewCandidateDto, PromoteCandidateDto,
} from '../data-access/ai-detections.api';

@Component({
  selector: 'ax-detection-review-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatIconModule, MatDividerModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="review-panel">
      @if (!candidate) {
        <div class="empty-state">
          <mat-icon>manage_search</mat-icon>
          <p>결함 후보를 선택하면 검토 패널이 표시됩니다.</p>
        </div>
      } @else {
        <!-- 후보 정보 요약 -->
        <div class="candidate-summary">
          <div class="summary-header">
            <span class="defect-badge" [class]="'type-' + candidate.defectType.toLowerCase()">
              {{ defectTypeLabel }}
            </span>
            <span class="confidence-badge" [class]="'level-' + candidate.confidenceLevel.toLowerCase()">
              <mat-icon>psychology</mat-icon>
              {{ (candidate.confidence * 100).toFixed(0) }}%
            </span>
          </div>
          @if (candidate.aiCaption) {
            <p class="ai-caption">
              <mat-icon>auto_awesome</mat-icon> {{ candidate.aiCaption }}
            </p>
          }
          @if (candidate.kcsStandardRef) {
            <p class="kcs-info" [class.kcs-exceeded]="candidate.kcsExceedsLimit">
              <mat-icon>gavel</mat-icon>
              {{ candidate.kcsStandardRef }}
              @if (candidate.kcsExceedsLimit) { <strong> — KCS 기준 초과</strong> }
            </p>
          }
          <div class="bbox-info">
            <mat-icon>crop_square</mat-icon>
            BBox: [{{ candidate.bbox[0].toFixed(2) }}, {{ candidate.bbox[1].toFixed(2) }},
            {{ candidate.bbox[2].toFixed(2) }}, {{ candidate.bbox[3].toFixed(2) }}]
          </div>
          <div class="meta-grid">
            <div><strong>소스:</strong> {{ sourceTypeLabel }}</div>
            <div><strong>모델:</strong> {{ candidate.modelVersion }}</div>
            <div><strong>제안 심각도:</strong> {{ candidate.suggestedSeverity ?? '미분류' }}</div>
            <div><strong>탐지 Job:</strong> {{ candidate.detectionJobId.slice(-8) }}</div>
          </div>
        </div>

        <mat-divider />

        <!-- 현재 상태 표시 -->
        <div class="current-status">
          <strong>현재 검토 상태:</strong>
          <span class="review-badge" [class]="'review-' + candidate.reviewStatus.toLowerCase()">
            {{ reviewStatusLabel }}
          </span>
          @if (candidate.reviewedAt) {
            <span class="reviewed-at">
              검토: {{ candidate.reviewedAt | date:'MM/dd HH:mm' }}
            </span>
          }
        </div>

        @if (candidate.reviewNote) {
          <div class="existing-note">
            <mat-icon>note</mat-icon> {{ candidate.reviewNote }}
          </div>
        }

        <!-- PENDING / APPROVED 상태일 때 검토 폼 -->
        @if (candidate.reviewStatus === 'PENDING' || candidate.reviewStatus === 'APPROVED') {
          <form [formGroup]="reviewForm" class="review-form">
            <mat-form-field class="full-width">
              <mat-label>검토 메모 (선택)</mat-label>
              <textarea matInput formControlName="reviewNote" rows="2"
                placeholder="검토 의견, 보완 요청 사항 등"></textarea>
            </mat-form-field>

            <div class="action-row">
              <button mat-raised-button color="primary"
                [disabled]="loading()"
                (click)="submitReview('APPROVED')">
                @if (loading()) { <mat-spinner diameter="18" /> }
                <mat-icon>check_circle</mat-icon> 승인
              </button>
              <button mat-stroked-button color="warn"
                [disabled]="loading()"
                (click)="submitReview('REJECTED')">
                <mat-icon>cancel</mat-icon> 기각
              </button>
            </div>
          </form>
        }

        <!-- APPROVED 상태일 때 Defect 승격 폼 -->
        @if (candidate.reviewStatus === 'APPROVED') {
          <mat-divider />
          <div class="promote-section">
            <h4><mat-icon>upgrade</mat-icon> Defect 승격</h4>
            <form [formGroup]="promoteForm">
              <mat-form-field class="full-width">
                <mat-label>결함 유형 (미입력 시 AI 탐지값)</mat-label>
                <mat-select formControlName="defectType">
                  <mat-option value="">AI 탐지값 사용 ({{ defectTypeLabel }})</mat-option>
                  @for (type of defectTypeOptions; track type.value) {
                    <mat-option [value]="type.value">{{ type.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field class="full-width">
                <mat-label>심각도 (미입력 시 AI 제안값)</mat-label>
                <mat-select formControlName="severity">
                  <mat-option value="">AI 제안값 사용 ({{ candidate.suggestedSeverity ?? '미분류' }})</mat-option>
                  <mat-option value="LOW">경미 (LOW)</mat-option>
                  <mat-option value="MEDIUM">보통 (MEDIUM)</mat-option>
                  <mat-option value="HIGH">높음 (HIGH)</mat-option>
                  <mat-option value="CRITICAL">긴급 (CRITICAL)</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field class="full-width">
                <mat-label>설명 (미입력 시 AI 캡션 사용)</mat-label>
                <textarea matInput formControlName="description" rows="2"></textarea>
              </mat-form-field>

              <mat-form-field class="full-width">
                <mat-label>위치 설명</mat-label>
                <input matInput formControlName="locationDescription" />
              </mat-form-field>

              <mat-form-field class="full-width">
                <mat-label>점검 세션 ID (선택)</mat-label>
                <input matInput formControlName="sessionId" />
              </mat-form-field>

              <button mat-raised-button color="accent"
                class="full-width" style="margin-top: 8px"
                [disabled]="loading()"
                (click)="submitPromote()">
                @if (loading()) { <mat-spinner diameter="18" /> }
                <mat-icon>upgrade</mat-icon> Defect 문서 생성 및 승격
              </button>
            </form>
          </div>
        }

        <!-- PROMOTED 상태 -->
        @if (candidate.reviewStatus === 'PROMOTED') {
          <div class="promoted-info">
            <mat-icon>done_all</mat-icon>
            <span>Defect 문서로 승격 완료</span>
            <code>{{ candidate.promotedDefectId }}</code>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .review-panel { padding: 16px; min-width: 320px; max-width: 440px; }
    .empty-state {
      text-align: center; padding: 32px;
      color: #aaa; display: flex; flex-direction: column; align-items: center; gap: 8px;
    }
    .empty-state mat-icon { font-size: 48px; color: #ccc; }

    .candidate-summary { margin-bottom: 16px; }
    .summary-header { display: flex; gap: 8px; margin-bottom: 8px; align-items: center; }

    .defect-badge {
      padding: 3px 10px; border-radius: 12px; font-weight: 600;
      font-size: 13px; color: white;
    }
    .type-crack              { background: #f44336; }
    .type-leak               { background: #2196f3; }
    .type-delamination       { background: #ff9800; }
    .type-spoiling           { background: #795548; }
    .type-corrosion          { background: #9c27b0; }
    .type-efflorescence      { background: #009688; }
    .type-fire_risk_cladding { background: #b71c1c; }
    .type-other              { background: #607d8b; }

    .confidence-badge {
      display: flex; align-items: center; gap: 2px;
      padding: 2px 8px; border-radius: 12px; font-size: 13px;
    }
    .level-auto_accept     { background: #e8f5e9; color: #2e7d32; }
    .level-requires_review { background: #fff8e1; color: #f57f17; }
    .level-manual_required { background: #fce4ec; color: #c62828; }

    .ai-caption {
      font-size: 13px; color: #555; display: flex; align-items: flex-start; gap: 4px;
      margin: 6px 0;
    }
    .ai-caption mat-icon { font-size: 16px; color: #7e57c2; flex-shrink: 0; }
    .kcs-info { font-size: 12px; color: #666; display: flex; align-items: center; gap: 4px; }
    .kcs-exceeded { color: #c62828; font-weight: 500; }
    .kcs-info mat-icon { font-size: 14px; color: #ff7043; }
    .bbox-info { font-size: 11px; color: #888; display: flex; align-items: center; gap: 3px; margin: 4px 0; }
    .bbox-info mat-icon { font-size: 14px; }

    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 12px; color: #666; margin-top: 8px; }

    .current-status {
      display: flex; align-items: center; gap: 8px;
      margin: 12px 0; font-size: 13px;
    }
    .review-badge {
      padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;
    }
    .review-pending  { background: #fff3e0; color: #e65100; }
    .review-approved { background: #e8f5e9; color: #2e7d32; }
    .review-rejected { background: #f5f5f5; color: #616161; }
    .review-promoted { background: #e3f2fd; color: #1565c0; }
    .reviewed-at { font-size: 11px; color: #999; }

    .existing-note {
      background: #f5f5f5; padding: 8px; border-radius: 4px;
      font-size: 12px; color: #555; display: flex; align-items: center; gap: 4px;
      margin-bottom: 12px;
    }

    .review-form { margin-top: 16px; }
    .action-row { display: flex; gap: 8px; margin-top: 8px; }
    .full-width { width: 100%; }

    .promote-section { margin-top: 16px; }
    .promote-section h4 { display: flex; align-items: center; gap: 6px; margin: 8px 0 12px; color: #7b1fa2; }
    .promote-section h4 mat-icon { color: #7b1fa2; }

    .promoted-info {
      margin-top: 16px; padding: 12px;
      background: #e3f2fd; border-radius: 4px;
      display: flex; flex-direction: column; align-items: center;
      gap: 4px; color: #1565c0;
    }
    .promoted-info mat-icon { font-size: 32px; color: #1976d2; }
    .promoted-info code { font-size: 11px; color: #555; }
  `],
})
export class DetectionReviewPanelComponent implements OnInit {
  @Input() candidate: DefectCandidate | null = null;
  @Output() reviewed = new EventEmitter<DefectCandidate>();
  @Output() promoted = new EventEmitter<{ candidate: DefectCandidate; defect: any }>();

  loading = signal(false);
  reviewForm!: FormGroup;
  promoteForm!: FormGroup;

  readonly defectTypeOptions = [
    { value: 'CRACK',              label: '균열' },
    { value: 'LEAK',               label: '누수' },
    { value: 'DELAMINATION',       label: '박리/박락' },
    { value: 'SPOILING',           label: '오손/오염' },
    { value: 'CORROSION',          label: '부식' },
    { value: 'EFFLORESCENCE',      label: '백태' },
    { value: 'FIRE_RISK_CLADDING', label: '화재위험 외장재' },
    { value: 'OTHER',              label: '기타' },
  ];

  constructor(private fb: FormBuilder, private api: AiDetectionsApi) {}

  ngOnInit(): void {
    this.reviewForm  = this.fb.group({ reviewNote: [''] });
    this.promoteForm = this.fb.group({
      defectType: [''], severity: [''], description: [''],
      locationDescription: [''], sessionId: [''],
    });
  }

  get defectTypeLabel(): string {
    const m: Record<string, string> = {
      CRACK: '균열', LEAK: '누수', DELAMINATION: '박리',
      SPOILING: '오손', CORROSION: '부식',
      EFFLORESCENCE: '백태', FIRE_RISK_CLADDING: '화재위험외장재', OTHER: '기타',
    };
    return m[this.candidate?.defectType ?? ''] ?? '';
  }

  get reviewStatusLabel(): string {
    const m: Record<string, string> = {
      PENDING: '검토 대기', APPROVED: '승인됨', REJECTED: '기각됨', PROMOTED: '승격 완료',
    };
    return m[this.candidate?.reviewStatus ?? ''] ?? '';
  }

  get sourceTypeLabel(): string {
    const m: Record<string, string> = {
      DRONE_FRAME: '드론 프레임', DRONE_IMAGE: '드론 이미지',
      MOBILE_PHOTO: '현장 사진', MANUAL: '수동',
    };
    return m[this.candidate?.sourceType ?? ''] ?? '';
  }

  submitReview(status: 'APPROVED' | 'REJECTED'): void {
    if (!this.candidate) return;
    this.loading.set(true);
    const dto: ReviewCandidateDto = {
      reviewStatus: status,
      reviewNote: this.reviewForm.value.reviewNote || undefined,
    };
    this.api.review(this.candidate._id, dto).subscribe({
      next: (updated) => {
        this.loading.set(false);
        this.reviewed.emit(updated);
      },
      error: () => this.loading.set(false),
    });
  }

  submitPromote(): void {
    if (!this.candidate) return;
    this.loading.set(true);
    const v = this.promoteForm.value;
    const dto: PromoteCandidateDto = {
      ...(v.defectType       && { defectType:          v.defectType }),
      ...(v.severity         && { severity:             v.severity }),
      ...(v.description      && { description:          v.description }),
      ...(v.locationDescription && { locationDescription: v.locationDescription }),
      ...(v.sessionId        && { sessionId:            v.sessionId }),
    };
    this.api.promote(this.candidate._id, dto).subscribe({
      next: (result) => {
        this.loading.set(false);
        this.promoted.emit(result);
      },
      error: () => this.loading.set(false),
    });
  }
}
