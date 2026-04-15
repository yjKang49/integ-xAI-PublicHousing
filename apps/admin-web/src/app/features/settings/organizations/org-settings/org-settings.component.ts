import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
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
import { MatChipsModule } from '@angular/material/chips';
import { Organization } from '@ax/shared';
import { environment } from '../../../../../environments/environment';

const PLAN_LABELS: Record<string, string> = {
  FREE:       'Free',
  STARTER:    'Starter',
  PRO:        'Pro',
  ENTERPRISE: 'Enterprise',
};

@Component({
  selector: 'ax-org-settings',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatDividerModule, MatChipsModule,
  ],
  template: `
    <div class="page-header">
      <h2>기관 설정</h2>
      @if (org()) {
        <span class="plan-badge plan-{{ org()!.plan.toLowerCase() }}">{{ planLabel(org()!.plan) }}</span>
      }
    </div>

    @if (loading()) {
      <div class="loading-center"><mat-spinner diameter="48" /></div>
    } @else if (form) {
      <form [formGroup]="form" (ngSubmit)="submit()">

        <!-- 기본 정보 -->
        <mat-card class="section-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>business</mat-icon>
            <mat-card-title>기본 정보</mat-card-title>
          </mat-card-header>
          <mat-divider />
          <mat-card-content class="form-grid">
            <mat-form-field appearance="outline" class="full">
              <mat-label>기관명 *</mat-label>
              <input matInput formControlName="name" />
              @if (form.get('name')?.hasError('required') && form.get('name')?.touched) {
                <mat-error>기관명은 필수입니다.</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>사업자등록번호</mat-label>
              <input matInput formControlName="businessNumber" placeholder="000-00-00000" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full">
              <mat-label>주소</mat-label>
              <input matInput formControlName="address" />
            </mat-form-field>
          </mat-card-content>
        </mat-card>

        <!-- 담당자 정보 -->
        <mat-card class="section-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>person</mat-icon>
            <mat-card-title>담당자 정보</mat-card-title>
          </mat-card-header>
          <mat-divider />
          <mat-card-content class="form-grid">
            <mat-form-field appearance="outline">
              <mat-label>담당자명 *</mat-label>
              <input matInput formControlName="contactName" />
              @if (form.get('contactName')?.hasError('required') && form.get('contactName')?.touched) {
                <mat-error>담당자명은 필수입니다.</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>연락처</mat-label>
              <input matInput formControlName="contactPhone" placeholder="010-0000-0000" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full">
              <mat-label>이메일</mat-label>
              <input matInput formControlName="contactEmail" type="email" />
              @if (form.get('contactEmail')?.hasError('email') && form.get('contactEmail')?.touched) {
                <mat-error>올바른 이메일 형식이 아닙니다.</mat-error>
              }
            </mat-form-field>
          </mat-card-content>
        </mat-card>

        <!-- 플랜 및 계약 정보 -->
        <mat-card class="section-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>workspace_premium</mat-icon>
            <mat-card-title>플랜 및 계약</mat-card-title>
          </mat-card-header>
          <mat-divider />
          <mat-card-content class="form-grid">
            <mat-form-field appearance="outline">
              <mat-label>플랜</mat-label>
              <mat-select formControlName="plan">
                @for (p of planItems; track p.value) {
                  <mat-option [value]="p.value">{{ p.label }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <div></div>

            <mat-form-field appearance="outline">
              <mat-label>계약 시작일</mat-label>
              <input matInput type="date" formControlName="contractStartDate" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>계약 종료일</mat-label>
              <input matInput type="date" formControlName="contractEndDate" />
              @if (contractExpiringSoon()) {
                <mat-hint style="color:#e65100">계약 만료가 30일 이내입니다.</mat-hint>
              }
            </mat-form-field>
          </mat-card-content>
        </mat-card>

        <div class="form-actions">
          <button mat-raised-button color="primary" type="submit"
            [disabled]="form.invalid || submitting()">
            @if (submitting()) { <mat-spinner diameter="18" style="display:inline-block;margin-right:6px" /> }
            @else { <mat-icon>save</mat-icon> }
            저장
          </button>
        </div>
      </form>
    }
  `,
  styles: [`
    .page-header { display:flex; align-items:center; gap:12px; margin-bottom:16px; }
    .page-header h2 { margin:0; font-size:22px; font-weight:600; flex:1; }
    .plan-badge { padding:4px 12px; border-radius:12px; font-size:12px; font-weight:600; }
    .plan-free       { background:#f5f5f5; color:#616161; }
    .plan-starter    { background:#e3f2fd; color:#1565c0; }
    .plan-pro        { background:#e8f5e9; color:#2e7d32; }
    .plan-enterprise { background:#f3e5f5; color:#6a1b9a; }
    .loading-center { display:flex; justify-content:center; padding:80px; }
    .section-card { margin-bottom:16px; max-width:800px; }
    .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:0 16px; padding:16px 0; }
    .full { grid-column:1 / -1; }
    .form-actions { max-width:800px; display:flex; justify-content:flex-end; padding-top:4px; }
  `],
})
export class OrgSettingsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  readonly org = signal<Organization | null>(null);
  readonly loading = signal(true);
  readonly submitting = signal(false);

  readonly planItems = Object.entries(PLAN_LABELS).map(([value, label]) => ({ value, label }));

  form = this.fb.group({
    name:              ['', Validators.required],
    businessNumber:    [''],
    address:           [''],
    contactName:       ['', Validators.required],
    contactPhone:      [''],
    contactEmail:      ['', Validators.email],
    plan:              ['FREE'],
    contractStartDate: [''],
    contractEndDate:   [''],
  });

  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/organizations/current`).subscribe({
      next: (res) => {
        const o: Organization = res.data ?? res;
        this.org.set(o);
        this.form.patchValue({
          name:              o.name,
          businessNumber:    o.businessNumber,
          address:           o.address,
          contactName:       o.contactName,
          contactPhone:      o.contactPhone,
          contactEmail:      o.contactEmail,
          plan:              o.plan,
          contractStartDate: o.contractStartDate?.slice(0, 10) ?? '',
          contractEndDate:   o.contractEndDate?.slice(0, 10) ?? '',
        });
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting.set(true);

    const val = this.form.value;
    const payload: Partial<Organization> = {
      name:              val.name!,
      businessNumber:    val.businessNumber ?? '',
      address:           val.address ?? '',
      contactName:       val.contactName!,
      contactPhone:      val.contactPhone ?? '',
      contactEmail:      val.contactEmail ?? '',
      plan:              val.plan as Organization['plan'],
      contractStartDate: val.contractStartDate ?? '',
      contractEndDate:   val.contractEndDate ?? '',
    };

    const orgId = this.org()?._id;
    this.http.patch<any>(`${environment.apiUrl}/organizations/${encodeURIComponent(orgId ?? 'current')}`, payload).subscribe({
      next: (res) => {
        this.org.set(res.data ?? res);
        this.snackBar.open('설정이 저장되었습니다.', '닫기', { duration: 2000 });
        this.submitting.set(false);
      },
      error: () => {
        this.snackBar.open('저장 중 오류가 발생했습니다.', '닫기', { duration: 3000 });
        this.submitting.set(false);
      },
    });
  }

  contractExpiringSoon(): boolean {
    const end = this.form.get('contractEndDate')?.value;
    if (!end) return false;
    const diff = new Date(end).getTime() - Date.now();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
  }

  planLabel(p: string) { return PLAN_LABELS[p] ?? p; }
}
