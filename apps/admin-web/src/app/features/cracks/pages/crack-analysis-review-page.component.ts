// apps/admin-web/src/app/features/cracks/pages/crack-analysis-review-page.component.ts
// 균열 심층 분석 검토 페이지 — 목록 + 사이드 패널 레이아웃
import {
  Component, inject, signal, computed, OnInit, ChangeDetectionStrategy,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterModule } from '@angular/router'
import { ReactiveFormsModule, FormBuilder } from '@angular/forms'
import { HttpClient } from '@angular/common/http'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatSelectModule } from '@angular/material/select'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator'
import { MatSidenavModule } from '@angular/material/sidenav'
import { MatDividerModule } from '@angular/material/divider'
import { MatTooltipModule } from '@angular/material/tooltip'
import {
  CrackAnalysisResult, CrackAnalysisStatus, CrackAnalysisReviewStatus,
} from '@ax/shared'
import { CrackOverlayViewerComponent } from '../components/crack-overlay-viewer.component'
import { CrackMetricsPanelComponent, ReviewSubmit } from '../components/crack-metrics-panel.component'
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'

@Component({
  selector: 'ax-crack-analysis-review-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule,
    MatButtonModule, MatIconModule, MatSelectModule,
    MatFormFieldModule, MatInputModule, MatPaginatorModule,
    MatSidenavModule, MatDividerModule, MatTooltipModule,
    CrackOverlayViewerComponent, CrackMetricsPanelComponent,
    EmptyStateComponent, StatusBadgeComponent,
  ],
  template: `
    <div class="ax-crack-page">

      <!-- 페이지 헤더 -->
      <div class="ax-crack-header">
        <div class="ax-crack-header__identity">
          <div class="ax-crack-header__icon-wrap">
            <mat-icon>biotech</mat-icon>
          </div>
          <div>
            <h1 class="ax-crack-header__title">균열 심층 분석 검토</h1>
            <p class="ax-crack-header__desc">Y-MaskNet 모델의 균열 폭 측정 결과를 검토하고 승인합니다</p>
          </div>
        </div>
        <div class="ax-crack-stats">
          <div class="ax-crack-stat ax-crack-stat--warn">
            <span class="ax-crack-stat__num">{{ stats().pending }}</span>
            <span class="ax-crack-stat__lbl">검토 대기</span>
          </div>
          <div class="ax-crack-stat ax-crack-stat--success">
            <span class="ax-crack-stat__num">{{ stats().accepted }}</span>
            <span class="ax-crack-stat__lbl">수용</span>
          </div>
          <div class="ax-crack-stat ax-crack-stat--info">
            <span class="ax-crack-stat__num">{{ stats().corrected }}</span>
            <span class="ax-crack-stat__lbl">수동 보정</span>
          </div>
          <div class="ax-crack-stat ax-crack-stat--danger">
            <span class="ax-crack-stat__num">{{ stats().rejected }}</span>
            <span class="ax-crack-stat__lbl">기각</span>
          </div>
          @if (stats().failed > 0) {
            <div class="ax-crack-stat ax-crack-stat--neutral">
              <span class="ax-crack-stat__num">{{ stats().failed }}</span>
              <span class="ax-crack-stat__lbl">실패</span>
            </div>
          }
        </div>
      </div>

      <!-- 필터 바 -->
      <div class="ax-filter-bar">
        <div class="ax-filter-bar__filters">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>검토 상태</mat-label>
            <mat-select [formControl]="filterForm.controls['reviewStatus']">
              <mat-option value="">전체</mat-option>
              <mat-option value="PENDING">검토 대기</mat-option>
              <mat-option value="ACCEPTED">수용</mat-option>
              <mat-option value="CORRECTED">수동 보정</mat-option>
              <mat-option value="REJECTED">기각</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>분석 상태</mat-label>
            <mat-select [formControl]="filterForm.controls['analysisStatus']">
              <mat-option value="">전체</mat-option>
              <mat-option value="PENDING">대기</mat-option>
              <mat-option value="RUNNING">분석중</mat-option>
              <mat-option value="COMPLETED">완료</mat-option>
              <mat-option value="FAILED">실패</mat-option>
              <mat-option value="OVERRIDDEN">수동보정</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>게이지 포인트 ID</mat-label>
            <mat-icon matPrefix>tag</mat-icon>
            <input matInput [formControl]="filterForm.controls['gaugePointId']" placeholder="gaugePoint:..." />
          </mat-form-field>
        </div>
        <div class="ax-filter-bar__actions">
          <button mat-stroked-button (click)="clearFilter()">
            <mat-icon>clear_all</mat-icon> 초기화
          </button>
          <button mat-flat-button color="primary" (click)="applyFilter()">
            <mat-icon>search</mat-icon> 검색
          </button>
        </div>
      </div>

      <!-- 목록 + 사이드 패널 -->
      <mat-sidenav-container class="ax-crack-sidenav">

        <mat-sidenav-content>
          @if (loading()) {
            <div class="ax-loading-center">
              <mat-spinner diameter="40" />
            </div>
          } @else if (items().length === 0) {
            <ax-empty-state
              type="search-no-result"
              icon="search_off"
              title="분석 결과가 없습니다"
              description="검색 조건을 변경하거나 필터를 초기화해 보세요"
              primaryLabel="필터 초기화"
              primaryIcon="clear_all"
              (primaryAction)="clearFilter()"
            />
          } @else {
            <div class="ax-crack-grid">
              @for (item of items(); track item._id) {
                <div
                  class="ax-crack-card"
                  [class.ax-crack-card--selected]="selected()?._id === item._id"
                  [class.ax-crack-card--low-confidence]="item.confidence < 0.6"
                  (click)="selectItem(item)"
                  role="button" tabindex="0"
                  [attr.aria-pressed]="selected()?._id === item._id"
                  (keydown.enter)="selectItem(item)"
                >
                  <div class="ax-crack-card__badges">
                    <ax-status-badge [variant]="reviewVariant(item.reviewStatus)" [label]="reviewLabel(item.reviewStatus)" size="sm" />
                    <ax-status-badge [variant]="analysisVariant(item.analysisStatus)" [label]="statusLabel(item.analysisStatus)" size="sm" />
                  </div>
                  <div class="ax-crack-card__gp" [matTooltip]="item.gaugePointId">
                    {{ item.gaugePointId }}
                  </div>
                  <div class="ax-crack-card__metrics">
                    <div class="ax-crack-card__metric">
                      <span class="ax-crack-card__mlbl">최종 폭</span>
                      <span class="ax-crack-card__mval">{{ item.finalWidthMm | number:'1.3-3' }}<em>mm</em></span>
                    </div>
                    <div class="ax-crack-card__metric">
                      <span class="ax-crack-card__mlbl">신뢰도</span>
                      <span class="ax-crack-card__mval" [class.ax-crack-card__mval--low]="item.confidence < 0.6">
                        {{ (item.confidence * 100) | number:'1.0-0' }}<em>%</em>
                      </span>
                    </div>
                    <div class="ax-crack-card__metric">
                      <span class="ax-crack-card__mlbl">모델</span>
                      <span class="ax-crack-card__mval ax-crack-card__mval--model">{{ item.modelVersion }}</span>
                    </div>
                  </div>
                  <div class="ax-crack-card__date">{{ item.createdAt | date:'MM/dd HH:mm' }}</div>
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

        <!-- 오른쪽 상세 패널 -->
        <mat-sidenav #detailPanel position="end" [opened]="!!selected()" mode="side" [style.width]="'720px'">
          @if (selected()) {
            <div class="ax-crack-panel">
              <div class="ax-crack-panel__hdr">
                <button mat-icon-button (click)="closePanel()" matTooltip="패널 닫기">
                  <mat-icon>close</mat-icon>
                </button>
                <mat-icon class="ax-crack-panel__hdr-icon">biotech</mat-icon>
                <span class="ax-crack-panel__hdr-title">균열 분석 상세</span>
                <span class="ax-crack-panel__hdr-gp">{{ selected()!.gaugePointId }}</span>
              </div>
              <mat-divider />
              <div class="ax-crack-panel__body">
                <div class="ax-crack-panel__viewer">
                  <ax-crack-overlay-viewer [result]="selected()!" />
                </div>
                <div class="ax-crack-panel__metrics">
                  <ax-crack-metrics-panel
                    [result]="selected()!"
                    [loading]="reviewLoading()"
                    (reviewed)="onReviewed($event)"
                  />
                </div>
              </div>
            </div>
          }
        </mat-sidenav>

      </mat-sidenav-container>
    </div>
  `,
  styles: [`
    /* ── 페이지 래퍼 ── */
    .ax-crack-page {
      display: flex;
      flex-direction: column;
      height: calc(100vh - var(--ax-header-height) - 2 * var(--ax-page-gutter));
      gap: var(--ax-spacing-4);
    }

    /* ── 헤더 ── */
    .ax-crack-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: var(--ax-spacing-4);
    }
    .ax-crack-header__identity {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-3);
    }
    .ax-crack-header__icon-wrap {
      width: 44px; height: 44px;
      border-radius: var(--ax-radius-md);
      background: var(--ax-color-brand-primary);
      display: flex; align-items: center; justify-content: center;
      color: #fff;
      flex-shrink: 0;
    }
    .ax-crack-header__title {
      margin: 0;
      font-size: var(--ax-font-size-xl);
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
      line-height: 1.3;
    }
    .ax-crack-header__desc {
      margin: 2px 0 0;
      font-size: var(--ax-font-size-sm);
      color: var(--ax-color-text-secondary);
    }

    /* ── 통계 카운터 ── */
    .ax-crack-stats {
      display: flex;
      gap: var(--ax-spacing-3);
      flex-wrap: wrap;
    }
    .ax-crack-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 64px;
      padding: var(--ax-spacing-2) var(--ax-spacing-3);
      border-radius: var(--ax-radius-md);
      border: 1px solid transparent;
    }
    .ax-crack-stat__num {
      font-size: var(--ax-font-size-xl);
      font-weight: var(--ax-font-weight-bold);
      line-height: 1.2;
    }
    .ax-crack-stat__lbl {
      font-size: var(--ax-font-size-xs);
      font-weight: var(--ax-font-weight-medium);
      white-space: nowrap;
    }
    .ax-crack-stat--warn {
      background: var(--ax-color-warning-subtle);
      border-color: var(--ax-color-warning-border);
      color: var(--ax-color-warning);
    }
    .ax-crack-stat--success {
      background: var(--ax-color-success-subtle);
      border-color: var(--ax-color-success-border);
      color: var(--ax-color-success);
    }
    .ax-crack-stat--info {
      background: var(--ax-color-info-subtle);
      border-color: var(--ax-color-info-border);
      color: var(--ax-color-info);
    }
    .ax-crack-stat--danger {
      background: var(--ax-color-danger-subtle);
      border-color: var(--ax-color-danger-border);
      color: var(--ax-color-danger);
    }
    .ax-crack-stat--neutral {
      background: var(--ax-color-bg-surface-alt);
      border-color: var(--ax-color-border-muted);
      color: var(--ax-color-text-secondary);
    }

    /* ── 사이드내비 컨테이너 ── */
    .ax-crack-sidenav {
      flex: 1;
      min-height: 0;
      border-radius: var(--ax-radius-lg);
      border: 1px solid var(--ax-color-border-muted);
      overflow: hidden;
    }

    /* ── 카드 그리드 ── */
    .ax-crack-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: var(--ax-spacing-3);
      padding: var(--ax-spacing-4);
    }

    /* ── 분석 카드 ── */
    .ax-crack-card {
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border-muted);
      border-radius: var(--ax-radius-md);
      padding: var(--ax-spacing-3);
      cursor: pointer;
      transition: box-shadow 0.15s ease, border-color 0.15s ease;
      display: flex;
      flex-direction: column;
      gap: var(--ax-spacing-2);
    }
    .ax-crack-card:hover {
      box-shadow: var(--ax-shadow-md);
      border-color: var(--ax-color-brand-primary-muted);
    }
    .ax-crack-card--selected {
      border-color: var(--ax-color-brand-primary);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--ax-color-brand-primary) 20%, transparent);
    }
    .ax-crack-card--low-confidence {
      border-left: 3px solid var(--ax-color-warning);
    }

    .ax-crack-card__badges {
      display: flex;
      gap: var(--ax-spacing-1);
      flex-wrap: wrap;
    }
    .ax-crack-card__gp {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ax-crack-card__metrics {
      display: flex;
      gap: var(--ax-spacing-3);
      flex-wrap: wrap;
    }
    .ax-crack-card__metric {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .ax-crack-card__mlbl {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-tertiary);
    }
    .ax-crack-card__mval {
      font-size: var(--ax-font-size-base);
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
    }
    .ax-crack-card__mval em {
      font-style: normal;
      font-size: var(--ax-font-size-xs);
      font-weight: var(--ax-font-weight-normal);
      color: var(--ax-color-text-tertiary);
      margin-left: 1px;
    }
    .ax-crack-card__mval--low {
      color: var(--ax-color-danger);
    }
    .ax-crack-card__mval--model {
      font-size: var(--ax-font-size-xs);
      font-weight: var(--ax-font-weight-medium);
      color: var(--ax-color-brand-primary);
      font-family: var(--ax-font-family-mono, monospace);
    }
    .ax-crack-card__date {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-tertiary);
      margin-top: var(--ax-spacing-1);
    }

    /* ── 상세 패널 ── */
    .ax-crack-panel {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .ax-crack-panel__hdr {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-2);
      padding: var(--ax-spacing-3) var(--ax-spacing-4);
      background: var(--ax-color-bg-sidebar);
      color: #fff;
      flex-shrink: 0;
    }
    .ax-crack-panel__hdr button {
      color: rgba(255, 255, 255, 0.7);
    }
    .ax-crack-panel__hdr button:hover {
      color: #fff;
    }
    .ax-crack-panel__hdr-icon {
      font-size: 18px;
      width: 18px; height: 18px;
      color: rgba(255, 255, 255, 0.8);
    }
    .ax-crack-panel__hdr-title {
      font-size: var(--ax-font-size-base);
      font-weight: var(--ax-font-weight-semibold);
    }
    .ax-crack-panel__hdr-gp {
      margin-left: auto;
      font-size: var(--ax-font-size-xs);
      color: rgba(255, 255, 255, 0.6);
      font-family: var(--ax-font-family-mono, monospace);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 240px;
    }
    .ax-crack-panel__body {
      display: flex;
      flex-direction: column;
      flex: 1;
      overflow: hidden;
    }
    .ax-crack-panel__viewer {
      height: 360px;
      min-height: 300px;
      padding: var(--ax-spacing-3);
      border-bottom: 1px solid var(--ax-color-border-muted);
    }
    .ax-crack-panel__metrics {
      flex: 1;
      overflow-y: auto;
    }
  `],
})
export class CrackAnalysisReviewPageComponent implements OnInit {
  private readonly http = inject(HttpClient)
  private readonly fb = inject(FormBuilder)

  items = signal<CrackAnalysisResult[]>([])
  selected = signal<CrackAnalysisResult | null>(null)
  loading = signal(false)
  reviewLoading = signal(false)
  total = signal(0)
  pageSize = 24
  currentPage = 1

  stats = signal({ total: 0, pending: 0, accepted: 0, corrected: 0, rejected: 0, failed: 0 })

  filterForm = this.fb.group({
    reviewStatus: [''],
    analysisStatus: [''],
    gaugePointId: [''],
  })

  ngOnInit(): void {
    this.load()
    this.loadStats()
  }

  load(): void {
    this.loading.set(true)
    const params: Record<string, string> = {
      page: String(this.currentPage),
      limit: String(this.pageSize),
    }
    const f = this.filterForm.value
    if (f.reviewStatus) params['reviewStatus'] = f.reviewStatus
    if (f.analysisStatus) params['analysisStatus'] = f.analysisStatus
    if (f.gaugePointId) params['gaugePointId'] = f.gaugePointId

    this.http.get<{ items: CrackAnalysisResult[]; total: number }>('/api/v1/crack-analysis', { params }).subscribe({
      next: (res) => {
        this.items.set(res.items)
        this.total.set(res.total)
        this.loading.set(false)
      },
      error: () => this.loading.set(false),
    })
  }

  loadStats(): void {
    this.http.get<Record<string, number>>('/api/v1/crack-analysis/stats').subscribe({
      next: (res) => this.stats.set({
        total: res['total'] ?? 0,
        pending: res['pending'] ?? 0,
        accepted: res['accepted'] ?? 0,
        corrected: res['corrected'] ?? 0,
        rejected: res['rejected'] ?? 0,
        failed: res['failed'] ?? 0,
      }),
    })
  }

  selectItem(item: CrackAnalysisResult): void {
    this.selected.set(item)
  }

  closePanel(): void {
    this.selected.set(null)
  }

  applyFilter(): void {
    this.currentPage = 1
    this.load()
  }

  clearFilter(): void {
    this.filterForm.reset({ reviewStatus: '', analysisStatus: '', gaugePointId: '' })
    this.currentPage = 1
    this.load()
  }

  onPage(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1
    this.pageSize = event.pageSize
    this.load()
  }

  onReviewed(payload: ReviewSubmit): void {
    const current = this.selected()
    if (!current) return

    this.reviewLoading.set(true)
    this.http.patch<CrackAnalysisResult>(`/api/v1/crack-analysis/${current._id}/review`, payload).subscribe({
      next: (updated) => {
        this.selected.set(updated)
        this.items.update(list => list.map(i => i._id === updated._id ? updated : i))
        this.reviewLoading.set(false)
        this.loadStats()
      },
      error: () => this.reviewLoading.set(false),
    })
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

  reviewVariant(status: CrackAnalysisReviewStatus): string {
    const map: Record<string, string> = {
      PENDING: 'warning', ACCEPTED: 'success', CORRECTED: 'info', REJECTED: 'danger',
    }
    return map[status] ?? 'neutral'
  }

  analysisVariant(status: CrackAnalysisStatus): string {
    const map: Record<string, string> = {
      PENDING: 'warning', RUNNING: 'info', COMPLETED: 'success', FAILED: 'danger', OVERRIDDEN: 'neutral',
    }
    return map[status] ?? 'neutral'
  }
}
