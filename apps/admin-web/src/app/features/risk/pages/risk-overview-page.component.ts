// apps/admin-web/src/app/features/risk/pages/risk-overview-page.component.ts
// Phase 2-9: 예지정비 위험도 현황 페이지

import {
  Component, OnInit, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';

import { RiskHeatmapComponent } from '../components/risk-heatmap.component';
import { EvidencePanelComponent } from '../components/evidence-panel.component';
import { RecommendationTableComponent } from '../components/recommendation-table.component';
import { XaiShapPanelComponent } from '../components/xai-shap-panel.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'ax-risk-overview-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatIconModule, MatSelectModule,
    MatFormFieldModule, MatInputModule, MatTabsModule,
    MatDividerModule, MatDialogModule, MatSnackBarModule, MatProgressSpinnerModule,
    MatSidenavModule, MatTooltipModule,
    RiskHeatmapComponent, EvidencePanelComponent, RecommendationTableComponent,
    XaiShapPanelComponent, EmptyStateComponent,
  ],
  template: `
    <div class="ax-risk-page">

      <!-- 페이지 헤더 -->
      <div class="ax-risk-header">
        <div class="ax-risk-header__identity">
          <div class="ax-risk-header__icon-wrap">
            <mat-icon>shield</mat-icon>
          </div>
          <div>
            <h1 class="ax-risk-header__title">예지정비 위험도 현황</h1>
            <p class="ax-risk-header__desc">자산·구역별 위험도 스코어 및 장기수선 권장 관리</p>
          </div>
        </div>
        <div class="ax-risk-header__actions">
          <button mat-stroked-button (click)="loadAll()" matTooltip="데이터 새로고침">
            <mat-icon>refresh</mat-icon> 새로고침
          </button>
          <button mat-flat-button color="primary" (click)="showCalculatePanel = !showCalculatePanel">
            <mat-icon>calculate</mat-icon> 위험도 계산
          </button>
        </div>
      </div>

      <!-- 요약 카드 행 -->
      <div class="ax-risk-summary">
        <button
          class="ax-risk-sum ax-risk-sum--total"
          [class.ax-risk-sum--active]="filterLevel === ''"
          (click)="filterLevel = ''; applyFilter()"
        >
          <mat-icon class="ax-risk-sum__icon">assessment</mat-icon>
          <span class="ax-risk-sum__num">{{ scores().length }}</span>
          <span class="ax-risk-sum__lbl">전체 대상</span>
        </button>
        @for (lvl of riskLevels; track lvl.key) {
          <button
            class="ax-risk-sum"
            [class]="'ax-risk-sum ax-risk-sum--' + lvl.key.toLowerCase()"
            [class.ax-risk-sum--active]="filterLevel === lvl.key"
            (click)="filterLevel = filterLevel === lvl.key ? '' : lvl.key; applyFilter()"
          >
            <span class="ax-risk-sum__num">{{ countByLevel(lvl.key) }}</span>
            <span class="ax-risk-sum__lbl">{{ lvl.label }}</span>
          </button>
        }
        <div class="ax-risk-sum ax-risk-sum--pending">
          <mat-icon class="ax-risk-sum__icon">pending_actions</mat-icon>
          <span class="ax-risk-sum__num">{{ pendingRecCount() }}</span>
          <span class="ax-risk-sum__lbl">검토 대기 권장</span>
        </div>
      </div>

      <!-- 위험도 계산 패널 -->
      @if (showCalculatePanel) {
        <div class="ax-risk-calc-panel">
          <div class="ax-risk-calc-panel__hdr">
            <mat-icon>calculate</mat-icon>
            <span>위험도 즉시 계산</span>
            <button mat-icon-button (click)="showCalculatePanel = false" matTooltip="닫기">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <div class="ax-risk-calc-panel__body">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>단지 선택</mat-label>
              <mat-select [(ngModel)]="calcForm.complexId">
                @for (c of complexes(); track c._id) {
                  <mat-option [value]="c._id">{{ c.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>대상 유형</mat-label>
              <mat-select [(ngModel)]="calcForm.targetType">
                <mat-option value="BUILDING">동 (Building)</mat-option>
                <mat-option value="ZONE">구역 (Zone)</mat-option>
                <mat-option value="ASSET">설비 (Asset)</mat-option>
                <mat-option value="COMPLEX">단지 전체</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>대상 ID</mat-label>
              <input matInput [(ngModel)]="calcForm.targetId" placeholder="대상 ID 입력" />
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>대상 이름</mat-label>
              <input matInput [(ngModel)]="calcForm.targetName" placeholder="대상 이름 입력" />
            </mat-form-field>
            <button
              mat-flat-button color="primary"
              [disabled]="calculating()"
              (click)="runCalculation()"
            >
              @if (calculating()) {
                <mat-spinner diameter="18" />
              } @else {
                <mat-icon>play_arrow</mat-icon>
              }
              계산 실행
            </button>
          </div>
        </div>
      }

      <!-- 탭: 히트맵 / 권장 목록 -->
      <mat-tab-group [(selectedIndex)]="activeTab" animationDuration="200ms" class="ax-risk-tabs">

        <!-- 탭 1: 위험도 히트맵 -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>grid_view</mat-icon>
            위험도 히트맵 ({{ filteredScores().length }}건)
          </ng-template>

          <!-- 히트맵 필터 -->
          <div class="ax-filter-bar ax-filter-bar--inline">
            <div class="ax-filter-bar__filters">
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>위험 등급</mat-label>
                <mat-select [(ngModel)]="filterLevel" (selectionChange)="applyFilter()">
                  <mat-option value="">전체 등급</mat-option>
                  @for (lvl of riskLevels; track lvl.key) {
                    <mat-option [value]="lvl.key">{{ lvl.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>대상 유형</mat-label>
                <mat-select [(ngModel)]="filterTargetType" (selectionChange)="applyFilter()">
                  <mat-option value="">전체 유형</mat-option>
                  <mat-option value="BUILDING">동</mat-option>
                  <mat-option value="ZONE">구역</mat-option>
                  <mat-option value="ASSET">설비</mat-option>
                  <mat-option value="COMPLEX">단지</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
          </div>

          <mat-sidenav-container class="ax-risk-sidenav">
            <mat-sidenav
              #evidenceSidenav
              mode="over"
              position="end"
              [opened]="!!selectedScore()"
              class="ax-risk-detail-nav"
              (closedStart)="selectedScore.set(null)"
            >
              <div class="ax-risk-detail__hdr">
                <mat-icon class="ax-risk-detail__hdr-icon">shield</mat-icon>
                <span class="ax-risk-detail__hdr-title">위험도 상세</span>
                @if (selectedScore()) {
                  <span class="ax-risk-detail__hdr-badge ax-risk-detail__hdr-badge--{{ selectedScore().level?.toLowerCase() }}">
                    {{ levelLabel(selectedScore().level) }}
                  </span>
                }
                <button mat-icon-button (click)="selectedScore.set(null)" matTooltip="닫기">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
              <mat-divider />

              <div class="ax-risk-detail__body">
                <mat-tab-group animationDuration="150ms">
                  <mat-tab>
                    <ng-template mat-tab-label>
                      <mat-icon>psychology</mat-icon> XAI 설명
                    </ng-template>
                    <div class="ax-risk-detail__tab-content">
                      <ax-xai-shap-panel
                        [score]="selectedScore()?.score"
                        [level]="selectedScore()?.level"
                        [evidence]="selectedScore()?.evidence"
                        [targetName]="selectedScore()?.targetName"
                      />
                    </div>
                  </mat-tab>
                  <mat-tab>
                    <ng-template mat-tab-label>
                      <mat-icon>analytics</mat-icon> 상세 근거
                    </ng-template>
                    <div class="ax-risk-detail__tab-content">
                      <ax-evidence-panel [score]="selectedScore()" />
                    </div>
                  </mat-tab>
                </mat-tab-group>

                @if (selectedScore()) {
                  <div class="ax-risk-detail__action">
                    <button mat-flat-button color="primary"
                      (click)="generateRecommendation(selectedScore()); selectedScore.set(null)"
                    >
                      <mat-icon>auto_awesome</mat-icon> AI 정비 지시서 생성
                    </button>
                  </div>
                }
              </div>
            </mat-sidenav>

            <mat-sidenav-content>
              @if (loading()) {
                <div class="ax-loading-center">
                  <mat-spinner diameter="40" />
                </div>
              } @else if (filteredScores().length === 0) {
                <ax-empty-state
                  type="search-no-result"
                  icon="shield_question"
                  title="해당 조건의 위험도 데이터가 없습니다"
                  description="등급 또는 유형 필터를 변경해 보세요"
                  primaryLabel="필터 초기화"
                  primaryIcon="clear_all"
                  (primaryAction)="filterLevel = ''; filterTargetType = ''"
                />
              } @else {
                <ax-risk-heatmap
                  [items]="filteredScores()"
                  (select)="selectedScore.set($event)"
                />
              }
            </mat-sidenav-content>
          </mat-sidenav-container>
        </mat-tab>

        <!-- 탭 2: 장기수선 권장 -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>assignment</mat-icon>
            장기수선 권장 ({{ recommendations().length }}건)
          </ng-template>

          <div class="ax-filter-bar ax-filter-bar--inline">
            <div class="ax-filter-bar__filters">
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>권장 상태</mat-label>
                <mat-select [(ngModel)]="filterRecStatus" (selectionChange)="loadRecommendations()">
                  <mat-option value="">전체</mat-option>
                  <mat-option value="PENDING">검토 대기</mat-option>
                  <mat-option value="APPROVED">승인됨</mat-option>
                  <mat-option value="IN_PROGRESS">진행 중</mat-option>
                  <mat-option value="COMPLETED">완료</mat-option>
                  <mat-option value="DEFERRED">연기됨</mat-option>
                  <mat-option value="REJECTED">반려됨</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
          </div>

          <ax-recommendation-table
            [items]="recommendations()"
            (select)="selectedRec.set($event)"
            (action)="onRecAction($event)"
          />
        </mat-tab>

      </mat-tab-group>

    </div>
  `,
  styles: [`
    /* ── 페이지 래퍼 ── */
    .ax-risk-page {
      display: flex;
      flex-direction: column;
      gap: var(--ax-spacing-5);
      max-width: 1400px;
      margin: 0 auto;
    }

    /* ── 헤더 ── */
    .ax-risk-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: var(--ax-spacing-4);
    }
    .ax-risk-header__identity {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-3);
    }
    .ax-risk-header__icon-wrap {
      width: 44px; height: 44px;
      border-radius: var(--ax-radius-md);
      background: var(--ax-color-danger);
      display: flex; align-items: center; justify-content: center;
      color: #fff;
      flex-shrink: 0;
    }
    .ax-risk-header__title {
      margin: 0;
      font-size: var(--ax-font-size-xl);
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
      line-height: 1.3;
    }
    .ax-risk-header__desc {
      margin: 2px 0 0;
      font-size: var(--ax-font-size-sm);
      color: var(--ax-color-text-secondary);
    }
    .ax-risk-header__actions {
      display: flex;
      gap: var(--ax-spacing-2);
      flex-shrink: 0;
    }

    /* ── 요약 카드 행 ── */
    .ax-risk-summary {
      display: flex;
      gap: var(--ax-spacing-3);
      flex-wrap: wrap;
    }
    .ax-risk-sum {
      flex: 1;
      min-width: 80px;
      padding: var(--ax-spacing-3) var(--ax-spacing-4);
      border-radius: var(--ax-radius-md);
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border-muted);
      border-top: 4px solid var(--ax-color-border-muted);
      text-align: center;
      cursor: pointer;
      transition: box-shadow 0.15s ease, border-top-color 0.15s ease;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--ax-spacing-1);
    }
    .ax-risk-sum:hover {
      box-shadow: var(--ax-shadow-sm);
    }
    .ax-risk-sum--active {
      box-shadow: var(--ax-shadow-md);
    }
    .ax-risk-sum__num {
      display: block;
      font-size: 26px;
      font-weight: var(--ax-font-weight-bold);
      line-height: 1.2;
    }
    .ax-risk-sum__lbl {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-secondary);
    }
    .ax-risk-sum__icon {
      font-size: 20px; width: 20px; height: 20px;
      color: var(--ax-color-text-tertiary);
    }

    /* 등급별 색상 */
    .ax-risk-sum--total   { border-top-color: var(--ax-color-brand-primary); }
    .ax-risk-sum--total .ax-risk-sum__num { color: var(--ax-color-brand-primary); }

    .ax-risk-sum--critical { border-top-color: var(--ax-color-danger); }
    .ax-risk-sum--critical .ax-risk-sum__num { color: var(--ax-color-danger); }

    .ax-risk-sum--high { border-top-color: var(--ax-color-warning); }
    .ax-risk-sum--high .ax-risk-sum__num { color: var(--ax-color-warning); }

    .ax-risk-sum--medium { border-top-color: var(--ax-color-info); }
    .ax-risk-sum--medium .ax-risk-sum__num { color: var(--ax-color-info); }

    .ax-risk-sum--low { border-top-color: var(--ax-color-success); }
    .ax-risk-sum--low .ax-risk-sum__num { color: var(--ax-color-success); }

    .ax-risk-sum--pending { border-top-color: var(--ax-color-warning); cursor: default; }
    .ax-risk-sum--pending .ax-risk-sum__num { color: var(--ax-color-warning); }

    /* ── 계산 패널 ── */
    .ax-risk-calc-panel {
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border-muted);
      border-radius: var(--ax-radius-lg);
      overflow: hidden;
    }
    .ax-risk-calc-panel__hdr {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-2);
      padding: var(--ax-spacing-3) var(--ax-spacing-4);
      background: var(--ax-color-bg-surface-alt);
      border-bottom: 1px solid var(--ax-color-border-muted);
      font-size: var(--ax-font-size-base);
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
    }
    .ax-risk-calc-panel__hdr mat-icon:first-child {
      color: var(--ax-color-brand-primary);
    }
    .ax-risk-calc-panel__hdr button {
      margin-left: auto;
    }
    .ax-risk-calc-panel__body {
      display: flex;
      align-items: flex-end;
      gap: var(--ax-spacing-3);
      flex-wrap: wrap;
      padding: var(--ax-spacing-4);
    }

    /* ── 탭 ── */
    .ax-risk-tabs {
      flex: 1;
    }
    .ax-risk-tabs .mat-mdc-tab-label-container {
      border-bottom: 1px solid var(--ax-color-border-muted);
    }

    /* ── 탭 내부 필터 바 (인라인 변형) ── */
    .ax-filter-bar--inline {
      padding: var(--ax-spacing-3) 0;
      background: transparent;
      border: none;
      border-bottom: 1px solid var(--ax-color-border-muted);
      border-radius: 0;
      margin-bottom: var(--ax-spacing-3);
    }

    /* ── 히트맵 사이드내비 ── */
    .ax-risk-sidenav {
      min-height: 500px;
    }
    .ax-risk-detail-nav {
      width: 420px;
      display: flex;
      flex-direction: column;
    }
    .ax-risk-detail__hdr {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-2);
      padding: var(--ax-spacing-3) var(--ax-spacing-4);
      background: var(--ax-color-bg-sidebar);
      color: #fff;
      flex-shrink: 0;
    }
    .ax-risk-detail__hdr-icon {
      font-size: 18px; width: 18px; height: 18px;
      color: rgba(255, 255, 255, 0.8);
    }
    .ax-risk-detail__hdr-title {
      font-size: var(--ax-font-size-base);
      font-weight: var(--ax-font-weight-semibold);
    }
    .ax-risk-detail__hdr-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: var(--ax-radius-sm);
      font-size: var(--ax-font-size-xs);
      font-weight: var(--ax-font-weight-medium);
    }
    .ax-risk-detail__hdr-badge--critical {
      background: var(--ax-color-danger-subtle);
      color: var(--ax-color-danger);
    }
    .ax-risk-detail__hdr-badge--high {
      background: var(--ax-color-warning-subtle);
      color: var(--ax-color-warning);
    }
    .ax-risk-detail__hdr-badge--medium {
      background: var(--ax-color-info-subtle);
      color: var(--ax-color-info);
    }
    .ax-risk-detail__hdr-badge--low {
      background: var(--ax-color-success-subtle);
      color: var(--ax-color-success);
    }
    .ax-risk-detail__hdr button {
      margin-left: auto;
      color: rgba(255, 255, 255, 0.7);
    }
    .ax-risk-detail__hdr button:hover {
      color: #fff;
    }
    .ax-risk-detail__body {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }
    .ax-risk-detail__tab-content {
      padding: var(--ax-spacing-3);
    }
    .ax-risk-detail__action {
      padding: var(--ax-spacing-4);
      border-top: 1px solid var(--ax-color-border-muted);
      margin-top: auto;
    }
  `],
})
export class RiskOverviewPageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);

  readonly scores = signal<any[]>([]);
  readonly recommendations = signal<any[]>([]);
  readonly complexes = signal<any[]>([]);
  readonly loading = signal(false);
  readonly calculating = signal(false);
  readonly selectedScore = signal<any>(null);
  readonly selectedRec = signal<any>(null);

  readonly pendingRecCount = () =>
    this.recommendations().filter((r) => r.status === 'PENDING').length;

  readonly riskLevels = [
    { key: 'CRITICAL', label: '위험' },
    { key: 'HIGH',     label: '높음' },
    { key: 'MEDIUM',   label: '보통' },
    { key: 'LOW',      label: '낮음' },
  ];

  filterLevel = '';
  filterTargetType = '';
  filterRecStatus = '';
  activeTab = 0;
  showCalculatePanel = false;

  calcForm = {
    complexId: '',
    targetType: 'BUILDING',
    targetId: '',
    targetName: '',
  };

  filteredScores() {
    return this.scores().filter((s) => {
      if (this.filterLevel      && s.level      !== this.filterLevel)      return false;
      if (this.filterTargetType && s.targetType !== this.filterTargetType) return false;
      return true;
    });
  }

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    this.loadScores();
    this.loadRecommendations();
    this.loadComplexes();
  }

  loadScores() {
    this.loading.set(true);
    this.http.get<any>('/api/v1/risk-scoring', { params: { limit: '200' } }).subscribe({
      next: (res) => { this.scores.set(res.data ?? []); this.loading.set(false); },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('위험도 데이터 조회 실패', '닫기', { duration: 3000 });
      },
    });
  }

  loadRecommendations() {
    const params: any = { limit: '200' };
    if (this.filterRecStatus) params.status = this.filterRecStatus;
    this.http.get<any>('/api/v1/maintenance-recommendations', { params }).subscribe({
      next: (res) => { this.recommendations.set(res.data ?? []); },
      error: () => { this.snackBar.open('권장 데이터 조회 실패', '닫기', { duration: 3000 }); },
    });
  }

  loadComplexes() {
    this.http.get<any>('/api/v1/complexes', { params: { limit: '50' } }).subscribe({
      next: (res) => { this.complexes.set(res.data ?? []); },
      error: () => {},
    });
  }

  applyFilter() {}

  runCalculation() {
    if (!this.calcForm.complexId || !this.calcForm.targetId || !this.calcForm.targetName) {
      this.snackBar.open('모든 항목을 입력해 주세요', '닫기', { duration: 2000 });
      return;
    }
    this.calculating.set(true);
    this.http.post<any>('/api/v1/risk-scoring/calculate', this.calcForm).subscribe({
      next: (result) => {
        this.calculating.set(false);
        this.showCalculatePanel = false;
        this.snackBar.open(`위험도 계산 완료 — ${result.score}점 (${result.level})`, '닫기', { duration: 3000 });
        this.loadScores();
      },
      error: (err) => {
        this.calculating.set(false);
        this.snackBar.open(`계산 실패: ${err?.error?.message ?? err.message}`, '닫기', { duration: 4000 });
      },
    });
  }

  generateRecommendation(score: any) {
    this.http.post<any>(`/api/v1/maintenance-recommendations/from-risk-score/${score._id}`, {}).subscribe({
      next: () => {
        this.snackBar.open('장기수선 권장 생성 완료', '닫기', { duration: 2000 });
        this.loadRecommendations();
        this.activeTab = 1;
      },
      error: (err) => {
        this.snackBar.open(`권장 생성 실패: ${err?.error?.message ?? err.message}`, '닫기', { duration: 3000 });
      },
    });
  }

  onRecAction(event: { rec: any; act: string }) {
    this.http.patch(`/api/v1/maintenance-recommendations/${event.rec._id}/status`, {
      status: event.act,
    }).subscribe({
      next: () => {
        this.snackBar.open('상태 변경 완료', '닫기', { duration: 2000 });
        this.loadRecommendations();
      },
      error: (err) => {
        this.snackBar.open(`상태 변경 실패: ${err?.error?.message ?? err.message}`, '닫기', { duration: 3000 });
      },
    });
  }

  countByLevel(level: string): number {
    return this.scores().filter((s) => s.level === level).length;
  }

  levelLabel(level: string): string {
    const m: Record<string, string> = { CRITICAL: '위험', HIGH: '높음', MEDIUM: '보통', LOW: '낮음' };
    return m[level] ?? level;
  }
}
