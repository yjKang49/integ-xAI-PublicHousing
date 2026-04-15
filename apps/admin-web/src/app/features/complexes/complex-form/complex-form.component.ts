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
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { ComplexesService, Complex } from '../../../core/api/complexes.service';

@Component({
  selector: 'ax-complex-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatChipsModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>{{ editMode ? 'edit' : 'add_circle' }}</mat-icon>
      {{ editMode ? '단지 수정' : '새 단지 등록' }}
    </h2>

    <mat-dialog-content>
      <form [formGroup]="form" class="form-grid">
        <mat-form-field appearance="outline" class="full">
          <mat-label>단지명 *</mat-label>
          <input matInput formControlName="name" placeholder="행복마을 1단지" />
          <mat-error>단지명을 입력하세요 (2자 이상)</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>주소 *</mat-label>
          <input matInput formControlName="address" placeholder="서울특별시 강남구..." />
          <mat-error>주소를 입력하세요</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="half">
          <mat-label>총 세대수 *</mat-label>
          <input matInput type="number" formControlName="totalUnits" min="1" />
          <mat-error>유효한 세대수를 입력하세요</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="half">
          <mat-label>총 동수 *</mat-label>
          <input matInput type="number" formControlName="totalBuildings" min="1" />
          <mat-error>유효한 동수를 입력하세요</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="half">
          <mat-label>준공연도 *</mat-label>
          <input matInput type="number" formControlName="builtYear" placeholder="1998" />
          <mat-error>준공연도를 입력하세요</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="half">
          <mat-label>담당자 ID</mat-label>
          <input matInput formControlName="managedBy" placeholder="user:org001:..." />
        </mat-form-field>

        <mat-form-field appearance="outline" class="half">
          <mat-label>위도</mat-label>
          <input matInput type="number" formControlName="latitude" step="0.0001" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="half">
          <mat-label>경도</mat-label>
          <input matInput type="number" formControlName="longitude" step="0.0001" />
        </mat-form-field>

        <!-- 태그 -->
        <mat-form-field appearance="outline" class="full">
          <mat-label>태그 (Enter로 추가)</mat-label>
          <mat-chip-grid #chipGrid>
            @for (tag of tags(); track tag) {
              <mat-chip-row (removed)="removeTag(tag)">
                {{ tag }}
                <button matChipRemove><mat-icon>cancel</mat-icon></button>
              </mat-chip-row>
            }
          </mat-chip-grid>
          <input placeholder="예: 아파트"
                 [matChipInputFor]="chipGrid"
                 [matChipInputSeparatorKeyCodes]="separatorKeys"
                 (matChipInputTokenEnd)="addTag($event)" />
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>취소</button>
      <button mat-raised-button color="primary"
              (click)="save()" [disabled]="form.invalid || saving()">
        @if (saving()) { <mat-spinner diameter="20" /> }
        @else { {{ editMode ? '저장' : '등록' }} }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
    .full  { grid-column: 1 / -1; }
    .half  { grid-column: span 1; }
    mat-dialog-content { min-width: 520px; max-height: 75vh; }
  `],
})
export class ComplexFormComponent implements OnInit {
  private readonly svc     = inject(ComplexesService);
  private readonly dialogRef = inject(MatDialogRef<ComplexFormComponent>);
  private readonly data    = inject<Complex | null>(MAT_DIALOG_DATA);
  private readonly fb      = inject(FormBuilder);
  private readonly snack   = inject(MatSnackBar);

  editMode = false;
  saving   = signal(false);
  tags     = signal<string[]>([]);
  readonly separatorKeys = [ENTER, COMMA];

  form = this.fb.group({
    name:          ['', [Validators.required, Validators.minLength(2)]],
    address:       ['', Validators.required],
    totalUnits:    [null as number | null, [Validators.required, Validators.min(1)]],
    totalBuildings:[null as number | null, [Validators.required, Validators.min(1)]],
    builtYear:     [null as number | null, [Validators.required, Validators.min(1950)]],
    managedBy:     [''],
    latitude:      [null as number | null],
    longitude:     [null as number | null],
  });

  ngOnInit() {
    if (this.data) {
      this.editMode = true;
      this.form.patchValue(this.data as any);
      this.tags.set([...(this.data.tags ?? [])]);
    }
  }

  addTag(event: MatChipInputEvent) {
    const val = (event.value ?? '').trim();
    if (val) this.tags.update((t) => [...t, val]);
    event.chipInput?.clear();
  }

  removeTag(tag: string) {
    this.tags.update((t) => t.filter((x) => x !== tag));
  }

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);

    const payload = { ...this.form.value, tags: this.tags() } as any;

    const obs = this.editMode
      ? this.svc.update(this.data!._id, payload)
      : this.svc.create(payload);

    obs.subscribe({
      next: (saved) => {
        this.snack.open(
          this.editMode ? '단지 정보가 수정되었습니다.' : '단지가 등록되었습니다.',
          '닫기', { duration: 3000 },
        );
        this.dialogRef.close(saved);
      },
      error: (err) => {
        this.snack.open(err.error?.message ?? '저장 실패', '닫기', { duration: 4000 });
        this.saving.set(false);
      },
    });
  }
}
