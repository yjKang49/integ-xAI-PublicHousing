// apps/admin-web/src/app/features/ai-performance/ai-performance-page.component.ts
// AI 운영 성과 대시보드 — analytics 중심 레이아웃으로 재구성 (API/로직/데이터 완전 유지)

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

// ── 타입 (기존 유지) ──────────────────────────────────────────────────────────
interface KpiRow {
  label: string;
  icon: string;
  before: string;
  after: string;
  unit: string;
  improvePct: number;
  direction: 'lower' | 'higher';
  detail?: string;
}
interface RpaRow {
  label: string;
  icon: string;
  rate: number;
  color: string;
  timeSaved?: string;
}
interface ModelCard {
  name: string;
  domain: string;
  metric: string;
  value: string;
  trend: 'up' | 'stable';
  color: string;
}

@Component({
  selector: 'ax-ai-performance-page',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatIconModule, MatButtonModule, MatTabsModule, MatTooltipModule,
    PageHeaderComponent, StatusBadgeComponent,
  ],
  template: `
    <div class="ax-page">

      <!-- ── 페이지 헤더 ── -->
      <ax-page-header
        title="AI 운영 성과 대시보드"
        description="AI·RPA 도입 전/후 핵심 지표 비교 — AX-SPRINT 2026 실증 결과"
        icon="auto_awesome"
        breadcrumb="AI 운영"
      >
        <div ax-page-actions>
          <a mat-stroked-button routerLink="/kpi" aria-label="상세 KPI">
            <mat-icon>bar_chart</mat-icon> 상세 KPI
          </a>
          <a mat-stroked-button routerLink="/rpa" aria-label="RPA 관리">
            <mat-icon>smart_toy</mat-icon> RPA 관리
          </a>
        </div>
      </ax-page-header>

      <!-- ════════════════════════════════════════════════════════════ -->
      <!-- ZONE A: Executive KPI Strip (replaces 5-card roi-grid)      -->
      <!-- ════════════════════════════════════════════════════════════ -->
      <div class="ap-kpi-strip" role="list" aria-label="AI ROI 요약 지표">
        @for (r of roiItems; track r.label) {
          <div class="ap-kpi-item" role="listitem"
               [attr.aria-label]="r.label + ': ' + r.value + r.unit">
            <mat-icon class="ap-kpi-item__icon" [style.color]="r.iconColor"
                      aria-hidden="true">{{ r.icon }}</mat-icon>
            <div class="ap-kpi-item__body">
              <span class="ap-kpi-item__val">
                {{ r.value }}<em>{{ r.unit }}</em>
              </span>
              <span class="ap-kpi-item__lbl">{{ r.label }}</span>
              <span class="ap-kpi-item__sub">{{ r.sub }}</span>
            </div>
          </div>
        }
      </div>

      <!-- ── 탭 ── -->
      <mat-tab-group animationDuration="200ms">

        <!-- ════════════════════════════════════════════════════════ -->
        <!-- TAB 1: Before/After — dense comparison table            -->
        <!-- ════════════════════════════════════════════════════════ -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon aria-hidden="true">compare_arrows</mat-icon>
            AI 도입 전/후 비교
          </ng-template>

          <div class="ap-tab-content">
            <div class="ap-info-bar">
              <mat-icon aria-hidden="true">info</mat-icon>
              SH 서울주택도시공사 5개 단지 2,000세대 기준 실증 데이터 (2025~2026)
            </div>

            <!-- Comparison table (replaces 3-col 9-card grid) -->
            <div class="ap-panel" role="region" aria-label="AI 도입 전후 비교">

              <!-- Table header -->
              <div class="ap-ba-thead" aria-hidden="true">
                <span class="ap-ba-thead__label">지표 / 근거</span>
                <span class="ap-ba-thead__before">도입 전</span>
                <span class="ap-ba-thead__after">도입 후</span>
                <span class="ap-ba-thead__improve">개선율 &amp; 비교</span>
              </div>

              <!-- Data rows -->
              @for (row of kpiRows; track row.label) {
                <div class="ap-ba-row"
                     [class.ap-ba-row--top]="row.improvePct >= 70"
                     role="listitem"
                     [attr.aria-label]="row.label + ' 도입전 ' + row.before + row.unit + ' 도입후 ' + row.after + row.unit + ' 개선 ' + row.improvePct + '%'">

                  <!-- Label + footnote -->
                  <div class="ap-ba-row__label">
                    <mat-icon aria-hidden="true">{{ row.icon }}</mat-icon>
                    <div class="ap-ba-row__label-text">
                      <span>{{ row.label }}</span>
                      @if (row.detail) {
                        <small>{{ row.detail }}</small>
                      }
                    </div>
                  </div>

                  <!-- Before value -->
                  <span class="ap-ba-row__before" aria-label="도입 전">
                    {{ row.before }}<em>{{ row.unit }}</em>
                  </span>

                  <!-- After value -->
                  <span class="ap-ba-row__after" aria-label="도입 후">
                    {{ row.after }}<em>{{ row.unit }}</em>
                  </span>

                  <!-- Improvement badge + bar -->
                  <div class="ap-ba-row__improve">
                    <ax-status-badge
                      [variant]="row.improvePct >= 70 ? 'success' : row.improvePct >= 30 ? 'info' : 'neutral'"
                      [label]="(row.direction === 'lower' ? '▼' : '▲') + ' ' + row.improvePct + '%'"
                      size="sm" />
                    <div class="ap-ba-row__bar" role="progressbar"
                         [attr.aria-valuenow]="row.improvePct" aria-valuemax="100">
                      <div class="ap-ba-row__bar-fill"
                           [class.ap-ba-row__bar-fill--success]="row.improvePct >= 70"
                           [class.ap-ba-row__bar-fill--info]="row.improvePct >= 30 && row.improvePct < 70"
                           [style.width.%]="row.improvePct"></div>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        </mat-tab>

        <!-- ════════════════════════════════════════════════════════ -->
        <!-- TAB 2: RPA — compact header + slim bar chart            -->
        <!-- ════════════════════════════════════════════════════════ -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon aria-hidden="true">smart_toy</mat-icon>
            RPA 자동화율
          </ng-template>

          <div class="ap-tab-content">

            <!-- Compact RPA summary strip (replaces large centered box) -->
            <div class="ap-rpa-strip" aria-label="RPA 종합 현황">
              <!-- 종합 자동화율 -->
              <div class="ap-rpa-strip__total">
                <span class="ap-rpa-strip__total-val">81.5<em>%</em></span>
                <span class="ap-rpa-strip__total-lbl">종합 자동화율</span>
              </div>

              <!-- 절감 세부 내역 3종 -->
              @for (s of savingRows; track s.label) {
                <div class="ap-rpa-strip__saving">
                  <mat-icon [style.color]="s.color" aria-hidden="true">{{ s.icon }}</mat-icon>
                  <div class="ap-rpa-strip__saving-body">
                    <span class="ap-rpa-strip__saving-lbl">{{ s.label }}</span>
                    <strong class="ap-rpa-strip__saving-val">{{ s.value }}</strong>
                  </div>
                </div>
              }
            </div>

            <!-- RPA bar chart (slim 10px bars, replaces 24px bars) -->
            <div class="ap-panel ap-panel--flush" role="list" aria-label="업무별 자동화율">
              @for (row of rpaRows; track row.label) {
                <div class="ap-rpa-row" role="listitem">
                  <div class="ap-rpa-row__meta">
                    <mat-icon [style.color]="row.color" aria-hidden="true">{{ row.icon }}</mat-icon>
                    <span class="ap-rpa-row__label">{{ row.label }}</span>
                    @if (row.timeSaved) {
                      <span class="ap-rpa-row__tag">{{ row.timeSaved }}</span>
                    }
                    <span class="ap-rpa-row__pct">{{ row.rate }}%</span>
                  </div>
                  <div class="ap-rpa-row__track" role="progressbar"
                       [attr.aria-valuenow]="row.rate" aria-valuemax="100"
                       [attr.aria-label]="row.label + ' ' + row.rate + '%'">
                    <div class="ap-rpa-row__fill"
                         [style.width.%]="row.rate"
                         [style.background]="row.color"></div>
                  </div>
                </div>
              }
            </div>
          </div>
        </mat-tab>

        <!-- ════════════════════════════════════════════════════════ -->
        <!-- TAB 3: AI 모델 성능 — compact table (replaces 4-col cards) -->
        <!-- ════════════════════════════════════════════════════════ -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon aria-hidden="true">psychology</mat-icon>
            AI 모델 성능
          </ng-template>

          <div class="ap-tab-content">
            <div class="ap-info-bar">
              <mat-icon aria-hidden="true">science</mat-icon>
              25종 AI 모델 통합 운영 — Y-MaskNet, XGBoost, KoBERT, LSTM, AutoEncoder 등
            </div>

            <!-- Model performance table (replaces 4-col card grid) -->
            <div class="ap-panel ap-panel--flush" role="region" aria-label="AI 모델 성능 목록">
              <table class="ap-model-table">
                <thead>
                  <tr>
                    <th>모델명</th>
                    <th>도메인</th>
                    <th>평가 지표</th>
                    <th class="ap-model-table__r">성능값</th>
                    <th class="ap-model-table__c">추이</th>
                  </tr>
                </thead>
                <tbody>
                  @for (m of modelCards; track m.name) {
                    <tr [attr.aria-label]="m.name + ' ' + m.value">
                      <td class="ap-model-table__name">{{ m.name }}</td>
                      <td>
                        <span class="ap-domain-chip" [style.color]="m.color">{{ m.domain }}</span>
                      </td>
                      <td class="ap-model-table__metric">{{ m.metric }}</td>
                      <td class="ap-model-table__r ap-model-table__val" [style.color]="m.color">
                        {{ m.value }}
                      </td>
                      <td class="ap-model-table__c">
                        <span class="ap-trend-chip ap-trend-chip--{{ m.trend }}">
                          <mat-icon aria-hidden="true">
                            {{ m.trend === 'up' ? 'trending_up' : 'trending_flat' }}
                          </mat-icon>
                          {{ m.trend === 'up' ? '향상' : '안정' }}
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </mat-tab>

        <!-- ════════════════════════════════════════════════════════ -->
        <!-- TAB 4: Vision 2030 — compact progress rows              -->
        <!-- ════════════════════════════════════════════════════════ -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon aria-hidden="true">rocket_launch</mat-icon>
            Vision 2030 목표
          </ng-template>

          <div class="ap-tab-content">

            <!-- Vision progress rows (replaces 3-col large cards) -->
            <div class="ap-panel ap-panel--flush" role="list" aria-label="Vision 2030 목표 항목">
              @for (v of visionItems; track v.title) {
                <div class="ap-vision-row" role="listitem"
                     [attr.aria-label]="v.title + ' 현재 ' + v.current + ' 목표 ' + v.target">
                  <mat-icon [style.color]="v.color" aria-hidden="true">{{ v.icon }}</mat-icon>
                  <span class="ap-vision-row__title">{{ v.title }}</span>
                  <div class="ap-vision-row__values">
                    <span class="ap-vision-row__current" [style.color]="v.color">{{ v.current }}</span>
                    <span class="ap-vision-row__target">→ 목표 {{ v.target }}</span>
                  </div>
                  <div class="ap-vision-row__bar-wrap">
                    <div class="ap-vision-row__bar" role="progressbar"
                         [attr.aria-valuenow]="v.progress" aria-valuemax="100">
                      <div class="ap-vision-row__bar-fill"
                           [style.width.%]="v.progress"
                           [style.background]="v.color"></div>
                    </div>
                    <span class="ap-vision-row__pct">{{ v.progress }}%</span>
                  </div>
                  <span class="ap-vision-row__desc">{{ v.desc }}</span>
                </div>
              }
            </div>

            <!-- 기대효과 compact panel (replaces large card with icon boxes) -->
            <div class="ap-effect-panel">
              <div class="ap-effect-panel__head">
                <mat-icon aria-hidden="true">emoji_events</mat-icon>
                <div>
                  <h3 class="ap-effect-panel__title">AX 플랫폼 도입 기대효과</h3>
                  <p class="ap-effect-panel__sub">SH 공사·경북개발공사 7개 단지 2,847세대 적용 기준</p>
                </div>
              </div>
              <div class="ap-effect-list" role="list" aria-label="기대 효과">
                @for (e of effectItems; track e.headline) {
                  <div class="ap-effect-row" role="listitem">
                    <mat-icon [style.color]="e.color" aria-hidden="true">{{ e.icon }}</mat-icon>
                    <strong class="ap-effect-row__headline">{{ e.headline }}</strong>
                    <span class="ap-effect-row__detail">{{ e.detail }}</span>
                  </div>
                }
              </div>
            </div>

          </div>
        </mat-tab>

      </mat-tab-group>
    </div>
  `,
  styles: [`
    :host { display: block; }

    /* ════════════════════════════════════════════════════════════════ */
    /* ZONE A: Executive KPI Strip                                      */
    /* ════════════════════════════════════════════════════════════════ */
    .ap-kpi-strip {
      display: flex;
      align-items: stretch;
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border-default);
      border-radius: var(--ax-radius-lg);
      box-shadow: var(--ax-shadow-xs);
      min-height: 88px;
      overflow: hidden;
    }

    .ap-kpi-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 20px;
      flex: 1;
      border-right: 1px solid var(--ax-color-border-default);

      &:last-child { border-right: none; }
    }

    .ap-kpi-item__icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    .ap-kpi-item__body {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .ap-kpi-item__val {
      font-size: var(--ax-font-size-kpi);
      font-weight: var(--ax-font-weight-bold);
      color: var(--ax-color-text-primary);
      line-height: 1.1;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;

      em {
        font-size: var(--ax-font-size-sm);
        font-style: normal;
        font-weight: var(--ax-font-weight-regular);
        color: var(--ax-color-text-tertiary);
        margin-left: 2px;
      }
    }

    .ap-kpi-item__lbl {
      font-size: var(--ax-font-size-xs);
      font-weight: var(--ax-font-weight-medium);
      color: var(--ax-color-text-secondary);
      white-space: nowrap;
    }

    .ap-kpi-item__sub {
      font-size: 10px;
      color: var(--ax-color-text-tertiary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ════════════════════════════════════════════════════════════════ */
    /* 탭 공통                                                           */
    /* ════════════════════════════════════════════════════════════════ */
    .ap-tab-content {
      padding: var(--ax-spacing-16) 0;
      display: flex;
      flex-direction: column;
      gap: var(--ax-spacing-16);
    }

    .ap-info-bar {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-6);
      font-size: var(--ax-font-size-sm);
      color: var(--ax-color-text-secondary);
      background: var(--ax-color-brand-primary-subtle);
      border: 1px solid var(--ax-color-brand-primary-muted);
      border-radius: var(--ax-radius-md);
      padding: var(--ax-spacing-8) var(--ax-spacing-12);

      mat-icon { font-size: 15px; width: 15px; height: 15px; color: var(--ax-color-info); flex-shrink: 0; }
    }

    /* ── 공통 패널 래퍼 ── */
    .ap-panel {
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border-default);
      border-radius: var(--ax-radius-lg);
      box-shadow: var(--ax-shadow-xs);
      overflow: hidden;

      &--flush { padding: 0; }
    }

    /* ════════════════════════════════════════════════════════════════ */
    /* TAB 1: Before/After Comparison Table                             */
    /* ════════════════════════════════════════════════════════════════ */

    /* Table header row */
    .ap-ba-thead {
      display: grid;
      grid-template-columns: 1fr 112px 112px 200px;
      padding: 7px 14px;
      gap: 12px;
      background: var(--ax-color-bg-surface-alt);
      border-bottom: 1px solid var(--ax-color-border-default);
    }

    .ap-ba-thead__label,
    .ap-ba-thead__before,
    .ap-ba-thead__after,
    .ap-ba-thead__improve {
      font-size: 10px;
      font-weight: var(--ax-font-weight-semibold);
      text-transform: uppercase;
      letter-spacing: var(--ax-letter-spacing-wider);
      color: var(--ax-color-text-tertiary);
      white-space: nowrap;
    }

    .ap-ba-thead__before,
    .ap-ba-thead__after { text-align: center; }

    /* Data row */
    .ap-ba-row {
      display: grid;
      grid-template-columns: 1fr 112px 112px 200px;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border-bottom: 1px solid var(--ax-color-border-subtle);
      transition: background var(--ax-transition-fast);

      &:last-child { border-bottom: none; }
      &:hover { background: var(--ax-color-bg-surface-alt); }

      &--top {
        border-left: 2px solid var(--ax-color-brand-primary);
        padding-left: 12px;
      }
    }

    .ap-ba-row__label {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      min-width: 0;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: var(--ax-color-brand-primary);
        flex-shrink: 0;
        margin-top: 2px;
      }
    }

    .ap-ba-row__label-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;

      span {
        font-size: var(--ax-font-size-sm);
        font-weight: var(--ax-font-weight-semibold);
        color: var(--ax-color-text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      small {
        font-size: 10px;
        color: var(--ax-color-text-tertiary);
        line-height: 1.3;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
    }

    .ap-ba-row__before {
      font-size: var(--ax-font-size-md);
      font-weight: var(--ax-font-weight-medium);
      color: var(--ax-color-danger-text);
      text-align: center;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;

      em { font-size: 10px; font-style: normal; color: var(--ax-color-text-tertiary); margin-left: 1px; }
    }

    .ap-ba-row__after {
      font-size: var(--ax-font-size-md);
      font-weight: var(--ax-font-weight-bold);
      color: var(--ax-color-success-text);
      text-align: center;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;

      em { font-size: 10px; font-style: normal; color: var(--ax-color-text-tertiary); margin-left: 1px; }
    }

    .ap-ba-row__improve {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .ap-ba-row__bar {
      flex: 1;
      height: 6px;
      background: var(--ax-color-border-default);
      border-radius: var(--ax-radius-full);
      overflow: hidden;
    }

    .ap-ba-row__bar-fill {
      height: 100%;
      border-radius: var(--ax-radius-full);
      background: var(--ax-color-neutral);
      transition: width 0.6s ease;

      &--success { background: var(--ax-color-success); }
      &--info    { background: var(--ax-color-brand-primary); }
    }

    /* ════════════════════════════════════════════════════════════════ */
    /* TAB 2: RPA                                                       */
    /* ════════════════════════════════════════════════════════════════ */

    /* RPA summary strip (replaces large centered box) */
    .ap-rpa-strip {
      display: flex;
      align-items: stretch;
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border-default);
      border-radius: var(--ax-radius-lg);
      box-shadow: var(--ax-shadow-xs);
      min-height: 72px;
      overflow: hidden;
    }

    .ap-rpa-strip__total {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 12px 24px;
      background: var(--ax-color-brand-primary-subtle);
      border-right: 1px solid var(--ax-color-brand-primary-muted);
      flex-shrink: 0;
      gap: 2px;
    }

    .ap-rpa-strip__total-val {
      font-size: 28px;
      font-weight: var(--ax-font-weight-bold);
      color: var(--ax-color-brand-primary);
      line-height: 1;
      font-variant-numeric: tabular-nums;

      em { font-size: var(--ax-font-size-xl); font-style: normal; }
    }

    .ap-rpa-strip__total-lbl {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-secondary);
      white-space: nowrap;
    }

    .ap-rpa-strip__saving {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 20px;
      flex: 1;
      border-right: 1px solid var(--ax-color-border-subtle);

      &:last-child { border-right: none; }

      mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }
    }

    .ap-rpa-strip__saving-body {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .ap-rpa-strip__saving-lbl {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-tertiary);
      white-space: nowrap;
    }

    .ap-rpa-strip__saving-val {
      font-size: var(--ax-font-size-md);
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }

    /* RPA bar rows (10px slim bars) */
    .ap-rpa-row {
      padding: 10px 16px;
      border-bottom: 1px solid var(--ax-color-border-subtle);
      display: flex;
      flex-direction: column;
      gap: 6px;

      &:last-child { border-bottom: none; }
    }

    .ap-rpa-row__meta {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-8);

      mat-icon { font-size: 16px; width: 16px; height: 16px; flex-shrink: 0; }
    }

    .ap-rpa-row__label {
      flex: 1;
      font-size: var(--ax-font-size-sm);
      font-weight: var(--ax-font-weight-medium);
      color: var(--ax-color-text-secondary);
    }

    .ap-rpa-row__tag {
      font-size: var(--ax-font-size-xs);
      background: var(--ax-color-success-subtle);
      color: var(--ax-color-success-text);
      padding: 2px 7px;
      border-radius: var(--ax-radius-full);
      font-weight: var(--ax-font-weight-medium);
      white-space: nowrap;
    }

    .ap-rpa-row__pct {
      font-size: var(--ax-font-size-sm);
      font-weight: var(--ax-font-weight-bold);
      color: var(--ax-color-text-primary);
      min-width: 36px;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .ap-rpa-row__track {
      height: 10px;
      background: var(--ax-color-bg-surface-alt);
      border: 1px solid var(--ax-color-border-subtle);
      border-radius: var(--ax-radius-sm);
      overflow: hidden;
    }

    .ap-rpa-row__fill {
      height: 100%;
      border-radius: var(--ax-radius-sm);
      opacity: 0.8;
      transition: width 0.8s ease;
    }

    /* ════════════════════════════════════════════════════════════════ */
    /* TAB 3: AI 모델 성능 테이블                                         */
    /* ════════════════════════════════════════════════════════════════ */
    .ap-model-table {
      width: 100%;
      border-collapse: collapse;

      thead tr { background: var(--ax-color-bg-surface-alt); }

      th {
        padding: 8px 14px;
        font-size: 10px;
        font-weight: var(--ax-font-weight-semibold);
        text-transform: uppercase;
        letter-spacing: var(--ax-letter-spacing-wider);
        color: var(--ax-color-text-tertiary);
        text-align: left;
        border-bottom: 1px solid var(--ax-color-border-default);
        white-space: nowrap;
      }

      td {
        padding: 9px 14px;
        font-size: var(--ax-font-size-sm);
        color: var(--ax-color-text-secondary);
        border-bottom: 1px solid var(--ax-color-border-subtle);
        vertical-align: middle;
      }

      tr:last-child td { border-bottom: none; }
      tr:hover td { background: var(--ax-color-bg-surface-alt); }
    }

    .ap-model-table__r { text-align: right !important; }
    .ap-model-table__c { text-align: center !important; }

    .ap-model-table__name {
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary) !important;
      white-space: nowrap;
    }

    .ap-model-table__metric {
      color: var(--ax-color-text-tertiary) !important;
      font-size: var(--ax-font-size-xs) !important;
    }

    .ap-model-table__val {
      font-weight: var(--ax-font-weight-bold) !important;
      font-variant-numeric: tabular-nums;
      font-size: var(--ax-font-size-md) !important;
    }

    .ap-domain-chip {
      font-size: 10px;
      font-weight: var(--ax-font-weight-bold);
      text-transform: uppercase;
      letter-spacing: var(--ax-letter-spacing-wide);
    }

    .ap-trend-chip {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: 10px;
      font-weight: var(--ax-font-weight-medium);
      padding: 2px 7px;
      border-radius: var(--ax-radius-full);
      white-space: nowrap;

      mat-icon { font-size: 12px; width: 12px; height: 12px; }

      &--up     { background: var(--ax-color-success-subtle); color: var(--ax-color-success-text); }
      &--stable { background: var(--ax-color-neutral-subtle); color: var(--ax-color-neutral-text); }
    }

    /* ════════════════════════════════════════════════════════════════ */
    /* TAB 4: Vision 2030                                               */
    /* ════════════════════════════════════════════════════════════════ */

    /* Vision progress rows (replaces 3-col large cards) */
    .ap-vision-row {
      display: grid;
      grid-template-columns: 18px 180px 170px 1fr 200px;
      align-items: center;
      gap: 14px;
      padding: 11px 16px;
      border-bottom: 1px solid var(--ax-color-border-subtle);
      transition: background var(--ax-transition-fast);

      &:last-child { border-bottom: none; }
      &:hover { background: var(--ax-color-bg-surface-alt); }

      mat-icon { font-size: 16px; width: 16px; height: 16px; flex-shrink: 0; }

      @media (max-width: 1200px) { grid-template-columns: 18px 160px 150px 1fr; }
    }

    .ap-vision-row__title {
      font-size: var(--ax-font-size-sm);
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
      white-space: nowrap;
    }

    .ap-vision-row__values {
      display: flex;
      align-items: baseline;
      gap: 6px;
      white-space: nowrap;
    }

    .ap-vision-row__current {
      font-size: var(--ax-font-size-lg);
      font-weight: var(--ax-font-weight-bold);
      font-variant-numeric: tabular-nums;
    }

    .ap-vision-row__target {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-tertiary);
    }

    .ap-vision-row__bar-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .ap-vision-row__bar {
      flex: 1;
      height: 8px;
      background: var(--ax-color-border-default);
      border-radius: var(--ax-radius-full);
      overflow: hidden;
    }

    .ap-vision-row__bar-fill {
      height: 100%;
      border-radius: var(--ax-radius-full);
      transition: width 0.6s ease;
    }

    .ap-vision-row__pct {
      font-size: 10px;
      color: var(--ax-color-text-tertiary);
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
      min-width: 28px;
      text-align: right;
    }

    .ap-vision-row__desc {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-tertiary);
      line-height: var(--ax-line-height-normal);

      @media (max-width: 1200px) { display: none; }
    }

    /* 기대효과 compact panel */
    .ap-effect-panel {
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border-default);
      border-radius: var(--ax-radius-lg);
      box-shadow: var(--ax-shadow-xs);
      overflow: hidden;
    }

    .ap-effect-panel__head {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-10);
      padding: 11px 16px;
      border-bottom: 1px solid var(--ax-color-border-default);
      background: var(--ax-color-bg-surface-alt);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--ax-color-warning);
        flex-shrink: 0;
      }
    }

    .ap-effect-panel__title {
      font-size: var(--ax-font-size-sm);
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
      margin: 0;
    }

    .ap-effect-panel__sub {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-tertiary);
      margin: 2px 0 0;
    }

    .ap-effect-list {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0;

      @media (max-width: 768px) { grid-template-columns: 1fr; }
    }

    .ap-effect-row {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--ax-color-border-subtle);
      border-right: 1px solid var(--ax-color-border-subtle);
      transition: background var(--ax-transition-fast);

      &:nth-child(2n) { border-right: none; }
      &:nth-last-child(-n+2) { border-bottom: none; }
      &:hover { background: var(--ax-color-bg-surface-alt); }

      mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; margin-top: 1px; }
    }

    .ap-effect-row__headline {
      font-size: var(--ax-font-size-sm);
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
      display: block;
      margin-bottom: 2px;
    }

    .ap-effect-row__detail {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-tertiary);
      display: block;
      line-height: var(--ax-line-height-normal);
    }
  `],
})
export class AiPerformancePageComponent implements OnInit {

  // ── 데이터 (기존 완전 유지) ───────────────────────────────────────────────
  readonly roiItems = [
    { icon: 'savings',              iconColor: 'var(--ax-color-info)',    value: '7,350', unit: '만원', label: '연간 총 절감액',   sub: '보수비 4,200 + 에너지 1,800 + 업무 1,350' },
    { icon: 'trending_up',          iconColor: 'var(--ax-color-success)', value: '340',   unit: '%',    label: '투자 수익률 (ROI)', sub: '투자 회수: 8개월' },
    { icon: 'smart_toy',            iconColor: 'var(--ax-color-brand-primary)', value: '81.5', unit: '%', label: '업무 자동화율', sub: '관리비·계약·점검·민원 통합' },
    { icon: 'precision_manufacturing', iconColor: 'var(--ax-color-warning)', value: '93.1', unit: '%', label: 'AI 탐지 정확도', sub: 'Y-MaskNet 기준 (F1 = 0.97)' },
    { icon: 'shield',               iconColor: 'var(--ax-color-success)', value: '94',    unit: '%',    label: '사고 전환 차단율', sub: 'XAI 위험도 엔진 기준' },
  ];

  readonly savingRows = [
    { icon: 'savings',  color: 'var(--ax-color-success)', label: '관리비 업무 효율화',   value: '1,350만원/년' },
    { icon: 'bolt',     color: 'var(--ax-color-warning)', label: '에너지 비용 절감',     value: '1,800만원/년' },
    { icon: 'build',    color: 'var(--ax-color-danger)',  label: '보수비 절감 (조기 탐지)', value: '4,200만원/년' },
  ];

  readonly kpiRows: KpiRow[] = [
    { label:'고지서 발행 시간', icon:'receipt_long', before:'8', after:'1.5', unit:'시간', improvePct:81, direction:'lower', detail:'504세대 관리비 고지서 RPA 자동 생성 (오류 12건 자동 보정)' },
    { label:'민원 처리 시간', icon:'support_agent', before:'3', after:'1', unit:'일', improvePct:67, direction:'lower', detail:'KoBERT 자동 분류 + Hungarian Algorithm 배정으로 67% 단축' },
    { label:'민원 담당자 배정', icon:'person_search', before:'2시간', after:'5', unit:'분', improvePct:96, direction:'lower', detail:'AI 기반 최적 배정으로 96% 시간 절감' },
    { label:'보고서 작성 시간', icon:'description', before:'3', after:'0.6', unit:'시간', improvePct:80, direction:'lower', detail:'LLM + RAG 법령 자동 학습으로 36분 내 공문서 생성' },
    { label:'관리비 연체율', icon:'payment', before:'15', after:'8', unit:'%', improvePct:47, direction:'lower', detail:'GBM 연체 예측 + 사전 알림으로 연체율 47% 감소' },
    { label:'점검 완료율', icon:'assignment_turned_in', before:'72', after:'94.2', unit:'%', improvePct:31, direction:'higher', detail:'AI 우선순위 기반 일정 자동 생성으로 완료율 향상' },
    { label:'AI 탐지 정확도', icon:'precision_manufacturing', before:'수동 육안검사', after:'93.1', unit:'%', improvePct:93, direction:'higher', detail:'Y-MaskNet 기준 F1=0.97, mAP≥0.92 달성' },
    { label:'고장 사전 탐지율', icon:'warning_amber', before:'사후 대응', after:'94', unit:'%', improvePct:94, direction:'higher', detail:'XAI 위험도 스코어링 — 고위험 사전 차단율 94%' },
    { label:'에너지 소비', icon:'bolt', before:'기준', after:'-14', unit:'%', improvePct:14, direction:'lower', detail:'RL 기반 HVAC 최적 제어로 에너지 비용 14% 절감' },
  ];

  readonly rpaRows: RpaRow[] = [
    { label:'계약 만료 알림 발송', icon:'contract', rate:100, color:'var(--ax-color-success)', timeSaved:'100% 완전 자동화' },
    { label:'담당자 자동 배정 (민원)', icon:'person_add', rate:96, color:'var(--ax-color-brand-primary)', timeSaved:'2시간 → 5분' },
    { label:'점검 일정 자동 생성', icon:'event_note', rate:90, color:'var(--ax-color-info)', timeSaved:'노후도 기반 우선순위' },
    { label:'관리비 고지서 발행', icon:'receipt', rate:80, color:'var(--ax-color-neutral)', timeSaved:'8시간 → 1.5시간' },
    { label:'민원 자동 분류 (KoBERT)', icon:'category', rate:75, color:'var(--ax-color-warning)', timeSaved:'신뢰도 72~97%' },
    { label:'보고서 자동 작성 (LLM+RAG)', icon:'auto_stories', rate:70, color:'var(--ax-color-danger)', timeSaved:'3시간 → 36분' },
  ];

  readonly modelCards: ModelCard[] = [
    { name:'Y-MaskNet', domain:'비전 AI', metric:'F1 Score', value:'0.97', trend:'up', color:'var(--ax-color-brand-primary)' },
    { name:'XAI 위험도 엔진', domain:'예지정비', metric:'Accuracy', value:'93%', trend:'up', color:'var(--ax-color-danger)' },
    { name:'KoBERT 민원 분류', domain:'NLP', metric:'F1 Score', value:'0.87', trend:'up', color:'var(--ax-color-neutral)' },
    { name:'Isolation Forest', domain:'IoT 이상탐지', metric:'FP Rate', value:'≤5%', trend:'up', color:'var(--ax-color-success)' },
    { name:'GBR 균열 성장 예측', domain:'시계열 예측', metric:'R² Score', value:'0.90', trend:'up', color:'var(--ax-color-warning)' },
    { name:'RL HVAC 최적화', domain:'에너지', metric:'절감률', value:'14%', trend:'up', color:'var(--ax-color-info)' },
    { name:'LLM + RAG', domain:'보고서 자동화', metric:'작성 단축', value:'80%', trend:'up', color:'var(--ax-color-warning)' },
    { name:'PointNet++ Digital Twin', domain:'3D 공간분석', metric:'mIoU', value:'0.88', trend:'stable', color:'var(--ax-color-neutral)' },
  ];

  readonly visionItems = [
    { title:'고장 사전 탐지율', icon:'shield', color:'var(--ax-color-danger)', current:'94%', target:'97%', progress:97, targetPct:100, desc:'XAI 위험도 엔진 + IoT 이상탐지 결합' },
    { title:'에너지 소비 절감', icon:'bolt', color:'var(--ax-color-warning)', current:'14%', target:'15%', progress:93, targetPct:100, desc:'RL 기반 HVAC 최적 제어' },
    { title:'공실 감소율', icon:'home', color:'var(--ax-color-brand-primary)', current:'진행 중', target:'20% 감소', progress:40, targetPct:100, desc:'예측 모델 기반 공실 전환 선제 대응' },
    { title:'민원 처리 시간', icon:'support_agent', color:'var(--ax-color-neutral)', current:'1.2일', target:'1일', progress:80, targetPct:100, desc:'AI 배정 + 현장 앱 연동 최적화' },
    { title:'점검 완료율', icon:'assignment_turned_in', color:'var(--ax-color-success)', current:'94.2%', target:'95%', progress:99, targetPct:100, desc:'자동 일정 생성 + 드론 미션 연동' },
    { title:'ROI', icon:'trending_up', color:'var(--ax-color-warning)', current:'340%', target:'400%', progress:85, targetPct:100, desc:'플랫폼 확장 및 추가 수요처 확보 시' },
  ];

  readonly effectItems = [
    { icon:'savings', color:'var(--ax-color-success)', headline:'연간 7,350만원 절감', detail:'보수비 4,200 + 에너지 1,800 + 업무효율화 1,350만원' },
    { icon:'timer', color:'var(--ax-color-brand-primary)', headline:'업무 시간 81% 단축', detail:'고지서 발행·민원 배정·보고서 작성 통합 기준' },
    { icon:'precision_manufacturing', color:'var(--ax-color-danger)', headline:'탐지 정확도 93.1%', detail:'Y-MaskNet 기준 오탐 0건 목표 (Antigravity 엔진)' },
    { icon:'people', color:'var(--ax-color-neutral)', headline:'입주민 만족도 향상', detail:'민원 처리 3일→1일, 클린하우스 마일리지 인센티브' },
  ];

  ngOnInit() {}
}
