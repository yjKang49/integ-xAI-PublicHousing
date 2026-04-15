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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { environment } from '../../../../environments/environment';

const REPORT_TYPE_OPTIONS = [
  { value: 'INSPECTION_RESULT', label: '점검 결과' },
  { value: 'PHOTO_SHEET',       label: '사진 대지' },
  { value: 'DEFECT_LIST',       label: '결함 목록' },
  { value: 'SUMMARY',           label: '요약 보고서' },
  { value: 'CRACK_TREND',       label: '균열 추이' },
];

@Component({
  selector: 'ax-report-generate',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatDividerModule, MatCheckboxModule,
  ],
  template: `
    <div class="page-header">
      <button mat-icon-button routerLink="/reports" matTooltip="목록으로">
        <mat-icon>arrow_back</mat-icon>
      </button>
      <h2>보고서 생성</h2>
    </div>

    <mat-card class="form-card">
      <mat-card-header>
        <mat-icon mat-card-avatar>picture_as_pdf</mat-icon>
        <mat-card-title>새 보고서 생성</mat-card-title>
        <mat-card-subtitle>보고서 유형과 대상 범위를 선택하여 보고서를 생성합니다.</mat-card-subtitle>
      </mat-card-header>
      <mat-divider />
      <mat-card-content>
        <form [formGroup]="form" (ngSubmit)="submit()" class="form-grid">

          <mat-form-field appearance="outline" class="full">
            <mat-label>보고서 제목 *</mat-label>
            <input matInput formControlName="title" placeholder="예: 2026년 1차 정기점검 결과 보고서" />
            @if (form.get('title')?.hasError('required') && form.get('title')?.touched) {
              <mat-error>보고서 제목은 필수입니다.</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>보고서 유형 *</mat-label>
            <mat-select formControlName="reportType">
              @for (t of reportTypeOptions; track t.value) {
                <mat-option [value]="t.value">{{ t.label }}</mat-option>
              }
            </mat-select>
            @if (form.get('reportType')?.hasError('required') && form.get('reportType')?.touched) {
              <mat-error>유형을 선택하세요.</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>파일 형식</mat-label>
            <mat-select formControlName="format">
              <mat-option value="PDF">PDF</mat-option>
              <mat-option value="EXCEL">Excel</mat-option>
              <mat-option value="WORD">Word</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>점검 프로젝트 ID</mat-label>
            <input matInput formControlName="projectId" placeholder="프로젝트 ID (선택)" />
            <mat-hint>특정 프로젝트 범위로 한정할 경우 입력</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>점검 세션 ID</mat-label>
            <input matInput formControlName="sessionId" placeholder="세션 ID (선택)" />
            <mat-hint>특정 세션 데이터만 포함할 경우 입력</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>기간 시작</mat-label>
            <input matInput type="date" formControlName="dateFrom" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>기간 종료</mat-label>
            <input matInput type="date" formControlName="dateTo" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="full">
            <mat-label>비고</mat-label>
            <textarea matInput formControlName="notes" rows="3"
              placeholder="보고서 관련 특이사항"></textarea>
          </mat-form-field>

          <div class="form-actions full">
            <button mat-stroked-button type="button" routerLink="/reports">취소</button>
            <button mat-raised-button color="primary" type="submit"
              [disabled]="form.invalid || submitting()">
              @if (submitting()) {
                <mat-spinner diameter="18" style="display:inline-block;margin-right:6px" />
                생성 중...
              } @else {
                <ng-container>
                  <mat-icon>picture_as_pdf</mat-icon>
                  보고서 생성
                </ng-container>
              }
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
export class ReportGenerateComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  readonly submitting = signal(false);
  readonly reportTypeOptions = REPORT_TYPE_OPTIONS;

  readonly form = this.fb.group({
    title:      ['', Validators.required],
    reportType: ['INSPECTION_RESULT', Validators.required],
    format:     ['PDF'],
    projectId:  [''],
    sessionId:  [''],
    dateFrom:   [''],
    dateTo:     [''],
    notes:      [''],
  });

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting.set(true);

    const val = this.form.value;
    const payload: any = {
      title:      val.title,
      reportType: val.reportType,
      format:     val.format ?? 'PDF',
    };
    if (val.projectId) payload.projectId = val.projectId;
    if (val.sessionId) payload.sessionId = val.sessionId;
    if (val.dateFrom)  payload.dateFrom  = val.dateFrom;
    if (val.dateTo)    payload.dateTo    = val.dateTo;
    if (val.notes)     payload.notes     = val.notes;

    this.http.post<any>(`${environment.apiUrl}/reports/generate`, payload).subscribe({
      next: (res) => {
        this.snackBar.open('보고서 생성이 요청되었습니다.', '닫기', { duration: 2000 });
        this.router.navigate(['/reports']);
      },
      error: () => {
        this.snackBar.open('보고서 생성 중 오류가 발생했습니다.', '닫기', { duration: 3000 });
        this.submitting.set(false);
      },
    });
  }
}
