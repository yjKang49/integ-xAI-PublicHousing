// apps/admin-web/src/app/features/drone/pages/drone-mission-list-page.component.ts
import {
  Component, OnInit, OnDestroy, inject, signal, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DroneApi } from '../data-access/drone.api';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

const STATUS_LABELS: Record<string, string> = {
  CREATED: '생성됨', UPLOADING: '업로드 중', UPLOADED: '업로드 완료',
  PROCESSING: '분석 중', COMPLETED: '완료', FAILED: '실패',
};

@Component({
  selector: 'ax-drone-mission-list-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatTableModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatFormFieldModule,
    MatPaginatorModule, MatProgressBarModule, MatTooltipModule, MatSnackBarModule,
    EmptyStateComponent,
  ],
  template: `
    <!-- 헤더 -->
    <div class="ax-drone-header">
      <div class="ax-drone-header__identity">
        <div class="ax-drone-header__icon-wrap">
          <mat-icon>flight</mat-icon>
        </div>
        <div>
          <h1 class="ax-drone-header__title">드론 점검 미션</h1>
          <p class="ax-drone-header__desc">드론 비행 영상 업로드 및 AI 균열 분석 파이프라인 관리</p>
        </div>
      </div>
      <div class="ax-drone-header__right">
        @if (processingCount() > 0) {
          <div class="ax-drone-badge ax-drone-badge--processing">
            <mat-icon class="ax-drone-badge__spin">sync</mat-icon>
            처리 중 {{ processingCount() }}건
          </div>
        }
        <button mat-stroked-button (click)="load()">
          <mat-icon>refresh</mat-icon> 새로고침
        </button>
        <button mat-flat-button color="primary" routerLink="/drone/new">
          <mat-icon>add</mat-icon> 미션 생성
        </button>
      </div>
    </div>

    <!-- 필터 바 -->
    <div class="ax-filter-bar">
      <div class="ax-filter-bar__filters">
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>상태</mat-label>
          <mat-select [(ngModel)]="filterStatus" (ngModelChange)="onFilterChange()">
            <mat-option value="">모든 상태</mat-option>
            @for (s of statusKeys; track s) {
              <mat-option [value]="s">{{ statusLabel(s) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>
      @if (filterStatus) {
        <div class="ax-filter-bar__actions">
          <button mat-stroked-button (click)="resetFilters()">
            <mat-icon>clear_all</mat-icon> 초기화
          </button>
        </div>
      }
    </div>

    <!-- 테이블 -->
    <div class="ax-table-container">
      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

      <table mat-table [dataSource]="missions()" class="ax-drone-table">

        <ng-container matColumnDef="title">
          <th mat-header-cell *matHeaderCellDef>미션 제목</th>
          <td mat-cell *matCellDef="let m">
            <div class="ax-drone-mission-title">{{ m.title }}</div>
            <div class="ax-drone-mission-sub">{{ m.pilot }} · {{ m.flightDate }}</div>
          </td>
        </ng-container>

        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>상태</th>
          <td mat-cell *matCellDef="let m">
            <span class="ax-drone-status ax-drone-status--{{ m.status.toLowerCase() }}"
              [class.ax-drone-status--animated]="isAnimated(m.status)">
              {{ statusLabel(m.status) }}
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="media">
          <th mat-header-cell *matHeaderCellDef>미디어</th>
          <td mat-cell *matCellDef="let m">
            <div class="ax-drone-media">
              <mat-icon class="ax-drone-media__icon">videocam</mat-icon>
              <span>{{ videoCount(m) }}</span>
              <mat-icon class="ax-drone-media__icon">image</mat-icon>
              <span>{{ imageCount(m) }}</span>
            </div>
          </td>
        </ng-container>

        <ng-container matColumnDef="frames">
          <th mat-header-cell *matHeaderCellDef>추출 프레임</th>
          <td mat-cell *matCellDef="let m">
            <span class="ax-drone-frame-count">{{ m.totalFrameCount ?? '—' }}</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="drone">
          <th mat-header-cell *matHeaderCellDef>드론 기종</th>
          <td mat-cell *matCellDef="let m">
            <span class="ax-drone-meta">{{ m.droneModel ?? '—' }}</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="createdAt">
          <th mat-header-cell *matHeaderCellDef>생성일시</th>
          <td mat-cell *matCellDef="let m">
            <span class="ax-drone-meta">{{ m.createdAt | date:'MM/dd HH:mm' }}</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef style="width:60px"></th>
          <td mat-cell *matCellDef="let m">
            <button mat-icon-button color="primary"
              [routerLink]="['/drone', m._id]"
              matTooltip="상세 보기">
              <mat-icon>open_in_new</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let r; columns: columns;"
          [class.ax-drone-row--processing]="r.status === 'PROCESSING'"
          [class.ax-drone-row--failed]="r.status === 'FAILED'"></tr>
      </table>

      @if (!loading() && missions().length === 0) {
        <ax-empty-state
          type="empty"
          icon="flight_land"
          title="등록된 드론 미션이 없습니다"
          description="드론 비행 영상을 업로드하여 AI 균열 분석을 시작하세요"
          primaryLabel="첫 미션 생성"
          primaryIcon="add"
          (primaryAction)="null"
        />
      }

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
    .ax-drone-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: var(--ax-spacing-4);
      margin-bottom: var(--ax-spacing-5);
    }
    .ax-drone-header__identity {
      display: flex; align-items: center; gap: var(--ax-spacing-3);
    }
    .ax-drone-header__icon-wrap {
      width: 44px; height: 44px;
      border-radius: var(--ax-radius-md);
      background: var(--ax-color-info);
      display: flex; align-items: center; justify-content: center;
      color: #fff; flex-shrink: 0;
    }
    .ax-drone-header__title {
      margin: 0;
      font-size: var(--ax-font-size-xl);
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
    }
    .ax-drone-header__desc {
      margin: 2px 0 0;
      font-size: var(--ax-font-size-sm);
      color: var(--ax-color-text-secondary);
    }
    .ax-drone-header__right {
      display: flex; align-items: center; gap: var(--ax-spacing-2); flex-wrap: wrap;
    }
    .ax-drone-badge {
      display: inline-flex; align-items: center; gap: var(--ax-spacing-1);
      padding: 4px 12px; border-radius: var(--ax-radius-full);
      font-size: var(--ax-font-size-sm); font-weight: var(--ax-font-weight-semibold);
    }
    .ax-drone-badge--processing {
      background: var(--ax-color-warning-subtle);
      color: var(--ax-color-warning);
      border: 1px solid var(--ax-color-warning-border);
    }
    @keyframes ax-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .ax-drone-badge__spin {
      font-size: 16px; width: 16px; height: 16px;
      animation: ax-spin 1.5s linear infinite;
    }

    /* ── 테이블 ── */
    .ax-drone-table { width: 100%; }
    th.mat-mdc-header-cell {
      font-weight: var(--ax-font-weight-semibold);
      font-size: var(--ax-font-size-xs); color: var(--ax-color-text-secondary);
    }
    td.mat-mdc-cell { font-size: var(--ax-font-size-sm); padding: var(--ax-spacing-2); }

    .ax-drone-mission-title { font-weight: var(--ax-font-weight-semibold); }
    .ax-drone-mission-sub {
      font-size: var(--ax-font-size-xs); color: var(--ax-color-text-tertiary); margin-top: 2px;
    }

    /* 상태 배지 */
    .ax-drone-status {
      display: inline-block; padding: 3px 10px;
      border-radius: var(--ax-radius-full);
      font-size: var(--ax-font-size-xs); font-weight: var(--ax-font-weight-semibold);
    }
    @keyframes ax-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.65; } }
    .ax-drone-status--animated { animation: ax-pulse 1.8s ease-in-out infinite; }
    .ax-drone-status--created    { background: var(--ax-color-bg-surface-alt); color: var(--ax-color-text-tertiary); }
    .ax-drone-status--uploading  { background: var(--ax-color-info-subtle);    color: var(--ax-color-info); }
    .ax-drone-status--uploaded   { background: var(--ax-color-success-subtle); color: var(--ax-color-success); }
    .ax-drone-status--processing { background: var(--ax-color-warning-subtle); color: var(--ax-color-warning); }
    .ax-drone-status--completed  { background: var(--ax-color-success-subtle); color: var(--ax-color-success); }
    .ax-drone-status--failed     { background: var(--ax-color-danger-subtle);  color: var(--ax-color-danger); }

    /* 미디어 */
    .ax-drone-media {
      display: flex; align-items: center; gap: var(--ax-spacing-1);
      font-size: var(--ax-font-size-sm); color: var(--ax-color-text-secondary);
    }
    .ax-drone-media__icon {
      font-size: 14px; width: 14px; height: 14px; color: var(--ax-color-text-tertiary);
    }
    .ax-drone-frame-count {
      font-size: var(--ax-font-size-sm);
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-info);
    }
    .ax-drone-meta { font-size: var(--ax-font-size-xs); color: var(--ax-color-text-secondary); }

    /* 행 배경 */
    .ax-drone-row--processing td { background: color-mix(in srgb, var(--ax-color-warning-subtle) 40%, transparent); }
    .ax-drone-row--failed td     { background: color-mix(in srgb, var(--ax-color-danger-subtle)  40%, transparent); }
  `],
})
export class DroneMissionListPageComponent implements OnInit, OnDestroy {
  private readonly droneApi = inject(DroneApi);
  private readonly snackBar = inject(MatSnackBar);

  readonly missions = signal<any[]>([]);
  readonly loading  = signal(false);
  readonly total    = signal(0);

  columns   = ['title', 'status', 'media', 'frames', 'drone', 'createdAt', 'actions'];
  statusKeys = Object.keys(STATUS_LABELS);
  filterStatus = '';
  pageSize  = 10;
  pageIndex = 0;

  readonly processingCount = computed(() =>
    this.missions().filter(m => ['UPLOADING', 'PROCESSING'].includes(m.status)).length,
  );

  private pollTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit() {
    this.load();
    this.pollTimer = setInterval(() => {
      if (this.processingCount() > 0) this.load();
    }, 10_000);
  }

  ngOnDestroy() {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  load() {
    this.loading.set(true);
    this.droneApi.list({
      ...(this.filterStatus && { status: this.filterStatus }),
      page: this.pageIndex + 1,
      limit: this.pageSize,
    }).subscribe({
      next: (res) => {
        this.missions.set(res.data ?? []);
        this.total.set(res.meta?.total ?? (res.data ?? []).length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onFilterChange() { this.pageIndex = 0; this.load(); }
  resetFilters()   { this.filterStatus = ''; this.pageIndex = 0; this.load(); }
  onPage(e: PageEvent) { this.pageIndex = e.pageIndex; this.pageSize = e.pageSize; this.load(); }

  statusLabel(s: string)  { return STATUS_LABELS[s] ?? s; }
  isAnimated(s: string)   { return s === 'UPLOADING' || s === 'PROCESSING'; }

  videoCount(m: any): number {
    return (m.mediaItems ?? []).filter((i: any) => i.mediaType === 'VIDEO').length;
  }
  imageCount(m: any): number {
    return (m.mediaItems ?? []).filter((i: any) => i.mediaType === 'IMAGE').length;
  }
}
