import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FloorsService, Floor } from '../../../core/api/floors.service';

interface DialogData { floor: Floor | null; buildingId: string; complexId: string; }

@Component({
  selector: 'ax-floor-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>{{ data.floor ? 'edit' : 'add_circle' }}</mat-icon>
      {{ data.floor ? '층 수정' : '층 추가' }}
    </h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form-grid">
        <mat-form-field appearance="outline" class="half">
          <mat-label>층 번호 * (지하는 음수)</mat-label>
          <input matInput type="number" formControlName="floorNumber" />
          <mat-hint>예: 지하2층 → -2, 지상3층 → 3</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline" class="half">
          <mat-label>표시명 *</mat-label>
          <input matInput formControlName="floorName" placeholder="B2, 1F, 3F" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>면적 (㎡) *</mat-label>
          <input matInput type="number" formControlName="area" step="0.1" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>취소</button>
      <button mat-raised-button color="primary"
              (click)="save()" [disabled]="form.invalid || saving()">
        @if (saving()) { <mat-spinner diameter="20"/> } @else { 저장 }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 16px}
            .full{grid-column:1/-1}.half{grid-column:span 1}
            mat-dialog-content{min-width:400px}`],
})
export class FloorFormComponent implements OnInit {
  readonly data    = inject<DialogData>(MAT_DIALOG_DATA);
  private readonly svc      = inject(FloorsService);
  private readonly dialogRef = inject(MatDialogRef<FloorFormComponent>);
  private readonly fb       = inject(FormBuilder);
  private readonly snack    = inject(MatSnackBar);

  saving = signal(false);

  form = this.fb.group({
    floorNumber: [null as number | null, Validators.required],
    floorName:   ['', Validators.required],
    area:        [null as number | null, [Validators.required, Validators.min(0)]],
  });

  ngOnInit() {
    if (this.data.floor) this.form.patchValue(this.data.floor as any);
  }

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const payload = {
      ...this.form.value,
      buildingId: this.data.buildingId,
      complexId: this.data.complexId,
    } as any;
    const obs = this.data.floor
      ? this.svc.update(this.data.floor._id, payload)
      : this.svc.create(payload);

    obs.subscribe({
      next: (v) => { this.dialogRef.close(v); },
      error: (e) => {
        this.snack.open(e.error?.message ?? '저장 실패', '닫기', { duration: 3000 });
        this.saving.set(false);
      },
    });
  }
}
