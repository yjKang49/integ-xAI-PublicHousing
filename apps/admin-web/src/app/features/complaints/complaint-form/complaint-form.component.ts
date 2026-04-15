import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { ComplaintCategory } from '@ax/shared';
import { environment } from '../../../../environments/environment';

const CATEGORY_LABELS: Record<string, string> = {
  FACILITY:   '시설물 결함',
  NOISE:      '소음',
  SANITATION: '위생',
  SAFETY:     '안전',
  PARKING:    '주차',
  ELEVATOR:   '엘리베이터',
  OTHER:      '기타',
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: '낮음', MEDIUM: '보통', HIGH: '높음', URGENT: '긴급',
};

@Component({
  selector: 'ax-complaint-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatDividerModule,
  ],
  template: `
    <div class="page-header">
      <button mat-icon-button routerLink="/complaints" matTooltip="목록으로">
        <mat-icon>arrow_back</mat-icon>
      </button>
      <h2>민원 등록</h2>
    </div>

    <mat-card class="form-card">
      <mat-card-header>
        <mat-icon mat-card-avatar>support_agent</mat-icon>
        <mat-card-title>새 민원 등록</mat-card-title>
        <mat-card-subtitle>입주민 또는 관리자가 접수한 민원을 등록합니다.</mat-card-subtitle>
      </mat-card-header>
      <mat-divider />
      <mat-card-content>
        <form [formGroup]="form" (ngSubmit)="submit()" class="form-grid">

          <mat-form-field appearance="outline" class="full">
            <mat-label>제목 *</mat-label>
            <input matInput formControlName="title" placeholder="민원 제목을 입력하세요" />
            @if (form.get('title')?.hasError('required') && form.get('title')?.touched) {
              <mat-error>제목은 필수입니다.</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>카테고리 *</mat-label>
            <mat-select formControlName="category">
              @for (c of categoryItems; track c.value) {
                <mat-option [value]="c.value">{{ c.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>우선순위</mat-label>
            <mat-select formControlName="priority">
              @for (p of priorityItems; track p.value) {
                <mat-option [value]="p.value">{{ p.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>접수자 *</mat-label>
            <input matInput formControlName="submittedBy" placeholder="성명 또는 동호수" />
            @if (form.get('submittedBy')?.hasError('required') && form.get('submittedBy')?.touched) {
              <mat-error>접수자는 필수입니다.</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>연락처</mat-label>
            <input matInput formControlName="submittedPhone" placeholder="010-0000-0000" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>동/호실</mat-label>
            <input matInput formControlName="unitNumber" placeholder="예: 101동 1201호" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>처리 기한</mat-label>
            <input matInput type="datetime-local" formControlName="dueDate" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="full">
            <mat-label>민원 내용 *</mat-label>
            <textarea matInput formControlName="description" rows="5"
              placeholder="민원 내용을 상세히 입력하세요"></textarea>
            @if (form.get('description')?.hasError('required') && form.get('description')?.touched) {
              <mat-error>내용은 필수입니다.</mat-error>
            }
          </mat-form-field>

          <div class="form-actions full">
            <button mat-stroked-button type="button" routerLink="/complaints">취소</button>
            <button mat-raised-button color="primary" type="submit"
              [disabled]="form.invalid || submitting()">
              @if (submitting()) { <mat-spinner diameter="18" style="display:inline-block" /> }
              @else { <mat-icon>send</mat-icon> }
              등록
            </button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .page-header { display:flex; align-items:center; gap:8px; margin-bottom:16px; }
    .page-header h2 { margin:0; font-size:22px; font-weight:600; }
    .form-card { max-width:800px; }
    .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:0 16px; padding:16px 0; }
    .full { grid-column:1 / -1; }
    .form-actions { display:flex; justify-content:flex-end; gap:12px; padding-top:8px; }
  `],
})
export class ComplaintFormComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  readonly submitting = signal(false);

  readonly form = this.fb.group({
    title:          ['', Validators.required],
    category:       [ComplaintCategory.FACILITY, Validators.required],
    priority:       ['MEDIUM'],
    submittedBy:    ['', Validators.required],
    submittedPhone: [''],
    unitNumber:     [''],
    dueDate:        [''],
    description:    ['', Validators.required],
  });

  readonly categoryItems = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }));
  readonly priorityItems = Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }));

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting.set(true);

    const val = this.form.value;
    const payload: any = {
      title: val.title,
      category: val.category,
      priority: val.priority,
      submittedBy: val.submittedBy,
      description: val.description,
      submittedAt: new Date().toISOString(),
      status: 'RECEIVED',
      mediaIds: [],
      timeline: [],
    };
    if (val.submittedPhone) payload.submittedPhone = val.submittedPhone;
    if (val.unitNumber) payload.unitNumber = val.unitNumber;
    if (val.dueDate) payload.dueDate = new Date(val.dueDate).toISOString();

    this.http.post<any>(`${environment.apiUrl}/complaints`, payload).subscribe({
      next: (res) => {
        this.snackBar.open('민원이 등록되었습니다.', '닫기', { duration: 2000 });
        const id = res.data?._id ?? res._id;
        this.router.navigate(['/complaints', id ?? '']);
      },
      error: () => {
        this.snackBar.open('등록 중 오류가 발생했습니다.', '닫기', { duration: 3000 });
        this.submitting.set(false);
      },
    });
  }
}
