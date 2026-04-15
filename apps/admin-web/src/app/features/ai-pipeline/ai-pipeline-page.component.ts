// apps/admin-web/src/app/features/ai-pipeline/ai-pipeline-page.component.ts
// AI 데이터 파이프라인 트레이스 & 워크플로우 시각화
// 사업계획서: 6단계 AI 파이프라인 (RAW→학습→모델→분석결과→현장활용→기대효과)
// 55개 학습 데이터셋 + 9개 실제 AI 파이프라인 투명성 표시

import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { inject } from '@angular/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

/** 6단계 파이프라인 스텝 */
interface PipelineStep {
  key: string;
  label: string;
  icon: string;
  color: string;
  colorKey: string;
  desc: string;
}

/** AI 파이프라인 카드 */
interface AiPipeline {
  id: string;
  category: string;
  name: string;
  icon: string;
  color: string;
  rawData: string;
  learningData: string;
  model: string;
  result: string;
  fieldUse: string;
  effect: string;
  accuracy: string;
  status: 'active' | 'training' | 'pending';
  datasetCount: number;
}

/** 최근 AI 작업 (jobs에서 가져옴) */
interface RecentJob {
  id: string;
  name: string;
  status: 'completed' | 'active' | 'failed';
  progress: number;
  startedAt: string;
  steps: { label: string; done: boolean; active: boolean }[];
}

const PIPELINE_STEPS: PipelineStep[] = [
  { key: 'raw',    label: '① RAW 데이터',  icon: 'storage',       color: '#455a64', colorKey: 'neutral', desc: '드론이미지·IoT센서·민원텍스트·BIM도면' },
  { key: 'learn',  label: '② 학습 데이터', icon: 'dataset',       color: '#1976d2', colorKey: 'info',    desc: '라벨링·전처리·피처추출·데이터 증강' },
  { key: 'model',  label: '③ AI 모델',     icon: 'psychology',    color: '#7b1fa2', colorKey: 'accent',  desc: 'Y-MaskNet·XGBoost·KoBERT·LSTM·LLM' },
  { key: 'result', label: '④ 분석 결과',   icon: 'analytics',     color: '#e65100', colorKey: 'warn',    desc: '균열탐지·위험예측·자동분류·이상감지' },
  { key: 'field',  label: '⑤ 현장 활용',  icon: 'handyman',      color: '#2e7d32', colorKey: 'success', desc: '긴급보수·자동배정·보고서·FMS전송' },
  { key: 'effect', label: '⑥ 기대 효과',  icon: 'trending_up',   color: '#f57c00', colorKey: 'gold',    desc: '사고차단·비용절감·시간단축·만족도↑' },
];

const AI_PIPELINES: AiPipeline[] = [
  {
    id: 'P001', category: '비전 AI',
    name: '균열·누수·드라이비트 탐지',
    icon: 'image_search', color: '#1976d2',
    rawData: '드론 4K / 현장 앱 사진',
    learningData: '인스턴스 세그멘테이션 라벨 (500건+)',
    model: 'Y-MaskNet (Mask R-CNN + ResNet-101)',
    result: '결함 위치·유형·폭(mm) 자동 탐지',
    fieldUse: 'AI 결함 탐지 검토 → 결함 등록',
    effect: 'F1=0.97, mAP≥0.92, 탐지율 95%+',
    accuracy: '93.1%',
    status: 'active',
    datasetCount: 10,
  },
  {
    id: 'P002', category: 'XAI 예지정비',
    name: 'XAI 위험도 스코어링',
    icon: 'shield', color: '#c62828',
    rawData: '결함·균열·센서·민원·노후도',
    learningData: '7개 지표 라벨링 (300건)',
    model: 'XGBoost + LightGBM + SHAP',
    result: '위험도 점수 0~99 + 7지표 기여도',
    fieldUse: 'AI 예방 정비 지시서 자동 생성',
    effect: 'Accuracy 93%, 사고 차단율 94%',
    accuracy: '93%',
    status: 'active',
    datasetCount: 8,
  },
  {
    id: 'P003', category: 'NLP 민원',
    name: 'KoBERT 민원 자동 분류',
    icon: 'support_agent', color: '#7b1fa2',
    rawData: '민원 텍스트 + 사진 (80건)',
    learningData: '7종 분류 라벨 (KoBERT 피처)',
    model: 'KoBERT + GradientBoosting',
    result: '7종 분류 + 긴급도 + 배정 권고',
    fieldUse: '민원 자동 분류 → 담당자 배정',
    effect: 'Acc 0.92, F1 0.87, 배정 96% 단축',
    accuracy: '92%',
    status: 'active',
    datasetCount: 6,
  },
  {
    id: 'P004', category: 'IoT 이상탐지',
    name: 'IoT 센서 이상 감지',
    icon: 'sensors', color: '#2e7d32',
    rawData: 'IoT 5센서 720건 (30일×24h)',
    learningData: '이상 라벨 (Isolation Forest 학습)',
    model: 'AutoEncoder + Isolation Forest + 1D-CNN',
    result: '온도·습도·진동·CO·전력 이상 감지',
    fieldUse: '즉각 경보 → 환기팀 출동',
    effect: 'FP ≤5%, 이상 100% 탐지',
    accuracy: '100%',
    status: 'active',
    datasetCount: 8,
  },
  {
    id: 'P005', category: '시계열 예측',
    name: '균열 성장 예측',
    icon: 'timeline', color: '#e65100',
    rawData: '균열 측정 이력 (50균열×12월)',
    learningData: '시계열 피처 엔지니어링',
    model: 'GBR 균열 성장 + LSTM-Attention',
    result: '향후 균열폭 mm 예측 + 위험 시점',
    fieldUse: '예방적 유지보수 지시서',
    effect: 'R²=0.90, 조기탐지로 보수비 70% 절감',
    accuracy: 'R²=0.90',
    status: 'active',
    datasetCount: 5,
  },
  {
    id: 'P006', category: 'RPA 자동화',
    name: '관리비 자동화 + 이상탐지',
    icon: 'receipt_long', color: '#f57c00',
    rawData: '관리비 1,000건 (24개월)',
    learningData: '이상 패턴 피처 추출',
    model: 'Isolation Forest + Logistic Regression',
    result: '이상 청구 자동 감지 + 고지서 발행',
    fieldUse: '504세대 자동 고지서 → 연체 예측',
    effect: '이상 Acc 99.5%, 발행 시간 81% 단축',
    accuracy: '99.5%',
    status: 'active',
    datasetCount: 7,
  },
  {
    id: 'P007', category: '에너지 최적화',
    name: 'RL HVAC 에너지 최적화',
    icon: 'bolt', color: '#0288d1',
    rawData: '전력 365일 시계열',
    learningData: '시간대별 절전 구간 라벨',
    model: 'GBR 에너지 예측 + RL 제어',
    result: '최적 HVAC 제어 파라미터',
    fieldUse: '자동 에너지 절감 제어',
    effect: 'R²=0.62, 에너지 14% 절감 (1,800만원/년)',
    accuracy: 'R²=0.62',
    status: 'training',
    datasetCount: 3,
  },
  {
    id: 'P008', category: 'LLM 보고서',
    name: 'LLM + RAG 보고서 자동 생성',
    icon: 'auto_stories', color: '#455a64',
    rawData: '점검결과 + 국토부 법령',
    learningData: 'RAG 인덱스 (법령·가이드라인)',
    model: 'Claude/GPT + RAG (법령 자동 학습)',
    result: '공문서 형식 점검 보고서',
    fieldUse: '행정 보고서 자동 발송',
    effect: '작성 시간 80% 단축 (3h→36min)',
    accuracy: '–',
    status: 'active',
    datasetCount: 7,
  },
  {
    id: 'P009', category: 'Digital Twin',
    name: 'PointNet++ 3D 공간 분석',
    icon: 'view_in_ar', color: '#6a1b9a',
    rawData: 'LiDAR 점군 + BIM 설계도',
    learningData: '3D 세그멘테이션 라벨',
    model: 'PointNet++ + ICP + FEM',
    result: '건물 변위·침하·손상 3D 맵핑',
    fieldUse: 'Digital Twin 연동 (3D 뷰어)',
    effect: 'mIoU=0.88, 구조 해석 정확도 향상',
    accuracy: 'mIoU=0.88',
    status: 'pending',
    datasetCount: 6,
  },
];

@Component({
  selector: 'ax-ai-pipeline-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatIconModule, MatButtonModule, MatTabsModule,
    MatSelectModule, MatTooltipModule,
    MatProgressBarModule, MatDividerModule, MatSnackBarModule,
  ],
  template: `
    <!-- 헤더 -->
    <div class="ax-pipeline-header">
      <div class="ax-pipeline-header__left">
        <div class="ax-pipeline-header__icon-wrap">
          <mat-icon>hub</mat-icon>
          <span>AI PIPELINE</span>
        </div>
        <div>
          <h2 class="ax-pipeline-header__title">AI 데이터 파이프라인 & 워크플로우</h2>
          <p class="ax-pipeline-header__desc">6단계 파이프라인 투명성 — 55개 학습 데이터셋 · 9개 AI 파이프라인 · 25종 모델</p>
        </div>
      </div>
      <div class="ax-pipeline-header__actions">
        <button mat-stroked-button routerLink="/jobs">
          <mat-icon>pending_actions</mat-icon> 실행 중인 작업
        </button>
      </div>
    </div>

    <!-- 6단계 파이프라인 시각화 -->
    <div class="ax-pipeline-flow-panel">
      <div class="ax-pipeline-flow-panel__title">
        <mat-icon class="ax-pipeline-flow-panel__title-icon">account_tree</mat-icon>
        <span>6단계 AI 데이터 파이프라인</span>
        <span class="ax-pipeline-loop-badge">MLOps 피드백 루프</span>
      </div>
      <div class="pipeline-steps">
        @for (step of steps; track step.key; let last = $last) {
          <div class="pipeline-step ax-ps--{{ step.colorKey }}"
            [class.step-active]="activeStep() === step.key"
            (click)="activeStep.set(activeStep() === step.key ? '' : step.key)"
            [matTooltip]="step.desc">
            <mat-icon class="ax-ps__icon ax-ps__icon--{{ step.colorKey }}">{{ step.icon }}</mat-icon>
            <span class="step-label">{{ step.label }}</span>
            <span class="step-desc">{{ step.desc }}</span>
          </div>
          @if (!last) {
            <div class="step-arrow">
              <mat-icon style="color:#bbb">arrow_forward</mat-icon>
            </div>
          }
        }
      </div>
      <!-- 피드백 루프 표시 -->
      <div class="feedback-loop">
        <mat-icon style="color:#f57c00;font-size:16px">loop</mat-icon>
        <span>결과 → 재학습 (MLOps 피드백 루프) — 모델 성능 지속 개선</span>
      </div>
    </div>

    <!-- 탭 -->
    <mat-tab-group animationDuration="200ms">

      <!-- TAB 1: AI 파이프라인 카드 -->
      <mat-tab>
        <ng-template mat-tab-label>
          <mat-icon class="ax-tab-icon-mr">science</mat-icon>
          AI 파이프라인 ({{ pipelines().length }}개)
        </ng-template>

        <!-- 카테고리 필터 -->
        <div class="filter-row">
          <button mat-button
            [class.filter-active]="selectedCategory() === ''"
            (click)="selectedCategory.set('')">
            전체 ({{ pipelines().length }})
          </button>
          @for (cat of categories; track cat) {
            <button mat-button
              [class.filter-active]="selectedCategory() === cat"
              (click)="selectedCategory.set(cat)">
              {{ cat }}
            </button>
          }
        </div>

        <div class="pipeline-grid">
          @for (p of filteredPipelines(); track p.id) {
            <div class="ax-pipeline-card"
              [class.ax-pipeline-card--selected]="selectedPipeline()?.id === p.id"
              (click)="selectPipeline(p)">
              <div class="ax-pipeline-card__content">
                <div class="p-header">
                  <div class="p-icon-wrap" [style.background]="p.color + '20'">
                    <mat-icon [style.color]="p.color">{{ p.icon }}</mat-icon>
                  </div>
                  <div class="p-meta">
                    <span class="p-id">{{ p.id }}</span>
                    <span class="p-cat" [style.color]="p.color">{{ p.category }}</span>
                  </div>
                  <div class="p-status-dot"
                    [class.dot-active]="p.status === 'active'"
                    [class.dot-training]="p.status === 'training'"
                    [class.dot-pending]="p.status === 'pending'"
                    [matTooltip]="statusLabel(p.status)">
                  </div>
                </div>
                <div class="p-name">{{ p.name }}</div>
                <div class="p-accuracy">
                  <mat-icon style="font-size:12px;width:12px;height:12px;color:#2e7d32">bar_chart</mat-icon>
                  {{ p.accuracy }}
                </div>
                <div class="p-datasets">
                  <mat-icon style="font-size:12px;width:12px;height:12px;color:#1976d2">dataset</mat-icon>
                  {{ p.datasetCount }}개 데이터셋
                </div>
                <!-- 미니 6단계 흐름 -->
                <div class="p-flow">
                  @for (s of steps; track s.key) {
                    <div class="p-flow-dot" [style.background]="s.color" [matTooltip]="s.label"></div>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      </mat-tab>

      <!-- TAB 2: 파이프라인 상세 -->
      <mat-tab [disabled]="!selectedPipeline()">
        <ng-template mat-tab-label>
          <mat-icon class="ax-tab-icon-mr">account_tree</mat-icon>
          상세 분석
          @if (selectedPipeline()) {
            <span style="margin-left:4px;font-size:11px;opacity:.7">({{ selectedPipeline()!.id }})</span>
          }
        </ng-template>

        @if (selectedPipeline(); as p) {
          <div class="detail-container">
            <div class="detail-header">
              <mat-icon [style.color]="p.color" style="font-size:32px;width:32px;height:32px">{{ p.icon }}</mat-icon>
              <div>
                <h3 class="detail-header__title">{{ p.name }}</h3>
                <span class="detail-header__meta">{{ p.category }} · {{ p.id }} · 데이터셋 {{ p.datasetCount }}개</span>
              </div>
              <div class="detail-acc">
                <span class="acc-label">성능 지표</span>
                <span class="acc-val" [style.color]="p.color">{{ p.accuracy }}</span>
              </div>
            </div>

            <!-- 6단계 상세 표 -->
            <div class="step-detail-grid">
              @for (step of steps; track step.key; let i = $index) {
                <div class="step-detail-card ax-sd--{{ step.colorKey }}">
                  <div class="sd-step-badge ax-sd__badge--{{ step.colorKey }}">
                    <mat-icon style="font-size:14px;width:14px;height:14px;color:white">{{ step.icon }}</mat-icon>
                  </div>
                  <div class="sd-label">{{ step.label }}</div>
                  <div class="sd-value">{{ getPipelineStepValue(p, step.key) }}</div>
                </div>
              }
            </div>

            <!-- Human-in-the-Loop 흐름 -->
            <div class="ax-pipeline-hitl">
              <div class="ax-pipeline-hitl__hdr">
                <mat-icon style="color:var(--ax-color-info)">person_check</mat-icon>
                <strong>Human-in-the-Loop 승인 흐름</strong>
                <span class="ax-pipeline-hitl__badge">사업계획서 핵심 요구사항</span>
              </div>
              <div class="hitl-steps">
                <div class="hitl-step">
                  <div class="hs-num">1</div>
                  <div class="hs-content">
                    <strong>AI 자동 처리</strong>
                    <span>{{ p.model }} → {{ p.result }}</span>
                  </div>
                </div>
                <mat-icon class="hs-arrow">arrow_downward</mat-icon>
                <div class="hitl-step">
                  <div class="hs-num">2</div>
                  <div class="hs-content">
                    <strong>신뢰도 평가</strong>
                    <span>95%+ → 자동 승인 · 80~95% → 검토 필요 · 미만 → 수동 처리</span>
                  </div>
                </div>
                <mat-icon class="hs-arrow">arrow_downward</mat-icon>
                <div class="hitl-step">
                  <div class="hs-num">3</div>
                  <div class="hs-content">
                    <strong>담당자 검토 (APPROVE / REJECT / MODIFY)</strong>
                    <span>AI 근거 패널 확인 → 최종 결정 → 업무 반영</span>
                  </div>
                </div>
                <mat-icon class="hs-arrow">arrow_downward</mat-icon>
                <div class="hitl-step">
                  <div class="hs-num">4</div>
                  <div class="hs-content">
                    <strong>피드백 루프 (MLOps)</strong>
                    <span>결정 이력 → 재학습 데이터 → 모델 성능 지속 개선</span>
                  </div>
                </div>
              </div>
            </div>

            <div style="text-align:right;margin-top:12px">
              <button mat-raised-button color="primary" routerLink="/jobs">
                <mat-icon>pending_actions</mat-icon> 실행 이력 보기
              </button>
            </div>
          </div>
        } @else {
          <div class="select-hint">
            <mat-icon>touch_app</mat-icon>
            <p>왼쪽 탭에서 파이프라인을 선택하세요</p>
          </div>
        }
      </mat-tab>

      <!-- TAB 3: 데이터셋 현황 -->
      <mat-tab>
        <ng-template mat-tab-label>
          <mat-icon class="ax-tab-icon-mr">dataset</mat-icon>
          55개 학습 데이터셋
        </ng-template>

        <div class="dataset-section">
          @for (cat of datasetCategories; track cat.name) {
            <div class="ax-pipeline-dataset-card">
              <div class="dcat-header">
                <mat-icon [style.color]="cat.color">{{ cat.icon }}</mat-icon>
                <span class="dcat-name">{{ cat.name }}</span>
                <span class="dcat-count">{{ cat.count }}건</span>
              </div>
              <mat-progress-bar
                mode="determinate"
                [value]="(cat.count / 55) * 100"
                [style.--mdc-linear-progress-active-indicator-color]="cat.color">
              </mat-progress-bar>
              <p class="dcat-desc">{{ cat.desc }}</p>
            </div>
          }
          <div class="total-badge">
            <mat-icon style="color:#1976d2">summarize</mat-icon>
            총 <strong>55개</strong> 학습 데이터셋 · 9개 AI 파이프라인 · 25종 AI 모델
          </div>
        </div>
      </mat-tab>

    </mat-tab-group>
  `,
  styles: [`
    /* ── 탭 아이콘 margin ── */
    .ax-tab-icon-mr { margin-right: 6px; }

    /* ── 헤더 ── */
    .ax-pipeline-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: var(--ax-spacing-6, 24px);
    }
    .ax-pipeline-header__left {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-4, 16px);
    }
    .ax-pipeline-header__icon-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: linear-gradient(135deg, #1a237e, #7b1fa2);
      color: white;
      border-radius: var(--ax-radius-lg, 12px);
      padding: 10px 14px;
      gap: var(--ax-spacing-1, 4px);
    }
    .ax-pipeline-header__icon-wrap mat-icon {
      font-size: 24px; width: 24px; height: 24px;
    }
    .ax-pipeline-header__icon-wrap span {
      font-size: var(--ax-font-size-xs, 9px);
      font-weight: var(--ax-font-weight-bold, 700);
      letter-spacing: 1px;
    }
    .ax-pipeline-header__title {
      margin: 0;
      font-size: var(--ax-font-size-2xl, 22px);
      font-weight: var(--ax-font-weight-bold, 700);
      color: var(--ax-color-text-primary);
    }
    .ax-pipeline-header__desc {
      margin: 4px 0 0;
      font-size: var(--ax-font-size-xs, 12px);
      color: var(--ax-color-text-secondary, #888);
    }
    .ax-pipeline-header__actions { margin-top: 4px; }

    /* ── 파이프라인 흐름 패널 ── */
    .ax-pipeline-flow-panel {
      margin-bottom: var(--ax-spacing-6, 24px);
      background: var(--ax-color-bg-surface, #fff);
      border: 1px solid var(--ax-color-border, #e0e0e0);
      border-radius: var(--ax-radius-md, 8px);
      padding: var(--ax-spacing-5, 20px);
    }
    .ax-pipeline-flow-panel__title {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-2, 8px);
      font-size: var(--ax-font-size-sm, 14px);
      font-weight: var(--ax-font-weight-semibold, 600);
      margin-bottom: var(--ax-spacing-4, 16px);
    }
    .ax-pipeline-flow-panel__title-icon { color: var(--ax-color-info); }
    .ax-pipeline-loop-badge {
      margin-left: auto;
      font-size: var(--ax-font-size-xs, 11px);
      background: #fff3e0;
      color: var(--ax-color-warning, #e65100);
      padding: 2px 10px;
      border-radius: var(--ax-radius-full, 12px);
      font-weight: var(--ax-font-weight-semibold, 600);
    }
    .pipeline-steps {
      display: flex;
      align-items: stretch;
      gap: 4px;
      overflow-x: auto;
    }
    .pipeline-step {
      flex: 1; min-width: 110px;
      border-top: 4px solid transparent;
      border-radius: var(--ax-radius-md, 8px);
      padding: 12px 10px;
      background: var(--ax-color-bg-surface-alt, #f8f9fa);
      cursor: pointer;
      transition: box-shadow .15s, background .15s;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      text-align: center;
    }
    .pipeline-step:hover {
      background: #f0f4ff;
      box-shadow: 0 2px 8px rgba(0, 0, 0, .1);
    }
    .step-active {
      background: #e3f2fd !important;
      box-shadow: 0 2px 12px rgba(25, 118, 210, .2) !important;
    }
    .step-label {
      font-size: var(--ax-font-size-xs, 12px);
      font-weight: var(--ax-font-weight-bold, 700);
    }
    .step-desc {
      font-size: 10px;
      color: var(--ax-color-text-secondary, #888);
      line-height: 1.3;
    }
    .step-arrow { display: flex; align-items: center; padding: 0 2px; }
    .feedback-loop {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-1-5, 6px);
      margin-top: var(--ax-spacing-3, 12px);
      font-size: 11px;
      color: var(--ax-color-warning, #f57c00);
      border-top: 1px dashed #ffe0b2;
      padding-top: 10px;
    }

    /* ── Pipeline step colorKey border-top ── */
    .ax-ps--neutral { border-top-color: #455a64; }
    .ax-ps--info    { border-top-color: var(--ax-color-info); }
    .ax-ps--accent  { border-top-color: var(--ax-color-brand-accent, #6750a4); }
    .ax-ps--warn    { border-top-color: var(--ax-color-warning); }
    .ax-ps--success { border-top-color: var(--ax-color-success); }
    .ax-ps--gold    { border-top-color: #f57c00; }

    /* ── Pipeline step icon colorKey ── */
    .ax-ps__icon--neutral { color: #455a64; }
    .ax-ps__icon--info    { color: var(--ax-color-info); }
    .ax-ps__icon--accent  { color: var(--ax-color-brand-accent, #6750a4); }
    .ax-ps__icon--warn    { color: var(--ax-color-warning); }
    .ax-ps__icon--success { color: var(--ax-color-success); }
    .ax-ps__icon--gold    { color: #f57c00; }

    /* ── Step detail card colorKey border-top ── */
    .ax-sd--neutral { border-top-color: #455a64; }
    .ax-sd--info    { border-top-color: var(--ax-color-info); }
    .ax-sd--accent  { border-top-color: var(--ax-color-brand-accent, #6750a4); }
    .ax-sd--warn    { border-top-color: var(--ax-color-warning); }
    .ax-sd--success { border-top-color: var(--ax-color-success); }
    .ax-sd--gold    { border-top-color: #f57c00; }

    /* ── Step detail badge colorKey background ── */
    .ax-sd__badge--neutral { background: #455a64; }
    .ax-sd__badge--info    { background: var(--ax-color-info); }
    .ax-sd__badge--accent  { background: var(--ax-color-brand-accent, #6750a4); }
    .ax-sd__badge--warn    { background: var(--ax-color-warning); }
    .ax-sd__badge--success { background: var(--ax-color-success); }
    .ax-sd__badge--gold    { background: #f57c00; }

    /* ── 필터 ── */
    .filter-row {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      margin: var(--ax-spacing-4, 16px) 0;
    }
    .filter-row button { font-size: var(--ax-font-size-xs, 12px); }
    .filter-active {
      background: #e3f2fd !important;
      color: var(--ax-color-info, #1976d2) !important;
      font-weight: var(--ax-font-weight-bold, 700) !important;
    }

    /* ── 파이프라인 카드 그리드 ── */
    .pipeline-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: var(--ax-spacing-3, 12px);
    }
    .ax-pipeline-card {
      background: var(--ax-color-bg-surface, #fff);
      border: 1px solid var(--ax-color-border, #e0e0e0);
      border-radius: var(--ax-radius-md, 8px);
      cursor: pointer;
      transition: box-shadow .15s, transform .1s;
    }
    .ax-pipeline-card:hover {
      box-shadow: 0 4px 16px rgba(0, 0, 0, .1);
      transform: translateY(-2px);
    }
    .ax-pipeline-card--selected {
      box-shadow: 0 4px 16px rgba(25, 118, 210, .25) !important;
      border: 1px solid var(--ax-color-info, #1976d2);
    }
    .ax-pipeline-card__content { padding: var(--ax-spacing-4, 16px); }
    .p-header { display: flex; align-items: center; gap: var(--ax-spacing-2, 8px); margin-bottom: 10px; }
    .p-icon-wrap {
      width: 36px; height: 36px;
      border-radius: var(--ax-radius-md, 8px);
      display: flex; align-items: center; justify-content: center;
    }
    .p-meta { flex: 1; display: flex; flex-direction: column; }
    .p-id { font-size: 10px; color: var(--ax-color-text-tertiary, #aaa); }
    .p-cat { font-size: 11px; font-weight: var(--ax-font-weight-bold, 700); }
    .p-status-dot { width: 10px; height: 10px; border-radius: 50%; }
    .dot-active   { background: var(--ax-color-success, #2e7d32); animation: pulse-green 2s infinite; }
    .dot-training { background: var(--ax-color-warning, #f57c00); animation: pulse-orange 1.5s infinite; }
    .dot-pending  { background: #bbb; }
    @keyframes pulse-green  { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }
    @keyframes pulse-orange { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }
    .p-name {
      font-size: var(--ax-font-size-sm, 13px);
      font-weight: var(--ax-font-weight-semibold, 600);
      margin-bottom: 6px;
    }
    .p-accuracy {
      font-size: 11px;
      color: var(--ax-color-success, #2e7d32);
      display: flex; align-items: center; gap: 3px; margin-bottom: 2px;
    }
    .p-datasets {
      font-size: 11px;
      color: var(--ax-color-info, #1976d2);
      display: flex; align-items: center; gap: 3px; margin-bottom: 8px;
    }
    .p-flow { display: flex; gap: 3px; }
    .p-flow-dot { width: 10px; height: 10px; border-radius: 50%; opacity: .7; }

    /* ── 상세 ── */
    .detail-container { padding: var(--ax-spacing-4, 16px) 0; }
    .detail-header {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-4, 16px);
      margin-bottom: var(--ax-spacing-5, 20px);
    }
    .detail-header__title {
      margin: 0;
      color: var(--ax-color-text-primary);
    }
    .detail-header__meta {
      font-size: var(--ax-font-size-xs, 12px);
      color: var(--ax-color-text-secondary, #888);
    }
    .detail-acc { margin-left: auto; text-align: right; }
    .acc-label {
      display: block;
      font-size: 10px;
      color: var(--ax-color-text-tertiary, #999);
    }
    .acc-val { font-size: 24px; font-weight: var(--ax-font-weight-bold, 800); }
    .step-detail-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 10px;
      margin-bottom: var(--ax-spacing-5, 20px);
    }
    .step-detail-card {
      border-top: 4px solid transparent;
      border-radius: var(--ax-radius-md, 8px);
      background: var(--ax-color-bg-surface-alt, #f8f9fa);
      padding: var(--ax-spacing-3, 12px);
    }
    .sd-step-badge {
      width: 24px; height: 24px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 6px;
    }
    .sd-label {
      font-size: 10px;
      font-weight: var(--ax-font-weight-bold, 700);
      color: var(--ax-color-text-secondary, #666);
      margin-bottom: 4px;
    }
    .sd-value {
      font-size: 11px;
      color: var(--ax-color-text-primary, #333);
      line-height: 1.4;
    }

    /* ── Human-in-the-Loop ── */
    .ax-pipeline-hitl {
      background: #f0f7ff;
      border: 1px solid var(--ax-color-border, #e0e0e0);
      border-radius: var(--ax-radius-md, 8px);
      padding: var(--ax-spacing-4, 16px);
    }
    .ax-pipeline-hitl__hdr {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-2, 8px);
      margin-bottom: var(--ax-spacing-3, 12px);
      font-size: var(--ax-font-size-sm, 14px);
    }
    .ax-pipeline-hitl__badge {
      margin-left: auto;
      font-size: 10px;
      background: #e3f2fd;
      color: var(--ax-color-info, #1976d2);
      padding: 2px 8px;
      border-radius: var(--ax-radius-full, 10px);
    }
    .hitl-steps { display: flex; flex-direction: column; gap: 0; }
    .hitl-step {
      display: flex;
      gap: var(--ax-spacing-3, 12px);
      align-items: flex-start;
      padding: 8px 0;
    }
    .hs-num {
      width: 24px; height: 24px;
      border-radius: 50%;
      background: var(--ax-color-info, #1976d2);
      color: white;
      font-size: var(--ax-font-size-xs, 12px);
      font-weight: var(--ax-font-weight-bold, 700);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .hs-content { display: flex; flex-direction: column; gap: 2px; }
    .hs-content strong { font-size: var(--ax-font-size-sm, 13px); }
    .hs-content span { font-size: 11px; color: var(--ax-color-text-secondary, #666); }
    .hs-arrow {
      color: var(--ax-color-info, #1976d2);
      margin-left: 12px;
      font-size: 18px; width: 18px; height: 18px;
    }

    .select-hint { text-align: center; padding: 60px; color: #bbb; }
    .select-hint mat-icon {
      font-size: 48px; width: 48px; height: 48px;
      display: block; margin: 0 auto 12px;
    }

    /* ── 데이터셋 ── */
    .dataset-section {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--ax-spacing-3, 12px);
      padding: var(--ax-spacing-4, 16px) 0;
    }
    .ax-pipeline-dataset-card {
      background: var(--ax-color-bg-surface, #fff);
      border: 1px solid var(--ax-color-border, #e0e0e0);
      border-radius: var(--ax-radius-md, 8px);
      padding: var(--ax-spacing-4, 16px);
    }
    .dcat-header {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-2, 8px);
      margin-bottom: 8px;
    }
    .dcat-name { flex: 1; font-weight: var(--ax-font-weight-semibold, 600); font-size: var(--ax-font-size-sm, 13px); }
    .dcat-count { font-size: 18px; font-weight: var(--ax-font-weight-bold, 800); }
    .dcat-desc { font-size: 11px; color: var(--ax-color-text-secondary, #888); margin: 8px 0 0; }
    .total-badge {
      grid-column: 1 / -1;
      text-align: center;
      font-size: var(--ax-font-size-sm, 14px);
      color: var(--ax-color-text-secondary, #555);
      padding: var(--ax-spacing-4, 16px);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--ax-spacing-2, 8px);
    }
  `],
})
export class AiPipelinePageComponent implements OnInit {
  private readonly snackBar = inject(MatSnackBar);

  readonly steps = PIPELINE_STEPS;
  readonly pipelines = signal<AiPipeline[]>(AI_PIPELINES);
  readonly selectedPipeline = signal<AiPipeline | null>(null);
  readonly selectedCategory = signal('');
  readonly activeStep = signal('');

  readonly categories = [...new Set(AI_PIPELINES.map((p) => p.category))];

  readonly filteredPipelines = computed(() => {
    const cat = this.selectedCategory();
    if (!cat) return this.pipelines();
    return this.pipelines().filter((p) => p.category === cat);
  });

  readonly datasetCategories = [
    { name: '비전 AI — 이미지', icon: 'image', color: '#1976d2', count: 10,
      desc: '드론·앱 촬영 균열·누수·드라이비트·박락·야간 영상 10종' },
    { name: 'IoT 센서 · LiDAR', icon: 'sensors', color: '#2e7d32', count: 8,
      desc: '온도·CO·진동·습도·전력·LiDAR 3D 점군·SLAM 변위' },
    { name: '공공임대 민원 NLP', icon: 'support_agent', color: '#7b1fa2', count: 6,
      desc: '텍스트 분류·긴급도·담당자 배정·감성분석·사진 분류·예측' },
    { name: 'Digital Twin', icon: 'view_in_ar', color: '#6a1b9a', count: 6,
      desc: 'BIM 설계·FEM 구조해석·에너지 최적화·화재 시뮬레이션' },
    { name: '실시간 이상 징후', icon: 'warning', color: '#c62828', count: 5,
      desc: '다중 센서 융합 이상 탐지·공기질·균열 급진전·가스·집수정' },
    { name: '선제 탐지 (시계열)', icon: 'timeline', color: '#e65100', count: 5,
      desc: '균열·배관·승강기·옥상·계절별 선제 탐지 시계열 예측' },
    { name: 'RPA 행정 자동화', icon: 'smart_toy', color: '#f57c00', count: 7,
      desc: '관리비·계약·시설물 대장·민원 배정·보고서·연체·HVAC 7종' },
    { name: '예방조치 · 예측', icon: 'shield', color: '#0288d1', count: 5,
      desc: 'XAI 위험도·드라이비트·누수·GPR·종합 의사결정 5종' },
    { name: '대시보드 · KPI 분석', icon: 'bar_chart', color: '#455a64', count: 3,
      desc: '운영 KPI·Vision 2030 예측·AI 도입 전후 비교 3종' },
  ];

  ngOnInit() {}

  selectPipeline(p: AiPipeline): void {
    this.selectedPipeline.set(p);
  }

  getPipelineStepValue(p: AiPipeline, stepKey: string): string {
    const map: Record<string, keyof AiPipeline> = {
      raw: 'rawData', learn: 'learningData', model: 'model',
      result: 'result', field: 'fieldUse', effect: 'effect',
    };
    return String(p[map[stepKey]] ?? '–');
  }

  statusLabel(s: string): string {
    return { active: '운영 중', training: '학습 중', pending: '준비 중' }[s] ?? s;
  }
}
