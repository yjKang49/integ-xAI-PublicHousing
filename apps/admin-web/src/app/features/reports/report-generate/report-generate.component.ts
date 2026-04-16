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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { InspectionSession } from '@ax/shared';
import { ComplexesService, Complex } from '../../../core/api/complexes.service';
import { environment } from '../../../../environments/environment';

const REPORT_TYPE_OPTIONS = [
  { value: 'INSPECTION_RESULT', label: '점검 결과' },
  { value: 'PHOTO_SHEET',       label: '사진 대지' },
  { value: 'DEFECT_LIST',       label: '결함 목록' },
  { value: 'SUMMARY',           label: '요약 보고서' },
  { value: 'CRACK_TREND',       label: '균열 추이' },
];

const SESSION_STATUS_LABELS: Record<string, string> = {
  DRAFT: '초안', ASSIGNED: '배정됨', IN_PROGRESS: '진행 중',
  SUBMITTED: '제출됨', APPROVED: '승인됨',
};

@Component({
  selector: 'ax-report-generate',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatDividerModule,
    MatDatepickerModule, MatNativeDateModule, MatTooltipModule,
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

          <!-- 단지 선택 -->
          <mat-form-field appearance="outline" class="full">
            <mat-label>단지 *</mat-label>
            <mat-select formControlName="complexId">
              @if (complexes().length === 0) {
                <mat-option disabled>단지를 불러오는 중...</mat-option>
              }
              @for (c of complexes(); track c._id) {
                <mat-option [value]="c._id">{{ c.name }} ({{ c.address }})</mat-option>
              }
            </mat-select>
            @if (form.get('complexId')?.hasError('required') && form.get('complexId')?.touched) {
              <mat-error>단지를 선택해 주세요.</mat-error>
            }
          </mat-form-field>

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
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>파일 형식</mat-label>
            <mat-select formControlName="format">
              <mat-option value="PDF">PDF</mat-option>
              <mat-option value="EXCEL">Excel</mat-option>
              <mat-option value="WORD">Word</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- 점검 프로젝트 ID → 입력 시 세션 자동 조회 -->
          <mat-form-field appearance="outline" class="full">
            <mat-label>점검 프로젝트 ID</mat-label>
            <input matInput formControlName="projectId"
              placeholder="프로젝트 ID 입력 시 세션 목록 자동 조회" />
            @if (sessionsLoading()) {
              <mat-spinner matSuffix diameter="18" />
            } @else if (sessions().length > 0) {
              <mat-icon matSuffix style="color:var(--ax-color-success)">check_circle</mat-icon>
            }
            <mat-hint>
              @if (sessions().length > 0) {
                {{ sessions().length }}개 세션 조회됨
              } @else {
                프로젝트 ID를 입력하면 세션 목록을 자동으로 불러옵니다
              }
            </mat-hint>
          </mat-form-field>

          <!-- 세션 선택 — 프로젝트 ID 입력 후 자동 활성화 -->
          <mat-form-field appearance="outline" class="full">
            <mat-label>점검 세션 선택</mat-label>
            <mat-select formControlName="sessionId">
              <mat-option value="">세션 전체 (프로젝트 전체 범위)</mat-option>
              @for (s of sessions(); track s._id) {
                <mat-option [value]="s._id">{{ sessionLabel(s) }}</mat-option>
              }
            </mat-select>
            @if (sessions().length === 0 && !form.get('projectId')?.value) {
              <mat-hint>프로젝트 ID 입력 후 세션을 선택할 수 있습니다</mat-hint>
            }
          </mat-form-field>

          <!-- 기간 — MatDatepicker 사용 -->
          <mat-form-field appearance="outline">
            <mat-label>기간 시작</mat-label>
            <input matInput [matDatepicker]="fromPicker" formControlName="dateFrom"
              placeholder="YYYY-MM-DD" readonly />
            <mat-datepicker-toggle matIconSuffix [for]="fromPicker" />
            <mat-datepicker #fromPicker />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>기간 종료</mat-label>
            <input matInput [matDatepicker]="toPicker" formControlName="dateTo"
              placeholder="YYYY-MM-DD" readonly />
            <mat-datepicker-toggle matIconSuffix [for]="toPicker" />
            <mat-datepicker #toPicker />
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
              @if (submitting()) { <mat-spinner diameter="18" style="display:inline-block;margin-right:6px" /> }
              @else { <mat-icon>picture_as_pdf</mat-icon> }
              {{ submitting() ? '생성 중...' : '보고서 생성' }}
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
export class ReportGenerateComponent implements OnInit {
  private readonly http        = inject(HttpClient);
  private readonly router      = inject(Router);
  private readonly fb          = inject(FormBuilder);
  private readonly snackBar    = inject(MatSnackBar);
  private readonly complexesSvc = inject(ComplexesService);

  readonly submitting        = signal(false);
  readonly sessionsLoading   = signal(false);
  readonly sessions          = signal<InspectionSession[]>([]);
  readonly complexes         = signal<Complex[]>([]);
  readonly reportTypeOptions = REPORT_TYPE_OPTIONS;

  readonly form = this.fb.group({
    complexId:  ['', Validators.required],
    title:      ['', Validators.required],
    reportType: ['INSPECTION_RESULT', Validators.required],
    format:     ['PDF'],
    projectId:  [''],
    sessionId:  [''],
    dateFrom:   [null as Date | null],
    dateTo:     [null as Date | null],
    notes:      [''],
  });

  ngOnInit() {
    this.complexesSvc.list().subscribe((list) => this.complexes.set(list));

    // 초기에는 sessionId 비활성화
    this.form.get('sessionId')!.disable();

    // projectId 변경 시 세션 자동 조회 (debounce 600ms)
    this.form.get('projectId')!.valueChanges.pipe(
      debounceTime(600),
      distinctUntilChanged(),
    ).subscribe((id) => {
      const trimmed = (id ?? '').trim();
      if (!trimmed) {
        this.sessions.set([]);
        this.form.get('sessionId')!.setValue('');
        return;
      }
      this.loadSessions(trimmed);
    });
  }

  private loadSessions(projectId: string) {
    this.sessionsLoading.set(true);
    const sessionCtrl = this.form.get('sessionId')!;
    sessionCtrl.setValue('');
    sessionCtrl.disable();
    this.http.get<any>(`${environment.apiUrl}/projects/${encodeURIComponent(projectId)}/sessions`)
      .subscribe({
        next: (res) => {
          const list: InspectionSession[] = res.data ?? [];
          this.sessions.set(list);
          if (list.length > 0) sessionCtrl.enable();
          this.sessionsLoading.set(false);
        },
        error: () => {
          this.sessions.set([]);
          sessionCtrl.enable();
          this.sessionsLoading.set(false);
          this.snackBar.open('해당 프로젝트의 세션을 불러오지 못했습니다.', '닫기', { duration: 3000 });
        },
      });
  }

  sessionLabel(s: InspectionSession): string {
    const status = SESSION_STATUS_LABELS[s.status] ?? s.status;
    const building = s.buildingId.split(':').pop() ?? s.buildingId;
    return `${building} — ${status}`;
  }

  private formatDate(d: Date | null | undefined): string {
    if (!d) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting.set(true);

    const val = this.form.getRawValue();
    const payload: any = {
      complexId:  val.complexId,
      title:      val.title,
      reportType: val.reportType,
      parameters: { format: val.format ?? 'PDF' },
    };
    if (val.projectId?.trim()) payload.projectId = val.projectId.trim();
    if (val.sessionId?.trim()) payload.sessionId = val.sessionId.trim();
    const dateFrom = this.formatDate(val.dateFrom);
    const dateTo   = this.formatDate(val.dateTo);
    if (dateFrom) payload.parameters['dateFrom'] = dateFrom;
    if (dateTo)   payload.parameters['dateTo']   = dateTo;
    if (val.notes?.trim()) payload.parameters['notes'] = val.notes.trim();

    this.http.post<any>(`${environment.apiUrl}/reports/generate`, payload).subscribe({
      next: () => {
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
