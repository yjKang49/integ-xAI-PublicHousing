// apps/admin-web/src/app/features/vision2030/vision2030-page.component.ts
// Vision 2030 예측분석 — 사업계획서 PAGE 8
// ML 고장예측(GBR) · 에너지 최적화(RL) · 공실 예측 · 사업화 KPI

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';

interface ForecastPoint { month: string; baseline: number; aiApplied: number; lower: number; upper: number; }
interface EnergyPoint   { complex: string; current: number; optimized: number; saving: number; }
interface VacancyRisk   { complex: string; probability: number; reason: string; units: number; }

// ── ML 시뮬레이션 데이터 ─────────────────────────────────────────────
function makeFaultForecast(): ForecastPoint[] {
  const months = ['2025-07','2025-08','2025-09','2025-10','2025-11','2025-12',
                  '2026-01','2026-02','2026-03','2026-04','2026-05','2026-06'];
  return months.map((month, i) => {
    const baseline = 18 + Math.sin(i * 0.5) * 4 + i * 0.3;
    const reduction = 0.30 + (i / months.length) * 0.08;  // 30~38% 감소 추세
    const aiApplied = baseline * (1 - reduction);
    return {
      month,
      baseline: Math.round(baseline * 10) / 10,
      aiApplied: Math.round(aiApplied * 10) / 10,
      lower: Math.round((aiApplied * 0.88) * 10) / 10,
      upper: Math.round((aiApplied * 1.12) * 10) / 10,
    };
  });
}

function makeEnergyData(): EnergyPoint[] {
  const complexes = [
    '강남 SH 매입임대', '마포 SH 영구임대', '노원 SH 국민임대',
    '강서 SH 행복주택', '서초 SH 매입임대', '구미 GBDC 영구임대', '안동 GBDC 국민임대',
  ];
  return complexes.map(complex => {
    const current = 280 + Math.random() * 120;
    const reduction = 0.10 + Math.random() * 0.08;
    const optimized = current * (1 - reduction);
    return {
      complex,
      current: Math.round(current),
      optimized: Math.round(optimized),
      saving: Math.round((current - optimized) * 100) / 100,
    };
  });
}

function makeVacancyRisk(): VacancyRisk[] {
  return [
    { complex: '서초 SH 매입임대', probability: 72, reason: '준공 30년 초과 + 엘리베이터 2회 고장', units: 8 },
    { complex: '구미 GBDC 영구임대', probability: 58, reason: '계약만료 집중 + 외벽 노후', units: 5 },
    { complex: '마포 SH 영구임대', probability: 41, reason: '층간소음 민원 증가', units: 3 },
    { complex: '노원 SH 국민임대', probability: 28, reason: '시설 노후 진행 중', units: 2 },
    { complex: '강남 SH 매입임대', probability: 15, reason: '정기 보수 완료 + 시설 양호', units: 1 },
    { complex: '강서 SH 행복주택', probability: 9, reason: '신규 단지 — 이상 없음', units: 0 },
    { complex: '안동 GBDC 국민임대', probability: 12, reason: '지방 공실률 소폭 상승 추세', units: 1 },
  ];
}

@Component({
  selector: 'ax-vision2030-page',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatIconModule, MatButtonModule, MatTabsModule,
    MatDividerModule, MatTooltipModule, MatProgressBarModule,
  ],
  template: `
    <!-- ── 헤더 ── -->
    <div class="ax-v2030-header">
      <div class="ax-v2030-header__left">
        <div class="ax-v2030-header__icon-wrap">
          <mat-icon class="v-icon">rocket_launch</mat-icon>
        </div>
        <div>
          <h2 class="page-title">Vision 2030 예측분석</h2>
          <p class="page-subtitle">ML 기반 중장기 예측 — 고장예측(GBR) · 에너지 최적화(RL) · 공실 예측 · 사업화 KPI</p>
        </div>
      </div>
      <div class="header-right">
        <button mat-stroked-button routerLink="/ai-performance">
          <mat-icon>bar_chart</mat-icon> AI 성과 대시보드
        </button>
      </div>
    </div>

    <!-- ── 핵심 목표 요약 ── -->
    <div class="target-row">
      @for (t of targets; track t.label) {
        <div class="ax-v2030-target-card ax-v2030-target-card--{{ t.colorKey }}">
          <mat-icon class="ax-v2030-target-icon ax-v2030-target-icon--{{ t.colorKey }}">{{ t.icon }}</mat-icon>
          <div class="ax-v2030-target-val ax-v2030-target-val--{{ t.colorKey }}">{{ t.current }}</div>
          <div class="target-label">{{ t.label }}</div>
          <div class="target-goal">목표: {{ t.goal }}</div>
          <mat-progress-bar mode="determinate" [value]="t.progress" [color]="t.progress >= 90 ? 'primary' : 'accent'" />
        </div>
      }
    </div>

    <!-- ── 탭 ── -->
    <mat-tab-group animationDuration="200ms">

      <!-- TAB 1: 고장 예측 -->
      <mat-tab>
        <ng-template mat-tab-label>
          <mat-icon class="ax-tab-icon">warning_amber</mat-icon>
          고장 예측 (GBR)
        </ng-template>
        <div class="tab-content">
          <div class="chart-desc">
            <mat-icon class="cd-icon">insights</mat-icon>
            GBR(Gradient Boosting Regressor) 기반 단지별 월간 고장 건수 예측. AI 적용 후 30~38% 감소 예상 (95% 신뢰구간 표시).
          </div>

          <!-- SVG 라인 차트 -->
          <div class="ax-v2030-panel">
            <div class="ax-v2030-panel__hdr">
              <mat-icon class="ax-v2030-panel__hdr-icon ax-v2030-panel__hdr-icon--danger">trending_down</mat-icon>
              <div>
                <div class="ax-v2030-panel__hdr-title">월간 고장 건수 — AI 적용 전/후 비교</div>
                <div class="ax-v2030-panel__hdr-sub">2025년 7월 ~ 2026년 6월 · GBR 모델 예측 (R²=0.79)</div>
              </div>
            </div>
            <div class="ax-v2030-panel__body">
              <svg class="forecast-chart" viewBox="0 0 800 280" preserveAspectRatio="xMidYMid meet">
                <!-- 배경 그리드 -->
                @for (y of gridY; track y) {
                  <line [attr.x1]="60" [attr.y1]="y" [attr.x2]="780" [attr.y2]="y"
                    stroke="#f0f0f0" stroke-width="1" />
                  <text [attr.x]="48" [attr.y]="y + 4" text-anchor="end" font-size="10" fill="#999">
                    {{ yLabel(y) }}
                  </text>
                }

                <!-- 신뢰구간 영역 (AI 적용 후) -->
                <polygon [attr.points]="ciPath()" fill="#e3f2fd" opacity="0.6" />

                <!-- AI 미적용 라인 (빨강 점선) -->
                <polyline [attr.points]="baselinePath()"
                  fill="none" stroke="#ef5350" stroke-width="2.5"
                  stroke-dasharray="6,3" />

                <!-- AI 적용 라인 (파랑 실선) -->
                <polyline [attr.points]="aiPath()"
                  fill="none" stroke="#1976d2" stroke-width="3" />

                <!-- 데이터 포인트 -->
                @for (p of chartPoints(); track p.ax; let i = $index) {
                  <circle [attr.cx]="p.bx" [attr.cy]="p.by" r="4" fill="#ef5350" />
                  <circle [attr.cx]="p.ax" [attr.cy]="p.ay" r="5" fill="white" stroke="#1976d2" stroke-width="2.5" />
                  <!-- X축 라벨 -->
                  <text [attr.x]="p.ax" y="268" text-anchor="middle" font-size="9" fill="#888">
                    {{ faultData()[i].month.slice(5) }}
                  </text>
                }

                <!-- 범례 -->
                <line x1="70" y1="20" x2="100" y2="20" stroke="#ef5350" stroke-width="2.5" stroke-dasharray="6,3" />
                <text x="106" y="24" font-size="11" fill="#ef5350">AI 미적용</text>
                <line x1="200" y1="20" x2="230" y2="20" stroke="#1976d2" stroke-width="3" />
                <text x="236" y="24" font-size="11" fill="#1976d2">AI 적용 후 (GBR 예측)</text>
                <rect x="370" y="12" width="12" height="12" fill="#e3f2fd" opacity="0.8" rx="2" />
                <text x="386" y="24" font-size="11" fill="#9e9e9e">95% 신뢰구간</text>
              </svg>

              <!-- 수치 요약 -->
              <div class="fault-summary">
                <div class="fs-item">
                  <span class="fs-label">평균 고장 감소율</span>
                  <span class="fs-val ax-fs-val--success">▼ {{ avgReduction() }}%</span>
                </div>
                <div class="fs-item">
                  <span class="fs-label">연간 예방 고장 건수</span>
                  <span class="fs-val ax-fs-val--info">{{ totalPrevented() }}건</span>
                </div>
                <div class="fs-item">
                  <span class="fs-label">예방 조치 비용 절감</span>
                  <span class="fs-val ax-fs-val--warn">4,200만원/년</span>
                </div>
                <div class="fs-item">
                  <span class="fs-label">모델 정확도 (R²)</span>
                  <span class="fs-val ax-fs-val--accent">0.79</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </mat-tab>

      <!-- TAB 2: 에너지 최적화 -->
      <mat-tab>
        <ng-template mat-tab-label>
          <mat-icon class="ax-tab-icon ax-tab-icon--warn">bolt</mat-icon>
          에너지 최적화 (RL)
        </ng-template>
        <div class="tab-content">
          <div class="chart-desc">
            <mat-icon class="cd-icon ax-cd-icon--warn">insights</mat-icon>
            강화학습(RL) 기반 HVAC 최적 제어. 현재 전력비 대비 평균 14% 절감 예측.
          </div>

          <!-- 수평 막대 차트 (SVG) -->
          <div class="ax-v2030-panel">
            <div class="ax-v2030-panel__hdr">
              <mat-icon class="ax-v2030-panel__hdr-icon ax-v2030-panel__hdr-icon--warn">energy_savings_leaf</mat-icon>
              <div>
                <div class="ax-v2030-panel__hdr-title">단지별 에너지 최적화 예측</div>
                <div class="ax-v2030-panel__hdr-sub">현재 vs RL HVAC 최적화 후 (단위: 만kWh/년)</div>
              </div>
            </div>
            <div class="ax-v2030-panel__body">
              <div class="energy-bars">
                @for (e of energyData(); track e.complex) {
                  <div class="energy-row">
                    <div class="energy-label">{{ e.complex }}</div>
                    <div class="energy-chart">
                      <div class="e-bar-wrap">
                        <div class="e-current-bar" [style.width.%]="(e.current / maxEnergy()) * 100">
                          <span class="e-val">{{ e.current }}만kWh</span>
                        </div>
                      </div>
                      <div class="e-bar-wrap">
                        <div class="e-optimized-bar" [style.width.%]="(e.optimized / maxEnergy()) * 100">
                          <span class="e-val">{{ e.optimized }}만kWh</span>
                        </div>
                      </div>
                    </div>
                    <div class="energy-saving">
                      <mat-icon class="saving-icon">arrow_downward</mat-icon>
                      {{ ((e.current - e.optimized) / e.current * 100).toFixed(1) }}%
                    </div>
                  </div>
                }
              </div>
              <!-- 범례 -->
              <div class="energy-legend">
                <span class="legend-current">현재</span>
                <span class="legend-optimized">RL 최적화 후</span>
                <span class="legend-target">목표 절감률: 14%</span>
              </div>
              <!-- 절감 요약 -->
              <div class="energy-total">
                <div class="et-item">
                  <mat-icon class="ax-et-icon--warn">bolt</mat-icon>
                  <span>연간 총 절감 예상: <strong>1,800만원</strong></span>
                </div>
                <div class="et-item">
                  <mat-icon class="ax-et-icon--success">co2</mat-icon>
                  <span>CO₂ 감축 예상: <strong>42톤/년</strong></span>
                </div>
                <div class="et-item">
                  <mat-icon class="ax-et-icon--info">model_training</mat-icon>
                  <span>모델 정확도: <strong>R²=0.62</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </mat-tab>

      <!-- TAB 3: 공실 예측 -->
      <mat-tab>
        <ng-template mat-tab-label>
          <mat-icon class="ax-tab-icon ax-tab-icon--accent">home</mat-icon>
          공실 예측 (ML)
        </ng-template>
        <div class="tab-content">
          <div class="chart-desc">
            <mat-icon class="cd-icon ax-cd-icon--accent">insights</mat-icon>
            계약 만료 패턴 + 시설 노후도 + 민원 빈도 기반 6개월 내 공실 발생 확률 예측.
          </div>
          <div class="vacancy-list">
            @for (v of vacancyData(); track v.complex) {
              <div class="ax-v2030-vacancy-card" [class.ax-v2030-vacancy-card--high-risk]="v.probability >= 60">
                <div class="vacancy-header">
                  <span class="vc-complex">{{ v.complex }}</span>
                  <span class="vc-units" [class.units-warn]="v.units > 0">{{ v.units }}세대 위험</span>
                </div>
                <div class="vacancy-bar-row">
                  <div class="vc-prob"
                    [class.prob-high]="v.probability >= 60"
                    [class.prob-med]="v.probability >= 30 && v.probability < 60"
                    [class.prob-low]="v.probability < 30">
                    {{ v.probability }}%
                  </div>
                  <div class="vc-bar-wrap">
                    <div class="vc-bar-fill"
                      [style.width.%]="v.probability"
                      [class.fill-high]="v.probability >= 60"
                      [class.fill-med]="v.probability >= 30 && v.probability < 60"
                      [class.fill-low]="v.probability < 30">
                    </div>
                  </div>
                </div>
                <div class="vc-reason">
                  <mat-icon style="font-size:13px;width:13px;height:13px;color:#888">info</mat-icon>
                  {{ v.reason }}
                </div>
                @if (v.probability >= 50) {
                  <div class="vc-action">
                    <mat-icon style="font-size:13px;color:#1976d2">assignment_ind</mat-icon>
                    시설 보수 선제 대응 + 계약 연장 인센티브 제공 권고
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </mat-tab>

      <!-- TAB 4: 사업화 KPI -->
      <mat-tab>
        <ng-template mat-tab-label>
          <mat-icon class="ax-tab-icon ax-tab-icon--success">show_chart</mat-icon>
          사업화 KPI
        </ng-template>
        <div class="tab-content">
          <!-- ROI 요약 -->
          <div class="ax-v2030-roi-summary">
            <div class="roi-big">
              <mat-icon class="roi-big-icon">trending_up</mat-icon>
              <div class="roi-num">340%</div>
              <div class="roi-label">투자 수익률 (ROI)</div>
              <div class="roi-sub">투자 회수 기간: 8개월</div>
            </div>
            <div class="roi-breakdown">
              @for (item of roiItems; track item.label) {
                <div class="roi-item">
                  <mat-icon class="ax-roi-icon--{{ item.colorKey }}">{{ item.icon }}</mat-icon>
                  <div class="roi-item-info">
                    <span class="roi-item-label">{{ item.label }}</span>
                    <span class="ax-roi-val--{{ item.colorKey }}">{{ item.val }}</span>
                  </div>
                </div>
              }
            </div>
          </div>

          <mat-divider></mat-divider>

          <!-- LH 전국 확산 근거 -->
          <div class="ax-v2030-panel ax-v2030-panel--expansion">
            <div class="ax-v2030-panel__hdr">
              <mat-icon class="ax-v2030-panel__hdr-icon ax-v2030-panel__hdr-icon--info">hub</mat-icon>
              <div>
                <div class="ax-v2030-panel__hdr-title">LH 전국 확산 시나리오</div>
                <div class="ax-v2030-panel__hdr-sub">SH/GBDC 실증 → 전국 110만 세대 확대 적용</div>
              </div>
            </div>
            <div class="ax-v2030-panel__body">
              <div class="expansion-grid">
                @for (s of expansionSteps; track s.phase) {
                  <div class="expansion-step" [class.current-phase]="s.current">
                    <div class="exp-phase ax-exp-step__phase--{{ s.colorKey }}">Phase {{ s.phase }}</div>
                    <div class="exp-title">{{ s.title }}</div>
                    <div class="exp-units">{{ s.units }}</div>
                    <div class="exp-roi ax-exp-step__roi--{{ s.colorKey }}">ROI {{ s.roi }}</div>
                    @if (s.current) {
                      <div class="current-badge">현재 단계</div>
                    }
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      </mat-tab>

    </mat-tab-group>
  `,
  styles: [`
    /* ── 헤더 ── */
    .ax-v2030-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--ax-spacing-6, 24px);
    }
    .ax-v2030-header__left {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-4, 16px);
    }
    .ax-v2030-header__icon-wrap {
      width: 48px;
      height: 48px;
      border-radius: var(--ax-radius-lg, 12px);
      background: linear-gradient(135deg, var(--ax-color-info, #1565c0), var(--ax-color-brand-accent, #6750a4));
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .v-icon { font-size: 28px; width: 28px; height: 28px; color: white; }
    .page-title { margin: 0; font-size: var(--ax-font-size-xl, 22px); font-weight: var(--ax-font-weight-bold, 700); color: var(--ax-color-text-primary); }
    .page-subtitle { margin: 4px 0 0; font-size: var(--ax-font-size-xs, 12px); color: var(--ax-color-text-tertiary, #888); }
    .header-right { display: flex; gap: var(--ax-spacing-2, 8px); }

    /* ── 목표 카드 ── */
    .target-row {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: var(--ax-spacing-3, 12px);
      margin-bottom: var(--ax-spacing-6, 24px);
    }
    .ax-v2030-target-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--ax-spacing-4, 14px) var(--ax-spacing-3, 10px);
      text-align: center;
      background: var(--ax-color-bg-surface, #fff);
      border-radius: var(--ax-radius-md, 8px);
      border: 1px solid var(--ax-color-border-subtle);
      border-top-width: 3px;
    }
    .ax-v2030-target-card--danger  { border-top: 3px solid var(--ax-color-danger, #c62828); }
    .ax-v2030-target-card--warn    { border-top: 3px solid var(--ax-color-warning, #e65100); }
    .ax-v2030-target-card--info    { border-top: 3px solid var(--ax-color-info, #1976d2); }
    .ax-v2030-target-card--accent  { border-top: 3px solid var(--ax-color-brand-accent, #6750a4); }
    .ax-v2030-target-card--success { border-top: 3px solid var(--ax-color-success, #2e7d32); }
    .ax-v2030-target-card--gold    { border-top: 3px solid #f57f17; }

    .ax-v2030-target-icon { font-size: 24px; width: 24px; height: 24px; margin-bottom: var(--ax-spacing-2, 6px); }
    .ax-v2030-target-icon--danger  { color: var(--ax-color-danger, #c62828); }
    .ax-v2030-target-icon--warn    { color: var(--ax-color-warning, #e65100); }
    .ax-v2030-target-icon--info    { color: var(--ax-color-info, #1976d2); }
    .ax-v2030-target-icon--accent  { color: var(--ax-color-brand-accent, #6750a4); }
    .ax-v2030-target-icon--success { color: var(--ax-color-success, #2e7d32); }
    .ax-v2030-target-icon--gold    { color: #f57f17; }

    .ax-v2030-target-val { font-size: var(--ax-font-size-2xl, 22px); font-weight: var(--ax-font-weight-extrabold, 800); line-height: 1; }
    .ax-v2030-target-val--danger  { color: var(--ax-color-danger, #c62828); }
    .ax-v2030-target-val--warn    { color: var(--ax-color-warning, #e65100); }
    .ax-v2030-target-val--info    { color: var(--ax-color-info, #1976d2); }
    .ax-v2030-target-val--accent  { color: var(--ax-color-brand-accent, #6750a4); }
    .ax-v2030-target-val--success { color: var(--ax-color-success, #2e7d32); }
    .ax-v2030-target-val--gold    { color: #f57f17; }

    .target-label { font-size: var(--ax-font-size-xs, 11px); font-weight: var(--ax-font-weight-semibold, 600); color: var(--ax-color-text-secondary, #555); margin: 4px 0 2px; }
    .target-goal  { font-size: 10px; color: var(--ax-color-text-tertiary, #999); margin-bottom: var(--ax-spacing-2, 6px); }

    /* ── 탭 아이콘 ── */
    .ax-tab-icon { margin-right: 6px; }
    .ax-tab-icon--warn    { color: var(--ax-color-warning, #e65100); }
    .ax-tab-icon--accent  { color: var(--ax-color-brand-accent, #6750a4); }
    .ax-tab-icon--success { color: var(--ax-color-success, #2e7d32); }

    /* ── 탭 ── */
    .tab-content { padding: var(--ax-spacing-5, 20px) 0; }
    .chart-desc {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-2, 6px);
      font-size: var(--ax-font-size-xs, 12px);
      color: var(--ax-color-text-secondary, #666);
      background: var(--ax-color-bg-surface-alt, #f0f7ff);
      border-radius: var(--ax-radius-md, 8px);
      padding: var(--ax-spacing-2, 8px) var(--ax-spacing-3, 12px);
      margin-bottom: var(--ax-spacing-4, 16px);
    }
    .cd-icon { font-size: 16px; width: 16px; height: 16px; color: var(--ax-color-info, #1976d2); }
    .ax-cd-icon--warn   { color: var(--ax-color-warning, #e65100); }
    .ax-cd-icon--accent { color: var(--ax-color-brand-accent, #6750a4); }

    /* ── 패널 ── */
    .ax-v2030-panel {
      background: var(--ax-color-bg-surface, #fff);
      border: 1px solid var(--ax-color-border, #e0e0e0);
      border-radius: var(--ax-radius-lg, 12px);
      margin-bottom: var(--ax-spacing-4, 16px);
      overflow: hidden;
    }
    .ax-v2030-panel__hdr {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-3, 12px);
      padding: var(--ax-spacing-4, 16px) var(--ax-spacing-4, 16px) var(--ax-spacing-3, 12px);
      border-bottom: 1px solid var(--ax-color-border-subtle);
    }
    .ax-v2030-panel__hdr-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
      flex-shrink: 0;
    }
    .ax-v2030-panel__hdr-icon--danger  { color: var(--ax-color-danger, #c62828); }
    .ax-v2030-panel__hdr-icon--warn    { color: var(--ax-color-warning, #e65100); }
    .ax-v2030-panel__hdr-icon--info    { color: var(--ax-color-info, #1976d2); }
    .ax-v2030-panel__hdr-icon--accent  { color: var(--ax-color-brand-accent, #6750a4); }
    .ax-v2030-panel__hdr-icon--success { color: var(--ax-color-success, #2e7d32); }
    .ax-v2030-panel__hdr-title { font-size: var(--ax-font-size-base, 15px); font-weight: var(--ax-font-weight-semibold, 600); color: var(--ax-color-text-primary); }
    .ax-v2030-panel__hdr-sub   { font-size: var(--ax-font-size-xs, 12px); color: var(--ax-color-text-tertiary, #888); margin-top: 2px; }
    .ax-v2030-panel__body { padding: var(--ax-spacing-4, 16px); }

    /* ── 고장 예측 SVG 차트 ── */
    .forecast-chart { width: 100%; height: auto; display: block; }
    .fault-summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--ax-spacing-3, 12px);
      margin-top: var(--ax-spacing-4, 16px);
    }
    .fs-item {
      background: var(--ax-color-bg-surface-alt, #f8f9ff);
      border-radius: var(--ax-radius-md, 8px);
      padding: var(--ax-spacing-3, 12px);
      text-align: center;
    }
    .fs-label { display: block; font-size: var(--ax-font-size-xs, 11px); color: var(--ax-color-text-tertiary, #888); margin-bottom: 4px; }
    .fs-val   { display: block; font-size: var(--ax-font-size-xl, 20px); font-weight: var(--ax-font-weight-extrabold, 800); }
    .ax-fs-val--success { color: var(--ax-color-success, #2e7d32); }
    .ax-fs-val--info    { color: var(--ax-color-info, #1976d2); }
    .ax-fs-val--warn    { color: var(--ax-color-warning, #e65100); }
    .ax-fs-val--accent  { color: var(--ax-color-brand-accent, #6750a4); }

    /* ── 에너지 ── */
    .energy-bars { display: flex; flex-direction: column; gap: var(--ax-spacing-4, 14px); padding: 8px 0; }
    .energy-row  { display: flex; align-items: center; gap: var(--ax-spacing-3, 12px); }
    .energy-label { font-size: var(--ax-font-size-xs, 12px); font-weight: var(--ax-font-weight-medium, 500); width: 140px; flex-shrink: 0; color: var(--ax-color-text-primary); }
    .energy-chart { flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .e-bar-wrap { height: 20px; background: var(--ax-color-bg-surface-alt, #f0f0f0); border-radius: var(--ax-radius-sm, 4px); overflow: hidden; position: relative; }
    .e-current-bar   { height: 100%; background: #ef5350; border-radius: var(--ax-radius-sm, 4px); display: flex; align-items: center; transition: width 0.6s; }
    .e-optimized-bar { height: 100%; background: #66bb6a; border-radius: var(--ax-radius-sm, 4px); display: flex; align-items: center; transition: width 0.6s; }
    .e-val { font-size: 10px; color: white; font-weight: var(--ax-font-weight-semibold, 600); padding: 0 6px; white-space: nowrap; }
    .energy-saving { font-size: var(--ax-font-size-xs, 12px); font-weight: var(--ax-font-weight-bold, 700); color: var(--ax-color-success, #2e7d32); width: 48px; text-align: right; flex-shrink: 0; display: flex; align-items: center; gap: 2px; }
    .saving-icon { font-size: 14px; width: 14px; height: 14px; }
    .energy-legend { display: flex; gap: var(--ax-spacing-4, 16px); padding: var(--ax-spacing-3, 12px) 0; font-size: var(--ax-font-size-xs, 11px); }
    .legend-current::before   { content: '■'; color: #ef5350; margin-right: 4px; }
    .legend-optimized::before { content: '■'; color: #66bb6a; margin-right: 4px; }
    .legend-target { color: var(--ax-color-text-tertiary, #888); }
    .energy-total { display: flex; gap: var(--ax-spacing-6, 24px); padding: var(--ax-spacing-3, 12px); background: var(--ax-color-bg-surface-alt, #f0f7ff); border-radius: var(--ax-radius-md, 8px); flex-wrap: wrap; }
    .et-item { display: flex; align-items: center; gap: var(--ax-spacing-2, 8px); font-size: var(--ax-font-size-sm, 13px); }
    .et-item strong { font-weight: var(--ax-font-weight-bold, 700); }
    .ax-et-icon--warn    { color: var(--ax-color-warning, #e65100); }
    .ax-et-icon--success { color: var(--ax-color-success, #2e7d32); }
    .ax-et-icon--info    { color: var(--ax-color-info, #1976d2); }

    /* ── 공실 예측 ── */
    .vacancy-list { display: flex; flex-direction: column; gap: var(--ax-spacing-3, 10px); }
    .ax-v2030-vacancy-card {
      background: var(--ax-color-bg-surface, #fff);
      border: 1px solid var(--ax-color-border, #e0e0e0);
      border-radius: var(--ax-radius-md, 8px);
      padding: var(--ax-spacing-4, 14px) var(--ax-spacing-4, 16px);
    }
    .ax-v2030-vacancy-card--high-risk { border-left: 4px solid var(--ax-color-danger, #c62828); }
    .vacancy-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--ax-spacing-2, 8px); }
    .vc-complex { font-size: var(--ax-font-size-sm, 14px); font-weight: var(--ax-font-weight-semibold, 600); color: var(--ax-color-text-primary); }
    .vc-units { font-size: var(--ax-font-size-xs, 11px); background: var(--ax-color-bg-surface-alt, #f5f5f5); color: var(--ax-color-text-secondary, #666); padding: 2px 8px; border-radius: var(--ax-radius-full, 8px); }
    .vc-units.units-warn { background: #ffebee; color: var(--ax-color-danger, #c62828); font-weight: var(--ax-font-weight-semibold, 600); }
    .vacancy-bar-row { display: flex; align-items: center; gap: var(--ax-spacing-3, 12px); margin-bottom: var(--ax-spacing-2, 6px); }
    .vc-prob { font-size: var(--ax-font-size-xl, 20px); font-weight: var(--ax-font-weight-extrabold, 800); width: 50px; }
    .prob-high { color: var(--ax-color-danger, #c62828); }
    .prob-med  { color: var(--ax-color-warning, #e65100); }
    .prob-low  { color: var(--ax-color-success, #2e7d32); }
    .vc-bar-wrap  { flex: 1; height: 10px; background: var(--ax-color-bg-surface-alt, #f0f0f0); border-radius: 5px; overflow: hidden; }
    .vc-bar-fill  { height: 100%; border-radius: 5px; transition: width 0.6s; }
    .fill-high { background: var(--ax-color-danger, #c62828); }
    .fill-med  { background: var(--ax-color-warning, #e65100); }
    .fill-low  { background: var(--ax-color-success, #2e7d32); }
    .vc-reason { font-size: var(--ax-font-size-xs, 11px); color: var(--ax-color-text-tertiary, #888); display: flex; align-items: center; gap: 4px; }
    .vc-action { font-size: var(--ax-font-size-xs, 11px); color: var(--ax-color-info, #1976d2); display: flex; align-items: center; gap: 4px; margin-top: 4px; font-weight: var(--ax-font-weight-medium, 500); }

    /* ── 사업화 KPI ── */
    .ax-v2030-roi-summary {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-8, 32px);
      background: linear-gradient(135deg, #e8f5e9, #f0f7ff);
      border-radius: var(--ax-radius-lg, 12px);
      padding: var(--ax-spacing-6, 24px);
      margin-bottom: var(--ax-spacing-5, 20px);
    }
    .roi-big { text-align: center; min-width: 140px; }
    .roi-big-icon { font-size: 36px; width: 36px; height: 36px; color: var(--ax-color-success, #2e7d32); }
    .roi-num   { font-size: 52px; font-weight: var(--ax-font-weight-black, 900); color: var(--ax-color-success, #2e7d32); line-height: 1; }
    .roi-label { font-size: var(--ax-font-size-sm, 13px); font-weight: var(--ax-font-weight-semibold, 600); color: var(--ax-color-text-secondary, #555); }
    .roi-sub   { font-size: var(--ax-font-size-xs, 11px); color: var(--ax-color-text-tertiary, #888); }
    .roi-breakdown { flex: 1; display: flex; flex-direction: column; gap: var(--ax-spacing-3, 12px); }
    .roi-item  { display: flex; align-items: center; gap: var(--ax-spacing-3, 12px); }
    .roi-item-info  { display: flex; flex-direction: column; }
    .roi-item-label { font-size: var(--ax-font-size-xs, 12px); color: var(--ax-color-text-secondary, #666); }

    /* ROI icon colors */
    .ax-roi-icon--danger  { color: var(--ax-color-danger, #c62828); }
    .ax-roi-icon--warn    { color: var(--ax-color-warning, #e65100); }
    .ax-roi-icon--accent  { color: var(--ax-color-brand-accent, #6750a4); }
    .ax-roi-icon--success { color: var(--ax-color-success, #2e7d32); }

    /* ROI value colors */
    .ax-roi-val--danger  { font-size: var(--ax-font-size-lg, 18px); font-weight: var(--ax-font-weight-bold, 700); color: var(--ax-color-danger, #c62828); }
    .ax-roi-val--warn    { font-size: var(--ax-font-size-lg, 18px); font-weight: var(--ax-font-weight-bold, 700); color: var(--ax-color-warning, #e65100); }
    .ax-roi-val--accent  { font-size: var(--ax-font-size-lg, 18px); font-weight: var(--ax-font-weight-bold, 700); color: var(--ax-color-brand-accent, #6750a4); }
    .ax-roi-val--success { font-size: var(--ax-font-size-lg, 18px); font-weight: var(--ax-font-weight-bold, 700); color: var(--ax-color-success, #2e7d32); }

    /* Expansion panel */
    .ax-v2030-panel--expansion { margin-top: var(--ax-spacing-5, 20px); }
    .expansion-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--ax-spacing-3, 12px); padding: var(--ax-spacing-3, 12px) 0; }
    .expansion-step {
      border: 1px solid var(--ax-color-border, #e0e0e0);
      border-radius: var(--ax-radius-md, 10px);
      padding: var(--ax-spacing-4, 16px);
      text-align: center;
      transition: box-shadow 0.2s;
    }
    .expansion-step.current-phase {
      border-color: var(--ax-color-info, #1976d2);
      background: var(--ax-color-bg-surface-alt, #f0f7ff);
      box-shadow: 0 2px 8px rgba(25, 118, 210, .2);
    }
    .exp-phase { font-size: 10px; font-weight: var(--ax-font-weight-bold, 700); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
    .ax-exp-step__phase--success { color: var(--ax-color-success, #2e7d32); }
    .ax-exp-step__phase--info    { color: var(--ax-color-info, #1976d2); }
    .ax-exp-step__phase--accent  { color: var(--ax-color-brand-accent, #6750a4); }
    .ax-exp-step__phase--warn    { color: var(--ax-color-warning, #e65100); }
    .exp-title { font-size: var(--ax-font-size-sm, 13px); font-weight: var(--ax-font-weight-semibold, 600); margin-bottom: var(--ax-spacing-2, 6px); color: var(--ax-color-text-primary); }
    .exp-units { font-size: var(--ax-font-size-xs, 11px); color: var(--ax-color-text-tertiary, #888); margin-bottom: 4px; }
    .exp-roi   { font-size: var(--ax-font-size-lg, 18px); font-weight: var(--ax-font-weight-extrabold, 800); }
    .ax-exp-step__roi--success { color: var(--ax-color-success, #2e7d32); }
    .ax-exp-step__roi--info    { color: var(--ax-color-info, #1976d2); }
    .ax-exp-step__roi--accent  { color: var(--ax-color-brand-accent, #6750a4); }
    .ax-exp-step__roi--warn    { color: var(--ax-color-warning, #e65100); }
    .current-badge { display: inline-block; background: var(--ax-color-info, #1976d2); color: white; font-size: 9px; padding: 2px 8px; border-radius: var(--ax-radius-full, 8px); margin-top: var(--ax-spacing-2, 6px); }
  `],
})
export class Vision2030PageComponent implements OnInit {
  readonly faultData = signal<ForecastPoint[]>([]);
  readonly energyData = signal<EnergyPoint[]>([]);
  readonly vacancyData = signal<VacancyRisk[]>([]);

  readonly targets = [
    { icon: 'shield',              colorKey: 'danger',  color: '#c62828', label: '고장 사전 탐지율', current: '94%',    goal: '97%',   progress: 97 },
    { icon: 'bolt',                colorKey: 'warn',    color: '#e65100', label: '에너지 절감',      current: '14%',    goal: '15%',   progress: 93 },
    { icon: 'home',                colorKey: 'info',    color: '#1976d2', label: '공실 감소',        current: '진행중', goal: '20%↓',  progress: 40 },
    { icon: 'support_agent',       colorKey: 'accent',  color: '#7b1fa2', label: '민원 처리',        current: '1.2일',  goal: '1일',   progress: 80 },
    { icon: 'assignment_turned_in',colorKey: 'success', color: '#2e7d32', label: '점검 완료율',      current: '94.2%',  goal: '95%',   progress: 99 },
    { icon: 'trending_up',         colorKey: 'gold',    color: '#f57f17', label: 'ROI',             current: '340%',   goal: '400%',  progress: 85 },
  ];

  readonly roiItems = [
    { icon: 'build',      colorKey: 'danger',  color: '#c62828', label: '보수비 절감 (조기 탐지)',    val: '4,200만원/년' },
    { icon: 'bolt',       colorKey: 'warn',    color: '#e65100', label: '에너지 비용 절감 (RL HVAC)', val: '1,800만원/년' },
    { icon: 'smart_toy',  colorKey: 'accent',  color: '#7b1fa2', label: '업무 효율화 (RPA)',          val: '1,350만원/년' },
    { icon: 'savings',    colorKey: 'success', color: '#2e7d32', label: '총 연간 절감액',             val: '7,350만원/년' },
  ];

  readonly expansionSteps = [
    { phase: 1, colorKey: 'success', color: '#2e7d32', title: 'SH + GBDC 실증',  units: '2,847세대', roi: '340%',  current: true  },
    { phase: 2, colorKey: 'info',    color: '#1976d2', title: '수도권 확산',      units: '3만세대',   roi: '400%+', current: false },
    { phase: 3, colorKey: 'accent',  color: '#7b1fa2', title: 'LH 공공임대',      units: '30만세대',  roi: '500%+', current: false },
    { phase: 4, colorKey: 'warn',    color: '#e65100', title: '전국 임대주택',    units: '110만세대', roi: '600%+', current: false },
  ];

  // ── 차트 계산 ──────────────────────────────────────────────────────
  readonly gridY = [40, 80, 120, 160, 200, 240];
  private readonly chartH = 250;
  private readonly chartW = 720;
  private readonly chartX0 = 60;

  ngOnInit() {
    this.faultData.set(makeFaultForecast());
    this.energyData.set(makeEnergyData());
    this.vacancyData.set(makeVacancyRisk());
  }

  chartPoints() {
    const data = this.faultData();
    if (!data.length) return [];
    const maxVal = Math.max(...data.map(d => d.baseline)) * 1.1;
    const n = data.length;
    return data.map((d, i) => {
      const x = this.chartX0 + (i / (n - 1)) * this.chartW;
      return {
        ax: x, ay: this.chartH - (d.aiApplied / maxVal) * (this.chartH - 20) + 10,
        bx: x, by: this.chartH - (d.baseline / maxVal) * (this.chartH - 20) + 10,
      };
    });
  }

  baselinePath(): string {
    return this.chartPoints().map((p, i) => `${i === 0 ? 'M' : 'L'}${p.bx},${p.by}`).join(' ');
  }

  aiPath(): string {
    return this.chartPoints().map((p, i) => `${i === 0 ? 'M' : 'L'}${p.ax},${p.ay}`).join(' ');
  }

  ciPath(): string {
    const data = this.faultData();
    if (!data.length) return '';
    const maxVal = Math.max(...data.map(d => d.baseline)) * 1.1;
    const n = data.length;
    const toY = (v: number) => this.chartH - (v / maxVal) * (this.chartH - 20) + 10;
    const upper = data.map((d, i) => `${this.chartX0 + (i / (n - 1)) * this.chartW},${toY(d.upper)}`).join(' ');
    const lower = data.map((d, i) => `${this.chartX0 + ((n - 1 - i) / (n - 1)) * this.chartW},${toY(data[n - 1 - i].lower)}`).join(' ');
    return upper + ' ' + lower;
  }

  yLabel(svgY: number): number {
    const data = this.faultData();
    if (!data.length) return 0;
    const maxVal = Math.max(...data.map(d => d.baseline)) * 1.1;
    return Math.round((1 - (svgY - 10) / (this.chartH - 20)) * maxVal);
  }

  avgReduction(): number {
    const data = this.faultData();
    if (!data.length) return 0;
    const avg = data.reduce((s, d) => s + (1 - d.aiApplied / d.baseline), 0) / data.length;
    return Math.round(avg * 1000) / 10;
  }

  totalPrevented(): number {
    const data = this.faultData();
    return Math.round(data.reduce((s, d) => s + (d.baseline - d.aiApplied), 0));
  }

  maxEnergy(): number {
    const data = this.energyData();
    return data.length ? Math.max(...data.map(d => d.current)) * 1.05 : 400;
  }
}
