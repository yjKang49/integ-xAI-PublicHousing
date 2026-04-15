// apps/admin-web/src/app/features/complaints/pages/triage-queue-page.component.ts
// Triage Queue 페이지 — 검토 대기 중인 AI 분류 결과 목록 + Human-in-the-loop 처리
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { RoutingSuggestionCardComponent } from '../components/routing-suggestion-card.component';
import { KobertClassifierComponent } from '../components/kobert-classifier.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { environment } from '../../../../environments/environment';

interface TriageItem {
  _id: string;
  complaintId: string;
  status: string;
  decisionStatus: string;
  aiCategory?: string;
  aiSeverity?: string;
  urgencyScore: number;
  suggestedPriority?: string;
  suggestedSla?: string;
  routingSuggestions: Array<{
    type: string; targetId: string; targetName: string;
    reason: string; confidence: number;
  }>;
  classificationReason?: string;
  keywordMatches?: string[];
  confidence: number;
  isRuleBased: boolean;
  createdAt: string;
  complaint?: {
    title: string; submittedBy: string; category: string; priority: string;
  };
}

interface TriageStats {
  total: number;
  pendingReview: number;
  accepted: number;
  modified: number;
  rejected: number;
  ruleBased: number;
  avgUrgency: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  FACILITY: '시설물 결함', SAFETY: '안전', NOISE: '소음',
  SANITATION: '위생', PARKING: '주차', ELEVATOR: '엘리베이터', OTHER: '기타',
};
const DECISION_CONFIG: Record<string, { label: string; icon: string }> = {
  PENDING_REVIEW: { label: '검토대기', icon: 'hourglass_empty' },
  ACCEPTED:       { label: '수락',     icon: 'check_circle' },
  MODIFIED:       { label: '수정확정', icon: 'edit_note' },
  REJECTED:       { label: '기각',     icon: 'cancel' },
};

@Component({
  selector: 'ax-triage-queue-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatTableModule, MatPaginatorModule,
    MatButtonModule, MatIconModule, MatSelectModule,
    MatFormFieldModule, MatInputModule,
    MatTooltipModule, MatProgressBarModule, MatProgressSpinnerModule,
    MatDialogModule, MatSnackBarModule, MatDividerModule, MatTabsModule,
    RoutingSuggestionCardComponent, KobertClassifierComponent,
    EmptyStateComponent,
  ],
  template: `
    <!-- 페이지 헤더 -->
    <div class="ax-triage-header">
      <div class="ax-triage-header__identity">
        <div class="ax-triage-header__icon-wrap">
          <mat-icon>psychology</mat-icon>
        </div>
        <div>
          <h1 class="ax-triage-header__title">민원 AI 트리아지 큐</h1>
          <p class="ax-triage-header__desc">KoBERT 분류 결과를 검토하고 Human-in-the-loop 처리를 수행합니다</p>
        </div>
      </div>
      <button mat-stroked-button (click)="loadTriages(); loadStats()" matTooltip="데이터 새로고침">
        <mat-icon>refresh</mat-icon> 새로고침
      </button>
    </div>

    <mat-tab-group animationDuration="150ms" class="ax-triage-tabs">

      <!-- ── 탭 1: 검토 큐 ── -->
      <mat-tab>
        <ng-template mat-tab-label>
          <mat-icon>inbox</mat-icon>
          AI 분류 검토 큐
          @if (stats()?.pendingReview) {
            <span class="ax-tab-badge ax-tab-badge--danger">{{ stats()!.pendingReview }}</span>
          }
        </ng-template>

        <!-- 통계 카운터 -->
        @if (stats()) {
          <div class="ax-triage-stats">
            <button
              class="ax-triage-stat ax-triage-stat--warn"
              [class.ax-triage-stat--active]="filterDecisionStatus === 'PENDING_REVIEW'"
              (click)="filterDecision('PENDING_REVIEW')"
            >
              <span class="ax-triage-stat__num">{{ stats()!.pendingReview }}</span>
              <span class="ax-triage-stat__lbl">검토 대기</span>
            </button>
            <button
              class="ax-triage-stat ax-triage-stat--success"
              [class.ax-triage-stat--active]="filterDecisionStatus === 'ACCEPTED'"
              (click)="filterDecision('ACCEPTED')"
            >
              <span class="ax-triage-stat__num">{{ stats()!.accepted }}</span>
              <span class="ax-triage-stat__lbl">수락</span>
            </button>
            <button
              class="ax-triage-stat ax-triage-stat--info"
              [class.ax-triage-stat--active]="filterDecisionStatus === 'MODIFIED'"
              (click)="filterDecision('MODIFIED')"
            >
              <span class="ax-triage-stat__num">{{ stats()!.modified }}</span>
              <span class="ax-triage-stat__lbl">수정 확정</span>
            </button>
            <button
              class="ax-triage-stat ax-triage-stat--danger"
              [class.ax-triage-stat--active]="filterDecisionStatus === 'REJECTED'"
              (click)="filterDecision('REJECTED')"
            >
              <span class="ax-triage-stat__num">{{ stats()!.rejected }}</span>
              <span class="ax-triage-stat__lbl">기각</span>
            </button>
            <div class="ax-triage-stat ax-triage-stat--neutral">
              <span class="ax-triage-stat__num">{{ stats()!.ruleBased }}</span>
              <span class="ax-triage-stat__lbl">Rule-based</span>
            </div>
            <div class="ax-triage-stat" [class]="'ax-triage-stat--' + getUrgencyVariant(stats()!.avgUrgency)">
              <span class="ax-triage-stat__num">{{ stats()!.avgUrgency }}</span>
              <span class="ax-triage-stat__lbl">평균 긴급도</span>
            </div>
          </div>
        }

        <!-- 필터 바 -->
        <div class="ax-filter-bar ax-filter-bar--inline">
          <div class="ax-filter-bar__filters">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>결정 상태</mat-label>
              <mat-select [(ngModel)]="filterDecisionStatus" (ngModelChange)="loadTriages()">
                <mat-option value="">전체</mat-option>
                <mat-option value="PENDING_REVIEW">검토대기</mat-option>
                <mat-option value="ACCEPTED">수락</mat-option>
                <mat-option value="MODIFIED">수정확정</mat-option>
                <mat-option value="REJECTED">기각</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>처리 상태</mat-label>
              <mat-select [(ngModel)]="filterStatus" (ngModelChange)="loadTriages()">
                <mat-option value="">전체</mat-option>
                <mat-option value="COMPLETED">완료</mat-option>
                <mat-option value="PROCESSING">분석중</mat-option>
                <mat-option value="FAILED">실패</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </div>

        <!-- 트리아지 목록 -->
        <div class="ax-triage-list">
          @if (loading()) {
            <mat-progress-bar mode="indeterminate" />
          }

          @for (item of triages(); track item._id) {
            <div class="ax-triage-card" [class.ax-triage-card--pending]="item.decisionStatus === 'PENDING_REVIEW'">

              <!-- 카드 헤더 -->
              <div class="ax-triage-card__hdr">
                <div class="ax-triage-card__hdr-left">
                  <div class="ax-triage-card__urgency" [class]="'ax-triage-card__urgency--' + getUrgencyVariant(item.urgencyScore)">
                    {{ item.urgencyScore }}
                  </div>
                  <div class="ax-triage-card__info">
                    <a [routerLink]="['/complaints', item.complaintId]" class="ax-triage-card__link">
                      {{ item.complaint?.title ?? item.complaintId }}
                    </a>
                    <div class="ax-triage-card__meta">
                      <span class="ax-triage-card__category">{{ getCategoryLabel(item.aiCategory) }}</span>
                      <span class="ax-triage-card__sev-dot ax-triage-card__sev-dot--{{ item.aiSeverity?.toLowerCase() ?? 'none' }}"></span>
                      <span class="ax-triage-card__sev-lbl">{{ item.aiSeverity ?? '-' }}</span>
                      @if (item.suggestedSla) {
                        <span class="ax-triage-card__chip ax-triage-card__chip--sla">SLA: {{ item.suggestedSla }}</span>
                      }
                      @if (item.isRuleBased) {
                        <span class="ax-triage-card__chip ax-triage-card__chip--rule"
                          matTooltip="AI 미응답 — 키워드 기반 자동 분류">
                          Rule-based
                        </span>
                      }
                    </div>
                  </div>
                </div>
                <div class="ax-triage-card__hdr-right">
                  <span class="ax-triage-card__decision ax-triage-card__decision--{{ item.decisionStatus.toLowerCase() }}">
                    <mat-icon class="ax-triage-card__decision-icon">{{ getDecisionIcon(item.decisionStatus) }}</mat-icon>
                    {{ getDecisionLabel(item.decisionStatus) }}
                  </span>
                  <span class="ax-triage-card__conf">신뢰도 {{ (item.confidence * 100).toFixed(0) }}%</span>
                  <span class="ax-triage-card__date">{{ item.createdAt | date:'MM/dd HH:mm' }}</span>
                </div>
              </div>

              <!-- 키워드 -->
              @if (item.keywordMatches?.length) {
                <div class="ax-triage-card__keywords">
                  @for (kw of item.keywordMatches; track kw) {
                    <span class="ax-triage-card__kw">{{ kw }}</span>
                  }
                </div>
              }

              <!-- 분류 근거 -->
              @if (item.classificationReason) {
                <p class="ax-triage-card__reason">{{ item.classificationReason }}</p>
              }

              <!-- 라우팅 추천 (상위 2개) -->
              @if (item.routingSuggestions?.length) {
                <mat-divider />
                <div class="ax-triage-card__routing">
                  <span class="ax-triage-card__routing-title">
                    <mat-icon>group</mat-icon> 추천 담당팀
                  </span>
                  @for (s of item.routingSuggestions.slice(0, 2); track s.targetId; let i = $index) {
                    <ax-routing-suggestion-card
                      [suggestion]="s"
                      [rank]="i"
                      [selected]="selectedAssignees[item._id] === s.targetId"
                      [showAssignButton]="item.decisionStatus === 'PENDING_REVIEW'"
                      (assign)="selectAssignee(item._id, s.targetId)"
                    />
                  }
                </div>
              }

              <!-- 검토 액션 버튼 -->
              @if (item.decisionStatus === 'PENDING_REVIEW' && item.status === 'COMPLETED') {
                <mat-divider />
                <div class="ax-triage-card__actions">
                  <button mat-flat-button color="primary" (click)="quickReview(item, 'ACCEPT')"
                    [disabled]="reviewing()[item._id]" matTooltip="AI 결과 그대로 수락">
                    <mat-icon>check_circle</mat-icon> 수락
                  </button>
                  <button mat-stroked-button (click)="openModifyDialog(item)"
                    [disabled]="reviewing()[item._id]" matTooltip="수정 후 확정">
                    <mat-icon>edit</mat-icon> 수정 확정
                  </button>
                  <button mat-stroked-button color="warn" (click)="quickReview(item, 'REJECT')"
                    [disabled]="reviewing()[item._id]" matTooltip="기각하고 수동 처리">
                    <mat-icon>cancel</mat-icon> 기각
                  </button>
                  <a mat-button [routerLink]="['/complaints', item.complaintId]" matTooltip="민원 상세 보기">
                    <mat-icon>open_in_new</mat-icon> 민원 보기
                  </a>
                  @if (reviewing()[item._id]) {
                    <mat-spinner diameter="20" />
                  }
                </div>
              }
            </div>
          }

          @if (!loading() && triages().length === 0) {
            <ax-empty-state
              type="search-no-result"
              icon="psychology_alt"
              title="조건에 맞는 트리아지 결과가 없습니다"
              description="필터를 변경하거나 초기화해 보세요"
              primaryLabel="필터 초기화"
              primaryIcon="clear_all"
              (primaryAction)="filterDecisionStatus = ''; filterStatus = ''; loadTriages()"
            />
          }
        </div>

        <mat-paginator
          [length]="totalCount()"
          [pageSize]="pageSize"
          [pageSizeOptions]="[10, 20, 50]"
          (page)="onPage($event)"
          showFirstLastButtons
        />
      </mat-tab>

      <!-- ── 탭 2: KoBERT 실시간 분류 시뮬레이터 ── -->
      <mat-tab>
        <ng-template mat-tab-label>
          <mat-icon class="ax-triage-tabs__kobert-icon">psychology</mat-icon>
          KoBERT 분류 시뮬레이터
          <span class="ax-tab-badge ax-tab-badge--ai">DEMO</span>
        </ng-template>
        <div class="ax-triage-kobert-wrap">
          <div class="ax-triage-kobert-notice">
            <mat-icon>info</mat-icon>
            민원 내용을 직접 입력하거나 샘플을 선택하면 KoBERT AI가 실시간으로 카테고리·심각도·SLA를 분류합니다.
            신뢰도 95% 이상이면 자동처리, 80~95%는 검토 권장, 80% 미만은 수동 처리로 분기됩니다.
          </div>
          <ax-kobert-classifier />
        </div>
      </mat-tab>

    </mat-tab-group>

    <!-- 수정 확정 다이얼로그 (인라인) -->
    @if (modifyTarget()) {
      <div class="ax-triage-modal" (click)="closeModifyDialog()">
        <div class="ax-triage-modal__dialog" (click)="$event.stopPropagation()">
          <div class="ax-triage-modal__hdr">
            <mat-icon>edit_note</mat-icon>
            <span>수정 확정</span>
            <button mat-icon-button (click)="closeModifyDialog()"><mat-icon>close</mat-icon></button>
          </div>
          <div class="ax-triage-modal__body">
            <p class="ax-triage-modal__target">민원: {{ modifyTarget()!.complaint?.title ?? modifyTarget()!.complaintId }}</p>
            <mat-form-field appearance="outline" class="ax-triage-modal__field">
              <mat-label>카테고리</mat-label>
              <mat-select [(ngModel)]="modifyCategory">
                @for (cat of allCategories; track cat.value) {
                  <mat-option [value]="cat.value">{{ cat.label }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="ax-triage-modal__field">
              <mat-label>우선순위</mat-label>
              <mat-select [(ngModel)]="modifyPriority">
                <mat-option value="LOW">낮음</mat-option>
                <mat-option value="MEDIUM">보통</mat-option>
                <mat-option value="HIGH">높음</mat-option>
                <mat-option value="URGENT">긴급</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="ax-triage-modal__field">
              <mat-label>배정 담당자 (userId)</mat-label>
              <input matInput [(ngModel)]="modifyAssigneeId" placeholder="담당자 userId" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="ax-triage-modal__field">
              <mat-label>검토 메모</mat-label>
              <textarea matInput rows="2" [(ngModel)]="modifyNote"></textarea>
            </mat-form-field>
          </div>
          <div class="ax-triage-modal__footer">
            <button mat-button (click)="closeModifyDialog()">취소</button>
            <button mat-flat-button color="primary" (click)="submitModify()">수정 확정</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    /* ── 헤더 ── */
    .ax-triage-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: var(--ax-spacing-4);
      margin-bottom: var(--ax-spacing-5);
    }
    .ax-triage-header__identity {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-3);
    }
    .ax-triage-header__icon-wrap {
      width: 44px; height: 44px;
      border-radius: var(--ax-radius-md);
      background: var(--ax-color-brand-primary);
      display: flex; align-items: center; justify-content: center;
      color: #fff; flex-shrink: 0;
    }
    .ax-triage-header__title {
      margin: 0;
      font-size: var(--ax-font-size-xl);
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
      line-height: 1.3;
    }
    .ax-triage-header__desc {
      margin: 2px 0 0;
      font-size: var(--ax-font-size-sm);
      color: var(--ax-color-text-secondary);
    }

    /* ── 탭 뱃지 ── */
    .ax-tab-badge {
      display: inline-block;
      padding: 1px 6px;
      border-radius: var(--ax-radius-full);
      font-size: var(--ax-font-size-xs);
      font-weight: var(--ax-font-weight-semibold);
      margin-left: var(--ax-spacing-1);
    }
    .ax-tab-badge--danger {
      background: var(--ax-color-danger);
      color: #fff;
    }
    .ax-tab-badge--ai {
      background: var(--ax-color-brand-accent, #7b1fa2);
      color: #fff;
    }
    .ax-triage-tabs__kobert-icon {
      color: var(--ax-color-brand-accent, #7b1fa2);
    }

    /* ── 통계 카운터 ── */
    .ax-triage-stats {
      display: flex;
      gap: var(--ax-spacing-3);
      flex-wrap: wrap;
      margin: var(--ax-spacing-4) 0;
    }
    .ax-triage-stat {
      flex: 1;
      min-width: 72px;
      padding: var(--ax-spacing-3) var(--ax-spacing-3);
      border-radius: var(--ax-radius-md);
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border-muted);
      border-top: 4px solid var(--ax-color-border-muted);
      text-align: center;
      cursor: pointer;
      transition: box-shadow 0.15s ease, transform 0.15s ease;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--ax-spacing-1);
    }
    .ax-triage-stat:hover {
      transform: translateY(-2px);
      box-shadow: var(--ax-shadow-sm);
    }
    .ax-triage-stat--active {
      transform: translateY(-2px);
      box-shadow: var(--ax-shadow-md);
    }
    .ax-triage-stat__num {
      font-size: 26px;
      font-weight: var(--ax-font-weight-bold);
      line-height: 1.2;
    }
    .ax-triage-stat__lbl {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-secondary);
    }
    .ax-triage-stat--warn {
      border-top-color: var(--ax-color-warning);
    }
    .ax-triage-stat--warn .ax-triage-stat__num { color: var(--ax-color-warning); }
    .ax-triage-stat--success {
      border-top-color: var(--ax-color-success);
    }
    .ax-triage-stat--success .ax-triage-stat__num { color: var(--ax-color-success); }
    .ax-triage-stat--info {
      border-top-color: var(--ax-color-info);
    }
    .ax-triage-stat--info .ax-triage-stat__num { color: var(--ax-color-info); }
    .ax-triage-stat--danger {
      border-top-color: var(--ax-color-danger);
    }
    .ax-triage-stat--danger .ax-triage-stat__num { color: var(--ax-color-danger); }
    .ax-triage-stat--neutral {
      border-top-color: var(--ax-color-text-tertiary);
      cursor: default;
    }
    .ax-triage-stat--neutral .ax-triage-stat__num { color: var(--ax-color-text-secondary); }

    /* ── 탭 내부 필터 바 ── */
    .ax-filter-bar--inline {
      padding: var(--ax-spacing-3) 0;
      background: transparent;
      border: none;
      border-bottom: 1px solid var(--ax-color-border-muted);
      border-radius: 0;
      margin-bottom: var(--ax-spacing-4);
    }

    /* ── 트리아지 목록 ── */
    .ax-triage-list {
      display: flex;
      flex-direction: column;
      gap: var(--ax-spacing-3);
      margin-bottom: var(--ax-spacing-4);
    }

    /* ── 트리아지 카드 ── */
    .ax-triage-card {
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border-muted);
      border-radius: var(--ax-radius-md);
      overflow: hidden;
    }
    .ax-triage-card--pending {
      border-left: 4px solid var(--ax-color-warning);
    }

    /* 카드 헤더 */
    .ax-triage-card__hdr {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: var(--ax-spacing-4) var(--ax-spacing-4) var(--ax-spacing-3);
      gap: var(--ax-spacing-3);
    }
    .ax-triage-card__hdr-left {
      display: flex;
      align-items: flex-start;
      gap: var(--ax-spacing-3);
      flex: 1;
      min-width: 0;
    }

    /* 긴급도 원형 */
    .ax-triage-card__urgency {
      min-width: 44px; height: 44px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: var(--ax-font-size-sm);
      font-weight: var(--ax-font-weight-bold);
      flex-shrink: 0;
    }
    .ax-triage-card__urgency--danger {
      background: var(--ax-color-danger-subtle);
      color: var(--ax-color-danger);
    }
    .ax-triage-card__urgency--warn {
      background: var(--ax-color-warning-subtle);
      color: var(--ax-color-warning);
    }
    .ax-triage-card__urgency--success {
      background: var(--ax-color-success-subtle);
      color: var(--ax-color-success);
    }

    /* 민원 정보 */
    .ax-triage-card__info {
      flex: 1;
      min-width: 0;
    }
    .ax-triage-card__link {
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-brand-primary);
      text-decoration: none;
      font-size: var(--ax-font-size-base);
      display: block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .ax-triage-card__link:hover { text-decoration: underline; }
    .ax-triage-card__meta {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-2);
      margin-top: var(--ax-spacing-1);
      flex-wrap: wrap;
    }
    .ax-triage-card__category {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-secondary);
      background: var(--ax-color-bg-surface-alt);
      padding: 2px 6px;
      border-radius: var(--ax-radius-sm);
    }
    .ax-triage-card__sev-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      display: inline-block;
    }
    .ax-triage-card__sev-dot--critical { background: var(--ax-color-danger); }
    .ax-triage-card__sev-dot--high     { background: var(--ax-color-warning); }
    .ax-triage-card__sev-dot--medium   { background: var(--ax-color-info); }
    .ax-triage-card__sev-dot--low      { background: var(--ax-color-success); }
    .ax-triage-card__sev-dot--none     { background: var(--ax-color-text-tertiary); }
    .ax-triage-card__sev-lbl {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-secondary);
    }
    .ax-triage-card__chip {
      font-size: var(--ax-font-size-xs);
      padding: 2px 6px;
      border-radius: var(--ax-radius-sm);
    }
    .ax-triage-card__chip--sla {
      background: var(--ax-color-success-subtle);
      color: var(--ax-color-success);
    }
    .ax-triage-card__chip--rule {
      background: var(--ax-color-bg-surface-alt);
      color: var(--ax-color-text-secondary);
    }

    /* 오른쪽 상태/날짜 */
    .ax-triage-card__hdr-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: var(--ax-spacing-1);
      flex-shrink: 0;
    }
    .ax-triage-card__decision {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 10px;
      border-radius: var(--ax-radius-full);
      font-size: var(--ax-font-size-xs);
      font-weight: var(--ax-font-weight-semibold);
    }
    .ax-triage-card__decision-icon {
      font-size: 14px; width: 14px; height: 14px;
    }
    .ax-triage-card__decision--pending_review {
      background: var(--ax-color-warning-subtle);
      color: var(--ax-color-warning);
    }
    .ax-triage-card__decision--accepted {
      background: var(--ax-color-success-subtle);
      color: var(--ax-color-success);
    }
    .ax-triage-card__decision--modified {
      background: var(--ax-color-info-subtle);
      color: var(--ax-color-info);
    }
    .ax-triage-card__decision--rejected {
      background: var(--ax-color-danger-subtle);
      color: var(--ax-color-danger);
    }
    .ax-triage-card__conf {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-secondary);
    }
    .ax-triage-card__date {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-tertiary);
    }

    /* 키워드 */
    .ax-triage-card__keywords {
      display: flex;
      gap: var(--ax-spacing-1);
      flex-wrap: wrap;
      padding: 0 var(--ax-spacing-4) var(--ax-spacing-2);
    }
    .ax-triage-card__kw {
      font-size: var(--ax-font-size-xs);
      padding: 2px 6px;
      border-radius: var(--ax-radius-sm);
      background: var(--ax-color-info-subtle);
      color: var(--ax-color-info);
    }

    /* 분류 근거 */
    .ax-triage-card__reason {
      margin: 0;
      padding: 0 var(--ax-spacing-4) var(--ax-spacing-3);
      font-size: var(--ax-font-size-sm);
      color: var(--ax-color-text-secondary);
      line-height: 1.5;
    }

    /* 라우팅 추천 */
    .ax-triage-card__routing {
      padding: var(--ax-spacing-2) var(--ax-spacing-4) var(--ax-spacing-2);
    }
    .ax-triage-card__routing-title {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-1);
      font-size: var(--ax-font-size-xs);
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-secondary);
      margin-bottom: var(--ax-spacing-2);
    }
    .ax-triage-card__routing-title mat-icon {
      font-size: 16px; width: 16px; height: 16px;
    }

    /* 액션 버튼 */
    .ax-triage-card__actions {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-2);
      padding: var(--ax-spacing-3) var(--ax-spacing-4);
      flex-wrap: wrap;
    }

    /* ── KoBERT 탭 ── */
    .ax-triage-kobert-wrap {
      padding: var(--ax-spacing-4) 0;
    }
    .ax-triage-kobert-notice {
      display: flex;
      align-items: flex-start;
      gap: var(--ax-spacing-2);
      background: var(--ax-color-info-subtle);
      border: 1px solid var(--ax-color-info-border);
      border-radius: var(--ax-radius-md);
      padding: var(--ax-spacing-3) var(--ax-spacing-4);
      margin-bottom: var(--ax-spacing-4);
      font-size: var(--ax-font-size-sm);
      color: var(--ax-color-info);
      line-height: 1.5;
    }
    .ax-triage-kobert-notice mat-icon {
      font-size: 18px; width: 18px; height: 18px;
      flex-shrink: 0;
      margin-top: 1px;
    }

    /* ── 수정 확정 모달 ── */
    .ax-triage-modal {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .ax-triage-modal__dialog {
      width: 480px;
      max-width: 95vw;
      background: var(--ax-color-bg-surface);
      border-radius: var(--ax-radius-lg);
      overflow: hidden;
      box-shadow: var(--ax-shadow-xl, 0 20px 60px rgba(0,0,0,0.3));
    }
    .ax-triage-modal__hdr {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-2);
      padding: var(--ax-spacing-3) var(--ax-spacing-4);
      background: var(--ax-color-bg-sidebar);
      color: #fff;
      font-size: var(--ax-font-size-base);
      font-weight: var(--ax-font-weight-semibold);
    }
    .ax-triage-modal__hdr button {
      margin-left: auto;
      color: rgba(255, 255, 255, 0.7);
    }
    .ax-triage-modal__hdr mat-icon:first-child {
      color: rgba(255, 255, 255, 0.8);
    }
    .ax-triage-modal__body {
      padding: var(--ax-spacing-4);
      display: flex;
      flex-direction: column;
      gap: var(--ax-spacing-3);
    }
    .ax-triage-modal__target {
      margin: 0;
      font-weight: var(--ax-font-weight-semibold);
      font-size: var(--ax-font-size-sm);
      color: var(--ax-color-text-primary);
    }
    .ax-triage-modal__field {
      width: 100%;
    }
    .ax-triage-modal__footer {
      display: flex;
      justify-content: flex-end;
      gap: var(--ax-spacing-2);
      padding: var(--ax-spacing-3) var(--ax-spacing-4);
      border-top: 1px solid var(--ax-color-border-muted);
    }
  `],
})
export class TriageQueuePageComponent implements OnInit {
  private readonly http     = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);

  readonly triages    = signal<TriageItem[]>([]);
  readonly stats      = signal<TriageStats | null>(null);
  readonly loading    = signal(false);
  readonly totalCount = signal(0);
  readonly reviewing  = signal<Record<string, boolean>>({});

  filterDecisionStatus = 'PENDING_REVIEW';
  filterStatus = '';
  pageSize = 20;
  pageIndex = 0;

  readonly selectedAssignees: Record<string, string> = {};

  readonly modifyTarget = signal<TriageItem | null>(null);
  modifyCategory   = '';
  modifyPriority   = '';
  modifyAssigneeId = '';
  modifyNote       = '';

  readonly allCategories = [
    { value: 'FACILITY',   label: '시설물 결함' },
    { value: 'SAFETY',     label: '안전' },
    { value: 'NOISE',      label: '소음' },
    { value: 'SANITATION', label: '위생' },
    { value: 'PARKING',    label: '주차' },
    { value: 'ELEVATOR',   label: '엘리베이터' },
    { value: 'OTHER',      label: '기타' },
  ];

  ngOnInit() {
    this.loadTriages();
    this.loadStats();
  }

  loadTriages() {
    this.loading.set(true);
    const params = new URLSearchParams({
      page:  String(this.pageIndex + 1),
      limit: String(this.pageSize),
      ...(this.filterDecisionStatus && { decisionStatus: this.filterDecisionStatus }),
      ...(this.filterStatus && { status: this.filterStatus }),
    });
    this.http.get<any>(`${environment.apiUrl}/complaint-triage?${params}`).subscribe({
      next: (res) => {
        this.triages.set(res.items ?? []);
        this.totalCount.set(res.total ?? 0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadStats() {
    this.http.get<TriageStats>(`${environment.apiUrl}/complaint-triage/stats`).subscribe({
      next: (s) => this.stats.set(s),
    });
  }

  filterDecision(d: string) {
    this.filterDecisionStatus = this.filterDecisionStatus === d ? '' : d;
    this.loadTriages();
  }

  selectAssignee(triageId: string, targetId: string) {
    this.selectedAssignees[triageId] = targetId;
  }

  quickReview(item: TriageItem, decision: 'ACCEPT' | 'REJECT') {
    this.setReviewing(item._id, true);
    const body: any = { decision };
    if (decision === 'ACCEPT' && this.selectedAssignees[item._id]) {
      body.acceptedAssigneeId = this.selectedAssignees[item._id];
    }
    this.http
      .post<TriageItem>(`${environment.apiUrl}/complaint-triage/${item._id}/review`, body)
      .subscribe({
        next: (updated) => {
          this.updateItemInList(updated);
          this.setReviewing(item._id, false);
          this.loadStats();
          const msg = decision === 'ACCEPT' ? '수락 처리되었습니다.' : '기각 처리되었습니다.';
          this.snackBar.open(msg, '닫기', { duration: 3000 });
        },
        error: () => this.setReviewing(item._id, false),
      });
  }

  openModifyDialog(item: TriageItem) {
    this.modifyTarget.set(item);
    this.modifyCategory   = item.aiCategory ?? '';
    this.modifyPriority   = item.suggestedPriority ?? '';
    this.modifyAssigneeId = this.selectedAssignees[item._id] ?? '';
    this.modifyNote       = '';
  }

  closeModifyDialog() { this.modifyTarget.set(null); }

  submitModify() {
    const item = this.modifyTarget();
    if (!item) return;
    const body = {
      decision: 'MODIFY',
      acceptedCategory:   this.modifyCategory   || undefined,
      acceptedPriority:   this.modifyPriority    || undefined,
      acceptedAssigneeId: this.modifyAssigneeId  || undefined,
      reviewNote:         this.modifyNote        || undefined,
    };
    this.http
      .post<TriageItem>(`${environment.apiUrl}/complaint-triage/${item._id}/review`, body)
      .subscribe({
        next: (updated) => {
          this.updateItemInList(updated);
          this.closeModifyDialog();
          this.loadStats();
          this.snackBar.open('수정 확정 처리되었습니다.', '닫기', { duration: 3000 });
        },
      });
  }

  onPage(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize  = event.pageSize;
    this.loadTriages();
  }

  private setReviewing(id: string, val: boolean) {
    this.reviewing.update(prev => ({ ...prev, [id]: val }));
  }

  private updateItemInList(updated: TriageItem) {
    this.triages.update(list =>
      list.map(t => t._id === updated._id ? { ...t, ...updated } : t)
    );
  }

  getCategoryLabel(cat?: string) { return cat ? (CATEGORY_LABELS[cat] ?? cat) : '-'; }
  getDecisionLabel(s: string)    { return DECISION_CONFIG[s]?.label ?? s; }
  getDecisionIcon(s: string)     { return DECISION_CONFIG[s]?.icon  ?? 'help'; }

  getUrgencyVariant(score: number): string {
    if (score >= 70) return 'danger';
    if (score >= 40) return 'warn';
    return 'success';
  }
}
