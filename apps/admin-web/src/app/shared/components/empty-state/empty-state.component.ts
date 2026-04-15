// apps/admin-web/src/app/shared/components/empty-state/empty-state.component.ts
// 모든 빈 상태/에러 상태/로딩 상태에 일관된 패턴 제공
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export type EmptyStateType = 'empty' | 'error' | 'loading' | 'zero' | 'search-no-result';

@Component({
  selector: 'ax-empty-state',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="ax-es" [class]="'ax-es--' + type()" role="status">

      <!-- 아이콘 영역 -->
      <div class="ax-es__icon-wrap" aria-hidden="true">
        @if (type() === 'loading') {
          <mat-spinner diameter="40" />
        } @else {
          <mat-icon class="ax-es__icon">{{ resolvedIcon() }}</mat-icon>
        }
      </div>

      <!-- 텍스트 영역 -->
      <div class="ax-es__text">
        <h3 class="ax-es__title">{{ resolvedTitle() }}</h3>
        @if (resolvedDescription()) {
          <p class="ax-es__desc">{{ resolvedDescription() }}</p>
        }
      </div>

      <!-- 액션 영역 -->
      @if (type() !== 'loading') {
        <div class="ax-es__actions">
          @if (primaryLabel()) {
            <button
              mat-flat-button
              color="primary"
              class="ax-es__btn-primary"
              (click)="primaryAction.emit()"
              [attr.aria-label]="primaryLabel()!"
            >
              @if (primaryIcon()) {
                <mat-icon>{{ primaryIcon() }}</mat-icon>
              }
              {{ primaryLabel() }}
            </button>
          }

          @if (secondaryLabel()) {
            <button
              mat-stroked-button
              class="ax-es__btn-secondary"
              (click)="secondaryAction.emit()"
              [attr.aria-label]="secondaryLabel()!"
            >
              {{ secondaryLabel() }}
            </button>
          }
        </div>

        @if (metaText()) {
          <p class="ax-es__meta">{{ metaText() }}</p>
        }
      } @else {
        <p class="ax-es__loading-text">{{ resolvedDescription() }}</p>
      }

    </div>
  `,
  styles: [`
    :host { display: block; }

    .ax-es {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: var(--ax-spacing-48) var(--ax-spacing-24);
      gap: var(--ax-spacing-16);
    }

    .ax-es__icon-wrap {
      width: 64px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--ax-radius-xl);
      background: var(--ax-color-bg-surface-alt);
      flex-shrink: 0;
    }

    .ax-es--error .ax-es__icon-wrap   { background: var(--ax-color-danger-subtle); }
    .ax-es--loading .ax-es__icon-wrap { background: transparent; }
    .ax-es--zero .ax-es__icon-wrap    { background: var(--ax-color-success-subtle); }
    .ax-es--search-no-result .ax-es__icon-wrap { background: var(--ax-color-neutral-subtle); }

    .ax-es__icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: var(--ax-color-text-tertiary);
    }

    .ax-es--error .ax-es__icon        { color: var(--ax-color-danger); }
    .ax-es--zero .ax-es__icon         { color: var(--ax-color-success); }
    .ax-es--search-no-result .ax-es__icon { color: var(--ax-color-neutral); }

    .ax-es__text { max-width: 400px; }

    .ax-es__title {
      font-size: var(--ax-font-size-lg);
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
      margin: 0 0 var(--ax-spacing-6);
    }

    .ax-es--loading .ax-es__title { color: var(--ax-color-text-secondary); }

    .ax-es__desc {
      font-size: var(--ax-font-size-sm);
      color: var(--ax-color-text-tertiary);
      line-height: var(--ax-line-height-relaxed);
      margin: 0;
    }

    .ax-es__actions {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-8);
      flex-wrap: wrap;
      justify-content: center;
    }

    .ax-es__btn-primary {
      border-radius: var(--ax-radius-md) !important;
    }

    .ax-es__btn-secondary {
      border-radius: var(--ax-radius-md) !important;
    }

    .ax-es__meta {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-disabled);
      margin: 0;
    }

    .ax-es__loading-text {
      font-size: var(--ax-font-size-sm);
      color: var(--ax-color-text-tertiary);
      margin: 0;
      animation: ax-pulse 1.5s ease-in-out infinite;
    }

    @keyframes ax-pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.55; }
    }
  `],
})
export class EmptyStateComponent {
  readonly type            = input<EmptyStateType>('empty');
  readonly icon            = input<string | null>(null);
  readonly title           = input<string | null>(null);
  readonly description     = input<string | null>(null);
  readonly primaryLabel    = input<string | null>(null);
  readonly primaryIcon     = input<string | null>(null);
  readonly secondaryLabel  = input<string | null>(null);
  readonly metaText        = input<string | null>(null);

  readonly primaryAction   = output<void>();
  readonly secondaryAction = output<void>();

  // ── 기본값 결정 ──────────────────────────────────────────────────────────────
  resolvedIcon(): string {
    if (this.icon()) return this.icon()!;
    const defaults: Record<EmptyStateType, string> = {
      'empty':           'inbox',
      'error':           'error_outline',
      'loading':         'hourglass_empty',
      'zero':            'check_circle_outline',
      'search-no-result': 'search_off',
    };
    return defaults[this.type()];
  }

  resolvedTitle(): string {
    if (this.title()) return this.title()!;
    const defaults: Record<EmptyStateType, string> = {
      'empty':           '데이터가 없습니다',
      'error':           '데이터를 불러오지 못했습니다',
      'loading':         '불러오는 중입니다',
      'zero':            '현재 해당 항목이 없습니다',
      'search-no-result': '검색 결과가 없습니다',
    };
    return defaults[this.type()];
  }

  resolvedDescription(): string | null {
    if (this.description()) return this.description()!;
    const defaults: Record<EmptyStateType, string | null> = {
      'empty':           '조건에 맞는 항목이 없습니다. 필터를 변경하거나 새 항목을 추가하세요.',
      'error':           '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      'loading':         '데이터를 처리하고 있습니다. 잠시만 기다려 주세요.',
      'zero':            '정상 범위 내에 있으며 현재 처리가 필요한 항목이 없습니다.',
      'search-no-result': '검색어 또는 필터 조건을 변경해 보세요.',
    };
    return defaults[this.type()];
  }
}
