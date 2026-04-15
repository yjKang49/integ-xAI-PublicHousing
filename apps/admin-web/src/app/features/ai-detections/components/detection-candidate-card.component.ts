// apps/admin-web/src/app/features/ai-detections/components/detection-candidate-card.component.ts
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DefectCandidate } from '../data-access/ai-detections.api';

@Component({
  selector: 'ax-detection-candidate-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatCardModule, MatButtonModule, MatChipsModule,
    MatIconModule, MatTooltipModule,
  ],
  template: `
    <mat-card class="candidate-card" [class]="'status-' + candidate.reviewStatus.toLowerCase()">
      <!-- 헤더 -->
      <mat-card-header>
        <mat-card-title class="card-title">
          <span class="defect-type-badge" [class]="'type-' + candidate.defectType.toLowerCase()">
            {{ defectTypeLabel }}
          </span>
          <mat-chip class="confidence-chip" [class]="'level-' + candidate.confidenceLevel.toLowerCase()">
            <mat-icon>psychology</mat-icon>
            {{ (candidate.confidence * 100).toFixed(0) }}%
          </mat-chip>
        </mat-card-title>
        <mat-card-subtitle>
          <span class="review-badge" [class]="'review-' + candidate.reviewStatus.toLowerCase()">
            {{ reviewStatusLabel }}
          </span>
          @if (candidate.kcsExceedsLimit) {
            <mat-chip color="warn" class="kcs-chip">
              <mat-icon>warning</mat-icon> KCS 기준 초과
            </mat-chip>
          }
        </mat-card-subtitle>
      </mat-card-header>

      <!-- 이미지 + BBox 오버레이 -->
      <mat-card-content>
        <div class="image-container">
          <div class="bbox-overlay" [style]="bboxStyle">
            <span class="bbox-label">{{ defectTypeLabel }}</span>
          </div>
        </div>

        <!-- AI 캡션 -->
        @if (candidate.aiCaption) {
          <p class="ai-caption">
            <mat-icon class="caption-icon">auto_awesome</mat-icon>
            {{ candidate.aiCaption }}
          </p>
        }

        <!-- KCS 참조 -->
        @if (candidate.kcsStandardRef) {
          <p class="kcs-ref">
            <mat-icon>gavel</mat-icon>
            {{ candidate.kcsStandardRef }}
          </p>
        }

        <!-- 메타 정보 -->
        <div class="meta-row">
          <span class="meta-item">
            <mat-icon>source</mat-icon>
            {{ sourceTypeLabel }}
          </span>
          <span class="meta-item">
            <mat-icon>severity_critical</mat-icon>
            {{ candidate.suggestedSeverity ?? '미분류' }}
          </span>
          <span class="meta-item">
            <mat-icon>smart_toy</mat-icon>
            {{ candidate.modelVersion }}
          </span>
        </div>
      </mat-card-content>

      <!-- 액션 버튼 -->
      @if (candidate.reviewStatus === 'PENDING') {
        <mat-card-actions>
          <button mat-raised-button color="primary"
            (click)="onApprove.emit(candidate)"
            matTooltip="검토 승인">
            <mat-icon>check_circle</mat-icon> 승인
          </button>
          <button mat-stroked-button color="warn"
            (click)="onReject.emit(candidate)"
            matTooltip="결함 아님 — 기각">
            <mat-icon>cancel</mat-icon> 기각
          </button>
          <button mat-stroked-button color="accent"
            (click)="onReview.emit(candidate)"
            matTooltip="상세 검토">
            <mat-icon>rate_review</mat-icon> 검토
          </button>
        </mat-card-actions>
      } @else if (candidate.reviewStatus === 'APPROVED') {
        <mat-card-actions>
          <button mat-raised-button color="accent"
            (click)="onPromote.emit(candidate)"
            matTooltip="공식 Defect 문서로 승격">
            <mat-icon>upgrade</mat-icon> Defect 승격
          </button>
          <button mat-stroked-button
            (click)="onReview.emit(candidate)">
            <mat-icon>info</mat-icon> 상세보기
          </button>
        </mat-card-actions>
      } @else if (candidate.reviewStatus === 'PROMOTED') {
        <mat-card-actions>
          <button mat-stroked-button color="primary" disabled>
            <mat-icon>done_all</mat-icon>
            Defect #{{ candidate.promotedDefectId?.slice(-8) }} 로 승격됨
          </button>
        </mat-card-actions>
      }
    </mat-card>
  `,
  styles: [`
    .candidate-card {
      margin-bottom: 12px;
      border-left: 4px solid transparent;
      transition: box-shadow 0.2s;
    }
    .candidate-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .status-pending   { border-left-color: #ff9800; }
    .status-approved  { border-left-color: #4caf50; }
    .status-rejected  { border-left-color: #9e9e9e; opacity: 0.7; }
    .status-promoted  { border-left-color: #2196f3; }

    .card-title { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .defect-type-badge {
      padding: 2px 10px; border-radius: 12px;
      font-weight: 600; font-size: 13px; color: white;
    }
    .type-crack              { background: #f44336; }
    .type-leak               { background: #2196f3; }
    .type-delamination       { background: #ff9800; }
    .type-spoiling           { background: #795548; }
    .type-corrosion          { background: #9c27b0; }
    .type-efflorescence      { background: #009688; }
    .type-fire_risk_cladding { background: #b71c1c; }
    .type-other              { background: #607d8b; }

    .confidence-chip { font-size: 12px; height: 24px; }
    .level-auto_accept    { background: #e8f5e9 !important; color: #2e7d32 !important; }
    .level-requires_review { background: #fff8e1 !important; color: #f57f17 !important; }
    .level-manual_required { background: #fce4ec !important; color: #c62828 !important; }

    .review-badge {
      padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;
    }
    .review-pending  { background: #fff3e0; color: #e65100; }
    .review-approved { background: #e8f5e9; color: #2e7d32; }
    .review-rejected { background: #f5f5f5; color: #616161; }
    .review-promoted { background: #e3f2fd; color: #1565c0; }

    .kcs-chip { background: #ffebee !important; color: #c62828 !important; font-size: 11px; }

    .image-container {
      position: relative; height: 80px;
      background: #f5f5f5; border-radius: 4px;
      margin-bottom: 8px; overflow: hidden;
    }
    .bbox-overlay {
      position: absolute; border: 2px solid #f44336;
      background: rgba(244, 67, 54, 0.1);
    }
    .bbox-label {
      position: absolute; top: -18px; left: 0;
      background: #f44336; color: white;
      font-size: 10px; padding: 1px 4px; border-radius: 2px;
      white-space: nowrap;
    }

    .ai-caption {
      font-size: 13px; color: #555; margin: 4px 0;
      display: flex; align-items: flex-start; gap: 4px;
    }
    .caption-icon { font-size: 16px; color: #7e57c2; flex-shrink: 0; margin-top: 2px; }
    .kcs-ref { font-size: 12px; color: #666; display: flex; align-items: center; gap: 4px; }
    .kcs-ref mat-icon { font-size: 14px; color: #ff7043; }

    .meta-row { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px; }
    .meta-item { font-size: 11px; color: #888; display: flex; align-items: center; gap: 3px; }
    .meta-item mat-icon { font-size: 14px; }

    mat-card-actions { padding: 8px 16px; display: flex; gap: 8px; flex-wrap: wrap; }
    mat-card-actions button { font-size: 12px; }
  `],
})
export class DetectionCandidateCardComponent {
  @Input({ required: true }) candidate!: DefectCandidate;

  @Output() onApprove = new EventEmitter<DefectCandidate>();
  @Output() onReject  = new EventEmitter<DefectCandidate>();
  @Output() onReview  = new EventEmitter<DefectCandidate>();
  @Output() onPromote = new EventEmitter<DefectCandidate>();

  get defectTypeLabel(): string {
    const labels: Record<string, string> = {
      CRACK: '균열', LEAK: '누수', DELAMINATION: '박리',
      SPOILING: '오손', CORROSION: '부식',
      EFFLORESCENCE: '백태', FIRE_RISK_CLADDING: '화재위험외장재', OTHER: '기타',
    };
    return labels[this.candidate.defectType] ?? this.candidate.defectType;
  }

  get reviewStatusLabel(): string {
    const labels: Record<string, string> = {
      PENDING: '검토 대기', APPROVED: '승인됨',
      REJECTED: '기각됨', PROMOTED: '승격 완료',
    };
    return labels[this.candidate.reviewStatus] ?? this.candidate.reviewStatus;
  }

  get sourceTypeLabel(): string {
    const labels: Record<string, string> = {
      DRONE_FRAME: '드론 프레임', DRONE_IMAGE: '드론 이미지',
      MOBILE_PHOTO: '현장 사진', MANUAL: '수동',
    };
    return labels[this.candidate.sourceType] ?? this.candidate.sourceType;
  }

  /** BBox를 CSS 스타일로 변환 (이미지 컨테이너 100% 기준) */
  get bboxStyle(): string {
    const [x, y, w, h] = this.candidate.bbox;
    return `left:${x * 100}%; top:${y * 100}%; width:${w * 100}%; height:${h * 100}%;`;
  }
}
