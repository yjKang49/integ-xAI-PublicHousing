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
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { InspectionProject, InspectionStatus } from '@ax/shared';
import { environment } from '../../../../../environments/environment';
import {
  PageHeaderComponent,
  StatusBadgeComponent,
  EmptyStateComponent,
  SkeletonComponent,
  BadgeVariant,
} from '../../../../shared/components';

const STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant; tokenColor: string }> = {
  PLANNED:         { label: '계획됨',    variant: 'info',    tokenColor: 'var(--ax-color-info)' },
  IN_PROGRESS:     { label: '진행 중',   variant: 'warning', tokenColor: 'var(--ax-color-warning)' },
  PENDING_REVIEW:  { label: '검토 대기', variant: 'warning', tokenColor: 'var(--ax-color-warning)' },
  REVIEWED:        { label: '검토 완료', variant: 'success', tokenColor: 'var(--ax-color-success)' },
  COMPLETED:       { label: '완료',      variant: 'success', tokenColor: 'var(--ax-color-success)' },
  CANCELLED:       { label: '취소됨',    variant: 'neutral', tokenColor: 'var(--ax-color-text-secondary)' },
};

const TYPE_LABELS: Record<string, string> = {
  REGULAR: '정기', EMERGENCY: '긴급', SPECIAL: '특별',
};

@Component({
  selector: 'ax-project-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatTableModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatFormFieldModule,
    MatTooltipModule, MatPaginatorModule,
    PageHeaderComponent, StatusBadgeComponent, EmptyStateComponent, SkeletonComponent,
  ],
  template: `
    <ax-page-header
      title="점검 프로젝트"
      description="시설물 정기·긴급·특별 점검 프로젝트 관리"
      icon="assignment"
      [meta]="'전체 ' + total() + '건'">
      <div ax-page-actions>
        <button mat-flat-button color="primary" routerLink="new">
          <mat-icon>add</mat-icon> 새 프로젝트
        </button>
      </div>
    </ax-page-header>

    <!-- Status summary strip -->
    <div class="ax-proj-status-strip">
      @for (s of statusItems; track s.key) {
        <button class="stat-card" [style.--stat-color]="s.config.tokenColor"
          [class.stat-card--active]="filterStatus === s.key"
          (click)="filterByStatus(s.key)">
          <span class="stat-card__value">{{ countByStatus(s.key) }}</span>
          <span class="stat-card__label">{{ s.config.label }}</span>
        </button>
      }
    </div>

    <!-- Filter bar -->
    <div class="ax-filter-bar">
      <div class="ax-filter-bar__filters">
        <mat-form-field appearance="outline" class="ax-filter-bar__field">
          <mat-label>상태</mat-label>
          <mat-select [(ngModel)]="filterStatus" (ngModelChange)="load()">
            <mat-option value="">전체</mat-option>
            @for (s of statusItems; track s.key) {
              <mat-option [value]="s.key">{{ s.config.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="ax-filter-bar__field">
          <mat-label>점검 유형</mat-label>
          <mat-select [(ngModel)]="filterType" (ngModelChange)="load()">
            <mat-option value="">전체</mat-option>
            @for (t of typeItems; track t.value) {
              <mat-option [value]="t.value">{{ t.label }}</mat-option>
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
        <table mat-table [dataSource]="projects()" class="ax-proj-table">

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>상태</th>
            <td mat-cell *matCellDef="let p">
              <ax-status-badge [variant]="getStatusVariant(p.status)" [label]="statusLabel(p.status)" />
            </td>
          </ng-container>

          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>프로젝트명</th>
            <td mat-cell *matCellDef="let p">
              <a [routerLink]="[p._id]" class="project-link">{{ p.name }}</a>
              <div class="project-meta ax-text-meta">{{ typeLabel(p.inspectionType) }} · {{ p.round }}차</div>
            </td>
          </ng-container>

          <ng-container matColumnDef="planned">
            <th mat-header-cell *matHeaderCellDef>계획 기간</th>
            <td mat-cell *matCellDef="let p" class="ax-text-meta">
              {{ p.plannedStartDate | date:'yyyy-MM-dd' }} ~
              {{ p.plannedEndDate | date:'MM-dd' }}
            </td>
          </ng-container>

          <ng-container matColumnDef="sessions">
            <th mat-header-cell *matHeaderCellDef>세션</th>
            <td mat-cell *matCellDef="let p" class="ax-text-meta">
              {{ p.sessionIds?.length ?? 0 }}개
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let p">
              <button mat-icon-button [routerLink]="[p._id]" matTooltip="상세보기">
                <mat-icon>open_in_new</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let p; columns: columns;"
            class="ax-table-row" [routerLink]="[p._id]"></tr>
        </table>

        @if (projects().length === 0) {
          <ax-empty-state
            type="empty"
            title="점검 프로젝트가 없습니다"
            description="새 점검 프로젝트를 생성하거나 필터를 초기화해 주세요."
            primaryLabel="첫 프로젝트 생성"
            (primaryAction)="goNew()"
            (secondaryAction)="resetFilters()" />
        }
      }

      <mat-paginator [length]="total()" [pageSize]="pageSize"
        [pageSizeOptions]="[10, 20, 50]" (page)="onPage($event)" showFirstLastButtons />
    </div>
  `,
  styles: [`
    /* Status summary strip */
    .ax-proj-status-strip {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: var(--ax-space-3);
      margin-bottom: var(--ax-space-4);
    }

    .stat-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--ax-space-1);
      padding: var(--ax-space-3) var(--ax-space-2);
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border);
      border-top: 4px solid var(--stat-color, var(--ax-color-border));
      border-radius: var(--ax-radius-card);
      cursor: pointer;
      font-family: inherit;
      text-align: center;
      transition: transform 0.15s, box-shadow 0.15s;

      &:hover { transform: translateY(-2px); box-shadow: var(--ax-shadow-card-hover); }
      &--active { box-shadow: 0 0 0 2px var(--stat-color); }
    }

    .stat-card__value {
      font-size: var(--ax-font-size-kpi);
      font-weight: 700;
      color: var(--ax-color-text-primary);
      line-height: 1;
    }
    .stat-card__label {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-secondary);
      font-weight: 500;
    }

    /* Filter */
    .ax-filter-bar__field { min-width: 140px; }

    /* Table */
    .ax-proj-table { width: 100%; }

    .ax-table-row {
      cursor: pointer;
      transition: background 0.12s;
      &:hover { background: var(--ax-color-bg-surface-alt); }
    }

    .project-link {
      color: var(--ax-color-brand-primary);
      text-decoration: none;
      font-weight: 500;
      font-size: var(--ax-font-size-sm);
      &:hover { text-decoration: underline; }
    }
    .project-meta { margin-top: 2px; }

    mat-paginator { border-top: 1px solid var(--ax-color-border); }

    @media (max-width: 960px) {
      .ax-proj-status-strip { grid-template-columns: repeat(3, 1fr); }
    }
    @media (max-width: 600px) {
      .ax-proj-status-strip { grid-template-columns: repeat(2, 1fr); }
    }
  `],
})
export class ProjectListComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly projects = signal<InspectionProject[]>([]);
  readonly loading = signal(false);
  readonly total = signal(0);

  columns = ['status', 'name', 'planned', 'sessions', 'actions'];
  filterStatus = '';
  filterType = '';
  pageSize = 20;
  pageIndex = 0;

  readonly statusItems = Object.entries(STATUS_CONFIG).map(([key, config]) => ({ key, config }));
  readonly typeItems = Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }));

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const params = new URLSearchParams({
      page: String(this.pageIndex + 1), limit: String(this.pageSize),
      ...(this.filterStatus && { status: this.filterStatus }),
      ...(this.filterType && { inspectionType: this.filterType }),
    });
    this.http.get<any>(`${environment.apiUrl}/projects?${params}`).subscribe({
      next: (res) => {
        this.projects.set(res.data ?? []);
        this.total.set(res.meta?.total ?? (res.data ?? []).length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  filterByStatus(status: string) {
    this.filterStatus = this.filterStatus === status ? '' : status;
    this.load();
  }

  resetFilters() { this.filterStatus = ''; this.filterType = ''; this.pageIndex = 0; this.load(); }

  goNew() { /* routerLink="new" handles navigation via PageHeader action */ }

  onPage(e: PageEvent) { this.pageIndex = e.pageIndex; this.pageSize = e.pageSize; this.load(); }

  countByStatus(status: string) { return this.projects().filter((p) => p.status === status).length; }

  getStatusVariant(s: string): BadgeVariant { return STATUS_CONFIG[s]?.variant ?? 'neutral'; }
  statusLabel(s: string) { return STATUS_CONFIG[s]?.label ?? s; }
  typeLabel(t: string) { return TYPE_LABELS[t] ?? t; }
}
