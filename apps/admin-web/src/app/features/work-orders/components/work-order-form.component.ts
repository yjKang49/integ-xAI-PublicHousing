// apps/admin-web/src/app/features/work-orders/components/work-order-form.component.ts
/**
 * WorkOrderFormComponent
 *
 * Dialog/inline form for creating a new WorkOrder linked to a Complaint or Defect.
 * Emits `saved` with the created WorkOrder on success.
 */
import {
  Component, inject, input, output, signal, OnInit, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { WorkOrder } from '@ax/shared';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'ax-work-order-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatSelectModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule,
  ],
  template: `
    <form [formGroup]="form" class="wo-form">
      <h3 class="form-title">
        <mat-icon>assignment</mat-icon>
        작업지시 생성
        @if (complaintId()) {
          <span class="linked-label">민원 연계</span>
        }
        @if (defectId()) {
          <span class="linked-label defect">결함 연계</span>
        }
      </h3>

      <mat-form-field appearance="outline" class="full">
        <mat-label>제목 *</mat-label>
        <input matInput formControlName="title" />
      </mat-form-field>

      <mat-form-field appearance="outline" class="full">
        <mat-label>작업 내용 *</mat-label>
        <textarea matInput formControlName="description" rows="3"
          placeholder="현장 조치 상세 내용을 입력하세요"></textarea>
      </mat-form-field>

      <div class="row-2">
        <mat-form-field appearance="outline">
          <mat-label>담당자 ID *</mat-label>
          <input matInput formControlName="assignedTo" placeholder="inspector001" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>조치 예정일 *</mat-label>
          <input matInput type="datetime-local" formControlName="scheduledDate" />
        </mat-form-field>
      </div>

      <div class="row-2">
        <mat-form-field appearance="outline">
          <mat-label>우선순위</mat-label>
          <mat-select formControlName="priority">
            <mat-option value="LOW">낮음</mat-option>
            <mat-option value="MEDIUM">보통</mat-option>
            <mat-option value="HIGH">높음</mat-option>
            <mat-option value="URGENT">긴급</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>예상 비용 (원)</mat-label>
          <input matInput type="number" formControlName="estimatedCost" />
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" class="full">
        <mat-label>외부 업체</mat-label>
        <input matInput formControlName="vendor" placeholder="업체명 (선택)" />
      </mat-form-field>

      <div class="form-actions">
        @if (saving()) {
          <mat-spinner diameter="24"></mat-spinner>
        }
        <button mat-button type="button" (click)="cancel.emit()" [disabled]="saving()">취소</button>
        <button mat-raised-button color="primary" type="submit"
          (click)="submit()" [disabled]="form.invalid || saving()">
          <mat-icon>save</mat-icon>
          작업지시 생성
        </button>
      </div>
    </form>
  `,
  styles: [`
    .wo-form { display: flex; flex-direction: column; gap: 12px; padding: 4px 0; }
    .form-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 16px; font-weight: 600; margin: 0 0 4px;
    }
    .linked-label {
      font-size: 11px; font-weight: 400; background: #e3f2fd; color: #1565c0;
      padding: 2px 8px; border-radius: 12px;
    }
    .linked-label.defect { background: #f3e5f5; color: #6a1b9a; }
    .full { width: 100%; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-actions {
      display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin-top: 4px;
    }
  `],
})
export class WorkOrderFormComponent implements OnInit {
  private readonly http     = inject(HttpClient);
  private readonly fb       = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  // ── Inputs ─────────────────────────────────────────────────────
  readonly complexId    = input<string>('');
  readonly buildingId   = input<string | undefined>(undefined);
  readonly complaintId  = input<string | undefined>(undefined);
  readonly defectId     = input<string | undefined>(undefined);
  readonly titlePrefix  = input<string>('');

  // ── Outputs ────────────────────────────────────────────────────
  readonly saved  = output<WorkOrder>();
  readonly cancel = output<void>();

  readonly saving = signal(false);

  readonly form = this.fb.group({
    title:         ['', Validators.required],
    description:   ['', Validators.required],
    assignedTo:    ['', Validators.required],
    scheduledDate: ['', Validators.required],
    priority:      ['MEDIUM'],
    estimatedCost: [null as number | null],
    vendor:        [''],
  });

  ngOnInit() {
    if (this.titlePrefix()) {
      this.form.patchValue({ title: this.titlePrefix() });
    }
  }

  submit() {
    if (this.form.invalid) return;
    this.saving.set(true);

    const v = this.form.value;
    const dto = {
      complexId:    this.complexId(),
      buildingId:   this.buildingId(),
      complaintId:  this.complaintId(),
      defectId:     this.defectId(),
      title:        v.title,
      description:  v.description,
      assignedTo:   v.assignedTo,
      scheduledDate: v.scheduledDate,
      priority:     v.priority ?? 'MEDIUM',
      estimatedCost: v.estimatedCost ?? undefined,
      vendor:       v.vendor || undefined,
    };

    this.http.post<any>(`${environment.apiUrl}/work-orders`, dto).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.snackBar.open('작업지시가 생성되었습니다.', '닫기', { duration: 2500 });
        this.saved.emit(res.data ?? res);
      },
      error: (err) => {
        this.saving.set(false);
        this.snackBar.open(err.error?.message ?? '생성 실패', '닫기', { duration: 3500 });
      },
    });
  }
}
