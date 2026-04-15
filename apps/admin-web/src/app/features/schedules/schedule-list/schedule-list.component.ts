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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Schedule } from '@ax/shared';
import { environment } from '../../../../environments/environment';
import {
  PageHeaderComponent,
  EmptyStateComponent,
  SkeletonComponent,
} from '../../../shared/components';

const SCHEDULE_TYPE_LABELS: Record<string, string> = {
  REGULAR_INSPECTION:   '정기점검',
  EMERGENCY_INSPECTION: '긴급점검',
  MAINTENANCE:          '유지관리',
  CONTRACT_RENEWAL:     '계약 갱신',
};

const RECURRENCE_LABELS: Record<string, string> = {
  ONCE:      '1회',
  WEEKLY:    '주간',
  MONTHLY:   '월간',
  QUARTERLY: '분기',
  ANNUALLY:  '연간',
};

@Component({
  selector: 'ax-schedule-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatTableModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatFormFieldModule,
    MatTooltipModule, MatSlideToggleModule,
    MatSnackBarModule, MatPaginatorModule,
    PageHeaderComponent, EmptyStateComponent, SkeletonComponent,
  ],
  template: `
    <ax-page-header
      title="유지관리 일정"
      description="정기·긴급 점검 및 유지관리 일정 등록·관리"
      icon="event_note"
      [meta]="'전체 ' + total() + '건'">
    </ax-page-header>

    <!-- Filter bar -->
    <div class="ax-filter-bar">
      <div class="ax-filter-bar__filters">
        <mat-form-field appearance="outline" class="ax-filter-bar__field">
          <mat-label>일정 유형</mat-label>
          <mat-select [(ngModel)]="filterType" (ngModelChange)="load()">
            <mat-option value="">전체</mat-option>
            @for (t of scheduleTypeItems; track t.value) {
              <mat-option [value]="t.value">{{ t.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="ax-filter-bar__field">
          <mat-label>반복 주기</mat-label>
          <mat-select [(ngModel)]="filterRecurrence" (ngModelChange)="load()">
            <mat-option value="">전체</mat-option>
            @for (r of recurrenceItems; track r.value) {
              <mat-option [value]="r.value">{{ r.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="ax-filter-bar__field">
          <mat-label>활성 여부</mat-label>
          <mat-select [(ngModel)]="filterActive" (ngModelChange)="load()">
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
        <table mat-table [dataSource]="schedules()" class="ax-schedule-table">

          <ng-container matColumnDef="isActive">
            <th mat-header-cell *matHeaderCellDef>활성</th>
            <td mat-cell *matCellDef="let s">
              <mat-slide-toggle [checked]="s.isActive"
                (change)="toggleActive(s, $event.checked)"
                [disabled]="toggling() === s._id" />
            </td>
          </ng-container>

          <ng-container matColumnDef="scheduleType">
            <th mat-header-cell *matHeaderCellDef>유형</th>
            <td mat-cell *matCellDef="let s">
              <span class="type-tag">{{ typeLabel(s.scheduleType) }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="title">
            <th mat-header-cell *matHeaderCellDef>제목</th>
            <td mat-cell *matCellDef="let s">
              <div class="ax-text-body schedule-title">{{ s.title }}</div>
              @if (s.description) {
                <div class="ax-text-meta">{{ s.description | slice:0:60 }}</div>
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="recurrence">
            <th mat-header-cell *matHeaderCellDef>반복</th>
            <td mat-cell *matCellDef="let s" class="ax-text-meta">{{ recurrenceLabel(s.recurrence) }}</td>
          </ng-container>

          <ng-container matColumnDef="nextOccurrence">
            <th mat-header-cell *matHeaderCellDef>다음 일정</th>
            <td mat-cell *matCellDef="let s">
              <div class="next-date-cell">
                <span [class.overdue-date]="isOverdue(s.nextOccurrence)" class="ax-text-meta">
                  {{ s.nextOccurrence | date:'yyyy-MM-dd' }}
                </span>
                @if (isOverdue(s.nextOccurrence)) {
                  <mat-icon class="overdue-icon" matTooltip="일정 초과">warning</mat-icon>
                }
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="lastOccurrence">
            <th mat-header-cell *matHeaderCellDef>마지막 실시</th>
            <td mat-cell *matCellDef="let s" class="ax-text-meta">
              {{ s.lastOccurrence ? (s.lastOccurrence | date:'yyyy-MM-dd') : '—' }}
            </td>
          </ng-container>

          <ng-container matColumnDef="assignedTo">
            <th mat-header-cell *matHeaderCellDef>담당자 수</th>
            <td mat-cell *matCellDef="let s" class="ax-text-meta">{{ s.assignedTo?.length ?? 0 }}명</td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let s; columns: columns;" class="ax-table-row"></tr>
        </table>

        @if (schedules().length === 0) {
          <ax-empty-state
            type="search-no-result"
            title="등록된 일정이 없습니다"
            description="필터를 초기화하거나 새 일정을 등록해 주세요."
            (primaryAction)="resetFilters()" />
        }
      }

      <mat-paginator [length]="total()" [pageSize]="pageSize"
        [pageSizeOptions]="[10, 20, 50]" (page)="onPage($event)" showFirstLastButtons />
    </div>
  `,
  styles: [`
    /* Filter */
    .ax-filter-bar__field { min-width: 140px; }

    /* Table */
    .ax-schedule-table { width: 100%; }

    .ax-table-row {
      transition: background 0.12s;
      &:hover { background: var(--ax-color-bg-surface-alt); }
    }

    .type-tag {
      display: inline-block;
      padding: 2px var(--ax-space-2);
      background: var(--ax-color-info-subtle);
      color: var(--ax-color-info);
      border-radius: var(--ax-radius-sm);
      font-size: var(--ax-font-size-xs);
      font-weight: 500;
      white-space: nowrap;
    }

    .schedule-title { font-weight: 500; }

    .next-date-cell {
      display: flex;
      align-items: center;
      gap: var(--ax-space-1);
    }
    .overdue-date {
      color: var(--ax-color-danger);
      font-weight: 600;
    }
    .overdue-icon {
      color: var(--ax-color-danger);
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    mat-paginator { border-top: 1px solid var(--ax-color-border); }
  `],
})
export class ScheduleListComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);

  readonly schedules = signal<Schedule[]>([]);
  readonly loading = signal(false);
  readonly total = signal(0);
  readonly toggling = signal<string | null>(null);

  columns = ['isActive', 'scheduleType', 'title', 'recurrence', 'nextOccurrence', 'lastOccurrence', 'assignedTo'];
  filterType = '';
  filterRecurrence = '';
  filterActive = '';
  pageSize = 20;
  pageIndex = 0;

  readonly scheduleTypeItems = Object.entries(SCHEDULE_TYPE_LABELS).map(([value, label]) => ({ value, label }));
  readonly recurrenceItems = Object.entries(RECURRENCE_LABELS).map(([value, label]) => ({ value, label }));

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const params = new URLSearchParams({
      page: String(this.pageIndex + 1), limit: String(this.pageSize),
      ...(this.filterType       && { scheduleType: this.filterType }),
      ...(this.filterRecurrence && { recurrence:   this.filterRecurrence }),
      ...(this.filterActive     && { isActive:      this.filterActive }),
    });
    this.http.get<any>(`${environment.apiUrl}/schedules?${params}`).subscribe({
      next: (res) => {
        this.schedules.set(res.data ?? []);
        this.total.set(res.meta?.total ?? (res.data ?? []).length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toggleActive(schedule: Schedule, active: boolean) {
    this.toggling.set(schedule._id);
    this.http.patch<any>(`${environment.apiUrl}/schedules/${encodeURIComponent(schedule._id)}`, { isActive: active }).subscribe({
      next: () => {
        this.schedules.update((list) => list.map((s) => s._id === schedule._id ? { ...s, isActive: active } : s));
        this.toggling.set(null);
      },
      error: () => {
        this.snackBar.open('상태 변경에 실패했습니다.', '닫기', { duration: 3000 });
        this.toggling.set(null);
      },
    });
  }

  isOverdue(dateStr: string): boolean {
    return !!dateStr && new Date(dateStr) < new Date();
  }

  resetFilters() { this.filterType = ''; this.filterRecurrence = ''; this.filterActive = ''; this.pageIndex = 0; this.load(); }
  onPage(e: PageEvent) { this.pageIndex = e.pageIndex; this.pageSize = e.pageSize; this.load(); }
  typeLabel(t: string) { return SCHEDULE_TYPE_LABELS[t] ?? t; }
  recurrenceLabel(r: string) { return RECURRENCE_LABELS[r] ?? r; }
}
