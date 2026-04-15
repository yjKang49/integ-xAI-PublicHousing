// apps/admin-web/src/app/features/work-orders/pages/work-order-list-page.component.ts
import {
  Component, OnInit, inject, signal, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { WorkOrder, WorkOrderStatus } from '@ax/shared';
import { WORK_ORDER_STATUS_LABELS, WORK_ORDER_STATUS_COLORS } from '@ax/shared';
import { environment } from '../../../../environments/environment';
import { WorkOrderFormComponent } from '../components/work-order-form.component';
import {
  PageHeaderComponent,
  StatusBadgeComponent,
  EmptyStateComponent,
  SkeletonComponent,
  BadgeVariant,
} from '../../../shared/components';

const PRIORITY_CONFIG: Record<string, { label: string; variant: BadgeVariant; tokenColor: string }> = {
  LOW:    { label: '낮음', variant: 'info',    tokenColor: 'var(--ax-color-info)' },
  MEDIUM: { label: '보통', variant: 'neutral', tokenColor: 'var(--ax-color-text-secondary)' },
  HIGH:   { label: '높음', variant: 'warning', tokenColor: 'var(--ax-color-warning)' },
  URGENT: { label: '긴급', variant: 'danger',  tokenColor: 'var(--ax-color-danger)' },
};

// Map WORK_ORDER_STATUS_COLORS (hex) → token-based BadgeVariant
function statusToVariant(s: string): BadgeVariant {
  if (['COMPLETED', 'DONE'].includes(s)) return 'success';
  if (['IN_PROGRESS'].includes(s)) return 'warning';
  if (['OPEN', 'PENDING'].includes(s)) return 'info';
  if (['CANCELLED', 'CLOSED'].includes(s)) return 'neutral';
  return 'neutral';
}

@Component({
  selector: 'ax-work-order-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatTableModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatFormFieldModule, MatInputModule,
    MatTooltipModule, MatSnackBarModule,
    WorkOrderFormComponent,
    PageHeaderComponent, StatusBadgeComponent, EmptyStateComponent, SkeletonComponent,
  ],
  template: `
    <ax-page-header
      title="작업지시 관리"
      description="현장 조치 작업지시 생성·배정·완료 처리"
      icon="construction">
      <div ax-page-actions>
        <button mat-flat-button color="primary" (click)="showForm.set(true)">
          <mat-icon>add</mat-icon> 작업지시 생성
        </button>
      </div>
    </ax-page-header>

    @if (showForm()) {
      <div class="ax-card ax-card--accent-top" style="margin-bottom: var(--ax-space-4)">
        <ax-work-order-form
          complexId=""
          (saved)="onSaved($event)"
          (cancel)="showForm.set(false)" />
      </div>
    }

    <!-- Filter bar -->
    <div class="ax-filter-bar">
      <div class="ax-filter-bar__filters">
        <mat-form-field appearance="outline" class="ax-filter-bar__field">
          <mat-label>상태</mat-label>
          <mat-select [(ngModel)]="filterStatus" (ngModelChange)="load()">
            <mat-option value="">전체</mat-option>
            @for (s of allStatuses; track s) {
              <mat-option [value]="s">{{ statusLabel(s) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="ax-filter-bar__field">
          <mat-label>담당자 ID</mat-label>
          <input matInput [(ngModel)]="filterAssignee" (change)="load()" />
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
        <table mat-table [dataSource]="workOrders()" class="ax-wo-table">

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>상태</th>
            <td mat-cell *matCellDef="let w">
              <ax-status-badge [variant]="statusToVariant(w.status)" [label]="statusLabel(w.status)" />
            </td>
          </ng-container>

          <ng-container matColumnDef="title">
            <th mat-header-cell *matHeaderCellDef>제목</th>
            <td mat-cell *matCellDef="let w">
              <div class="wo-title-cell">
                <span class="ax-text-body wo-title">{{ w.title }}</span>
                @if (w.complaintId) {
                  <mat-icon class="link-icon" matTooltip="민원 연계">link</mat-icon>
                }
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="priority">
            <th mat-header-cell *matHeaderCellDef>우선순위</th>
            <td mat-cell *matCellDef="let w">
              <div class="priority-cell">
                <span class="priority-dot" [style.background]="getPriorityTokenColor(w.priority)"></span>
                <ax-status-badge [variant]="getPriorityVariant(w.priority)" [label]="getPriorityLabel(w.priority)" />
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="assignedTo">
            <th mat-header-cell *matHeaderCellDef>담당자</th>
            <td mat-cell *matCellDef="let w" class="ax-text-body">{{ w.assignedTo }}</td>
          </ng-container>

          <ng-container matColumnDef="scheduledDate">
            <th mat-header-cell *matHeaderCellDef>예정일</th>
            <td mat-cell *matCellDef="let w" class="ax-text-meta">{{ w.scheduledDate | date:'MM/dd HH:mm' }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let w" (click)="$event.stopPropagation()">
              @if (w.status === 'OPEN') {
                <button mat-icon-button color="primary" (click)="startWO(w)" matTooltip="조치 시작">
                  <mat-icon>play_arrow</mat-icon>
                </button>
              }
              @if (w.status === 'IN_PROGRESS') {
                <button mat-icon-button color="accent" (click)="selectedWO.set(w)" matTooltip="완료 등록">
                  <mat-icon>task_alt</mat-icon>
                </button>
              }
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols;" class="ax-table-row"></tr>
        </table>

        @if (workOrders().length === 0) {
          <ax-empty-state
            type="empty"
            title="작업지시가 없습니다"
            description="새 작업지시를 생성하거나 필터를 변경해 주세요."
            (primaryAction)="showForm.set(true)" />
        }
      }
    </div>

    <!-- Complete dialog (inline overlay) -->
    @if (selectedWO()) {
      <div class="complete-overlay">
        <div class="complete-card ax-card">
          <div class="ax-card__header">
            <span class="ax-text-section-title">현장 조치 완료 등록</span>
          </div>
          <p class="ax-text-body"><strong>{{ selectedWO()!.title }}</strong></p>
          <mat-form-field appearance="outline" style="width:100%">
            <mat-label>조치 내용 *</mat-label>
            <textarea matInput [(ngModel)]="actionNotes" rows="4"></textarea>
          </mat-form-field>
          <mat-form-field appearance="outline" style="width:100%">
            <mat-label>실제 비용 (원)</mat-label>
            <input matInput type="number" [(ngModel)]="actualCost" />
          </mat-form-field>
          <div class="complete-actions">
            <button mat-stroked-button (click)="selectedWO.set(null)">취소</button>
            <button mat-flat-button color="primary" (click)="completeWO()"
              [disabled]="!actionNotes">완료 처리</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    /* Filter */
    .ax-filter-bar__field { min-width: 140px; }

    /* Table */
    .ax-wo-table { width: 100%; }

    .ax-table-row {
      transition: background 0.12s;
      &:hover { background: var(--ax-color-bg-surface-alt); }
    }

    .wo-title-cell {
      display: flex;
      align-items: center;
      gap: var(--ax-space-1);
    }
    .wo-title { font-weight: 500; }
    .link-icon {
      font-size: 14px;
      height: 14px;
      width: 14px;
      color: var(--ax-color-brand-primary);
    }

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

    /* Complete overlay */
    .complete-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .complete-card {
      width: 460px;
      max-width: 95vw;
      padding: var(--ax-space-6);
    }
    .complete-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--ax-space-2);
      margin-top: var(--ax-space-4);
    }
  `],
})
export class WorkOrderListPageComponent implements OnInit {
  private readonly http     = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);

  readonly workOrders = signal<WorkOrder[]>([]);
  readonly loading    = signal(false);
  readonly showForm   = signal(false);
  readonly selectedWO = signal<WorkOrder | null>(null);

  filterStatus  = '';
  filterAssignee = '';
  actionNotes   = '';
  actualCost: number | null = null;

  cols = ['status', 'title', 'priority', 'assignedTo', 'scheduledDate', 'actions'];
  readonly allStatuses = Object.values(WorkOrderStatus);

  readonly statusToVariant = statusToVariant;

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const params: Record<string, string> = {};
    if (this.filterStatus)   params['status']     = this.filterStatus;
    if (this.filterAssignee) params['assignedTo'] = this.filterAssignee;
    const qs = new URLSearchParams(params).toString();
    this.http.get<any>(`${environment.apiUrl}/work-orders${qs ? '?' + qs : ''}`).subscribe({
      next: (r) => { this.workOrders.set(r.data ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  resetFilters() { this.filterStatus = ''; this.filterAssignee = ''; this.load(); }

  startWO(wo: WorkOrder) {
    this.http.patch<any>(`${environment.apiUrl}/work-orders/${wo._id}/start`, {}).subscribe({
      next: (r) => {
        this.workOrders.update((list) => list.map((w) => w._id === wo._id ? (r.data ?? r) : w));
        this.snackBar.open('조치를 시작했습니다.', '닫기', { duration: 2000 });
      },
    });
  }

  completeWO() {
    const wo = this.selectedWO()!;
    this.http.patch<any>(`${environment.apiUrl}/work-orders/${wo._id}/complete`, {
      actionNotes: this.actionNotes,
      actualCost: this.actualCost ?? undefined,
    }).subscribe({
      next: (r) => {
        this.workOrders.update((list) => list.map((w) => w._id === wo._id ? (r.data ?? r) : w));
        this.selectedWO.set(null);
        this.actionNotes = '';
        this.actualCost = null;
        this.snackBar.open('조치 완료 처리되었습니다.', '닫기', { duration: 2500 });
      },
    });
  }

  onSaved(wo: WorkOrder) {
    this.showForm.set(false);
    this.workOrders.update((list) => [wo, ...list]);
    this.snackBar.open('작업지시 생성 완료', '닫기', { duration: 2000 });
  }

  statusLabel(s: string) { return WORK_ORDER_STATUS_LABELS[s] ?? s; }
  getPriorityLabel(p: string) { return PRIORITY_CONFIG[p]?.label ?? p; }
  getPriorityVariant(p: string): BadgeVariant { return PRIORITY_CONFIG[p]?.variant ?? 'neutral'; }
  getPriorityTokenColor(p: string) { return PRIORITY_CONFIG[p]?.tokenColor ?? 'var(--ax-color-text-secondary)'; }
}
