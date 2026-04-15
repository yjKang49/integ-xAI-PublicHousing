// apps/admin-web/src/app/features/complaints/complaint-list/complaint-list.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Complaint, ComplaintStatus, ComplaintCategory } from '@ax/shared';
import { environment } from '../../../../environments/environment';
import {
  PageHeaderComponent,
  StatusBadgeComponent,
  EmptyStateComponent,
  SkeletonComponent,
  BadgeVariant,
} from '../../../shared/components';

const STATUS_CONFIG: Record<string, { label: string; icon: string; variant: BadgeVariant; tokenColor: string }> = {
  RECEIVED:    { label: '접수',   icon: 'inbox',         variant: 'info',    tokenColor: 'var(--ax-color-info)' },
  ASSIGNED:    { label: '배정',   icon: 'person_add',    variant: 'neutral', tokenColor: 'var(--ax-color-text-secondary)' },
  IN_PROGRESS: { label: '처리중', icon: 'build',         variant: 'warning', tokenColor: 'var(--ax-color-warning)' },
  RESOLVED:    { label: '해결',   icon: 'check_circle',  variant: 'success', tokenColor: 'var(--ax-color-success)' },
  CLOSED:      { label: '완료',   icon: 'done_all',      variant: 'neutral', tokenColor: 'var(--ax-color-text-secondary)' },
};

const PRIORITY_CONFIG: Record<string, { label: string; variant: BadgeVariant; tokenColor: string }> = {
  LOW:    { label: '낮음', variant: 'info',    tokenColor: 'var(--ax-color-info)' },
  MEDIUM: { label: '보통', variant: 'neutral', tokenColor: 'var(--ax-color-text-secondary)' },
  HIGH:   { label: '높음', variant: 'warning', tokenColor: 'var(--ax-color-warning)' },
  URGENT: { label: '긴급', variant: 'danger',  tokenColor: 'var(--ax-color-danger)' },
};

@Component({
  selector: 'ax-complaint-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatTableModule, MatPaginatorModule, MatSortModule,
    MatSelectModule, MatInputModule, MatFormFieldModule,
    MatButtonModule, MatIconModule,
    MatTooltipModule, MatCheckboxModule, MatSnackBarModule,
    PageHeaderComponent, StatusBadgeComponent, EmptyStateComponent, SkeletonComponent,
  ],
  template: `
    <ax-page-header
      title="민원 관리"
      description="입주민 민원 접수·배정·처리 이력 통합 관리"
      icon="support_agent"
      [meta]="'전체 ' + totalCount() + '건'">
      <div ax-page-actions>
        <button mat-flat-button color="primary" routerLink="new">
          <mat-icon>add</mat-icon> 민원 등록
        </button>
      </div>
    </ax-page-header>

    <!-- Status summary strip -->
    <div class="ax-status-strip">
      @for (s of statusSummary(); track s.status) {
        <button class="stat-card" [style.--stat-color]="getStatusTokenColor(s.status)"
          [class.stat-card--active]="filterStatus === s.status"
          (click)="filterByStatus(s.status)">
          <mat-icon class="stat-card__icon">{{ getStatusIcon(s.status) }}</mat-icon>
          <span class="stat-card__value">{{ s.count }}</span>
          <span class="stat-card__label">{{ getStatusLabel(s.status) }}</span>
        </button>
      }
    </div>

    <!-- Filter bar -->
    <div class="ax-filter-bar">
      <div class="ax-filter-bar__search">
        <mat-form-field appearance="outline" class="ax-filter-bar__search-field">
          <mat-label>검색</mat-label>
          <input matInput [(ngModel)]="searchText" (input)="onSearch()" placeholder="제목, 접수자" />
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
      </div>

      <div class="ax-filter-bar__filters">
        <mat-form-field appearance="outline" class="ax-filter-bar__field">
          <mat-label>상태</mat-label>
          <mat-select [(ngModel)]="filterStatus" (ngModelChange)="loadComplaints()">
            <mat-option value="">전체</mat-option>
            @for (s of allStatuses; track s) {
              <mat-option [value]="s">{{ getStatusLabel(s) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="ax-filter-bar__field">
          <mat-label>카테고리</mat-label>
          <mat-select [(ngModel)]="filterCategory" (ngModelChange)="loadComplaints()">
            <mat-option value="">전체</mat-option>
            @for (c of allCategories; track c) {
              <mat-option [value]="c">{{ c }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="ax-filter-bar__field">
          <mat-label>우선순위</mat-label>
          <mat-select [(ngModel)]="filterPriority" (ngModelChange)="loadComplaints()">
            <mat-option value="">전체</mat-option>
            @for (p of allPriorities; track p) {
              <mat-option [value]="p">{{ getPriorityLabel(p) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-checkbox class="overdue-checkbox" [(ngModel)]="overdueOnly" (change)="loadComplaints()">
          기한 초과만
        </mat-checkbox>
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
        <table mat-table [dataSource]="complaints()" matSort (matSortChange)="onSort($event)"
          class="ax-complaint-table">

          <!-- Priority -->
          <ng-container matColumnDef="priority">
            <th mat-header-cell *matHeaderCellDef>우선순위</th>
            <td mat-cell *matCellDef="let c">
              <div class="priority-cell">
                <span class="priority-dot" [style.background]="getPriorityTokenColor(c.priority)"></span>
                <ax-status-badge [variant]="getPriorityVariant(c.priority)" [label]="getPriorityLabel(c.priority)" />
              </div>
            </td>
          </ng-container>

          <!-- Title -->
          <ng-container matColumnDef="title">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>제목</th>
            <td mat-cell *matCellDef="let c">
              <div class="title-cell">
                <a [routerLink]="[c._id]" class="complaint-link">{{ c.title }}</a>
                @if (isOverdue(c)) {
                  <mat-icon class="overdue-icon" matTooltip="처리 기한 초과">schedule</mat-icon>
                }
              </div>
            </td>
          </ng-container>

          <!-- Category -->
          <ng-container matColumnDef="category">
            <th mat-header-cell *matHeaderCellDef>카테고리</th>
            <td mat-cell *matCellDef="let c">
              <span class="category-tag">{{ c.category }}</span>
            </td>
          </ng-container>

          <!-- Status -->
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>상태</th>
            <td mat-cell *matCellDef="let c">
              <ax-status-badge [variant]="getStatusVariant(c.status)" [label]="getStatusLabel(c.status)" />
            </td>
          </ng-container>

          <!-- Submitter -->
          <ng-container matColumnDef="submittedBy">
            <th mat-header-cell *matHeaderCellDef>접수자</th>
            <td mat-cell *matCellDef="let c" class="ax-text-body">{{ c.submittedBy }}</td>
          </ng-container>

          <!-- Assigned to -->
          <ng-container matColumnDef="assignedTo">
            <th mat-header-cell *matHeaderCellDef>담당자</th>
            <td mat-cell *matCellDef="let c">
              @if (c.assignedTo) {
                <ax-status-badge variant="info" [label]="c.assignedTo" />
              } @else {
                <span class="ax-text-meta unassigned-text">미배정</span>
              }
            </td>
          </ng-container>

          <!-- Due date -->
          <ng-container matColumnDef="dueDate">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>처리 기한</th>
            <td mat-cell *matCellDef="let c">
              <span [class.overdue-date]="isOverdue(c)" class="ax-text-meta">
                {{ c.dueDate ? (c.dueDate | date:'MM/dd HH:mm') : '—' }}
              </span>
            </td>
          </ng-container>

          <!-- Submitted at -->
          <ng-container matColumnDef="submittedAt">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>접수일시</th>
            <td mat-cell *matCellDef="let c" class="ax-text-meta">{{ c.submittedAt | date:'MM/dd HH:mm' }}</td>
          </ng-container>

          <!-- Actions -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let c">
              <button mat-icon-button [routerLink]="[c._id]" matTooltip="상세보기">
                <mat-icon>open_in_new</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"
            class="ax-table-row"
            [class.ax-table-row--overdue]="isOverdue(row)"></tr>
        </table>

        @if (complaints().length === 0) {
          <ax-empty-state
            type="search-no-result"
            title="검색 결과가 없습니다"
            description="필터 조건을 변경하거나 초기화 후 다시 확인해 주세요."
            (primaryAction)="resetFilters()" />
        }
      }

      <mat-paginator
        [length]="totalCount()"
        [pageSize]="pageSize"
        [pageSizeOptions]="[10, 20, 50]"
        (page)="onPage($event)"
        showFirstLastButtons />
    </div>
  `,
  styles: [`
    /* Status summary strip */
    .ax-status-strip {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: var(--ax-space-3);
      margin-bottom: var(--ax-space-4);
    }

    .stat-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--ax-space-1);
      padding: var(--ax-space-4) var(--ax-space-3);
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

    .stat-card__icon {
      color: var(--stat-color, var(--ax-color-text-secondary));
      font-size: 20px;
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

    /* Filter bar */
    .ax-filter-bar__field { min-width: 140px; }
    .ax-filter-bar__search-field { min-width: 220px; }
    .overdue-checkbox { align-self: center; }

    /* Table */
    .ax-complaint-table { width: 100%; }

    .ax-table-row {
      cursor: pointer;
      transition: background 0.12s;
      &:hover { background: var(--ax-color-bg-surface-alt); }
      &--overdue { background: rgba(220, 38, 38, 0.03); }
      &--overdue:hover { background: rgba(220, 38, 38, 0.07); }
    }

    /* Cell layouts */
    .priority-cell {
      display: flex;
      align-items: center;
      gap: var(--ax-space-2);
    }
    .priority-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .title-cell {
      display: flex;
      align-items: center;
      gap: var(--ax-space-1);
    }
    .complaint-link {
      color: var(--ax-color-brand-primary);
      text-decoration: none;
      font-weight: 500;
      font-size: var(--ax-font-size-sm);
      &:hover { text-decoration: underline; }
    }
    .overdue-icon {
      color: var(--ax-color-danger);
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    .overdue-date {
      color: var(--ax-color-danger);
      font-weight: 600;
    }

    .category-tag {
      display: inline-block;
      padding: 2px var(--ax-space-2);
      background: var(--ax-color-bg-surface-alt);
      border: 1px solid var(--ax-color-border);
      border-radius: var(--ax-radius-sm);
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-secondary);
    }

    .unassigned-text { color: var(--ax-color-text-tertiary); }

    mat-paginator {
      border-top: 1px solid var(--ax-color-border);
    }

    @media (max-width: 960px) {
      .ax-status-strip { grid-template-columns: repeat(3, 1fr); }
    }
    @media (max-width: 600px) {
      .ax-status-strip { grid-template-columns: repeat(2, 1fr); }
    }
  `],
})
export class ComplaintListComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly complaints = signal<Complaint[]>([]);
  readonly loading = signal(false);
  readonly totalCount = signal(0);
  readonly statusSummary = signal<{ status: string; count: number }[]>([]);

  displayedColumns = ['priority', 'title', 'category', 'status', 'submittedBy', 'assignedTo', 'dueDate', 'submittedAt', 'actions'];

  filterStatus = '';
  filterCategory = '';
  filterPriority = '';
  searchText = '';
  overdueOnly = false;
  pageSize = 20;
  pageIndex = 0;
  sortField = 'submittedAt';
  sortDir = 'desc';

  readonly allStatuses = Object.values(ComplaintStatus);
  readonly allCategories = Object.values(ComplaintCategory);
  readonly allPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

  ngOnInit() {
    this.loadComplaints();
    this.loadStatusSummary();
  }

  loadComplaints() {
    this.loading.set(true);
    const params = new URLSearchParams({
      page: String(this.pageIndex + 1),
      limit: String(this.pageSize),
      sort: this.sortField,
      order: this.sortDir,
      ...(this.filterStatus && { status: this.filterStatus }),
      ...(this.filterCategory && { category: this.filterCategory }),
      ...(this.filterPriority && { priority: this.filterPriority }),
      ...(this.overdueOnly && { overdueOnly: 'true' }),
    });

    this.http.get<any>(`${environment.apiUrl}/complaints?${params}`).subscribe({
      next: (res) => {
        this.complaints.set(res.data);
        this.totalCount.set(res.meta?.total ?? res.data.length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadStatusSummary() {
    this.http.get<any>(`${environment.apiUrl}/complaints?limit=200`).subscribe({
      next: (res) => {
        const all: Complaint[] = res?.data ?? [];
        const results = Object.values(ComplaintStatus).map((s) => ({
          status: s,
          count: all.filter((c) => c.status === s).length,
        }));
        this.statusSummary.set(results);
      },
    });
  }

  filterByStatus(status: string) {
    this.filterStatus = this.filterStatus === status ? '' : status;
    this.loadComplaints();
  }

  resetFilters() {
    this.filterStatus = '';
    this.filterCategory = '';
    this.filterPriority = '';
    this.searchText = '';
    this.overdueOnly = false;
    this.loadComplaints();
  }

  onSort(sort: Sort) {
    this.sortField = sort.active || 'submittedAt';
    this.sortDir = sort.direction || 'desc';
    this.loadComplaints();
  }

  onPage(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadComplaints();
  }

  onSearch() {
    clearTimeout((this as any)._searchTimer);
    (this as any)._searchTimer = setTimeout(() => this.loadComplaints(), 300);
  }

  isOverdue(complaint: Complaint): boolean {
    return !!(
      complaint.dueDate &&
      new Date(complaint.dueDate) < new Date() &&
      complaint.status !== 'RESOLVED' &&
      complaint.status !== 'CLOSED'
    );
  }

  getStatusLabel(status: string) { return STATUS_CONFIG[status]?.label ?? status; }
  getStatusIcon(status: string) { return STATUS_CONFIG[status]?.icon ?? 'help'; }
  getStatusVariant(status: string): BadgeVariant { return STATUS_CONFIG[status]?.variant ?? 'neutral'; }
  getStatusTokenColor(status: string) { return STATUS_CONFIG[status]?.tokenColor ?? 'var(--ax-color-border)'; }

  getPriorityLabel(p: string) { return PRIORITY_CONFIG[p]?.label ?? p; }
  getPriorityVariant(p: string): BadgeVariant { return PRIORITY_CONFIG[p]?.variant ?? 'neutral'; }
  getPriorityTokenColor(p: string) { return PRIORITY_CONFIG[p]?.tokenColor ?? 'var(--ax-color-text-secondary)'; }
}
