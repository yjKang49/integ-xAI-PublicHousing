// apps/admin-web/src/app/features/dashboard/components/kpi-card.component.ts
// 재사용 가능한 KPI 지표 카드 — 디자인 시스템 토큰 기반으로 통일
import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';

// ── 타입 정의 (기존 유지) ────────────────────────────────────────────────────
type KpiColor = 'error' | 'warn' | 'info' | 'primary' | 'success' | 'neutral';
type KpiTrend = 'up' | 'down' | 'stable' | null;

// ── 색상 맵 — CSS 커스텀 프로퍼티 기반으로 교체 ─────────────────────────────
const COLOR_MAP: Record<KpiColor, {
  iconBg: string; iconColor: string; valueColor: string; accentColor: string;
}> = {
  error:   {
    iconBg: 'var(--ax-color-danger-subtle)',
    iconColor: 'var(--ax-color-danger)',
    valueColor: 'var(--ax-color-danger-text)',
    accentColor: 'var(--ax-color-danger)',
  },
  warn:    {
    iconBg: 'var(--ax-color-warning-subtle)',
    iconColor: 'var(--ax-color-warning)',
    valueColor: 'var(--ax-color-warning-text)',
    accentColor: 'var(--ax-color-warning)',
  },
  info:    {
    iconBg: 'var(--ax-color-info-subtle)',
    iconColor: 'var(--ax-color-info)',
    valueColor: 'var(--ax-color-info-text)',
    accentColor: 'var(--ax-color-info)',
  },
  primary: {
    iconBg: 'var(--ax-color-brand-primary-subtle)',
    iconColor: 'var(--ax-color-brand-primary)',
    valueColor: 'var(--ax-color-brand-primary)',
    accentColor: 'var(--ax-color-brand-primary)',
  },
  success: {
    iconBg: 'var(--ax-color-success-subtle)',
    iconColor: 'var(--ax-color-success)',
    valueColor: 'var(--ax-color-success-text)',
    accentColor: 'var(--ax-color-success)',
  },
  neutral: {
    iconBg: 'var(--ax-color-neutral-subtle)',
    iconColor: 'var(--ax-color-neutral)',
    valueColor: 'var(--ax-color-text-secondary)',
    accentColor: 'var(--ax-color-neutral)',
  },
};

@Component({
  selector: 'ax-kpi-card',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatIconModule,
            MatProgressSpinnerModule, MatRippleModule, MatTooltipModule],
  template: `
    <div
      class="ax-kpi"
      [style.border-top-color]="colors().accentColor"
      [style.cursor]="routerLink() ? 'pointer' : 'default'"
      matRipple
      [matRippleDisabled]="!routerLink()"
      [routerLink]="routerLink() ?? null"
      [queryParams]="queryParams() ?? null"
      [matTooltip]="tooltip() ?? ''"
      role="region"
      [attr.aria-label]="label()"
    >
      <!-- 아이콘 -->
      <div class="ax-kpi__icon" [style.background]="colors().iconBg" aria-hidden="true">
        <mat-icon [style.color]="colors().iconColor">{{ icon() }}</mat-icon>
      </div>

      <!-- 본문 -->
      <div class="ax-kpi__body">
        @if (loading()) {
          <mat-spinner diameter="20" />
        } @else {
          <div class="ax-kpi__value" [style.color]="colors().valueColor">
            {{ value() }}<span class="ax-kpi__unit">{{ unit() }}</span>
          </div>
        }
        <div class="ax-kpi__label">{{ label() }}</div>
        @if (subtitle()) {
          <div class="ax-kpi__sub">{{ subtitle() }}</div>
        }
      </div>

      <!-- 트렌드 -->
      @if (trend()) {
        <div class="ax-kpi__trend ax-kpi__trend--{{ trend() }}" aria-hidden="true">
          <mat-icon>{{ trendIcon() }}</mat-icon>
        </div>
      }

      <!-- 진행 바 (목표 대비) -->
      @if (target() !== null && target() !== undefined) {
        <div class="ax-kpi__progress" aria-hidden="true"
             [attr.title]="'목표: ' + target() + unit()">
          <div class="ax-kpi__progress-fill"
               [style.width.%]="progressPct()"
               [style.background]="colors().accentColor">
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }

    /* ── 카드 본체 ── */
    .ax-kpi {
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border-default);
      border-top: 3px solid var(--ax-color-brand-primary); /* accent override from input */
      border-radius: var(--ax-radius-lg);
      box-shadow: var(--ax-shadow-xs);
      padding: var(--ax-card-padding);
      display: flex;
      align-items: flex-start;
      gap: var(--ax-spacing-12);
      height: 100%;
      position: relative;
      transition: box-shadow var(--ax-transition-base), transform var(--ax-transition-base);
      overflow: hidden;

      &:hover {
        box-shadow: var(--ax-shadow-md);
        transform: translateY(-1px);
      }
    }

    /* ── 아이콘 ── */
    .ax-kpi__icon {
      width: 42px;
      height: 42px;
      border-radius: var(--ax-radius-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 2px;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    /* ── 본문 ── */
    .ax-kpi__body {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .ax-kpi__value {
      font-size: var(--ax-font-size-kpi);
      font-weight: var(--ax-font-weight-bold);
      line-height: var(--ax-line-height-tight);
      letter-spacing: -0.01em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-variant-numeric: tabular-nums;
    }

    .ax-kpi__unit {
      font-size: var(--ax-font-size-xs);
      font-weight: var(--ax-font-weight-regular);
      color: var(--ax-color-text-tertiary);
      margin-left: 2px;
    }

    .ax-kpi__label {
      font-size: var(--ax-font-size-sm);
      font-weight: var(--ax-font-weight-medium);
      color: var(--ax-color-text-secondary);
    }

    .ax-kpi__sub {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-tertiary);
    }

    /* ── 트렌드 ── */
    .ax-kpi__trend {
      flex-shrink: 0;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .ax-kpi__trend--up   mat-icon { color: var(--ax-color-danger); }
    .ax-kpi__trend--down mat-icon { color: var(--ax-color-success); }
    .ax-kpi__trend--stable mat-icon { color: var(--ax-color-text-tertiary); }

    /* ── 진행 바 ── */
    .ax-kpi__progress {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: var(--ax-color-border-subtle);
    }

    .ax-kpi__progress-fill {
      height: 100%;
      transition: width 0.5s ease;
    }
  `],
})
export class KpiCardComponent {
  // ── 입력값 (기존 인터페이스 완전 유지) ──────────────────────────────────────
  readonly icon        = input<string>('info');
  readonly color       = input<KpiColor>('primary');
  readonly label       = input<string>('');
  readonly value       = input<string | number>('—');
  readonly unit        = input<string>('');
  readonly subtitle    = input<string | null>(null);
  readonly loading     = input<boolean>(false);
  readonly trend       = input<KpiTrend>(null);
  readonly target      = input<number | null>(null);
  readonly routerLink  = input<string | any[] | null>(null);
  readonly queryParams = input<Record<string, any> | null>(null);
  readonly tooltip     = input<string | null>(null);

  // 기존 로직 유지
  readonly colors      = () => COLOR_MAP[this.color()] ?? COLOR_MAP.primary;

  readonly trendIcon   = () => ({
    up: 'trending_up', down: 'trending_down', stable: 'trending_flat',
  })[this.trend() ?? 'stable'] ?? 'trending_flat';

  readonly progressPct = () => {
    const t = this.target();
    const v = Number(this.value());
    if (t == null || isNaN(v) || t === 0) return 0;
    return Math.min(100, Math.round((v / t) * 100));
  };
}
