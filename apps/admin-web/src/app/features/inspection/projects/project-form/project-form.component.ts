import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { HttpClient } from '@angular/common/http';
import { ComplexesService, Complex } from '../../../../core/api/complexes.service';
import { UsersApiService, UserProfile } from '../../../../core/api/users.service';
import { AuthStore } from '../../../../core/store/auth.store';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'ax-project-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatDividerModule,
    MatDatepickerModule, MatNativeDateModule,
    MatAutocompleteModule,
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

          <!-- 날짜: MatDatepicker 사용 -->
          <mat-form-field appearance="outline">
            <mat-label>계획 시작일 *</mat-label>
            <input matInput [matDatepicker]="startPicker" formControlName="plannedStartDate"
              placeholder="YYYY-MM-DD" readonly />
            <mat-datepicker-toggle matIconSuffix [for]="startPicker" />
            <mat-datepicker #startPicker />
            @if (form.get('plannedStartDate')?.hasError('required') && form.get('plannedStartDate')?.touched) {
              <mat-error>시작일은 필수입니다.</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>계획 종료일 *</mat-label>
            <input matInput [matDatepicker]="endPicker" formControlName="plannedEndDate"
              placeholder="YYYY-MM-DD" readonly />
            <mat-datepicker-toggle matIconSuffix [for]="endPicker" />
            <mat-datepicker #endPicker />
            @if (form.get('plannedEndDate')?.hasError('required') && form.get('plannedEndDate')?.touched) {
              <mat-error>종료일은 필수입니다.</mat-error>
            }
          </mat-form-field>

          <!-- 책임 점검자 autocomplete -->
          <mat-form-field appearance="outline">
            <mat-label>책임 점검자</mat-label>
            <input matInput formControlName="leadInspector"
              [matAutocomplete]="leadAc"
              placeholder="이름으로 검색 (예: 홍)" />
            <mat-autocomplete #leadAc="matAutocomplete" [displayWith]="displayUser">
              @for (u of filteredInspectors(); track u._id) {
                <mat-option [value]="u">
                  {{ u.name }}
                  <span class="ac-email">{{ u.email }}</span>
                </mat-option>
              }
            </mat-autocomplete>
          </mat-form-field>

          <!-- 검토자 autocomplete -->
          <mat-form-field appearance="outline">
            <mat-label>검토자 (선택)</mat-label>
            <input matInput formControlName="reviewer"
              [matAutocomplete]="reviewerAc"
              placeholder="이름으로 검색 (예: 홍)" />
            <mat-autocomplete #reviewerAc="matAutocomplete" [displayWith]="displayUser">
              @for (u of filteredReviewers(); track u._id) {
                <mat-option [value]="u">
                  {{ u.name }}
                  <span class="ac-email">{{ u.email }}</span>
                </mat-option>
              }
            </mat-autocomplete>
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
    .ac-email { margin-left:8px; font-size:12px; color:#888; }
  `],
})
export class ProjectFormComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private readonly complexesSvc = inject(ComplexesService);
  private readonly usersSvc = inject(UsersApiService);
  private readonly authStore = inject(AuthStore);

  readonly submitting = signal(false);
  readonly complexes = signal<Complex[]>([]);
  readonly allUsers = signal<UserProfile[]>([]);
  readonly filteredInspectors = signal<UserProfile[]>([]);
  readonly filteredReviewers = signal<UserProfile[]>([]);

  readonly form = this.fb.group({
    complexId:        ['', Validators.required],
    name:             ['', Validators.required],
    inspectionType:   ['REGULAR', Validators.required],
    round:            [1],
    plannedStartDate: [null as Date | null, Validators.required],
    plannedEndDate:   [null as Date | null, Validators.required],
    leadInspector:    [null as UserProfile | string | null],
    reviewer:         [null as UserProfile | string | null],
    description:      [''],
  });

  ngOnInit() {
    this.complexesSvc.list().subscribe((list) => this.complexes.set(list));

    const orgId = this.authStore.user()?.organizationId ?? '';
    this.usersSvc.list(orgId).subscribe((list) => {
      this.allUsers.set(list);
      // 초기 목록 = 전체 (빈 검색)
      this.filteredInspectors.set(list);
      this.filteredReviewers.set(list);
    });

    this.form.get('leadInspector')!.valueChanges.subscribe((v) => {
      if (typeof v === 'string') {
        this.filteredInspectors.set(this.filterUsers(v));
      }
    });

    this.form.get('reviewer')!.valueChanges.subscribe((v) => {
      if (typeof v === 'string') {
        this.filteredReviewers.set(this.filterUsers(v));
      }
    });
  }

  displayUser(u: UserProfile | null): string {
    return u?.name ?? '';
  }

  private filterUsers(query: string): UserProfile[] {
    const q = query.toLowerCase();
    return this.allUsers().filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
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

    const val = this.form.value;
    const leadInspector = val.leadInspector;
    const reviewer = val.reviewer;

    // 자동완성에서 직접 선택하지 않고 텍스트만 입력한 경우 경고
    if (typeof leadInspector === 'string' && leadInspector.trim()) {
      this.snackBar.open('책임 점검자를 목록에서 선택해 주세요.', '닫기', { duration: 3000 });
      this.submitting.set(false);
      return;
    }
    if (typeof reviewer === 'string' && reviewer.trim()) {
      this.snackBar.open('검토자를 목록에서 선택해 주세요.', '닫기', { duration: 3000 });
      this.submitting.set(false);
      return;
    }

    const leadInspectorObj = leadInspector as UserProfile | null;
    const reviewerObj = reviewer as UserProfile | null;

    const payload: any = {
      complexId:        val.complexId,
      name:             val.name,
      inspectionType:   val.inspectionType,
      round:            Number(val.round) || 1,
      plannedStartDate: this.formatDate(val.plannedStartDate),
      plannedEndDate:   this.formatDate(val.plannedEndDate),
      leadInspectorId:  leadInspectorObj?._id ?? '',
    };
    if (reviewerObj?._id) payload.reviewerId = reviewerObj._id;
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
