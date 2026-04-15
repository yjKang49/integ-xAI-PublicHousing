// apps/admin-web/src/app/features/dashboard/pages/dashboard-page.component.ts
// 대시보드 메인 페이지 — 차트/리스트 중심 운영 콘솔로 재구성 (API/로직 완전 유지)
import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DashboardResponse } from '@ax/shared';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { StatusBadgeComponent, severityToVariant } from '../../../shared/components/status-badge/status-badge.component';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'ax-dashboard-page',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatIconModule, MatButtonModule,
    MatProgressSpinnerModule, MatTooltipModule, MatSnackBarModule,
    PageHeaderComponent, SkeletonComponent, EmptyStateComponent, StatusBadgeComponent,
  ],
  template: `
    <div class="ax-page">

      <!-- ── 페이지 헤더 ── -->
      <ax-page-header
        title="운영 대시보드"
        description="시설물 위험·민원·점검·균열 현황 실시간 통합 보기"
        icon="dashboard"
        breadcrumb="개요"
        [meta]="'최종 업데이트: ' + (lastUpdated() | date:'HH:mm:ss')"
      >
        <div ax-page-actions>
          <button mat-icon-button
            (click)="load()"
            [matTooltip]="loading() ? '갱신 중...' : '데이터 새로고침'"
            [disabled]="loading()" aria-label="데이터 새로고침">
            <mat-icon [class.ax-spinning]="loading()">refresh</mat-icon>
          </button>
          <a mat-stroked-button routerLink="/reports/generate" aria-label="보고서 생성">
            <mat-icon>picture_as_pdf</mat-icon>보고서 생성
          </a>
          <a mat-flat-button color="primary" routerLink="/ai-performance" aria-label="AI 성과 보기">
            <mat-icon>auto_awesome</mat-icon>AI 성과
          </a>
        </div>
      </ax-page-header>

      <!-- ── AI 성과 배너 ── -->
      <div class="ax-perf-banner" role="complementary" aria-label="AI 운영 성과 요약">
        <div class="ax-perf-banner__label">AI 운영 성과</div>
        <div class="ax-perf-banner__items">
          <a class="ax-perf-item" routerLink="/ai-performance" aria-label="연간 절감 7,350만원">
            <mat-icon class="ax-perf-item__icon" style="color: var(--ax-color-info)">savings</mat-icon>
            <div class="ax-perf-item__content">
              <strong class="ax-perf-item__value">7,350만원</strong>
              <span class="ax-perf-item__desc">연간 절감</span>
            </div>
          </a>
          <div class="ax-perf-banner__sep" aria-hidden="true"></div>
          <a class="ax-perf-item" routerLink="/ai-performance" aria-label="ROI 340%">
            <mat-icon class="ax-perf-item__icon" style="color: var(--ax-color-success)">trending_up</mat-icon>
            <div class="ax-perf-item__content">
              <strong class="ax-perf-item__value">ROI 340%</strong>
              <span class="ax-perf-item__desc">투자 수익률</span>
            </div>
          </a>
          <div class="ax-perf-banner__sep" aria-hidden="true"></div>
          <a class="ax-perf-item" routerLink="/ai-performance" aria-label="RPA 자동화율 81.5%">
            <mat-icon class="ax-perf-item__icon" style="color: var(--ax-color-brand-primary)">smart_toy</mat-icon>
            <div class="ax-perf-item__content">
              <strong class="ax-perf-item__value">81.5%</strong>
              <span class="ax-perf-item__desc">RPA 자동화율</span>
            </div>
          </a>
          <div class="ax-perf-banner__sep" aria-hidden="true"></div>
          <a class="ax-perf-item" routerLink="/ai-performance" aria-label="AI 탐지 정확도 93.1%">
            <mat-icon class="ax-perf-item__icon" style="color: var(--ax-color-warning)">precision_manufacturing</mat-icon>
            <div class="ax-perf-item__content">
              <strong class="ax-perf-item__value">93.1%</strong>
              <span class="ax-perf-item__desc">AI 탐지 정확도</span>
            </div>
          </a>
          <div class="ax-perf-banner__sep" aria-hidden="true"></div>
          <a class="ax-perf-item" routerLink="/risk" aria-label="사고 차단율 94%">
            <mat-icon class="ax-perf-item__icon" style="color: var(--ax-color-success)">shield</mat-icon>
            <div class="ax-perf-item__content">
              <strong class="ax-perf-item__value">94%</strong>
              <span class="ax-perf-item__desc">사고 차단율</span>
            </div>
          </a>
          <div class="ax-perf-banner__sep" aria-hidden="true"></div>
          <a class="ax-perf-item ax-perf-item--urgent" routerLink="/ai-inbox" aria-label="AI 검토 대기 9건">
            <mat-icon class="ax-perf-item__icon" style="color: var(--ax-color-danger)">mark_email_unread</mat-icon>
            <div class="ax-perf-item__content">
              <strong class="ax-perf-item__value" style="color: var(--ax-color-danger-text)">9건</strong>
              <span class="ax-perf-item__desc">AI 검토 대기</span>
            </div>
            <span class="ax-perf-item__urgent-tag" aria-hidden="true">검토 필요</span>
          </a>
        </div>
        <div class="ax-perf-banner__actions">
          <a mat-button routerLink="/ai-inbox" color="warn" style="font-size:12px">
            <mat-icon>inbox</mat-icon> 수신함
          </a>
          <a mat-button routerLink="/mileage" style="font-size:12px">
            <mat-icon>workspace_premium</mat-icon> 마일리지
          </a>
          <a mat-button routerLink="/vision2030" style="font-size:12px">
            <mat-icon>rocket_launch</mat-icon> 2030
          </a>
        </div>
      </div>

      <!-- ── 로딩 상태 ── -->
      @if (loading() && !data()) {
        <ax-skeleton type="kpi" [rows]="[1,2,3,4]" />
        <ax-skeleton type="kpi" [rows]="[1,2,3,4]" />
      }

      <!-- ── 에러 상태 ── -->
      @if (loadError() && !data()) {
        <ax-empty-state
          type="error"
          title="대시보드 데이터를 불러오지 못했습니다"
          description="네트워크 상태를 확인하거나 잠시 후 다시 시도해 주세요."
          primaryLabel="다시 시도"
          primaryIcon="refresh"
          (primaryAction)="load()"
        />
      }

      @if (data(); as d) {

        <!-- ════════════════════════════════════════════════════════════ -->
        <!-- ZONE A: 핵심 위험 KPI Strip (compact 96px)                  -->
        <!-- ════════════════════════════════════════════════════════════ -->
        <div class="db-strip" role="region" aria-label="핵심 위험 현황">

          <a class="db-strip__item db-strip__item--danger"
             routerLink="/defects" [queryParams]="{severity:'CRITICAL'}"
             aria-label="긴급 결함 {{ d.criticalDefects }}건">
            <mat-icon aria-hidden="true">dangerous</mat-icon>
            <div class="db-strip__body">
              <span class="db-strip__val">{{ d.criticalDefects }}</span>
              <span class="db-strip__lbl">긴급 결함</span>
            </div>
            @if (d.criticalDefects > 0) {
              <span class="db-strip__pill db-strip__pill--danger" aria-label="긴급">긴급</span>
            }
          </a>
          <div class="db-strip__sep" aria-hidden="true"></div>

          <a class="db-strip__item db-strip__item--danger"
             routerLink="/alerts"
             aria-label="활성 경보 {{ d.activeAlerts }}건">
            <mat-icon aria-hidden="true">notifications_active</mat-icon>
            <div class="db-strip__body">
              <span class="db-strip__val">{{ d.activeAlerts }}</span>
              <span class="db-strip__lbl">활성 경보</span>
            </div>
          </a>
          <div class="db-strip__sep" aria-hidden="true"></div>

          <a class="db-strip__item"
             [class.db-strip__item--warn]="d.overdueComplaints > 0"
             routerLink="/complaints"
             aria-label="기한 초과 민원 {{ d.overdueComplaints }}건">
            <mat-icon aria-hidden="true">schedule</mat-icon>
            <div class="db-strip__body">
              <span class="db-strip__val">{{ d.overdueComplaints }}</span>
              <span class="db-strip__lbl">기한 초과 민원</span>
            </div>
          </a>
          <div class="db-strip__sep" aria-hidden="true"></div>

          <a class="db-strip__item"
             [class.db-strip__item--warn]="d.overdueInspections > 0"
             routerLink="/inspection/projects"
             aria-label="지연 점검 {{ d.overdueInspections }}건">
            <mat-icon aria-hidden="true">assignment_late</mat-icon>
            <div class="db-strip__body">
              <span class="db-strip__val">{{ d.overdueInspections }}</span>
              <span class="db-strip__lbl">지연 점검</span>
            </div>
          </a>
          <div class="db-strip__sep" aria-hidden="true"></div>

          <a class="db-strip__item"
             [class.db-strip__item--warn]="d.thresholdExceedances > 0"
             routerLink="/cracks"
             aria-label="균열 임계치 초과 {{ d.thresholdExceedances }}개소">
            <mat-icon aria-hidden="true">timeline</mat-icon>
            <div class="db-strip__body">
              <span class="db-strip__val">{{ d.thresholdExceedances }}</span>
              <span class="db-strip__lbl">균열 초과</span>
            </div>
          </a>

          <!-- 보조 지표 (우측 고정 패널) -->
          <div class="db-strip__metrics" aria-label="보조 운영 지표">
            <div class="db-strip__metric">
              <span class="db-strip__metric-lbl">대기 민원</span>
              <span class="db-strip__metric-val">{{ d.pendingComplaints }}<em>건</em></span>
            </div>
            <div class="db-strip__metric">
              <span class="db-strip__metric-lbl">진행 프로젝트</span>
              <span class="db-strip__metric-val">{{ d.activeProjects }}<em>건</em></span>
            </div>
            <div class="db-strip__metric">
              <span class="db-strip__metric-lbl">이달 완료</span>
              <span class="db-strip__metric-val">{{ d.completedThisMonth }}<em>건</em></span>
            </div>
            <div class="db-strip__metric">
              <span class="db-strip__metric-lbl">모니터링 포인트</span>
              <span class="db-strip__metric-val">{{ d.activeGaugePoints }}<em>개</em></span>
            </div>
          </div>
        </div>

        <!-- ════════════════════════════════════════════════════════════ -->
        <!-- ZONE B: 결함 분포 차트 (주요 시각화) + 운영 지표 집약         -->
        <!-- ════════════════════════════════════════════════════════════ -->
        <div class="db-main-grid">

          <!-- B-1: 결함 유형 분포 — 메인 차트 패널 -->
          <div class="db-panel">
            <div class="db-panel__head">
              <mat-icon style="color: var(--ax-color-brand-primary)" aria-hidden="true">bar_chart</mat-icon>
              <h2 class="db-panel__title">결함 유형 분포</h2>
              <span class="db-panel__meta">전체 {{ totalDefects(d) }}건</span>
              <a class="db-panel__link" routerLink="/defects" aria-label="결함 전체 보기">
                전체 보기 <mat-icon aria-hidden="true">chevron_right</mat-icon>
              </a>
            </div>
            <div class="db-defect-chart" role="list" aria-label="결함 유형별 분포">
              @for (item of d.defectsByType; track item.type) {
                <div class="db-defect-row" role="listitem"
                     [attr.aria-label]="defectLabel(item.type) + ': ' + item.count + '건, ' + (defectPct(item.count, d) | number:'1.0-0') + '%'">
                  <div class="db-defect-row__type">
                    <span class="db-defect-dot db-defect-dot--{{ defectColorKey(item.type) }}"
                          aria-hidden="true"></span>
                    <span class="db-defect-row__label">{{ defectLabel(item.type) }}</span>
                  </div>
                  <div class="db-defect-row__bar-wrap" role="progressbar"
                       [attr.aria-valuenow]="item.count"
                       [attr.aria-valuemax]="maxDefectCount(d)">
                    <div class="db-defect-row__bar"
                         [style.width.%]="barPct(item.count, d)"></div>
                  </div>
                  <span class="db-defect-row__count">{{ item.count }}<em>건</em></span>
                  <span class="db-defect-row__pct">{{ defectPct(item.count, d) | number:'1.0-0' }}%</span>
                </div>
              }
              @if (d.defectsByType.length === 0) {
                <p class="db-chart-empty">등록된 결함 없음</p>
              }
            </div>
          </div>

          <!-- B-2: 운영 지표 집약 패널 (rate bar 3종 + 절감액) -->
          <div class="db-ops-panel">

            <!-- 민원 해결률 -->
            <div class="db-ops-group">
              <div class="db-ops-group__head">
                <mat-icon style="color: var(--ax-color-info)" aria-hidden="true">support_agent</mat-icon>
                <span>민원 처리</span>
                <a routerLink="/complaints" aria-label="민원 관리 바로가기">
                  바로가기 <mat-icon aria-hidden="true">chevron_right</mat-icon>
                </a>
              </div>
              <div class="db-rate">
                <div class="db-rate__row">
                  <span class="db-rate__label">해결률</span>
                  <strong class="db-rate__val"
                    [class.db-rate__val--good]="d.complaintResolutionRate >= 90"
                    [class.db-rate__val--warn]="d.complaintResolutionRate < 90">
                    {{ d.complaintResolutionRate }}%
                  </strong>
                </div>
                <div class="db-rate__track" title="목표 90% 이상">
                  <div class="db-rate__fill"
                    [style.width.%]="d.complaintResolutionRate"
                    [class.db-rate__fill--good]="d.complaintResolutionRate >= 90"
                    [class.db-rate__fill--warn]="d.complaintResolutionRate < 90"></div>
                  <div class="db-rate__target" [style.left.%]="90"
                       title="목표: 90%" aria-hidden="true"></div>
                </div>
                <div class="db-rate__meta">
                  평균 {{ d.avgResolutionHours | number:'1.1-1' }}시간 처리 · 목표 24시간 이내
                </div>
              </div>
            </div>

            <div class="db-ops-divider" aria-hidden="true"></div>

            <!-- 점검 완료율 -->
            <div class="db-ops-group">
              <div class="db-ops-group__head">
                <mat-icon style="color: var(--ax-color-success)" aria-hidden="true">assignment_turned_in</mat-icon>
                <span>점검 진행</span>
                <a routerLink="/inspection/projects" aria-label="점검 프로젝트 바로가기">
                  바로가기 <mat-icon aria-hidden="true">chevron_right</mat-icon>
                </a>
              </div>
              <div class="db-rate">
                <div class="db-rate__row">
                  <span class="db-rate__label">완료율</span>
                  <strong class="db-rate__val"
                    [class.db-rate__val--good]="d.inspectionCompletionRate >= 95"
                    [class.db-rate__val--warn]="d.inspectionCompletionRate < 95">
                    {{ d.inspectionCompletionRate }}%
                  </strong>
                </div>
                <div class="db-rate__track" title="목표 95% 이상">
                  <div class="db-rate__fill"
                    [style.width.%]="d.inspectionCompletionRate"
                    [class.db-rate__fill--good]="d.inspectionCompletionRate >= 95"
                    [class.db-rate__fill--warn]="d.inspectionCompletionRate < 95"></div>
                  <div class="db-rate__target" [style.left.%]="95"
                       title="목표: 95%" aria-hidden="true"></div>
                </div>
                <div class="db-rate__meta">
                  이달 완료 {{ d.completedThisMonth }}건 · 목표 95%
                </div>
              </div>
            </div>

            <div class="db-ops-divider" aria-hidden="true"></div>

            <!-- 결함 수리율 -->
            <div class="db-ops-group">
              <div class="db-ops-group__head">
                <mat-icon style="color: var(--ax-color-warning)" aria-hidden="true">build_circle</mat-icon>
                <span>결함 수리</span>
                <a routerLink="/defects" aria-label="결함 목록 바로가기">
                  바로가기 <mat-icon aria-hidden="true">chevron_right</mat-icon>
                </a>
              </div>
              <div class="db-rate">
                <div class="db-rate__row">
                  <span class="db-rate__label">수리율</span>
                  <strong class="db-rate__val"
                    [class.db-rate__val--good]="d.defectRepairRate >= 80"
                    [class.db-rate__val--warn]="d.defectRepairRate < 80">
                    {{ d.defectRepairRate }}%
                  </strong>
                </div>
                <div class="db-rate__track">
                  <div class="db-rate__fill"
                    [style.width.%]="d.defectRepairRate"
                    [class.db-rate__fill--good]="d.defectRepairRate >= 80"
                    [class.db-rate__fill--warn]="d.defectRepairRate < 80"></div>
                </div>
                <div class="db-rate__meta">미수리 {{ d.unrepairedDefects }}건 잔존</div>
              </div>
            </div>

            <div class="db-ops-divider" aria-hidden="true"></div>

            <!-- 예방 정비 절감 추산 -->
            <div class="db-ops-group">
              <div class="db-ops-group__head">
                <mat-icon style="color: var(--ax-color-success)" aria-hidden="true">savings</mat-icon>
                <span>예방 정비 절감 추산</span>
              </div>
              <div class="db-saving">
                <span class="db-saving__val">
                  {{ d.preventiveMaintenanceSavingsEstimate / 10000 | number:'1.0-0' }}<em>만원</em>
                </span>
                <span class="db-saving__sub">
                  모니터링 {{ d.activeGaugePoints }}포인트 · 균열 경보 {{ d.crackAlertCount }}건 활성
                </span>
              </div>
            </div>

          </div>
        </div>

        <!-- ════════════════════════════════════════════════════════════ -->
        <!-- ZONE C: 균열 트렌드 + 최근 경보 + 최근 민원                  -->
        <!-- ════════════════════════════════════════════════════════════ -->
        <div class="db-bottom-grid">

          <!-- C-1: 균열 측정 트렌드 -->
          <div class="db-panel">
            <div class="db-panel__head">
              <mat-icon style="color: var(--ax-color-warning)" aria-hidden="true">sensors</mat-icon>
              <h2 class="db-panel__title">균열 트렌드</h2>
              <a class="db-panel__link" routerLink="/cracks" aria-label="균열 모니터링 전체 보기">
                전체 보기 <mat-icon aria-hidden="true">chevron_right</mat-icon>
              </a>
            </div>
            <table class="db-crack-table" aria-label="균열 측정 포인트 추이">
              <thead>
                <tr>
                  <th>포인트명</th>
                  <th class="db-crack-table__r">최신값(mm)</th>
                  <th class="db-crack-table__c">추이</th>
                </tr>
              </thead>
              <tbody>
                @for (pt of d.crackTrendSummary; track pt.gaugeId) {
                  <tr>
                    <td class="db-crack-table__name">{{ pt.name }}</td>
                    <td class="db-crack-table__r"
                        [class.db-crack-table__r--warn]="pt.trend === 'UP'">
                      {{ pt.latestMm | number:'1.2-2' }}
                    </td>
                    <td class="db-crack-table__c">
                      <span class="db-trend-chip db-trend-chip--{{ pt.trend.toLowerCase() }}">
                        <mat-icon aria-hidden="true">
                          {{ pt.trend === 'UP' ? 'trending_up' : pt.trend === 'DOWN' ? 'trending_down' : 'trending_flat' }}
                        </mat-icon>
                        {{ pt.trend === 'UP' ? '증가' : pt.trend === 'DOWN' ? '감소' : '안정' }}
                      </span>
                    </td>
                  </tr>
                }
                @if (d.crackTrendSummary.length === 0) {
                  <tr>
                    <td colspan="3" class="db-crack-table__empty">측정 데이터 없음</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- C-2: 최근 경보 -->
          <div class="db-panel">
            <div class="db-panel__head">
              <mat-icon style="color: var(--ax-color-danger)" aria-hidden="true">notifications</mat-icon>
              <h2 class="db-panel__title">최근 경보</h2>
              <a class="db-panel__link" routerLink="/alerts" aria-label="경보 전체 보기">
                전체 보기 <mat-icon aria-hidden="true">chevron_right</mat-icon>
              </a>
            </div>
            <ul class="db-dense-list" role="list">
              @if (d.recentAlerts.length === 0) {
                <li class="db-dense-list__empty" role="status">
                  <mat-icon aria-hidden="true">check_circle_outline</mat-icon>
                  활성 경보 없음
                </li>
              } @else {
                @for (a of d.recentAlerts; track a.id) {
                  <li>
                    <a class="db-dense-row" [routerLink]="['/alerts']"
                       [attr.aria-label]="a.title + ' ' + a.severity">
                      <mat-icon class="db-dense-row__icon"
                        [style.color]="severityColor(a.severity)" aria-hidden="true">
                        {{ severityIcon(a.severity) }}
                      </mat-icon>
                      <span class="db-dense-row__title">{{ a.title }}</span>
                      <ax-status-badge
                        [variant]="severityToVariant(a.severity)"
                        [label]="a.severity" size="sm" />
                      <time class="db-dense-row__time">{{ a.createdAt | date:'MM/dd HH:mm' }}</time>
                    </a>
                  </li>
                }
              }
            </ul>
          </div>

          <!-- C-3: 최근 민원 -->
          <div class="db-panel">
            <div class="db-panel__head">
              <mat-icon style="color: var(--ax-color-info)" aria-hidden="true">forum</mat-icon>
              <h2 class="db-panel__title">최근 민원</h2>
              <a class="db-panel__link" routerLink="/complaints" aria-label="민원 전체 보기">
                전체 보기 <mat-icon aria-hidden="true">chevron_right</mat-icon>
              </a>
            </div>
            <ul class="db-dense-list" role="list">
              @if (d.recentComplaints.length === 0) {
                <li class="db-dense-list__empty" role="status">
                  <mat-icon aria-hidden="true">check_circle_outline</mat-icon>
                  대기 민원 없음
                </li>
              } @else {
                @for (c of d.recentComplaints; track c.id) {
                  <li>
                    <a class="db-dense-row" [routerLink]="['/complaints', c.id]"
                       [attr.aria-label]="c.title">
                      <mat-icon class="db-dense-row__icon"
                        style="color: var(--ax-color-info)" aria-hidden="true">support_agent</mat-icon>
                      <span class="db-dense-row__title">{{ c.title }}</span>
                      <ax-status-badge
                        [variant]="statusToVariant(c.status)"
                        [label]="statusLabel(c.status)" size="sm" />
                      <time class="db-dense-row__time">{{ c.submittedAt | date:'MM/dd HH:mm' }}</time>
                    </a>
                  </li>
                }
              }
            </ul>
          </div>

        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    /* ════════════════════════════════════════════════════════════════ */
    /* AI 성과 배너 (기존 유지)                                          */
    /* ════════════════════════════════════════════════════════════════ */
    .ax-perf-banner {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-12);
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border-default);
      border-radius: var(--ax-radius-lg);
      padding: var(--ax-spacing-12) var(--ax-spacing-16);
      box-shadow: var(--ax-shadow-xs);
    }

    .ax-perf-banner__label {
      font-size: var(--ax-font-size-xs);
      font-weight: var(--ax-font-weight-semibold);
      text-transform: uppercase;
      letter-spacing: var(--ax-letter-spacing-wider);
      color: var(--ax-color-text-tertiary);
      white-space: nowrap;
      padding-right: var(--ax-spacing-8);
      border-right: 1px solid var(--ax-color-border-default);
    }

    .ax-perf-banner__items {
      display: flex;
      align-items: center;
      flex: 1;
      gap: 0;
      overflow: hidden;
    }

    .ax-perf-item {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-8);
      padding: var(--ax-spacing-4) var(--ax-spacing-16);
      text-decoration: none;
      border-radius: var(--ax-radius-md);
      transition: background var(--ax-transition-fast);
      position: relative;
      flex: 1;
      min-width: 0;

      &:hover { background: var(--ax-color-bg-surface-alt); }
    }

    .ax-perf-item--urgent { position: relative; }

    .ax-perf-item__icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }

    .ax-perf-item__content {
      display: flex;
      flex-direction: column;
      gap: 1px;
      min-width: 0;
    }

    .ax-perf-item__value {
      font-size: 14px;
      font-weight: var(--ax-font-weight-bold);
      color: var(--ax-color-text-primary);
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }

    .ax-perf-item__desc {
      font-size: 10px;
      color: var(--ax-color-text-tertiary);
      white-space: nowrap;
    }

    .ax-perf-item__urgent-tag {
      position: absolute;
      top: -2px;
      right: -2px;
      background: var(--ax-color-danger);
      color: white;
      font-size: 9px;
      font-weight: var(--ax-font-weight-bold);
      padding: 1px 5px;
      border-radius: var(--ax-radius-full);
      white-space: nowrap;
    }

    .ax-perf-banner__sep {
      width: 1px;
      height: 28px;
      background: var(--ax-color-border-default);
      flex-shrink: 0;
    }

    .ax-perf-banner__actions {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-4);
      margin-left: auto;
      flex-shrink: 0;
      border-left: 1px solid var(--ax-color-border-default);
      padding-left: var(--ax-spacing-12);
    }

    /* ════════════════════════════════════════════════════════════════ */
    /* ZONE A: KPI Strip                                                */
    /* ════════════════════════════════════════════════════════════════ */
    .db-strip {
      display: flex;
      align-items: stretch;
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border-default);
      border-radius: var(--ax-radius-lg);
      box-shadow: var(--ax-shadow-xs);
      min-height: 96px;
      overflow: hidden;
    }

    .db-strip__item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 18px;
      flex: 1;
      min-width: 0;
      text-decoration: none;
      color: inherit;
      transition: background var(--ax-transition-fast);

      &:hover { background: var(--ax-color-bg-surface-alt); }

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: var(--ax-color-text-tertiary);
        flex-shrink: 0;
      }

      &--danger {
        mat-icon { color: var(--ax-color-danger); }
        .db-strip__val { color: var(--ax-color-danger-text); }
      }

      &--warn {
        mat-icon { color: var(--ax-color-warning); }
        .db-strip__val { color: var(--ax-color-warning-text); }
      }
    }

    .db-strip__body {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .db-strip__val {
      font-size: var(--ax-font-size-kpi);
      font-weight: var(--ax-font-weight-bold);
      line-height: 1.1;
      font-variant-numeric: tabular-nums;
      color: var(--ax-color-text-primary);
      white-space: nowrap;
    }

    .db-strip__lbl {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-tertiary);
      white-space: nowrap;
    }

    .db-strip__pill {
      font-size: 9px;
      font-weight: var(--ax-font-weight-bold);
      padding: 2px 6px;
      border-radius: var(--ax-radius-full);
      white-space: nowrap;
      flex-shrink: 0;
      align-self: flex-start;
      margin-top: 2px;

      &--danger { background: var(--ax-color-danger); color: white; }
      &--warn   { background: var(--ax-color-warning); color: white; }
    }

    .db-strip__sep {
      width: 1px;
      background: var(--ax-color-border-default);
      margin: 14px 0;
      flex-shrink: 0;
      align-self: stretch;
    }

    .db-strip__metrics {
      display: flex;
      align-items: center;
      border-left: 1px solid var(--ax-color-border-default);
      padding: 0 4px;
      gap: 0;
      flex-shrink: 0;
    }

    .db-strip__metric {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0 14px;
      gap: 3px;
      border-right: 1px solid var(--ax-color-border-subtle);

      &:last-child { border-right: none; }
    }

    .db-strip__metric-lbl {
      font-size: 10px;
      color: var(--ax-color-text-tertiary);
      white-space: nowrap;
    }

    .db-strip__metric-val {
      font-size: var(--ax-font-size-lg);
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
      font-variant-numeric: tabular-nums;

      em {
        font-size: 10px;
        font-style: normal;
        color: var(--ax-color-text-tertiary);
        margin-left: 1px;
      }
    }

    /* ════════════════════════════════════════════════════════════════ */
    /* 공통 패널                                                         */
    /* ════════════════════════════════════════════════════════════════ */
    .db-panel {
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border-default);
      border-radius: var(--ax-radius-lg);
      box-shadow: var(--ax-shadow-xs);
      overflow: hidden;
    }

    .db-panel__head {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-8);
      padding: 10px var(--ax-spacing-16);
      border-bottom: 1px solid var(--ax-color-border-default);
      background: var(--ax-color-bg-surface-alt);

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        flex-shrink: 0;
      }
    }

    .db-panel__title {
      flex: 1;
      font-size: var(--ax-font-size-sm);
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
      margin: 0;
      white-space: nowrap;
    }

    .db-panel__meta {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-tertiary);
      white-space: nowrap;
    }

    .db-panel__link {
      display: flex;
      align-items: center;
      gap: 2px;
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-brand-primary);
      text-decoration: none;
      white-space: nowrap;
      padding: 2px 4px;
      border-radius: var(--ax-radius-sm);
      flex-shrink: 0;

      mat-icon { font-size: 12px; width: 12px; height: 12px; }
      &:hover { background: var(--ax-color-brand-primary-subtle); }
    }

    /* ════════════════════════════════════════════════════════════════ */
    /* ZONE B: 메인 그리드                                               */
    /* ════════════════════════════════════════════════════════════════ */
    .db-main-grid {
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: var(--ax-spacing-16);
      align-items: start;

      @media (max-width: 1280px) { grid-template-columns: 1fr; }
    }

    /* ── 결함 유형 분포 차트 ── */
    .db-defect-chart {
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .db-defect-row {
      display: grid;
      grid-template-columns: 112px 1fr 54px 38px;
      align-items: center;
      gap: 10px;
    }

    .db-defect-row__type {
      display: flex;
      align-items: center;
      gap: 7px;
    }

    .db-defect-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
      background: var(--ax-color-neutral);

      &--crack     { background: var(--ax-color-danger); }
      &--leak      { background: var(--ax-color-info); }
      &--spalling  { background: var(--ax-color-warning); }
      &--corrosion { background: #8b5cf6; }
      &--effl      { background: #06b6d4; }
      &--deform    { background: #f97316; }
      &--settle    { background: #84cc16; }
      &--other     { background: var(--ax-color-neutral); }
    }

    .db-defect-row__label {
      font-size: var(--ax-font-size-sm);
      color: var(--ax-color-text-secondary);
      white-space: nowrap;
    }

    .db-defect-row__bar-wrap {
      height: 12px;
      background: var(--ax-color-bg-surface-alt);
      border-radius: var(--ax-radius-sm);
      overflow: hidden;
      border: 1px solid var(--ax-color-border-subtle);
    }

    .db-defect-row__bar {
      height: 100%;
      background: var(--ax-color-brand-primary);
      opacity: 0.65;
      border-radius: var(--ax-radius-sm);
      transition: width 0.5s ease;
    }

    .db-defect-row__count {
      font-size: var(--ax-font-size-md);
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
      text-align: right;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;

      em { font-size: 10px; font-style: normal; color: var(--ax-color-text-tertiary); }
    }

    .db-defect-row__pct {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-tertiary);
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .db-chart-empty {
      color: var(--ax-color-text-disabled);
      text-align: center;
      padding: var(--ax-spacing-32);
      font-size: var(--ax-font-size-sm);
      margin: 0;
    }

    /* ── 운영 지표 집약 패널 ── */
    .db-ops-panel {
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border-default);
      border-radius: var(--ax-radius-lg);
      box-shadow: var(--ax-shadow-xs);
      overflow: hidden;
    }

    .db-ops-group {
      padding: 12px 14px;
    }

    .db-ops-group__head {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 8px;

      mat-icon { font-size: 14px; width: 14px; height: 14px; flex-shrink: 0; }

      span {
        flex: 1;
        font-size: var(--ax-font-size-sm);
        font-weight: var(--ax-font-weight-semibold);
        color: var(--ax-color-text-secondary);
      }

      a {
        display: flex;
        align-items: center;
        gap: 0;
        font-size: var(--ax-font-size-xs);
        color: var(--ax-color-brand-primary);
        text-decoration: none;

        mat-icon { font-size: 12px; width: 12px; height: 12px; }
        &:hover { text-decoration: underline; }
      }
    }

    .db-rate__row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 4px;
    }

    .db-rate__label {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-tertiary);
    }

    .db-rate__val {
      font-size: 15px;
      font-weight: var(--ax-font-weight-bold);
      color: var(--ax-color-text-primary);
      font-variant-numeric: tabular-nums;

      &--good { color: var(--ax-color-success-text); }
      &--warn { color: var(--ax-color-warning-text); }
    }

    .db-rate__track {
      position: relative;
      height: 8px;
      background: var(--ax-color-bg-surface-alt);
      border-radius: var(--ax-radius-full);
      border: 1px solid var(--ax-color-border-subtle);
      margin-bottom: 5px;
      overflow: visible;
    }

    .db-rate__fill {
      height: 100%;
      border-radius: var(--ax-radius-full);
      transition: width 0.6s ease;
      background: var(--ax-color-brand-primary);
      opacity: 0.8;
      position: relative;
      z-index: 1;

      &--good { background: var(--ax-color-success); opacity: 0.9; }
      &--warn { background: var(--ax-color-warning); opacity: 0.9; }
    }

    .db-rate__target {
      position: absolute;
      top: -2px;
      bottom: -2px;
      width: 2px;
      background: var(--ax-color-text-disabled);
      border-radius: 1px;
      transform: translateX(-50%);
      z-index: 2;
    }

    .db-rate__meta {
      font-size: 10px;
      color: var(--ax-color-text-tertiary);
      line-height: 1.4;
    }

    .db-ops-divider {
      height: 1px;
      background: var(--ax-color-border-subtle);
      margin: 0 14px;
    }

    .db-saving {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .db-saving__val {
      font-size: 20px;
      font-weight: var(--ax-font-weight-bold);
      color: var(--ax-color-success-text);
      font-variant-numeric: tabular-nums;

      em {
        font-size: var(--ax-font-size-sm);
        font-style: normal;
        color: var(--ax-color-text-tertiary);
        margin-left: 2px;
      }
    }

    .db-saving__sub {
      font-size: 10px;
      color: var(--ax-color-text-tertiary);
      line-height: 1.4;
    }

    /* ════════════════════════════════════════════════════════════════ */
    /* ZONE C: 하단 3열 그리드                                           */
    /* ════════════════════════════════════════════════════════════════ */
    .db-bottom-grid {
      display: grid;
      grid-template-columns: 260px 1fr 1fr;
      gap: var(--ax-spacing-16);
      align-items: start;

      @media (max-width: 1280px) { grid-template-columns: 1fr 1fr; }
      @media (max-width: 768px)  { grid-template-columns: 1fr; }
    }

    /* ── 균열 트렌드 테이블 ── */
    .db-crack-table {
      width: 100%;
      border-collapse: collapse;

      thead tr { background: var(--ax-color-bg-surface-alt); }

      th {
        padding: 7px 12px;
        font-size: 10px;
        font-weight: var(--ax-font-weight-semibold);
        color: var(--ax-color-text-tertiary);
        text-transform: uppercase;
        letter-spacing: var(--ax-letter-spacing-wider);
        text-align: left;
        border-bottom: 1px solid var(--ax-color-border-default);
        white-space: nowrap;
      }

      td {
        padding: 7px 12px;
        border-bottom: 1px solid var(--ax-color-border-subtle);
        color: var(--ax-color-text-secondary);
        font-size: var(--ax-font-size-sm);
      }

      tr:last-child td { border-bottom: none; }
      tr:hover td { background: var(--ax-color-bg-surface-alt); }
    }

    .db-crack-table__name {
      max-width: 100px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .db-crack-table__r {
      text-align: right !important;
      font-variant-numeric: tabular-nums;
      font-weight: var(--ax-font-weight-medium);
      white-space: nowrap;

      &--warn {
        color: var(--ax-color-warning-text) !important;
        font-weight: var(--ax-font-weight-bold) !important;
      }
    }

    .db-crack-table__c { text-align: center !important; }

    .db-crack-table__empty {
      text-align: center;
      color: var(--ax-color-text-disabled);
      padding: var(--ax-spacing-20);
      font-size: var(--ax-font-size-sm);
    }

    .db-trend-chip {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: 10px;
      font-weight: var(--ax-font-weight-medium);
      padding: 2px 7px;
      border-radius: var(--ax-radius-full);
      white-space: nowrap;

      mat-icon { font-size: 12px; width: 12px; height: 12px; }

      &--up     { background: var(--ax-color-danger-subtle);  color: var(--ax-color-danger-text); }
      &--down   { background: var(--ax-color-success-subtle); color: var(--ax-color-success-text); }
      &--stable { background: var(--ax-color-neutral-subtle); color: var(--ax-color-neutral-text); }
    }

    /* ── 밀도 높은 항목 리스트 ── */
    .db-dense-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .db-dense-list__empty {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--ax-spacing-6);
      color: var(--ax-color-text-disabled);
      padding: var(--ax-spacing-20);
      font-size: var(--ax-font-size-sm);

      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }

    .db-dense-row {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-8);
      padding: 7px 14px;
      text-decoration: none;
      transition: background var(--ax-transition-fast);
      border-bottom: 1px solid var(--ax-color-border-subtle);

      &:hover { background: var(--ax-color-bg-surface-alt); }
      &:last-child { border-bottom: none; }
    }

    .db-dense-row__icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
      flex-shrink: 0;
    }

    .db-dense-row__title {
      flex: 1;
      font-size: var(--ax-font-size-sm);
      color: var(--ax-color-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .db-dense-row__time {
      font-size: 10px;
      color: var(--ax-color-text-tertiary);
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
      flex-shrink: 0;
    }
  `],
})
export class DashboardPageComponent implements OnInit, OnDestroy {
  private readonly http     = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading     = signal(true);
  readonly loadError   = signal(false);
  readonly data        = signal<DashboardResponse | null>(null);
  readonly lastUpdated = signal<Date>(new Date());

  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  // 공통 배지 헬퍼 (상태 배지 컴포넌트용)
  readonly severityToVariant = severityToVariant;

  ngOnInit() {
    this.load();
    this.refreshTimer = setInterval(() => this.load(), 60_000);
  }

  ngOnDestroy() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  load() {
    this.loading.set(true);
    this.loadError.set(false);
    this.http.get<any>(`${environment.apiUrl}/dashboard`).subscribe({
      next: (res) => {
        this.data.set(res.data ?? res);
        this.lastUpdated.set(new Date());
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
        this.snackBar.open('대시보드 데이터를 불러오지 못했습니다.', '닫기', { duration: 3000 });
      },
    });
  }

  // ── Status summary item builders (기존 로직 유지) ────────────────────────
  complaintItems(d: DashboardResponse) {
    return [
      { icon: 'pending', label: '처리 대기', value: d.pendingComplaints, unit: '건', route: '/complaints', warnAbove: 10, direction: 'lower' },
      { icon: 'schedule', label: '기한 초과', value: d.overdueComplaints, unit: '건', warnAbove: 0, direction: 'lower' },
      { icon: 'timer', label: '평균 처리 시간', value: `${d.avgResolutionHours.toFixed(1)}`, unit: '시간', warnAbove: 48, direction: 'lower' },
      { icon: 'trending_up', label: '해결률', value: d.complaintResolutionRate, unit: '%', route: '/complaints', successAbove: 90, direction: 'higher' },
    ];
  }

  inspectionItems(d: DashboardResponse) {
    return [
      { icon: 'folder_open', label: '진행 중 프로젝트', value: d.activeProjects, unit: '건', route: '/inspection/projects' },
      { icon: 'assignment_late', label: '지연 점검', value: d.overdueInspections, unit: '건', warnAbove: 0, direction: 'lower' },
      { icon: 'check', label: '이달 완료', value: d.completedThisMonth, unit: '건' },
      { icon: 'build_circle', label: '미수리 결함', value: d.unrepairedDefects, unit: '건', route: '/defects', warnAbove: 5, direction: 'lower' },
      { icon: 'percent', label: '점검 완료율', value: d.inspectionCompletionRate, unit: '%', successAbove: 95, direction: 'higher' },
    ];
  }

  crackItems(d: DashboardResponse) {
    return [
      { icon: 'sensors', label: '모니터링 포인트', value: d.activeGaugePoints, unit: '개', route: '/cracks' },
      { icon: 'timeline', label: '임계치 초과', value: d.thresholdExceedances, unit: '개소', route: '/cracks', warnAbove: 0, direction: 'lower' },
      { icon: 'notifications_active', label: '균열 경보 (활성)', value: d.crackAlertCount, unit: '건', route: '/alerts', warnAbove: 0, direction: 'lower' },
      { icon: 'savings', label: '절감 추산', value: (d.preventiveMaintenanceSavingsEstimate / 10000).toFixed(0), unit: '만원', direction: 'higher' },
    ];
  }

  // ── 헬퍼 (기존 로직 유지) ────────────────────────────────────────────────
  barPct(count: number, d: DashboardResponse): number {
    const max = Math.max(...d.defectsByType.map((x) => x.count), 1);
    return (count / max) * 100;
  }

  maxDefectCount(d: DashboardResponse): number {
    return Math.max(...d.defectsByType.map((x) => x.count), 1);
  }

  defectLabel(type: string): string {
    const m: Record<string, string> = {
      CRACK: '균열', LEAK: '누수', SPALLING: '박리', CORROSION: '부식',
      EFFLORESCENCE: '백태', DEFORMATION: '변형', SETTLEMENT: '침하', OTHER: '기타',
    };
    return m[type] ?? type;
  }

  statusToVariant(status: string) {
    const map: Record<string, any> = {
      RECEIVED: 'info', ASSIGNED: 'warning', IN_PROGRESS: 'info',
      RESOLVED: 'success', CLOSED: 'neutral',
    };
    return map[status] ?? 'neutral';
  }

  statusLabel(status: string): string {
    const m: Record<string, string> = {
      RECEIVED: '접수', ASSIGNED: '배정', IN_PROGRESS: '처리중',
      RESOLVED: '해결', CLOSED: '종결',
    };
    return m[status] ?? status;
  }

  // severity 관련 (기존 로직 유지, badge variant로 대체)
  severityIcon(s: string) {
    return { CRITICAL: 'dangerous', HIGH: 'warning', MEDIUM: 'info', LOW: 'check_circle' }[s] ?? 'info';
  }

  severityColor(s: string) {
    return {
      CRITICAL: 'var(--ax-color-danger)',
      HIGH:     'var(--ax-color-warning)',
      MEDIUM:   'var(--ax-color-info)',
      LOW:      'var(--ax-color-success)',
    }[s] ?? 'var(--ax-color-neutral)';
  }

  // ── 신규 UI 헬퍼 (순수 view, 기능 없음) ─────────────────────────────────
  /** 전체 결함 건수 합계 (결함 분포 차트 total 표시용) */
  totalDefects(d: DashboardResponse): number {
    return d.defectsByType.reduce((s, x) => s + x.count, 0);
  }

  /** 결함 유형별 점유율 % (bar 우측 퍼센트 표시용) */
  defectPct(count: number, d: DashboardResponse): number {
    const total = this.totalDefects(d);
    return total === 0 ? 0 : Math.round((count / total) * 100);
  }

  /** 결함 유형별 CSS 색상 키 (dot 색상 클래스 선택용) */
  defectColorKey(type: string): string {
    const m: Record<string, string> = {
      CRACK: 'crack', LEAK: 'leak', SPALLING: 'spalling',
      CORROSION: 'corrosion', EFFLORESCENCE: 'effl',
      DEFORMATION: 'deform', SETTLEMENT: 'settle', OTHER: 'other',
    };
    return m[type] ?? 'other';
  }
}
