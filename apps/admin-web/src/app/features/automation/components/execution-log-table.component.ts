// apps/admin-web/src/app/features/automation/components/execution-log-table.component.ts
// Phase 2-7: 자동화 실행 이력 테이블 컴포넌트

import {
  Component, Input, OnInit, OnChanges, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { AutomationExecutionStatus, AutomationTriggerType } from '@ax/shared';

@Component({
  selector: 'ax-execution-log-table',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatTableModule, MatChipsModule, MatIconModule, MatButtonModule,
    MatProgressSpinnerModule, MatExpansionModule, MatTooltipModule,
    MatSelectModule, MatSnackBarModule,
  ],
  template: `
    <div class="log-container">
      <!-- 필터 & 새로고침 -->
      <div class="log-toolbar">
        @if (!ruleId) {
          <mat-select [(ngModel)]="filterStatus" placeholder="전체 상태"
            (selectionChange)="load()" style="width:140px">
            <mat-option [value]="''">전체</mat-option>
            @for (s of statusOptions; track s.value) {
              <mat-option [value]="s.value">{{ s.label }}</mat-option>
            }
          </mat-select>
          <mat-select [(ngModel)]="filterTrigger" placeholder="전체 트리거"
            (selectionChange)="load()" style="width:150px">
            <mat-option [value]="''">전체</mat-option>
            @for (t of triggerOptions; track t.value) {
              <mat-option [value]="t.value">{{ t.label }}</mat-option>
            }
          </mat-select>
        }
        <span class="spacer"></span>
        <span class="count-text">{{ totalCount() }}건</span>
        <button mat-icon-button (click)="load()" matTooltip="새로고침">
          <mat-icon>refresh</mat-icon>
        </button>
      </div>

      <!-- 로딩 -->
      @if (loading()) {
        <div class="center-spinner"><mat-spinner diameter="36" /></div>
      }

      <!-- 테이블 -->
      @if (!loading()) {
        <table mat-table [dataSource]="executions()" class="log-table">
          <!-- 상태 -->
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>상태</th>
            <td mat-cell *matCellDef="let e">
              <span class="status-badge" [class]="'status-' + e.status.toLowerCase()">
                <mat-icon class="status-icon">{{ statusIcon(e.status) }}</mat-icon>
                {{ statusLabel(e.status) }}
              </span>
            </td>
          </ng-container>

          <!-- 룰 이름 (전체 목록에서만) -->
          @if (!ruleId) {
            <ng-container matColumnDef="ruleName">
              <th mat-header-cell *matHeaderCellDef>룰</th>
              <td mat-cell *matCellDef="let e">
                <span class="rule-name">{{ e.ruleName }}</span>
                <span class="rule-key">{{ e.ruleKey }}</span>
              </td>
            </ng-container>
          }

          <!-- 트리거 유형 -->
          <ng-container matColumnDef="trigger">
            <th mat-header-cell *matHeaderCellDef>트리거</th>
            <td mat-cell *matCellDef="let e">
              <mat-chip>{{ triggerShort(e.triggerType) }}</mat-chip>
            </td>
          </ng-container>

          <!-- 실행 시간 -->
          <ng-container matColumnDef="startedAt">
            <th mat-header-cell *matHeaderCellDef>실행 시작</th>
            <td mat-cell *matCellDef="let e">{{ e.startedAt | date:'MM/dd HH:mm:ss' }}</td>
          </ng-container>

          <!-- 소요 시간 -->
          <ng-container matColumnDef="duration">
            <th mat-header-cell *matHeaderCellDef>소요</th>
            <td mat-cell *matCellDef="let e">{{ e.durationMs != null ? e.durationMs + 'ms' : '—' }}</td>
          </ng-container>

          <!-- 요약 -->
          <ng-container matColumnDef="summary">
            <th mat-header-cell *matHeaderCellDef>요약</th>
            <td mat-cell *matCellDef="let e">
              <span class="summary-text">{{ e.summary || e.error || '—' }}</span>
            </td>
          </ng-container>

          <!-- 상세 토글 -->
          <ng-container matColumnDef="expand">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let e">
              <button mat-icon-button (click)="toggleDetail(e._id)">
                <mat-icon>{{ expandedId() === e._id ? 'expand_less' : 'expand_more' }}</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"
            [class.failed-row]="row.status === 'FAILED'"></tr>
        </table>

        <!-- 상세 패널 (확장) -->
        @for (e of executions(); track e._id) {
          @if (expandedId() === e._id) {
            <div class="detail-panel">
              <h4>액션 실행 상세</h4>
              @for (a of e.actionsExecuted; track $index) {
                <div class="action-result" [class]="'ar-' + a.status.toLowerCase()">
                  <mat-icon class="ar-icon">{{ a.status === 'SUCCESS' ? 'check_circle' : 'error' }}</mat-icon>
                  <div class="ar-info">
                    <span class="ar-type">{{ a.type }}</span>
                    <span class="ar-time">{{ a.executedAt | date:'HH:mm:ss.SSS' }} ({{ a.durationMs }}ms)</span>
                    @if (a.result) {
                      <span class="ar-result">{{ a.result | json }}</span>
                    }
                    @if (a.error) {
                      <span class="ar-error">{{ a.error }}</span>
                    }
                  </div>
                </div>
              }
              @if (e.actionsExecuted.length === 0) {
                <p class="no-actions">실행된 액션 없음</p>
              }

              @if (e.triggerContext) {
                <h4 class="mt-12">트리거 컨텍스트</h4>
                <pre class="context-json">{{ e.triggerContext | json }}</pre>
              }
            </div>
          }
        }

        @if (executions().length === 0) {
          <div class="empty-state">
            <mat-icon>history</mat-icon>
            <p>실행 이력이 없습니다.</p>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .log-container { padding:8px 0; }
    .log-toolbar { display:flex; align-items:center; gap:12px; margin-bottom:12px; flex-wrap:wrap; }
    .spacer { flex:1; }
    .count-text { font-size:13px; color:#666; }
    .center-spinner { display:flex; justify-content:center; padding:32px; }
    .log-table { width:100%; }
    .status-badge { display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:10px; font-size:12px; font-weight:500; }
    .status-icon { font-size:14px; width:14px; height:14px; }
    .status-running   { background:#fff3e0; color:#e65100; }
    .status-completed { background:#e8f5e9; color:#2e7d32; }
    .status-failed    { background:#ffebee; color:#c62828; }
    .status-skipped   { background:#f5f5f5; color:#757575; }
    .rule-name { display:block; font-weight:500; font-size:13px; }
    .rule-key  { display:block; font-size:11px; color:#888; font-family:monospace; }
    .summary-text { font-size:12px; color:#555; max-width:240px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:block; }
    .failed-row { background:#fff8f8; }
    .detail-panel { background:#fafafa; border:1px solid #eee; border-radius:6px; padding:16px; margin:0 0 8px; }
    .detail-panel h4 { margin:0 0 8px; font-size:13px; color:#555; }
    .mt-12 { margin-top:12px !important; }
    .action-result { display:flex; align-items:flex-start; gap:8px; padding:6px 0; border-bottom:1px solid #eee; }
    .action-result:last-child { border-bottom:none; }
    .ar-success .ar-icon { color:#2e7d32; }
    .ar-failed  .ar-icon  { color:#c62828; }
    .ar-info { display:flex; flex-direction:column; gap:2px; }
    .ar-type { font-size:13px; font-weight:500; }
    .ar-time { font-size:11px; color:#888; }
    .ar-result { font-size:11px; color:#555; font-family:monospace; }
    .ar-error { font-size:12px; color:#c62828; }
    .no-actions { color:#888; font-size:13px; }
    .context-json { font-size:11px; background:#f0f0f0; padding:8px; border-radius:4px; overflow:auto; max-height:160px; }
    .empty-state { text-align:center; padding:32px; color:#aaa; }
    .empty-state mat-icon { font-size:40px; width:40px; height:40px; display:block; margin:0 auto 8px; }
  `],
})
export class ExecutionLogTableComponent implements OnInit, OnChanges {
  /** 특정 룰의 이력만 조회할 경우 ruleId를 전달 */
  @Input() ruleId?: string;

  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);

  readonly executions = signal<any[]>([]);
  readonly loading = signal(false);
  readonly totalCount = signal(0);
  readonly expandedId = signal<string | null>(null);

  filterStatus = '';
  filterTrigger = '';

  statusOptions = [
    { value: AutomationExecutionStatus.COMPLETED, label: '성공' },
    { value: AutomationExecutionStatus.FAILED, label: '실패' },
    { value: AutomationExecutionStatus.RUNNING, label: '실행 중' },
    { value: AutomationExecutionStatus.SKIPPED, label: '건너뜀' },
  ];

  triggerOptions = [
    { value: AutomationTriggerType.DATE_BASED, label: '날짜 기반' },
    { value: AutomationTriggerType.STATUS_CHANGE, label: '상태 변경' },
    { value: AutomationTriggerType.MANUAL, label: '수동' },
  ];

  get displayedColumns() {
    const base = ['status', 'trigger', 'startedAt', 'duration', 'summary', 'expand'];
    return this.ruleId ? base : ['status', 'ruleName', 'trigger', 'startedAt', 'duration', 'summary', 'expand'];
  }

  ngOnInit() { this.load(); }
  ngOnChanges() { this.load(); }

  load() {
    this.loading.set(true);
    const params: Record<string, string> = { limit: '30' };
    if (this.ruleId) params['ruleId'] = this.ruleId;
    if (this.filterStatus) params['status'] = this.filterStatus;
    if (this.filterTrigger) params['triggerType'] = this.filterTrigger;

    this.http.get<any>('/api/v1/automation-executions', { params }).subscribe({
      next: res => {
        this.executions.set(res.data ?? []);
        this.totalCount.set(res.meta?.total ?? 0);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('실행 이력 조회 실패', '닫기', { duration: 3000 });
      },
    });
  }

  toggleDetail(id: string) {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  statusLabel(s: string) {
    const m: Record<string, string> = {
      RUNNING: '실행 중', COMPLETED: '완료', FAILED: '실패', SKIPPED: '건너뜀',
    };
    return m[s] ?? s;
  }

  statusIcon(s: string) {
    const m: Record<string, string> = {
      RUNNING: 'hourglass_empty', COMPLETED: 'check_circle',
      FAILED: 'error', SKIPPED: 'skip_next',
    };
    return m[s] ?? 'help';
  }

  triggerShort(t: string) {
    const m: Record<string, string> = {
      DATE_BASED: '날짜', STATUS_CHANGE: '상태변경', THRESHOLD: '임계치', MANUAL: '수동',
    };
    return m[t] ?? t;
  }
}
