// apps/admin-web/src/app/features/complaints/components/triage-result-panel.component.ts
// AI 트리아지 결과 패널 — 민원 상세 페이지에 삽입하여 AI 분류 결과 표시
import { Component, Input, Output, EventEmitter, OnChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { environment } from '../../../../environments/environment';

export interface TriageResult {
  _id: string;
  status: string;
  decisionStatus: string;
  aiCategory?: string;
  aiSeverity?: string;
  urgencyScore: number;
  suggestedPriority?: string;
  suggestedSla?: string;
  routingSuggestions: Array<{
    type: string;
    targetId: string;
    targetName: string;
    reason: string;
    confidence: number;
  }>;
  classificationReason?: string;
  keywordMatches?: string[];
  confidence: number;
  isRuleBased: boolean;
  acceptedCategory?: string;
  acceptedPriority?: string;
  acceptedAssigneeId?: string;
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  FACILITY: '시설물 결함', SAFETY: '안전', NOISE: '소음',
  SANITATION: '위생', PARKING: '주차', ELEVATOR: '엘리베이터', OTHER: '기타',
};
const SEVERITY_COLORS: Record<string, string> = {
  LOW: '#4caf50', MEDIUM: '#2196f3', HIGH: '#ff9800', CRITICAL: '#f44336',
};
const PRIORITY_LABELS: Record<string, string> = {
  LOW: '낮음', MEDIUM: '보통', HIGH: '높음', URGENT: '긴급',
};

@Component({
  selector: 'ax-triage-result-panel',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatSelectModule,
    MatFormFieldModule, MatInputModule, MatChipsModule, MatTooltipModule,
    MatProgressSpinnerModule, MatDividerModule, MatBadgeModule,
  ],
  template: `
    <mat-card class="triage-panel">
      <mat-card-header>
        <mat-icon mat-card-avatar class="ai-icon">smart_toy</mat-icon>
        <mat-card-title>AI 민원 분류 결과</mat-card-title>
        <mat-card-subtitle>
          @if (triage()) {
            {{ triage()!.isRuleBased ? 'Rule-based 분류' : 'AI 분류' }}
            · 신뢰도 {{ (triage()!.confidence * 100).toFixed(0) }}%
          }
        </mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>
        <!-- 로딩 중 -->
        @if (loading()) {
          <div class="loading-row">
            <mat-spinner diameter="24" />
            <span>트리아지 데이터 로딩 중...</span>
          </div>
        }

        <!-- 트리아지 없음 -->
        @else if (!triage()) {
          <div class="empty-state">
            <mat-icon>psychology_alt</mat-icon>
            <p>아직 AI 분류가 실행되지 않았습니다.</p>
            <button mat-stroked-button color="primary" (click)="triggerTriage()" [disabled]="triggering()">
              <mat-icon>play_arrow</mat-icon>
              {{ triggering() ? 'AI 분류 요청 중...' : 'AI 분류 실행' }}
            </button>
          </div>
        }

        <!-- 분석 중 -->
        @else if (triage()!.status === 'PROCESSING' || triage()!.status === 'PENDING') {
          <div class="loading-row">
            <mat-spinner diameter="24" color="accent" />
            <span>AI 분류 진행 중... 잠시 후 새로고침 해주세요.</span>
          </div>
        }

        <!-- 결과 표시 -->
        @else if (triage()!.status === 'COMPLETED') {
          <!-- 결정 상태 배지 -->
          <div class="decision-row">
            <span class="decision-badge" [class]="'decision-' + triage()!.decisionStatus.toLowerCase()">
              <mat-icon>{{ getDecisionIcon(triage()!.decisionStatus) }}</mat-icon>
              {{ getDecisionLabel(triage()!.decisionStatus) }}
            </span>
            @if (triage()!.isRuleBased) {
              <span class="rule-badge" matTooltip="AI 미응답으로 키워드 기반 자동 분류 적용">
                <mat-icon>rule</mat-icon> Rule-based
              </span>
            }
          </div>

          <!-- AI 분류 결과 그리드 -->
          <div class="result-grid">
            <div class="result-item">
              <span class="result-label">분류 카테고리</span>
              <span class="result-value">{{ getCategoryLabel(triage()!.aiCategory) }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">심각도</span>
              <span class="severity-dot" [style.background]="getSeverityColor(triage()!.aiSeverity)"></span>
              <span class="result-value">{{ triage()!.aiSeverity ?? '-' }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">긴급도 점수</span>
              <span class="urgency-score" [class]="getUrgencyClass(triage()!.urgencyScore)">
                {{ triage()!.urgencyScore }}
              </span>
            </div>
            <div class="result-item">
              <span class="result-label">추천 우선순위</span>
              <span class="result-value">{{ getPriorityLabel(triage()!.suggestedPriority) }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">권장 SLA</span>
              <span class="result-value">{{ triage()!.suggestedSla ?? '-' }}</span>
            </div>
          </div>

          <!-- 키워드 -->
          @if (triage()!.keywordMatches?.length) {
            <div class="keyword-row">
              <span class="result-label">탐지 키워드</span>
              <div class="keyword-chips">
                @for (kw of triage()!.keywordMatches; track kw) {
                  <mat-chip size="small">{{ kw }}</mat-chip>
                }
              </div>
            </div>
          }

          <!-- 분류 근거 -->
          @if (triage()!.classificationReason) {
            <div class="reason-box">
              <mat-icon class="reason-icon">info_outline</mat-icon>
              <p>{{ triage()!.classificationReason }}</p>
            </div>
          }

          <mat-divider />

          <!-- 라우팅 추천 -->
          <h4 class="section-title">
            <mat-icon>group</mat-icon> 담당팀/담당자 추천
          </h4>
          @for (r of triage()!.routingSuggestions; track r.targetId; let i = $index) {
            <div class="routing-item" [class.top-suggestion]="i === 0">
              <div class="routing-header">
                <mat-icon>{{ r.type === 'USER' ? 'person' : 'groups' }}</mat-icon>
                <span class="routing-name">{{ r.targetName }}</span>
                <span class="routing-confidence">{{ (r.confidence * 100).toFixed(0) }}%</span>
              </div>
              <p class="routing-reason">{{ r.reason }}</p>
            </div>
          }

          <!-- 검토 확정 영역 (PENDING_REVIEW 상태일 때만) -->
          @if (triage()!.decisionStatus === 'PENDING_REVIEW') {
            <mat-divider />
            <h4 class="section-title">
              <mat-icon>how_to_reg</mat-icon> 검토 및 확정
            </h4>
            <div class="review-form">
              <mat-form-field appearance="outline" class="review-field">
                <mat-label>카테고리 확정</mat-label>
                <mat-select [(ngModel)]="reviewCategory">
                  @for (cat of categories; track cat.value) {
                    <mat-option [value]="cat.value">{{ cat.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="review-field">
                <mat-label>우선순위 확정</mat-label>
                <mat-select [(ngModel)]="reviewPriority">
                  <mat-option value="LOW">낮음</mat-option>
                  <mat-option value="MEDIUM">보통</mat-option>
                  <mat-option value="HIGH">높음</mat-option>
                  <mat-option value="URGENT">긴급</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="review-field">
                <mat-label>담당자 배정 (userId)</mat-label>
                <input matInput [(ngModel)]="reviewAssigneeId" placeholder="담당자 userId 입력" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="review-field full-width">
                <mat-label>검토 메모 (선택)</mat-label>
                <textarea matInput rows="2" [(ngModel)]="reviewNote" placeholder="검토 내용 입력"></textarea>
              </mat-form-field>

              <div class="review-actions">
                <button mat-raised-button color="primary" (click)="submitReview('ACCEPT')" [disabled]="reviewing()">
                  <mat-icon>check_circle</mat-icon> 수락
                </button>
                <button mat-stroked-button color="accent" (click)="submitReview('MODIFY')" [disabled]="reviewing()">
                  <mat-icon>edit</mat-icon> 수정 확정
                </button>
                <button mat-stroked-button color="warn" (click)="submitReview('REJECT')" [disabled]="reviewing()">
                  <mat-icon>cancel</mat-icon> 기각
                </button>
              </div>
            </div>
          }

          <!-- 확정 완료 결과 -->
          @if (triage()!.decisionStatus === 'ACCEPTED' || triage()!.decisionStatus === 'MODIFIED') {
            <div class="accepted-result">
              <mat-icon color="primary">verified</mat-icon>
              <span>
                {{ triage()!.decisionStatus === 'ACCEPTED' ? '수락' : '수정 확정' }} 완료
                @if (triage()!.reviewedBy) { · 담당자: {{ triage()!.reviewedBy }} }
                @if (triage()!.acceptedAssigneeId) { · 배정: {{ triage()!.acceptedAssigneeId }} }
              </span>
            </div>
          }
        }

        <!-- 실패 상태 -->
        @else if (triage()!.status === 'FAILED') {
          <div class="failed-state">
            <mat-icon color="warn">error</mat-icon>
            <p>AI 분류 실패: {{ triage()!['failureReason'] ?? '알 수 없는 오류' }}</p>
            <button mat-stroked-button color="warn" (click)="triggerTriage()">재시도</button>
          </div>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .triage-panel { margin-bottom: 16px; }
    .ai-icon { color: #7c4dff; }
    .loading-row { display: flex; align-items: center; gap: 12px; padding: 16px 0; color: #666; }
    .empty-state { text-align: center; padding: 24px; color: #999; }
    .empty-state mat-icon { font-size: 40px; width: 40px; height: 40px; margin-bottom: 8px; }
    .empty-state p { margin: 8px 0 16px; }
    .decision-row { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
    .decision-badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 600;
    }
    .decision-pending_review { background: #fff9c4; color: #f57f17; }
    .decision-accepted       { background: #e8f5e9; color: #2e7d32; }
    .decision-modified       { background: #e3f2fd; color: #1565c0; }
    .decision-rejected       { background: #ffebee; color: #c62828; }
    .rule-badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 8px; border-radius: 12px; font-size: 11px;
      background: #f5f5f5; color: #616161;
    }
    .result-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
      background: #fafafa; padding: 12px; border-radius: 8px; margin-bottom: 12px;
    }
    .result-item { display: flex; flex-direction: column; gap: 2px; }
    .result-label { font-size: 11px; color: #888; }
    .result-value { font-size: 13px; font-weight: 600; }
    .severity-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .urgency-score {
      font-size: 18px; font-weight: 700;
    }
    .urgency-low    { color: #4caf50; }
    .urgency-medium { color: #ff9800; }
    .urgency-high   { color: #f44336; }
    .keyword-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
    .keyword-chips { display: flex; gap: 4px; flex-wrap: wrap; }
    .reason-box {
      display: flex; align-items: flex-start; gap: 8px;
      background: #f3e5f5; padding: 10px 12px; border-radius: 6px; margin-bottom: 12px;
    }
    .reason-icon { color: #7c4dff; font-size: 18px; }
    .reason-box p { margin: 0; font-size: 13px; color: #4a148c; line-height: 1.5; }
    .section-title {
      display: flex; align-items: center; gap: 4px;
      font-size: 13px; font-weight: 600; margin: 12px 0 8px; color: #444;
    }
    .routing-item {
      border: 1px solid #e0e0e0; border-radius: 8px;
      padding: 10px 12px; margin-bottom: 8px;
    }
    .routing-item.top-suggestion { border-color: #7c4dff; background: #f9f5ff; }
    .routing-header { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
    .routing-name { font-weight: 600; flex: 1; }
    .routing-confidence { font-size: 12px; color: #666; }
    .routing-reason { margin: 0; font-size: 12px; color: #666; }
    .review-form { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
    .review-field { width: 100%; }
    .full-width { width: 100%; }
    .review-actions { display: flex; gap: 8px; justify-content: flex-end; }
    .accepted-result {
      display: flex; align-items: center; gap: 8px;
      background: #e8f5e9; padding: 10px 12px; border-radius: 6px;
      margin-top: 12px; font-size: 13px; color: #2e7d32;
    }
    .failed-state { text-align: center; padding: 16px; color: #c62828; }
    mat-divider { margin: 12px 0; }
  `],
})
export class TriageResultPanelComponent implements OnChanges {
  @Input() complaintId!: string;
  @Input() complexId!: string;
  @Output() triageConfirmed = new EventEmitter<TriageResult>();

  private readonly http = inject(HttpClient);

  readonly triage     = signal<TriageResult | null>(null);
  readonly loading    = signal(false);
  readonly triggering = signal(false);
  readonly reviewing  = signal(false);

  reviewCategory  = '';
  reviewPriority  = '';
  reviewAssigneeId = '';
  reviewNote      = '';

  readonly categories = [
    { value: 'FACILITY',   label: '시설물 결함' },
    { value: 'SAFETY',     label: '안전' },
    { value: 'NOISE',      label: '소음' },
    { value: 'SANITATION', label: '위생' },
    { value: 'PARKING',    label: '주차' },
    { value: 'ELEVATOR',   label: '엘리베이터' },
    { value: 'OTHER',      label: '기타' },
  ];

  ngOnChanges() {
    if (this.complaintId) this.loadTriage();
  }

  loadTriage() {
    this.loading.set(true);
    this.http
      .get<TriageResult>(`${environment.apiUrl}/complaint-triage/by-complaint/${this.complaintId}`)
      .subscribe({
        next: (res) => {
          this.triage.set(res ?? null);
          if (res) {
            this.reviewCategory   = res.aiCategory   ?? '';
            this.reviewPriority   = res.suggestedPriority ?? '';
          }
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  triggerTriage() {
    this.triggering.set(true);
    this.http
      .post<{ triageId: string; jobId: string }>(
        `${environment.apiUrl}/complaint-triage/trigger`,
        { complaintId: this.complaintId, complexId: this.complexId, model: 'MOCK' },
      )
      .subscribe({
        next: () => {
          this.triggering.set(false);
          setTimeout(() => this.loadTriage(), 2000);
        },
        error: () => this.triggering.set(false),
      });
  }

  submitReview(decision: 'ACCEPT' | 'MODIFY' | 'REJECT') {
    if (!this.triage()) return;
    this.reviewing.set(true);

    const body: any = {
      decision,
      reviewNote: this.reviewNote || undefined,
      acceptedAssigneeId: this.reviewAssigneeId || undefined,
    };
    if (decision === 'MODIFY') {
      body.acceptedCategory = this.reviewCategory || undefined;
      body.acceptedPriority = this.reviewPriority || undefined;
    }

    this.http
      .post<TriageResult>(
        `${environment.apiUrl}/complaint-triage/${this.triage()!._id}/review`,
        body,
      )
      .subscribe({
        next: (updated) => {
          this.triage.set(updated);
          this.reviewing.set(false);
          this.triageConfirmed.emit(updated);
        },
        error: () => this.reviewing.set(false),
      });
  }

  getCategoryLabel(cat?: string) { return cat ? (CATEGORY_LABELS[cat] ?? cat) : '-'; }
  getSeverityColor(sev?: string) { return sev ? (SEVERITY_COLORS[sev] ?? '#9e9e9e') : '#9e9e9e'; }
  getPriorityLabel(p?: string)   { return p ? (PRIORITY_LABELS[p] ?? p) : '-'; }
  getUrgencyClass(score: number) {
    if (score >= 70) return 'urgency-high';
    if (score >= 40) return 'urgency-medium';
    return 'urgency-low';
  }
  getDecisionLabel(s: string) {
    const map: Record<string, string> = {
      PENDING_REVIEW: '검토대기', ACCEPTED: '수락됨', MODIFIED: '수정확정', REJECTED: '기각됨',
    };
    return map[s] ?? s;
  }
  getDecisionIcon(s: string) {
    const map: Record<string, string> = {
      PENDING_REVIEW: 'hourglass_empty', ACCEPTED: 'check_circle',
      MODIFIED: 'edit_note', REJECTED: 'cancel',
    };
    return map[s] ?? 'help';
  }
}
