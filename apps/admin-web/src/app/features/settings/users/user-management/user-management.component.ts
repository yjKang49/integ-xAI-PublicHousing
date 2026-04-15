import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import { UsersApiService, UserProfile, CreateUserDto } from '../../../../core/api/users.service';
import { AuthStore } from '../../../../core/store/auth.store';
import { UserRole } from '@ax/shared';
import {
  PageHeaderComponent,
  StatusBadgeComponent,
  EmptyStateComponent,
  SkeletonComponent,
  BadgeVariant,
} from '../../../../shared/components';

// Role → badge variant mapping
const ROLE_VARIANT: Record<string, BadgeVariant> = {
  [UserRole.SUPER_ADMIN]:   'danger',
  [UserRole.ORG_ADMIN]:     'warning',
  [UserRole.INSPECTOR]:     'info',
  [UserRole.REVIEWER]:      'info',
  [UserRole.COMPLAINT_MGR]: 'info',
  [UserRole.VIEWER]:        'neutral',
};

// ── 사용자 폼 다이얼로그 ───────────────────────────────────────────
@Component({
  selector: 'ax-user-form-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatSelectModule, MatSnackBarModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>{{ data.user ? 'edit' : 'person_add' }}</mat-icon>
      {{ data.user ? '사용자 수정' : '사용자 초대' }}
    </h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form-grid">
        <mat-form-field appearance="outline" class="full">
          <mat-label>이메일 *</mat-label>
          <input matInput type="email" formControlName="email" />
        </mat-form-field>

        @if (!data.user) {
          <mat-form-field appearance="outline" class="full">
            <mat-label>초기 비밀번호 *</mat-label>
            <input matInput type="password" formControlName="password" />
            <mat-hint>8자 이상</mat-hint>
          </mat-form-field>
        }

        <mat-form-field appearance="outline" class="half">
          <mat-label>이름 *</mat-label>
          <input matInput formControlName="name" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="half">
          <mat-label>연락처</mat-label>
          <input matInput formControlName="phone" placeholder="010-0000-0000" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>역할 *</mat-label>
          <mat-select formControlName="role">
            @for (r of roles; track r.value) {
              <mat-option [value]="r.value">{{ r.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>취소</button>
      <button mat-raised-button color="primary"
              (click)="save()" [disabled]="form.invalid || saving()">
        @if (saving()) { <mat-spinner diameter="20" /> } @else { 저장 }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 16px}
            .full{grid-column:1/-1}.half{grid-column:span 1}
            mat-dialog-content{min-width:480px}`],
})
export class UserFormDialogComponent {
  readonly data = inject<{ user: UserProfile | null; organizationId: string }>(MAT_DIALOG_DATA);
  private readonly svc = inject(UsersApiService);
  private readonly dialogRef = inject(MatDialogRef<UserFormDialogComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly snack = inject(MatSnackBar);

  saving = signal(false);

  roles = [
    { value: UserRole.ORG_ADMIN, label: '기관 관리자' },
    { value: UserRole.INSPECTOR, label: '점검원' },
    { value: UserRole.REVIEWER, label: '검토자' },
    { value: UserRole.COMPLAINT_MGR, label: '민원 담당자' },
    { value: UserRole.VIEWER, label: '열람자' },
  ];

  form = this.fb.group({
    email: [this.data.user?.email ?? '', [Validators.required, Validators.email]],
    password: ['', this.data.user ? [] : [Validators.required, Validators.minLength(8)]],
    name: [this.data.user?.name ?? '', Validators.required],
    phone: [this.data.user?.phone ?? ''],
    role: [this.data.user?.role ?? UserRole.INSPECTOR, Validators.required],
  });

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);

    const v = this.form.value as any;
    const obs = this.data.user
      ? this.svc.update(this.data.user._id, { name: v.name, phone: v.phone, role: v.role })
      : this.svc.create({
          email: v.email,
          password: v.password,
          name: v.name,
          phone: v.phone,
          role: v.role,
          organizationId: this.data.organizationId,
        } as CreateUserDto);

    obs.subscribe({
      next: (result) => this.dialogRef.close(result),
      error: (e) => {
        this.snack.open(e.error?.error?.message ?? '저장 실패', '닫기', { duration: 3000 });
        this.saving.set(false);
      },
    });
  }
}

// ── 사용자 관리 페이지 ────────────────────────────────────────────
const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: '슈퍼관리자',
  [UserRole.ORG_ADMIN]:   '기관관리자',
  [UserRole.INSPECTOR]:   '점검원',
  [UserRole.REVIEWER]:    '검토자',
  [UserRole.COMPLAINT_MGR]: '민원담당',
  [UserRole.VIEWER]:      '열람자',
};

@Component({
  selector: 'ax-user-management',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule,
    MatDialogModule, MatTooltipModule, MatSlideToggleModule,
    PageHeaderComponent, StatusBadgeComponent, EmptyStateComponent, SkeletonComponent,
  ],
  template: `
    <ax-page-header
      title="사용자 관리"
      description="시스템 접근 사용자 초대·역할 배정·활성 상태 관리"
      icon="manage_accounts"
      [meta]="users().length + '명'">
      <div ax-page-actions>
        <button mat-flat-button color="primary" (click)="openForm(null)">
          <mat-icon>person_add</mat-icon> 사용자 초대
        </button>
      </div>
    </ax-page-header>

    @if (loading()) {
      <div class="ax-table-container">
        <ax-skeleton type="table" />
      </div>
    } @else {
      <div class="ax-table-container">
        <table mat-table [dataSource]="users()" class="ax-user-table">

          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>이름</th>
            <td mat-cell *matCellDef="let u">
              <div class="user-name ax-text-body">{{ u.name }}</div>
              <div class="user-email ax-text-meta">{{ u.email }}</div>
            </td>
          </ng-container>

          <ng-container matColumnDef="role">
            <th mat-header-cell *matHeaderCellDef>역할</th>
            <td mat-cell *matCellDef="let u">
              <ax-status-badge [variant]="getRoleVariant(u.role)" [label]="roleLabel(u.role)" />
            </td>
          </ng-container>

          <ng-container matColumnDef="phone">
            <th mat-header-cell *matHeaderCellDef>연락처</th>
            <td mat-cell *matCellDef="let u" class="ax-text-meta">{{ u.phone ?? '—' }}</td>
          </ng-container>

          <ng-container matColumnDef="isActive">
            <th mat-header-cell *matHeaderCellDef>활성</th>
            <td mat-cell *matCellDef="let u">
              <mat-slide-toggle
                [checked]="u.isActive"
                (change)="toggleActive(u)"
                matTooltip="활성 상태 전환" />
            </td>
          </ng-container>

          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef>등록일</th>
            <td mat-cell *matCellDef="let u" class="ax-text-meta">{{ u.createdAt | date:'yyyy-MM-dd' }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let u">
              <button mat-icon-button (click)="openForm(u)" matTooltip="수정">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button color="warn" (click)="remove(u)"
                      matTooltip="삭제" [disabled]="u._id === currentUserId()">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns;" class="ax-table-row"></tr>
        </table>

        @if (users().length === 0) {
          <ax-empty-state
            type="empty"
            title="등록된 사용자가 없습니다"
            description="사용자를 초대하여 시스템 접근 권한을 부여하세요."
            primaryLabel="사용자 초대"
            (primaryAction)="openForm(null)" />
        }
      </div>
    }
  `,
  styles: [`
    /* Table */
    .ax-user-table { width: 100%; }

    .ax-table-row {
      transition: background 0.12s;
      &:hover { background: var(--ax-color-bg-surface-alt); }
    }

    .user-name { font-weight: 500; }
    .user-email { margin-top: 2px; }
  `],
})
export class UserManagementComponent implements OnInit {
  private readonly svc = inject(UsersApiService);
  private readonly authStore = inject(AuthStore);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  columns = ['name', 'role', 'phone', 'isActive', 'createdAt', 'actions'];
  users = signal<UserProfile[]>([]);
  loading = signal(true);
  currentUserId = () => this.authStore.user()?.id;

  get orgId() { return this.authStore.user()?.organizationId ?? ''; }

  ngOnInit() { this.load(); }

  roleLabel(role: UserRole) { return ROLE_LABELS[role] ?? role; }
  getRoleVariant(role: string): BadgeVariant { return ROLE_VARIANT[role] ?? 'neutral'; }

  load() {
    this.loading.set(true);
    this.svc.list(this.orgId).subscribe({
      next: (list) => { this.users.set(list); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  openForm(user: UserProfile | null) {
    this.dialog
      .open(UserFormDialogComponent, {
        data: { user, organizationId: this.orgId },
        width: '520px',
      })
      .afterClosed()
      .subscribe((result) => { if (result) this.load(); });
  }

  async toggleActive(user: UserProfile) {
    try {
      await firstValueFrom(this.svc.update(user._id, { isActive: !user.isActive }));
      this.load();
    } catch (e: any) {
      this.snack.open(e.error?.error?.message ?? '상태 변경 실패', '닫기', { duration: 3000 });
    }
  }

  async remove(user: UserProfile) {
    if (!confirm(`${user.name}(${user.email}) 사용자를 삭제하시겠습니까?`)) return;
    try {
      await firstValueFrom(this.svc.delete(user._id));
      this.snack.open('사용자가 삭제되었습니다.', '확인', { duration: 2000 });
      this.load();
    } catch (e: any) {
      this.snack.open(e.error?.error?.message ?? '삭제 실패', '닫기', { duration: 3000 });
    }
  }
}
