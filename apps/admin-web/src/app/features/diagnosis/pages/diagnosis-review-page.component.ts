// apps/admin-web/src/app/features/diagnosis/pages/diagnosis-review-page.component.ts
// AI 진단 의견 검토 페이지 — 목록 + 오른쪽 상세 패널 (의견 편집 + 보수 추천)
import {
  Component, inject, signal, OnInit, ChangeDetectionStrategy,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule, ReactiveFormsModule, FormBuilder } from '@angular/forms'
import { HttpClient } from '@angular/common/http'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatSelectModule } from '@angular/material/select'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator'
import { MatSidenavModule } from '@angular/material/sidenav'
import { MatProgressBarModule } from '@angular/material/progress-bar'
import { MatDividerModule } from '@angular/material/divider'
import { MatTabsModule } from '@angular/material/tabs'
import { MatTooltipModule } from '@angular/material/tooltip'
import {
  DiagnosisOpinion, DiagnosisOpinionStatus, DiagnosisUrgency,
  DiagnosisTargetType, RepairRecommendation,
} from '@ax/shared'
import {
  OpinionEditorComponent, OpinionReviewSubmit, OpinionUpdateSubmit,
} from '../components/opinion-editor.component'
import { RecommendationPanelComponent } from '../components/recommendation-panel.component'
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component'
import { StatusBadgeComponent, statusToVariant } from '../../../shared/components/status-badge/status-badge.component'

const URGENCY_COLORS: Record<string, string> = {
  IMMEDIATE: 'var(--ax-color-danger)',
  URGENT:    'var(--ax-color-warning)',
  ROUTINE:   'var(--ax-color-info)',
  PLANNED:   'var(--ax-color-success)',
}

@Component({
  selector: 'ax-diagnosis-review-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatButtonModule, MatIconModule, MatSelectModule,
    MatFormFieldModule, MatInputModule, MatPaginatorModule,
    MatSidenavModule, MatProgressBarModule, MatDividerModule, MatTabsModule,
    MatTooltipModule,
    OpinionEditorComponent, RecommendationPanelComponent,
    EmptyStateComponent, StatusBadgeComponent,
  ],
  template: `
    <div class="ax-diag-page">
      <mat-sidenav-container class="ax-diag-container">

        <!-- ── 메인 영역 ── -->
        <mat-sidenav-content>

          <!-- 페이지 헤더 -->
          <div class="ax-diag-header">
            <div class="ax-diag-header__left">
              <div class="ax-diag-header__icon" aria-hidden="true">
                <mat-icon>psychology</mat-icon>
              </div>
              <div>
                <h1 class="ax-diag-header__title">AI 진단 의견 검토</h1>
                <p class="ax-diag-header__desc">LLM 기반 보수 전략 초안 Human-in-the-Loop 검토 · 엔지니어 확정 승인</p>
              </div>
            </div>
            <div class="ax-diag-stats" role="list" aria-label="진단 의견 현황">
              <div class="ax-diag-stat ax-diag-stat--neutral" role="listitem"
                   [matTooltip]="'AI 생성 초안 ' + stats().draft + '건'">
                <span class="ax-diag-stat__num">{{ stats().draft }}</span>
                <span class="ax-diag-stat__lbl">초안</span>
              </div>
              <div class="ax-diag-stat ax-diag-stat--info" role="listitem">
                <span class="ax-diag-stat__num">{{ stats().reviewing }}</span>
                <span class="ax-diag-stat__lbl">검토중</span>
              </div>
              <div class="ax-diag-stat ax-diag-stat--success" role="listitem">
                <span class="ax-diag-stat__num">{{ stats().approved }}</span>
                <span class="ax-diag-stat__lbl">승인</span>
              </div>
              <div class="ax-diag-stat ax-diag-stat--danger" role="listitem"
                   [matTooltip]="'즉시 조치 필요 ' + stats().immediate + '건'"
                   [class.ax-diag-stat--urgent]="stats().immediate > 0">
                <span class="ax-diag-stat__num">{{ stats().immediate }}</span>
                <span class="ax-diag-stat__lbl">즉시 조치</span>
              </div>
            </div>
          </div>

          <!-- 필터 바 -->
          <div class="ax-filter-bar">
            <div class="ax-filter-bar__filters">
              <mat-form-field appearance="outline" subscriptSizing="dynamic" class="ax-diag-filter">
                <mat-label>상태</mat-label>
                <mat-select [formControl]="filterForm.controls['status']">
                  <mat-option value="">전체</mat-option>
                  <mat-option value="DRAFT">초안</mat-option>
                  <mat-option value="REVIEWING">검토중</mat-option>
                  <mat-option value="APPROVED">승인</mat-option>
                  <mat-option value="REJECTED">기각</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" subscriptSizing="dynamic" class="ax-diag-filter">
                <mat-label>긴급도</mat-label>
                <mat-select [formControl]="filterForm.controls['urgency']">
                  <mat-option value="">전체</mat-option>
                  <mat-option value="IMMEDIATE">즉시 조치</mat-option>
                  <mat-option value="URGENT">긴급</mat-option>
                  <mat-option value="ROUTINE">일반</mat-option>
                  <mat-option value="PLANNED">계획 정비</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" subscriptSizing="dynamic" class="ax-diag-filter">
                <mat-label>대상 유형</mat-label>
                <mat-select [formControl]="filterForm.controls['targetType']">
                  <mat-option value="">전체</mat-option>
                  <mat-option value="DEFECT">결함</mat-option>
                  <mat-option value="INSPECTION_SESSION">점검 세션</mat-option>
                  <mat-option value="GAUGE_POINT">게이지 포인트</mat-option>
                  <mat-option value="COMPLEX">단지 전체</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
            <div class="ax-filter-bar__actions">
              <button mat-stroked-button type="button" (click)="clearFilter()" matTooltip="필터 초기화">
                <mat-icon>clear</mat-icon>
              </button>
              <button mat-flat-button color="primary" type="button" (click)="applyFilter()">
                <mat-icon>search</mat-icon> 검색
              </button>
            </div>
          </div>

          <!-- 목록 -->
          @if (loading()) {
            <div class="ax-loading-center">
              <mat-progress-bar mode="indeterminate" style="max-width:320px" />
              <span>진단 의견을 불러오는 중...</span>
            </div>
          } @else if (items().length === 0) {
            <ax-empty-state
              type="search-no-result"
              title="진단 의견이 없습니다"
              description="조건에 맞는 AI 진단 의견이 없습니다. 필터를 조정하거나 점검 세션을 먼저 완료하세요."
              primaryLabel="필터 초기화"
              primaryIcon="clear"
              (primaryAction)="clearFilter()"
              metaText="AI 진단 의견은 점검 세션 완료 후 LLM 파이프라인에서 자동 생성됩니다." />
          } @else {
            <div class="ax-diag-grid">
              @for (item of items(); track item._id) {
                <div
                  class="ax-diag-card"
                  [class.ax-diag-card--selected]="selected()?._id === item._id"
                  [class.ax-diag-card--immediate]="item.urgency === 'IMMEDIATE'"
                  (click)="selectItem(item)"
                  role="button"
                  tabindex="0"
                  [attr.aria-label]="item.summary || '진단 의견 ' + item._id"
                  [attr.aria-pressed]="selected()?._id === item._id"
                  (keydown.enter)="selectItem(item)"
                >
                  <!-- 상단: 상태 + 긴급도 + 우선순위 -->
                  <div class="ax-diag-card__top">
                    <ax-status-badge
                      [variant]="statusToVariant(item.status)"
                      [label]="statusLabel(item.status)"
                      size="sm" />
                    <span
                      class="ax-diag-urgency-dot"
                      [style.background]="urgencyColor(item.urgency)"
                      [matTooltip]="urgencyLabel(item.urgency)"
                      aria-hidden="true">
                    </span>
                    <span class="ax-diag-card__score"
                          [matTooltip]="'AI 우선 처리 점수'">
                      {{ item.estimatedPriorityScore }}점
                    </span>
                  </div>
                  <!-- 요약 -->
                  <p class="ax-diag-card__summary">{{ item.summary || '(분석 대기중)' }}</p>
                  <!-- 메타 -->
                  <div class="ax-diag-card__meta">
                    <span>{{ targetTypeLabel(item.targetType) }}</span>
                    <span>{{ item.createdAt | date:'MM/dd HH:mm' }}</span>
                  </div>
                  <div class="ax-diag-card__model">{{ item.modelVersion }}</div>
                </div>
              }
            </div>

            <mat-paginator
              [length]="total()"
              [pageSize]="pageSize"
              [pageSizeOptions]="[12, 24, 48]"
              (page)="onPage($event)"
            />
          }
        </mat-sidenav-content>

        <!-- ── 오른쪽 상세 패널 ── -->
        <mat-sidenav #detailPanel position="end" [opened]="!!selected()" mode="side" [style.width]="'520px'">
          @if (selected()) {
            <div class="ax-diag-panel">
              <div class="ax-diag-panel__hdr">
                <div class="ax-diag-panel__hdr-left">
                  <mat-icon aria-hidden="true">psychology</mat-icon>
                  <span>AI 진단 의견</span>
                </div>
                <div class="ax-diag-panel__id">{{ selected()!._id }}</div>
                <button mat-icon-button (click)="closePanel()" aria-label="패널 닫기">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
              <mat-divider />

              <mat-tab-group class="ax-diag-panel__tabs" animationDuration="150ms">
                <mat-tab label="진단 의견">
                  <div class="ax-diag-panel__tab-body">
                    <ax-opinion-editor
                      [opinion]="selected()!"
                      [loading]="actionLoading()"
                      (save)="onSave($event)"
                      (review)="onReview($event)"
                    />
                  </div>
                </mat-tab>

                <mat-tab [label]="'보수 추천 (' + recommendations().length + ')'">
                  <div class="ax-diag-panel__tab-body">
                    <ax-recommendation-panel
                      [recommendations]="recommendations()"
                      [loading]="actionLoading()"
                      [canApprove]="selected()?.status === 'APPROVED'"
                      (approve)="onApproveRec($event)"
                      (cancelApprove)="onCancelApproveRec($event)"
                    />
                  </div>
                </mat-tab>

                <mat-tab label="분석 컨텍스트">
                  <div class="ax-diag-panel__tab-body ax-diag-ctx">
                    @if (selected()?.contextSummary) {
                      <div class="ax-diag-ctx__grid">
                        <div class="ax-diag-ctx__item">
                          <span class="ax-diag-ctx__lbl">결함</span>
                          <span class="ax-diag-ctx__val">{{ selected()!.contextSummary!.defectCount }}건</span>
                        </div>
                        <div class="ax-diag-ctx__item">
                          <span class="ax-diag-ctx__lbl">균열 측정</span>
                          <span class="ax-diag-ctx__val">{{ selected()!.contextSummary!.crackMeasurementCount }}건</span>
                        </div>
                        <div class="ax-diag-ctx__item">
                          <span class="ax-diag-ctx__lbl">민원</span>
                          <span class="ax-diag-ctx__val">{{ selected()!.contextSummary!.complaintCount }}건</span>
                        </div>
                        <div class="ax-diag-ctx__item">
                          <span class="ax-diag-ctx__lbl">경보</span>
                          <span class="ax-diag-ctx__val">{{ selected()!.contextSummary!.alertCount }}건</span>
                        </div>
                        @if (selected()!.contextSummary!.highestSeverity) {
                          <div class="ax-diag-ctx__item ax-diag-ctx__item--warn">
                            <span class="ax-diag-ctx__lbl">최고 심각도</span>
                            <span class="ax-diag-ctx__val">{{ selected()!.contextSummary!.highestSeverity }}</span>
                          </div>
                        }
                      </div>
                    }
                    <div class="ax-diag-ctx__ids">
                      <div class="ax-diag-ctx__meta-row">
                        <mat-icon aria-hidden="true">target</mat-icon>
                        대상: {{ selected()!.targetType }} / {{ selected()!.targetId }}
                      </div>
                      @if (selected()!.sessionId) {
                        <div class="ax-diag-ctx__meta-row">
                          <mat-icon aria-hidden="true">assignment</mat-icon>
                          세션: {{ selected()!.sessionId }}
                        </div>
                      }
                      <div class="ax-diag-ctx__meta-row">
                        <mat-icon aria-hidden="true">smart_toy</mat-icon>
                        모델: {{ selected()!.model }} ({{ selected()!.promptVersion }})
                      </div>
                      @if (selected()!.tokensUsed) {
                        <div class="ax-diag-ctx__meta-row">
                          <mat-icon aria-hidden="true">token</mat-icon>
                          토큰: {{ selected()!.tokensUsed | number }}
                        </div>
                      }
                    </div>
                  </div>
                </mat-tab>
              </mat-tab-group>
            </div>
          }
        </mat-sidenav>

      </mat-sidenav-container>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .ax-diag-page {
      height: calc(100vh - var(--ax-header-height) - 2 * var(--ax-page-gutter));
      display: flex;
      flex-direction: column;
    }

    .ax-diag-container { flex: 1; min-height: 0; }

    /* ── 페이지 헤더 ── */
    .ax-diag-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: var(--ax-spacing-12);
      padding: var(--ax-spacing-16) var(--ax-card-padding) var(--ax-spacing-12);
      background: var(--ax-color-bg-surface);
      border-bottom: 1px solid var(--ax-color-border-default);

      &__left {
        display: flex;
        align-items: center;
        gap: var(--ax-spacing-12);
      }

      &__icon {
        width: 36px; height: 36px;
        background: var(--ax-color-brand-primary-subtle);
        border-radius: var(--ax-radius-lg);
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        mat-icon { color: var(--ax-color-brand-primary); font-size: 18px; width: 18px; height: 18px; }
      }

      &__title {
        font-size: var(--ax-font-size-xl);
        font-weight: var(--ax-font-weight-bold);
        color: var(--ax-color-text-primary);
        margin: 0;
        line-height: 1.2;
      }

      &__desc {
        font-size: var(--ax-font-size-xs);
        color: var(--ax-color-text-tertiary);
        margin: 2px 0 0;
      }
    }

    /* ── 통계 카운터 ── */
    .ax-diag-stats {
      display: flex;
      gap: var(--ax-spacing-6);
      flex-wrap: wrap;
      flex-shrink: 0;
    }

    .ax-diag-stat {
      display: flex; flex-direction: column; align-items: center;
      min-width: 56px;
      padding: var(--ax-spacing-6) var(--ax-spacing-10);
      border-radius: var(--ax-radius-md);
      border: 1px solid var(--ax-color-border-default);
      background: var(--ax-color-bg-surface-alt);
      cursor: default;

      &__num { font-size: var(--ax-font-size-lg); font-weight: var(--ax-font-weight-bold); line-height: 1.1; font-variant-numeric: tabular-nums; }
      &__lbl { font-size: 10px; color: var(--ax-color-text-tertiary); margin-top: 2px; white-space: nowrap; }

      &--neutral .ax-diag-stat__num { color: var(--ax-color-neutral-text); }
      &--info    .ax-diag-stat__num { color: var(--ax-color-info-text); }
      &--success .ax-diag-stat__num { color: var(--ax-color-success-text); }
      &--danger  .ax-diag-stat__num { color: var(--ax-color-neutral-text); }
      &--urgent  { border-color: var(--ax-color-danger); }
      &--urgent .ax-diag-stat__num { color: var(--ax-color-danger-text); }
    }

    /* ── 필터 필드 ── */
    .ax-diag-filter { min-width: 150px; flex: 1; }

    /* ── 카드 그리드 ── */
    .ax-diag-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: var(--ax-spacing-12);
      padding: var(--ax-card-padding);
    }

    .ax-diag-card {
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border-default);
      border-radius: var(--ax-radius-lg);
      padding: var(--ax-spacing-12);
      cursor: pointer;
      transition: box-shadow var(--ax-transition-base), border-color var(--ax-transition-base);
      outline: none;

      &:hover { box-shadow: var(--ax-shadow-md); }
      &:focus-visible { outline: 2px solid var(--ax-color-brand-primary); outline-offset: 2px; }

      &--selected {
        border-color: var(--ax-color-brand-primary);
        box-shadow: 0 0 0 2px var(--ax-color-brand-primary-muted);
      }

      &--immediate {
        border-left: 3px solid var(--ax-color-danger);
      }

      &__top {
        display: flex;
        align-items: center;
        gap: var(--ax-spacing-6);
        margin-bottom: var(--ax-spacing-8);
      }

      &__score {
        margin-left: auto;
        font-size: var(--ax-font-size-xs);
        font-weight: var(--ax-font-weight-semibold);
        color: var(--ax-color-brand-primary);
        font-variant-numeric: tabular-nums;
      }

      &__summary {
        font-size: var(--ax-font-size-sm);
        line-height: var(--ax-line-height-normal);
        color: var(--ax-color-text-secondary);
        margin: 0 0 var(--ax-spacing-6);
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      &__meta {
        display: flex;
        justify-content: space-between;
        font-size: var(--ax-font-size-xs);
        color: var(--ax-color-text-tertiary);
        margin-bottom: 2px;
      }

      &__model {
        font-size: 10px;
        color: var(--ax-color-text-disabled);
        font-family: var(--ax-font-family-mono);
      }
    }

    .ax-diag-urgency-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    mat-paginator {
      border-top: 1px solid var(--ax-color-border-default);
      background: var(--ax-color-bg-surface-alt);
    }

    /* ── 상세 패널 ── */
    .ax-diag-panel {
      display: flex;
      flex-direction: column;
      height: 100%;

      &__hdr {
        display: flex;
        align-items: center;
        gap: var(--ax-spacing-8);
        padding: var(--ax-spacing-12) var(--ax-card-padding);
        background: var(--ax-color-bg-sidebar);
        border-bottom: 1px solid rgba(255,255,255,0.08);
        flex-shrink: 0;

        mat-icon { color: rgba(255,255,255,0.7); font-size: 18px; width: 18px; height: 18px; }
        &-left { display: flex; align-items: center; gap: var(--ax-spacing-8); flex: 1; }
        span { font-size: var(--ax-font-size-md); font-weight: var(--ax-font-weight-semibold); color: rgba(255,255,255,0.9); }
        button { color: rgba(255,255,255,0.65) !important; }
      }

      &__id {
        font-size: 10px;
        color: rgba(255,255,255,0.35);
        font-family: var(--ax-font-family-mono);
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 120px;
        white-space: nowrap;
      }

      &__tabs { flex: 1; }
      &__tab-body {
        padding: var(--ax-spacing-12);
        overflow-y: auto;
        max-height: calc(100vh - 200px);
      }
    }

    /* ── 컨텍스트 탭 ── */
    .ax-diag-ctx {
      display: flex;
      flex-direction: column;
      gap: var(--ax-spacing-12);

      &__grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: var(--ax-spacing-8);
      }

      &__item {
        background: var(--ax-color-bg-surface-alt);
        border: 1px solid var(--ax-color-border-subtle);
        border-radius: var(--ax-radius-md);
        padding: var(--ax-spacing-8) var(--ax-spacing-12);

        &--warn .ax-diag-ctx__val { color: var(--ax-color-danger-text); }
      }

      &__lbl { font-size: var(--ax-font-size-xs); color: var(--ax-color-text-tertiary); display: block; margin-bottom: 2px; }
      &__val { font-size: var(--ax-font-size-xl); font-weight: var(--ax-font-weight-bold); color: var(--ax-color-brand-primary); line-height: 1; }

      &__ids { display: flex; flex-direction: column; gap: var(--ax-spacing-4); }

      &__meta-row {
        display: flex;
        align-items: center;
        gap: var(--ax-spacing-6);
        font-size: var(--ax-font-size-xs);
        color: var(--ax-color-text-tertiary);
        font-family: var(--ax-font-family-mono);

        mat-icon { font-size: 14px; width: 14px; height: 14px; color: var(--ax-color-text-disabled); }
      }
    }
  `],
})
export class DiagnosisReviewPageComponent implements OnInit {
  private readonly http = inject(HttpClient)
  private readonly fb = inject(FormBuilder)

  items = signal<DiagnosisOpinion[]>([])
  selected = signal<DiagnosisOpinion | null>(null)
  recommendations = signal<RepairRecommendation[]>([])
  loading = signal(false)
  actionLoading = signal(false)
  total = signal(0)
  pageSize = 24
  currentPage = 1

  stats = signal({ total: 0, draft: 0, reviewing: 0, approved: 0, rejected: 0, immediate: 0, urgent: 0 })

  filterForm = this.fb.group({
    status: [''],
    urgency: [''],
    targetType: [''],
  })

  ngOnInit(): void {
    this.load()
    this.loadStats()
  }

  load(): void {
    this.loading.set(true)
    const params: Record<string, string> = { page: String(this.currentPage), limit: String(this.pageSize) }
    const f = this.filterForm.value
    if (f.status)     params['status']     = f.status
    if (f.urgency)    params['urgency']    = f.urgency
    if (f.targetType) params['targetType'] = f.targetType

    this.http.get<{ items: DiagnosisOpinion[]; total: number }>('/api/v1/diagnosis-opinions', { params }).subscribe({
      next: (res) => { this.items.set(res.items); this.total.set(res.total); this.loading.set(false) },
      error: () => this.loading.set(false),
    })
  }

  loadStats(): void {
    this.http.get<Record<string, number>>('/api/v1/diagnosis-opinions/stats').subscribe({
      next: (res) => this.stats.set({
        total: res['total'] ?? 0, draft: res['draft'] ?? 0,
        reviewing: res['reviewing'] ?? 0, approved: res['approved'] ?? 0,
        rejected: res['rejected'] ?? 0, immediate: res['immediate'] ?? 0,
        urgent: res['urgent'] ?? 0,
      }),
    })
  }

  selectItem(item: DiagnosisOpinion): void {
    this.selected.set(item)
    this.loadRecommendations(item._id)
  }

  closePanel(): void {
    this.selected.set(null)
    this.recommendations.set([])
  }

  loadRecommendations(diagnosisId: string): void {
    this.http.get<{ items: RepairRecommendation[] }>(
      `/api/v1/repair-recommendations?diagnosisOpinionId=${diagnosisId}`,
    ).subscribe({
      next: (res) => this.recommendations.set(res.items ?? []),
      error: () => this.recommendations.set([]),
    })
  }

  applyFilter(): void {
    this.currentPage = 1
    this.load()
  }

  clearFilter(): void {
    this.filterForm.reset({ status: '', urgency: '', targetType: '' })
    this.currentPage = 1
    this.load()
  }

  onPage(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1
    this.pageSize = event.pageSize
    this.load()
  }

  onSave(dto: OpinionUpdateSubmit): void {
    const current = this.selected()
    if (!current) return
    this.actionLoading.set(true)
    this.http.patch<DiagnosisOpinion>(`/api/v1/diagnosis-opinions/${current._id}`, dto).subscribe({
      next: (updated) => { this.selected.set(updated); this.items.update(l => l.map(i => i._id === updated._id ? updated : i)); this.actionLoading.set(false) },
      error: () => this.actionLoading.set(false),
    })
  }

  onReview(dto: OpinionReviewSubmit): void {
    const current = this.selected()
    if (!current) return
    this.actionLoading.set(true)
    this.http.post<DiagnosisOpinion>(`/api/v1/diagnosis-opinions/${current._id}/review`, dto).subscribe({
      next: (updated) => { this.selected.set(updated); this.items.update(l => l.map(i => i._id === updated._id ? updated : i)); this.actionLoading.set(false); this.loadStats() },
      error: () => this.actionLoading.set(false),
    })
  }

  onApproveRec(rec: RepairRecommendation): void {
    this.actionLoading.set(true)
    this.http.post<RepairRecommendation>(`/api/v1/repair-recommendations/${rec._id}/approve`, {}).subscribe({
      next: (updated) => { this.recommendations.update(l => l.map(r => r._id === updated._id ? updated : r)); this.actionLoading.set(false) },
      error: () => this.actionLoading.set(false),
    })
  }

  onCancelApproveRec(rec: RepairRecommendation): void {
    this.actionLoading.set(true)
    this.http.delete<RepairRecommendation>(`/api/v1/repair-recommendations/${rec._id}/approve`).subscribe({
      next: (updated) => { this.recommendations.update(l => l.map(r => r._id === updated._id ? updated : r)); this.actionLoading.set(false) },
      error: () => this.actionLoading.set(false),
    })
  }

  urgencyColor(u: string): string { return URGENCY_COLORS[u] ?? '#666' }

  urgencyLabel(u: string): string {
    const map: Record<string, string> = { IMMEDIATE: '즉시 조치', URGENT: '긴급', ROUTINE: '일반', PLANNED: '계획 정비' }
    return map[u] ?? u
  }

  statusLabel(s: string): string {
    const map: Record<string, string> = { DRAFT: '초안', REVIEWING: '검토중', APPROVED: '승인', REJECTED: '기각' }
    return map[s] ?? s
  }

  targetTypeLabel(t: string): string {
    const map: Record<string, string> = {
      DEFECT: '결함', INSPECTION_SESSION: '점검세션', GAUGE_POINT: '게이지', COMPLEX: '단지',
    }
    return map[t] ?? t
  }
}
