import { Component, OnInit, inject, signal } from '@angular/core';
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
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'ax-project-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatDividerModule,
  ],
  template: `
    <div class="page-header">
      <button mat-icon-button routerLink="/inspection/projects" matTooltip="목록으로">
        <mat-icon>arrow_back</mat-icon>
      </button>
      <h2>점검 프로젝트 생성</h2>
    </div>

    <mat-card class="form-card">
      <mat-card-header>
        <mat-icon mat-card-avatar>assignment_add</mat-icon>
        <mat-card-title>새 점검 프로젝트</mat-card-title>
        <mat-card-subtitle>점검 프로젝트를 생성하고 담당 점검자를 배정합니다.</mat-card-subtitle>
      </mat-card-header>
      <mat-divider />
      <mat-card-content>
        <form [formGroup]="form" (ngSubmit)="submit()" class="form-grid">

          <mat-form-field appearance="outline" class="full">
            <mat-label>프로젝트명 *</mat-label>
            <input matInput formControlName="name" placeholder="예: 2026년 1차 정기점검" />
            @if (form.get('name')?.hasError('required') && form.get('name')?.touched) {
              <mat-error>프로젝트명은 필수입니다.</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>점검 유형 *</mat-label>
            <mat-select formControlName="inspectionType">
              <mat-option value="REGULAR">정기점검</mat-option>
              <mat-option value="EMERGENCY">긴급점검</mat-option>
              <mat-option value="SPECIAL">특별점검</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>점검 차수</mat-label>
            <input matInput type="number" formControlName="round" min="1" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>계획 시작일 *</mat-label>
            <input matInput type="date" formControlName="plannedStartDate" />
            @if (form.get('plannedStartDate')?.hasError('required') && form.get('plannedStartDate')?.touched) {
              <mat-error>시작일은 필수입니다.</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>계획 종료일 *</mat-label>
            <input matInput type="date" formControlName="plannedEndDate" />
            @if (form.get('plannedEndDate')?.hasError('required') && form.get('plannedEndDate')?.touched) {
              <mat-error>종료일은 필수입니다.</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>책임 점검자 ID</mat-label>
            <input matInput formControlName="leadInspectorId" placeholder="사용자 ID" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>검토자 ID</mat-label>
            <input matInput formControlName="reviewerId" placeholder="사용자 ID (선택)" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="full">
            <mat-label>설명</mat-label>
            <textarea matInput formControlName="description" rows="3"
              placeholder="점검 목적 및 특이사항"></textarea>
          </mat-form-field>

          <div class="form-actions full">
            <button mat-stroked-button type="button" routerLink="/inspection/projects">취소</button>
            <button mat-raised-button color="primary" type="submit"
              [disabled]="form.invalid || submitting()">
              @if (submitting()) { <mat-spinner diameter="18" style="display:inline-block" /> }
              @else { <mat-icon>save</mat-icon> }
              프로젝트 생성
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
export class ProjectFormComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  readonly submitting = signal(false);

  readonly form = this.fb.group({
    name:             ['', Validators.required],
    inspectionType:   ['REGULAR', Validators.required],
    round:            [1],
    plannedStartDate: ['', Validators.required],
    plannedEndDate:   ['', Validators.required],
    leadInspectorId:  [''],
    reviewerId:       [''],
    description:      [''],
  });

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting.set(true);

    const val = this.form.value;
    const payload: any = {
      name: val.name,
      inspectionType: val.inspectionType,
      round: val.round ?? 1,
      plannedStartDate: val.plannedStartDate,
      plannedEndDate: val.plannedEndDate,
      status: 'PLANNED',
      sessionIds: [],
      leadInspectorId: val.leadInspectorId || '',
    };
    if (val.reviewerId) payload.reviewerId = val.reviewerId;
    if (val.description) payload.description = val.description;

    this.http.post<any>(`${environment.apiUrl}/projects`, payload).subscribe({
      next: (res) => {
        this.snackBar.open('프로젝트가 생성되었습니다.', '닫기', { duration: 2000 });
        const id = res.data?._id ?? res._id;
        this.router.navigate(['/inspection/projects', id ?? '']);
      },
      error: () => {
        this.snackBar.open('생성 중 오류가 발생했습니다.', '닫기', { duration: 3000 });
        this.submitting.set(false);
      },
    });
  }
}
