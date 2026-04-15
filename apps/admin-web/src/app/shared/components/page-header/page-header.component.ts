// apps/admin-web/src/app/shared/components/page-header/page-header.component.ts
// 모든 페이지 상단에 공통 적용하는 페이지 헤더 컴포넌트
import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'ax-page-header',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="ax-ph">
      <!-- 좌측: 제목 블록 -->
      <div class="ax-ph__left">
        @if (icon()) {
          <div class="ax-ph__icon-wrap">
            <mat-icon class="ax-ph__icon" aria-hidden="true">{{ icon() }}</mat-icon>
          </div>
        }
        <div class="ax-ph__text">
          @if (breadcrumb()) {
            <div class="ax-ph__breadcrumb" aria-label="상위 경로">{{ breadcrumb() }}</div>
          }
          <h1 class="ax-ph__title">{{ title() }}</h1>
          @if (description()) {
            <p class="ax-ph__desc">{{ description() }}</p>
          }
        </div>
      </div>

      <!-- 우측: 메타 + 액션 -->
      <div class="ax-ph__right">
        @if (meta()) {
          <span class="ax-ph__meta">{{ meta() }}</span>
        }
        <!-- 슬롯: 버튼/액션 -->
        <ng-content select="[ax-page-actions]" />
      </div>
    </div>
  `,
  styles: [`
    .ax-ph {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--ax-spacing-16);
      padding-bottom: var(--ax-spacing-16);
      border-bottom: 1px solid var(--ax-color-border-default);
      margin-bottom: var(--ax-spacing-20);
    }

    .ax-ph__left {
      display: flex;
      align-items: flex-start;
      gap: var(--ax-spacing-12);
      min-width: 0;
    }

    .ax-ph__icon-wrap {
      width: 40px;
      height: 40px;
      background: var(--ax-color-brand-primary-subtle);
      border-radius: var(--ax-radius-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .ax-ph__icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--ax-color-brand-primary);
    }

    .ax-ph__text {
      min-width: 0;
    }

    .ax-ph__breadcrumb {
      font-size: var(--ax-font-size-xs);
      font-weight: var(--ax-font-weight-medium);
      color: var(--ax-color-text-tertiary);
      text-transform: uppercase;
      letter-spacing: var(--ax-letter-spacing-wider);
      margin-bottom: var(--ax-spacing-2);
    }

    .ax-ph__title {
      font-size: var(--ax-font-size-2xl);
      font-weight: var(--ax-font-weight-bold);
      color: var(--ax-color-text-primary);
      letter-spacing: -0.01em;
      line-height: var(--ax-line-height-tight);
      margin: 0;
    }

    .ax-ph__desc {
      font-size: var(--ax-font-size-sm);
      color: var(--ax-color-text-tertiary);
      margin: var(--ax-spacing-4) 0 0;
      line-height: var(--ax-line-height-normal);
    }

    .ax-ph__right {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-8);
      flex-shrink: 0;
      padding-top: 2px;
    }

    .ax-ph__meta {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-tertiary);
      white-space: nowrap;
    }
  `],
})
export class PageHeaderComponent {
  readonly title       = input.required<string>();
  readonly description = input<string | null>(null);
  readonly breadcrumb  = input<string | null>(null);
  readonly icon        = input<string | null>(null);
  readonly meta        = input<string | null>(null);
}
