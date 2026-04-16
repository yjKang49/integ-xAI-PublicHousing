import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule, MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { InspectionProject, InspectionSession } from '@ax/shared';
import { UsersApiService, UserProfile } from '../../../../core/api/users.service';
import { BuildingsService, Building } from '../../../../core/api/buildings.service';
import { AuthStore } from '../../../../core/store/auth.store';
import { environment } from '../../../../../environments/environment';

const STATUS_LABELS: Record<string, string> = {
  PLANNED: '계획됨', IN_PROGRESS: '진행 중', PENDING_REVIEW: '검토 대기',
  REVIEWED: '검토 완료', COMPLETED: '완료', CANCELLED: '취소됨',
  DRAFT: '초안', ASSIGNED: '배정됨', SUBMITTED: '제출됨', APPROVED: '승인됨',
};

// ── 세션 추가 다이얼로그 ────────────────────────────────────────────
@Component({
  selector: 'ax-add-session-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatAutocompleteModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>add_task</mat-icon> 세션 추가
    </h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="session-form">

        <mat-form-field appearance="outline" class="full">
          <mat-label>대상 건물(동) *</mat-label>
          <mat-select formControlName="buildingId">
            @if (buildings().length === 0) {
              <mat-option disabled>건물 정보 없음 — 단지에 동을 먼저 등록하세요</mat-option>
            }
            @for (b of buildings(); track b._id) {
              <mat-option [value]="b._id">{{ b.name }}</mat-option>
            }
          </mat-select>
          @if (form.get('buildingId')?.hasError('required') && form.get('buildingId')?.touched) {
            <mat-error>건물을 선택해 주세요.</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>담당 점검자 (선택)</mat-label>
          <input matInput formControlName="inspector"
            [matAutocomplete]="inspAc"
            placeholder="이름으로 검색" />
          <mat-autocomplete #inspAc="matAutocomplete" [displayWith]="displayUser">
            @for (u of filteredUsers(); track u._id) {
              <mat-option [value]="u">{{ u.name }} <span style="color:#999;font-size:12px">{{ u.email }}</span></mat-option>
            }
          </mat-autocomplete>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>메모</mat-label>
          <textarea matInput formControlName="notes" rows="2" placeholder="특이사항 기재"></textarea>
        </mat-form-field>

      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>취소</button>
      <button mat-raised-button color="primary"
        (click)="save()" [disabled]="form.invalid || saving()">
        @if (saving()) { <mat-spinner diameter="20" /> } @else { 세션 생성 }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.session-form { display:flex; flex-direction:column; gap:0; min-width:400px; }
            .full { width:100%; } mat-dialog-content { padding-top:8px; }`],
})
export class AddSessionDialogComponent implements OnInit {
  readonly data = inject<{ projectId: string; complexId: string; orgId: string }>(MAT_DIALOG_DATA);
  private readonly http = inject(HttpClient);
  private readonly dialogRef = inject(MatDialogRef<AddSessionDialogComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly snack = inject(MatSnackBar);
  private readonly buildingsSvc = inject(BuildingsService);
  private readonly usersSvc = inject(UsersApiService);

  saving = signal(false);
  buildings = signal<Building[]>([]);
  allUsers = signal<UserProfile[]>([]);
  filteredUsers = signal<UserProfile[]>([]);

  form = this.fb.group({
    buildingId: ['', Validators.required],
    inspector:  [null as UserProfile | string | null],
    notes:      [''],
  });

  ngOnInit() {
    this.buildingsSvc.listByComplex(this.data.complexId).subscribe((list) => this.buildings.set(list));
    this.usersSvc.list(this.data.orgId).subscribe((list) => {
      this.allUsers.set(list);
      this.filteredUsers.set(list);
    });
    this.form.get('inspector')!.valueChanges.subscribe((v) => {
      if (typeof v === 'string') {
        const q = v.toLowerCase();
        this.filteredUsers.set(
          this.allUsers().filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)),
        );
      }
    });
  }

  displayUser(u: UserProfile | null): string { return u?.name ?? ''; }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);

    const v = this.form.value;
    const inspector = v.inspector as UserProfile | null;
    const payload: any = {
      buildingId: v.buildingId,
      complexId:  this.data.complexId,
    };
    if (inspector?._id) payload.inspectorId = inspector._id;
    if (v.notes?.trim()) payload.notes = v.notes;

    this.http.post<any>(
      `${environment.apiUrl}/projects/${encodeURIComponent(this.data.projectId)}/sessions`,
      payload,
    ).subscribe({
      next: (res) => this.dialogRef.close(res.data ?? res),
      error: (e) => {
        this.snack.open(e.error?.message ?? '세션 생성 실패', '닫기', { duration: 3000 });
        this.saving.set(false);
      },
    });
  }
}

// ── 프로젝트 상세 페이지 ──────────────────────────────────────────
@Component({
  selector: 'ax-project-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    MatTableModule, MatButtonModule, MatIconModule,
    MatTooltipModule, MatProgressBarModule, MatDividerModule,
    MatDialogModule, MatSnackBarModule,
    MatSelectModule, MatFormFieldModule,
  ],
  template: `
    @if (loading() && !project()) {
      <div class="ax-loading-center">
        <mat-progress-bar mode="indeterminate" style="max-width:320px" />
      </div>
    } @else if (project()) {

      <!-- 헤더 -->
      <div class="ax-insp-detail-header">
        <button mat-icon-button routerLink="/inspection/projects" matTooltip="목록으로">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div class="ax-insp-detail-header__title-wrap">
          <h2 class="ax-insp-detail-header__title">{{ project()!.name }}</h2>
        </div>
        <!-- 상태 배지 — 헤더 전용 크기 -->
        <span class="ax-insp-status ax-insp-status--{{ project()!.status.toLowerCase() }} ax-insp-status--lg">
          <span class="ax-insp-status__dot"></span>
          {{ statusLabel(project()!.status) }}
        </span>
      </div>

      @if (loading()) { <mat-progress-bar mode="indeterminate" class="ax-insp-progress" /> }

      <!-- 기본 정보 + 현황 -->
      <div class="ax-insp-detail-grid">

        <!-- 프로젝트 정보 -->
        <div class="ax-insp-panel">
          <div class="ax-insp-panel__hdr">
            <mat-icon class="ax-insp-panel__hdr-icon">assignment</mat-icon>
            프로젝트 정보
          </div>
          <div class="ax-insp-panel__body">
            <div class="ax-insp-info-row">
              <span class="ax-insp-info-lbl">프로젝트 ID</span>
              <code class="ax-insp-id-chip">{{ project()!._id }}</code>
            </div>
            <div class="ax-insp-info-row">
              <span class="ax-insp-info-lbl">점검 유형</span>
              <span>{{ typeLabel(project()!.inspectionType) }}</span>
            </div>
            <div class="ax-insp-info-row">
              <span class="ax-insp-info-lbl">점검 차수</span>
              <span>{{ project()!.round }}차</span>
            </div>
            <div class="ax-insp-info-row">
              <span class="ax-insp-info-lbl">계획 기간</span>
              <span>{{ project()!.plannedStartDate | date:'yyyy-MM-dd' }} ~ {{ project()!.plannedEndDate | date:'yyyy-MM-dd' }}</span>
            </div>
            @if (project()!.actualStartDate) {
              <div class="ax-insp-info-row">
                <span class="ax-insp-info-lbl">실제 시작</span>
                <span>{{ project()!.actualStartDate | date:'yyyy-MM-dd' }}</span>
              </div>
            }
            @if (project()!.actualEndDate) {
              <div class="ax-insp-info-row">
                <span class="ax-insp-info-lbl">실제 종료</span>
                <span>{{ project()!.actualEndDate | date:'yyyy-MM-dd' }}</span>
              </div>
            }
            <div class="ax-insp-info-row ax-insp-info-row--assign">
              <span class="ax-insp-info-lbl">책임 점검자</span>
              @if (editingLead()) {
                <mat-form-field appearance="outline" class="ax-assign-field">
                  <mat-select [(ngModel)]="newLeadId">
                    <mat-option value="">미배정</mat-option>
                    @for (u of allUsers(); track u._id) {
                      <mat-option [value]="u._id">{{ u.name }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <button mat-icon-button color="primary" (click)="saveAssignment('lead')" matTooltip="저장">
                  <mat-icon>check</mat-icon>
                </button>
                <button mat-icon-button (click)="editingLead.set(false)" matTooltip="취소">
                  <mat-icon>close</mat-icon>
                </button>
              } @else {
                <span [class.ax-unassigned]="!project()!.leadInspectorId">
                  {{ userName(project()!.leadInspectorId) }}
                </span>
                <button mat-icon-button class="ax-edit-btn" (click)="startEditLead()" matTooltip="책임 점검자 변경">
                  <mat-icon>edit</mat-icon>
                </button>
              }
            </div>
            <div class="ax-insp-info-row ax-insp-info-row--assign">
              <span class="ax-insp-info-lbl">검토자</span>
              @if (editingReviewer()) {
                <mat-form-field appearance="outline" class="ax-assign-field">
                  <mat-select [(ngModel)]="newReviewerId">
                    <mat-option value="">미배정</mat-option>
                    @for (u of allUsers(); track u._id) {
                      <mat-option [value]="u._id">{{ u.name }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <button mat-icon-button color="primary" (click)="saveAssignment('reviewer')" matTooltip="저장">
                  <mat-icon>check</mat-icon>
                </button>
                <button mat-icon-button (click)="editingReviewer.set(false)" matTooltip="취소">
                  <mat-icon>close</mat-icon>
                </button>
              } @else {
                <span [class.ax-unassigned]="!project()!.reviewerId">
                  {{ userName(project()!.reviewerId) }}
                </span>
                <button mat-icon-button class="ax-edit-btn" (click)="startEditReviewer()" matTooltip="검토자 변경">
                  <mat-icon>edit</mat-icon>
                </button>
              }
            </div>
            @if (project()!.description) {
              <div class="ax-insp-info-row">
                <span class="ax-insp-info-lbl">설명</span>
                <span>{{ project()!.description }}</span>
              </div>
            }
          </div>
        </div>

        <!-- 진행 현황 -->
        <div class="ax-insp-panel">
          <div class="ax-insp-panel__hdr">
            <mat-icon class="ax-insp-panel__hdr-icon">bar_chart</mat-icon>
            진행 현황
          </div>
          <div class="ax-insp-panel__body ax-insp-stats-grid">
            <div class="ax-insp-stat">
              <div class="ax-insp-stat__val">{{ sessions().length }}</div>
              <div class="ax-insp-stat__lbl">전체 세션</div>
            </div>
            <div class="ax-insp-stat">
              <div class="ax-insp-stat__val ax-insp-stat__val--success">{{ completedSessions() }}</div>
              <div class="ax-insp-stat__lbl">완료 세션</div>
            </div>
            <div class="ax-insp-stat">
              <div class="ax-insp-stat__val ax-insp-stat__val--warn">{{ pendingSessions() }}</div>
              <div class="ax-insp-stat__lbl">진행 중</div>
            </div>
            <div class="ax-insp-stat">
              <div class="ax-insp-stat__val">{{ totalDefects() }}</div>
              <div class="ax-insp-stat__lbl">총 결함 수</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 세션 목록 -->
      <div class="ax-insp-panel ax-insp-panel--mt">
        <div class="ax-insp-panel__hdr">
          <mat-icon class="ax-insp-panel__hdr-icon">list_alt</mat-icon>
          점검 세션 목록
          <span class="ax-insp-panel__hdr-meta">{{ sessions().length }}개 세션</span>
          <button mat-flat-button color="primary" class="ax-insp-add-btn"
            (click)="openAddSession()" matTooltip="새 세션 추가">
            <mat-icon>add</mat-icon> 세션 추가
          </button>
        </div>
        @if (sessionsLoading()) {
          <mat-progress-bar mode="indeterminate" />
        } @else {
          <table mat-table [dataSource]="sessions()" class="ax-insp-table">

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>상태</th>
              <td mat-cell *matCellDef="let s">
                <span class="ax-insp-status ax-insp-status--{{ s.status.toLowerCase() }}">
                  {{ statusLabel(s.status) }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="buildingId">
              <th mat-header-cell *matHeaderCellDef>대상 건물</th>
              <td mat-cell *matCellDef="let s">{{ buildingName(s.buildingId) }}</td>
            </ng-container>

            <ng-container matColumnDef="inspector">
              <th mat-header-cell *matHeaderCellDef>점검자</th>
              <td mat-cell *matCellDef="let s">{{ userName(s.inspectorId) }}</td>
            </ng-container>

            <ng-container matColumnDef="defects">
              <th mat-header-cell *matHeaderCellDef>결함 수</th>
              <td mat-cell *matCellDef="let s">{{ s.defectCount ?? 0 }}</td>
            </ng-container>

            <ng-container matColumnDef="startedAt">
              <th mat-header-cell *matHeaderCellDef>시작일시</th>
              <td mat-cell *matCellDef="let s">
                {{ s.startedAt ? (s.startedAt | date:'MM/dd HH:mm') : '-' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let s">
                <button mat-icon-button [routerLink]="['sessions', s._id]" matTooltip="세션 상세">
                  <mat-icon>open_in_new</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="sessionColumns"></tr>
            <tr mat-row *matRowDef="let s; columns: sessionColumns;"
              [routerLink]="['sessions', s._id]" class="ax-insp-table__row--clickable"></tr>
          </table>

          @if (sessions().length === 0) {
            <div class="ax-insp-empty">
              <mat-icon>fact_check</mat-icon>
              <p>등록된 세션이 없습니다. 세션 추가 버튼으로 점검 세션을 생성하세요.</p>
            </div>
          }
        }
      </div>
    }
  `,
  styles: [`
    /* ── 헤더 ── */
    .ax-insp-detail-header {
      display: flex; align-items: center; gap: 8px;
      margin-bottom: 16px;
    }
    .ax-insp-detail-header__title-wrap { flex: 1; }
    .ax-insp-detail-header__title {
      margin: 0; font-size: var(--ax-font-size-xl);
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
    }
    .ax-insp-progress { margin-bottom: 12px; }

    /* ── 상태 배지 ── */
    .ax-insp-status {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 3px 10px; border-radius: var(--ax-radius-full);
      font-size: var(--ax-font-size-xs); font-weight: var(--ax-font-weight-semibold);
      white-space: nowrap;
    }
    /* 헤더 전용 — 크고 눈에 잘 띄게 */
    .ax-insp-status--lg {
      font-size: 14px;
      font-weight: 700;
      padding: 6px 18px;
      letter-spacing: 0.02em;
    }
    .ax-insp-status__dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: currentColor; opacity: 0.7; flex-shrink: 0;
    }
    .ax-insp-status--planned        { background: var(--ax-color-info-subtle);    color: var(--ax-color-info); }
    .ax-insp-status--in_progress    { background: var(--ax-color-warning-subtle); color: var(--ax-color-warning-text, #b45309); }
    .ax-insp-status--pending_review { background: #f3e5f5; color: #6a1b9a; }
    .ax-insp-status--reviewed       { background: var(--ax-color-success-subtle); color: var(--ax-color-success-text, #166534); }
    .ax-insp-status--completed      { background: var(--ax-color-bg-surface-alt); color: var(--ax-color-text-secondary); }
    .ax-insp-status--cancelled      { background: var(--ax-color-bg-surface-alt); color: var(--ax-color-text-tertiary); }
    .ax-insp-status--draft          { background: #f5f5f5; color: #616161; }
    .ax-insp-status--assigned       { background: #e3f2fd; color: #1565c0; }
    .ax-insp-status--submitted      { background: #fff8e1; color: #e65100; }
    .ax-insp-status--approved       { background: var(--ax-color-success-subtle); color: var(--ax-color-success-text, #166534); }

    /* ── 레이아웃 ── */
    .ax-insp-detail-grid {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 16px; margin-bottom: 16px;
    }

    /* ── 패널 ── */
    .ax-insp-panel {
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border, #e0e0e0);
      border-radius: var(--ax-radius-lg); overflow: hidden;
    }
    .ax-insp-panel--mt { margin-top: 0; }
    .ax-insp-panel__hdr {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 16px;
      background: var(--ax-color-bg-surface-alt);
      border-bottom: 1px solid var(--ax-color-border, #e0e0e0);
      font-size: var(--ax-font-size-sm); font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
    }
    .ax-insp-panel__hdr-icon {
      font-size: 16px; width: 16px; height: 16px;
      color: var(--ax-color-text-secondary);
    }
    .ax-insp-panel__hdr-meta {
      margin-left: auto; font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-secondary); font-weight: var(--ax-font-weight-normal);
    }
    .ax-insp-panel__body { padding: 16px; }

    /* 세션 추가 버튼 */
    .ax-insp-add-btn {
      margin-left: 8px;
      height: 32px;
      font-size: 13px;
    }

    /* ── 정보 행 ── */
    .ax-insp-info-row {
      display: flex; gap: 16px; padding: 7px 0;
      border-bottom: 1px solid var(--ax-color-border-subtle, #f0f0f0);
      font-size: var(--ax-font-size-sm);
    }
    .ax-insp-info-row:last-child { border-bottom: none; }
    .ax-insp-info-row--assign { align-items: center; }
    .ax-insp-info-lbl {
      min-width: 120px; font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-secondary); font-weight: var(--ax-font-weight-medium);
    }
    .ax-unassigned { color: var(--ax-color-text-tertiary); font-style: italic; }
    .ax-edit-btn { width: 28px; height: 28px; line-height: 28px; margin-left: 4px; opacity: 0.5; }
    .ax-edit-btn:hover { opacity: 1; }
    .ax-edit-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .ax-assign-field { width: 200px; margin: 0; }
    .ax-insp-id-chip {
      font-family: monospace; font-size: 11px;
      background: var(--ax-color-bg-surface-alt, #f5f5f5);
      border: 1px solid var(--ax-color-border-subtle, #e0e0e0);
      border-radius: 4px; padding: 2px 6px;
      color: var(--ax-color-text-secondary);
      word-break: break-all;
    }

    /* ── 통계 ── */
    .ax-insp-stats-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
    }
    .ax-insp-stat { text-align: center; padding: 8px; }
    .ax-insp-stat__val {
      font-size: var(--ax-font-size-2xl); font-weight: var(--ax-font-weight-bold);
      color: var(--ax-color-text-primary);
    }
    .ax-insp-stat__val--success { color: var(--ax-color-success, #16a34a); }
    .ax-insp-stat__val--warn    { color: var(--ax-color-warning, #d97706); }
    .ax-insp-stat__lbl {
      font-size: var(--ax-font-size-xs); color: var(--ax-color-text-secondary); margin-top: 4px;
    }

    /* ── 테이블 ── */
    .ax-insp-table { width: 100%; }
    .ax-insp-table__row--clickable { cursor: pointer; }
    th.mat-mdc-header-cell {
      font-size: var(--ax-font-size-xs); font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-secondary);
    }
    td.mat-mdc-cell { font-size: var(--ax-font-size-sm); }

    /* ── 빈 상태 ── */
    .ax-insp-empty {
      text-align: center; padding: 40px 24px;
      color: var(--ax-color-text-tertiary);
    }
    .ax-insp-empty mat-icon {
      font-size: 36px; width: 36px; height: 36px; display: block; margin: 0 auto 8px;
    }
    .ax-insp-empty p { margin: 0; font-size: var(--ax-font-size-sm); }

    .ax-loading-center { display: flex; justify-content: center; padding: 80px; }
  `],
})
export class ProjectDetailComponent implements OnInit {
  private readonly http      = inject(HttpClient);
  private readonly route     = inject(ActivatedRoute);
  private readonly dialog    = inject(MatDialog);
  private readonly snack     = inject(MatSnackBar);
  private readonly usersSvc  = inject(UsersApiService);
  private readonly buildSvc  = inject(BuildingsService);
  private readonly authStore = inject(AuthStore);

  readonly project         = signal<InspectionProject | null>(null);
  readonly sessions        = signal<InspectionSession[]>([]);
  readonly loading         = signal(true);
  readonly sessionsLoading = signal(false);

  /** userId → name 조회 맵 */
  private readonly userMap     = signal<Map<string, string>>(new Map());
  /** buildingId → name 조회 맵 */
  private readonly buildingMap = signal<Map<string, string>>(new Map());

  // ── 담당자 재배정 ──────────────────────────────────────────────────
  readonly allUsers        = signal<UserProfile[]>([]);
  readonly editingLead     = signal(false);
  readonly editingReviewer = signal(false);
  newLeadId     = '';
  newReviewerId = '';

  sessionColumns = ['status', 'buildingId', 'inspector', 'defects', 'startedAt', 'actions'];

  ngOnInit() {
    const projectId = this.route.snapshot.paramMap.get('projectId')!;
    const orgId = this.authStore.user()?.organizationId ?? '';

    // 사용자 목록 로드 → 이름 맵 + 전체 목록 저장
    this.usersSvc.list(orgId).subscribe({
      next: (list) => {
        this.userMap.set(new Map(list.map((u) => [u._id, u.name])));
        this.allUsers.set(list);
      },
      error: () => { /* 권한 없을 경우 조용히 무시 */ },
    });

    this.http.get<any>(`${environment.apiUrl}/projects/${encodeURIComponent(projectId)}`).subscribe({
      next: (res) => {
        const proj: InspectionProject = res.data ?? res;
        this.project.set(proj);
        this.loading.set(false);
        this.loadSessions(projectId);

        // 단지 건물 목록 로드 → 이름 맵 생성
        if (proj.complexId) {
          this.buildSvc.listByComplex(proj.complexId).subscribe((list) => {
            this.buildingMap.set(new Map(list.map((b) => [b._id, b.name])));
          });
        }
      },
      error: () => this.loading.set(false),
    });
  }

  private loadSessions(projectId: string) {
    this.sessionsLoading.set(true);
    this.http.get<any>(`${environment.apiUrl}/projects/${encodeURIComponent(projectId)}/sessions`).subscribe({
      next: (res) => { this.sessions.set(res.data ?? []); this.sessionsLoading.set(false); },
      error: () => this.sessionsLoading.set(false),
    });
  }

  openAddSession() {
    const proj = this.project();
    if (!proj) return;
    const orgId = this.authStore.user()?.organizationId ?? '';

    this.dialog.open(AddSessionDialogComponent, {
      data: { projectId: proj._id, complexId: proj.complexId, orgId },
      width: '460px',
    }).afterClosed().subscribe((result) => {
      if (result) {
        const projectId = this.route.snapshot.paramMap.get('projectId')!;
        this.snack.open('세션이 생성되었습니다.', '닫기', { duration: 2000 });
        this.loadSessions(projectId);
      }
    });
  }

  /** userId → 이름, 없으면 '미배정' */
  userName(id: string | undefined): string {
    if (!id) return '미배정';
    return this.userMap().get(id) ?? '미배정';
  }

  startEditLead() {
    this.newLeadId = this.project()?.leadInspectorId ?? '';
    this.editingLead.set(true);
  }

  startEditReviewer() {
    this.newReviewerId = this.project()?.reviewerId ?? '';
    this.editingReviewer.set(true);
  }

  saveAssignment(field: 'lead' | 'reviewer') {
    const proj = this.project();
    if (!proj) return;
    const body = field === 'lead'
      ? { leadInspectorId: this.newLeadId }
      : { reviewerId: this.newReviewerId };

    this.http.patch<any>(
      `${environment.apiUrl}/projects/${encodeURIComponent(proj._id)}/assignment`,
      body,
    ).subscribe({
      next: (res) => {
        this.project.set(res.data ?? res);
        if (field === 'lead') this.editingLead.set(false);
        else this.editingReviewer.set(false);
        this.snack.open('담당자가 변경되었습니다.', '닫기', { duration: 2000 });
      },
      error: () => this.snack.open('담당자 변경에 실패했습니다.', '닫기', { duration: 3000 }),
    });
  }

  /** buildingId → 이름, 없으면 ID 그대로 */
  buildingName(id: string | undefined): string {
    if (!id) return '-';
    return this.buildingMap().get(id) ?? id;
  }

  completedSessions() { return this.sessions().filter((s) => s.status === 'APPROVED').length; }
  pendingSessions()   { return this.sessions().filter((s) => s.status === 'IN_PROGRESS').length; }
  totalDefects()      { return this.sessions().reduce((sum, s) => sum + (s.defectCount ?? 0), 0); }

  statusLabel(s: string) { return STATUS_LABELS[s] ?? s; }

  typeLabel(t: string) {
    const m: Record<string, string> = { REGULAR: '정기점검', EMERGENCY: '긴급점검', SPECIAL: '특별점검' };
    return m[t] ?? t;
  }
}
