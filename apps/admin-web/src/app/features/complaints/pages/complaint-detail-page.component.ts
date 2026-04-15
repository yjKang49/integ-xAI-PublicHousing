// apps/admin-web/src/app/features/complaints/pages/complaint-detail-page.component.ts
/**
 * ComplaintDetailPageComponent
 *
 * Enhanced complaint detail with:
 *  - Status timeline (reusable component)
 *  - Work order creation + linked work orders list
 *  - Triage / assign / resolve / close action shortcuts
 *  - AI suggestion display (classificationHint / aiSuggestion)
 */
import {
  Component, OnInit, inject, signal, computed, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatBadgeModule } from '@angular/material/badge';
import { Complaint, ComplaintStatus, WorkOrder } from '@ax/shared';
import {
  COMPLAINT_STATUS_LABELS, COMPLAINT_PRIORITY_COLORS,
  WORK_ORDER_STATUS_LABELS, WORK_ORDER_STATUS_COLORS,
} from '@ax/shared';
import { environment } from '../../../../environments/environment';
import { StatusTimelineComponent } from '../components/status-timeline.component';
import { WorkOrderFormComponent } from '../../work-orders/components/work-order-form.component';

@Component({
  selector: 'ax-complaint-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatChipsModule, MatDividerModule, MatTooltipModule,
    MatProgressSpinnerModule, MatSnackBarModule,
    MatExpansionModule, MatBadgeModule,
    StatusTimelineComponent, WorkOrderFormComponent,
  ],
  template: `
    @if (loading()) {
      <div class="center-spin"><mat-spinner diameter="40" /></div>
    } @else if (c()) {
      <div class="detail-root">

        <!-- ── Left panel ─────────────────────────── -->
        <div class="main-col">

          <!-- Header -->
          <mat-card>
            <mat-card-header>
              <mat-card-title>
                <span class="priority-pill"
                  [style.background]="priorityColor(c()!.priority)">
                  {{ c()!.priority }}
                </span>
                {{ c()!.title }}
              </mat-card-title>
              <mat-card-subtitle>
                {{ c()!.complexId }}
                @if (c()!.buildingId) { / {{ c()!.buildingId }} }
                @if (c()!.unitNumber) { {{ c()!.unitNumber }}호 }
                &nbsp;·&nbsp;{{ c()!.category }}
              </mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p class="description">{{ c()!.description }}</p>

              @if (c()!.classificationHint || c()!.aiSuggestion) {
                <div class="ai-hint-box">
                  <mat-icon class="hint-icon">auto_awesome</mat-icon>
                  <div>
                    @if (c()!.classificationHint) {
                      <div><strong>분류 힌트:</strong> {{ c()!.classificationHint }}</div>
                    }
                    @if (c()!.aiSuggestion) {
                      <div class="ai-suggestion"><strong>AI 제안:</strong> {{ c()!.aiSuggestion }}</div>
                    }
                  </div>
                </div>
              }

              <div class="meta-chips">
                <span class="meta-item"><mat-icon>person</mat-icon>{{ c()!.submittedBy }}</span>
                @if (c()!.submittedPhone) {
                  <span class="meta-item"><mat-icon>phone</mat-icon>{{ c()!.submittedPhone }}</span>
                }
                <span class="meta-item"><mat-icon>schedule</mat-icon>{{ c()!.submittedAt | date:'yyyy-MM-dd HH:mm' }}</span>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Status timeline -->
          <mat-card>
            <mat-card-header><mat-card-title>처리 단계</mat-card-title></mat-card-header>
            <mat-card-content>
              <ax-status-timeline
                [currentStatus]="c()!.status"
                [events]="c()!.timeline" />
            </mat-card-content>
          </mat-card>

          <!-- Action panel -->
          @if (!isClosed()) {
            <mat-card class="action-card">
              <mat-card-header><mat-card-title>처리 작업</mat-card-title></mat-card-header>
              <mat-card-content>
                <form [formGroup]="af">

                  <!-- Triage -->
                  @if (isOpen()) {
                    <div class="action-section">
                      <h4><mat-icon>rule</mat-icon> 내용 검토 및 분류</h4>
                      <div class="row-3">
                        <mat-form-field appearance="outline">
                          <mat-label>우선순위 조정</mat-label>
                          <mat-select formControlName="priority">
                            <mat-option value="LOW">낮음</mat-option>
                            <mat-option value="MEDIUM">보통</mat-option>
                            <mat-option value="HIGH">높음</mat-option>
                            <mat-option value="URGENT">긴급</mat-option>
                          </mat-select>
                        </mat-form-field>
                        <mat-form-field appearance="outline" class="span2">
                          <mat-label>분류 메모</mat-label>
                          <input matInput formControlName="triageNote" />
                        </mat-form-field>
                      </div>
                      <button mat-stroked-button color="primary" (click)="triage()">
                        <mat-icon>done</mat-icon> 검토 완료 (TRIAGED)
                      </button>
                    </div>
                    <mat-divider />
                  }

                  <!-- Assign -->
                  @if (canAssign()) {
                    <div class="action-section">
                      <h4><mat-icon>person_add</mat-icon> 담당자 배정</h4>
                      <div class="row-3">
                        <mat-form-field appearance="outline">
                          <mat-label>담당자 ID *</mat-label>
                          <input matInput formControlName="assignedTo" />
                        </mat-form-field>
                        <mat-form-field appearance="outline">
                          <mat-label>처리 기한</mat-label>
                          <input matInput type="datetime-local" formControlName="dueDate" />
                        </mat-form-field>
                        <mat-form-field appearance="outline">
                          <mat-label>배정 메모</mat-label>
                          <input matInput formControlName="assignNote" />
                        </mat-form-field>
                      </div>
                      <button mat-raised-button color="primary" (click)="assign()"
                        [disabled]="!af.get('assignedTo')!.value">
                        <mat-icon>assignment_ind</mat-icon> 배정
                      </button>
                    </div>
                    <mat-divider />
                  }

                  <!-- Resolve -->
                  @if (canResolve()) {
                    <div class="action-section">
                      <h4><mat-icon>check_circle</mat-icon> 처리 완료 등록</h4>
                      <mat-form-field appearance="outline" class="full">
                        <mat-label>처리 결과 *</mat-label>
                        <textarea matInput formControlName="resolutionNotes" rows="3"></textarea>
                      </mat-form-field>
                      <button mat-raised-button color="accent" (click)="resolve()"
                        [disabled]="!af.get('resolutionNotes')!.value">
                        처리 완료
                      </button>
                    </div>
                    <mat-divider />
                  }

                  <!-- Close -->
                  @if (canClose()) {
                    <div class="action-section">
                      <h4><mat-icon>done_all</mat-icon> 민원 종결</h4>
                      <div class="star-row">
                        <span>입주민 만족도:</span>
                        @for (n of [1,2,3,4,5]; track n) {
                          <mat-icon class="star"
                            [class.filled]="n <= (af.get('satisfactionScore')!.value ?? 0)"
                            (click)="af.get('satisfactionScore')!.setValue(n)">star</mat-icon>
                        }
                        <span class="score-val">{{ af.get('satisfactionScore')!.value ?? '-' }}/5</span>
                      </div>
                      <mat-form-field appearance="outline" class="full">
                        <mat-label>종결 메모</mat-label>
                        <input matInput formControlName="closeNote" />
                      </mat-form-field>
                      <button mat-raised-button (click)="close()">
                        <mat-icon>lock</mat-icon> 종결 처리
                      </button>
                    </div>
                  }

                </form>
              </mat-card-content>
            </mat-card>
          }

          <!-- Create Work Order -->
          @if (!isClosed() && !showWoForm()) {
            <div class="wo-cta">
              <button mat-stroked-button (click)="showWoForm.set(true)">
                <mat-icon>assignment_add</mat-icon>
                작업지시 생성
              </button>
            </div>
          }
          @if (showWoForm()) {
            <mat-card>
              <mat-card-content>
                <ax-work-order-form
                  [complexId]="c()!.complexId"
                  [buildingId]="c()!.buildingId"
                  [complaintId]="c()!._id"
                  [titlePrefix]="'[민원] ' + c()!.title"
                  (saved)="onWorkOrderSaved($event)"
                  (cancel)="showWoForm.set(false)" />
              </mat-card-content>
            </mat-card>
          }

        </div>

        <!-- ── Right panel ────────────────────────── -->
        <div class="side-col">

          <!-- Status card -->
          <mat-card>
            <mat-card-content>
              <div class="status-badge" [class]="'st-' + c()!.status.toLowerCase()">
                {{ statusLabel(c()!.status) }}
              </div>
              @if (c()!.assignedTo) {
                <div class="side-row"><mat-icon>person</mat-icon> {{ c()!.assignedTo }}</div>
              }
              @if (c()!.dueDate) {
                <div class="side-row" [class.overdue]="isOverdue()">
                  <mat-icon>schedule</mat-icon>
                  기한: {{ c()!.dueDate | date:'MM/dd HH:mm' }}
                  @if (isOverdue()) { <span class="overdue-badge">초과</span> }
                </div>
              }
              @if (c()!.resolvedAt) {
                <div class="side-row resolved">
                  <mat-icon>check_circle</mat-icon> 해결: {{ c()!.resolvedAt | date:'MM/dd' }}
                </div>
              }
            </mat-card-content>
          </mat-card>

          <!-- Satisfaction -->
          @if (c()!.satisfactionScore) {
            <mat-card>
              <mat-card-header><mat-card-title>만족도</mat-card-title></mat-card-header>
              <mat-card-content>
                <div class="stars">
                  @for (n of [1,2,3,4,5]; track n) {
                    <mat-icon [class.filled-star]="n <= c()!.satisfactionScore!">star</mat-icon>
                  }
                  <span>{{ c()!.satisfactionScore }}/5</span>
                </div>
                @if (c()!.satisfactionFeedback) {
                  <p class="feedback">{{ c()!.satisfactionFeedback }}</p>
                }
              </mat-card-content>
            </mat-card>
          }

          <!-- Linked Work Orders -->
          @if (workOrders().length > 0) {
            <mat-card>
              <mat-card-header>
                <mat-card-title>
                  연계 작업지시
                  <span class="wo-count" [matBadge]="workOrders().length" matBadgeOverlap="false"></span>
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                @for (wo of workOrders(); track wo._id) {
                  <div class="wo-item">
                    <div class="wo-header">
                      <span class="wo-title">{{ wo.title }}</span>
                      <span class="wo-status-chip"
                        [style.color]="woStatusColor(wo.status)"
                        [style.border-color]="woStatusColor(wo.status)">
                        {{ woStatusLabel(wo.status) }}
                      </span>
                    </div>
                    <div class="wo-meta">
                      담당: {{ wo.assignedTo }} · 예정: {{ wo.scheduledDate | date:'MM/dd' }}
                    </div>
                    @if (wo.actionNotes) {
                      <div class="wo-action-notes">{{ wo.actionNotes }}</div>
                    }
                  </div>
                }
              </mat-card-content>
            </mat-card>
          }

        </div>
      </div>
    }
  `,
  styles: [`
    .center-spin { display: flex; justify-content: center; padding: 80px; }
    .detail-root { display: grid; grid-template-columns: 1fr 320px; gap: 20px; }
    .main-col, .side-col { display: flex; flex-direction: column; gap: 16px; }

    .description { color: #555; line-height: 1.65; margin: 8px 0 12px; }
    .priority-pill {
      color: white; padding: 2px 10px; border-radius: 12px;
      font-size: 11px; margin-right: 8px; vertical-align: middle;
    }
    .ai-hint-box {
      display: flex; align-items: flex-start; gap: 8px;
      background: #f8f0ff; border-left: 4px solid #ce93d8;
      padding: 8px 12px; border-radius: 4px; margin-bottom: 8px; font-size: 13px;
    }
    .hint-icon { color: #9c27b0; font-size: 18px; height: 18px; width: 18px; flex-shrink: 0; margin-top: 2px; }
    .ai-suggestion { color: #6a1b9a; margin-top: 4px; }
    .meta-chips { display: flex; gap: 16px; flex-wrap: wrap; font-size: 12px; color: #777; }
    .meta-item { display: flex; align-items: center; gap: 4px; }
    .meta-item mat-icon { font-size: 14px; height: 14px; width: 14px; }

    .action-card .action-section { padding: 12px 0; }
    .action-section h4 { display: flex; align-items: center; gap: 6px; margin: 0 0 10px; font-size: 14px; }
    .row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
    .span2 { grid-column: span 2; }
    .full { width: 100%; }
    .star-row { display: flex; align-items: center; gap: 4px; margin-bottom: 10px; font-size: 13px; }
    .star { cursor: pointer; color: #ddd; }
    .star.filled { color: #ffc107; }
    .score-val { margin-left: 8px; font-weight: 600; }

    .wo-cta { display: flex; justify-content: flex-end; }

    /* Side col */
    .status-badge {
      display: inline-block; padding: 6px 16px; border-radius: 16px;
      font-weight: 600; font-size: 14px; margin-bottom: 12px;
    }
    .st-open        { background: #e3f2fd; color: #1565c0; }
    .st-received    { background: #e3f2fd; color: #1565c0; }
    .st-triaged     { background: #f3e5f5; color: #6a1b9a; }
    .st-assigned    { background: #e8f5e9; color: #2e7d32; }
    .st-in_progress { background: #fff3e0; color: #e65100; }
    .st-resolved    { background: #e8eaf6; color: #283593; }
    .st-closed      { background: #f5f5f5; color: #616161; }
    .side-row { display: flex; align-items: center; gap: 6px; font-size: 13px; margin-bottom: 8px; }
    .overdue { color: #f44336; }
    .overdue-badge { background: #f44336; color: white; padding: 1px 6px; border-radius: 4px; font-size: 10px; }
    .resolved { color: #4caf50; }
    .filled-star { color: #ffc107; }
    .feedback { font-size: 12px; color: #666; font-style: italic; margin: 4px 0 0; }
    .stars { display: flex; align-items: center; gap: 2px; font-size: 14px; }

    /* Work order list */
    .wo-count { margin-left: 8px; }
    .wo-item { padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
    .wo-item:last-child { border-bottom: none; }
    .wo-header { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .wo-title { font-size: 13px; font-weight: 500; flex: 1; }
    .wo-status-chip {
      font-size: 10px; border: 1px solid; padding: 1px 8px; border-radius: 12px;
      white-space: nowrap;
    }
    .wo-meta { font-size: 11px; color: #888; margin: 4px 0 0; }
    .wo-action-notes {
      font-size: 11px; color: #555; background: #f9f9f9;
      padding: 4px 8px; border-radius: 4px; margin-top: 4px;
      border-left: 2px solid #ddd;
    }

    @media (max-width: 900px) {
      .detail-root { grid-template-columns: 1fr; }
      .side-col { order: -1; }
      .row-3 { grid-template-columns: 1fr; }
    }
  `],
})
export class ComplaintDetailPageComponent implements OnInit {
  private readonly route    = inject(ActivatedRoute);
  private readonly http     = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb       = inject(FormBuilder);

  readonly loading    = signal(true);
  readonly c          = signal<Complaint | null>(null);
  readonly workOrders = signal<WorkOrder[]>([]);
  readonly showWoForm = signal(false);

  readonly isClosed  = computed(() => this.c()?.status === ComplaintStatus.CLOSED);
  readonly isOpen    = computed(() => ['OPEN', 'RECEIVED'].includes(this.c()?.status ?? ''));
  readonly canAssign = computed(() => ['OPEN', 'RECEIVED', 'TRIAGED'].includes(this.c()?.status ?? ''));
  readonly canResolve = computed(() => ['ASSIGNED', 'IN_PROGRESS'].includes(this.c()?.status ?? ''));
  readonly canClose  = computed(() => this.c()?.status === ComplaintStatus.RESOLVED);

  readonly af = this.fb.group({
    priority:         [''],
    triageNote:       [''],
    assignedTo:       [''],
    dueDate:          [''],
    assignNote:       [''],
    resolutionNotes:  [''],
    satisfactionScore:[null as number | null],
    closeNote:        [''],
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('complaintId')!;
    this.load(id);
    this.loadWorkOrders(id);
  }

  private load(id: string) {
    this.http.get<any>(`${environment.apiUrl}/complaints/${id}`).subscribe({
      next: (r) => { this.c.set(r.data ?? r); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  private loadWorkOrders(complaintId: string) {
    this.http.get<any>(`${environment.apiUrl}/work-orders?complaintId=${complaintId}`).subscribe({
      next: (r) => this.workOrders.set(r.data ?? []),
    });
  }

  triage() {
    this.patch({ status: ComplaintStatus.TRIAGED, priority: this.af.value.priority || undefined, notes: this.af.value.triageNote || undefined });
  }

  assign() {
    this.patch({ assignedTo: this.af.value.assignedTo!, dueDate: this.af.value.dueDate || undefined, notes: this.af.value.assignNote || undefined });
  }

  resolve() {
    this.patch({ status: ComplaintStatus.RESOLVED, resolutionNotes: this.af.value.resolutionNotes! });
  }

  close() {
    this.patch({
      status: ComplaintStatus.CLOSED,
      satisfactionScore: this.af.value.satisfactionScore ?? undefined,
      notes: this.af.value.closeNote || undefined,
    });
  }

  onWorkOrderSaved(wo: WorkOrder) {
    this.showWoForm.set(false);
    this.workOrders.update((list) => [...list, wo]);
    // reload complaint (back-link updates status to IN_PROGRESS)
    const id = this.c()!._id;
    this.load(id);
  }

  private patch(dto: Record<string, any>) {
    const id = this.c()!._id;
    this.http.patch<any>(`${environment.apiUrl}/complaints/${id}`, dto).subscribe({
      next: (r) => {
        this.c.set(r.data ?? r);
        this.snackBar.open('처리되었습니다.', '닫기', { duration: 2500 });
      },
      error: (err) => this.snackBar.open(err.error?.message ?? '오류', '닫기', { duration: 3500 }),
    });
  }

  isOverdue(): boolean {
    const comp = this.c();
    return !!(comp?.dueDate && new Date(comp.dueDate) < new Date() && !['RESOLVED', 'CLOSED'].includes(comp.status));
  }

  statusLabel(s: string) { return COMPLAINT_STATUS_LABELS[s] ?? s; }
  priorityColor(p: string) { return COMPLAINT_PRIORITY_COLORS[p] ?? '#9e9e9e'; }
  woStatusLabel(s: string) { return WORK_ORDER_STATUS_LABELS[s] ?? s; }
  woStatusColor(s: string) { return WORK_ORDER_STATUS_COLORS[s] ?? '#9e9e9e'; }
}
