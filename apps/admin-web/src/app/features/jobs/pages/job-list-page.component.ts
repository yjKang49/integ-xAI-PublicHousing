// apps/admin-web/src/app/features/jobs/pages/job-list-page.component.ts
import {
  Component, OnInit, OnDestroy, inject, signal, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { JobsApi } from '../data-access/jobs.api';
import {
  PageHeaderComponent,
  StatusBadgeComponent,
  EmptyStateComponent,
  SkeletonComponent,
  BadgeVariant,
} from '../../../shared/components';

// Status → BadgeVariant
const STATUS_VARIANT: Record<string, BadgeVariant> = {
  PENDING:   'neutral',
  QUEUED:    'info',
  RUNNING:   'warning',
  COMPLETED: 'success',
  FAILED:    'danger',
  CANCELLED: 'neutral',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: '대기', QUEUED: '큐 대기', RUNNING: '실행 중',
  COMPLETED: '완료', FAILED: '실패', CANCELLED: '취소됨',
};

const PRIORITY_VARIANT: Record<string, BadgeVariant> = {
  HIGH: 'danger', NORMAL: 'info', LOW: 'neutral',
};
const PRIORITY_LABELS: Record<string, string> = {
  HIGH: '높음', NORMAL: '보통', LOW: '낮음',
};

const JOB_TYPE_LABELS: Record<string, string> = {
  AI_IMAGE_ANALYSIS:       'AI 이미지 분석',
  DRONE_VIDEO_ANALYSIS:    '드론 영상 분석',
  CRACK_WIDTH_MEASUREMENT: '균열 폭 측정',
  REPORT_GENERATION:       '보고서 생성',
  RPA_BILL_GENERATION:     'RPA 고지서',
  RPA_CONTRACT_EXPIRY:     'RPA 계약만료',
  RPA_COMPLAINT_INTAKE:    'RPA 민원분류',
  SCHEDULE_AUTO_GENERATE:  '일정 자동생성',
};

const ACTIVE_STATUSES    = new Set(['PENDING', 'QUEUED', 'RUNNING']);
const CANCELLABLE_STATUSES = new Set(['PENDING', 'QUEUED']);

@Component({
  selector: 'ax-job-list-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatTableModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressBarModule, MatPaginatorModule,
    MatTooltipModule, MatFormFieldModule, MatSnackBarModule,
    PageHeaderComponent, StatusBadgeComponent, EmptyStateComponent, SkeletonComponent,
  ],
  template: `
    <ax-page-header
      title="비동기 작업 현황"
      description="AI 분석·RPA·보고서 생성 등 백그라운드 작업 모니터링"
      icon="pending_actions">
      <div ax-page-actions>
        @if (runningCount() > 0) {
          <div class="running-badge">
            <mat-icon class="ax-spinning">sync</mat-icon>
            <span>실행 중 {{ runningCount() }}건</span>
          </div>
        }
        <button mat-stroked-button (click)="load()">
          <mat-icon>refresh</mat-icon> 새로고침
        </button>
      </div>
    </ax-page-header>

    <!-- Filter bar -->
    <div class="ax-filter-bar">
      <div class="ax-filter-bar__filters">
        <mat-form-field appearance="outline" class="ax-filter-bar__field">
          <mat-label>상태</mat-label>
          <mat-select [(ngModel)]="filterStatus" (ngModelChange)="onFilterChange()">
            <mat-option value="">모든 상태</mat-option>
            @for (s of statusKeys; track s) {
              <mat-option [value]="s">{{ statusLabel(s) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="ax-filter-bar__field">
          <mat-label>유형</mat-label>
          <mat-select [(ngModel)]="filterType" (ngModelChange)="onFilterChange()">
            <mat-option value="">모든 유형</mat-option>
            @for (t of typeKeys; track t) {
              <mat-option [value]="t">{{ typeLabel(t) }}</mat-option>
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
        <table mat-table [dataSource]="jobs()" class="ax-job-table">

          <ng-container matColumnDef="type">
            <th mat-header-cell *matHeaderCellDef>유형</th>
            <td mat-cell *matCellDef="let job">
              <span class="ax-text-body job-type">{{ typeLabel(job.type) }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>상태</th>
            <td mat-cell *matCellDef="let job">
              <ax-status-badge
                [variant]="getStatusVariant(job.status)"
                [label]="statusLabel(job.status)"
                [class.badge-animated]="job.status === 'RUNNING'" />
            </td>
          </ng-container>

          <ng-container matColumnDef="progress">
            <th mat-header-cell *matHeaderCellDef>진행</th>
            <td mat-cell *matCellDef="let job">
              @if (job.status === 'RUNNING') {
                <div class="progress-cell">
                  <mat-progress-bar mode="determinate" [value]="job.progress ?? 0" class="job-pbar" />
                  <span class="progress-pct ax-text-meta">{{ job.progress ?? 0 }}%</span>
                </div>
              } @else if (job.status === 'COMPLETED') {
                <span class="progress-done ax-text-meta">100%</span>
              } @else {
                <span class="ax-text-meta">—</span>
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="priority">
            <th mat-header-cell *matHeaderCellDef>우선순위</th>
            <td mat-cell *matCellDef="let job">
              <ax-status-badge [variant]="getPriorityVariant(job.priority)" [label]="priorityLabel(job.priority)" />
            </td>
          </ng-container>

          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef>생성일시</th>
            <td mat-cell *matCellDef="let job" class="ax-text-meta">{{ job.createdAt | date:'MM/dd HH:mm' }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let job">
              <button mat-icon-button color="primary"
                [routerLink]="['/jobs', job._id]" matTooltip="상세 보기">
                <mat-icon>open_in_new</mat-icon>
              </button>
              @if (isCancellable(job)) {
                <button mat-icon-button color="warn" matTooltip="작업 취소"
                  (click)="cancel(job); $event.stopPropagation()">
                  <mat-icon>cancel</mat-icon>
                </button>
              }
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns;"
            class="ax-table-row"
            [class.ax-table-row--running]="row.status === 'RUNNING'"
            [class.ax-table-row--failed]="row.status === 'FAILED'"></tr>
        </table>

        @if (jobs().length === 0) {
          <ax-empty-state
            type="search-no-result"
            title="조건에 맞는 작업이 없습니다"
            description="필터를 변경하거나 초기화 후 다시 확인해 주세요."
            (primaryAction)="resetFilters()" />
        }
      }

      <mat-paginator
        [length]="total()"
        [pageSize]="pageSize"
        [pageSizeOptions]="[10, 20, 50]"
        (page)="onPage($event)"
        showFirstLastButtons />
    </div>
  `,
  styles: [`
    /* Running badge in header */
    .running-badge {
      display: flex;
      align-items: center;
      gap: var(--ax-space-2);
      background: var(--ax-color-warning-subtle);
      color: var(--ax-color-warning);
      padding: var(--ax-space-2) var(--ax-space-4);
      border-radius: var(--ax-radius-pill);
      font-size: var(--ax-font-size-sm);
      font-weight: 600;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }

    /* Filter */
    .ax-filter-bar__field { min-width: 150px; }

    /* Table */
    .ax-job-table { width: 100%; }

    .ax-table-row {
      transition: background 0.12s;
      &:hover { background: var(--ax-color-bg-surface-alt); }
      &--running { background: rgba(245, 158, 11, 0.04); }
      &--failed  { background: rgba(220, 38, 38, 0.04); }
    }

    .job-type { font-weight: 500; }

    /* Animated badge for RUNNING jobs */
    .badge-animated {
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
      animation: pulse 1.8s ease-in-out infinite;
    }

    /* Progress */
    .progress-cell {
      display: flex;
      align-items: center;
      gap: var(--ax-space-2);
    }
    .job-pbar {
      flex: 1;
      border-radius: var(--ax-radius-sm);
    }
    .progress-pct {
      min-width: 32px;
      text-align: right;
      color: var(--ax-color-warning);
      font-weight: 600;
    }
    .progress-done {
      color: var(--ax-color-success);
      font-weight: 600;
    }

    mat-paginator { border-top: 1px solid var(--ax-color-border); }
  `],
})
export class JobListPageComponent implements OnInit, OnDestroy {
  private readonly jobsApi = inject(JobsApi);
  private readonly snackBar = inject(MatSnackBar);

  readonly jobs    = signal<any[]>([]);
  readonly loading = signal(false);
  readonly total   = signal(0);

  columns = ['type', 'status', 'progress', 'priority', 'createdAt', 'actions'];

  filterStatus = '';
  filterType   = '';
  pageSize     = 10;
  pageIndex    = 0;

  readonly statusKeys = Object.keys(STATUS_LABELS);
  readonly typeKeys   = Object.keys(JOB_TYPE_LABELS);

  readonly runningCount = computed(() =>
    this.jobs().filter((j) => ACTIVE_STATUSES.has(j.status)).length,
  );

  private pollTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.load();
    this.pollTimer = setInterval(() => {
      const hasActive = this.jobs().some((j) => ACTIVE_STATUSES.has(j.status));
      if (hasActive) this.load();
    }, 10_000);
  }

  ngOnDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  load(): void {
    this.loading.set(true);
    this.jobsApi
      .list({
        ...(this.filterStatus && { status: this.filterStatus }),
        ...(this.filterType   && { type:   this.filterType }),
        page:  this.pageIndex + 1,
        limit: this.pageSize,
      })
      .subscribe({
        next: (res) => {
          this.jobs.set(res.data ?? []);
          this.total.set(res.meta?.total ?? (res.data ?? []).length);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  cancel(job: any): void {
    this.jobsApi.cancel(job._id).subscribe({
      next: () => {
        this.snackBar.open('작업이 취소되었습니다.', '닫기', { duration: 2000 });
        this.load();
      },
      error: () => this.snackBar.open('취소에 실패했습니다.', '닫기', { duration: 3000 }),
    });
  }

  onFilterChange(): void { this.pageIndex = 0; this.load(); }

  resetFilters(): void {
    this.filterStatus = ''; this.filterType = ''; this.pageIndex = 0; this.load();
  }

  onPage(e: PageEvent): void { this.pageIndex = e.pageIndex; this.pageSize = e.pageSize; this.load(); }

  isCancellable(job: any): boolean { return CANCELLABLE_STATUSES.has(job.status); }

  getStatusVariant(status: string): BadgeVariant { return STATUS_VARIANT[status] ?? 'neutral'; }
  statusLabel(status: string): string { return STATUS_LABELS[status] ?? status; }
  getPriorityVariant(priority: string): BadgeVariant { return PRIORITY_VARIANT[priority] ?? 'neutral'; }
  priorityLabel(priority: string): string { return PRIORITY_LABELS[priority] ?? priority; }
  typeLabel(type: string): string { return JOB_TYPE_LABELS[type] ?? type; }
}
