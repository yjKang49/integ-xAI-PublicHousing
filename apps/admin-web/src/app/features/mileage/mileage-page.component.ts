// apps/admin-web/src/app/features/mileage/mileage-page.component.ts
// 클린하우스 마일리지 — 사업계획서 PAGE 7
// 입주민 자발적 시설 예방점검 참여 인센티브 제도 (골드/실버/브론즈/일반)

import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { inject } from '@angular/core';

type Grade = 'GOLD' | 'SILVER' | 'BRONZE' | 'GENERAL';

interface Resident {
  id: string;
  unit: string;           // 호수 (예: A동 101호)
  complex: string;
  points: number;
  grade: Grade;
  selfInspections: number;  // 자체 점검 횟수
  reportedDefects: number;  // AI 앱 결함 신고 건수
  incentive: number;        // 적용 할인액 (만원)
  lastActivity: string;     // 마지막 활동일
  joinedAt: string;
  trend: 'up' | 'down' | 'stable';
}

// ── 목 데이터 생성 ────────────────────────────────────────────────────
function makeResidents(): Resident[] {
  const complexes = [
    '강남 SH 매입임대', '마포 SH 영구임대', '노원 SH 국민임대',
    '강서 SH 행복주택', '서초 SH 매입임대', '구미 GBDC 영구임대', '안동 GBDC 국민임대',
  ];
  const grades: Grade[] = ['GOLD', 'GOLD', 'GOLD', 'SILVER', 'SILVER', 'SILVER', 'SILVER', 'BRONZE', 'BRONZE', 'BRONZE', 'GENERAL', 'GENERAL', 'GENERAL', 'GENERAL', 'GENERAL'];
  const trends: ('up' | 'down' | 'stable')[] = ['up', 'up', 'stable', 'stable', 'down', 'up', 'stable'];

  const rows: Resident[] = [];
  const dongs = ['A', 'B', 'C', 'D'];

  for (let i = 0; i < 50; i++) {
    const grade = grades[Math.floor(Math.random() * grades.length)];
    const points = grade === 'GOLD' ? 1000 + Math.floor(Math.random() * 800)
      : grade === 'SILVER' ? 500 + Math.floor(Math.random() * 499)
      : grade === 'BRONZE' ? 100 + Math.floor(Math.random() * 399)
      : Math.floor(Math.random() * 99);
    const selfInsp = Math.floor(points / 80) + Math.floor(Math.random() * 3);
    const defects = Math.floor(points / 200) + Math.floor(Math.random() * 2);
    const incentive = grade === 'GOLD' ? 20 : grade === 'SILVER' ? 10 : grade === 'BRONZE' ? 5 : 0;
    const dong = dongs[Math.floor(Math.random() * dongs.length)];
    const ho = `${100 + Math.floor(Math.random() * 400)}호`;

    rows.push({
      id: `RES-${String(i + 1).padStart(3, '0')}`,
      unit: `${dong}동 ${ho}`,
      complex: complexes[i % complexes.length],
      points,
      grade,
      selfInspections: selfInsp,
      reportedDefects: defects,
      incentive,
      lastActivity: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString().split('T')[0],
      joinedAt: new Date(Date.now() - (180 + Math.random() * 180) * 86400000).toISOString().split('T')[0],
      trend: trends[Math.floor(Math.random() * trends.length)],
    });
  }

  return rows.sort((a, b) => b.points - a.points);
}

const GRADE_CONFIG: Record<Grade, { label: string; color: string; bg: string; icon: string; minPts: number; benefit: string }> = {
  GOLD:    { label: '골드', color: '#f57f17', bg: '#fff9c4', icon: 'workspace_premium', minPts: 1000, benefit: '관리비 20만원 할인 + 우선 수리' },
  SILVER:  { label: '실버', color: '#546e7a', bg: '#eceff1', icon: 'military_tech', minPts: 500, benefit: '관리비 10만원 할인' },
  BRONZE:  { label: '브론즈', color: '#795548', bg: '#efebe9', icon: 'emoji_events', minPts: 100, benefit: '관리비 5만원 할인' },
  GENERAL: { label: '일반', color: '#9e9e9e', bg: '#fafafa', icon: 'person', minPts: 0, benefit: '기본 서비스' },
};

@Component({
  selector: 'ax-mileage-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatIconModule, MatButtonModule, MatTabsModule,
    MatDividerModule, MatTooltipModule, MatProgressBarModule,
    MatTableModule, MatSelectModule, MatFormFieldModule, MatSnackBarModule,
  ],
  template: `
    <!-- ── 페이지 헤더 ── -->
    <div class="ax-mileage-header">
      <div class="ax-mileage-header__left">
        <div class="ax-mileage-header__icon-wrap">
          <mat-icon class="mb-icon">workspace_premium</mat-icon>
        </div>
        <div>
          <h2 class="page-title">CleanHouse 마일리지</h2>
          <p class="page-subtitle">입주민 자발적 시설 예방점검 참여 인센티브 — AX-SPRINT RPA 100% 자동 지급</p>
        </div>
      </div>
      <div class="header-actions">
        <button mat-stroked-button (click)="grantAll()">
          <mat-icon>auto_awesome</mat-icon> RPA 일괄 지급
        </button>
      </div>
    </div>

    <!-- ── KPI 배너 ── -->
    <div class="kpi-row">
      <div class="ax-mileage-kpi ax-mileage-kpi--blue">
        <mat-icon class="ax-mileage-kpi__icon">people</mat-icon>
        <div class="kpi-num">{{ participatingCount() }}</div>
        <div class="kpi-label">참여 세대</div>
        <div class="kpi-sub">전체 2,847세대 중</div>
      </div>
      <div class="ax-mileage-kpi ax-mileage-kpi--gold">
        <mat-icon class="ax-mileage-kpi__icon">workspace_premium</mat-icon>
        <div class="kpi-num">{{ goldCount() }}</div>
        <div class="kpi-label">골드 등급</div>
        <div class="kpi-sub">1,000점 이상</div>
      </div>
      <div class="ax-mileage-kpi ax-mileage-kpi--green">
        <mat-icon class="ax-mileage-kpi__icon">trending_up</mat-icon>
        <div class="kpi-num">{{ avgPoints() | number:'1.0-0' }}</div>
        <div class="kpi-label">평균 마일리지</div>
        <div class="kpi-sub">참여 세대 기준</div>
      </div>
      <div class="ax-mileage-kpi ax-mileage-kpi--purple">
        <mat-icon class="ax-mileage-kpi__icon">savings</mat-icon>
        <div class="kpi-num">{{ totalIncentive() | number:'1.0-0' }}<span class="kpi-unit">만원</span></div>
        <div class="kpi-label">인센티브 지급 총액</div>
        <div class="kpi-sub">이번 분기</div>
      </div>
      <div class="ax-mileage-kpi ax-mileage-kpi--orange">
        <mat-icon class="ax-mileage-kpi__icon">find_in_page</mat-icon>
        <div class="kpi-num">{{ totalDefects() }}</div>
        <div class="kpi-label">입주민 결함 신고</div>
        <div class="kpi-sub">AI 앱 통한 선제 발견</div>
      </div>
    </div>

    <!-- ── 탭 ── -->
    <mat-tab-group animationDuration="200ms">

      <!-- TAB 1: 세대별 마일리지 현황 -->
      <mat-tab>
        <ng-template mat-tab-label>
          <mat-icon style="margin-right:6px">leaderboard</mat-icon>
          세대별 현황
        </ng-template>
        <div class="tab-content">
          <!-- 필터 -->
          <div class="filter-row">
            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>등급 필터</mat-label>
              <mat-select [(ngModel)]="gradeFilter" (ngModelChange)="applyFilter()">
                <mat-option value="">전체</mat-option>
                <mat-option value="GOLD">골드</mat-option>
                <mat-option value="SILVER">실버</mat-option>
                <mat-option value="BRONZE">브론즈</mat-option>
                <mat-option value="GENERAL">일반</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>단지 필터</mat-label>
              <mat-select [(ngModel)]="complexFilter" (ngModelChange)="applyFilter()">
                <mat-option value="">전체</mat-option>
                @for (c of complexList; track c) {
                  <mat-option [value]="c">{{ c }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>

          <!-- 테이블 -->
          <div class="table-wrap">
            <table mat-table [dataSource]="filteredResidents()" class="mileage-table">
              <!-- 순위 -->
              <ng-container matColumnDef="rank">
                <th mat-header-cell *matHeaderCellDef>순위</th>
                <td mat-cell *matCellDef="let row; let i = index">
                  @if (i < 3) {
                    <mat-icon [style.color]="['#f57f17','#546e7a','#795548'][i]">
                      {{ i === 0 ? 'emoji_events' : i === 1 ? 'military_tech' : 'workspace_premium' }}
                    </mat-icon>
                  } @else {
                    <span class="rank-num">{{ i + 1 }}</span>
                  }
                </td>
              </ng-container>

              <!-- 세대 -->
              <ng-container matColumnDef="unit">
                <th mat-header-cell *matHeaderCellDef>세대</th>
                <td mat-cell *matCellDef="let row">
                  <div class="unit-cell">
                    <span class="unit-text">{{ row.unit }}</span>
                    <span class="complex-text">{{ row.complex }}</span>
                  </div>
                </td>
              </ng-container>

              <!-- 등급 -->
              <ng-container matColumnDef="grade">
                <th mat-header-cell *matHeaderCellDef>등급</th>
                <td mat-cell *matCellDef="let row">
                  <span class="ax-mileage-grade-badge ax-mileage-grade-badge--{{ row.grade.toLowerCase() }}">
                    <mat-icon class="grade-icon">{{ gradeConfig(row.grade).icon }}</mat-icon>
                    {{ gradeConfig(row.grade).label }}
                  </span>
                </td>
              </ng-container>

              <!-- 마일리지 -->
              <ng-container matColumnDef="points">
                <th mat-header-cell *matHeaderCellDef>마일리지</th>
                <td mat-cell *matCellDef="let row">
                  <div class="points-cell">
                    <strong class="points-num">{{ row.points | number }}</strong>
                    <mat-icon class="trend-icon ax-mileage-trend ax-mileage-trend--{{ row.trend }}">
                      {{ row.trend === 'up' ? 'trending_up' : row.trend === 'down' ? 'trending_down' : 'trending_flat' }}
                    </mat-icon>
                  </div>
                  <!-- 다음 등급까지 진행 바 -->
                  <div class="grade-progress">
                    <mat-progress-bar mode="determinate" [value]="gradeProgress(row)" />
                    <span class="progress-label">{{ nextGradeLabel(row) }}</span>
                  </div>
                </td>
              </ng-container>

              <!-- 자체 점검 -->
              <ng-container matColumnDef="selfInspections">
                <th mat-header-cell *matHeaderCellDef>자체점검</th>
                <td mat-cell *matCellDef="let row">
                  <span class="insp-badge">{{ row.selfInspections }}회</span>
                </td>
              </ng-container>

              <!-- 결함 신고 -->
              <ng-container matColumnDef="reportedDefects">
                <th mat-header-cell *matHeaderCellDef>결함 신고</th>
                <td mat-cell *matCellDef="let row">
                  @if (row.reportedDefects > 0) {
                    <span class="defect-badge">{{ row.reportedDefects }}건</span>
                  } @else {
                    <span style="color:#ccc">-</span>
                  }
                </td>
              </ng-container>

              <!-- 인센티브 -->
              <ng-container matColumnDef="incentive">
                <th mat-header-cell *matHeaderCellDef>인센티브</th>
                <td mat-cell *matCellDef="let row">
                  @if (row.incentive > 0) {
                    <span class="incentive-badge">
                      <mat-icon class="inc-icon">savings</mat-icon>
                      {{ row.incentive }}만원
                    </span>
                  } @else {
                    <span style="color:#ccc">-</span>
                  }
                </td>
              </ng-container>

              <!-- 최근 활동 -->
              <ng-container matColumnDef="lastActivity">
                <th mat-header-cell *matHeaderCellDef>최근 활동</th>
                <td mat-cell *matCellDef="let row">
                  <span style="font-size:12px;color:#888">{{ row.lastActivity }}</span>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="table-row"></tr>
            </table>
          </div>
        </div>
      </mat-tab>

      <!-- TAB 2: 등급 체계 & 혜택 -->
      <mat-tab>
        <ng-template mat-tab-label>
          <mat-icon style="margin-right:6px">stars</mat-icon>
          등급 체계
        </ng-template>
        <div class="tab-content">
          <div class="grade-grid">
            @for (grade of grades; track grade.key) {
              <div class="ax-mileage-grade-card ax-mileage-grade-card--{{ grade.key.toLowerCase() }}">
                <div class="grade-card-body">
                  <div class="grade-header">
                    <mat-icon class="grade-big-icon ax-mileage-grade-card__icon ax-mileage-grade-card__icon--{{ grade.key.toLowerCase() }}">{{ grade.icon }}</mat-icon>
                    <span class="grade-name ax-mileage-grade-card__name ax-mileage-grade-card__name--{{ grade.key.toLowerCase() }}">{{ grade.label }}</span>
                  </div>
                  <div class="grade-pts">{{ grade.pts }}</div>
                  <mat-divider class="grade-divider" />
                  <div class="grade-benefit">
                    <mat-icon class="benefit-icon" style="color:#2e7d32">check_circle</mat-icon>
                    {{ grade.benefit }}
                  </div>
                  <div class="grade-count">
                    <strong>{{ countByGrade(grade.key) }}</strong>세대 해당
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- 마일리지 적립 방법 -->
          <div class="ax-mileage-panel earn-card">
            <div class="ax-mileage-panel__hdr">
              <mat-icon class="ax-mileage-panel__hdr-icon" style="color:#1976d2">add_circle</mat-icon>
              <div>
                <div class="ax-mileage-panel__hdr-title">마일리지 적립 방법</div>
                <div class="ax-mileage-panel__hdr-sub">AX 입주민 앱 연동 자동 적립</div>
              </div>
            </div>
            <div class="ax-mileage-panel__body">
              <div class="earn-grid">
                @for (item of earnItems; track item.label) {
                  <div class="earn-item">
                    <div class="earn-pts-circle" [style.background]="item.color + '20'" [style.color]="item.color">
                      +{{ item.pts }}
                    </div>
                    <mat-icon [style.color]="item.color">{{ item.icon }}</mat-icon>
                    <div class="earn-info">
                      <span class="earn-label">{{ item.label }}</span>
                      <span class="earn-sub">{{ item.sub }}</span>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      </mat-tab>

      <!-- TAB 3: AI 연계 효과 -->
      <mat-tab>
        <ng-template mat-tab-label>
          <mat-icon style="margin-right:6px">smart_toy</mat-icon>
          AI 연계 효과
        </ng-template>
        <div class="tab-content">
          <div class="ai-link-banner">
            <mat-icon class="aib-icon">psychology</mat-icon>
            <div>
              <h3 class="aib-title">입주민 데이터 + AI = 더 빠른 이상탐지</h3>
              <p class="aib-desc">클린하우스 마일리지는 단순 인센티브가 아닙니다. 입주민이 앱으로 신고한 결함 사진이 Y-MaskNet의 학습 데이터로 활용되어, 시간이 지날수록 AI 탐지 정확도가 향상됩니다.</p>
            </div>
          </div>

          <div class="effect-grid">
            @for (e of aiEffects; track e.title) {
              <div class="ax-mileage-panel effect-card">
                <div class="ax-mileage-panel__body">
                  <mat-icon [style.color]="e.color" class="effect-icon">{{ e.icon }}</mat-icon>
                  <div class="effect-title">{{ e.title }}</div>
                  <div class="effect-before-after">
                    <div class="eff-before">
                      <span class="eff-label">도입 전</span>
                      <span class="eff-val eff-red">{{ e.before }}</span>
                    </div>
                    <mat-icon style="color:#1976d2">arrow_forward</mat-icon>
                    <div class="eff-after">
                      <span class="eff-label">도입 후</span>
                      <span class="eff-val eff-green">{{ e.after }}</span>
                    </div>
                  </div>
                  <div class="eff-bar">
                    <div class="eff-bar-fill" [style.width.%]="e.pct" [style.background]="e.color"></div>
                  </div>
                  <div class="eff-desc">{{ e.desc }}</div>
                </div>
              </div>
            }
          </div>

          <!-- RPA 자동 지급 흐름 -->
          <div class="ax-mileage-panel rpa-flow-card">
            <div class="ax-mileage-panel__hdr">
              <mat-icon class="ax-mileage-panel__hdr-icon" style="color:#7b1fa2">smart_toy</mat-icon>
              <div>
                <div class="ax-mileage-panel__hdr-title">RPA 마일리지 자동 지급 흐름</div>
                <div class="ax-mileage-panel__hdr-sub">100% 자동화 — 담당자 개입 없음</div>
              </div>
            </div>
            <div class="ax-mileage-panel__body">
              <div class="flow-steps">
                @for (step of rpaSteps; track step.num) {
                  <div class="flow-step">
                    <div class="step-num" [style.background]="step.color">{{ step.num }}</div>
                    <mat-icon [style.color]="step.color">{{ step.icon }}</mat-icon>
                    <div class="step-text">
                      <span class="step-title">{{ step.title }}</span>
                      <span class="step-desc">{{ step.desc }}</span>
                    </div>
                  </div>
                  @if ($index < rpaSteps.length - 1) {
                    <mat-icon class="step-arrow">arrow_forward</mat-icon>
                  }
                }
              </div>
            </div>
          </div>
        </div>
      </mat-tab>

    </mat-tab-group>
  `,
  styles: [`
    /* ── 헤더 ── */
    .ax-mileage-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: var(--ax-spacing-6, 24px);
    }
    .ax-mileage-header__left { display: flex; align-items: center; gap: var(--ax-spacing-4, 16px); }
    .ax-mileage-header__icon-wrap {
      width: 48px; height: 48px; border-radius: var(--ax-radius-md, 12px);
      background: linear-gradient(135deg, #f57f17, #ffcc02);
      display: flex; align-items: center; justify-content: center;
    }
    .mb-icon { font-size: 28px; width: 28px; height: 28px; color: white; }
    .page-title { margin: 0; font-size: var(--ax-font-size-xl, 22px); font-weight: var(--ax-font-weight-bold, 700); color: var(--ax-color-text-primary); }
    .page-subtitle { margin: 4px 0 0; font-size: var(--ax-font-size-xs, 12px); color: var(--ax-color-text-tertiary, #888); }
    .header-actions { display: flex; gap: var(--ax-spacing-2, 8px); }

    /* ── KPI 행 ── */
    .kpi-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: var(--ax-spacing-3, 12px); margin-bottom: var(--ax-spacing-6, 24px); }
    .ax-mileage-kpi {
      display: flex; flex-direction: column; align-items: center;
      padding: var(--ax-spacing-4, 16px) var(--ax-spacing-3, 12px);
      text-align: center; border-radius: var(--ax-radius-md, 8px);
    }
    .ax-mileage-kpi--blue   { background: var(--ax-color-info-subtle, #e3f2fd); }
    .ax-mileage-kpi--gold   { background: #fff9c4; }
    .ax-mileage-kpi--green  { background: var(--ax-color-success-subtle, #e8f5e9); }
    .ax-mileage-kpi--purple { background: #f3e5f5; }
    .ax-mileage-kpi--orange { background: var(--ax-color-warning-subtle, #fff3e0); }
    .ax-mileage-kpi__icon { font-size: 28px; width: 28px; height: 28px; margin-bottom: var(--ax-spacing-2, 8px); }
    .ax-mileage-kpi--blue   .ax-mileage-kpi__icon { color: #1565c0; }
    .ax-mileage-kpi--gold   .ax-mileage-kpi__icon { color: #f57f17; }
    .ax-mileage-kpi--green  .ax-mileage-kpi__icon { color: #2e7d32; }
    .ax-mileage-kpi--purple .ax-mileage-kpi__icon { color: #7b1fa2; }
    .ax-mileage-kpi--orange .ax-mileage-kpi__icon { color: #e65100; }
    .kpi-num { font-size: var(--ax-font-size-3xl, 28px); font-weight: var(--ax-font-weight-extrabold, 800); line-height: 1; color: var(--ax-color-text-primary); }
    .kpi-unit { font-size: var(--ax-font-size-sm, 14px); font-weight: var(--ax-font-weight-normal, 400); }
    .kpi-label { font-size: var(--ax-font-size-2xs, 11px); font-weight: var(--ax-font-weight-semibold, 600); color: var(--ax-color-text-secondary, #555); margin-top: var(--ax-spacing-1, 4px); }
    .kpi-sub { font-size: var(--ax-font-size-3xs, 10px); color: var(--ax-color-text-tertiary, #999); }

    /* ── 탭 ── */
    .tab-content { padding: var(--ax-spacing-5, 20px) 0; }

    /* ── 필터 ── */
    .filter-row { display: flex; gap: var(--ax-spacing-3, 12px); margin-bottom: var(--ax-spacing-4, 16px); }
    .filter-field { min-width: 160px; }

    /* ── 테이블 ── */
    .table-wrap { overflow-x: auto; border-radius: var(--ax-radius-md, 8px); box-shadow: 0 1px 4px rgba(0,0,0,.08); }
    .mileage-table { width: 100%; }
    .table-row:hover { background: #f5f7ff; }
    .rank-num { font-size: var(--ax-font-size-sm, 13px); font-weight: var(--ax-font-weight-semibold, 600); color: var(--ax-color-text-secondary, #666); }
    .unit-cell { display: flex; flex-direction: column; }
    .unit-text { font-size: var(--ax-font-size-sm, 13px); font-weight: var(--ax-font-weight-semibold, 600); }
    .complex-text { font-size: var(--ax-font-size-3xs, 10px); color: var(--ax-color-text-tertiary, #999); }

    /* ── Grade badge ── */
    .ax-mileage-grade-badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 10px; border-radius: var(--ax-radius-full, 12px);
      font-size: var(--ax-font-size-2xs, 11px); font-weight: var(--ax-font-weight-bold, 700);
    }
    .ax-mileage-grade-badge--gold    { background: #fff9c4; color: #f57f17; }
    .ax-mileage-grade-badge--silver  { background: #eceff1; color: #546e7a; }
    .ax-mileage-grade-badge--bronze  { background: #efebe9; color: #795548; }
    .ax-mileage-grade-badge--general { background: var(--ax-color-bg-surface-alt); color: var(--ax-color-text-tertiary); }
    .grade-icon { font-size: 14px; width: 14px; height: 14px; }

    .points-cell { display: flex; align-items: center; gap: 4px; }
    .points-num { font-size: var(--ax-font-size-sm, 14px); font-weight: var(--ax-font-weight-bold, 700); }

    /* ── Trend icon ── */
    .ax-mileage-trend { font-size: 16px; width: 16px; height: 16px; }
    .ax-mileage-trend--up     { color: var(--ax-color-success); }
    .ax-mileage-trend--down   { color: var(--ax-color-danger); }
    .ax-mileage-trend--stable { color: var(--ax-color-text-tertiary); }

    .grade-progress { margin-top: 4px; display: flex; align-items: center; gap: 6px; }
    .grade-progress mat-progress-bar { flex: 1; }
    .progress-label { font-size: var(--ax-font-size-3xs, 9px); color: var(--ax-color-text-tertiary, #aaa); white-space: nowrap; }
    .insp-badge { background: #e3f2fd; color: #1565c0; padding: 2px 8px; border-radius: var(--ax-radius-sm, 8px); font-size: var(--ax-font-size-2xs, 11px); font-weight: var(--ax-font-weight-semibold, 600); }
    .defect-badge { background: #fff3e0; color: #e65100; padding: 2px 8px; border-radius: var(--ax-radius-sm, 8px); font-size: var(--ax-font-size-2xs, 11px); font-weight: var(--ax-font-weight-semibold, 600); }
    .incentive-badge { display: flex; align-items: center; gap: 2px; background: #e8f5e9; color: #2e7d32; padding: 2px 8px; border-radius: var(--ax-radius-sm, 8px); font-size: var(--ax-font-size-2xs, 11px); font-weight: var(--ax-font-weight-semibold, 600); }
    .inc-icon { font-size: 12px; width: 12px; height: 12px; }

    /* ── 등급 그리드 ── */
    .grade-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--ax-spacing-4, 16px); margin-bottom: var(--ax-spacing-5, 20px); }
    .ax-mileage-grade-card {
      background: var(--ax-color-bg-surface, #fff);
      border-radius: var(--ax-radius-md, 8px);
      box-shadow: 0 1px 4px rgba(0,0,0,.08);
      overflow: hidden;
    }
    .ax-mileage-grade-card--gold    { border-top: 4px solid #f57f17; }
    .ax-mileage-grade-card--silver  { border-top: 4px solid #546e7a; }
    .ax-mileage-grade-card--bronze  { border-top: 4px solid #795548; }
    .ax-mileage-grade-card--general { border-top: 4px solid var(--ax-color-text-tertiary); }
    .grade-card-body { padding: var(--ax-spacing-5, 20px); }
    .grade-header { display: flex; align-items: center; gap: var(--ax-spacing-2, 8px); margin-bottom: var(--ax-spacing-2, 8px); }
    .grade-big-icon { font-size: 32px; width: 32px; height: 32px; }
    .ax-mileage-grade-card__icon--gold    { color: #f57f17; }
    .ax-mileage-grade-card__icon--silver  { color: #546e7a; }
    .ax-mileage-grade-card__icon--bronze  { color: #795548; }
    .ax-mileage-grade-card__icon--general { color: var(--ax-color-text-tertiary); }
    .grade-name { font-size: var(--ax-font-size-lg, 18px); font-weight: var(--ax-font-weight-bold, 700); }
    .ax-mileage-grade-card__name--gold    { color: #f57f17; }
    .ax-mileage-grade-card__name--silver  { color: #546e7a; }
    .ax-mileage-grade-card__name--bronze  { color: #795548; }
    .ax-mileage-grade-card__name--general { color: var(--ax-color-text-tertiary); }
    .grade-pts { font-size: var(--ax-font-size-xs, 12px); color: var(--ax-color-text-tertiary, #888); margin-bottom: var(--ax-spacing-2, 8px); }
    .grade-divider { margin: var(--ax-spacing-2, 8px) 0; }
    .grade-benefit { display: flex; align-items: flex-start; gap: 4px; font-size: var(--ax-font-size-xs, 12px); margin-bottom: var(--ax-spacing-2, 8px); }
    .benefit-icon { font-size: 14px; width: 14px; height: 14px; flex-shrink: 0; margin-top: 1px; }
    .grade-count { font-size: var(--ax-font-size-xs, 12px); color: var(--ax-color-text-secondary, #666); }
    .grade-count strong { font-size: var(--ax-font-size-lg, 18px); color: #1a237e; }

    /* ── Panel pattern ── */
    .ax-mileage-panel {
      background: var(--ax-color-bg-surface, #fff);
      border: 1px solid var(--ax-color-border-subtle);
      border-radius: var(--ax-radius-md, 8px);
      box-shadow: 0 1px 4px rgba(0,0,0,.08);
      overflow: hidden;
    }
    .ax-mileage-panel__hdr {
      display: flex; align-items: center; gap: var(--ax-spacing-3, 12px);
      padding: var(--ax-spacing-4, 16px) var(--ax-spacing-4, 16px) var(--ax-spacing-3, 12px);
      border-bottom: 1px solid var(--ax-color-border-subtle);
    }
    .ax-mileage-panel__hdr-icon { font-size: 28px; width: 28px; height: 28px; flex-shrink: 0; }
    .ax-mileage-panel__hdr-title { font-size: var(--ax-font-size-base, 16px); font-weight: var(--ax-font-weight-semibold, 600); color: var(--ax-color-text-primary); }
    .ax-mileage-panel__hdr-sub { font-size: var(--ax-font-size-xs, 12px); color: var(--ax-color-text-secondary); }
    .ax-mileage-panel__body { padding: var(--ax-spacing-4, 16px); }

    /* ── 적립 방법 ── */
    .earn-card { margin-top: var(--ax-spacing-4, 16px); }
    .earn-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--ax-spacing-3, 12px); padding: var(--ax-spacing-2, 8px) 0; }
    .earn-item { display: flex; align-items: center; gap: var(--ax-spacing-2-5, 10px); padding: var(--ax-spacing-2-5, 10px); background: var(--ax-color-bg-surface-alt, #fafafa); border-radius: var(--ax-radius-md, 8px); }
    .earn-pts-circle {
      min-width: 40px; height: 40px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: var(--ax-font-size-sm, 13px); font-weight: var(--ax-font-weight-extrabold, 800); flex-shrink: 0;
    }
    .earn-info { display: flex; flex-direction: column; }
    .earn-label { font-size: var(--ax-font-size-xs, 12px); font-weight: var(--ax-font-weight-semibold, 600); }
    .earn-sub { font-size: var(--ax-font-size-3xs, 10px); color: var(--ax-color-text-tertiary, #999); }

    /* ── AI 효과 ── */
    .ai-link-banner {
      display: flex; align-items: flex-start; gap: var(--ax-spacing-4, 16px);
      background: linear-gradient(135deg, #e3f2fd, #f3e5f5);
      border-radius: var(--ax-radius-lg, 12px); padding: var(--ax-spacing-5, 20px); margin-bottom: var(--ax-spacing-5, 20px);
    }
    .aib-icon { font-size: 40px; width: 40px; height: 40px; color: #7b1fa2; }
    .aib-title { margin: 0 0 8px; font-size: var(--ax-font-size-base, 16px); font-weight: var(--ax-font-weight-bold, 700); color: var(--ax-color-text-primary); }
    .aib-desc { margin: 0; font-size: var(--ax-font-size-sm, 13px); color: var(--ax-color-text-secondary, #555); line-height: 1.6; }
    .effect-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--ax-spacing-3, 12px); margin-bottom: var(--ax-spacing-5, 20px); }
    .effect-card .ax-mileage-panel__body { padding: var(--ax-spacing-4, 16px); }
    .effect-icon { font-size: 28px; width: 28px; height: 28px; margin-bottom: 6px; display: block; }
    .effect-title { font-size: var(--ax-font-size-sm, 13px); font-weight: var(--ax-font-weight-semibold, 600); margin-bottom: 10px; }
    .effect-before-after { display: flex; align-items: center; gap: var(--ax-spacing-2, 8px); margin-bottom: var(--ax-spacing-2, 8px); }
    .eff-before, .eff-after { display: flex; flex-direction: column; align-items: center; flex: 1; }
    .eff-label { font-size: var(--ax-font-size-3xs, 9px); color: var(--ax-color-text-tertiary, #999); }
    .eff-val { font-size: var(--ax-font-size-base, 16px); font-weight: var(--ax-font-weight-bold, 700); }
    .eff-red { color: var(--ax-color-danger, #c62828); }
    .eff-green { color: var(--ax-color-success, #2e7d32); }
    .eff-bar { height: 6px; background: var(--ax-color-border-subtle, #eee); border-radius: 3px; overflow: hidden; margin-bottom: 6px; }
    .eff-bar-fill { height: 100%; border-radius: 3px; }
    .eff-desc { font-size: var(--ax-font-size-2xs, 11px); color: var(--ax-color-text-tertiary, #888); }

    /* ── RPA 흐름 ── */
    .rpa-flow-card { margin-top: var(--ax-spacing-2, 8px); }
    .flow-steps { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; padding: var(--ax-spacing-3, 12px) 0; }
    .flow-step { display: flex; align-items: center; gap: var(--ax-spacing-2, 8px); background: var(--ax-color-bg-surface-alt, #f8f9ff); border-radius: var(--ax-radius-md, 8px); padding: 10px 14px; }
    .step-num {
      width: 24px; height: 24px; border-radius: 50%; color: white;
      font-size: var(--ax-font-size-xs, 12px); font-weight: var(--ax-font-weight-bold, 700);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .step-text { display: flex; flex-direction: column; }
    .step-title { font-size: var(--ax-font-size-xs, 12px); font-weight: var(--ax-font-weight-semibold, 600); }
    .step-desc { font-size: var(--ax-font-size-3xs, 10px); color: var(--ax-color-text-tertiary, #888); }
    .step-arrow { color: var(--ax-color-border, #ccc); font-size: 20px; width: 20px; height: 20px; }
  `],
})
export class MileagePageComponent implements OnInit {
  private readonly snackBar = inject(MatSnackBar);

  readonly residents = signal<Resident[]>([]);
  readonly filteredResidents = signal<Resident[]>([]);

  gradeFilter = '';
  complexFilter = '';

  readonly displayedColumns = ['rank', 'unit', 'grade', 'points', 'selfInspections', 'reportedDefects', 'incentive', 'lastActivity'];

  readonly complexList = [
    '강남 SH 매입임대', '마포 SH 영구임대', '노원 SH 국민임대',
    '강서 SH 행복주택', '서초 SH 매입임대', '구미 GBDC 영구임대', '안동 GBDC 국민임대',
  ];

  readonly grades = [
    { key: 'GOLD' as Grade, label: '골드', color: '#f57f17', icon: 'workspace_premium', pts: '1,000점 이상', benefit: '관리비 20만원 할인 + 우선 수리' },
    { key: 'SILVER' as Grade, label: '실버', color: '#546e7a', icon: 'military_tech', pts: '500~999점', benefit: '관리비 10만원 할인' },
    { key: 'BRONZE' as Grade, label: '브론즈', color: '#795548', icon: 'emoji_events', pts: '100~499점', benefit: '관리비 5만원 할인' },
    { key: 'GENERAL' as Grade, label: '일반', color: '#9e9e9e', icon: 'person', pts: '100점 미만', benefit: '기본 서비스' },
  ];

  readonly earnItems = [
    { icon: 'photo_camera', color: '#1976d2', label: 'AI 앱 결함 신고', sub: '사진 업로드 + Y-MaskNet 검증', pts: 50 },
    { icon: 'assignment_turned_in', color: '#2e7d32', label: '자체 점검 완료', sub: '입주민 직접 점검 체크리스트', pts: 30 },
    { icon: 'qr_code_scanner', color: '#7b1fa2', label: 'QR 점검 인증', sub: '공용시설 QR 스캔 확인', pts: 20 },
    { icon: 'rate_review', label: '정기 설문 참여', sub: '월 1회 시설 만족도 조사', pts: 10, color: '#e65100' },
    { icon: 'clean_hands', label: '클린데이 참여', sub: '단지 공동 청소 활동', pts: 40, color: '#0277bd' },
    { icon: 'energy_savings_leaf', label: '에너지 절약 인증', sub: '목표 대비 10% 절감 시', pts: 60, color: '#2e7d32' },
  ];

  readonly aiEffects = [
    { icon: 'find_in_page', color: '#1976d2', title: '선제 결함 발견율',
      before: '연 12건', after: '연 47건', pct: 79, desc: '입주민 앱 신고 → AI 즉시 분류 → 담당자 배정' },
    { icon: 'schedule', color: '#e65100', title: '결함 발견 → 조치 시간',
      before: '평균 14일', after: '평균 3.2일', pct: 77, desc: '마일리지 보상으로 신고율 +291%' },
    { icon: 'precision_manufacturing', color: '#7b1fa2', title: 'Y-MaskNet 학습 데이터',
      before: '3,200장', after: '8,700장', pct: 63, desc: '입주민 신고 사진이 재학습 데이터로 활용' },
  ];

  readonly rpaSteps = [
    { num: 1, icon: 'smartphone', color: '#1976d2', title: '앱 활동 감지', desc: '입주민 앱 사용 이벤트 수신' },
    { num: 2, icon: 'psychology', color: '#7b1fa2', title: 'AI 검증', desc: 'Y-MaskNet 신고 내용 진위 확인' },
    { num: 3, icon: 'add_circle', color: '#2e7d32', title: '마일리지 적립', desc: 'RPA 자동 점수 계산·지급' },
    { num: 4, icon: 'workspace_premium', color: '#f57f17', title: '등급 갱신', desc: '누적 점수 기준 자동 등급 변경' },
    { num: 5, icon: 'savings', color: '#e65100', title: '인센티브 적용', desc: '다음 달 관리비 자동 차감' },
  ];

  // ── computed ──────────────────────────────────────────────────────
  readonly participatingCount = computed(() => this.residents().length);
  readonly goldCount = computed(() => this.residents().filter(r => r.grade === 'GOLD').length);
  readonly avgPoints = computed(() => {
    const rs = this.residents();
    return rs.length ? rs.reduce((s, r) => s + r.points, 0) / rs.length : 0;
  });
  readonly totalIncentive = computed(() => this.residents().reduce((s, r) => s + r.incentive, 0));
  readonly totalDefects = computed(() => this.residents().reduce((s, r) => s + r.reportedDefects, 0));

  ngOnInit() {
    const data = makeResidents();
    this.residents.set(data);
    this.filteredResidents.set(data);
  }

  applyFilter() {
    this.filteredResidents.set(
      this.residents().filter(r => {
        const gradeOk = !this.gradeFilter || r.grade === this.gradeFilter;
        const complexOk = !this.complexFilter || r.complex === this.complexFilter;
        return gradeOk && complexOk;
      })
    );
  }

  gradeConfig(g: Grade) { return GRADE_CONFIG[g]; }

  countByGrade(g: string) { return this.residents().filter(r => r.grade === g).length; }

  gradeProgress(r: Resident): number {
    const nextMin = r.grade === 'GOLD' ? 2000 : r.grade === 'SILVER' ? 1000 : r.grade === 'BRONZE' ? 500 : 100;
    const curMin = GRADE_CONFIG[r.grade].minPts;
    if (r.grade === 'GOLD') return Math.min(100, (r.points / 2000) * 100);
    return Math.min(100, ((r.points - curMin) / (nextMin - curMin)) * 100);
  }

  nextGradeLabel(r: Resident): string {
    if (r.grade === 'GOLD') return '최고 등급';
    const next = r.grade === 'SILVER' ? 1000 : r.grade === 'BRONZE' ? 500 : 100;
    const diff = next - r.points;
    return diff > 0 ? `+${diff}점 → 업그레이드` : '승급 가능';
  }

  grantAll() {
    this.snackBar.open('RPA 마일리지 일괄 지급 작업이 큐에 등록되었습니다.', '닫기', { duration: 3000 });
  }
}
