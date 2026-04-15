// apps/admin-web/src/app/features/automation/pages/automation-rule-detail-page.component.ts
// Phase 2-7: 자동화 룰 상세 / 수정 페이지 + 실행 이력

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ExecutionLogTableComponent } from '../components/execution-log-table.component';
import { RuleBuilderComponent } from '../components/rule-builder.component';
import {
  AUTOMATION_RULE_CATEGORY_LABELS, AUTOMATION_TRIGGER_TYPE_LABELS,
  AUTOMATION_ACTION_TYPE_LABELS,
} from '@ax/shared';

@Component({
  selector: 'ax-automation-rule-detail-page',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatButtonModule, MatIconModule, MatTabsModule,
    MatSnackBarModule, MatProgressBarModule, MatDividerModule, MatSlideToggleModule,
    ExecutionLogTableComponent, RuleBuilderComponent,
  ],
  template: `
    <!-- 헤더 -->
    <div class="ax-auto-detail-header">
      <button mat-icon-button (click)="back()">
        <mat-icon>arrow_back</mat-icon>
      </button>
      <div class="ax-auto-detail-header__title-wrap">
        <h2 class="ax-auto-detail-header__title">{{ rule()?.name ?? '룰 상세' }}</h2>
        <span class="ax-auto-detail-header__key">{{ rule()?.ruleKey }}</span>
      </div>
      <div class="ax-auto-detail-header__actions">
        @if (rule(); as r) {
          <mat-slide-toggle [checked]="r.isActive" (change)="toggleActive($event.checked)" color="primary">
            {{ r.isActive ? '활성' : '비활성' }}
          </mat-slide-toggle>
          <button mat-stroked-button (click)="executeNow()" [disabled]="!r.isActive">
            <mat-icon>play_arrow</mat-icon> 즉시 실행
          </button>
        }
      </div>
    </div>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate" class="ax-auto-detail-progress" />
    }

    @if (rule(); as r) {
      <mat-tab-group animationDuration="200ms">

        <!-- 탭 1: 룰 정보 -->
        <mat-tab label="룰 정보">
          <div class="ax-auto-detail-tab">

            <!-- 기본 정보 패널 -->
            <div class="ax-auto-panel">
              <div class="ax-auto-panel__hdr">
                <mat-icon class="ax-auto-panel__hdr-icon">info_outline</mat-icon>
                기본 정보
              </div>
              <div class="ax-auto-panel__body">
                <div class="ax-auto-info-grid">
                  <div class="ax-auto-info-item">
                    <span class="ax-auto-info-lbl">이름</span>
                    <span class="ax-auto-info-val">{{ r.name }}</span>
                  </div>
                  <div class="ax-auto-info-item">
                    <span class="ax-auto-info-lbl">설명</span>
                    <span class="ax-auto-info-val">{{ r.description || '—' }}</span>
                  </div>
                  <div class="ax-auto-info-item">
                    <span class="ax-auto-info-lbl">카테고리</span>
                    <span class="ax-auto-info-val">{{ categoryLabel(r.category) }}</span>
                  </div>
                  <div class="ax-auto-info-item">
                    <span class="ax-auto-info-lbl">우선순위</span>
                    <span class="ax-auto-info-val">{{ r.priority }}</span>
                  </div>
                  <div class="ax-auto-info-item">
                    <span class="ax-auto-info-lbl">마지막 실행</span>
                    <span class="ax-auto-info-val">
                      {{ r.lastTriggeredAt ? (r.lastTriggeredAt | date:'yyyy-MM-dd HH:mm:ss') : '없음' }}
                    </span>
                  </div>
                  <div class="ax-auto-info-item">
                    <span class="ax-auto-info-lbl">생성일</span>
                    <span class="ax-auto-info-val">{{ r.createdAt | date:'yyyy-MM-dd HH:mm' }}</span>
                  </div>
                </div>

                <mat-divider class="ax-auto-divider" />

                <!-- 트리거 -->
                <h4 class="ax-auto-section-title">트리거 설정</h4>
                <div class="ax-auto-trigger-row">
                  <span class="ax-auto-trigger-badge ax-auto-trigger--{{ r.trigger.type.toLowerCase() }}">
                    {{ triggerLabel(r.trigger.type) }}
                  </span>
                  @if (r.trigger.cronExpression) {
                    <span class="ax-auto-trigger-detail">
                      cron: <code class="ax-auto-code">{{ r.trigger.cronExpression }}</code>
                    </span>
                  }
                  @if (r.trigger.watchDocType) {
                    <span class="ax-auto-trigger-detail">
                      {{ r.trigger.watchDocType }} 상태 변경:
                      <code class="ax-auto-code">{{ r.trigger.fromStatus || '*' }} → {{ r.trigger.toStatus }}</code>
                    </span>
                  }
                  @if (r.trigger.offsetDays != null) {
                    <span class="ax-auto-trigger-detail">
                      기준 날짜 {{ r.trigger.offsetDays }}일 {{ r.trigger.offsetDays < 0 ? '전' : '후' }}
                    </span>
                  }
                </div>

                <mat-divider class="ax-auto-divider" />

                <!-- 액션 목록 -->
                <h4 class="ax-auto-section-title">액션 ({{ r.actions.length }}개)</h4>
                <div class="ax-auto-actions-list">
                  @for (action of r.actions; track $index) {
                    <div class="ax-auto-action-item">
                      <mat-icon class="ax-auto-action-item__icon">{{ actionIcon(action.type) }}</mat-icon>
                      <div class="ax-auto-action-item__detail">
                        <span class="ax-auto-action-item__type">{{ actionLabel(action.type) }}</span>
                        @if (action.channel) {
                          <span class="ax-auto-action-item__sub">채널: {{ action.channel }}</span>
                        }
                        @if (action.titleTemplate) {
                          <span class="ax-auto-action-item__sub">제목: {{ action.titleTemplate }}</span>
                        }
                        @if (action.alertType) {
                          <span class="ax-auto-action-item__sub">경보: {{ action.alertType }}</span>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- 실행 통계 패널 -->
            <div class="ax-auto-panel">
              <div class="ax-auto-panel__hdr">
                <mat-icon class="ax-auto-panel__hdr-icon">bar_chart</mat-icon>
                실행 통계
              </div>
              <div class="ax-auto-panel__body">
                <div class="ax-auto-stats-row">
                  <div class="ax-auto-stat-box">
                    <span class="ax-auto-stat-box__val">{{ r.executionCount }}</span>
                    <span class="ax-auto-stat-box__lbl">전체 실행</span>
                  </div>
                  <div class="ax-auto-stat-box ax-auto-stat-box--success">
                    <span class="ax-auto-stat-box__val">{{ r.successCount }}</span>
                    <span class="ax-auto-stat-box__lbl">성공</span>
                  </div>
                  <div class="ax-auto-stat-box ax-auto-stat-box--danger">
                    <span class="ax-auto-stat-box__val">{{ r.failureCount }}</span>
                    <span class="ax-auto-stat-box__lbl">실패</span>
                  </div>
                  <div class="ax-auto-stat-box">
                    <span class="ax-auto-stat-box__val">
                      {{ r.executionCount > 0 ? ((r.successCount / r.executionCount * 100) | number:'1.0-0') + '%' : '—' }}
                    </span>
                    <span class="ax-auto-stat-box__lbl">성공률</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </mat-tab>

        <!-- 탭 2: 룰 편집 -->
        <mat-tab label="룰 편집">
          <div class="ax-auto-detail-tab">
            <ax-rule-builder [rule]="r" (saved)="onSaved($event)" (cancelled)="back()" />
          </div>
        </mat-tab>

        <!-- 탭 3: 실행 이력 -->
        <mat-tab label="실행 이력">
          <div class="ax-auto-detail-tab">
            <ax-execution-log-table [ruleId]="r._id" />
          </div>
        </mat-tab>

      </mat-tab-group>
    }
  `,
  styles: [`
    /* ── 헤더 ── */
    .ax-auto-detail-header {
      display: flex; align-items: center; gap: var(--ax-spacing-3);
      margin-bottom: var(--ax-spacing-4);
    }
    .ax-auto-detail-header__title-wrap { flex: 1; }
    .ax-auto-detail-header__title {
      margin: 0; font-size: var(--ax-font-size-xl);
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
    }
    .ax-auto-detail-header__key {
      font-size: var(--ax-font-size-xs); color: var(--ax-color-text-tertiary);
      font-family: var(--ax-font-family-mono, monospace);
    }
    .ax-auto-detail-header__actions {
      display: flex; align-items: center; gap: var(--ax-spacing-2);
    }
    .ax-auto-detail-progress { margin-bottom: var(--ax-spacing-3); }

    /* ── 탭 ── */
    .ax-auto-detail-tab {
      padding: var(--ax-spacing-4) 0;
      display: flex; flex-direction: column; gap: var(--ax-spacing-4);
      max-width: 1100px;
    }

    /* ── 패널 ── */
    .ax-auto-panel {
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border);
      border-radius: var(--ax-radius-lg); overflow: hidden;
    }
    .ax-auto-panel__hdr {
      display: flex; align-items: center; gap: var(--ax-spacing-2);
      padding: var(--ax-spacing-3) var(--ax-spacing-4);
      background: var(--ax-color-bg-surface-alt);
      border-bottom: 1px solid var(--ax-color-border);
      font-size: var(--ax-font-size-sm); font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
    }
    .ax-auto-panel__hdr-icon {
      font-size: 16px; width: 16px; height: 16px;
      color: var(--ax-color-text-secondary);
    }
    .ax-auto-panel__body { padding: var(--ax-spacing-4); }

    /* ── 정보 그리드 ── */
    .ax-auto-info-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: var(--ax-spacing-3);
    }
    .ax-auto-info-item { display: flex; flex-direction: column; gap: 2px; }
    .ax-auto-info-lbl { font-size: var(--ax-font-size-xs); color: var(--ax-color-text-secondary); }
    .ax-auto-info-val { font-size: var(--ax-font-size-sm); color: var(--ax-color-text-primary); }
    .ax-auto-divider { margin: var(--ax-spacing-4) 0; }
    .ax-auto-section-title {
      margin: 0 0 var(--ax-spacing-2);
      font-size: var(--ax-font-size-sm); font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
    }

    /* ── 트리거 ── */
    .ax-auto-trigger-row {
      display: flex; align-items: center; gap: var(--ax-spacing-3); flex-wrap: wrap;
    }
    .ax-auto-trigger-badge {
      display: inline-block; padding: 3px 10px; border-radius: var(--ax-radius-full);
      font-size: var(--ax-font-size-xs); font-weight: var(--ax-font-weight-semibold);
    }
    .ax-auto-trigger--date_based  { background: var(--ax-color-info-subtle);    color: var(--ax-color-info); }
    .ax-auto-trigger--status_change { background: var(--ax-color-warning-subtle); color: var(--ax-color-warning); }
    .ax-auto-trigger--threshold   { background: var(--ax-color-danger-subtle);  color: var(--ax-color-danger); }
    .ax-auto-trigger--manual      { background: var(--ax-color-bg-surface-alt); color: var(--ax-color-text-secondary); }
    .ax-auto-trigger-detail { font-size: var(--ax-font-size-sm); color: var(--ax-color-text-secondary); }
    .ax-auto-code {
      font-family: var(--ax-font-family-mono, monospace);
      font-size: var(--ax-font-size-xs);
      background: var(--ax-color-bg-surface-alt);
      padding: 1px 4px; border-radius: var(--ax-radius-sm);
    }

    /* ── 액션 목록 ── */
    .ax-auto-actions-list { display: flex; flex-direction: column; gap: var(--ax-spacing-2); }
    .ax-auto-action-item {
      display: flex; align-items: flex-start; gap: var(--ax-spacing-2);
      padding: var(--ax-spacing-2) var(--ax-spacing-3);
      background: var(--ax-color-bg-surface-alt);
      border-radius: var(--ax-radius-md);
    }
    .ax-auto-action-item__icon {
      color: var(--ax-color-brand-accent, #6750a4); margin-top: 2px;
      font-size: 20px; width: 20px; height: 20px; flex-shrink: 0;
    }
    .ax-auto-action-item__detail { display: flex; flex-direction: column; gap: 2px; }
    .ax-auto-action-item__type {
      font-size: var(--ax-font-size-sm); font-weight: var(--ax-font-weight-medium);
    }
    .ax-auto-action-item__sub {
      font-size: var(--ax-font-size-xs); color: var(--ax-color-text-secondary);
    }

    /* ── 통계 ── */
    .ax-auto-stats-row { display: flex; gap: var(--ax-spacing-3); }
    .ax-auto-stat-box {
      display: flex; flex-direction: column; align-items: center;
      padding: var(--ax-spacing-3) var(--ax-spacing-4);
      background: var(--ax-color-bg-surface-alt);
      border: 1px solid var(--ax-color-border);
      border-radius: var(--ax-radius-md); flex: 1;
    }
    .ax-auto-stat-box__val {
      font-size: var(--ax-font-size-2xl); font-weight: var(--ax-font-weight-bold);
      color: var(--ax-color-text-primary);
    }
    .ax-auto-stat-box--success .ax-auto-stat-box__val { color: var(--ax-color-success); }
    .ax-auto-stat-box--danger  .ax-auto-stat-box__val { color: var(--ax-color-danger); }
    .ax-auto-stat-box__lbl {
      font-size: var(--ax-font-size-xs); color: var(--ax-color-text-secondary); margin-top: 2px;
    }
  `],
})
export class AutomationRuleDetailPageComponent implements OnInit {
  private readonly route    = inject(ActivatedRoute);
  private readonly router   = inject(Router);
  private readonly http     = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);

  readonly rule    = signal<any>(null);
  readonly loading = signal(false);

  ngOnInit() { this.loadRule(); }

  loadRule() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id || id === 'new') return;
    this.loading.set(true);
    this.http.get<any>(`/api/v1/automation-rules/${id}`).subscribe({
      next: r => { this.rule.set(r); this.loading.set(false); },
      error: () => { this.loading.set(false); this.snackBar.open('룰 조회 실패', '닫기', { duration: 3000 }); },
    });
  }

  toggleActive(isActive: boolean) {
    const r = this.rule();
    if (!r) return;
    this.http.patch(`/api/v1/automation-rules/${r._id}/toggle`, { isActive }).subscribe({
      next: updated => {
        this.rule.set(updated);
        this.snackBar.open(`${isActive ? '활성화' : '비활성화'} 완료`, '닫기', { duration: 2000 });
      },
      error: () => this.snackBar.open('변경 실패', '닫기', { duration: 3000 }),
    });
  }

  executeNow() {
    const r = this.rule();
    if (!r) return;
    this.http.post(`/api/v1/automation-rules/${r._id}/execute`, {}).subscribe({
      next: () => {
        this.snackBar.open('실행 완료. 이력 탭에서 결과를 확인하세요.', '닫기', { duration: 4000 });
        this.loadRule();
      },
      error: () => this.snackBar.open('실행 실패', '닫기', { duration: 3000 }),
    });
  }

  onSaved(updated: any) {
    this.rule.set(updated);
    this.snackBar.open('저장 완료', '닫기', { duration: 2000 });
  }

  back() { this.router.navigate(['/automation/rules']); }

  categoryLabel(cat: string) { return AUTOMATION_RULE_CATEGORY_LABELS[cat as any] ?? cat; }
  triggerLabel(t: string)    { return AUTOMATION_TRIGGER_TYPE_LABELS[t as any] ?? t; }
  actionLabel(t: string)     { return AUTOMATION_ACTION_TYPE_LABELS[t as any] ?? t; }

  actionIcon(t: string) {
    const m: Record<string, string> = {
      SEND_NOTIFICATION: 'notifications', CREATE_ALERT: 'warning',
      CREATE_SCHEDULE: 'event', CREATE_WORK_ORDER: 'assignment', UPDATE_STATUS: 'swap_horiz',
    };
    return m[t] ?? 'bolt';
  }
}
