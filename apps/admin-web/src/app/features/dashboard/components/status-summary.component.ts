// apps/admin-web/src/app/features/dashboard/components/status-summary.component.ts
// 섹션별 상태 요약 카드 — 디자인 시스템 토큰 적용 (API/로직 유지)
import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

export interface StatusItem {
  icon: string;
  label: string;
  value: number | string;
  unit?: string;
  route?: string;
  warnAbove?: number;
  successAbove?: number;
  direction?: 'higher' | 'lower';
}

@Component({
  selector: 'ax-status-summary',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule],
  template: `
    <div class="ax-sum">
      <!-- 헤더 -->
      <div class="ax-sum__head">
        <div class="ax-sum__head-icon" aria-hidden="true">
          <mat-icon [style.color]="headerColor()">{{ headerIcon() }}</mat-icon>
        </div>
        <h3 class="ax-sum__title">{{ title() }}</h3>
        @if (viewAllRoute()) {
          <a class="ax-sum__view-all" [routerLink]="viewAllRoute()" aria-label="전체 보기">
            전체 보기 <mat-icon aria-hidden="true">chevron_right</mat-icon>
          </a>
        }
      </div>

      <div class="ax-sum__divider" aria-hidden="true"></div>

      <!-- 항목 목록 -->
      <ul class="ax-sum__list" role="list">
        @for (item of items(); track item.label) {
          <li class="ax-sum__row" [class.ax-sum__row--link]="!!item.route"
              [routerLink]="item.route ?? null"
              [attr.role]="item.route ? 'link' : null"
              [attr.aria-label]="item.label + ': ' + item.value + (item.unit ?? '')">
            <!-- 아이콘 -->
            <div class="ax-sum__item-icon" [class]="'ax-sum__item-icon--' + getItemTier(item)" aria-hidden="true">
              <mat-icon>{{ item.icon }}</mat-icon>
            </div>

            <!-- 레이블 -->
            <span class="ax-sum__item-label">{{ item.label }}</span>

            <!-- 값 -->
            <div class="ax-sum__item-right">
              <span class="ax-sum__item-value" [class]="'ax-sum__item-value--' + getItemTier(item)">
                {{ item.value }}
              </span>
              @if (item.unit) {
                <span class="ax-sum__item-unit">{{ item.unit }}</span>
              }
              @if (item.route) {
                <mat-icon class="ax-sum__item-chevron" aria-hidden="true">chevron_right</mat-icon>
              }
            </div>
          </li>
        }

        @if (items().length === 0) {
          <li class="ax-sum__empty" role="status">표시할 항목이 없습니다</li>
        }
      </ul>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }

    .ax-sum {
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border-default);
      border-radius: var(--ax-radius-lg);
      box-shadow: var(--ax-shadow-xs);
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    /* ── 헤더 ── */
    .ax-sum__head {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-8);
      padding: var(--ax-card-padding);
      padding-bottom: var(--ax-spacing-12);
    }

    .ax-sum__head-icon {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .ax-sum__title {
      flex: 1;
      font-size: var(--ax-font-size-lg);
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
      margin: 0;
    }

    .ax-sum__view-all {
      display: flex;
      align-items: center;
      gap: 2px;
      font-size: var(--ax-font-size-xs);
      font-weight: var(--ax-font-weight-medium);
      color: var(--ax-color-brand-primary);
      text-decoration: none;
      padding: 2px 4px;
      border-radius: var(--ax-radius-sm);
      transition: background var(--ax-transition-fast);

      mat-icon { font-size: 14px; width: 14px; height: 14px; }

      &:hover { background: var(--ax-color-brand-primary-subtle); }
    }

    .ax-sum__divider {
      height: 1px;
      background: var(--ax-color-border-default);
      margin: 0 var(--ax-card-padding);
    }

    /* ── 목록 ── */
    .ax-sum__list {
      list-style: none;
      margin: 0;
      padding: var(--ax-spacing-8) 0;
      flex: 1;
    }

    .ax-sum__row {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-8);
      padding: var(--ax-spacing-8) var(--ax-card-padding);
      border-radius: 0;
      transition: background var(--ax-transition-fast);

      &--link {
        cursor: pointer;

        &:hover {
          background: var(--ax-color-bg-surface-alt);
        }
      }
    }

    /* ── 아이콘 배경 (상태별) ── */
    .ax-sum__item-icon {
      width: 28px;
      height: 28px;
      border-radius: var(--ax-radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: var(--ax-color-neutral-subtle);

      mat-icon {
        font-size: 15px;
        width: 15px;
        height: 15px;
        color: var(--ax-color-neutral);
      }

      &--danger {
        background: var(--ax-color-danger-subtle);
        mat-icon { color: var(--ax-color-danger); }
      }

      &--warning {
        background: var(--ax-color-warning-subtle);
        mat-icon { color: var(--ax-color-warning); }
      }

      &--success {
        background: var(--ax-color-success-subtle);
        mat-icon { color: var(--ax-color-success); }
      }
    }

    .ax-sum__item-label {
      flex: 1;
      font-size: var(--ax-font-size-md);
      color: var(--ax-color-text-secondary);
    }

    .ax-sum__item-right {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-4);
    }

    .ax-sum__item-value {
      font-size: var(--ax-font-size-lg);
      font-weight: var(--ax-font-weight-bold);
      color: var(--ax-color-text-primary);
      font-variant-numeric: tabular-nums;

      &--danger  { color: var(--ax-color-danger-text); }
      &--warning { color: var(--ax-color-warning-text); }
      &--success { color: var(--ax-color-success-text); }
    }

    .ax-sum__item-unit {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-tertiary);
    }

    .ax-sum__item-chevron {
      font-size: 15px;
      width: 15px;
      height: 15px;
      color: var(--ax-color-text-disabled);
    }

    .ax-sum__empty {
      text-align: center;
      color: var(--ax-color-text-disabled);
      padding: var(--ax-spacing-24);
      font-size: var(--ax-font-size-sm);
    }
  `],
})
export class StatusSummaryComponent {
  // ── 입력 (기존 API 유지) ──────────────────────────────────────────────────
  readonly title        = input<string>('');
  readonly headerIcon   = input<string>('info');
  readonly headerColor  = input<string>('#1976d2');
  readonly items        = input<StatusItem[]>([]);
  readonly viewAllRoute = input<string | null>(null);

  // ── 상태 판단 로직 (기존 유지) ────────────────────────────────────────────
  getItemTier(item: StatusItem): string {
    const v = Number(item.value);
    if (isNaN(v)) return 'neutral';

    if (item.direction === 'lower' || item.direction === undefined) {
      if (item.warnAbove != null && v > item.warnAbove) return 'danger';
      if (item.successAbove != null && v <= item.successAbove) return 'success';
    } else {
      if (item.successAbove != null && v >= item.successAbove) return 'success';
      if (item.warnAbove != null && v < item.warnAbove) return 'warning';
    }
    return 'neutral';
  }
}
