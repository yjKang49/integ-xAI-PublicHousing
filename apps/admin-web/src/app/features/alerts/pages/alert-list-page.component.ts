// apps/admin-web/src/app/features/alerts/pages/alert-list-page.component.ts
// 경보 목록 페이지 — 균열 임계치 초과 알림 우선 표시, 게이지 포인트 바로가기 포함
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDividerModule } from '@angular/material/divider';
import { Alert, AlertType, AlertStatus, SeverityLevel } from '@ax/shared';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { environment } from '../../../../environments/environment';

const ALERT_TYPE_LABELS: Record<string, string> = {
  CRACK_THRESHOLD:    '균열 임계치 초과',
  INSPECTION_OVERDUE: '점검 미수행',
  CONTRACT_EXPIRY:    '계약 만료 임박',
  DEFECT_CRITICAL:    '긴급 결함',
  COMPLAINT_OVERDUE:  '민원 처리 지연',
};

const SEVERITY_ICONS: Record<string, string> = {
  LOW: 'info', MEDIUM: 'warning', HIGH: 'report_problem', CRITICAL: 'dangerous',
};
const SEVERITY_LABELS: Record<string, string> = {
  LOW: '낮음', MEDIUM: '보통', HIGH: '높음', CRITICAL: '긴급',
};
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: '활성', ACKNOWLEDGED: '확인됨', RESOLVED: '해결됨',
};

@Component({
  selector: 'ax-alert-list-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatTableModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatFormFieldModule,
    MatTooltipModule, MatProgressBarModule, MatSnackBarModule,
    MatPaginatorModule, MatDividerModule,
    EmptyStateComponent,
  ],
  template: `
    <!-- 페이지 헤더 -->
    <div class="ax-alert-header">
      <div class="ax-alert-header__identity">
        <div class="ax-alert-header__icon-wrap" [class.ax-alert-header__icon-wrap--pulse]="criticalCount() > 0">
          <mat-icon>notifications_active</mat-icon>
        </div>
        <div>
          <h1 class="ax-alert-header__title">경보 관리</h1>
          <p class="ax-alert-header__desc">실시간 임계치 초과 및 점검 지연 경보를 확인하고 처리합니다</p>
        </div>
      </div>
      <div class="ax-alert-header__badges">
        @if (criticalCount() > 0) {
          <div class="ax-alert-badge ax-alert-badge--critical">
            <mat-icon>dangerous</mat-icon>
            긴급 {{ criticalCount() }}건
          </div>
        }
        @if (activeCount() > 0) {
          <div class="ax-alert-badge ax-alert-badge--active">
            활성 {{ activeCount() }}건
          </div>
        }
        <button mat-stroked-button (click)="acknowledgeAll()" matTooltip="활성 경보 전체 확인">
          <mat-icon>done_all</mat-icon> 전체 확인
        </button>
      </div>
    </div>

    <!-- 심각도 요약 카드 -->
    <div class="ax-alert-stats">
      @for (item of severityItems; track item.key) {
        <button
          class="ax-alert-stat"
          [class]="'ax-alert-stat ax-alert-stat--' + item.key.toLowerCase()"
          [class.ax-alert-stat--active]="filterSeverity === item.key"
          (click)="toggleSeverityFilter(item.key)"
        >
          <mat-icon class="ax-alert-stat__icon">{{ item.icon }}</mat-icon>
          <span class="ax-alert-stat__num">{{ countBySeverity(item.key) }}</span>
          <span class="ax-alert-stat__lbl">{{ item.label }}</span>
        </button>
      }
    </div>

    <!-- 필터 바 -->
    <div class="ax-filter-bar">
      <div class="ax-filter-bar__filters">
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>심각도</mat-label>
          <mat-select [(ngModel)]="filterSeverity" (ngModelChange)="load()">
            <mat-option value="">전체</mat-option>
            @for (item of severityItems; track item.key) {
              <mat-option [value]="item.key">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>유형</mat-label>
          <mat-select [(ngModel)]="filterType" (ngModelChange)="load()">
            <mat-option value="">전체</mat-option>
            @for (item of typeItems; track item.key) {
              <mat-option [value]="item.key">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>상태</mat-label>
          <mat-select [(ngModel)]="filterStatus" (ngModelChange)="load()">
            <mat-option value="">전체</mat-option>
            @for (item of statusItems; track item.key) {
              <mat-option [value]="item.key">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>
      <div class="ax-filter-bar__actions">
        <button mat-stroked-button (click)="resetFilters()">
          <mat-icon>clear_all</mat-icon> 초기화
        </button>
      </div>
    </div>

    <!-- 경보 테이블 -->
    <div class="ax-table-container">
      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }
      <table mat-table [dataSource]="alerts()" class="ax-alert-table">

        <ng-container matColumnDef="severity">
          <th mat-header-cell *matHeaderCellDef>심각도</th>
          <td mat-cell *matCellDef="let a">
            <div class="ax-alert-sev-badge ax-alert-sev-badge--{{ a.severity.toLowerCase() }}">
              <mat-icon class="ax-alert-sev-badge__icon">{{ sevIcon(a.severity) }}</mat-icon>
              {{ sevLabel(a.severity) }}
            </div>
          </td>
        </ng-container>

        <ng-container matColumnDef="alertType">
          <th mat-header-cell *matHeaderCellDef>유형</th>
          <td mat-cell *matCellDef="let a">
            <span [class.ax-alert-crack-type]="a.alertType === 'CRACK_THRESHOLD'">
              {{ typeLabel(a.alertType) }}
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="title">
          <th mat-header-cell *matHeaderCellDef>내용</th>
          <td mat-cell *matCellDef="let a">
            <div class="ax-alert-title">{{ a.title }}</div>
            <div class="ax-alert-msg">
              {{ a.message | slice:0:80 }}{{ (a.message?.length ?? 0) > 80 ? '…' : '' }}
            </div>
          </td>
        </ng-container>

        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>상태</th>
          <td mat-cell *matCellDef="let a">
            <span class="ax-alert-status ax-alert-status--{{ a.status.toLowerCase() }}">
              {{ staLabel(a.status) }}
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="createdAt">
          <th mat-header-cell *matHeaderCellDef>발생일시</th>
          <td mat-cell *matCellDef="let a">
            <span class="ax-alert-date">{{ a.createdAt | date:'MM/dd HH:mm' }}</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let a">
            <div class="ax-alert-row-actions">
              @if (a.alertType === 'CRACK_THRESHOLD' && a.sourceEntityId) {
                <button mat-icon-button color="primary"
                  [routerLink]="['/cracks/gauge', a.sourceEntityId]"
                  matTooltip="균열 이력 보기">
                  <mat-icon>sensors</mat-icon>
                </button>
              }
              @if (a.status === 'ACTIVE') {
                <button mat-stroked-button color="primary"
                  (click)="acknowledge(a); $event.stopPropagation()">
                  <mat-icon>done</mat-icon> 확인
                </button>
              }
              @if (a.status !== 'RESOLVED') {
                <button mat-stroked-button
                  (click)="resolve(a); $event.stopPropagation()">
                  <mat-icon>check_circle</mat-icon> 해결
                </button>
              }
            </div>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns;"
          [class.ax-alert-row--critical]="row.severity === 'CRITICAL'"
          [class.ax-alert-row--resolved]="row.status === 'RESOLVED'"></tr>
      </table>

      @if (!loading() && alerts().length === 0) {
        <ax-empty-state
          type="search-no-result"
          icon="notifications_none"
          title="조건에 맞는 경보가 없습니다"
          description="필터를 변경하거나 초기화해 보세요"
          primaryLabel="필터 초기화"
          primaryIcon="clear_all"
          (primaryAction)="resetFilters()"
        />
      }

      <mat-divider />
      <mat-paginator
        [length]="total()"
        [pageSize]="pageSize"
        [pageSizeOptions]="[10, 20, 50]"
        (page)="onPage($event)"
        showFirstLastButtons
      />
    </div>
  `,
  styles: [`
    /* ── 헤더 ── */
    .ax-alert-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: var(--ax-spacing-4);
      margin-bottom: var(--ax-spacing-5);
    }
    .ax-alert-header__identity {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-3);
    }
    .ax-alert-header__icon-wrap {
      width: 44px; height: 44px;
      border-radius: var(--ax-radius-md);
      background: var(--ax-color-danger);
      display: flex; align-items: center; justify-content: center;
      color: #fff; flex-shrink: 0;
    }
    .ax-alert-header__icon-wrap--pulse {
      animation: ax-alert-pulse 2s ease-in-out infinite;
    }
    @keyframes ax-alert-pulse {
      0%, 100% { opacity: 1; box-shadow: 0 0 0 0 color-mix(in srgb, var(--ax-color-danger) 40%, transparent); }
      50% { opacity: 0.85; box-shadow: 0 0 0 6px transparent; }
    }
    .ax-alert-header__title {
      margin: 0;
      font-size: var(--ax-font-size-xl);
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
      line-height: 1.3;
    }
    .ax-alert-header__desc {
      margin: 2px 0 0;
      font-size: var(--ax-font-size-sm);
      color: var(--ax-color-text-secondary);
    }
    .ax-alert-header__badges {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-2);
      flex-wrap: wrap;
    }
    .ax-alert-badge {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-1);
      padding: 4px 12px;
      border-radius: var(--ax-radius-full);
      font-weight: var(--ax-font-weight-semibold);
      font-size: var(--ax-font-size-sm);
    }
    .ax-alert-badge--critical {
      background: var(--ax-color-danger-subtle);
      color: var(--ax-color-danger);
      border: 1px solid var(--ax-color-danger-border);
    }
    .ax-alert-badge--active {
      background: var(--ax-color-warning-subtle);
      color: var(--ax-color-warning);
      border: 1px solid var(--ax-color-warning-border);
    }

    /* ── 심각도 통계 ── */
    .ax-alert-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--ax-spacing-3);
      margin-bottom: var(--ax-spacing-4);
    }
    .ax-alert-stat {
      padding: var(--ax-spacing-3) var(--ax-spacing-4);
      border-radius: var(--ax-radius-md);
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border-muted);
      border-top: 4px solid var(--ax-color-border-muted);
      text-align: center;
      cursor: pointer;
      transition: transform 0.1s ease, box-shadow 0.1s ease;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--ax-spacing-1);
    }
    .ax-alert-stat:hover,
    .ax-alert-stat--active {
      transform: translateY(-2px);
      box-shadow: var(--ax-shadow-md);
    }
    .ax-alert-stat__icon {
      font-size: 20px; width: 20px; height: 20px;
    }
    .ax-alert-stat__num {
      font-size: 28px;
      font-weight: var(--ax-font-weight-bold);
      line-height: 1.2;
    }
    .ax-alert-stat__lbl {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-secondary);
    }
    .ax-alert-stat--low {
      border-top-color: var(--ax-color-success);
    }
    .ax-alert-stat--low .ax-alert-stat__num,
    .ax-alert-stat--low .ax-alert-stat__icon { color: var(--ax-color-success); }
    .ax-alert-stat--medium {
      border-top-color: var(--ax-color-info);
    }
    .ax-alert-stat--medium .ax-alert-stat__num,
    .ax-alert-stat--medium .ax-alert-stat__icon { color: var(--ax-color-info); }
    .ax-alert-stat--high {
      border-top-color: var(--ax-color-warning);
    }
    .ax-alert-stat--high .ax-alert-stat__num,
    .ax-alert-stat--high .ax-alert-stat__icon { color: var(--ax-color-warning); }
    .ax-alert-stat--critical {
      border-top-color: var(--ax-color-danger);
    }
    .ax-alert-stat--critical .ax-alert-stat__num,
    .ax-alert-stat--critical .ax-alert-stat__icon { color: var(--ax-color-danger); }

    /* ── 테이블 ── */
    .ax-alert-table { width: 100%; }
    th.mat-mdc-header-cell {
      font-weight: var(--ax-font-weight-semibold);
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-secondary);
    }
    td.mat-mdc-cell {
      font-size: var(--ax-font-size-sm);
      padding: 0 var(--ax-spacing-2);
    }

    /* 심각도 배지 */
    .ax-alert-sev-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: var(--ax-radius-full);
      font-size: var(--ax-font-size-xs);
      font-weight: var(--ax-font-weight-semibold);
    }
    .ax-alert-sev-badge__icon { font-size: 13px; width: 13px; height: 13px; }
    .ax-alert-sev-badge--low      { background: var(--ax-color-success-subtle); color: var(--ax-color-success); }
    .ax-alert-sev-badge--medium   { background: var(--ax-color-info-subtle);    color: var(--ax-color-info); }
    .ax-alert-sev-badge--high     { background: var(--ax-color-warning-subtle); color: var(--ax-color-warning); }
    .ax-alert-sev-badge--critical { background: var(--ax-color-danger-subtle);  color: var(--ax-color-danger); }

    /* 타입 */
    .ax-alert-crack-type {
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-warning);
    }

    /* 콘텐츠 */
    .ax-alert-title { font-size: var(--ax-font-size-sm); font-weight: var(--ax-font-weight-medium); }
    .ax-alert-msg   { font-size: var(--ax-font-size-xs); color: var(--ax-color-text-tertiary); }

    /* 상태 */
    .ax-alert-status {
      font-size: var(--ax-font-size-xs);
      font-weight: var(--ax-font-weight-semibold);
    }
    .ax-alert-status--active       { color: var(--ax-color-danger); }
    .ax-alert-status--acknowledged { color: var(--ax-color-warning); }
    .ax-alert-status--resolved     { color: var(--ax-color-success); }

    /* 날짜 */
    .ax-alert-date { font-size: var(--ax-font-size-xs); color: var(--ax-color-text-tertiary); }

    /* 행 액션 */
    .ax-alert-row-actions { display: flex; align-items: center; gap: var(--ax-spacing-1); }

    /* 행 배경 */
    .ax-alert-row--critical td { background: color-mix(in srgb, var(--ax-color-danger-subtle) 50%, transparent); }
    .ax-alert-row--resolved    { opacity: 0.55; }
  `],
})
export class AlertListPageComponent implements OnInit {
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

  readonly severityItems = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((key) => ({
    key, label: SEVERITY_LABELS[key], icon: SEVERITY_ICONS[key],
  }));
  readonly typeItems = Object.entries(ALERT_TYPE_LABELS).map(([key, label]) => ({ key, label }));
  readonly statusItems = Object.entries(STATUS_LABELS).map(([key, label]) => ({ key, label }));

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const params = new URLSearchParams({
      page: String(this.pageIndex + 1),
      limit: String(this.pageSize),
      ...(this.filterSeverity && { severity: this.filterSeverity }),
      ...(this.filterType     && { alertType: this.filterType }),
      ...(this.filterStatus   && { status: this.filterStatus }),
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
    this.http.patch<any>(`${environment.apiUrl}/alerts/${encodeURIComponent(alert._id)}/acknowledge`, {})
      .subscribe({
        next: () => {
          this.mutateAlert(alert._id, { status: AlertStatus.ACKNOWLEDGED });
          this.snackBar.open('경보를 확인 처리했습니다.', '닫기', { duration: 2000 });
        },
        error: () => this.snackBar.open('처리 중 오류가 발생했습니다.', '닫기', { duration: 3000 }),
      });
  }

  resolve(alert: Alert) {
    this.http.patch<any>(`${environment.apiUrl}/alerts/${encodeURIComponent(alert._id)}/resolve`, {})
      .subscribe({
        next: () => {
          this.mutateAlert(alert._id, { status: AlertStatus.RESOLVED });
          this.snackBar.open('경보를 해결 처리했습니다.', '닫기', { duration: 2000 });
        },
        error: () => this.snackBar.open('처리 중 오류가 발생했습니다.', '닫기', { duration: 3000 }),
      });
  }

  acknowledgeAll() {
    const activeIds = this.alerts()
      .filter((a) => a.status === AlertStatus.ACTIVE)
      .map((a) => a._id);
    if (activeIds.length === 0) return;
    Promise.all(
      activeIds.map((id) =>
        this.http.patch(`${environment.apiUrl}/alerts/${encodeURIComponent(id)}/acknowledge`, {}).toPromise(),
      ),
    ).then(() => {
      this.load();
      this.snackBar.open(`${activeIds.length}건의 경보를 확인 처리했습니다.`, '닫기', { duration: 2500 });
    });
  }

  toggleSeverityFilter(severity: string) {
    this.filterSeverity = this.filterSeverity === severity ? '' : severity;
    this.load();
  }

  resetFilters() {
    this.filterSeverity = ''; this.filterType = ''; this.filterStatus = 'ACTIVE';
    this.pageIndex = 0; this.load();
  }

  onPage(e: PageEvent) { this.pageIndex = e.pageIndex; this.pageSize = e.pageSize; this.load(); }

  readonly activeCount   = () => this.alerts().filter((a) => a.status === AlertStatus.ACTIVE).length;
  readonly criticalCount = () =>
    this.alerts().filter((a) => a.severity === SeverityLevel.CRITICAL && a.status === AlertStatus.ACTIVE).length;

  countBySeverity(s: string) { return this.alerts().filter((a) => a.severity === s).length; }
  sevIcon(s: string)  { return SEVERITY_ICONS[s]  ?? 'info'; }
  sevLabel(s: string) { return SEVERITY_LABELS[s] ?? s; }
  staLabel(s: string) { return STATUS_LABELS[s]   ?? s; }
  typeLabel(t: string) { return ALERT_TYPE_LABELS[t] ?? t; }

  private mutateAlert(id: string, patch: Partial<Alert>) {
    this.alerts.update((list) => list.map((a) => a._id === id ? { ...a, ...patch } : a));
  }
}
