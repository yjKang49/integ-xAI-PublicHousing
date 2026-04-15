// apps/admin-web/src/app/shared/components/status-badge/status-badge.component.ts
// 전역 통일 상태 배지 — 상태 의미는 반드시 색+텍스트+아이콘 병행
import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
export type BadgeSize    = 'sm' | 'md';

// ── 전역 상태 색상 맵 ────────────────────────────────────────────────────────
// 이 맵이 프로젝트 전체의 단일 진실 공급원(SSOT)이다.
const VARIANT_META: Record<BadgeVariant, { icon: string; label: string }> = {
  success: { icon: 'check_circle', label: '정상/완료' },
  warning: { icon: 'warning',      label: '주의/보류' },
  danger:  { icon: 'error',        label: '위험/긴급' },
  info:    { icon: 'info',         label: '진행중/처리중' },
  neutral: { icon: 'radio_button_unchecked', label: '대기/미분류' },
};

@Component({
  selector: 'ax-status-badge',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <span
      class="ax-badge ax-badge--{{ variant() }} ax-badge--{{ size() }}"
      [attr.aria-label]="ariaLabel()"
      role="status"
    >
      @if (showIcon()) {
        <mat-icon class="ax-badge__icon" aria-hidden="true">{{ icon() }}</mat-icon>
      }
      <span class="ax-badge__text">{{ label() }}</span>
    </span>
  `,
  styles: [`
    :host { display: inline-flex; }

    .ax-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      border-radius: var(--ax-radius-full);
      font-weight: var(--ax-font-weight-semibold);
      white-space: nowrap;
      line-height: 1;
    }

    /* ── 크기 ── */
    .ax-badge--sm {
      padding: 2px 6px;
      font-size: 10px;

      .ax-badge__icon { font-size: 11px; width: 11px; height: 11px; }
    }

    .ax-badge--md {
      padding: 3px 8px;
      font-size: var(--ax-font-size-xs);

      .ax-badge__icon { font-size: 13px; width: 13px; height: 13px; }
    }

    /* ── 의미별 색상 ── */
    .ax-badge--success {
      background: var(--ax-color-success-subtle);
      color: var(--ax-color-success-text);
    }

    .ax-badge--warning {
      background: var(--ax-color-warning-subtle);
      color: var(--ax-color-warning-text);
    }

    .ax-badge--danger {
      background: var(--ax-color-danger-subtle);
      color: var(--ax-color-danger-text);
    }

    .ax-badge--info {
      background: var(--ax-color-info-subtle);
      color: var(--ax-color-info-text);
    }

    .ax-badge--neutral {
      background: var(--ax-color-neutral-subtle);
      color: var(--ax-color-neutral-text);
    }

    .ax-badge__icon {
      flex-shrink: 0;
    }
  `],
})
export class StatusBadgeComponent {
  readonly variant  = input.required<BadgeVariant>();
  readonly label    = input.required<string>();
  readonly size     = input<BadgeSize>('md');
  readonly showIcon = input<boolean>(true);

  readonly icon     = computed(() => VARIANT_META[this.variant()]?.icon ?? 'info');
  readonly ariaLabel = computed(() => `상태: ${this.label()}`);
}

// ── 상태→배지 매핑 헬퍼 (각 페이지에서 사용) ────────────────────────────────
// 업무 상태코드를 BadgeVariant로 변환하는 중앙 함수
export function severityToVariant(severity: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    CRITICAL: 'danger',
    HIGH:     'danger',
    MEDIUM:   'warning',
    LOW:      'info',
    NONE:     'neutral',
  };
  return map[severity?.toUpperCase()] ?? 'neutral';
}

export function statusToVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    // 완료/정상/활성
    COMPLETED: 'success', RESOLVED: 'success', APPROVED: 'success',
    ACTIVE:    'success', NORMAL:   'success', RUNNING:  'success',
    DONE:      'success', CLOSED:   'success',
    // 경고/보류/검토
    PENDING:   'warning', IN_REVIEW: 'warning', MODIFIED: 'warning',
    ASSIGNED:  'warning', IN_PROGRESS: 'info',  PROCESSING: 'info',
    // 위험/실패/기각
    FAILED:    'danger',  REJECTED:  'danger',  CRITICAL: 'danger',
    OVERDUE:   'danger',  ERROR:     'danger',
    // 중립/대기
    DRAFT:     'neutral', INACTIVE:  'neutral', RECEIVED: 'info',
    NEW:       'info',    OPEN:      'info',
  };
  return map[status?.toUpperCase()] ?? 'neutral';
}
