import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { InspectionSession, Defect } from '@ax/shared';
import { UsersApiService } from '../../../../core/api/users.service';
import { BuildingsService } from '../../../../core/api/buildings.service';
import { AuthStore } from '../../../../core/store/auth.store';
import { environment } from '../../../../../environments/environment';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: '초안', ASSIGNED: '배정됨',
  PLANNED: '계획됨', IN_PROGRESS: '진행 중', PENDING_REVIEW: '검토 대기',
  REVIEWED: '검토 완료', SUBMITTED: '제출됨', APPROVED: '승인됨', COMPLETED: '완료', CANCELLED: '취소됨',
};

const CHECKLIST_RESULT_LABELS: Record<string, string> = {
  PASS: '양호', FAIL: '불량', 'N/A': '해당없음',
};

const CHECKLIST_RESULT_ICONS: Record<string, string> = {
  PASS: 'check_circle', FAIL: 'cancel', 'N/A': 'remove_circle',
};

const SEVERITY_LABELS: Record<string, string> = {
  LOW: '낮음', MEDIUM: '보통', HIGH: '높음', CRITICAL: '긴급',
};

@Component({
  selector: 'ax-session-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatTableModule, MatButtonModule, MatIconModule,
    MatTooltipModule, MatProgressBarModule, MatProgressSpinnerModule,
    MatDividerModule, MatTabsModule, MatSnackBarModule,
  ],
  template: `
    @if (loading() && !session()) {
      <div class="ax-loading-center">
        <mat-progress-bar mode="indeterminate" style="max-width:320px" />
      </div>
    } @else if (session()) {

      <!-- 헤더 -->
      <div class="ax-insp-detail-header">
        <button mat-icon-button [routerLink]="['../..']" matTooltip="프로젝트로">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div class="ax-insp-detail-header__title-wrap">
          <h2 class="ax-insp-detail-header__title">점검 세션 상세</h2>
        </div>
        <span class="ax-insp-status ax-insp-status--{{ session()!.status.toLowerCase() }}">
          {{ statusLabel(session()!.status) }}
        </span>
        @if (session()!.status === 'ASSIGNED') {
          <button mat-raised-button color="primary" (click)="updateStatus('IN_PROGRESS')" [disabled]="submitting()">
            @if (submitting()) { <mat-spinner diameter="18" style="display:inline-block;margin-right:4px" /> }
            @else { <mat-icon>play_arrow</mat-icon> }
            점검 시작
          </button>
        }
        @if (session()!.status === 'IN_PROGRESS') {
          <button mat-raised-button color="accent" (click)="updateStatus('SUBMITTED')" [disabled]="submitting()">
            @if (submitting()) { <mat-spinner diameter="18" style="display:inline-block;margin-right:4px" /> }
            @else { <mat-icon>task_alt</mat-icon> }
            점검 완료 제출
          </button>
        }
      </div>

      <!-- 세션 정보 + 현황 -->
      <div class="ax-insp-detail-grid">

        <!-- 세션 정보 -->
        <div class="ax-insp-panel">
          <div class="ax-insp-panel__hdr">
            <mat-icon class="ax-insp-panel__hdr-icon">fact_check</mat-icon>
            세션 정보
          </div>
          <div class="ax-insp-panel__body">
            <div class="ax-insp-info-row">
              <span class="ax-insp-info-lbl">점검자</span>
              <span>{{ userName(session()!.inspectorId) }}</span>
            </div>
            <div class="ax-insp-info-row">
              <span class="ax-insp-info-lbl">대상 건물</span>
              <span>{{ buildingName(session()!.buildingId) }}</span>
            </div>
            @if (session()!.floorId) {
              <div class="ax-insp-info-row">
                <span class="ax-insp-info-lbl">층</span>
                <span>{{ session()!.floorId }}</span>
              </div>
            }
            @if (session()!.startedAt) {
              <div class="ax-insp-info-row">
                <span class="ax-insp-info-lbl">시작일시</span>
                <span>{{ session()!.startedAt | date:'yyyy-MM-dd HH:mm' }}</span>
              </div>
            }
            @if (session()!.completedAt) {
              <div class="ax-insp-info-row">
                <span class="ax-insp-info-lbl">완료일시</span>
                <span>{{ session()!.completedAt | date:'yyyy-MM-dd HH:mm' }}</span>
              </div>
            }
            @if (session()!.weatherCondition) {
              <div class="ax-insp-info-row">
                <span class="ax-insp-info-lbl">날씨</span>
                <span>{{ session()!.weatherCondition }}</span>
              </div>
            }
            @if (session()!.temperature) {
              <div class="ax-insp-info-row">
                <span class="ax-insp-info-lbl">기온</span>
                <span>{{ session()!.temperature }}°C</span>
              </div>
            }
            @if (session()!.notes) {
              <div class="ax-insp-info-row">
                <span class="ax-insp-info-lbl">비고</span>
                <span>{{ session()!.notes }}</span>
              </div>
            }
          </div>
        </div>

        <!-- 점검 현황 -->
        <div class="ax-insp-panel">
          <div class="ax-insp-panel__hdr">
            <mat-icon class="ax-insp-panel__hdr-icon">bar_chart</mat-icon>
            점검 현황
          </div>
          <div class="ax-insp-panel__body ax-insp-stats-grid">
            <div class="ax-insp-stat">
              <div class="ax-insp-stat__val">{{ checklistItems().length }}</div>
              <div class="ax-insp-stat__lbl">체크리스트 항목</div>
            </div>
            <div class="ax-insp-stat">
              <div class="ax-insp-stat__val ax-insp-stat__val--success">{{ passCount() }}</div>
              <div class="ax-insp-stat__lbl">양호</div>
            </div>
            <div class="ax-insp-stat">
              <div class="ax-insp-stat__val ax-insp-stat__val--danger">{{ failCount() }}</div>
              <div class="ax-insp-stat__lbl">불량</div>
            </div>
            <div class="ax-insp-stat">
              <div class="ax-insp-stat__val ax-insp-stat__val--warn">{{ session()!.defectCount ?? 0 }}</div>
              <div class="ax-insp-stat__lbl">결함 수</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 탭: 체크리스트 / 결함 -->
      <div class="ax-insp-panel ax-insp-panel--mt">
        <mat-tab-group animationDuration="200ms">

          <!-- 체크리스트 탭 -->
          <mat-tab label="체크리스트 ({{ checklistItems().length }})">
            <div class="ax-insp-tab-body">
              @if (checklistItems().length === 0) {
                <div class="ax-insp-empty">
                  <mat-icon>checklist</mat-icon>
                  <p>체크리스트 항목이 없습니다.</p>
                </div>
              } @else {
                @for (item of checklistItems(); track item.id) {
                  <div class="ax-insp-checklist-item"
                    [class.ax-insp-checklist-item--fail]="item.result === 'FAIL'">
                    <div class="ax-insp-checklist-item__left">
                      <mat-icon class="ax-insp-checklist-icon ax-insp-checklist-icon--{{ (item.result ?? 'na').toLowerCase() }}">
                        {{ checklistResultIcon(item.result ?? '') }}
                      </mat-icon>
                      <div>
                        <div class="ax-insp-checklist-item__desc">{{ item.description }}</div>
                        <div class="ax-insp-checklist-item__cat">{{ item.category }}</div>
                      </div>
                    </div>
                    <div class="ax-insp-checklist-item__right">
                      <span class="ax-insp-checklist-result ax-insp-checklist-result--{{ (item.result ?? 'na').toLowerCase() }}">
                        {{ checklistResultLabel(item.result ?? '') }}
                      </span>
                      @if (item.notes) {
                        <div class="ax-insp-checklist-item__notes">{{ item.notes }}</div>
                      }
                    </div>
                  </div>
                }
              }
            </div>
          </mat-tab>

          <!-- 결함 탭 -->
          <mat-tab label="발견 결함 ({{ defects().length }})">
            <div class="ax-insp-tab-body">
              @if (defectsLoading()) {
                <mat-progress-bar mode="indeterminate" />
              } @else if (defects().length === 0) {
                <div class="ax-insp-empty">
                  <mat-icon>report_problem</mat-icon>
                  <p>발견된 결함이 없습니다.</p>
                </div>
              } @else {
                <table mat-table [dataSource]="defects()" class="ax-insp-table">

                  <ng-container matColumnDef="severity">
                    <th mat-header-cell *matHeaderCellDef>심각도</th>
                    <td mat-cell *matCellDef="let d">
                      <span class="ax-insp-severity ax-insp-severity--{{ d.severity.toLowerCase() }}">
                        {{ severityLabel(d.severity) }}
                      </span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="defectType">
                    <th mat-header-cell *matHeaderCellDef>유형</th>
                    <td mat-cell *matCellDef="let d">{{ d.defectType }}</td>
                  </ng-container>

                  <ng-container matColumnDef="location">
                    <th mat-header-cell *matHeaderCellDef>위치</th>
                    <td mat-cell *matCellDef="let d">{{ d.locationDescription | slice:0:40 }}</td>
                  </ng-container>

                  <ng-container matColumnDef="repaired">
                    <th mat-header-cell *matHeaderCellDef>조치</th>
                    <td mat-cell *matCellDef="let d">
                      <span class="ax-insp-repair" [class.ax-insp-repair--done]="d.isRepaired"
                        [class.ax-insp-repair--pending]="!d.isRepaired">
                        {{ d.isRepaired ? '완료' : '미조치' }}
                      </span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef></th>
                    <td mat-cell *matCellDef="let d">
                      <button mat-icon-button [routerLink]="['/defects', d._id]" matTooltip="결함 상세">
                        <mat-icon>open_in_new</mat-icon>
                      </button>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="defectColumns"></tr>
                  <tr mat-row *matRowDef="let d; columns: defectColumns;"></tr>
                </table>
              }
            </div>
          </mat-tab>

        </mat-tab-group>
      </div>
    }
  `,
  styles: [`
    /* ── 헤더 ── */
    .ax-insp-detail-header {
      display: flex; align-items: center; gap: var(--ax-spacing-2);
      margin-bottom: var(--ax-spacing-4);
    }
    .ax-insp-detail-header__title-wrap { flex: 1; }
    .ax-insp-detail-header__title {
      margin: 0; font-size: var(--ax-font-size-xl);
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
    }

    /* ── 상태 배지 ── */
    .ax-insp-status {
      display: inline-block; padding: 3px 10px; border-radius: var(--ax-radius-full);
      font-size: var(--ax-font-size-xs); font-weight: var(--ax-font-weight-semibold);
      white-space: nowrap;
    }
    .ax-insp-status--draft          { background: #f5f5f5;                        color: #757575; }
    .ax-insp-status--assigned       { background: #e3f2fd;                        color: #1565c0; }
    .ax-insp-status--planned        { background: var(--ax-color-info-subtle);    color: var(--ax-color-info); }
    .ax-insp-status--in_progress    { background: var(--ax-color-warning-subtle); color: var(--ax-color-warning); }
    .ax-insp-status--pending_review { background: #f3e5f5; color: #6a1b9a; }
    .ax-insp-status--reviewed       { background: var(--ax-color-success-subtle); color: var(--ax-color-success); }
    .ax-insp-status--submitted      { background: #e8eaf6;                        color: #3949ab; }
    .ax-insp-status--approved       { background: var(--ax-color-success-subtle); color: var(--ax-color-success); }
    .ax-insp-status--completed      { background: var(--ax-color-bg-surface-alt); color: var(--ax-color-text-secondary); }
    .ax-insp-status--cancelled      { background: var(--ax-color-bg-surface-alt); color: var(--ax-color-text-tertiary); }

    /* ── 레이아웃 ── */
    .ax-insp-detail-grid {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: var(--ax-spacing-4); margin-bottom: var(--ax-spacing-4);
    }

    /* ── 패널 ── */
    .ax-insp-panel {
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border);
      border-radius: var(--ax-radius-lg); overflow: hidden;
    }
    .ax-insp-panel--mt { margin-top: 0; }
    .ax-insp-panel__hdr {
      display: flex; align-items: center; gap: var(--ax-spacing-2);
      padding: var(--ax-spacing-3) var(--ax-spacing-4);
      background: var(--ax-color-bg-surface-alt);
      border-bottom: 1px solid var(--ax-color-border);
      font-size: var(--ax-font-size-sm); font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
    }
    .ax-insp-panel__hdr-icon {
      font-size: 16px; width: 16px; height: 16px; color: var(--ax-color-text-secondary);
    }
    .ax-insp-panel__body { padding: var(--ax-spacing-4); }
    .ax-insp-tab-body { padding: var(--ax-spacing-4); }

    /* ── 정보 행 ── */
    .ax-insp-info-row {
      display: flex; gap: var(--ax-spacing-4); padding: var(--ax-spacing-2) 0;
      border-bottom: 1px solid var(--ax-color-border-subtle);
      font-size: var(--ax-font-size-sm);
    }
    .ax-insp-info-row:last-child { border-bottom: none; }
    .ax-insp-info-lbl {
      min-width: 100px; font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-secondary); font-weight: var(--ax-font-weight-medium);
    }

    /* ── 통계 ── */
    .ax-insp-stats-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: var(--ax-spacing-3);
    }
    .ax-insp-stat { text-align: center; }
    .ax-insp-stat__val {
      font-size: var(--ax-font-size-2xl); font-weight: var(--ax-font-weight-bold);
      color: var(--ax-color-text-primary);
    }
    .ax-insp-stat__val--success { color: var(--ax-color-success); }
    .ax-insp-stat__val--danger  { color: var(--ax-color-danger); }
    .ax-insp-stat__val--warn    { color: var(--ax-color-warning); }
    .ax-insp-stat__lbl { font-size: var(--ax-font-size-xs); color: var(--ax-color-text-secondary); margin-top: 4px; }

    /* ── 체크리스트 ── */
    .ax-insp-checklist-item {
      display: flex; align-items: flex-start; justify-content: space-between;
      padding: var(--ax-spacing-3);
      border-bottom: 1px solid var(--ax-color-border-subtle);
    }
    .ax-insp-checklist-item:last-child { border-bottom: none; }
    .ax-insp-checklist-item--fail {
      background: color-mix(in srgb, var(--ax-color-danger-subtle) 40%, transparent);
    }
    .ax-insp-checklist-item__left {
      display: flex; align-items: flex-start; gap: var(--ax-spacing-3); flex: 1;
    }
    .ax-insp-checklist-icon { font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; }
    .ax-insp-checklist-icon--pass { color: var(--ax-color-success); }
    .ax-insp-checklist-icon--fail { color: var(--ax-color-danger); }
    .ax-insp-checklist-icon--na   { color: var(--ax-color-text-tertiary); }
    .ax-insp-checklist-item__desc { font-size: var(--ax-font-size-sm); font-weight: var(--ax-font-weight-medium); }
    .ax-insp-checklist-item__cat  { font-size: var(--ax-font-size-xs); color: var(--ax-color-text-tertiary); margin-top: 2px; }
    .ax-insp-checklist-item__right { text-align: right; }
    .ax-insp-checklist-result { font-size: var(--ax-font-size-xs); font-weight: var(--ax-font-weight-semibold); }
    .ax-insp-checklist-result--pass { color: var(--ax-color-success); }
    .ax-insp-checklist-result--fail { color: var(--ax-color-danger); }
    .ax-insp-checklist-result--na   { color: var(--ax-color-text-tertiary); }
    .ax-insp-checklist-item__notes { font-size: var(--ax-font-size-xs); color: var(--ax-color-text-secondary); margin-top: 4px; }

    /* ── 심각도 배지 ── */
    .ax-insp-severity {
      display: inline-block; padding: 2px 8px; border-radius: var(--ax-radius-full);
      font-size: var(--ax-font-size-xs); font-weight: var(--ax-font-weight-semibold);
    }
    .ax-insp-severity--low      { background: var(--ax-color-bg-surface-alt);  color: var(--ax-color-text-secondary); }
    .ax-insp-severity--medium   { background: var(--ax-color-info-subtle);     color: var(--ax-color-info); }
    .ax-insp-severity--high     { background: var(--ax-color-warning-subtle);  color: var(--ax-color-warning); }
    .ax-insp-severity--critical { background: var(--ax-color-danger-subtle);   color: var(--ax-color-danger); }

    /* ── 조치 배지 ── */
    .ax-insp-repair {
      display: inline-block; padding: 2px 8px; border-radius: var(--ax-radius-full);
      font-size: var(--ax-font-size-xs); font-weight: var(--ax-font-weight-semibold);
    }
    .ax-insp-repair--done    { background: var(--ax-color-success-subtle); color: var(--ax-color-success); }
    .ax-insp-repair--pending { background: var(--ax-color-warning-subtle); color: var(--ax-color-warning); }

    /* ── 테이블 ── */
    .ax-insp-table { width: 100%; }
    th.mat-mdc-header-cell {
      font-size: var(--ax-font-size-xs); font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-secondary);
    }
    td.mat-mdc-cell { font-size: var(--ax-font-size-sm); padding: var(--ax-spacing-1) var(--ax-spacing-2); }

    /* ── 빈 상태 ── */
    .ax-insp-empty {
      text-align: center; padding: var(--ax-spacing-6); color: var(--ax-color-text-tertiary);
    }
    .ax-insp-empty mat-icon {
      font-size: 36px; width: 36px; height: 36px; display: block; margin: 0 auto var(--ax-spacing-2);
    }
    .ax-insp-empty p { margin: 0; font-size: var(--ax-font-size-sm); }
  `],
})
export class SessionDetailComponent implements OnInit {
  private readonly http       = inject(HttpClient);
  private readonly route      = inject(ActivatedRoute);
  private readonly usersSvc   = inject(UsersApiService);
  private readonly buildSvc   = inject(BuildingsService);
  private readonly authStore  = inject(AuthStore);
  private readonly snackBar   = inject(MatSnackBar);

  readonly session        = signal<InspectionSession | null>(null);
  readonly defects        = signal<Defect[]>([]);
  readonly loading        = signal(true);
  readonly defectsLoading = signal(false);
  readonly submitting     = signal(false);

  private readonly userMap     = signal<Map<string, string>>(new Map());
  private readonly buildingMap = signal<Map<string, string>>(new Map());

  defectColumns = ['severity', 'defectType', 'location', 'repaired', 'actions'];

  readonly checklistItems = computed(() => this.session()?.checklistItems ?? []);
  readonly passCount      = computed(() => this.checklistItems().filter((i) => i.result === 'PASS').length);
  readonly failCount      = computed(() => this.checklistItems().filter((i) => i.result === 'FAIL').length);

  ngOnInit() {
    const sessionId = this.route.snapshot.paramMap.get('sessionId')!;
    const orgId = this.authStore.user()?.organizationId ?? '';

    // 사용자 맵 로드
    this.usersSvc.list(orgId).subscribe({
      next: (list) => this.userMap.set(new Map(list.map((u) => [u._id, u.name]))),
      error: () => { /* 권한 없을 경우 조용히 무시 */ },
    });

    this.http.get<any>(`${environment.apiUrl}/projects/sessions/${encodeURIComponent(sessionId)}`).subscribe({
      next: (res) => {
        const sess: InspectionSession = res.data ?? res;
        this.session.set(sess);
        this.loading.set(false);
        this.loadDefects(sessionId);

        // 건물 맵 로드 (complexId 기반)
        if (sess.complexId) {
          this.buildSvc.listByComplex(sess.complexId).subscribe((list) => {
            this.buildingMap.set(new Map(list.map((b) => [b._id, b.name])));
          });
        }
      },
      error: () => this.loading.set(false),
    });
  }

  private loadDefects(sessionId: string) {
    this.defectsLoading.set(true);
    this.http.get<any>(`${environment.apiUrl}/defects?sessionId=${encodeURIComponent(sessionId)}&limit=100`).subscribe({
      next: (res) => { this.defects.set(res.data ?? []); this.defectsLoading.set(false); },
      error: () => this.defectsLoading.set(false),
    });
  }

  userName(id: string | undefined): string {
    if (!id) return '미배정';
    return this.userMap().get(id) ?? '미배정';
  }

  buildingName(id: string | undefined): string {
    if (!id) return '-';
    return this.buildingMap().get(id) ?? id;
  }

  statusLabel(s: string)           { return STATUS_LABELS[s] ?? s; }
  severityLabel(s: string)         { return SEVERITY_LABELS[s] ?? s; }
  checklistResultLabel(r: string)  { return (CHECKLIST_RESULT_LABELS[r] ?? r) || '미입력'; }
  checklistResultIcon(r: string)   { return CHECKLIST_RESULT_ICONS[r] ?? 'help'; }

  updateStatus(newStatus: string) {
    const sess = this.session();
    if (!sess) return;
    this.submitting.set(true);
    const sessionId = this.route.snapshot.paramMap.get('sessionId')!;
    this.http.patch<any>(
      `${environment.apiUrl}/projects/sessions/${encodeURIComponent(sessionId)}/status`,
      { status: newStatus },
    ).subscribe({
      next: (res) => {
        const updated: Partial<InspectionSession> = res.data ?? res;
        this.session.set({ ...sess, ...updated });
        this.submitting.set(false);
        this.snackBar.open('세션 상태가 변경되었습니다.', '닫기', { duration: 2000 });
      },
      error: (err) => {
        this.submitting.set(false);
        const msg = err?.error?.message ?? '상태 변경에 실패했습니다.';
        this.snackBar.open(msg, '닫기', { duration: 3000 });
      },
    });
  }
}
