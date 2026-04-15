// apps/admin-web/src/app/features/ai-inbox/ai-inbox-page.component.ts
// AI 통합 검토 수신함 — Human-in-the-loop 승인 대기 항목 통합 관리
// KoBERT 민원 분류 · XAI 위험도 스코어 · Y-MaskNet 결함 탐지 · LLM 진단의견

import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent, severityToVariant } from '../../shared/components/status-badge/status-badge.component';
import { AiConfidenceChipComponent } from '../../shared/components/ai-confidence-chip/ai-confidence-chip.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

// ── 타입 (기존 유지) ──────────────────────────────────────────────────────────
type ReviewDecision = 'APPROVED' | 'REJECTED' | 'MODIFIED' | 'PENDING';

interface InboxItem {
  id: string;
  type: 'COMPLAINT_TRIAGE' | 'DIAGNOSIS' | 'RISK_SCORE' | 'CRACK_ANALYSIS' | 'DETECTION';
  typeLabel: string;
  typeIcon: string;
  typeColor: string;
  title: string;
  subtitle: string;
  aiModel: string;
  confidence: number;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: ReviewDecision;
  aiDecision: string;
  aiReason: string;
  shapFactors?: string[];
  suggestedAction: string;
  createdAt: Date;
  targetRoute?: string;
  building?: string;
}

// ── 목 데이터 (기존 유지) ─────────────────────────────────────────────────────
function makeInboxItems(): InboxItem[] {
  const now = new Date();
  const hAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);
  return [
    { id:'triage-001', type:'COMPLAINT_TRIAGE', typeLabel:'민원 AI 분류', typeIcon:'support_agent', typeColor:'#7b1fa2',
      title:'계단 난간 흔들림 위험 — 강남 SH 5단지 B동', subtitle:'민원 #C-2026-1142 · 접수 2시간 전',
      aiModel:'KoBERT v2.3 (Acc 92%)', confidence:0.94, urgency:'HIGH', status:'PENDING',
      aiDecision:'카테고리: 안전(SAFETY) · 우선순위: HIGH · SLA: 4시간',
      aiReason:'KoBERT attention — "난간 흔들림", "위험" 키워드 고가중치. 안전 카테고리 확률 94%, 시설물 결함 4%, 기타 2%.',
      shapFactors:['키워드: 난간(+0.42)','키워드: 흔들림(+0.31)','시간대: 오전(+0.08)','동: B동(+0.05)'],
      suggestedAction:'시설팀 즉시 배정 → 4시간 내 현장 확인 지시', createdAt:hAgo(2), targetRoute:'/complaints', building:'강남 SH 5단지' },
    { id:'triage-002', type:'COMPLAINT_TRIAGE', typeLabel:'민원 AI 분류', typeIcon:'support_agent', typeColor:'#7b1fa2',
      title:'지하 주차장 조명 깜박임 — 노원 SH 2단지', subtitle:'민원 #C-2026-1138 · 접수 4시간 전',
      aiModel:'KoBERT v2.3', confidence:0.79, urgency:'MEDIUM', status:'PENDING',
      aiDecision:'카테고리: 시설물 결함(FACILITY) · 우선순위: MEDIUM · SLA: 24시간',
      aiReason:'신뢰도 79% — "조명 깜박임"은 FACILITY(79%)와 SAFETY(19%) 사이 경계. 검토 권고.',
      shapFactors:['키워드: 조명(+0.38)','키워드: 깜박임(+0.28)','위치: 지하(+0.11)'],
      suggestedAction:'전기팀 배정 → 24시간 내 점검 (신뢰도 낮아 수동 확인 권장)', createdAt:hAgo(4), targetRoute:'/complaints', building:'노원 SH 2단지' },
    { id:'triage-003', type:'COMPLAINT_TRIAGE', typeLabel:'민원 AI 분류', typeIcon:'support_agent', typeColor:'#7b1fa2',
      title:'엘리베이터 버튼 고장 — 경산 GBDC 3단지 A동 2호기', subtitle:'민원 #C-2026-1135 · 접수 6시간 전',
      aiModel:'KoBERT v2.3', confidence:0.97, urgency:'HIGH', status:'PENDING',
      aiDecision:'카테고리: 엘리베이터(ELEVATOR) · 우선순위: HIGH · SLA: 2시간',
      aiReason:'KoBERT 97% 확신. 엘리베이터 카테고리 키워드 완전 일치. 이동약자 안전 우선 처리 대상.',
      shapFactors:['키워드: 엘리베이터(+0.55)','키워드: 버튼 고장(+0.33)','위치: A동(+0.06)'],
      suggestedAction:'엘리베이터 유지보수팀 즉시 배정 → 2시간 내 현장 대응', createdAt:hAgo(6), targetRoute:'/complaints', building:'경산 GBDC 3단지' },
    { id:'diag-001', type:'DIAGNOSIS', typeLabel:'AI 진단 의견', typeIcon:'psychology', typeColor:'#1565c0',
      title:'B동 3층 외벽 드라이비트 박리 — 위험도 위험(CRITICAL)', subtitle:'점검세션 #INS-2026-0389 · 1시간 전 AI 분석 완료',
      aiModel:'LLM + RAG (Claude 3.5 기반)', confidence:0.91, urgency:'CRITICAL', status:'PENDING',
      aiDecision:'즉시 조치 권고 · 예상 보수 비용: 480만원 · 위험 등급: CRITICAL',
      aiReason:'Y-MaskNet 균열폭 2.8mm, 박리 면적 12.4㎡ 탐지. SHAP: 건물연령(+28%), 균열폭(+22%), 층수(+18%) 주요 기여.',
      shapFactors:['건물연령 28년(+28%)','균열폭 2.8mm(+22%)','외벽 노출 층(+18%)','과거 누수 이력(+12%)'],
      suggestedAction:'즉각 접근 금지 조치 → 전문 보수업체 긴급 견적 → 입주민 안내', createdAt:hAgo(1), targetRoute:'/diagnosis', building:'강남 SH 5단지' },
    { id:'diag-002', type:'DIAGNOSIS', typeLabel:'AI 진단 의견', typeIcon:'psychology', typeColor:'#1565c0',
      title:'C동 지하 배관 누수 징후 — 위험도 높음(HIGH)', subtitle:'게이지 포인트 #GP-C-B1-042 · 3시간 전 IoT 이상탐지',
      aiModel:'LSTM + IsolationForest 앙상블', confidence:0.86, urgency:'HIGH', status:'PENDING',
      aiDecision:'긴급 점검 권고 · IoT 이상점수 78/100 · 예상 누수량: 2.3L/min',
      aiReason:'LSTM 예측 대비 실측 편차 +34%. IsolationForest 이상점수 상위 2%. 야간 압력 급락 패턴 3회 감지.',
      shapFactors:['야간 압력 급락(+35%)','진동 센서 이상(+25%)','유량 편차(+20%)','배관 연령(+15%)'],
      suggestedAction:'배관팀 24시간 내 현장 점검 → 단수 가능성 입주민 사전 공지', createdAt:hAgo(3), targetRoute:'/diagnosis', building:'노원 SH 2단지' },
    { id:'risk-001', type:'RISK_SCORE', typeLabel:'XAI 위험도', typeIcon:'shield', typeColor:'#c62828',
      title:'강남 SH 5단지 — 종합 위험도 78/100 (CRITICAL)', subtitle:'XAI 위험도 엔진 v2.0 · 30분 전 갱신',
      aiModel:'XGBoost + LightGBM + SHAP', confidence:0.93, urgency:'CRITICAL', status:'PENDING',
      aiDecision:'위험도 CRITICAL (78/100) — 정밀안전진단 즉시 발주 권고',
      aiReason:'SHAP 상위 요인: 건물연령 31년(+24%), 최근 균열 증가율(+19%), CO 센서 이상(+15%), 민원 급증(+12%).',
      shapFactors:['건물연령 31년(+24%)','균열 증가율(+19%)','CO 이상 탐지(+15%)','민원 빈도(+12%)','배관 노후도(+9%)'],
      suggestedAction:'정밀안전진단 즉시 의뢰 → AI 정비 지시서 생성 → 입주민 대피 준비 검토', createdAt:hAgo(0.5), targetRoute:'/risk', building:'강남 SH 5단지' },
    { id:'risk-002', type:'RISK_SCORE', typeLabel:'XAI 위험도', typeIcon:'shield', typeColor:'#c62828',
      title:'노원 SH 2단지 — 종합 위험도 55/100 (HIGH)', subtitle:'XAI 위험도 엔진 v2.0 · 2시간 전 갱신',
      aiModel:'XGBoost + LightGBM + SHAP', confidence:0.88, urgency:'HIGH', status:'PENDING',
      aiDecision:'위험도 HIGH (55/100) — 3개월 내 보수 계획 수립 권고',
      aiReason:'SHAP: 외벽 도장 노후(+22%), 엘리베이터 정기점검 지연(+18%), IoT 진동 소폭 상승(+14%).',
      shapFactors:['외벽 도장 노후(+22%)','엘리베이터 점검 지연(+18%)','IoT 진동(+14%)','배관 연령(+11%)'],
      suggestedAction:'분기 보수 계획 수립 → 엘리베이터 정기점검 즉시 일정 잡기', createdAt:hAgo(2), targetRoute:'/risk', building:'노원 SH 2단지' },
    { id:'crack-001', type:'CRACK_ANALYSIS', typeLabel:'균열 분석', typeIcon:'biotech', typeColor:'#e65100',
      title:'A동 2층 내력벽 균열 — 성장 속도 ▲12% (이번 달)', subtitle:'게이지 #GR-A-02-F07 · GBR 예측 모델 분석',
      aiModel:'GBR 균열 성장 예측 (R²=0.90) + Y-MaskNet', confidence:0.88, urgency:'HIGH', status:'PENDING',
      aiDecision:'6개월 내 보수 개입 필요 · 현재 균열폭 1.8mm · 예측 6개월 후 2.6mm',
      aiReason:'GBR 모델: 최근 3개월 성장률 +12%로 기준치(8%) 초과. 우기 영향 계수 0.34 반영.',
      shapFactors:['계절성/우기(+31%)','기초 침하 징후(+25%)','균열 연령(+20%)','인근 공사(+12%)'],
      suggestedAction:'6개월 내 에폭시 주입 보수 → 드론 정밀촬영 추가 의뢰', createdAt:hAgo(5), targetRoute:'/crack-analysis', building:'경산 GBDC 3단지' },
    { id:'det-001', type:'DETECTION', typeLabel:'AI 결함 탐지', typeIcon:'manage_search', typeColor:'#2e7d32',
      title:'D동 옥상 방수층 손상 — 드론 촬영 탐지', subtitle:'드론 미션 #DM-2026-0112 · Y-MaskNet 탐지',
      aiModel:'Y-MaskNet (Mask R-CNN + ResNet-101, mAP 0.92)', confidence:0.96, urgency:'HIGH', status:'PENDING',
      aiDecision:'방수층 손상 면적: 8.7㎡ · 심각도: HIGH · 누수 위험 높음',
      aiReason:'Y-MaskNet Instance Segmentation — 손상 픽셀 비율 23.4%, IoU 0.91.',
      shapFactors:['손상 픽셀 비율(+40%)','균열 연결성(+28%)','수분 반응 패턴(+18%)'],
      suggestedAction:'방수 전문업체 견적 요청 → 우기 전 보수 완료 목표', createdAt:hAgo(8), targetRoute:'/ai-detections', building:'강남 SH 5단지' },
    { id:'det-002', type:'DETECTION', typeLabel:'AI 결함 탐지', typeIcon:'manage_search', typeColor:'#2e7d32',
      title:'E동 지하 주차장 기둥 철근 노출 탐지', subtitle:'점검 세션 #INS-2026-0391 · Y-MaskNet 탐지',
      aiModel:'Y-MaskNet (F1=0.97)', confidence:0.93, urgency:'CRITICAL', status:'PENDING',
      aiDecision:'철근 노출 길이: 15cm · 심각도: CRITICAL · 즉시 조치 필요',
      aiReason:'Y-MaskNet 철근 노출 클래스 93% 확신. Antigravity 3중 검증 통과.',
      shapFactors:['노출 면적(+45%)','부식 진행도(+30%)','하중 위치(+15%)'],
      suggestedAction:'구조물 안전 진단 긴급 의뢰 → 해당 구역 차량 진입 통제', createdAt:hAgo(12), targetRoute:'/ai-detections', building:'노원 SH 2단지' },
  ];
}

@Component({
  selector: 'ax-ai-inbox-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatIconModule, MatButtonModule, MatTabsModule,
    MatDividerModule, MatTooltipModule, MatSnackBarModule,
    PageHeaderComponent, StatusBadgeComponent, AiConfidenceChipComponent, EmptyStateComponent,
  ],
  template: `
    <div class="ax-page">

      <!-- ── 페이지 헤더 ── -->
      <ax-page-header
        title="AI 통합 검토 수신함"
        description="Human-in-the-loop — AI 판단 결과 검토·승인·기각 통합 관리"
        icon="mark_email_unread"
        breadcrumb="AI 운영"
      >
        <div ax-page-actions>
          <!-- 대기 카운터 -->
          <div class="ax-inbox-counter" aria-live="polite" [attr.aria-label]="'검토 대기 ' + pendingCount() + '건'">
            <span class="ax-inbox-counter__num">{{ pendingCount() }}</span>
            <span class="ax-inbox-counter__label">검토 대기</span>
          </div>
          <button mat-stroked-button (click)="approveAll()" aria-label="현재 탭 항목 전체 수락">
            <mat-icon>done_all</mat-icon> 전체 수락
          </button>
        </div>
      </ax-page-header>

      <!-- ── Human-in-the-loop 플로우 ── -->
      <div class="ax-flow-strip" role="presentation" aria-label="AI 검토 처리 흐름">
        <div class="ax-flow-step ax-flow-step--done">
          <mat-icon aria-hidden="true">smart_toy</mat-icon>
          <div class="ax-flow-step__text">
            <span class="ax-flow-step__name">AI 자동 분석</span>
            <span class="ax-flow-step__sub">KoBERT · Y-MaskNet · XGBoost</span>
          </div>
        </div>
        <mat-icon class="ax-flow-arrow" aria-hidden="true">chevron_right</mat-icon>
        <div class="ax-flow-step ax-flow-step--done">
          <mat-icon aria-hidden="true">tune</mat-icon>
          <div class="ax-flow-step__text">
            <span class="ax-flow-step__name">신뢰도 평가</span>
            <span class="ax-flow-step__sub">95%+ 자동 · 그 외 검토</span>
          </div>
        </div>
        <mat-icon class="ax-flow-arrow" aria-hidden="true">chevron_right</mat-icon>
        <div class="ax-flow-step ax-flow-step--current">
          <mat-icon aria-hidden="true">person_check</mat-icon>
          <div class="ax-flow-step__text">
            <span class="ax-flow-step__name">담당자 검토</span>
            <span class="ax-flow-step__sub">현재 단계</span>
          </div>
        </div>
        <mat-icon class="ax-flow-arrow" aria-hidden="true">chevron_right</mat-icon>
        <div class="ax-flow-step">
          <mat-icon aria-hidden="true">assignment_turned_in</mat-icon>
          <div class="ax-flow-step__text">
            <span class="ax-flow-step__name">현장 반영</span>
            <span class="ax-flow-step__sub">작업지시 · 알림</span>
          </div>
        </div>
        <mat-icon class="ax-flow-arrow" aria-hidden="true">chevron_right</mat-icon>
        <div class="ax-flow-step">
          <mat-icon aria-hidden="true">loop</mat-icon>
          <div class="ax-flow-step__text">
            <span class="ax-flow-step__name">피드백 루프</span>
            <span class="ax-flow-step__sub">모델 재학습</span>
          </div>
        </div>
      </div>

      <!-- ── 탭 필터 ── -->
      <mat-tab-group animationDuration="150ms" (selectedIndexChange)="onTabChange($event)">
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon aria-hidden="true">inbox</mat-icon>
            전체
            @if (pendingCount() > 0) {
              <span class="ax-tab-badge" aria-label="{{ pendingCount() }}건">{{ pendingCount() }}</span>
            }
          </ng-template>
        </mat-tab>
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon aria-hidden="true">support_agent</mat-icon>
            민원 분류
            @if (pendingByType('COMPLAINT_TRIAGE') > 0) {
              <span class="ax-tab-badge">{{ pendingByType('COMPLAINT_TRIAGE') }}</span>
            }
          </ng-template>
        </mat-tab>
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon aria-hidden="true">psychology</mat-icon>
            진단 의견
            @if (pendingByType('DIAGNOSIS') > 0) {
              <span class="ax-tab-badge">{{ pendingByType('DIAGNOSIS') }}</span>
            }
          </ng-template>
        </mat-tab>
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon aria-hidden="true">shield</mat-icon>
            위험도 승인
            @if (pendingByType('RISK_SCORE') > 0) {
              <span class="ax-tab-badge">{{ pendingByType('RISK_SCORE') }}</span>
            }
          </ng-template>
        </mat-tab>
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon aria-hidden="true">biotech</mat-icon>
            균열 분석
            @if (pendingByType('CRACK_ANALYSIS') > 0) {
              <span class="ax-tab-badge">{{ pendingByType('CRACK_ANALYSIS') }}</span>
            }
          </ng-template>
        </mat-tab>
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon aria-hidden="true">manage_search</mat-icon>
            결함 탐지
            @if (pendingByType('DETECTION') > 0) {
              <span class="ax-tab-badge">{{ pendingByType('DETECTION') }}</span>
            }
          </ng-template>
        </mat-tab>
      </mat-tab-group>

      <!-- ── 인박스 목록 ── -->
      <div class="ax-inbox-list" role="list" aria-label="AI 검토 대기 항목">
        @for (item of filteredItems(); track item.id) {
          <article
            class="ax-inbox-card"
            [class.ax-inbox-card--critical]="item.urgency === 'CRITICAL' && item.status === 'PENDING'"
            [class.ax-inbox-card--high]="item.urgency === 'HIGH' && item.status === 'PENDING'"
            [class.ax-inbox-card--done]="item.status !== 'PENDING'"
            role="listitem"
            [attr.aria-label]="item.title"
          >
            <!-- ── 카드 최상단 메타 바 ── -->
            <div class="ax-inbox-card__meta">
              <!-- AI 타입 배지 -->
              <span class="ax-inbox-type-chip">
                <mat-icon class="ax-inbox-type-chip__icon" aria-hidden="true">{{ item.typeIcon }}</mat-icon>
                {{ item.typeLabel }}
              </span>

              <!-- 긴급도 배지 -->
              <ax-status-badge
                [variant]="urgencyVariant(item.urgency)"
                [label]="urgencyLabel(item.urgency)"
                size="sm" />

              <!-- 빌딩 태그 -->
              @if (item.building) {
                <span class="ax-inbox-building" aria-label="단지: {{ item.building }}">
                  <mat-icon aria-hidden="true">apartment</mat-icon>
                  {{ item.building }}
                </span>
              }

              <div class="ax-inbox-card__meta-right">
                <time class="ax-inbox-time">{{ timeAgo(item.createdAt) }}</time>
                <!-- 처리 결과 배지 -->
                @if (item.status !== 'PENDING') {
                  <ax-status-badge
                    [variant]="decisionVariant(item.status)"
                    [label]="decisionLabel(item.status)" />
                }
              </div>
            </div>

            <!-- ── 제목 / 부제목 ── -->
            <div class="ax-inbox-card__title-block">
              <h3 class="ax-inbox-card__title">{{ item.title }}</h3>
              <p class="ax-inbox-card__subtitle">{{ item.subtitle }}</p>
            </div>

            <!-- ── AI 판단 + 신뢰도 ── -->
            <div class="ax-inbox-ai-block">
              <div class="ax-inbox-ai-block__left">
                <div class="ax-inbox-ai-model">
                  <mat-icon aria-hidden="true">smart_toy</mat-icon>
                  <span>{{ item.aiModel }}</span>
                </div>
                <p class="ax-inbox-ai-decision">{{ item.aiDecision }}</p>
              </div>

              <!-- 신뢰도 -->
              <div class="ax-inbox-conf">
                <ax-ai-confidence
                  [value]="item.confidence"
                  [showBar]="true"
                  [showLabel]="true" />
                <span class="ax-inbox-conf__tag" [class]="confTagClass(item.confidence)">
                  {{ confTagLabel(item.confidence) }}
                </span>
              </div>
            </div>

            <!-- ── 신뢰도 바 + 임계선 ── -->
            <div class="ax-conf-track-wrap" role="presentation" aria-hidden="true">
              <div class="ax-conf-track">
                <div
                  class="ax-conf-track__fill ax-conf-track__fill--{{ confTier(item.confidence) }}"
                  [style.width.%]="item.confidence * 100">
                </div>
                <!-- 80% 마커 -->
                <div class="ax-conf-track__marker" style="left:80%"
                     matTooltip="80% 미만: 수동 검토 필수"></div>
                <!-- 95% 마커 -->
                <div class="ax-conf-track__marker" style="left:95%"
                     matTooltip="95% 이상: 자동처리 가능"></div>
              </div>
              <div class="ax-conf-track__labels">
                <span>0%</span>
                <span class="ax-conf-track__label-80">수동 필수 80%</span>
                <span class="ax-conf-track__label-95">자동 95%</span>
                <span>100%</span>
              </div>
            </div>

            <!-- ── AI 근거 (XAI) ── -->
            <div class="ax-inbox-reason">
              <mat-icon class="ax-inbox-reason__icon" aria-hidden="true">insights</mat-icon>
              <p class="ax-inbox-reason__text">{{ item.aiReason }}</p>
            </div>

            <!-- ── SHAP 기여 요인 ── -->
            @if (item.shapFactors?.length) {
              <div class="ax-inbox-shap" role="list" aria-label="XAI 기여 요인">
                <span class="ax-inbox-shap__label">XAI 기여 요인</span>
                @for (f of item.shapFactors; track f) {
                  <span class="ax-inbox-shap__chip" role="listitem">{{ f }}</span>
                }
              </div>
            }

            <!-- ── 권장 조치 ── -->
            <div class="ax-inbox-action-hint">
              <mat-icon class="ax-inbox-action-hint__icon" aria-hidden="true">assignment_ind</mat-icon>
              <span>{{ item.suggestedAction }}</span>
            </div>

            <div class="ax-inbox-card__divider" aria-hidden="true"></div>

            <!-- ── 검토 액션 버튼 ── -->
            @if (item.status === 'PENDING') {
              <div class="ax-inbox-card__actions" role="group" [attr.aria-label]="item.title + ' 검토 액션'">
                <button mat-flat-button color="primary"
                  (click)="approve(item)"
                  matTooltip="AI 판단 수락 — 권장 조치 즉시 실행">
                  <mat-icon>check_circle</mat-icon> 수락
                </button>
                <button mat-stroked-button
                  (click)="modify(item)"
                  matTooltip="내용 수정 후 확정">
                  <mat-icon>edit_note</mat-icon> 수정 확정
                </button>
                <button mat-stroked-button color="warn"
                  (click)="reject(item)"
                  matTooltip="AI 판단 기각 — 수동 처리">
                  <mat-icon>cancel</mat-icon> 기각
                </button>
                @if (item.targetRoute) {
                  <a mat-button [routerLink]="item.targetRoute" matTooltip="상세 페이지로 이동"
                     class="ax-inbox-card__detail-link">
                    <mat-icon>open_in_new</mat-icon> 상세
                  </a>
                }
              </div>
            } @else {
              <div class="ax-inbox-card__done-row">
                <ax-status-badge
                  [variant]="decisionVariant(item.status)"
                  [label]="decisionLabel(item.status) + ' — 처리 완료'" />
                <button mat-button (click)="undoDecision(item)" class="ax-inbox-card__undo"
                        aria-label="결정 취소">
                  <mat-icon>undo</mat-icon> 취소
                </button>
              </div>
            }
          </article>
        }

        @if (filteredItems().length === 0) {
          <ax-empty-state
            type="zero"
            title="검토 대기 항목이 없습니다"
            description="이 탭의 모든 AI 검토 항목이 처리되었습니다."
            metaText="수락·기각·수정 결과는 AI 모델 재학습 피드백으로 자동 반영됩니다." />
        }
      </div>

      <!-- ── 오늘 처리 통계 ── -->
      <div class="ax-inbox-stats ax-card">
        <div class="ax-card__header">
          <mat-icon aria-hidden="true">bar_chart</mat-icon>
          <h3 class="ax-card__title">오늘 처리 현황</h3>
        </div>

        <div class="ax-inbox-stats__grid" role="list" aria-label="처리 통계">
          @for (stat of statsRows(); track stat.label) {
            <div class="ax-inbox-stat" role="listitem">
              <span class="ax-inbox-stat__num ax-inbox-stat__num--{{ stat.color }}">
                {{ stat.value }}
              </span>
              <span class="ax-inbox-stat__label">{{ stat.label }}</span>
            </div>
          }
        </div>

        <div class="ax-inbox-stats__note">
          <mat-icon aria-hidden="true">info</mat-icon>
          수락·기각·수정 결과는 AI 모델 재학습 피드백으로 자동 반영됩니다 (MLOps 파이프라인).
        </div>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; }

    /* ── 대기 카운터 (헤더 액션) ── */
    .ax-inbox-counter {
      display: flex;
      flex-direction: column;
      align-items: center;
      line-height: 1;
    }
    .ax-inbox-counter__num {
      font-size: 28px;
      font-weight: var(--ax-font-weight-bold);
      color: var(--ax-color-danger-text);
      font-variant-numeric: tabular-nums;
    }
    .ax-inbox-counter__label {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-tertiary);
    }

    /* ── 플로우 스트립 ── */
    .ax-flow-strip {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-8);
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border-default);
      border-radius: var(--ax-radius-lg);
      padding: var(--ax-spacing-12) var(--ax-spacing-20);
      overflow-x: auto;
    }
    .ax-flow-step {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-8);
      flex-shrink: 0;
      color: var(--ax-color-text-disabled);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--ax-color-text-disabled);
      }
    }
    .ax-flow-step--done {
      color: var(--ax-color-text-secondary);
      mat-icon { color: var(--ax-color-info); }
    }
    .ax-flow-step--current {
      color: var(--ax-color-danger-text);
      font-weight: var(--ax-font-weight-semibold);
      mat-icon { color: var(--ax-color-danger); }
    }
    .ax-flow-step__text {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .ax-flow-step__name {
      font-size: var(--ax-font-size-sm);
      font-weight: var(--ax-font-weight-medium);
    }
    .ax-flow-step__sub {
      font-size: 10px;
      color: var(--ax-color-text-tertiary);
    }
    .ax-flow-arrow {
      color: var(--ax-color-border-strong);
      font-size: 16px;
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    /* ── 탭 배지 ── */
    .ax-tab-badge {
      background: var(--ax-color-danger);
      color: white;
      border-radius: var(--ax-radius-full);
      padding: 1px 6px;
      font-size: 10px;
      font-weight: var(--ax-font-weight-bold);
      margin-left: var(--ax-spacing-4);
      line-height: 1.4;
    }

    /* ── 인박스 리스트 ── */
    .ax-inbox-list {
      display: flex;
      flex-direction: column;
      gap: var(--ax-spacing-12);
    }

    /* ── 인박스 카드 ── */
    .ax-inbox-card {
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border-default);
      border-left: 4px solid var(--ax-color-border-strong);
      border-radius: var(--ax-radius-lg);
      box-shadow: var(--ax-shadow-xs);
      overflow: hidden;
      transition: box-shadow var(--ax-transition-base);

      &:hover { box-shadow: var(--ax-shadow-md); }

      &--critical { border-left-color: var(--ax-color-danger); }
      &--high     { border-left-color: var(--ax-color-warning); }
      &--done     { opacity: 0.72; }
    }

    /* ── 카드 최상단 메타 ── */
    .ax-inbox-card__meta {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-8);
      padding: var(--ax-spacing-12) var(--ax-card-padding) var(--ax-spacing-8);
      flex-wrap: wrap;
    }
    .ax-inbox-card__meta-right {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-8);
      margin-left: auto;
    }

    /* AI 타입 칩 */
    .ax-inbox-type-chip {
      display: inline-flex;
      align-items: center;
      gap: var(--ax-spacing-4);
      padding: 2px 8px;
      border-radius: var(--ax-radius-full);
      font-size: var(--ax-font-size-xs);
      font-weight: var(--ax-font-weight-semibold);
      background: var(--ax-color-brand-primary-subtle);
      color: var(--ax-color-brand-primary);
      border: 1px solid var(--ax-color-brand-primary-muted);

      .ax-inbox-type-chip__icon {
        font-size: 13px;
        width: 13px;
        height: 13px;
      }
    }

    /* 빌딩 태그 */
    .ax-inbox-building {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-tertiary);

      mat-icon { font-size: 12px; width: 12px; height: 12px; }
    }

    .ax-inbox-time {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-disabled);
    }

    /* ── 제목 블록 ── */
    .ax-inbox-card__title-block {
      padding: 0 var(--ax-card-padding) var(--ax-spacing-8);
    }
    .ax-inbox-card__title {
      font-size: var(--ax-font-size-lg);
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
      margin: 0 0 var(--ax-spacing-4);
      line-height: var(--ax-line-height-tight);
    }
    .ax-inbox-card__subtitle {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-tertiary);
      margin: 0;
    }

    /* ── AI 판단 블록 ── */
    .ax-inbox-ai-block {
      display: flex;
      align-items: flex-start;
      gap: var(--ax-spacing-12);
      margin: 0 var(--ax-card-padding) var(--ax-spacing-8);
      padding: var(--ax-spacing-12);
      background: var(--ax-color-brand-primary-subtle);
      border: 1px solid var(--ax-color-brand-primary-muted);
      border-radius: var(--ax-radius-md);
    }
    .ax-inbox-ai-block__left { flex: 1; }
    .ax-inbox-ai-model {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-4);
      font-size: 10px;
      font-weight: var(--ax-font-weight-semibold);
      text-transform: uppercase;
      letter-spacing: var(--ax-letter-spacing-wider);
      color: var(--ax-color-text-tertiary);
      margin-bottom: var(--ax-spacing-4);

      mat-icon { font-size: 13px; width: 13px; height: 13px; color: var(--ax-color-brand-primary); }
    }
    .ax-inbox-ai-decision {
      font-size: var(--ax-font-size-sm);
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-brand-primary);
      margin: 0;
      line-height: var(--ax-line-height-normal);
    }
    .ax-inbox-conf {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: var(--ax-spacing-4);
      flex-shrink: 0;
    }
    .ax-inbox-conf__tag {
      font-size: 10px;
      font-weight: var(--ax-font-weight-bold);
      padding: 1px 6px;
      border-radius: var(--ax-radius-full);

      &.high   { background: var(--ax-color-success-subtle); color: var(--ax-color-success-text); }
      &.medium { background: var(--ax-color-warning-subtle); color: var(--ax-color-warning-text); }
      &.low    { background: var(--ax-color-danger-subtle);  color: var(--ax-color-danger-text); }
    }

    /* ── 신뢰도 트랙 ── */
    .ax-conf-track-wrap {
      padding: 0 var(--ax-card-padding) var(--ax-spacing-4);
    }
    .ax-conf-track {
      position: relative;
      height: 6px;
      background: var(--ax-color-border-default);
      border-radius: var(--ax-radius-full);
      overflow: visible;
    }
    .ax-conf-track__fill {
      height: 100%;
      border-radius: var(--ax-radius-full);
      transition: width 0.5s ease;

      &--high   { background: var(--ax-color-success); }
      &--medium { background: var(--ax-color-warning); }
      &--low    { background: var(--ax-color-danger); }
    }
    .ax-conf-track__marker {
      position: absolute;
      top: -3px;
      width: 2px;
      height: 12px;
      background: var(--ax-color-text-tertiary);
      border-radius: 1px;
      transform: translateX(-50%);
    }
    .ax-conf-track__labels {
      display: flex;
      justify-content: space-between;
      position: relative;
      font-size: 9px;
      color: var(--ax-color-text-disabled);
      margin-top: var(--ax-spacing-2);
    }
    .ax-conf-track__label-80 {
      position: absolute;
      left: 80%;
      transform: translateX(-50%);
      white-space: nowrap;
    }
    .ax-conf-track__label-95 {
      position: absolute;
      left: 95%;
      transform: translateX(-50%);
      white-space: nowrap;
    }

    /* ── AI 근거 ── */
    .ax-inbox-reason {
      display: flex;
      align-items: flex-start;
      gap: var(--ax-spacing-6);
      padding: var(--ax-spacing-6) var(--ax-card-padding);
      font-size: var(--ax-font-size-sm);
      color: var(--ax-color-text-secondary);
      line-height: var(--ax-line-height-relaxed);
    }
    .ax-inbox-reason__icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
      color: var(--ax-color-neutral);
      flex-shrink: 0;
      margin-top: 2px;
    }
    .ax-inbox-reason__text { margin: 0; }

    /* ── SHAP 기여 요인 ── */
    .ax-inbox-shap {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-6);
      flex-wrap: wrap;
      padding: var(--ax-spacing-4) var(--ax-card-padding) var(--ax-spacing-6);
    }
    .ax-inbox-shap__label {
      font-size: 10px;
      font-weight: var(--ax-font-weight-bold);
      color: var(--ax-color-neutral);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .ax-inbox-shap__chip {
      font-size: 10px;
      background: var(--ax-color-neutral-subtle);
      color: var(--ax-color-neutral-text);
      border: 1px solid var(--ax-color-border-default);
      padding: 2px 8px;
      border-radius: var(--ax-radius-full);
      white-space: nowrap;
    }

    /* ── 권장 조치 ── */
    .ax-inbox-action-hint {
      display: flex;
      align-items: flex-start;
      gap: var(--ax-spacing-6);
      padding: var(--ax-spacing-6) var(--ax-card-padding) var(--ax-spacing-12);
      font-size: var(--ax-font-size-sm);
      font-weight: var(--ax-font-weight-medium);
      color: var(--ax-color-brand-primary);
      line-height: var(--ax-line-height-normal);
    }
    .ax-inbox-action-hint__icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    /* ── 구분선 ── */
    .ax-inbox-card__divider {
      height: 1px;
      background: var(--ax-color-border-default);
      margin: 0 var(--ax-card-padding);
    }

    /* ── 액션 버튼 행 ── */
    .ax-inbox-card__actions {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-8);
      padding: var(--ax-spacing-10) var(--ax-card-padding) var(--ax-spacing-12);
      flex-wrap: wrap;
    }
    .ax-inbox-card__detail-link {
      margin-left: auto;
      font-size: var(--ax-font-size-sm) !important;
    }

    /* ── 처리 완료 행 ── */
    .ax-inbox-card__done-row {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-12);
      padding: var(--ax-spacing-10) var(--ax-card-padding) var(--ax-spacing-12);
    }
    .ax-inbox-card__undo {
      margin-left: auto;
      font-size: var(--ax-font-size-sm) !important;
    }

    /* ── 통계 카드 ── */
    .ax-inbox-stats {
      padding: var(--ax-card-padding);
    }
    .ax-card { /* 공통 카드 스타일 */
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border-default);
      border-radius: var(--ax-radius-lg);
      box-shadow: var(--ax-shadow-xs);
    }
    .ax-card__header {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-8);
      padding-bottom: var(--ax-spacing-12);
      border-bottom: 1px solid var(--ax-color-border-default);
      margin-bottom: var(--ax-spacing-12);

      mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--ax-color-brand-primary); }
    }
    .ax-card__title {
      font-size: var(--ax-font-size-lg);
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
      margin: 0;
    }
    .ax-inbox-stats__grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: var(--ax-spacing-8);
      padding: var(--ax-spacing-8) 0;
    }
    .ax-inbox-stat { text-align: center; }
    .ax-inbox-stat__num {
      display: block;
      font-size: 26px;
      font-weight: var(--ax-font-weight-bold);
      line-height: 1;
      font-variant-numeric: tabular-nums;

      &--warning { color: var(--ax-color-warning-text); }
      &--success { color: var(--ax-color-success-text); }
      &--neutral { color: var(--ax-color-neutral); }
      &--info    { color: var(--ax-color-info-text); }
      &--primary { color: var(--ax-color-brand-primary); }
      &--accent  { color: var(--ax-color-neutral-text); }
    }
    .ax-inbox-stat__label {
      display: block;
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-tertiary);
      margin-top: var(--ax-spacing-4);
    }
    .ax-inbox-stats__note {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-6);
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-tertiary);
      background: var(--ax-color-brand-primary-subtle);
      border-radius: var(--ax-radius-md);
      padding: var(--ax-spacing-8) var(--ax-spacing-12);
      margin-top: var(--ax-spacing-8);

      mat-icon { font-size: 14px; width: 14px; height: 14px; color: var(--ax-color-info); }
    }
  `],
})
export class AiInboxPageComponent implements OnInit {
  private readonly snackBar = inject(MatSnackBar);

  // ── 상태 (기존 유지) ──────────────────────────────────────────────────────
  readonly allItems  = signal<InboxItem[]>([]);
  readonly activeTab = signal(0);

  readonly pendingCount  = computed(() => this.allItems().filter(i => i.status === 'PENDING').length);
  readonly approvedCount = computed(() => this.allItems().filter(i => i.status === 'APPROVED').length);
  readonly rejectedCount = computed(() => this.allItems().filter(i => i.status === 'REJECTED').length);
  readonly modifiedCount = computed(() => this.allItems().filter(i => i.status === 'MODIFIED').length);

  readonly processRate = computed(() => {
    const total = this.allItems().length;
    const done = total - this.pendingCount();
    return total > 0 ? Math.round((done / total) * 100) : 0;
  });

  readonly acceptRate = computed(() => {
    const done = this.approvedCount() + this.rejectedCount() + this.modifiedCount();
    return done > 0 ? Math.round(((this.approvedCount() + this.modifiedCount()) / done) * 100) : 0;
  });

  readonly filteredItems = computed(() => {
    const tab = this.activeTab();
    const items = this.allItems();
    if (tab === 0) return items;
    const types = ['', 'COMPLAINT_TRIAGE', 'DIAGNOSIS', 'RISK_SCORE', 'CRACK_ANALYSIS', 'DETECTION'];
    return items.filter(i => i.type === types[tab]);
  });

  readonly statsRows = computed(() => [
    { label: '대기',     value: this.pendingCount(),  color: 'warning' },
    { label: '수락',     value: this.approvedCount(), color: 'success' },
    { label: '기각',     value: this.rejectedCount(), color: 'neutral' },
    { label: '수정 확정', value: this.modifiedCount(), color: 'info' },
    { label: '처리율',   value: this.processRate() + '%', color: 'primary' },
    { label: 'AI 수락률', value: this.acceptRate() + '%', color: 'accent' },
  ]);

  ngOnInit() { this.allItems.set(makeInboxItems()); }

  // ── 기존 비즈니스 로직 완전 유지 ─────────────────────────────────────────
  onTabChange(idx: number) { this.activeTab.set(idx); }

  pendingByType(type: InboxItem['type']): number {
    return this.allItems().filter(i => i.type === type && i.status === 'PENDING').length;
  }

  approve(item: InboxItem) {
    this.allItems.update(list => list.map(i => i.id === item.id ? {...i, status:'APPROVED' as ReviewDecision} : i));
    this.snackBar.open(`수락: "${item.title.slice(0,30)}..."`, '닫기', {duration:3000});
  }

  modify(item: InboxItem) {
    this.allItems.update(list => list.map(i => i.id === item.id ? {...i, status:'MODIFIED' as ReviewDecision} : i));
    this.snackBar.open('수정 확정: AI 권장 조치가 수정되어 반영됩니다.', '닫기', {duration:3000});
  }

  reject(item: InboxItem) {
    this.allItems.update(list => list.map(i => i.id === item.id ? {...i, status:'REJECTED' as ReviewDecision} : i));
    this.snackBar.open('기각: 수동 처리로 전환됩니다.', '닫기', {duration:3000});
  }

  undoDecision(item: InboxItem) {
    this.allItems.update(list => list.map(i => i.id === item.id ? {...i, status:'PENDING' as ReviewDecision} : i));
  }

  approveAll() {
    const pending = this.filteredItems().filter(i => i.status === 'PENDING');
    if (pending.length === 0) { this.snackBar.open('대기 중인 항목이 없습니다.', '닫기', {duration:2000}); return; }
    const ids = new Set(pending.map(i => i.id));
    this.allItems.update(list => list.map(i => ids.has(i.id) ? {...i, status:'APPROVED' as ReviewDecision} : i));
    this.snackBar.open(`${pending.length}건 전체 수락되었습니다.`, '닫기', {duration:3000});
  }

  // ── 표시 헬퍼 ─────────────────────────────────────────────────────────────
  urgencyLabel(u: string): string {
    return {CRITICAL:'긴급-위험', HIGH:'높음', MEDIUM:'보통', LOW:'낮음'}[u] ?? u;
  }

  urgencyVariant(u: string): any {
    return {CRITICAL:'danger', HIGH:'danger', MEDIUM:'warning', LOW:'info'}[u] ?? 'neutral';
  }

  decisionLabel(s: string): string {
    return {APPROVED:'수락', REJECTED:'기각', MODIFIED:'수정 확정', PENDING:'대기'}[s] ?? s;
  }

  decisionVariant(s: string): any {
    return {APPROVED:'success', REJECTED:'neutral', MODIFIED:'info', PENDING:'warning'}[s] ?? 'neutral';
  }

  timeAgo(d: Date): string {
    const diffMs = Date.now() - d.getTime();
    const h = Math.floor(diffMs / 3_600_000);
    if (h < 1) return `${Math.floor(diffMs / 60_000)}분 전`;
    if (h < 24) return `${h}시간 전`;
    return `${Math.floor(h / 24)}일 전`;
  }

  confTier(v: number): 'high' | 'medium' | 'low' {
    if (v >= 0.85) return 'high';
    if (v >= 0.65) return 'medium';
    return 'low';
  }

  confTagClass(v: number): string { return this.confTier(v); }

  confTagLabel(v: number): string {
    if (v >= 0.95) return '자동 처리 가능';
    if (v >= 0.80) return '검토 권장';
    return '수동 필수';
  }
}
