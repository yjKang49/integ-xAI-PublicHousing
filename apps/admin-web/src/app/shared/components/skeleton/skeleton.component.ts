// apps/admin-web/src/app/shared/components/skeleton/skeleton.component.ts
// 로딩 중 스켈레톤 UI — 섹션 스피너 단독 사용 금지, 이 컴포넌트로 대체
import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SkeletonType = 'table' | 'card' | 'kpi' | 'detail' | 'list';

@Component({
  selector: 'ax-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    @switch (type()) {
      <!-- KPI 카드 스켈레톤 그리드 -->
      @case ('kpi') {
        <div class="ax-sk-kpi-grid">
          @for (_ of rows(); track $index) {
            <div class="ax-sk-kpi-card">
              <div class="ax-sk-icon"></div>
              <div class="ax-sk-kpi-body">
                <div class="ax-sk-line ax-sk-line--lg"></div>
                <div class="ax-sk-line ax-sk-line--sm"></div>
              </div>
            </div>
          }
        </div>
      }

      <!-- 테이블 스켈레톤 -->
      @case ('table') {
        <div class="ax-sk-table">
          <div class="ax-sk-table-header">
            @for (_ of cols(); track $index) {
              <div class="ax-sk-line ax-sk-line--sm"></div>
            }
          </div>
          @for (_ of rows(); track $index) {
            <div class="ax-sk-table-row">
              @for (_ of cols(); track $index) {
                <div class="ax-sk-line"></div>
              }
            </div>
          }
        </div>
      }

      <!-- 카드 스켈레톤 -->
      @case ('card') {
        <div class="ax-sk-card">
          <div class="ax-sk-card-header">
            <div class="ax-sk-icon"></div>
            <div class="ax-sk-card-title">
              <div class="ax-sk-line ax-sk-line--lg"></div>
              <div class="ax-sk-line ax-sk-line--sm"></div>
            </div>
          </div>
          <div class="ax-sk-card-body">
            @for (_ of rows(); track $index) {
              <div class="ax-sk-line"></div>
            }
          </div>
        </div>
      }

      <!-- 리스트 스켈레톤 -->
      @case ('list') {
        <div class="ax-sk-list">
          @for (_ of rows(); track $index) {
            <div class="ax-sk-list-row">
              <div class="ax-sk-icon ax-sk-icon--sm"></div>
              <div class="ax-sk-list-body">
                <div class="ax-sk-line ax-sk-line--lg"></div>
                <div class="ax-sk-line ax-sk-line--sm"></div>
              </div>
              <div class="ax-sk-line ax-sk-line--xs"></div>
            </div>
          }
        </div>
      }

      <!-- 디테일 패널 스켈레톤 -->
      @case ('detail') {
        <div class="ax-sk-detail">
          <div class="ax-sk-detail-title">
            <div class="ax-sk-line ax-sk-line--xl"></div>
          </div>
          @for (_ of rows(); track $index) {
            <div class="ax-sk-detail-field">
              <div class="ax-sk-line ax-sk-line--xs ax-sk-label"></div>
              <div class="ax-sk-line ax-sk-line--lg"></div>
            </div>
          }
        </div>
      }
    }
  `,
  styles: [`
    :host { display: block; }

    /* ── 공통 애니메이션 ── */
    @keyframes ax-shimmer {
      0%   { background-position: -200% 0; }
      100% { background-position:  200% 0; }
    }

    %shimmer {
      background: linear-gradient(
        90deg,
        var(--ax-color-border-subtle)   25%,
        var(--ax-color-border-default)  50%,
        var(--ax-color-border-subtle)   75%
      );
      background-size: 200% 100%;
      animation: ax-shimmer 1.5s ease-in-out infinite;
      border-radius: var(--ax-radius-sm);
    }

    /* ── 공통 라인 ── */
    .ax-sk-line {
      @extend %shimmer;
      height: 14px;
      border-radius: var(--ax-radius-sm);
      width: 100%;

      &--xs  { width: 60px; height: 12px; }
      &--sm  { width: 120px; height: 12px; }
      &--lg  { height: 16px; }
      &--xl  { height: 20px; }
    }

    /* ── 아이콘 자리 ── */
    .ax-sk-icon {
      @extend %shimmer;
      width: 40px;
      height: 40px;
      border-radius: var(--ax-radius-lg);
      flex-shrink: 0;

      &--sm {
        width: 32px;
        height: 32px;
        border-radius: var(--ax-radius-md);
      }
    }

    /* ── KPI 스켈레톤 ── */
    .ax-sk-kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--ax-spacing-12);
    }

    .ax-sk-kpi-card {
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border-default);
      border-radius: var(--ax-radius-lg);
      padding: var(--ax-card-padding);
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-12);
    }

    .ax-sk-kpi-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--ax-spacing-6);
    }

    /* ── 테이블 스켈레톤 ── */
    .ax-sk-table {
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border-default);
      border-radius: var(--ax-radius-lg);
      overflow: hidden;
    }

    .ax-sk-table-header {
      display: flex;
      gap: var(--ax-spacing-24);
      padding: var(--ax-spacing-12) var(--ax-table-cell-h);
      background: var(--ax-color-bg-surface-alt);
      border-bottom: 1px solid var(--ax-color-border-strong);
    }

    .ax-sk-table-row {
      display: flex;
      gap: var(--ax-spacing-24);
      padding: var(--ax-table-cell-v) var(--ax-table-cell-h);
      border-bottom: 1px solid var(--ax-color-border-subtle);

      &:last-child { border-bottom: none; }
    }

    /* ── 카드 스켈레톤 ── */
    .ax-sk-card {
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border-default);
      border-radius: var(--ax-radius-lg);
      padding: var(--ax-card-padding);
    }

    .ax-sk-card-header {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-12);
      padding-bottom: var(--ax-spacing-12);
      border-bottom: 1px solid var(--ax-color-border-subtle);
      margin-bottom: var(--ax-spacing-12);
    }

    .ax-sk-card-title {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--ax-spacing-6);
    }

    .ax-sk-card-body {
      display: flex;
      flex-direction: column;
      gap: var(--ax-spacing-8);
    }

    /* ── 리스트 스켈레톤 ── */
    .ax-sk-list {
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border-default);
      border-radius: var(--ax-radius-lg);
      overflow: hidden;
    }

    .ax-sk-list-row {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-12);
      padding: var(--ax-table-cell-v) var(--ax-card-padding);
      border-bottom: 1px solid var(--ax-color-border-subtle);

      &:last-child { border-bottom: none; }
    }

    .ax-sk-list-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--ax-spacing-4);
    }

    /* ── 디테일 스켈레톤 ── */
    .ax-sk-detail {
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border-default);
      border-radius: var(--ax-radius-lg);
      padding: var(--ax-card-padding-lg);
    }

    .ax-sk-detail-title {
      padding-bottom: var(--ax-spacing-16);
      border-bottom: 1px solid var(--ax-color-border-subtle);
      margin-bottom: var(--ax-spacing-16);
    }

    .ax-sk-detail-field {
      display: flex;
      flex-direction: column;
      gap: var(--ax-spacing-4);
      margin-bottom: var(--ax-spacing-12);
    }

    .ax-sk-label {
      width: 80px !important;
    }
  `],
})
export class SkeletonComponent {
  readonly type = input<SkeletonType>('table');
  readonly rows = input<number[]>([1, 2, 3, 4, 5]);
  readonly cols = input<number[]>([1, 2, 3, 4, 5]);
}
