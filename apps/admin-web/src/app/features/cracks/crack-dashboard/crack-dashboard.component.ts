import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginatorModule } from '@angular/material/paginator';
import { CrackGaugePoint } from '@ax/shared';
import { environment } from '../../../../environments/environment';
import {
  PageHeaderComponent,
  StatusBadgeComponent,
  EmptyStateComponent,
  SkeletonComponent,
  BadgeVariant,
} from '../../../shared/components';
import { CrackTrendChartComponent, CrackDataPoint } from '../../../shared/components/crack-trend-chart/crack-trend-chart.component';
import { Building3dViewerComponent, DefectMarker3D } from '../../../shared/components/building-3d-viewer/building-3d-viewer.component';

@Component({
  selector: 'ax-crack-dashboard',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatTableModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatFormFieldModule, MatInputModule,
    MatTooltipModule, MatSnackBarModule, MatPaginatorModule,
    PageHeaderComponent, StatusBadgeComponent, EmptyStateComponent, SkeletonComponent,
    CrackTrendChartComponent, Building3dViewerComponent,
  ],
  template: `
    <ax-page-header
      title="균열 모니터링"
      description="균열 게이지 포인트 현황 및 임계치 초과 알림 관리"
      icon="sensors">
      <div ax-page-actions>
        @if (exceededCount() > 0) {
          <div class="exceeded-alert">
            <mat-icon>warning</mat-icon>
            <span>임계치 초과 {{ exceededCount() }}개소</span>
          </div>
        }
      </div>
    </ax-page-header>

    <!-- KPI strip -->
    <div class="ax-crack-kpi">
      <div class="crack-kpi-card" style="--kpi-color: var(--ax-color-danger)">
        <mat-icon class="crack-kpi-card__icon">dangerous</mat-icon>
        <span class="crack-kpi-card__value">{{ exceededCount() }}</span>
        <span class="crack-kpi-card__label">임계치 초과</span>
      </div>
      <div class="crack-kpi-card" style="--kpi-color: var(--ax-color-warning)">
        <mat-icon class="crack-kpi-card__icon">warning</mat-icon>
        <span class="crack-kpi-card__value">{{ warningCount() }}</span>
        <span class="crack-kpi-card__label">경고 수준 (80%)</span>
      </div>
      <div class="crack-kpi-card" style="--kpi-color: var(--ax-color-success)">
        <mat-icon class="crack-kpi-card__icon">check_circle</mat-icon>
        <span class="crack-kpi-card__value">{{ normalCount() }}</span>
        <span class="crack-kpi-card__label">정상</span>
      </div>
      <div class="crack-kpi-card" style="--kpi-color: var(--ax-color-text-secondary)">
        <mat-icon class="crack-kpi-card__icon">sensors</mat-icon>
        <span class="crack-kpi-card__value">{{ gaugePoints().length }}</span>
        <span class="crack-kpi-card__label">전체 포인트</span>
      </div>
    </div>

    <!-- Filter bar -->
    <div class="ax-filter-bar">
      <div class="ax-filter-bar__search">
        <mat-form-field appearance="outline" class="ax-filter-bar__search-field">
          <mat-label>검색</mat-label>
          <input matInput [(ngModel)]="searchText" (input)="applyFilter()" placeholder="명칭, 위치" />
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
      </div>

      <div class="ax-filter-bar__filters">
        <mat-form-field appearance="outline" class="ax-filter-bar__field">
          <mat-label>위험 상태</mat-label>
          <mat-select [(ngModel)]="filterRisk" (ngModelChange)="applyFilter()">
            <mat-option value="">전체</mat-option>
            <mat-option value="exceeded">임계치 초과</mat-option>
            <mat-option value="warning">경고 수준</mat-option>
            <mat-option value="normal">정상</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="ax-filter-bar__field">
          <mat-label>활성 상태</mat-label>
          <mat-select [(ngModel)]="filterActive" (ngModelChange)="applyFilter()">
            <mat-option value="">전체</mat-option>
            <mat-option value="true">활성</mat-option>
            <mat-option value="false">비활성</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <div class="ax-filter-bar__actions">
        <button mat-stroked-button (click)="resetFilters()">
          <mat-icon>clear</mat-icon> 초기화
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="ax-table-container">
      @if (loading()) {
        <ax-skeleton type="table" />
      } @else {
        <table mat-table [dataSource]="filtered()" class="ax-crack-table">

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>상태</th>
            <td mat-cell *matCellDef="let g">
              <ax-status-badge [variant]="getRiskVariant(g)" [label]="getRiskLabel(g)" />
            </td>
          </ng-container>

          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>포인트 명칭</th>
            <td mat-cell *matCellDef="let g">
              <a [routerLink]="['gauge', g._id]" class="gauge-link">{{ g.name }}</a>
              @if (g.description) {
                <div class="gauge-desc ax-text-meta">{{ g.description | slice:0:40 }}</div>
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="location">
            <th mat-header-cell *matHeaderCellDef>위치</th>
            <td mat-cell *matCellDef="let g" class="ax-text-body">{{ g.location }}</td>
          </ng-container>

          <ng-container matColumnDef="baseline">
            <th mat-header-cell *matHeaderCellDef>기준 폭</th>
            <td mat-cell *matCellDef="let g">
              <span class="measure-val">{{ g.baselineWidthMm }} mm</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="threshold">
            <th mat-header-cell *matHeaderCellDef>경보 임계치</th>
            <td mat-cell *matCellDef="let g">
              <span class="threshold-val">{{ g.thresholdMm }} mm</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="installDate">
            <th mat-header-cell *matHeaderCellDef>설치일</th>
            <td mat-cell *matCellDef="let g" class="ax-text-meta">{{ g.installDate | date:'yyyy-MM-dd' }}</td>
          </ng-container>

          <ng-container matColumnDef="active">
            <th mat-header-cell *matHeaderCellDef>활성</th>
            <td mat-cell *matCellDef="let g">
              <ax-status-badge
                [variant]="g.isActive ? 'success' : 'neutral'"
                [label]="g.isActive ? '활성' : '비활성'" />
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let g">
              <button mat-icon-button [routerLink]="['gauge', g._id]" matTooltip="이력 조회">
                <mat-icon>show_chart</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let g; columns: columns;"
            class="ax-table-row"
            [class.ax-table-row--exceeded]="isExceeded(g)"></tr>
        </table>

        @if (filtered().length === 0) {
          <ax-empty-state
            type="search-no-result"
            title="조건에 맞는 게이지 포인트가 없습니다"
            description="필터를 변경하거나 초기화 후 다시 확인해 주세요."
            (primaryAction)="resetFilters()" />
        }
      }

      <mat-paginator [length]="filtered().length" [pageSize]="20"
        [pageSizeOptions]="[10, 20, 50]" showFirstLastButtons />
    </div>

    <!-- ── 시각화 패널 ── -->
    <div class="ax-viz-grid">
      <div class="ax-viz-panel">
        <div class="ax-viz-panel__title">
          <mat-icon>show_chart</mat-icon> 균열 폭 추이 (GP-B2-C3-N)
        </div>
        <ax-crack-trend-chart [data]="sampleTrendData" [thresholdMm]="1.0" [criticalMm]="2.0" />
      </div>
      <div class="ax-viz-panel">
        <div class="ax-viz-panel__title">
          <mat-icon>view_in_ar</mat-icon> 3D 건물 결함 현황
        </div>
        <ax-building-3d-viewer [markers]="building3dMarkers" [floors]="12" />
      </div>
    </div>
  `,
  styles: [`
    /* Alert badge in header actions */
    .exceeded-alert {
      display: flex;
      align-items: center;
      gap: var(--ax-space-2);
      background: var(--ax-color-danger-subtle);
      color: var(--ax-color-danger);
      padding: var(--ax-space-2) var(--ax-space-4);
      border-radius: var(--ax-radius-pill);
      font-weight: 600;
      font-size: var(--ax-font-size-sm);

      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }

    /* KPI strip */
    .ax-crack-kpi {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--ax-space-3);
      margin-bottom: var(--ax-space-4);
    }

    .crack-kpi-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--ax-space-1);
      padding: var(--ax-space-5) var(--ax-space-3);
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border);
      border-top: 4px solid var(--kpi-color, var(--ax-color-border));
      border-radius: var(--ax-radius-card);
      text-align: center;
    }

    .crack-kpi-card__icon {
      color: var(--kpi-color, var(--ax-color-text-secondary));
      font-size: 22px;
    }
    .crack-kpi-card__value {
      font-size: var(--ax-font-size-kpi);
      font-weight: 700;
      color: var(--ax-color-text-primary);
      line-height: 1;
    }
    .crack-kpi-card__label {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-secondary);
      font-weight: 500;
    }

    /* Filter bar */
    .ax-filter-bar__field { min-width: 140px; }
    .ax-filter-bar__search-field { min-width: 200px; }

    /* Visualization panels */
    .ax-viz-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 24px;
    }
    @media (max-width: 900px) {
      .ax-viz-grid { grid-template-columns: 1fr; }
    }
    .ax-viz-panel {
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border);
      border-radius: var(--ax-radius-lg);
      padding: 16px;
    }
    .ax-viz-panel__title {
      display: flex; align-items: center; gap: 6px;
      font-size: 13px; font-weight: 600;
      color: var(--ax-color-text-primary);
      margin-bottom: 12px;
      mat-icon { font-size: 16px; color: var(--ax-color-brand-primary); }
    }

    /* Table */
    .ax-crack-table { width: 100%; }

    .ax-table-row {
      transition: background 0.12s;
      &:hover { background: var(--ax-color-bg-surface-alt); }
      &--exceeded { background: rgba(220, 38, 38, 0.04); }
      &--exceeded:hover { background: rgba(220, 38, 38, 0.08); }
    }

    .gauge-link {
      color: var(--ax-color-brand-primary);
      text-decoration: none;
      font-weight: 500;
      font-size: var(--ax-font-size-sm);
      &:hover { text-decoration: underline; }
    }
    .gauge-desc { margin-top: 2px; }

    .measure-val {
      font-size: var(--ax-font-size-xs);
      font-family: 'Roboto Mono', monospace;
      color: var(--ax-color-text-secondary);
    }
    .threshold-val {
      font-size: var(--ax-font-size-xs);
      font-family: 'Roboto Mono', monospace;
      color: var(--ax-color-warning);
      font-weight: 600;
    }

    mat-paginator {
      border-top: 1px solid var(--ax-color-border);
    }

    @media (max-width: 960px) {
      .ax-crack-kpi { grid-template-columns: repeat(2, 1fr); }
    }
  `],
})
export class CrackDashboardComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly gaugePoints = signal<CrackGaugePoint[]>([]);
  readonly filtered = signal<CrackGaugePoint[]>([]);
  readonly loading = signal(false);

  /** ECharts — GP-B2-C3-N 균열 폭 추이 샘플 데이터 (55일치) */
  readonly sampleTrendData: CrackDataPoint[] = (() => {
    const pts: CrackDataPoint[] = [];
    const base = Date.now() - 55 * 86_400_000;
    for (let i = 0; i <= 55; i++) {
      const t = i / 55;
      const w = 0.35 + 1.47 * (t * t) + (Math.random() - 0.5) * 0.05;
      pts.push({ date: new Date(base + i * 86_400_000).toISOString(), widthMm: +w.toFixed(3) });
    }
    return pts;
  })();

  /** Three.js — 건물 3D 결함 마커 */
  readonly building3dMarkers: DefectMarker3D[] = [
    { id: 'def_001', label: '균열 C-3 기둥',    severity: 'CRITICAL', x: -0.4, y: -0.8, z:  0.3 },
    { id: 'def_003', label: '천장 누수',         severity: 'HIGH',     x:  0.2, y: -0.6, z: -0.2 },
    { id: 'def_009', label: '외벽 박락',         severity: 'CRITICAL', x:  0.5, y:  0.4, z:  0.4 },
    { id: 'def_004', label: '기둥 백태',         severity: 'MEDIUM',   x: -0.3, y: -0.3, z: -0.4 },
    { id: 'def_005', label: '난간 부식',         severity: 'MEDIUM',   x:  0.0, y:  0.8, z:  0.5 },
    { id: 'def_f07', label: '보도블록 침하',     severity: 'LOW',      x: -0.6, y: -1.0, z: -0.1 },
  ];

  columns = ['status', 'name', 'location', 'baseline', 'threshold', 'installDate', 'active', 'actions'];
  filterRisk = '';
  filterActive = 'true';
  searchText = '';

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.http.get<any>(`${environment.apiUrl}/cracks/gauge-points`).subscribe({
      next: (res) => {
        this.gaugePoints.set(res.data ?? []);
        this.applyFilter();
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  applyFilter() {
    let list = this.gaugePoints();
    if (this.filterActive !== '') list = list.filter((g) => String(g.isActive) === this.filterActive);
    if (this.filterRisk === 'exceeded') list = list.filter((g) => this.isExceeded(g));
    else if (this.filterRisk === 'warning') list = list.filter((g) => this.isWarning(g) && !this.isExceeded(g));
    else if (this.filterRisk === 'normal') list = list.filter((g) => !this.isWarning(g));
    if (this.searchText) {
      const q = this.searchText.toLowerCase();
      list = list.filter((g) => g.name.toLowerCase().includes(q) || g.location?.toLowerCase().includes(q));
    }
    this.filtered.set(list);
  }

  resetFilters() {
    this.filterRisk = ''; this.filterActive = 'true'; this.searchText = '';
    this.applyFilter();
  }

  isExceeded(g: CrackGaugePoint): boolean { return false; }
  isWarning(g: CrackGaugePoint): boolean { return false; }

  exceededCount() { return this.gaugePoints().filter((g) => this.isExceeded(g)).length; }
  warningCount() { return this.gaugePoints().filter((g) => this.isWarning(g) && !this.isExceeded(g)).length; }
  normalCount() { return this.gaugePoints().filter((g) => !this.isWarning(g)).length; }

  getRiskVariant(g: CrackGaugePoint): BadgeVariant {
    if (this.isExceeded(g)) return 'danger';
    if (this.isWarning(g)) return 'warning';
    return 'success';
  }

  getRiskLabel(g: CrackGaugePoint): string {
    if (this.isExceeded(g)) return '임계 초과';
    if (this.isWarning(g)) return '경고';
    return '정상';
  }
}
