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
import { BuildingsService, Building } from '../../../core/api/buildings.service';

interface DialogData { building: Building | null; complexId: string; }

@Component({
  selector: 'ax-building-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>{{ data.building ? 'edit' : 'add_circle' }}</mat-icon>
      {{ data.building ? '동 수정' : '동 추가' }}
    </h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form-grid">
        <mat-form-field appearance="outline" class="half">
          <mat-label>동 이름 *</mat-label>
          <input matInput formControlName="name" placeholder="101동" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="half">
          <mat-label>코드 *</mat-label>
          <input matInput formControlName="code" placeholder="B101" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="half">
          <mat-label>지상 층수 *</mat-label>
          <input matInput type="number" formControlName="totalFloors" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="half">
          <mat-label>지하 층수 *</mat-label>
          <input matInput type="number" formControlName="undergroundFloors" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="half">
          <mat-label>총 세대수 *</mat-label>
          <input matInput type="number" formControlName="totalUnits" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="half">
          <mat-label>준공일 *</mat-label>
          <input matInput formControlName="builtDate" placeholder="1998-06-30" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>구조 형식 *</mat-label>
          <input matInput formControlName="structureType" placeholder="철근콘크리트조" />
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
            mat-dialog-content{min-width:480px}`],
})
export class BuildingFormComponent implements OnInit {
  readonly data    = inject<DialogData>(MAT_DIALOG_DATA);
  private readonly svc      = inject(BuildingsService);
  private readonly dialogRef = inject(MatDialogRef<BuildingFormComponent>);
  private readonly fb       = inject(FormBuilder);
  private readonly snack    = inject(MatSnackBar);

  saving = signal(false);

  form = this.fb.group({
    name:             ['', Validators.required],
    code:             ['', Validators.required],
    totalFloors:      [null as number | null, [Validators.required, Validators.min(1)]],
    undergroundFloors:[0, Validators.min(0)],
    totalUnits:       [null as number | null, [Validators.required, Validators.min(1)]],
    builtDate:        ['', Validators.required],
    structureType:    ['철근콘크리트조', Validators.required],
  });

  ngOnInit() {
    if (this.data.building) this.form.patchValue(this.data.building as any);
  }

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const payload = { ...this.form.value, complexId: this.data.complexId } as any;
    const obs = this.data.building
      ? this.svc.update(this.data.building._id, payload)
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
