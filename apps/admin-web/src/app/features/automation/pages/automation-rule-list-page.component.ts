// apps/admin-web/src/app/features/automation/pages/automation-rule-list-page.component.ts
// Phase 2-7: 자동화 룰 목록 페이지

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import {
  AutomationRuleCategory, AutomationTriggerType,
  AUTOMATION_RULE_CATEGORY_LABELS, AUTOMATION_TRIGGER_TYPE_LABELS,
} from '@ax/shared';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

interface AutomationRuleRow {
  _id: string;
  name: string;
  ruleKey: string;
  category: AutomationRuleCategory;
  triggerType: AutomationTriggerType;
  isActive: boolean;
  executionCount: number;
  successCount: number;
  failureCount: number;
  lastTriggeredAt?: string;
  actionsCount: number;
}

@Component({
  selector: 'ax-automation-rule-list-page',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule,
    MatButtonModule, MatIconModule, MatTableModule,
    MatSlideToggleModule, MatSnackBarModule,
    MatTooltipModule, MatProgressSpinnerModule,
    MatSelectModule, MatFormFieldModule,
    EmptyStateComponent,
  ],
  template: `
    <!-- 헤더 -->
    <div class="ax-auto-header">
      <div class="ax-auto-header__identity">
        <div class="ax-auto-header__icon-wrap">
          <mat-icon>smart_toy</mat-icon>
        </div>
        <div>
          <h1 class="ax-auto-header__title">업무 자동화 룰</h1>
          <p class="ax-auto-header__desc">반복 행정 업무를 자동화하는 룰을 관리합니다</p>
        </div>
      </div>
      <div class="ax-auto-header__actions">
        <button mat-stroked-button (click)="scan()" [disabled]="scanning()">
          <mat-icon>search</mat-icon> 날짜 기반 스캔
        </button>
        <button mat-flat-button color="primary" (click)="openCreate()">
          <mat-icon>add</mat-icon> 룰 추가
        </button>
      </div>
    </div>

    <!-- 필터 바 -->
    <div class="ax-filter-bar">
      <div class="ax-filter-bar__filters">
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>카테고리</mat-label>
          <mat-select [(ngModel)]="filterCategory" (selectionChange)="load()">
            <mat-option value="">전체</mat-option>
            @for (cat of categoryOptions; track cat.value) {
              <mat-option [value]="cat.value">{{ cat.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>활성화 상태</mat-label>
          <mat-select [(ngModel)]="filterActive" (selectionChange)="load()">
            <mat-option value="">전체</mat-option>
            <mat-option value="true">활성</mat-option>
            <mat-option value="false">비활성</mat-option>
          </mat-select>
        </mat-form-field>
      </div>
      <span class="ax-filter-bar__meta">총 {{ totalCount() }}개</span>
    </div>

    <!-- 테이블 -->
    @if (loading()) {
      <div class="ax-loading-center">
        <mat-spinner diameter="40" />
      </div>
    } @else {
      <div class="ax-table-container">
        <table mat-table [dataSource]="rules()" class="ax-auto-table">

          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>룰 이름</th>
            <td mat-cell *matCellDef="let r">
              <div class="ax-auto-rule-name">
                <span class="ax-auto-rule-name__text" (click)="openDetail(r._id)">{{ r.name }}</span>
                <span class="ax-auto-rule-name__key">{{ r.ruleKey }}</span>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="category">
            <th mat-header-cell *matHeaderCellDef>카테고리</th>
            <td mat-cell *matCellDef="let r">
              <span class="ax-auto-cat ax-auto-cat--{{ r.category.toLowerCase() }}">
                {{ categoryLabel(r.category) }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="trigger">
            <th mat-header-cell *matHeaderCellDef>트리거</th>
            <td mat-cell *matCellDef="let r">
              <div class="ax-auto-trigger ax-auto-trigger--{{ r.triggerType.toLowerCase() }}">
                <mat-icon class="ax-auto-trigger__icon">{{ triggerIcon(r.triggerType) }}</mat-icon>
                {{ triggerLabel(r.triggerType) }}
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>액션</th>
            <td mat-cell *matCellDef="let r">
              <span class="ax-auto-meta">{{ r.actionsCount }}개</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="stats">
            <th mat-header-cell *matHeaderCellDef>실행 / 성공 / 실패</th>
            <td mat-cell *matCellDef="let r">
              <span class="ax-auto-stat__total">{{ r.executionCount }}</span> /
              <span class="ax-auto-stat__success">{{ r.successCount }}</span> /
              <span class="ax-auto-stat__fail" [class.ax-auto-stat__fail--has]="r.failureCount > 0">
                {{ r.failureCount }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="lastRun">
            <th mat-header-cell *matHeaderCellDef>마지막 실행</th>
            <td mat-cell *matCellDef="let r">
              <span class="ax-auto-meta">
                {{ r.lastTriggeredAt ? (r.lastTriggeredAt | date:'MM/dd HH:mm') : '—' }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="active">
            <th mat-header-cell *matHeaderCellDef>활성화</th>
            <td mat-cell *matCellDef="let r">
              <mat-slide-toggle
                [checked]="r.isActive"
                (change)="toggleRule(r, $event.checked)"
                color="primary"
              />
            </td>
          </ng-container>

          <ng-container matColumnDef="operations">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let r">
              <button mat-icon-button color="primary" matTooltip="즉시 실행"
                (click)="executeNow(r)" [disabled]="!r.isActive">
                <mat-icon>play_arrow</mat-icon>
              </button>
              <button mat-icon-button matTooltip="상세 / 수정" (click)="openDetail(r._id)">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button color="warn" matTooltip="삭제" (click)="deleteRule(r)">
                <mat-icon>delete_outline</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"
            [class.ax-auto-row--inactive]="!row.isActive"></tr>
        </table>

        @if (rules().length === 0) {
          <ax-empty-state
            type="empty"
            icon="rule"
            title="등록된 자동화 룰이 없습니다"
            description="첫 번째 자동화 룰을 추가해 반복 행정 업무를 자동화해 보세요"
            primaryLabel="첫 번째 룰 추가"
            primaryIcon="add"
            (primaryAction)="openCreate()"
          />
        }
      </div>
    }
  `,
  styles: [`
    /* ── 헤더 ── */
    .ax-auto-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: var(--ax-spacing-4);
      margin-bottom: var(--ax-spacing-5);
    }
    .ax-auto-header__identity {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-3);
    }
    .ax-auto-header__icon-wrap {
      width: 44px; height: 44px;
      border-radius: var(--ax-radius-md);
      background: var(--ax-color-brand-accent, #6750a4);
      display: flex; align-items: center; justify-content: center;
      color: #fff; flex-shrink: 0;
    }
    .ax-auto-header__title {
      margin: 0;
      font-size: var(--ax-font-size-xl);
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
      line-height: 1.3;
    }
    .ax-auto-header__desc {
      margin: 2px 0 0;
      font-size: var(--ax-font-size-sm);
      color: var(--ax-color-text-secondary);
    }
    .ax-auto-header__actions {
      display: flex;
      gap: var(--ax-spacing-2);
      flex-shrink: 0;
    }

    /* 필터 메타 */
    .ax-filter-bar__meta {
      font-size: var(--ax-font-size-sm);
      color: var(--ax-color-text-secondary);
      margin-left: auto;
      align-self: center;
    }

    /* ── 테이블 ── */
    .ax-auto-table { width: 100%; }
    th.mat-mdc-header-cell {
      font-weight: var(--ax-font-weight-semibold);
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-secondary);
    }
    td.mat-mdc-cell {
      font-size: var(--ax-font-size-sm);
      padding: 0 var(--ax-spacing-2);
    }

    /* 룰 이름 */
    .ax-auto-rule-name {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .ax-auto-rule-name__text {
      font-weight: var(--ax-font-weight-medium);
      cursor: pointer;
      color: var(--ax-color-brand-primary);
    }
    .ax-auto-rule-name__text:hover { text-decoration: underline; }
    .ax-auto-rule-name__key {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-tertiary);
      font-family: var(--ax-font-family-mono, monospace);
    }

    /* 카테고리 배지 */
    .ax-auto-cat {
      display: inline-block;
      padding: 2px 8px;
      border-radius: var(--ax-radius-sm);
      font-size: var(--ax-font-size-xs);
      font-weight: var(--ax-font-weight-medium);
    }
    .ax-auto-cat--inspection   { background: var(--ax-color-info-subtle);    color: var(--ax-color-info); }
    .ax-auto-cat--maintenance  { background: var(--ax-color-warning-subtle); color: var(--ax-color-warning); }
    .ax-auto-cat--complaint    { background: var(--ax-color-danger-subtle);  color: var(--ax-color-danger); }
    .ax-auto-cat--contract     { background: var(--ax-color-success-subtle); color: var(--ax-color-success); }
    .ax-auto-cat--general      { background: var(--ax-color-bg-surface-alt); color: var(--ax-color-text-secondary); }

    /* 트리거 배지 */
    .ax-auto-trigger {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: var(--ax-radius-full);
      font-size: var(--ax-font-size-xs);
    }
    .ax-auto-trigger__icon { font-size: 14px; width: 14px; height: 14px; }
    .ax-auto-trigger--date_based    { background: var(--ax-color-info-subtle);    color: var(--ax-color-info); }
    .ax-auto-trigger--status_change { background: var(--ax-color-info-subtle);    color: var(--ax-color-brand-accent, #6750a4); }
    .ax-auto-trigger--threshold     { background: var(--ax-color-warning-subtle); color: var(--ax-color-warning); }
    .ax-auto-trigger--manual        { background: var(--ax-color-bg-surface-alt); color: var(--ax-color-text-secondary); }

    /* 실행 통계 */
    .ax-auto-stat__total   { color: var(--ax-color-text-primary); font-weight: var(--ax-font-weight-medium); }
    .ax-auto-stat__success { color: var(--ax-color-success); }
    .ax-auto-stat__fail    { color: var(--ax-color-text-tertiary); }
    .ax-auto-stat__fail--has { color: var(--ax-color-danger); font-weight: var(--ax-font-weight-semibold); }

    /* 메타 */
    .ax-auto-meta { font-size: var(--ax-font-size-xs); color: var(--ax-color-text-secondary); }

    /* 비활성 행 */
    .ax-auto-row--inactive { opacity: 0.55; }
  `],
})
export class AutomationRuleListPageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly rules = signal<AutomationRuleRow[]>([]);
  readonly loading = signal(false);
  readonly scanning = signal(false);
  readonly totalCount = signal(0);

  filterCategory = '';
  filterActive = '';

  displayedColumns = ['name', 'category', 'trigger', 'actions', 'stats', 'lastRun', 'active', 'operations'];

  categoryOptions = Object.values(AutomationRuleCategory).map(v => ({
    value: v, label: AUTOMATION_RULE_CATEGORY_LABELS[v],
  }));

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const params: Record<string, string> = { limit: '50' };
    if (this.filterCategory) params['category'] = this.filterCategory;
    if (this.filterActive) params['isActive'] = this.filterActive;

    this.http.get<any>('/api/v1/automation-rules', { params }).subscribe({
      next: res => {
        this.rules.set((res.data ?? []).map((r: any) => ({
          ...r,
          triggerType: r.trigger?.type,
          actionsCount: r.actions?.length ?? 0,
        })));
        this.totalCount.set(res.meta?.total ?? 0);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('룰 목록 조회 실패', '닫기', { duration: 3000 });
      },
    });
  }

  toggleRule(rule: AutomationRuleRow, isActive: boolean) {
    this.http.patch(`/api/v1/automation-rules/${rule._id}/toggle`, { isActive }).subscribe({
      next: () => {
        rule.isActive = isActive;
        this.rules.update(list => [...list]);
        this.snackBar.open(`룰 ${isActive ? '활성화' : '비활성화'} 완료`, '닫기', { duration: 2000 });
      },
      error: () => this.snackBar.open('변경 실패', '닫기', { duration: 3000 }),
    });
  }

  executeNow(rule: AutomationRuleRow) {
    this.http.post(`/api/v1/automation-rules/${rule._id}/execute`, {}).subscribe({
      next: () => {
        this.snackBar.open(`'${rule.name}' 실행 완료. 이력에서 결과를 확인하세요.`, '닫기', { duration: 4000 });
        this.load();
      },
      error: () => this.snackBar.open('실행 실패', '닫기', { duration: 3000 }),
    });
  }

  scan() {
    this.scanning.set(true);
    this.http.post<any>('/api/v1/automation-rules/scan', {}).subscribe({
      next: res => {
        this.scanning.set(false);
        this.snackBar.open(
          `스캔 완료: ${res.scanned}개 검사 → ${res.triggered}개 실행됨`,
          '닫기', { duration: 4000 },
        );
        this.load();
      },
      error: () => {
        this.scanning.set(false);
        this.snackBar.open('스캔 실패', '닫기', { duration: 3000 });
      },
    });
  }

  deleteRule(rule: AutomationRuleRow) {
    if (!confirm(`'${rule.name}' 룰을 삭제하시겠습니까?`)) return;
    this.http.delete(`/api/v1/automation-rules/${rule._id}`).subscribe({
      next: () => {
        this.snackBar.open('삭제 완료', '닫기', { duration: 2000 });
        this.load();
      },
      error: () => this.snackBar.open('삭제 실패', '닫기', { duration: 3000 }),
    });
  }

  openDetail(id: string) { this.router.navigate(['/automation/rules', id]); }
  openCreate() { this.router.navigate(['/automation/rules/new']); }

  categoryLabel(cat: AutomationRuleCategory) { return AUTOMATION_RULE_CATEGORY_LABELS[cat] ?? cat; }
  triggerLabel(t: AutomationTriggerType) { return AUTOMATION_TRIGGER_TYPE_LABELS[t] ?? t; }
  triggerIcon(t: AutomationTriggerType) {
    const map: Record<string, string> = {
      DATE_BASED: 'schedule', STATUS_CHANGE: 'swap_horiz',
      THRESHOLD: 'trending_up', MANUAL: 'touch_app',
    };
    return map[t] ?? 'rule';
  }
}
