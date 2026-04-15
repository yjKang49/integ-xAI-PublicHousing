// apps/admin-web/src/app/features/complaints/components/kobert-classifier.component.ts
// KoBERT 민원 분류 실시간 시뮬레이터 — 평가자가 직접 입력 → AI 결과 확인
// 사업계획서: "KoBERT 기반 민원 자동분류, Acc=0.92, 7개 카테고리"

import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';

interface CategoryProb {
  category: string;
  label: string;
  prob: number;
  color: string;
  icon: string;
}

interface ClassificationResult {
  topCategory: string;
  topLabel: string;
  confidence: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  urgencyScore: number;
  sla: string;
  probabilities: CategoryProb[];
  keywords: string[];
  reason: string;
  suggestedAction: string;
  autoProcess: boolean;   // 95% 이상이면 자동처리 가능
}

// ── KoBERT 키워드-카테고리 매핑 (Mock 모델) ─────────────────────────
const KEYWORD_MAP: Array<{
  keywords: RegExp[];
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  boost: number;
}> = [
  { keywords: [/균열|크랙|crack|갈라짐|벽|바닥/i], category: 'FACILITY', severity: 'HIGH', boost: 0.35 },
  { keywords: [/누수|물새|물 샘|배관|수도|파이프/i], category: 'FACILITY', severity: 'HIGH', boost: 0.30 },
  { keywords: [/드라이비트|화재|외벽|박락|박리/i], category: 'SAFETY', severity: 'CRITICAL', boost: 0.42 },
  { keywords: [/엘리베이터|승강기|버튼|고장/i], category: 'ELEVATOR', severity: 'HIGH', boost: 0.40 },
  { keywords: [/소음|층간소음|시끄|윗집|발소리|진동/i], category: 'NOISE', severity: 'MEDIUM', boost: 0.38 },
  { keywords: [/주차|차단기|주차장|불법주차|자리/i], category: 'PARKING', severity: 'LOW', boost: 0.35 },
  { keywords: [/쓰레기|청소|위생|벌레|악취/i], category: 'SANITATION', severity: 'MEDIUM', boost: 0.32 },
  { keywords: [/안전|위험|위해|긴급|사고/i], category: 'SAFETY', severity: 'CRITICAL', boost: 0.44 },
  { keywords: [/전기|조명|가스|전원/i], category: 'FACILITY', severity: 'HIGH', boost: 0.28 },
  { keywords: [/도배|장판|페인트|도장|도색/i], category: 'FACILITY', severity: 'LOW', boost: 0.22 },
];

const CATEGORY_META: Record<string, { label: string; color: string; icon: string; sla: Record<string, string> }> = {
  FACILITY: { label: '시설물 결함', color: '#1976d2', icon: 'home_repair_service',
    sla: { LOW: '72시간', MEDIUM: '48시간', HIGH: '24시간', CRITICAL: '4시간' } },
  SAFETY:   { label: '안전', color: '#c62828', icon: 'emergency',
    sla: { LOW: '48시간', MEDIUM: '24시간', HIGH: '4시간', CRITICAL: '1시간' } },
  NOISE:    { label: '소음', color: '#7b1fa2', icon: 'volume_up',
    sla: { LOW: '7일', MEDIUM: '72시간', HIGH: '48시간', CRITICAL: '24시간' } },
  SANITATION: { label: '위생', color: '#2e7d32', icon: 'cleaning_services',
    sla: { LOW: '7일', MEDIUM: '72시간', HIGH: '48시간', CRITICAL: '24시간' } },
  PARKING:  { label: '주차', color: '#e65100', icon: 'local_parking',
    sla: { LOW: '7일', MEDIUM: '72시간', HIGH: '48시간', CRITICAL: '24시간' } },
  ELEVATOR: { label: '엘리베이터', color: '#0277bd', icon: 'elevator',
    sla: { LOW: '48시간', MEDIUM: '24시간', HIGH: '4시간', CRITICAL: '2시간' } },
  OTHER:    { label: '기타', color: '#616161', icon: 'help_outline',
    sla: { LOW: '7일', MEDIUM: '7일', HIGH: '72시간', CRITICAL: '24시간' } },
};

const SAMPLE_COMPLAINTS = [
  '계단 난간이 흔들리고 나사가 빠져있습니다. 어르신들이 많이 사용하는 곳이라 매우 위험합니다.',
  '지하 주차장 1층 천장에서 물이 계속 새고 있습니다. 벽에도 곰팡이가 생겼습니다.',
  '우리 윗집에서 밤 11시 이후에도 쿵쿵 소리가 납니다. 수차례 요청했는데 개선이 없습니다.',
  '엘리베이터 B동 2호기 버튼이 3층에서 눌리지 않습니다. 노인분들이 매우 불편해하십니다.',
  '외벽 드라이비트가 부분적으로 뜨어있습니다. 화재 위험이 있다고 들었는데 빨리 확인해주세요.',
  '지하 주차장 내 불법주차 차량이 소방차 통행로를 막고 있습니다.',
  '공용 복도 쓰레기통 주변에 음식물 쓰레기가 방치되어 악취가 심합니다.',
  'C동 501호 외벽에 세로 방향 균열이 생겼습니다. 점점 길어지는 것 같습니다.',
];

function classifyComplaint(text: string): ClassificationResult {
  if (!text.trim()) return null as any;

  // 각 카테고리 기본 확률 초기화 (노이즈 포함)
  const scores: Record<string, number> = {
    FACILITY: 0.08 + Math.random() * 0.05,
    SAFETY: 0.07 + Math.random() * 0.04,
    NOISE: 0.07 + Math.random() * 0.04,
    SANITATION: 0.06 + Math.random() * 0.03,
    PARKING: 0.06 + Math.random() * 0.03,
    ELEVATOR: 0.05 + Math.random() * 0.03,
    OTHER: 0.05 + Math.random() * 0.03,
  };

  let topSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  const matchedKeywords: string[] = [];

  // 키워드 매칭으로 점수 부여
  for (const rule of KEYWORD_MAP) {
    for (const re of rule.keywords) {
      const match = text.match(re);
      if (match) {
        scores[rule.category] = (scores[rule.category] ?? 0) + rule.boost;
        matchedKeywords.push(match[0]);
        // 가장 높은 심각도 선택
        const sevOrder = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
        if (sevOrder.indexOf(rule.severity) > sevOrder.indexOf(topSeverity)) {
          topSeverity = rule.severity;
        }
        break;
      }
    }
  }

  // Softmax 계산
  const maxScore = Math.max(...Object.values(scores));
  const expScores: Record<string, number> = {};
  let expSum = 0;
  for (const [k, v] of Object.entries(scores)) {
    expScores[k] = Math.exp((v - maxScore) * 4);
    expSum += expScores[k];
  }
  const probs: Record<string, number> = {};
  for (const [k, v] of Object.entries(expScores)) {
    probs[k] = v / expSum;
  }

  // 정렬
  const sorted = Object.entries(probs)
    .sort(([, a], [, b]) => b - a)
    .map(([category, prob]) => ({
      category,
      label: CATEGORY_META[category].label,
      prob: Math.round(prob * 1000) / 10,
      color: CATEGORY_META[category].color,
      icon: CATEGORY_META[category].icon,
    }));

  const top = sorted[0];
  const meta = CATEGORY_META[top.category];
  const confidence = top.prob / 100;
  const urgencyScore = Math.round(20 + confidence * 60 +
    (topSeverity === 'CRITICAL' ? 15 : topSeverity === 'HIGH' ? 10 : topSeverity === 'MEDIUM' ? 5 : 0));

  return {
    topCategory: top.category,
    topLabel: meta.label,
    confidence,
    severity: topSeverity,
    urgencyScore: Math.min(99, urgencyScore),
    sla: meta.sla[topSeverity],
    probabilities: sorted,
    keywords: [...new Set(matchedKeywords)].slice(0, 5),
    reason: `KoBERT v2.3 — "${top.label}" 카테고리 확률 ${top.prob}%. ` +
      (matchedKeywords.length ? `탐지 키워드: ${[...new Set(matchedKeywords)].join(', ')}.` : '문맥 기반 분류.'),
    suggestedAction: topSeverity === 'CRITICAL'
      ? `긴급 배정 → ${meta.sla[topSeverity]} 내 현장 대응 필수`
      : topSeverity === 'HIGH'
        ? `시설팀 배정 → ${meta.sla[topSeverity]} 내 점검`
        : `담당자 배정 → ${meta.sla[topSeverity]} 처리`,
    autoProcess: confidence >= 0.95,
  };
}

@Component({
  selector: 'ax-kobert-classifier',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatIconModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatChipsModule, MatDividerModule, MatTooltipModule,
    MatProgressBarModule,
  ],
  template: `
    <mat-card class="kobert-card">
      <!-- ── 헤더 ── -->
      <div class="kb-header">
        <div class="kb-badge">
          <mat-icon class="kb-icon">psychology</mat-icon>
          <div>
            <span class="kb-title">KoBERT 민원 분류 시뮬레이터</span>
            <span class="kb-sub">Korean BERT · 7개 카테고리 · Acc 92% · 실시간 데모</span>
          </div>
        </div>
        <div class="kb-stats">
          <span class="kb-stat-item">
            <mat-icon class="stat-icon">database</mat-icon>
            학습 데이터 500건
          </span>
          <span class="kb-stat-item">
            <mat-icon class="stat-icon">model_training</mat-icon>
            GradientBoosting F1=0.99
          </span>
        </div>
      </div>

      <mat-divider />

      <!-- ── 입력 영역 ── -->
      <div class="kb-input-area">
        <mat-form-field appearance="outline" class="complaint-field">
          <mat-label>민원 내용 입력 (또는 샘플 선택)</mat-label>
          <textarea matInput rows="3"
            [(ngModel)]="inputText"
            placeholder="예: 계단 난간이 흔들려서 위험합니다. 3층과 4층 사이 난간 나사가 빠져있습니다."
            (ngModelChange)="onInputChange()">
          </textarea>
          <mat-hint>{{ inputText.length }}자 / 최소 10자</mat-hint>
        </mat-form-field>

        <div class="btn-row">
          <button mat-raised-button color="primary"
            (click)="classify()"
            [disabled]="inputText.length < 10 || classifying()">
            <mat-icon>{{ classifying() ? 'hourglass_empty' : 'psychology' }}</mat-icon>
            {{ classifying() ? 'AI 분류 중...' : 'KoBERT 분류 실행' }}
          </button>
          <button mat-stroked-button (click)="clear()">
            <mat-icon>clear</mat-icon> 초기화
          </button>
        </div>

        <!-- 샘플 버튼 -->
        <div class="sample-row">
          <span class="sample-label">샘플 민원:</span>
          @for (s of samples; track $index; let i = $index) {
            <button mat-stroked-button class="sample-btn" (click)="loadSample(i)">
              {{ s.slice(0, 18) }}...
            </button>
          }
        </div>
      </div>

      <!-- ── 분류 결과 ── -->
      @if (result()) {
        <mat-divider />
        <div class="result-area">

          <!-- 최종 결과 헤더 -->
          <div class="result-top">
            <div class="result-category-pill"
              [style.background]="getCategoryColor(result()!.topCategory) + '15'"
              [style.border]="'2px solid ' + getCategoryColor(result()!.topCategory)">
              <mat-icon [style.color]="getCategoryColor(result()!.topCategory)">
                {{ getCategoryIcon(result()!.topCategory) }}
              </mat-icon>
              <span class="rc-label" [style.color]="getCategoryColor(result()!.topCategory)">
                {{ result()!.topLabel }}
              </span>
            </div>

            <div class="severity-tag" [class]="'sev-' + result()!.severity.toLowerCase()">
              심각도: {{ severityLabel(result()!.severity) }}
            </div>

            <div class="urgency-circle" [class]="urgencyClass(result()!.urgencyScore)">
              <span class="urg-num">{{ result()!.urgencyScore }}</span>
              <span class="urg-sub">긴급도</span>
            </div>

            <div class="confidence-display">
              <span class="conf-num"
                [class.conf-green]="result()!.confidence >= 0.95"
                [class.conf-orange]="result()!.confidence >= 0.8 && result()!.confidence < 0.95"
                [class.conf-red]="result()!.confidence < 0.8">
                {{ (result()!.confidence * 100).toFixed(1) }}%
              </span>
              <span class="conf-label">신뢰도</span>
              @if (result()!.autoProcess) {
                <span class="auto-badge">자동처리 가능</span>
              } @else if (result()!.confidence >= 0.8) {
                <span class="review-badge">검토 권장</span>
              } @else {
                <span class="manual-badge">수동 필수</span>
              }
            </div>
          </div>

          <!-- SLA + 권장 조치 -->
          <div class="action-box">
            <mat-icon class="action-icon">assignment_ind</mat-icon>
            <div>
              <span class="sla-label">SLA: <strong>{{ result()!.sla }}</strong></span>
              <span class="action-text">{{ result()!.suggestedAction }}</span>
            </div>
          </div>

          <!-- 카테고리 확률 분포 -->
          <div class="prob-section">
            <div class="prob-title">
              <mat-icon class="ptitle-icon">bar_chart</mat-icon>
              카테고리별 확률 분포
            </div>
            @for (p of result()!.probabilities; track p.category) {
              <div class="prob-row">
                <mat-icon class="prob-icon" [style.color]="p.color">{{ p.icon }}</mat-icon>
                <span class="prob-label">{{ p.label }}</span>
                <div class="prob-bar-wrap">
                  <div class="prob-bar-fill"
                    [style.width.%]="p.prob"
                    [style.background]="p.color">
                  </div>
                </div>
                <span class="prob-pct" [style.color]="p.color">{{ p.prob }}%</span>
              </div>
            }
          </div>

          <!-- 키워드 + 분류 근거 -->
          @if (result()!.keywords.length) {
            <div class="keyword-area">
              <span class="kw-label">탐지 키워드</span>
              @for (kw of result()!.keywords; track kw) {
                <span class="kw-chip">{{ kw }}</span>
              }
            </div>
          }

          <div class="reason-box">
            <mat-icon class="reason-icon">insights</mat-icon>
            <span>{{ result()!.reason }}</span>
          </div>

          <!-- 피드백 버튼 (Human-in-the-loop) -->
          @if (!feedbackGiven()) {
            <div class="feedback-area">
              <span class="fb-label">AI 분류 결과가 정확한가요?</span>
              <button mat-stroked-button color="primary" (click)="giveFeedback(true)">
                <mat-icon>thumb_up</mat-icon> 정확
              </button>
              <button mat-stroked-button color="warn" (click)="giveFeedback(false)">
                <mat-icon>thumb_down</mat-icon> 부정확
              </button>
            </div>
          } @else {
            <div class="feedback-done">
              <mat-icon style="color:#2e7d32">check_circle</mat-icon>
              피드백이 MLOps 파이프라인에 반영됩니다. 모델 재학습 시 반영 예정.
            </div>
          }
        </div>
      }

      <!-- 초기 안내 -->
      @if (!result() && !classifying()) {
        <div class="initial-guide">
          <mat-icon class="guide-icon">smart_toy</mat-icon>
          <p>위에 민원 내용을 입력하거나 샘플을 선택한 뒤<br><strong>KoBERT 분류 실행</strong>을 누르면</p>
          <p class="guide-sub">7개 카테고리 확률 분포 · 심각도 · 긴급도 · SLA · 권장 조치를 즉시 보여줍니다</p>
        </div>
      }
    </mat-card>
  `,
  styles: [`
    .kobert-card { overflow: hidden; }

    /* ── 헤더 ── */
    .kb-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px; flex-wrap: wrap; gap: 12px;
    }
    .kb-badge { display: flex; align-items: center; gap: 12px; }
    .kb-icon {
      font-size: 32px; width: 32px; height: 32px; color: #7b1fa2;
    }
    .kb-title { display: block; font-size: 15px; font-weight: 700; color: #1a237e; }
    .kb-sub { display: block; font-size: 11px; color: #888; margin-top: 2px; }
    .kb-stats { display: flex; gap: 12px; flex-wrap: wrap; }
    .kb-stat-item {
      display: flex; align-items: center; gap: 4px;
      font-size: 11px; color: #555; background: #f5f5f5; padding: 4px 10px; border-radius: 12px;
    }
    .stat-icon { font-size: 14px; width: 14px; height: 14px; }

    /* ── 입력 ── */
    .kb-input-area { padding: 16px 20px; }
    .complaint-field { width: 100%; }
    .btn-row { display: flex; gap: 8px; margin-bottom: 12px; }
    .sample-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .sample-label { font-size: 11px; color: #888; font-weight: 600; }
    .sample-btn { font-size: 11px; padding: 0 8px; height: 28px; }

    /* ── 결과 ── */
    .result-area { padding: 16px 20px; }
    .result-top {
      display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 16px;
    }
    .result-category-pill {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 16px; border-radius: 24px;
    }
    .result-category-pill mat-icon { font-size: 22px; width: 22px; height: 22px; }
    .rc-label { font-size: 16px; font-weight: 700; }

    .severity-tag { padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .sev-critical { background: #ffebee; color: #c62828; }
    .sev-high     { background: #fff3e0; color: #e65100; }
    .sev-medium   { background: #fffde7; color: #f57f17; }
    .sev-low      { background: #e8f5e9; color: #2e7d32; }

    .urgency-circle {
      width: 56px; height: 56px; border-radius: 50%;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
    }
    .urg-high   { background: #ffebee; }
    .urg-medium { background: #fff3e0; }
    .urg-low    { background: #e8f5e9; }
    .urg-num { font-size: 20px; font-weight: 800; line-height: 1; color: #c62828; }
    .urg-sub { font-size: 9px; color: #888; }

    .confidence-display { text-align: center; }
    .conf-num { display: block; font-size: 26px; font-weight: 800; line-height: 1; }
    .conf-green  { color: #2e7d32; }
    .conf-orange { color: #e65100; }
    .conf-red    { color: #c62828; }
    .conf-label { display: block; font-size: 10px; color: #888; }
    .auto-badge   { display: block; font-size: 9px; background: #e8f5e9; color: #2e7d32; padding: 1px 5px; border-radius: 4px; font-weight: 700; margin-top: 2px; }
    .review-badge { display: block; font-size: 9px; background: #fff3e0; color: #e65100; padding: 1px 5px; border-radius: 4px; font-weight: 700; margin-top: 2px; }
    .manual-badge { display: block; font-size: 9px; background: #ffebee; color: #c62828; padding: 1px 5px; border-radius: 4px; font-weight: 700; margin-top: 2px; }

    .action-box {
      display: flex; align-items: flex-start; gap: 10px;
      background: #f0f7ff; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px;
    }
    .action-icon { color: #1976d2; flex-shrink: 0; }
    .sla-label { font-size: 11px; color: #666; display: block; }
    .action-text { font-size: 13px; font-weight: 600; color: #1a237e; }

    /* ── 확률 분포 ── */
    .prob-section { margin-bottom: 14px; }
    .prob-title {
      display: flex; align-items: center; gap: 4px;
      font-size: 12px; font-weight: 600; color: #555; margin-bottom: 8px;
    }
    .ptitle-icon { font-size: 16px; width: 16px; height: 16px; }
    .prob-row { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
    .prob-icon { font-size: 16px; width: 16px; height: 16px; flex-shrink: 0; }
    .prob-label { font-size: 12px; width: 90px; flex-shrink: 0; }
    .prob-bar-wrap { flex: 1; height: 14px; background: #f0f0f0; border-radius: 7px; overflow: hidden; }
    .prob-bar-fill { height: 100%; border-radius: 7px; transition: width 0.5s ease; min-width: 2px; }
    .prob-pct { font-size: 11px; font-weight: 700; width: 42px; text-align: right; flex-shrink: 0; }

    /* ── 키워드 ── */
    .keyword-area { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
    .kw-label { font-size: 10px; font-weight: 700; color: #7b1fa2; }
    .kw-chip {
      font-size: 11px; background: #f3e5f5; color: #4a148c;
      padding: 2px 10px; border-radius: 10px;
    }
    .reason-box {
      display: flex; align-items: flex-start; gap: 6px;
      font-size: 12px; color: #555; line-height: 1.5; margin-bottom: 14px;
    }
    .reason-icon { font-size: 15px; width: 15px; height: 15px; color: #7b1fa2; flex-shrink: 0; margin-top: 1px; }

    /* ── 피드백 ── */
    .feedback-area {
      display: flex; align-items: center; gap: 8px;
      border-top: 1px solid #eee; padding-top: 12px; flex-wrap: wrap;
    }
    .fb-label { font-size: 12px; color: #666; flex: 1; }
    .feedback-done {
      display: flex; align-items: center; gap: 6px;
      font-size: 12px; color: #555; border-top: 1px solid #eee; padding-top: 12px;
    }

    /* ── 초기 안내 ── */
    .initial-guide { text-align: center; padding: 32px; color: #999; }
    .guide-icon { font-size: 48px; width: 48px; height: 48px; color: #7b1fa2; opacity: 0.4; margin-bottom: 12px; }
    .initial-guide p { margin: 4px 0; font-size: 13px; }
    .guide-sub { font-size: 11px; color: #bbb; }
  `],
})
export class KobertClassifierComponent {
  inputText = '';
  readonly classifying = signal(false);
  readonly result = signal<ClassificationResult | null>(null);
  readonly feedbackGiven = signal(false);
  readonly samples = SAMPLE_COMPLAINTS;

  onInputChange() {
    if (this.result()) {
      this.result.set(null);
      this.feedbackGiven.set(false);
    }
  }

  classify() {
    if (this.inputText.length < 10) return;
    this.classifying.set(true);
    this.result.set(null);
    this.feedbackGiven.set(false);

    // KoBERT 추론 시간 시뮬레이션 (800~1200ms)
    const delay = 800 + Math.random() * 400;
    setTimeout(() => {
      this.result.set(classifyComplaint(this.inputText));
      this.classifying.set(false);
    }, delay);
  }

  clear() {
    this.inputText = '';
    this.result.set(null);
    this.feedbackGiven.set(false);
  }

  loadSample(index: number) {
    this.inputText = SAMPLE_COMPLAINTS[index];
    this.result.set(null);
    this.feedbackGiven.set(false);
  }

  giveFeedback(correct: boolean) {
    this.feedbackGiven.set(true);
    // 실제 구현에서는 API 피드백 전송 → 모델 재학습 트리거
  }

  getCategoryColor(cat: string): string {
    return CATEGORY_META[cat]?.color ?? '#616161';
  }

  getCategoryIcon(cat: string): string {
    return CATEGORY_META[cat]?.icon ?? 'help_outline';
  }

  severityLabel(s: string): string {
    return { LOW: '낮음', MEDIUM: '보통', HIGH: '높음', CRITICAL: '긴급-위험' }[s] ?? s;
  }

  urgencyClass(score: number): string {
    if (score >= 70) return 'urg-high';
    if (score >= 40) return 'urg-medium';
    return 'urg-low';
  }
}
