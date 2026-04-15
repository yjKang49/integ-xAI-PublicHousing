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
import { ZonesService, Zone } from '../../../core/api/zones.service';

interface DialogData { zone: Zone | null; floorId: string; buildingId: string; complexId: string; }

@Component({
  selector: 'ax-zone-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>{{ data.zone ? 'edit' : 'add_circle' }}</mat-icon>
      {{ data.zone ? '구역 수정' : '구역 추가' }}
    </h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form-grid">
        <mat-form-field appearance="outline" class="half">
          <mat-label>구역명 *</mat-label>
          <input matInput formControlName="name" placeholder="북측 복도" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="half">
          <mat-label>코드 *</mat-label>
          <input matInput formControlName="code" placeholder="Z-N01" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>설명</mat-label>
          <textarea matInput formControlName="description" rows="2"
                    placeholder="북쪽 계단 접근 복도"></textarea>
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
export class ZoneFormComponent implements OnInit {
  readonly data    = inject<DialogData>(MAT_DIALOG_DATA);
  private readonly svc      = inject(ZonesService);
  private readonly dialogRef = inject(MatDialogRef<ZoneFormComponent>);
  private readonly fb       = inject(FormBuilder);
  private readonly snack    = inject(MatSnackBar);

  saving = signal(false);

  form = this.fb.group({
    name:        ['', Validators.required],
    code:        ['', Validators.required],
    description: [''],
  });

  ngOnInit() {
    if (this.data.zone) this.form.patchValue(this.data.zone as any);
  }

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const payload = {
      ...this.form.value,
      floorId: this.data.floorId,
      buildingId: this.data.buildingId,
      complexId: this.data.complexId,
    } as any;
    const obs = this.data.zone
      ? this.svc.update(this.data.zone._id, payload)
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
