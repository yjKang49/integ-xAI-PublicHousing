import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Defect, DefectType, SeverityLevel } from '@ax/shared';
import { DefectsService } from '../../../core/api/defects.service';
import {
  PageHeaderComponent,
  StatusBadgeComponent,
  EmptyStateComponent,
  SkeletonComponent,
  severityToVariant,
} from '../../../shared/components';

const SEVERITY_CONFIG: Record<string, { label: string; icon: string; tokenColor: string }> = {
  LOW:      { label: '낮음', icon: 'info',           tokenColor: 'var(--ax-color-info)' },
  MEDIUM:   { label: '보통', icon: 'warning',         tokenColor: 'var(--ax-color-info)' },
  HIGH:     { label: '높음', icon: 'report_problem',  tokenColor: 'var(--ax-color-warning)' },
  CRITICAL: { label: '긴급', icon: 'dangerous',       tokenColor: 'var(--ax-color-danger)' },
};

const DEFECT_TYPE_LABELS: Record<string, string> = {
  CRACK: '균열', LEAK: '누수', SPALLING: '박리/박락',
  CORROSION: '부식', EFFLORESCENCE: '백태',
  DEFORMATION: '변형', SETTLEMENT: '침하', OTHER: '기타',
};

@Component({
  selector: 'ax-defect-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatTableModule, MatPaginatorModule,
    MatSelectModule, MatInputModule, MatFormFieldModule,
    MatButtonModule, MatIconModule,
    MatTooltipModule, MatSnackBarModule,
    PageHeaderComponent, StatusBadgeComponent, EmptyStateComponent, SkeletonComponent,
  ],
  template: `
    <ax-page-header
      title="결함 목록"
      description="시설물 결함 발생 현황 및 조치 이력 관리"
      icon="report_problem"
      [meta]="'전체 ' + totalCount() + '건'">
    </ax-page-header>

    <!-- Severity summary strip -->
    <div class="ax-severity-strip">
      @for (s of severitySummary(); track s.key) {
        <button class="sev-card" [style.--sev-color]="s.tokenColor"
          [class.sev-card--active]="filterSeverity === s.key"
          (click)="filterBySeverity(s.key)">
          <span class="sev-card__icon"><mat-icon>{{ s.icon }}</mat-icon></span>
          <span class="sev-card__value">{{ s.count }}</span>
          <span class="sev-card__label">{{ s.label }}</span>
        </button>
      }
      <div class="sev-card sev-card--unrepaired" style="--sev-color: var(--ax-color-warning); cursor:default">
        <span class="sev-card__icon"><mat-icon>handyman</mat-icon></span>
        <span class="sev-card__value">{{ unrepairedCount() }}</span>
        <span class="sev-card__label">미조치</span>
      </div>
    </div>

    <!-- Filter bar -->
    <div class="ax-filter-bar">
      <div class="ax-filter-bar__filters">
        <mat-form-field appearance="outline" class="ax-filter-bar__field">
          <mat-label>결함 유형</mat-label>
          <mat-select [(ngModel)]="filterType" (ngModelChange)="applyFilters()">
            <mat-option value="">전체</mat-option>
            @for (t of defectTypeOptions; track t.value) {
              <mat-option [value]="t.value">{{ t.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="ax-filter-bar__field">
          <mat-label>심각도</mat-label>
          <mat-select [(ngModel)]="filterSeverity" (ngModelChange)="applyFilters()">
            <mat-option value="">전체</mat-option>
            @for (s of severityOptions; track s.value) {
              <mat-option [value]="s.value">{{ s.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="ax-filter-bar__field">
          <mat-label>조치 상태</mat-label>
          <mat-select [(ngModel)]="filterRepaired" (ngModelChange)="applyFilters()">
            <mat-option value="">전체</mat-option>
            <mat-option value="false">미조치</mat-option>
            <mat-option value="true">조치 완료</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="ax-filter-bar__field">
          <mat-label>등록일 시작</mat-label>
          <input matInput type="date" [(ngModel)]="filterDateFrom" (change)="applyFilters()" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="ax-filter-bar__field">
          <mat-label>등록일 종료</mat-label>
          <input matInput type="date" [(ngModel)]="filterDateTo" (change)="applyFilters()" />
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
        <table mat-table [dataSource]="defects()" class="ax-defect-table">

          <!-- Severity -->
          <ng-container matColumnDef="severity">
            <th mat-header-cell *matHeaderCellDef>심각도</th>
            <td mat-cell *matCellDef="let d">
              <div class="sev-cell">
                <mat-icon class="sev-cell__icon" [style.color]="severityTokenColor(d.severity)">
                  {{ severityIcon(d.severity) }}
                </mat-icon>
                <ax-status-badge [variant]="severityToVariant(d.severity)" [label]="severityLabel(d.severity)" />
              </div>
            </td>
          </ng-container>

          <!-- Defect type -->
          <ng-container matColumnDef="defectType">
            <th mat-header-cell *matHeaderCellDef>결함 유형</th>
            <td mat-cell *matCellDef="let d" class="ax-text-body">{{ defectTypeLabel(d.defectType) }}</td>
          </ng-container>

          <!-- Location -->
          <ng-container matColumnDef="location">
            <th mat-header-cell *matHeaderCellDef>위치</th>
            <td mat-cell *matCellDef="let d">
              <span class="loc-text" [matTooltip]="d.locationDescription">
                {{ d.locationDescription | slice:0:40 }}{{ (d.locationDescription?.length ?? 0) > 40 ? '…' : '' }}
              </span>
            </td>
          </ng-container>

          <!-- Measurements -->
          <ng-container matColumnDef="measurements">
            <th mat-header-cell *matHeaderCellDef>측정값</th>
            <td mat-cell *matCellDef="let d">
              @if (d.widthMm || d.lengthMm) {
                <span class="measure-text">
                  {{ d.widthMm ? d.widthMm + 'mm' : '-' }} × {{ d.lengthMm ? d.lengthMm + 'mm' : '-' }}
                </span>
              } @else {
                <span class="ax-text-meta">—</span>
              }
            </td>
          </ng-container>

          <!-- Repaired -->
          <ng-container matColumnDef="repaired">
            <th mat-header-cell *matHeaderCellDef>조치</th>
            <td mat-cell *matCellDef="let d">
              @if (d.isRepaired) {
                <ax-status-badge variant="success" label="조치 완료" />
              } @else {
                <ax-status-badge variant="warning" label="미조치" />
              }
            </td>
          </ng-container>

          <!-- Photo count -->
          <ng-container matColumnDef="media">
            <th mat-header-cell *matHeaderCellDef>사진</th>
            <td mat-cell *matCellDef="let d">
              @if ((d.mediaIds?.length ?? 0) > 0) {
                <div class="media-cell">
                  <mat-icon class="media-cell__icon" [matTooltip]="d.mediaIds.length + '장'">photo_library</mat-icon>
                  <span class="ax-text-meta">{{ d.mediaIds?.length ?? 0 }}</span>
                </div>
              } @else {
                <span class="ax-text-meta">—</span>
              }
            </td>
          </ng-container>

          <!-- Created at -->
          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef>등록일</th>
            <td mat-cell *matCellDef="let d" class="ax-text-meta">{{ d.createdAt | date:'yy.MM.dd HH:mm' }}</td>
          </ng-container>

          <!-- Actions -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let d" (click)="$event.stopPropagation()">
              <button mat-icon-button [routerLink]="[d._id]" matTooltip="상세보기">
                <mat-icon>open_in_new</mat-icon>
              </button>
              @if (!d.isRepaired) {
                <button mat-icon-button color="primary"
                  (click)="markRepaired(d)"
                  matTooltip="조치 완료 처리">
                  <mat-icon>build_circle</mat-icon>
                </button>
              }
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let d; columns: columns;"
            class="ax-table-row"
            [class.ax-table-row--critical]="d.severity === 'CRITICAL'"
            [routerLink]="[d._id]"></tr>
        </table>

        @if (defects().length === 0) {
          <ax-empty-state
            type="search-no-result"
            title="조건에 맞는 결함이 없습니다"
            description="필터를 변경하거나 초기화한 후 다시 확인해 주세요."
            (primaryAction)="resetFilters()" />
        }
      }

      <mat-paginator
        [length]="totalCount()"
        [pageSize]="pageSize"
        [pageSizeOptions]="[10, 20, 50]"
        (page)="onPageChange($event)"
        showFirstLastButtons />
    </div>
  `,
  styles: [`
    /* Severity summary strip */
    .ax-severity-strip {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: var(--ax-space-3);
      margin-bottom: var(--ax-space-4);
    }

    .sev-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--ax-space-1);
      padding: var(--ax-space-4) var(--ax-space-3);
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border);
      border-top: 4px solid var(--sev-color, var(--ax-color-border));
      border-radius: var(--ax-radius-card);
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
      font-family: inherit;
      text-align: center;

      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--ax-shadow-card-hover);
      }

      &--active {
        box-shadow: 0 0 0 2px var(--sev-color);
      }

      &--unrepaired { cursor: default; }
    }

    .sev-card__icon {
      mat-icon { color: var(--sev-color, var(--ax-color-text-secondary)); font-size: 20px; }
    }
    .sev-card__value {
      font-size: var(--ax-font-size-kpi);
      font-weight: 700;
      color: var(--ax-color-text-primary);
      line-height: 1;
    }
    .sev-card__label {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-secondary);
      font-weight: 500;
    }

    /* Filter bar */
    .ax-filter-bar__field {
      min-width: 140px;
    }

    /* Table */
    .ax-defect-table { width: 100%; }

    .ax-table-row {
      cursor: pointer;
      transition: background 0.12s;

      &:hover { background: var(--ax-color-bg-surface-alt); }
      &--critical { background: rgba(var(--ax-color-danger-rgb, 220 38 38), 0.03); }
      &--critical:hover { background: rgba(var(--ax-color-danger-rgb, 220 38 38), 0.07); }
    }

    /* Cell layouts */
    .sev-cell {
      display: flex;
      align-items: center;
      gap: var(--ax-space-2);
    }
    .sev-cell__icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .media-cell {
      display: flex;
      align-items: center;
      gap: var(--ax-space-1);
    }
    .media-cell__icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--ax-color-info);
      cursor: pointer;
    }

    .loc-text {
      font-size: var(--ax-font-size-sm);
      color: var(--ax-color-text-primary);
    }

    .measure-text {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-secondary);
      font-family: 'Roboto Mono', monospace;
    }

    /* Paginator */
    mat-paginator {
      border-top: 1px solid var(--ax-color-border);
    }

    @media (max-width: 960px) {
      .ax-severity-strip { grid-template-columns: repeat(3, 1fr); }
    }
    @media (max-width: 600px) {
      .ax-severity-strip { grid-template-columns: repeat(2, 1fr); }
    }
  `],
})
export class DefectListComponent implements OnInit {
  private readonly defectsService = inject(DefectsService);
  private readonly snackBar = inject(MatSnackBar);

  readonly defects = signal<Defect[]>([]);
  readonly loading = signal(false);
  readonly totalCount = signal(0);

  columns = ['severity', 'defectType', 'location', 'measurements', 'repaired', 'media', 'createdAt', 'actions'];

  // Filters
  filterType = '';
  filterSeverity = '';
  filterRepaired = '';
  filterDateFrom = '';
  filterDateTo = '';

  pageSize = 20;
  currentPage = 0;

  readonly severitySummary = computed(() => {
    const all = this.defects();
    return Object.entries(SEVERITY_CONFIG).map(([key, cfg]) => ({
      key,
      label: cfg.label,
      icon: cfg.icon,
      tokenColor: cfg.tokenColor,
      count: all.filter((d) => d.severity === key).length,
    }));
  });

  readonly unrepairedCount = computed(() => this.defects().filter((d) => !d.isRepaired).length);

  readonly defectTypeOptions = Object.entries(DEFECT_TYPE_LABELS).map(([value, label]) => ({ value, label }));
  readonly severityOptions = Object.entries(SEVERITY_CONFIG).map(([value, cfg]) => ({ value, label: cfg.label }));

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.defectsService.list({
      defectType: this.filterType || undefined,
      severity: this.filterSeverity || undefined,
      isRepaired: this.filterRepaired !== '' ? this.filterRepaired === 'true' : undefined,
      dateFrom: this.filterDateFrom || undefined,
      dateTo: this.filterDateTo || undefined,
      page: this.currentPage + 1,
      limit: this.pageSize,
    }).subscribe({
      next: (res) => {
        this.defects.set(res.data ?? res as any);
        this.totalCount.set(res.meta?.total ?? this.defects().length);
        this.loading.set(false);
      },
      error: () => {
        this.snackBar.open('결함 목록을 불러오지 못했습니다.', '닫기', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  applyFilters() {
    this.currentPage = 0;
    this.load();
  }

  resetFilters() {
    this.filterType = '';
    this.filterSeverity = '';
    this.filterRepaired = '';
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.applyFilters();
  }

  filterBySeverity(severity: string) {
    this.filterSeverity = this.filterSeverity === severity ? '' : severity;
    this.applyFilters();
  }

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex;
    this.load();
  }

  markRepaired(defect: Defect) {
    this.defectsService.markRepaired(defect._id, '').subscribe({
      next: (updated) => {
        this.defects.update((list) => list.map((d) => d._id === updated._id ? updated : d));
        this.snackBar.open('조치 완료 처리되었습니다.', '닫기', { duration: 2000 });
      },
      error: () => this.snackBar.open('처리 중 오류가 발생했습니다.', '닫기', { duration: 3000 }),
    });
  }

  readonly severityToVariant = severityToVariant;

  severityLabel(s: string) { return SEVERITY_CONFIG[s]?.label ?? s; }
  severityTokenColor(s: string) { return SEVERITY_CONFIG[s]?.tokenColor ?? 'var(--ax-color-text-secondary)'; }
  severityIcon(s: string) { return SEVERITY_CONFIG[s]?.icon ?? 'warning'; }
  defectTypeLabel(t: string) { return DEFECT_TYPE_LABELS[t] ?? t; }
}
