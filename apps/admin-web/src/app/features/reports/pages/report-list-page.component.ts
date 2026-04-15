// apps/admin-web/src/app/features/reports/pages/report-list-page.component.ts
// 보고서 목록 페이지 — 상태 배지, 재시도, 삭제, 다운로드
import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
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
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { Report, ReportType, REPORT_TYPE_LABELS } from '@ax/shared';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { environment } from '../../../../environments/environment';

type ReportStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

interface StatusConfig { label: string; icon: string; }

const STATUS_CONFIG: Record<ReportStatus, StatusConfig> = {
  QUEUED:     { label: '대기 중', icon: 'schedule' },
  PROCESSING: { label: '생성 중', icon: 'hourglass_top' },
  COMPLETED:  { label: '완료',    icon: 'check_circle' },
  FAILED:     { label: '실패',    icon: 'error' },
};

@Component({
  selector: 'ax-report-list-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatTableModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatFormFieldModule, MatInputModule,
    MatTooltipModule, MatProgressBarModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatPaginatorModule, MatMenuModule, MatDividerModule,
    EmptyStateComponent,
  ],
  template: `
    <!-- 페이지 헤더 -->
    <div class="ax-report-header">
      <div class="ax-report-header__identity">
        <div class="ax-report-header__icon-wrap">
          <mat-icon>description</mat-icon>
        </div>
        <div>
          <h1 class="ax-report-header__title">보고서 목록</h1>
          <p class="ax-report-header__desc">총 {{ total() }}건의 보고서</p>
        </div>
      </div>
      <button mat-flat-button color="primary" routerLink="generate">
        <mat-icon>picture_as_pdf</mat-icon> 보고서 생성
      </button>
    </div>

    <!-- 상태 요약 칩 -->
    <div class="ax-report-status-chips">
      @for (s of statusSummary(); track s.status) {
        <button
          class="ax-report-status-chip ax-report-status-chip--{{ s.status.toLowerCase() }}"
          [class.ax-report-status-chip--active]="filterStatus === s.status"
          (click)="filterStatus = s.status; load()"
        >
          <mat-icon class="ax-report-status-chip__icon">{{ s.icon }}</mat-icon>
          <span class="ax-report-status-chip__label">{{ s.label }}</span>
          <span class="ax-report-status-chip__count">{{ s.count }}</span>
        </button>
      }
      @if (filterStatus) {
        <button mat-icon-button (click)="filterStatus = ''; load()" matTooltip="상태 필터 해제">
          <mat-icon>close</mat-icon>
        </button>
      }
    </div>

    <!-- 필터 바 -->
    <div class="ax-filter-bar">
      <div class="ax-filter-bar__filters">
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>보고서 유형</mat-label>
          <mat-select [(ngModel)]="filterType" (ngModelChange)="load()">
            <mat-option value="">전체</mat-option>
            @for (t of reportTypeItems; track t.value) {
              <mat-option [value]="t.value">{{ t.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>시작일</mat-label>
          <input matInput type="date" [(ngModel)]="filterDateFrom" (change)="load()" />
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>종료일</mat-label>
          <input matInput type="date" [(ngModel)]="filterDateTo" (change)="load()" />
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="ax-report-search">
          <mat-label>제목 검색</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [(ngModel)]="filterSearch" (keyup.enter)="load()" placeholder="Enter로 검색" />
        </mat-form-field>
      </div>
      <div class="ax-filter-bar__actions">
        <button mat-stroked-button (click)="resetFilters()">
          <mat-icon>clear_all</mat-icon> 초기화
        </button>
      </div>
    </div>

    <!-- 보고서 테이블 -->
    <div class="ax-table-container">
      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }
      <table mat-table [dataSource]="reports()" class="ax-report-table">

        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef style="width:110px">상태</th>
          <td mat-cell *matCellDef="let r">
            <div class="ax-report-status-badge ax-report-status-badge--{{ r.status?.toLowerCase() ?? 'completed' }}">
              @if (r.status === 'PROCESSING') {
                <mat-spinner diameter="14" />
              } @else {
                <mat-icon class="ax-report-status-badge__icon">{{ statusConfig(r.status).icon }}</mat-icon>
              }
              <span>{{ statusConfig(r.status).label }}</span>
            </div>
          </td>
        </ng-container>

        <ng-container matColumnDef="reportType">
          <th mat-header-cell *matHeaderCellDef style="width:140px">유형</th>
          <td mat-cell *matCellDef="let r">
            <span class="ax-report-type-badge">{{ reportTypeLabel(r.reportType) }}</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="title">
          <th mat-header-cell *matHeaderCellDef>제목</th>
          <td mat-cell *matCellDef="let r">
            <div class="ax-report-title-cell">
              <span class="ax-report-title">{{ r.title || '(제목 없음)' }}</span>
              @if (r.isPublic) {
                <mat-icon class="ax-report-public-icon" matTooltip="공개 보고서">public</mat-icon>
              }
            </div>
          </td>
        </ng-container>

        <ng-container matColumnDef="fileSize">
          <th mat-header-cell *matHeaderCellDef style="width:90px">크기</th>
          <td mat-cell *matCellDef="let r">
            <span class="ax-report-meta">{{ formatSize(r.fileSize) }}</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="generatedBy">
          <th mat-header-cell *matHeaderCellDef style="width:110px">생성자</th>
          <td mat-cell *matCellDef="let r">
            <span class="ax-report-meta">{{ r.generatedBy }}</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="generatedAt">
          <th mat-header-cell *matHeaderCellDef style="width:140px">생성일시</th>
          <td mat-cell *matCellDef="let r">
            <span class="ax-report-meta">{{ r.generatedAt | date:'yyyy-MM-dd HH:mm' }}</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef style="width:48px"></th>
          <td mat-cell *matCellDef="let r">
            <button mat-icon-button [matMenuTriggerFor]="menu" [matMenuTriggerData]="{report: r}">
              <mat-icon>more_vert</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columns; sticky: true"></tr>
        <tr mat-row *matRowDef="let r; columns: columns;"
          [class.ax-report-row--processing]="r.status === 'PROCESSING'"
          [class.ax-report-row--failed]="r.status === 'FAILED'"></tr>
      </table>

      @if (!loading() && reports().length === 0) {
        <ax-empty-state
          type="empty"
          icon="description"
          title="조건에 맞는 보고서가 없습니다"
          description="필터를 변경하거나 새 보고서를 생성해 보세요"
          primaryLabel="보고서 생성하기"
          primaryIcon="picture_as_pdf"
          (primaryAction)="null"
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

    <!-- 행 액션 메뉴 -->
    <mat-menu #menu="matMenu">
      <ng-template matMenuContent let-report="report">
        @if (report.status === 'COMPLETED') {
          <button mat-menu-item (click)="download(report)">
            <mat-icon>download</mat-icon> 다운로드
          </button>
        }
        @if (report.status === 'FAILED') {
          <button mat-menu-item (click)="retry(report)">
            <mat-icon>refresh</mat-icon> 재시도
          </button>
        }
        <mat-divider />
        <button mat-menu-item (click)="remove(report)">
          <mat-icon color="warn">delete</mat-icon>
          <span class="ax-report-delete-label">삭제</span>
        </button>
      </ng-template>
    </mat-menu>
  `,
  styles: [`
    /* ── 헤더 ── */
    .ax-report-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: var(--ax-spacing-4);
      margin-bottom: var(--ax-spacing-5);
    }
    .ax-report-header__identity {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-3);
    }
    .ax-report-header__icon-wrap {
      width: 44px; height: 44px;
      border-radius: var(--ax-radius-md);
      background: var(--ax-color-brand-primary);
      display: flex; align-items: center; justify-content: center;
      color: #fff; flex-shrink: 0;
    }
    .ax-report-header__title {
      margin: 0;
      font-size: var(--ax-font-size-xl);
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
      line-height: 1.3;
    }
    .ax-report-header__desc {
      margin: 2px 0 0;
      font-size: var(--ax-font-size-sm);
      color: var(--ax-color-text-secondary);
    }

    /* ── 상태 칩 ── */
    .ax-report-status-chips {
      display: flex;
      gap: var(--ax-spacing-2);
      align-items: center;
      margin-bottom: var(--ax-spacing-3);
      flex-wrap: wrap;
    }
    .ax-report-status-chip {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-1);
      padding: 4px 12px;
      border: 1.5px solid var(--ax-color-border-muted);
      border-radius: var(--ax-radius-full);
      background: var(--ax-color-bg-surface);
      cursor: pointer;
      transition: background 0.15s;
    }
    .ax-report-status-chip:hover,
    .ax-report-status-chip--active { background: var(--ax-color-bg-surface-alt); }
    .ax-report-status-chip__icon { font-size: 14px; width: 14px; height: 14px; }
    .ax-report-status-chip__label { font-size: var(--ax-font-size-xs); font-weight: var(--ax-font-weight-medium); }
    .ax-report-status-chip__count {
      font-size: var(--ax-font-size-xs);
      font-weight: var(--ax-font-weight-bold);
      background: var(--ax-color-bg-surface-alt);
      border-radius: var(--ax-radius-full);
      padding: 0 6px;
    }
    .ax-report-status-chip--queued     { border-color: var(--ax-color-text-tertiary); }
    .ax-report-status-chip--queued .ax-report-status-chip__icon,
    .ax-report-status-chip--queued .ax-report-status-chip__label { color: var(--ax-color-text-secondary); }
    .ax-report-status-chip--processing { border-color: var(--ax-color-warning); }
    .ax-report-status-chip--processing .ax-report-status-chip__icon,
    .ax-report-status-chip--processing .ax-report-status-chip__label { color: var(--ax-color-warning); }
    .ax-report-status-chip--completed  { border-color: var(--ax-color-success); }
    .ax-report-status-chip--completed .ax-report-status-chip__icon,
    .ax-report-status-chip--completed .ax-report-status-chip__label { color: var(--ax-color-success); }
    .ax-report-status-chip--failed     { border-color: var(--ax-color-danger); }
    .ax-report-status-chip--failed .ax-report-status-chip__icon,
    .ax-report-status-chip--failed .ax-report-status-chip__label { color: var(--ax-color-danger); }

    /* ── 테이블 ── */
    .ax-report-table { width: 100%; }
    .ax-report-search { flex: 1; min-width: 180px; }
    th.mat-mdc-header-cell {
      font-weight: var(--ax-font-weight-semibold);
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-secondary);
    }
    td.mat-mdc-cell {
      font-size: var(--ax-font-size-sm);
      padding: 0 var(--ax-spacing-2);
    }

    /* 상태 배지 */
    .ax-report-status-badge {
      display: flex; align-items: center; gap: 4px;
      font-size: var(--ax-font-size-xs);
      font-weight: var(--ax-font-weight-medium);
    }
    .ax-report-status-badge__icon { font-size: 13px; width: 13px; height: 13px; }
    .ax-report-status-badge--queued     { color: var(--ax-color-text-secondary); }
    .ax-report-status-badge--processing { color: var(--ax-color-warning); }
    .ax-report-status-badge--completed  { color: var(--ax-color-success); }
    .ax-report-status-badge--failed     { color: var(--ax-color-danger); }

    /* 유형 배지 */
    .ax-report-type-badge {
      display: inline-block;
      background: var(--ax-color-info-subtle);
      color: var(--ax-color-info);
      border-radius: var(--ax-radius-sm);
      padding: 2px 8px;
      font-size: var(--ax-font-size-xs);
      font-weight: var(--ax-font-weight-medium);
    }

    /* 제목 셀 */
    .ax-report-title-cell { display: flex; align-items: center; gap: var(--ax-spacing-1); }
    .ax-report-title { font-weight: var(--ax-font-weight-medium); }
    .ax-report-public-icon {
      font-size: 14px; width: 14px; height: 14px;
      color: var(--ax-color-text-tertiary);
    }

    /* 메타 텍스트 */
    .ax-report-meta {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-secondary);
    }

    /* 행 배경 */
    .ax-report-row--processing td { background: color-mix(in srgb, var(--ax-color-warning-subtle) 50%, transparent); }
    .ax-report-row--failed td     { background: color-mix(in srgb, var(--ax-color-danger-subtle)  50%, transparent); }

    /* 삭제 메뉴 */
    .ax-report-delete-label { color: var(--ax-color-danger); }
  `],
})
export class ReportListPageComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);

  readonly reports = signal<(Report & { status?: ReportStatus })[]>([]);
  readonly loading = signal(false);
  readonly total = signal(0);

  columns = ['status', 'reportType', 'title', 'fileSize', 'generatedBy', 'generatedAt', 'actions'];

  filterType = '';
  filterStatus = '';
  filterDateFrom = '';
  filterDateTo = '';
  filterSearch = '';
  pageSize = 20;
  pageIndex = 0;

  private pollTimer: ReturnType<typeof setInterval> | null = null;

  readonly reportTypeItems = Object.entries(REPORT_TYPE_LABELS).map(
    ([value, label]) => ({ value, label }),
  );

  readonly statusSummary = computed(() => {
    const counts: Partial<Record<ReportStatus, number>> = {};
    for (const r of this.reports()) {
      const s = (r.status ?? 'COMPLETED') as ReportStatus;
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return (Object.keys(STATUS_CONFIG) as ReportStatus[])
      .filter((s) => (counts[s] ?? 0) > 0)
      .map((s) => ({ status: s, count: counts[s]!, ...STATUS_CONFIG[s] }));
  });

  ngOnInit() {
    this.load();
    this.pollTimer = setInterval(() => {
      const hasPending = this.reports().some(
        (r) => r.status === 'QUEUED' || r.status === 'PROCESSING',
      );
      if (hasPending) this.load();
    }, 10_000);
  }

  ngOnDestroy() {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  load() {
    this.loading.set(true);
    const params = new URLSearchParams({
      page: String(this.pageIndex + 1),
      limit: String(this.pageSize),
      ...(this.filterType && { reportType: this.filterType }),
      ...(this.filterStatus && { status: this.filterStatus }),
      ...(this.filterDateFrom && { dateFrom: this.filterDateFrom }),
      ...(this.filterDateTo && { dateTo: this.filterDateTo }),
      ...(this.filterSearch && { search: this.filterSearch }),
    });
    this.http.get<any>(`${environment.apiUrl}/reports?${params}`).subscribe({
      next: (res) => {
        this.reports.set(res.data ?? []);
        this.total.set(res.meta?.total ?? (res.data ?? []).length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  download(report: Report & { status?: ReportStatus }) {
    this.http
      .get<any>(`${environment.apiUrl}/reports/${encodeURIComponent(report._id)}/download-url`)
      .subscribe({
        next: (res) => {
          const url = res.data?.url ?? res.url;
          if (url) window.open(url, '_blank');
        },
        error: () =>
          this.snackBar.open('다운로드 URL을 가져오지 못했습니다.', '닫기', { duration: 3000 }),
      });
  }

  retry(report: Report & { status?: ReportStatus }) {
    this.http
      .post<any>(`${environment.apiUrl}/reports/generate`, {
        reportType: report.reportType,
        complexId: (report as any).complexId,
        projectId: (report as any).projectId,
        sessionId: (report as any).sessionId,
        title: report.title,
      })
      .subscribe({
        next: () => {
          this.snackBar.open('보고서 재생성을 요청했습니다.', '닫기', { duration: 2000 });
          this.load();
        },
        error: () =>
          this.snackBar.open('재시도 요청에 실패했습니다.', '닫기', { duration: 3000 }),
      });
  }

  remove(report: Report & { status?: ReportStatus }) {
    if (!confirm(`"${report.title || '보고서'}"를 삭제하시겠습니까?`)) return;
    this.http
      .delete<any>(`${environment.apiUrl}/reports/${encodeURIComponent(report._id)}`)
      .subscribe({
        next: () => {
          this.snackBar.open('삭제되었습니다.', '닫기', { duration: 2000 });
          this.load();
        },
        error: () =>
          this.snackBar.open('삭제에 실패했습니다.', '닫기', { duration: 3000 }),
      });
  }

  resetFilters() {
    this.filterType = '';
    this.filterStatus = '';
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.filterSearch = '';
    this.pageIndex = 0;
    this.load();
  }

  onPage(e: PageEvent) {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.load();
  }

  statusConfig(status: string): StatusConfig {
    return STATUS_CONFIG[(status as ReportStatus)] ?? STATUS_CONFIG.COMPLETED;
  }

  reportTypeLabel(t: string): string {
    return (REPORT_TYPE_LABELS as Record<string, string>)[t] ?? t;
  }

  formatSize(bytes: number): string {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}
