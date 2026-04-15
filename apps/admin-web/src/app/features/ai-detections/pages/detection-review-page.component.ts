// apps/admin-web/src/app/features/ai-detections/pages/detection-review-page.component.ts
import {
  Component, OnInit, ChangeDetectionStrategy, signal, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { debounceTime } from 'rxjs';
import {
  AiDetectionsApi, DefectCandidate, CandidateListParams,
  DetectionStats,
} from '../data-access/ai-detections.api';
import { DetectionCandidateCardComponent } from '../components/detection-candidate-card.component';
import { DetectionReviewPanelComponent } from '../components/detection-review-panel.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'ax-detection-review-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatButtonModule, MatIconModule,
    MatSelectModule, MatFormFieldModule, MatInputModule,
    MatProgressBarModule, MatSnackBarModule,
    MatPaginatorModule, MatSidenavModule, MatTooltipModule,
    DetectionCandidateCardComponent, DetectionReviewPanelComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="ax-detection-page">

      <!-- ── 페이지 헤더 ── -->
      <div class="ax-detection-header">
        <div class="ax-detection-header__left">
          <div class="ax-detection-header__icon" aria-hidden="true">
            <mat-icon>manage_search</mat-icon>
          </div>
          <div>
            <h1 class="ax-detection-header__title">AI 결함 탐지 검토</h1>
            <p class="ax-detection-header__desc">
              드론·점검 영상 AI 탐지 결과 Human-in-the-Loop 검토 — Y-MaskNet / Mask R-CNN
            </p>
          </div>
        </div>

        <!-- 통계 카운터 -->
        @if (stats()) {
          <div class="ax-det-stats" role="list" aria-label="검토 현황">
            <div class="ax-det-stat ax-det-stat--warn" role="listitem">
              <span class="ax-det-stat__num">{{ stats()!.pending }}</span>
              <span class="ax-det-stat__lbl">검토 대기</span>
            </div>
            <div class="ax-det-stat ax-det-stat--success" role="listitem">
              <span class="ax-det-stat__num">{{ stats()!.approved }}</span>
              <span class="ax-det-stat__lbl">승인</span>
            </div>
            <div class="ax-det-stat ax-det-stat--neutral" role="listitem">
              <span class="ax-det-stat__num">{{ stats()!.rejected }}</span>
              <span class="ax-det-stat__lbl">기각</span>
            </div>
            <div class="ax-det-stat ax-det-stat--info" role="listitem">
              <span class="ax-det-stat__num">{{ stats()!.promoted }}</span>
              <span class="ax-det-stat__lbl">결함 승격</span>
            </div>
          </div>
        }
      </div>

      <!-- ── 필터 바 ── -->
      <div class="ax-filter-bar">
        <div class="ax-filter-bar__filters">
          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="ax-det-filter">
            <mat-label>검토 상태</mat-label>
            <mat-select [formControl]="filterForm.controls['reviewStatus']">
              <mat-option value="">전체</mat-option>
              <mat-option value="PENDING">검토 대기</mat-option>
              <mat-option value="APPROVED">승인됨</mat-option>
              <mat-option value="REJECTED">기각됨</mat-option>
              <mat-option value="PROMOTED">승격 완료</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="ax-det-filter">
            <mat-label>결함 유형</mat-label>
            <mat-select [formControl]="filterForm.controls['defectType']">
              <mat-option value="">전체</mat-option>
              @for (t of defectTypeOptions; track t.value) {
                <mat-option [value]="t.value">{{ t.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="ax-det-filter">
            <mat-label>신뢰도 등급</mat-label>
            <mat-select [formControl]="filterForm.controls['confidenceLevel']">
              <mat-option value="">전체</mat-option>
              <mat-option value="AUTO_ACCEPT">자동 확정 (≥90%)</mat-option>
              <mat-option value="REQUIRES_REVIEW">검토 필요 (80~89%)</mat-option>
              <mat-option value="MANUAL_REQUIRED">수동 입력 (&lt;80%)</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="ax-det-filter">
            <mat-label>소스 유형</mat-label>
            <mat-select [formControl]="filterForm.controls['sourceType']">
              <mat-option value="">전체</mat-option>
              <mat-option value="DRONE_FRAME">드론 프레임</mat-option>
              <mat-option value="DRONE_IMAGE">드론 이미지</mat-option>
              <mat-option value="MOBILE_PHOTO">현장 사진</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="ax-filter-bar__actions">
          <button mat-stroked-button (click)="resetFilters()" matTooltip="필터 초기화">
            <mat-icon>clear</mat-icon> 초기화
          </button>
          <button mat-flat-button color="primary" (click)="loadCandidates()">
            <mat-icon>search</mat-icon> 검색
          </button>
        </div>
      </div>

      <!-- ── 본문: 목록 + 검토 패널 ── -->
      <mat-sidenav-container class="ax-detection-body">

        <!-- 검토 상세 패널 (우측) -->
        <mat-sidenav #reviewSidenav mode="side" position="end"
          [opened]="selectedCandidate() !== null" class="ax-detection-panel">
          <div class="ax-detection-panel__hdr">
            <div class="ax-detection-panel__hdr-left">
              <mat-icon aria-hidden="true">manage_search</mat-icon>
              <span>결함 후보 검토</span>
            </div>
            <button mat-icon-button (click)="selectedCandidate.set(null)" aria-label="패널 닫기">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <ax-detection-review-panel
            [candidate]="selectedCandidate()"
            (reviewed)="onReviewed($event)"
            (promoted)="onPromoted($event)" />
        </mat-sidenav>

        <!-- 후보 목록 -->
        <mat-sidenav-content>
          @if (loading()) {
            <div class="ax-loading-center">
              <mat-progress-bar mode="indeterminate" style="max-width:320px" />
              <span>결함 후보를 불러오는 중...</span>
            </div>
          } @else if (candidates().length === 0) {
            <ax-empty-state
              type="search-no-result"
              title="조건에 맞는 결함 후보가 없습니다"
              description="필터를 조정하거나 드론 미션 AI 분석이 완료된 후 확인하세요."
              primaryLabel="필터 초기화"
              primaryIcon="clear"
              (primaryAction)="resetFilters()"
              metaText="AI 결함 탐지는 드론 미션 완료 후 자동 실행됩니다." />
          } @else {
            <div class="ax-candidate-grid">
              @for (candidate of candidates(); track candidate._id) {
                <ax-detection-candidate-card
                  [candidate]="candidate"
                  (onReview)="selectedCandidate.set($event)"
                  (onApprove)="quickApprove($event)"
                  (onReject)="quickReject($event)"
                  (onPromote)="selectedCandidate.set($event)" />
              }
            </div>

            <mat-paginator
              [length]="totalCount()"
              [pageSize]="pageSize"
              [pageSizeOptions]="[10, 20, 50]"
              [pageIndex]="currentPage() - 1"
              (page)="onPageChange($event)"
              showFirstLastButtons />
          }
        </mat-sidenav-content>
      </mat-sidenav-container>

    </div>
  `,
  styles: [`
    :host { display: block; }

    /* ── 페이지 래퍼 ── */
    .ax-detection-page {
      display: flex;
      flex-direction: column;
      gap: var(--ax-spacing-12);
      height: calc(100vh - var(--ax-header-height) - 2 * var(--ax-page-gutter));
    }

    /* ── 페이지 헤더 카드 ── */
    .ax-detection-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--ax-spacing-16);
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border-default);
      border-top: 3px solid var(--ax-color-brand-primary);
      border-radius: var(--ax-radius-lg);
      padding: var(--ax-spacing-16) var(--ax-card-padding);
      flex-shrink: 0;
      flex-wrap: wrap;
      box-shadow: var(--ax-shadow-xs);

      &__left {
        display: flex;
        align-items: center;
        gap: var(--ax-spacing-12);
      }

      &__icon {
        width: 40px;
        height: 40px;
        background: var(--ax-color-brand-primary-subtle);
        border-radius: var(--ax-radius-lg);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        mat-icon { color: var(--ax-color-brand-primary); font-size: 20px; width: 20px; height: 20px; }
      }

      &__title {
        font-size: var(--ax-font-size-2xl);
        font-weight: var(--ax-font-weight-bold);
        color: var(--ax-color-text-primary);
        letter-spacing: -0.01em;
        line-height: 1.2;
        margin: 0;
      }

      &__desc {
        font-size: var(--ax-font-size-sm);
        color: var(--ax-color-text-tertiary);
        margin: var(--ax-spacing-4) 0 0;
      }
    }

    /* ── 통계 카운터 ── */
    .ax-det-stats {
      display: flex;
      gap: var(--ax-spacing-8);
      flex-wrap: wrap;
      flex-shrink: 0;
    }

    .ax-det-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 64px;
      padding: var(--ax-spacing-8) var(--ax-spacing-12);
      border-radius: var(--ax-radius-md);
      border: 1px solid var(--ax-color-border-default);
      background: var(--ax-color-bg-surface-alt);

      &__num {
        font-size: var(--ax-font-size-xl);
        font-weight: var(--ax-font-weight-bold);
        line-height: 1.1;
        font-variant-numeric: tabular-nums;
      }

      &__lbl {
        font-size: var(--ax-font-size-xs);
        color: var(--ax-color-text-tertiary);
        margin-top: 2px;
        white-space: nowrap;
      }

      &--warn    .ax-det-stat__num { color: var(--ax-color-warning-text); }
      &--success .ax-det-stat__num { color: var(--ax-color-success-text); }
      &--neutral .ax-det-stat__num { color: var(--ax-color-neutral-text); }
      &--info    .ax-det-stat__num { color: var(--ax-color-info-text); }
    }

    /* ── 필터 필드 ── */
    .ax-det-filter {
      min-width: 150px;
      flex: 1;
    }

    /* ── 본문 컨테이너 ── */
    .ax-detection-body {
      flex: 1;
      min-height: 0;
      border: 1px solid var(--ax-color-border-default);
      border-radius: var(--ax-radius-lg);
      overflow: hidden;
      box-shadow: var(--ax-shadow-xs);
    }

    /* ── 검토 사이드 패널 ── */
    .ax-detection-panel {
      width: 460px !important;
      border-left: 1px solid var(--ax-color-border-default) !important;

      &__hdr {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--ax-spacing-12) var(--ax-card-padding);
        background: var(--ax-color-bg-sidebar);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        flex-shrink: 0;

        mat-icon { color: rgba(255, 255, 255, 0.7); font-size: 18px; width: 18px; height: 18px; }

        &-left {
          display: flex;
          align-items: center;
          gap: var(--ax-spacing-8);
          span {
            font-size: var(--ax-font-size-md);
            font-weight: var(--ax-font-weight-semibold);
            color: rgba(255, 255, 255, 0.9);
          }
        }

        button { color: rgba(255, 255, 255, 0.65) !important; }
      }
    }

    /* ── 후보 그리드 ── */
    .ax-candidate-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: var(--ax-spacing-12);
      padding: var(--ax-card-padding);
    }

    mat-paginator {
      border-top: 1px solid var(--ax-color-border-default);
      background: var(--ax-color-bg-surface-alt);
    }
  `],
})
export class DetectionReviewPageComponent implements OnInit {
  private readonly api     = inject(AiDetectionsApi);
  private readonly snackBar = inject(MatSnackBar);
  private readonly route   = inject(ActivatedRoute);
  private readonly fb      = inject(FormBuilder);

  readonly candidates     = signal<DefectCandidate[]>([]);
  readonly selectedCandidate = signal<DefectCandidate | null>(null);
  readonly loading        = signal(false);
  readonly totalCount     = signal(0);
  readonly currentPage    = signal(1);
  readonly stats          = signal<DetectionStats | null>(null);

  pageSize = 20;
  filterForm!: FormGroup;

  readonly defectTypeOptions = [
    { value: 'CRACK', label: '균열' }, { value: 'LEAK', label: '누수' },
    { value: 'DELAMINATION', label: '박리' }, { value: 'SPOILING', label: '오손' },
    { value: 'CORROSION', label: '부식' }, { value: 'EFFLORESCENCE', label: '백태' },
    { value: 'FIRE_RISK_CLADDING', label: '화재위험 외장재' }, { value: 'OTHER', label: '기타' },
  ];

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      reviewStatus: ['PENDING'],
      defectType: [''],
      confidenceLevel: [''],
      sourceType: [''],
    });

    // 쿼리 파라미터로 미션 ID 초기 설정
    this.route.queryParams.subscribe((params) => {
      if (params['missionId']) {
        // sourceMissionId 필터가 추가되면 여기서 설정 가능
      }
    });

    this.loadCandidates();
    this.loadStats();
  }

  loadCandidates(): void {
    this.loading.set(true);
    const v = this.filterForm.value;
    const params: CandidateListParams = {
      ...(v.reviewStatus    && { reviewStatus:    v.reviewStatus }),
      ...(v.defectType      && { defectType:      v.defectType }),
      ...(v.confidenceLevel && { confidenceLevel: v.confidenceLevel }),
      ...(v.sourceType      && { sourceType:      v.sourceType }),
      page:  this.currentPage(),
      limit: this.pageSize,
    };
    this.api.listCandidates(params).subscribe({
      next: ({ data, meta }) => {
        this.candidates.set(data);
        this.totalCount.set(meta.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadStats(): void {
    this.api.getStats().subscribe({
      next: (s) => this.stats.set(s),
      error: () => {},
    });
  }

  resetFilters(): void {
    this.filterForm.reset({ reviewStatus: '', defectType: '', confidenceLevel: '', sourceType: '' });
    this.currentPage.set(1);
    this.loadCandidates();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage.set(event.pageIndex + 1);
    this.pageSize = event.pageSize;
    this.loadCandidates();
  }

  quickApprove(candidate: DefectCandidate): void {
    this.api.review(candidate._id, { reviewStatus: 'APPROVED' }).subscribe({
      next: (updated) => {
        this.snackBar.open('승인되었습니다.', '닫기', { duration: 2000 });
        this.replaceInList(updated);
        this.loadStats();
      },
    });
  }

  quickReject(candidate: DefectCandidate): void {
    this.api.review(candidate._id, { reviewStatus: 'REJECTED' }).subscribe({
      next: (updated) => {
        this.snackBar.open('기각되었습니다.', '닫기', { duration: 2000 });
        this.replaceInList(updated);
        this.loadStats();
      },
    });
  }

  onReviewed(updated: DefectCandidate): void {
    this.snackBar.open(`검토 완료: ${updated.reviewStatus}`, '닫기', { duration: 2000 });
    this.replaceInList(updated);
    this.selectedCandidate.set(updated);
    this.loadStats();
  }

  onPromoted(result: { candidate: DefectCandidate; defect: any }): void {
    this.snackBar.open(
      `Defect로 승격되었습니다. ID: ${result.defect._id}`,
      '닫기',
      { duration: 4000 },
    );
    this.replaceInList(result.candidate);
    this.selectedCandidate.set(result.candidate);
    this.loadStats();
  }

  private replaceInList(updated: DefectCandidate): void {
    this.candidates.update((list) =>
      list.map((c) => (c._id === updated._id ? updated : c)),
    );
  }
}
