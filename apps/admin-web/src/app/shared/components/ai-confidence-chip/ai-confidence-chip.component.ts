// apps/admin-web/src/app/shared/components/ai-confidence-chip/ai-confidence-chip.component.ts
// AI 신뢰도 표현 전용 컴포넌트 — 모든 AI 화면에서 동일한 시각 언어 사용
import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'ax-ai-confidence',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  template: `
    <div
      class="ax-conf"
      [class]="'ax-conf--' + tier()"
      [matTooltip]="'AI 신뢰도: ' + pct() + '% (' + tierLabel() + ')'"
      role="meter"
      [attr.aria-valuenow]="value()"
      [attr.aria-valuemin]="0"
      [attr.aria-valuemax]="1"
      [attr.aria-label]="'신뢰도 ' + pct() + '%'"
    >
      <mat-icon class="ax-conf__icon" aria-hidden="true">{{ tierIcon() }}</mat-icon>
      <span class="ax-conf__pct">{{ pct() }}%</span>
      @if (showBar()) {
        <div class="ax-conf__track" aria-hidden="true">
          <div class="ax-conf__fill" [style.width.%]="value() * 100"></div>
        </div>
      }
      @if (showLabel()) {
        <span class="ax-conf__label">{{ tierLabel() }}</span>
      }
    </div>
  `,
  styles: [`
    :host { display: inline-flex; }

    .ax-conf {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px 2px 6px;
      border-radius: var(--ax-radius-full);
      font-size: var(--ax-font-size-xs);
      font-weight: var(--ax-font-weight-semibold);
    }

    .ax-conf__icon {
      font-size: 12px;
      width: 12px;
      height: 12px;
      flex-shrink: 0;
    }

    .ax-conf__pct {
      font-variant-numeric: tabular-nums;
    }

    /* ── Tier 색상 ── */
    .ax-conf--high {
      background: var(--ax-color-success-subtle);
      color: var(--ax-color-success-text);
    }

    .ax-conf--medium {
      background: var(--ax-color-warning-subtle);
      color: var(--ax-color-warning-text);
    }

    .ax-conf--low {
      background: var(--ax-color-danger-subtle);
      color: var(--ax-color-danger-text);
    }

    /* ── 바 형태 ── */
    .ax-conf__track {
      width: 48px;
      height: 4px;
      background: rgba(0,0,0,0.10);
      border-radius: var(--ax-radius-full);
      overflow: hidden;
    }

    .ax-conf__fill {
      height: 100%;
      border-radius: var(--ax-radius-full);
      background: currentColor;
      transition: width var(--ax-transition-slow);
    }

    .ax-conf__label {
      font-size: 10px;
      opacity: 0.8;
    }
  `],
})
export class AiConfidenceChipComponent {
  /** 0~1 사이의 신뢰도 값 */
  readonly value     = input.required<number>();
  readonly showBar   = input<boolean>(false);
  readonly showLabel = input<boolean>(false);

  readonly pct  = computed(() => Math.round(this.value() * 100));

  readonly tier = computed((): 'high' | 'medium' | 'low' => {
    const v = this.value();
    if (v >= 0.85) return 'high';
    if (v >= 0.65) return 'medium';
    return 'low';
  });

  readonly tierIcon = computed((): string => {
    switch (this.tier()) {
      case 'high':   return 'verified';
      case 'medium': return 'warning_amber';
      default:       return 'help_outline';
    }
  });

  readonly tierLabel = computed((): string => {
    switch (this.tier()) {
      case 'high':   return '고신뢰';
      case 'medium': return '중신뢰';
      default:       return '저신뢰';
    }
  });
}
