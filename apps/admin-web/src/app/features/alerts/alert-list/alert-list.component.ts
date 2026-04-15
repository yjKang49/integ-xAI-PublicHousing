import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Alert } from '@ax/shared';
import { environment } from '../../../../environments/environment';
import {
  PageHeaderComponent,
  StatusBadgeComponent,
  EmptyStateComponent,
  SkeletonComponent,
  BadgeVariant,
  severityToVariant,
} from '../../../shared/components';

const SEVERITY_CONFIG: Record<string, { label: string; icon: string; variant: BadgeVariant }> = {
  LOW:      { label: '낮음', icon: 'info',           variant: 'info' },
  MEDIUM:   { label: '보통', icon: 'warning',         variant: 'info' },
  HIGH:     { label: '높음', icon: 'report_problem',  variant: 'warning' },
  CRITICAL: { label: '긴급', icon: 'dangerous',       variant: 'danger' },
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  CRACK_THRESHOLD:    '균열 임계치 초과',
  INSPECTION_OVERDUE: '점검 미수행',
  CONTRACT_EXPIRY:    '계약 만료 임박',
  DEFECT_CRITICAL:    '긴급 결함 등록',
  COMPLAINT_OVERDUE:  '민원 처리 지연',
};

const STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant }> = {
  ACTIVE:       { label: '활성',   variant: 'danger' },
  ACKNOWLEDGED: { label: '확인됨', variant: 'warning' },
  RESOLVED:     { label: '해결됨', variant: 'success' },
};

@Component({
  selector: 'ax-alert-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatTableModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatFormFieldModule,
    MatTooltipModule, MatSnackBarModule, MatPaginatorModule,
    PageHeaderComponent, StatusBadgeComponent, EmptyStateComponent, SkeletonComponent,
  ],
  template: `
    <ax-page-header
      title="경보 목록"
      description="시설물 경보 발생 현황 및 처리 이력 관리"
      icon="notifications_active"
      [meta]="'활성 ' + activeCount() + '건'">
      <div ax-page-actions>
        @if (activeCount() > 0) {
          <div class="active-alert-badge">
            <mat-icon>campaign</mat-icon>
            <span>미처리 경보 {{ activeCount() }}건</span>
          </div>
        }
      </div>
    </ax-page-header>

    <!-- Severity summary strip -->
    <div class="ax-alert-strip">
      @for (s of severityItems; track s.key) {
        <button class="sev-card" [style.--sev-color]="getSeverityTokenColor(s.key)"
          [class.sev-card--active]="filterSeverity === s.key"
          (click)="filterBySeverity(s.key)">
          <mat-icon class="sev-card__icon">{{ s.config.icon }}</mat-icon>
          <span class="sev-card__value">{{ countBySeverity(s.key) }}</span>
          <span class="sev-card__label">{{ s.config.label }}</span>
        </button>
      }
      <button class="sev-card" style="--sev-color: var(--ax-color-text-secondary)"
        [class.sev-card--active]="filterStatus === '' && filterSeverity === ''"
        (click)="showAll()">
        <mat-icon class="sev-card__icon">list</mat-icon>
        <span class="sev-card__value">{{ total() }}</span>
        <span class="sev-card__label">전체</span>
      </button>
    </div>

    <!-- Filter bar -->
    <div class="ax-filter-bar">
      <div class="ax-filter-bar__filters">
        <mat-form-field appearance="outline" class="ax-filter-bar__field">
          <mat-label>심각도</mat-label>
          <mat-select [(ngModel)]="filterSeverity" (ngModelChange)="load()">
            <mat-option value="">전체</mat-option>
            @for (s of severityItems; track s.key) {
              <mat-option [value]="s.key">{{ s.config.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="ax-filter-bar__field">
          <mat-label>유형</mat-label>
          <mat-select [(ngModel)]="filterType" (ngModelChange)="load()">
            <mat-option value="">전체</mat-option>
            @for (t of alertTypeItems; track t.key) {
              <mat-option [value]="t.key">{{ t.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="ax-filter-bar__field">
          <mat-label>상태</mat-label>
          <mat-select [(ngModel)]="filterStatus" (ngModelChange)="load()">
            <mat-option value="">전체</mat-option>
            @for (s of statusItems; track s.key) {
              <mat-option [value]="s.key">{{ s.config.label }}</mat-option>
            }
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
        <table mat-table [dataSource]="alerts()" class="ax-alert-table">

          <ng-container matColumnDef="severity">
            <th mat-header-cell *matHeaderCellDef>심각도</th>
            <td mat-cell *matCellDef="let a">
              <div class="sev-cell">
                <mat-icon class="sev-cell__icon" [style.color]="getSeverityTokenColor(a.severity)">
                  {{ severityIcon(a.severity) }}
                </mat-icon>
                <ax-status-badge [variant]="getSeverityVariant(a.severity)" [label]="severityLabel(a.severity)" />
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="alertType">
            <th mat-header-cell *matHeaderCellDef>유형</th>
            <td mat-cell *matCellDef="let a">
              <span class="type-tag">{{ alertTypeLabel(a.alertType) }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="title">
            <th mat-header-cell *matHeaderCellDef>내용</th>
            <td mat-cell *matCellDef="let a">
              <div class="alert-title ax-text-body">{{ a.title }}</div>
              @if (a.message) {
                <div class="alert-msg ax-text-meta">
                  {{ a.message | slice:0:60 }}{{ (a.message?.length ?? 0) > 60 ? '…' : '' }}
                </div>
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>상태</th>
            <td mat-cell *matCellDef="let a">
              <ax-status-badge [variant]="getStatusVariant(a.status)" [label]="statusLabel(a.status)" />
            </td>
          </ng-container>

          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef>발생일시</th>
            <td mat-cell *matCellDef="let a" class="ax-text-meta">{{ a.createdAt | date:'MM/dd HH:mm' }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let a" (click)="$event.stopPropagation()">
              @if (a.status === 'ACTIVE') {
                <button mat-stroked-button color="primary" (click)="acknowledge(a)" matTooltip="확인 처리"
                  class="action-btn">
                  <mat-icon>done</mat-icon> 확인
                </button>
              }
              @if (a.status !== 'RESOLVED') {
                <button mat-stroked-button (click)="resolve(a)" matTooltip="해결 처리" class="action-btn">
                  <mat-icon>check_circle</mat-icon> 해결
                </button>
              }
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let a; columns: columns;"
            class="ax-table-row"
            [class.ax-table-row--critical]="a.severity === 'CRITICAL' && a.status === 'ACTIVE'"
            [class.ax-table-row--resolved]="a.status === 'RESOLVED'"></tr>
        </table>

        @if (alerts().length === 0) {
          <ax-empty-state
            type="empty"
            title="경보가 없습니다"
            description="현재 조건에 해당하는 경보가 없습니다."
            (primaryAction)="resetFilters()" />
        }
      }

      <mat-paginator [length]="total()" [pageSize]="pageSize"
        [pageSizeOptions]="[10, 20, 50]" (page)="onPage($event)" showFirstLastButtons />
    </div>
  `,
  styles: [`
    /* Alert badge in header */
    .active-alert-badge {
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

    /* Severity summary strip */
    .ax-alert-strip {
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
      font-family: inherit;
      text-align: center;
      transition: transform 0.15s, box-shadow 0.15s;

      &:hover { transform: translateY(-2px); box-shadow: var(--ax-shadow-card-hover); }
      &--active { box-shadow: 0 0 0 2px var(--sev-color); }
    }

    .sev-card__icon {
      color: var(--sev-color, var(--ax-color-text-secondary));
      font-size: 20px;
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
    .ax-filter-bar__field { min-width: 140px; }

    /* Table */
    .ax-alert-table { width: 100%; }

    .ax-table-row {
      transition: background 0.12s;
      &:hover { background: var(--ax-color-bg-surface-alt); }
      &--critical { background: rgba(220, 38, 38, 0.04); }
      &--critical:hover { background: rgba(220, 38, 38, 0.08); }
      &--resolved { opacity: 0.6; }
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

    .type-tag {
      display: inline-block;
      padding: 2px var(--ax-space-2);
      background: var(--ax-color-bg-surface-alt);
      border: 1px solid var(--ax-color-border);
      border-radius: var(--ax-radius-sm);
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-secondary);
      white-space: nowrap;
    }

    .alert-title { font-weight: 500; }
    .alert-msg { margin-top: 2px; }

    .action-btn {
      font-size: var(--ax-font-size-xs);
      margin-left: var(--ax-space-1);
      height: 30px;
      line-height: 30px;
    }

    mat-paginator { border-top: 1px solid var(--ax-color-border); }

    @media (max-width: 960px) {
      .ax-alert-strip { grid-template-columns: repeat(3, 1fr); }
    }
    @media (max-width: 600px) {
      .ax-alert-strip { grid-template-columns: repeat(2, 1fr); }
    }
  `],
})
export class AlertListComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);

  readonly alerts = signal<Alert[]>([]);
  readonly loading = signal(false);
  readonly total = signal(0);

  columns = ['severity', 'alertType', 'title', 'status', 'createdAt', 'actions'];
  filterSeverity = '';
  filterType = '';
  filterStatus = 'ACTIVE';
  pageSize = 20;
  pageIndex = 0;

  readonly severityItems = Object.entries(SEVERITY_CONFIG).map(([key, config]) => ({ key, config }));
  readonly alertTypeItems = Object.entries(ALERT_TYPE_LABELS).map(([key, label]) => ({ key, label }));
  readonly statusItems = Object.entries(STATUS_CONFIG).map(([key, config]) => ({ key, config }));

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const params = new URLSearchParams({
      page: String(this.pageIndex + 1), limit: String(this.pageSize),
      ...(this.filterSeverity && { severity: this.filterSeverity }),
      ...(this.filterType && { alertType: this.filterType }),
      ...(this.filterStatus && { status: this.filterStatus }),
    });
    this.http.get<any>(`${environment.apiUrl}/alerts?${params}`).subscribe({
      next: (res) => {
        this.alerts.set(res.data ?? []);
        this.total.set(res.meta?.total ?? (res.data ?? []).length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  acknowledge(alert: Alert) {
    this.http.patch<any>(`${environment.apiUrl}/alerts/${encodeURIComponent(alert._id)}/acknowledge`, {}).subscribe({
      next: () => {
        this.alerts.update((list) => list.map((a) => a._id === alert._id ? { ...a, status: 'ACKNOWLEDGED' as any } : a));
        this.snackBar.open('경보를 확인 처리했습니다.', '닫기', { duration: 2000 });
      },
      error: () => this.snackBar.open('처리 중 오류가 발생했습니다.', '닫기', { duration: 3000 }),
    });
  }

  resolve(alert: Alert) {
    this.http.patch<any>(`${environment.apiUrl}/alerts/${encodeURIComponent(alert._id)}/resolve`, {}).subscribe({
      next: () => {
        this.alerts.update((list) => list.map((a) => a._id === alert._id ? { ...a, status: 'RESOLVED' as any } : a));
        this.snackBar.open('경보를 해결 처리했습니다.', '닫기', { duration: 2000 });
      },
      error: () => this.snackBar.open('처리 중 오류가 발생했습니다.', '닫기', { duration: 3000 }),
    });
  }

  filterBySeverity(severity: string) {
    this.filterSeverity = this.filterSeverity === severity ? '' : severity;
    this.load();
  }

  showAll() { this.filterStatus = ''; this.filterSeverity = ''; this.load(); }
  filterByStatus(status: string) { this.filterStatus = status; this.load(); }

  resetFilters() {
    this.filterSeverity = ''; this.filterType = ''; this.filterStatus = 'ACTIVE';
    this.pageIndex = 0; this.load();
  }

  onPage(e: PageEvent) { this.pageIndex = e.pageIndex; this.pageSize = e.pageSize; this.load(); }

  countBySeverity(severity: string) { return this.alerts().filter((a) => a.severity === severity).length; }
  activeCount() { return this.alerts().filter((a) => a.status === 'ACTIVE').length; }

  severityLabel(s: string) { return SEVERITY_CONFIG[s]?.label ?? s; }
  severityIcon(s: string) { return SEVERITY_CONFIG[s]?.icon ?? 'info'; }
  getSeverityVariant(s: string): BadgeVariant { return SEVERITY_CONFIG[s]?.variant ?? 'neutral'; }
  getSeverityTokenColor(s: string): string {
    const map: Record<string, string> = {
      LOW: 'var(--ax-color-success)', MEDIUM: 'var(--ax-color-info)',
      HIGH: 'var(--ax-color-warning)', CRITICAL: 'var(--ax-color-danger)',
    };
    return map[s] ?? 'var(--ax-color-text-secondary)';
  }
  alertTypeLabel(t: string) { return ALERT_TYPE_LABELS[t] ?? t; }
  statusLabel(s: string) { return STATUS_CONFIG[s]?.label ?? s; }
  getStatusVariant(s: string): BadgeVariant { return STATUS_CONFIG[s]?.variant ?? 'neutral'; }
}
