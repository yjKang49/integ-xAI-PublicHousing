import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { InspectionProject, InspectionSession } from '@ax/shared';
import { environment } from '../../../../../environments/environment';

const STATUS_LABELS: Record<string, string> = {
  PLANNED: '계획됨', IN_PROGRESS: '진행 중', PENDING_REVIEW: '검토 대기',
  REVIEWED: '검토 완료', COMPLETED: '완료', CANCELLED: '취소됨',
};

@Component({
  selector: 'ax-project-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatTableModule, MatButtonModule, MatIconModule,
    MatTooltipModule, MatProgressBarModule, MatDividerModule,
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
        <span class="ax-insp-status ax-insp-status--{{ project()!.status.toLowerCase() }}">
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
            <div class="ax-insp-info-row">
              <span class="ax-insp-info-lbl">책임 점검자</span>
              <span>{{ project()!.leadInspectorId || '미배정' }}</span>
            </div>
            @if (project()!.reviewerId) {
              <div class="ax-insp-info-row">
                <span class="ax-insp-info-lbl">검토자</span>
                <span>{{ project()!.reviewerId }}</span>
              </div>
            }
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
              <td mat-cell *matCellDef="let s">{{ s.buildingId }}</td>
            </ng-container>

            <ng-container matColumnDef="inspector">
              <th mat-header-cell *matHeaderCellDef>점검자</th>
              <td mat-cell *matCellDef="let s">{{ s.inspectorId }}</td>
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
              <p>등록된 세션이 없습니다.</p>
            </div>
          }
        }
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
    .ax-insp-progress { margin-bottom: var(--ax-spacing-3); }

    /* ── 상태 배지 ── */
    .ax-insp-status {
      display: inline-block; padding: 3px 10px; border-radius: var(--ax-radius-full);
      font-size: var(--ax-font-size-xs); font-weight: var(--ax-font-weight-semibold);
      white-space: nowrap;
    }
    .ax-insp-status--planned        { background: var(--ax-color-info-subtle);    color: var(--ax-color-info); }
    .ax-insp-status--in_progress    { background: var(--ax-color-warning-subtle); color: var(--ax-color-warning); }
    .ax-insp-status--pending_review { background: #f3e5f5; color: #6a1b9a; }
    .ax-insp-status--reviewed       { background: var(--ax-color-success-subtle); color: var(--ax-color-success); }
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
      font-size: 16px; width: 16px; height: 16px;
      color: var(--ax-color-text-secondary);
    }
    .ax-insp-panel__hdr-meta {
      margin-left: auto; font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-secondary); font-weight: var(--ax-font-weight-normal);
    }
    .ax-insp-panel__body { padding: var(--ax-spacing-4); }

    /* ── 정보 행 ── */
    .ax-insp-info-row {
      display: flex; gap: var(--ax-spacing-4); padding: var(--ax-spacing-2) 0;
      border-bottom: 1px solid var(--ax-color-border-subtle);
      font-size: var(--ax-font-size-sm);
    }
    .ax-insp-info-row:last-child { border-bottom: none; }
    .ax-insp-info-lbl {
      min-width: 120px; font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-secondary); font-weight: var(--ax-font-weight-medium);
    }

    /* ── 통계 ── */
    .ax-insp-stats-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: var(--ax-spacing-3);
    }
    .ax-insp-stat { text-align: center; padding: var(--ax-spacing-2); }
    .ax-insp-stat__val {
      font-size: var(--ax-font-size-2xl); font-weight: var(--ax-font-weight-bold);
      color: var(--ax-color-text-primary);
    }
    .ax-insp-stat__val--success { color: var(--ax-color-success); }
    .ax-insp-stat__val--warn    { color: var(--ax-color-warning); }
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
    td.mat-mdc-cell { font-size: var(--ax-font-size-sm); padding: var(--ax-spacing-1) var(--ax-spacing-2); }

    /* ── 빈 상태 ── */
    .ax-insp-empty {
      text-align: center; padding: var(--ax-spacing-6);
      color: var(--ax-color-text-tertiary);
    }
    .ax-insp-empty mat-icon {
      font-size: 36px; width: 36px; height: 36px; display: block; margin: 0 auto var(--ax-spacing-2);
    }
    .ax-insp-empty p { margin: 0; font-size: var(--ax-font-size-sm); }
  `],
})
export class ProjectDetailComponent implements OnInit {
  private readonly http  = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);

  readonly project        = signal<InspectionProject | null>(null);
  readonly sessions       = signal<InspectionSession[]>([]);
  readonly loading        = signal(true);
  readonly sessionsLoading = signal(false);

  sessionColumns = ['status', 'buildingId', 'inspector', 'defects', 'startedAt', 'actions'];

  ngOnInit() {
    const projectId = this.route.snapshot.paramMap.get('projectId')!;
    this.http.get<any>(`${environment.apiUrl}/projects/${encodeURIComponent(projectId)}`).subscribe({
      next: (res) => {
        this.project.set(res.data ?? res);
        this.loading.set(false);
        this.loadSessions(projectId);
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

  completedSessions() { return this.sessions().filter((s) => s.status === 'APPROVED').length; }
  pendingSessions()   { return this.sessions().filter((s) => s.status === 'IN_PROGRESS').length; }
  totalDefects()      { return this.sessions().reduce((sum, s) => sum + (s.defectCount ?? 0), 0); }

  statusLabel(s: string) { return STATUS_LABELS[s] ?? s; }

  typeLabel(t: string) {
    const m: Record<string, string> = { REGULAR: '정기점검', EMERGENCY: '긴급점검', SPECIAL: '특별점검' };
    return m[t] ?? t;
  }
}
