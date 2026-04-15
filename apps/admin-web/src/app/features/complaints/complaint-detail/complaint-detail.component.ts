// apps/admin-web/src/app/features/complaints/complaint-detail/complaint-detail.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { Complaint, ComplaintStatus, ComplaintEvent } from '@ax/shared';
import { environment } from '../../../../environments/environment';

/** Ordered list of status steps for the stepper */
const STATUS_STEPS = [
  ComplaintStatus.RECEIVED,
  ComplaintStatus.ASSIGNED,
  ComplaintStatus.IN_PROGRESS,
  ComplaintStatus.RESOLVED,
  ComplaintStatus.CLOSED,
];

@Component({
  selector: 'ax-complaint-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatChipsModule, MatDialogModule, MatDividerModule,
    MatTooltipModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatStepperModule,
  ],
  template: `
    @if (loading()) {
      <div class="loading-center"><mat-spinner diameter="40" /></div>
    } @else if (complaint()) {
      <div class="detail-layout">

        <!-- Left: Main info + workflow -->
        <div class="main-panel">

          <!-- Header -->
          <mat-card class="header-card">
            <mat-card-header>
              <mat-card-title>
                <span class="priority-badge"
                  [style.background]="getPriorityColor(complaint()!.priority)">
                  {{ complaint()!.priority }}
                </span>
                {{ complaint()!.title }}
              </mat-card-title>
              <mat-card-subtitle>
                {{ complaint()!.complexId }} /
                {{ complaint()!.buildingId ?? '' }}
                {{ complaint()!.unitNumber ? complaint()!.unitNumber + '호' : '' }}
              </mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p class="description">{{ complaint()!.description }}</p>
              <div class="meta-row">
                <span><mat-icon>person</mat-icon> {{ complaint()!.submittedBy }}</span>
                <span><mat-icon>phone</mat-icon> {{ complaint()!.submittedPhone ?? '-' }}</span>
                <span><mat-icon>category</mat-icon> {{ complaint()!.category }}</span>
                <span><mat-icon>schedule</mat-icon> {{ complaint()!.submittedAt | date:'yyyy-MM-dd HH:mm' }}</span>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Status Stepper -->
          <mat-card class="stepper-card">
            <mat-card-header>
              <mat-card-title>처리 단계</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="status-stepper">
                @for (step of statusSteps; track step; let i = $index) {
                  <div class="step-item"
                    [class.completed]="isStepCompleted(step)"
                    [class.current]="complaint()!.status === step"
                    [class.pending]="!isStepCompleted(step) && complaint()!.status !== step">
                    <div class="step-circle">
                      @if (isStepCompleted(step)) {
                        <mat-icon>check</mat-icon>
                      } @else {
                        <span>{{ i + 1 }}</span>
                      }
                    </div>
                    <div class="step-label">{{ getStepLabel(step) }}</div>
                    @if (getStepDate(step)) {
                      <div class="step-date">{{ getStepDate(step) | date:'MM/dd HH:mm' }}</div>
                    }
                  </div>
                  @if (i < statusSteps.length - 1) {
                    <div class="step-connector"
                      [class.filled]="isStepCompleted(step)"></div>
                  }
                }
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Workflow Actions -->
          @if (canTakeAction()) {
            <mat-card class="action-card">
              <mat-card-header>
                <mat-card-title>처리 작업</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <form [formGroup]="actionForm">

                  <!-- Assign -->
                  @if (canAssign()) {
                    <div class="action-section">
                      <h4>담당자 배정</h4>
                      <div class="action-row">
                        <mat-form-field appearance="outline" class="flex1">
                          <mat-label>담당자 ID</mat-label>
                          <input matInput formControlName="assignedTo" placeholder="담당자 사용자 ID" />
                        </mat-form-field>
                        <mat-form-field appearance="outline" class="flex2">
                          <mat-label>배정 메모</mat-label>
                          <input matInput formControlName="assignNote" />
                        </mat-form-field>
                        <button mat-raised-button color="primary" (click)="assign()"
                          [disabled]="!actionForm.get('assignedTo')!.value">
                          배정
                        </button>
                      </div>
                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>처리 기한</mat-label>
                        <input matInput type="datetime-local" formControlName="dueDate" />
                      </mat-form-field>
                    </div>
                    <mat-divider />
                  }

                  <!-- Progress update -->
                  @if (canProgressUpdate()) {
                    <div class="action-section">
                      <h4>진행 상황 업데이트</h4>
                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>현장 조치 내용</mat-label>
                        <textarea matInput formControlName="progressNote" rows="3"
                          placeholder="현장 점검 결과 및 조치 사항을 입력하세요"></textarea>
                      </mat-form-field>
                      <button mat-stroked-button color="accent"
                        (click)="updateStatus(ComplaintStatus.IN_PROGRESS, actionForm.get('progressNote')!.value)">
                        처리 중으로 변경
                      </button>
                    </div>
                    <mat-divider />
                  }

                  <!-- Resolve -->
                  @if (canResolve()) {
                    <div class="action-section">
                      <h4>처리 완료</h4>
                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>처리 결과 *</mat-label>
                        <textarea matInput formControlName="resolutionNotes" rows="3"
                          placeholder="처리 완료 내용을 입력하세요" [required]="true"></textarea>
                      </mat-form-field>
                      <button mat-raised-button color="accent" (click)="resolve()"
                        [disabled]="!actionForm.get('resolutionNotes')!.value">
                        <mat-icon>check_circle</mat-icon>
                        처리 완료 처리
                      </button>
                    </div>
                    <mat-divider />
                  }

                  <!-- Close with satisfaction -->
                  @if (canClose()) {
                    <div class="action-section">
                      <h4>민원 종결</h4>
                      <div class="satisfaction-row">
                        <span>입주민 만족도:</span>
                        @for (score of [1, 2, 3, 4, 5]; track score) {
                          <mat-icon class="star-icon"
                            [class.filled]="score <= (actionForm.get('satisfactionScore')!.value ?? 0)"
                            (click)="actionForm.get('satisfactionScore')!.setValue(score)">
                            star
                          </mat-icon>
                        }
                        <span class="score-label">
                          {{ actionForm.get('satisfactionScore')!.value ?? '-' }} / 5
                        </span>
                      </div>
                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>종결 메모</mat-label>
                        <input matInput formControlName="closeNote" />
                      </mat-form-field>
                      <button mat-raised-button (click)="close()">
                        <mat-icon>done_all</mat-icon>
                        민원 종결
                      </button>
                    </div>
                  }

                </form>
              </mat-card-content>
            </mat-card>
          }
        </div>

        <!-- Right: Timeline + meta -->
        <div class="side-panel">

          <!-- Current status / due date -->
          <mat-card class="status-card">
            <mat-card-content>
              <div class="status-display">
                <div class="status-badge" [class]="'status-' + complaint()!.status.toLowerCase()">
                  {{ getStatusLabel(complaint()!.status) }}
                </div>
                @if (complaint()!.assignedTo) {
                  <div class="assigned-to">
                    <mat-icon>person</mat-icon>
                    {{ complaint()!.assignedTo }}
                  </div>
                }
                @if (complaint()!.dueDate) {
                  <div class="due-date" [class.overdue]="isOverdue()">
                    <mat-icon>schedule</mat-icon>
                    기한: {{ complaint()!.dueDate | date:'MM/dd HH:mm' }}
                    @if (isOverdue()) { <span class="overdue-badge">초과</span> }
                  </div>
                }
                @if (complaint()!.resolvedAt) {
                  <div class="resolved-at">
                    <mat-icon>check_circle</mat-icon>
                    해결: {{ complaint()!.resolvedAt | date:'MM/dd HH:mm' }}
                  </div>
                }
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Satisfaction score -->
          @if (complaint()!.satisfactionScore) {
            <mat-card>
              <mat-card-content>
                <h4>입주민 만족도</h4>
                <div class="stars">
                  @for (s of [1,2,3,4,5]; track s) {
                    <mat-icon [class.filled-star]="s <= complaint()!.satisfactionScore!">star</mat-icon>
                  }
                  <span>{{ complaint()!.satisfactionScore }} / 5</span>
                </div>
                @if (complaint()!.satisfactionFeedback) {
                  <p class="feedback">{{ complaint()!.satisfactionFeedback }}</p>
                }
              </mat-card-content>
            </mat-card>
          }

          <!-- Event Timeline -->
          <mat-card class="timeline-card">
            <mat-card-header>
              <mat-card-title>처리 이력</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="timeline">
                @for (event of complaint()!.timeline; track event.timestamp; let last = $last) {
                  <div class="timeline-item">
                    <div class="timeline-left">
                      <div class="timeline-dot" [class]="'dot-' + event.toStatus.toLowerCase()"></div>
                      @if (!last) { <div class="timeline-line"></div> }
                    </div>
                    <div class="timeline-content">
                      <div class="timeline-header">
                        <span class="timeline-action">
                          @if (event.fromStatus) {
                            <span class="from-status">{{ getStatusLabel(event.fromStatus) }}</span>
                            <mat-icon class="arrow-icon">arrow_forward</mat-icon>
                          }
                          <span class="to-status">{{ getStatusLabel(event.toStatus) }}</span>
                        </span>
                        <span class="timeline-time">{{ event.timestamp | date:'MM/dd HH:mm' }}</span>
                      </div>
                      <div class="timeline-actor">by {{ event.actorId }}</div>
                      @if (event.notes) {
                        <div class="timeline-notes">{{ event.notes }}</div>
                      }
                    </div>
                  </div>
                }
              </div>
            </mat-card-content>
          </mat-card>

        </div>
      </div>
    }
  `,
  styles: [`
    .loading-center { display: flex; justify-content: center; padding: 80px; }
    .detail-layout { display: grid; grid-template-columns: 1fr 360px; gap: 20px; }
    .main-panel, .side-panel { display: flex; flex-direction: column; gap: 16px; }

    /* Header card */
    .header-card .description { color: #555; line-height: 1.6; margin: 8px 0 16px; }
    .meta-row { display: flex; gap: 20px; flex-wrap: wrap; font-size: 13px; color: #666; }
    .meta-row mat-icon { font-size: 14px; height: 14px; width: 14px; vertical-align: middle; margin-right: 4px; }
    .priority-badge {
      color: white; padding: 2px 10px; border-radius: 12px;
      font-size: 11px; margin-right: 8px; vertical-align: middle;
    }

    /* Status stepper */
    .status-stepper { display: flex; align-items: flex-start; padding: 16px 0; overflow-x: auto; }
    .step-item { display: flex; flex-direction: column; align-items: center; min-width: 80px; }
    .step-circle {
      width: 36px; height: 36px; border-radius: 50%; border: 2px solid #ddd;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: 600; background: white;
    }
    .step-item.completed .step-circle { background: #4caf50; border-color: #4caf50; color: white; }
    .step-item.current .step-circle { background: #1976d2; border-color: #1976d2; color: white; }
    .step-label { font-size: 11px; text-align: center; margin-top: 6px; color: #666; }
    .step-date { font-size: 10px; color: #999; }
    .step-connector { flex: 1; height: 2px; background: #ddd; margin: 18px 4px 0; min-width: 20px; }
    .step-connector.filled { background: #4caf50; }

    /* Action form */
    .action-section { padding: 12px 0; }
    .action-section h4 { margin: 0 0 12px; font-size: 14px; color: #333; }
    .action-row { display: flex; gap: 12px; align-items: flex-start; }
    .flex1 { flex: 1; } .flex2 { flex: 2; }
    .full-width { width: 100%; }
    .satisfaction-row { display: flex; align-items: center; gap: 4px; margin-bottom: 12px; }
    .star-icon { cursor: pointer; color: #ddd; }
    .star-icon.filled { color: #ffc107; }
    .score-label { margin-left: 8px; font-size: 14px; font-weight: 600; }

    /* Status card */
    .status-display { display: flex; flex-direction: column; gap: 12px; }
    .status-badge {
      display: inline-block; padding: 6px 16px; border-radius: 16px;
      font-weight: 600; font-size: 14px; text-align: center;
    }
    .status-received    { background: #e3f2fd; color: #1565c0; }
    .status-assigned    { background: #e8f5e9; color: #2e7d32; }
    .status-in_progress { background: #fff3e0; color: #e65100; }
    .status-resolved    { background: #f3e5f5; color: #6a1b9a; }
    .status-closed      { background: #f5f5f5; color: #616161; }
    .assigned-to, .due-date, .resolved-at {
      display: flex; align-items: center; gap: 6px; font-size: 13px;
    }
    .overdue { color: #f44336; }
    .overdue-badge { background: #f44336; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; }
    .filled-star { color: #ffc107; }
    .feedback { font-size: 12px; color: #666; font-style: italic; }

    /* Timeline */
    .timeline { padding: 4px 0; }
    .timeline-item { display: flex; gap: 12px; min-height: 60px; }
    .timeline-left { display: flex; flex-direction: column; align-items: center; }
    .timeline-dot {
      width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0;
      margin-top: 4px;
    }
    .dot-received    { background: #2196f3; }
    .dot-assigned    { background: #4caf50; }
    .dot-in_progress { background: #ff9800; }
    .dot-resolved    { background: #9c27b0; }
    .dot-closed      { background: #9e9e9e; }
    .timeline-line { flex: 1; width: 2px; background: #e0e0e0; margin: 4px 0; }
    .timeline-content { flex: 1; padding-bottom: 16px; }
    .timeline-header { display: flex; justify-content: space-between; align-items: center; }
    .timeline-action { display: flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 500; }
    .from-status { color: #999; }
    .to-status { color: #333; }
    .arrow-icon { font-size: 14px; height: 14px; width: 14px; color: #999; }
    .timeline-time { font-size: 11px; color: #999; }
    .timeline-actor { font-size: 11px; color: #888; margin: 2px 0; }
    .timeline-notes {
      font-size: 12px; color: #555; background: #f9f9f9;
      padding: 6px 10px; border-radius: 4px; margin-top: 4px;
      border-left: 3px solid #e0e0e0;
    }

    @media (max-width: 900px) {
      .detail-layout { grid-template-columns: 1fr; }
      .side-panel { order: -1; }
    }
  `],
})
export class ComplaintDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);

  readonly ComplaintStatus = ComplaintStatus;
  readonly statusSteps = STATUS_STEPS;

  readonly complaint = signal<Complaint | null>(null);
  readonly loading = signal(true);

  private readonly fb = inject(FormBuilder);
  readonly actionForm = this.fb.group({
    assignedTo: [''],
    assignNote: [''],
    dueDate: [''],
    progressNote: [''],
    resolutionNotes: [''],
    closeNote: [''],
    satisfactionScore: [null as number | null],
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('complaintId')!;
    this.http.get<any>(`${environment.apiUrl}/complaints/${id}`).subscribe({
      next: (res) => { this.complaint.set(res.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  assign() {
    const c = this.complaint()!;
    this.patchComplaint({
      assignedTo: this.actionForm.get('assignedTo')!.value!,
      dueDate: this.actionForm.get('dueDate')!.value || undefined,
      notes: this.actionForm.get('assignNote')!.value || undefined,
    });
  }

  updateStatus(status: ComplaintStatus, notes?: string) {
    this.patchComplaint({ status, notes: notes || undefined });
  }

  resolve() {
    const notes = this.actionForm.get('resolutionNotes')!.value;
    if (!notes) return;
    this.patchComplaint({ status: ComplaintStatus.RESOLVED, resolutionNotes: notes });
  }

  close() {
    this.patchComplaint({
      status: ComplaintStatus.CLOSED,
      satisfactionScore: this.actionForm.get('satisfactionScore')!.value ?? undefined,
      notes: this.actionForm.get('closeNote')!.value || undefined,
    });
  }

  private patchComplaint(dto: Record<string, any>) {
    const id = this.complaint()!._id;
    this.http.patch<any>(`${environment.apiUrl}/complaints/${id}`, dto).subscribe({
      next: (res) => {
        this.complaint.set(res.data);
        this.snackBar.open('처리되었습니다.', '닫기', { duration: 3000 });
      },
      error: (err) => {
        this.snackBar.open(err.error?.error?.message ?? '처리 중 오류 발생', '닫기', { duration: 4000 });
      },
    });
  }

  // ── Helper predicates ──────────────────────────

  canTakeAction(): boolean {
    return !['CLOSED'].includes(this.complaint()?.status ?? '');
  }
  canAssign(): boolean {
    return ['RECEIVED', 'ASSIGNED'].includes(this.complaint()?.status ?? '');
  }
  canProgressUpdate(): boolean {
    return ['ASSIGNED'].includes(this.complaint()?.status ?? '');
  }
  canResolve(): boolean {
    return ['IN_PROGRESS', 'ASSIGNED'].includes(this.complaint()?.status ?? '');
  }
  canClose(): boolean {
    return this.complaint()?.status === ComplaintStatus.RESOLVED;
  }
  isOverdue(): boolean {
    const c = this.complaint();
    return !!(c?.dueDate && new Date(c.dueDate) < new Date() && !['RESOLVED', 'CLOSED'].includes(c.status));
  }

  isStepCompleted(step: ComplaintStatus): boolean {
    const currentIdx = STATUS_STEPS.indexOf(this.complaint()!.status);
    const stepIdx = STATUS_STEPS.indexOf(step);
    return stepIdx < currentIdx;
  }

  getStepDate(step: ComplaintStatus): string | null {
    const c = this.complaint()!;
    const event = [...c.timeline].reverse().find((e) => e.toStatus === step);
    return event?.timestamp ?? null;
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      RECEIVED: '접수', ASSIGNED: '배정', IN_PROGRESS: '처리중',
      RESOLVED: '해결', CLOSED: '종결',
    };
    return map[status] ?? status;
  }

  getStepLabel(step: ComplaintStatus): string { return this.getStatusLabel(step); }

  getPriorityColor(priority: string): string {
    const map: Record<string, string> = {
      LOW: '#4caf50', MEDIUM: '#2196f3', HIGH: '#ff9800', URGENT: '#f44336',
    };
    return map[priority] ?? '#9e9e9e';
  }
}
