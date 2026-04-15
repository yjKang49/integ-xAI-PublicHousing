// apps/admin-web/src/app/features/cracks/pages/crack-history-page.component.ts
// 균열 게이지 포인트 상세 페이지 — CrackChartComponent를 조합한 페이지 컨테이너
import {
  Component, OnInit, OnDestroy, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CrackGaugePoint, CrackMeasurement } from '@ax/shared';
import { CrackChartComponent } from '../components/crack-chart.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'ax-crack-history-page',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatButtonModule, MatIconModule,
    MatTableModule, MatProgressSpinnerModule, MatTooltipModule, MatSnackBarModule,
    CrackChartComponent, EmptyStateComponent,
  ],
  template: `
    <!-- 뒤로가기 내비 -->
    <div class="ax-crack-hist-nav">
      <button mat-icon-button [routerLink]="['/cracks']" matTooltip="목록으로">
        <mat-icon>arrow_back</mat-icon>
      </button>
      <h1 class="ax-crack-hist-nav__title">
        균열 이력 조회
        @if (gaugePoint()) { <span class="ax-crack-hist-nav__sub">— {{ gaugePoint()!.name }}</span> }
      </h1>
    </div>

    @if (loading()) {
      <div class="ax-loading-center">
        <mat-spinner diameter="40" />
      </div>
    } @else {

      <!-- 게이지 포인트 정보 카드 -->
      @if (gaugePoint(); as gp) {
        <div class="ax-crack-hist-info">
          <div class="ax-crack-hist-info__hdr">
            <div class="ax-crack-hist-info__icon-wrap ax-crack-hist-info__icon-wrap--{{ riskKey() }}">
              <mat-icon>sensors</mat-icon>
            </div>
            <div>
              <h2 class="ax-crack-hist-info__name">{{ gp.name }}</h2>
              <p class="ax-crack-hist-info__sub">
                {{ gp.location }} · 설치일: {{ gp.installDate | date:'yyyy-MM-dd' }}
              </p>
            </div>
            <span class="ax-crack-hist-info__status ax-crack-hist-info__status--{{ riskKey() }}">
              {{ riskLabel() }}
            </span>
          </div>

          <div class="ax-crack-hist-metrics">
            <div class="ax-crack-hist-metric">
              <span class="ax-crack-hist-metric__lbl">기준 폭</span>
              <span class="ax-crack-hist-metric__val">{{ gp.baselineWidthMm }}<em>mm</em></span>
            </div>
            <div class="ax-crack-hist-metric">
              <span class="ax-crack-hist-metric__lbl">경보 임계치</span>
              <span class="ax-crack-hist-metric__val ax-crack-hist-metric__val--warn">
                {{ gp.thresholdMm }}<em>mm</em>
              </span>
            </div>
            <div class="ax-crack-hist-metric">
              <span class="ax-crack-hist-metric__lbl">최근 측정값</span>
              <span class="ax-crack-hist-metric__val"
                [class.ax-crack-hist-metric__val--danger]="latestExceeds()">
                {{ latest()?.measuredWidthMm ?? '-' }}<em>mm</em>
              </span>
            </div>
            <div class="ax-crack-hist-metric">
              <span class="ax-crack-hist-metric__lbl">기준 대비 변화</span>
              <span class="ax-crack-hist-metric__val"
                [class.ax-crack-hist-metric__val--danger]="latestExceeds()">
                {{ latestDelta() }}
              </span>
            </div>
            <div class="ax-crack-hist-metric">
              <span class="ax-crack-hist-metric__lbl">전회 대비 변화</span>
              <span class="ax-crack-hist-metric__val">{{ latestFromLast() }}</span>
            </div>
            <div class="ax-crack-hist-metric">
              <span class="ax-crack-hist-metric__lbl">총 측정 횟수</span>
              <span class="ax-crack-hist-metric__val">{{ measurements().length }}<em>회</em></span>
            </div>
            <div class="ax-crack-hist-metric">
              <span class="ax-crack-hist-metric__lbl">최근 측정일</span>
              <span class="ax-crack-hist-metric__val">
                {{ latest()?.measuredAt | date:'yyyy-MM-dd' }}
              </span>
            </div>
          </div>

          @if (latestExceeds()) {
            <div class="ax-crack-hist-alert">
              <mat-icon>warning</mat-icon>
              임계치 초과 — 즉시 점검이 필요합니다!
            </div>
          }
        </div>
      }

      <!-- 차트 카드 -->
      <div class="ax-crack-hist-chart">
        <div class="ax-crack-hist-chart__hdr">
          <mat-icon>show_chart</mat-icon>
          <span>균열 폭 추이 (시계열)</span>
        </div>
        <div class="ax-crack-hist-chart__body">
          <ax-crack-chart
            [gaugePoint]="gaugePoint()"
            [measurements]="measurements()"
          />
        </div>
      </div>

      <!-- 측정 이력 테이블 -->
      <div class="ax-table-container">
        <div class="ax-crack-hist-table-hdr">
          <mat-icon>history</mat-icon>
          <span>측정 이력 (최근 {{ measurements().length }}건)</span>
        </div>
        <table mat-table [dataSource]="measurements()" class="ax-crack-hist-table">

          <ng-container matColumnDef="measuredAt">
            <th mat-header-cell *matHeaderCellDef>측정일시</th>
            <td mat-cell *matCellDef="let m">
              <span class="ax-crack-hist-meta">{{ m.measuredAt | date:'yyyy-MM-dd HH:mm' }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="measuredWidthMm">
            <th mat-header-cell *matHeaderCellDef>측정값 (mm)</th>
            <td mat-cell *matCellDef="let m">
              <span [class.ax-crack-hist-val--danger]="m.exceedsThreshold">
                {{ m.measuredWidthMm }}
              </span>
              @if (m.exceedsThreshold) {
                <mat-icon class="ax-crack-hist-warn-icon" matTooltip="임계치 초과">warning</mat-icon>
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="changeFromBaselineMm">
            <th mat-header-cell *matHeaderCellDef>기준 대비 (mm)</th>
            <td mat-cell *matCellDef="let m">
              <span [class.ax-crack-hist-val--danger]="m.changeFromBaselineMm > 0">
                {{ m.changeFromBaselineMm > 0 ? '+' : '' }}{{ m.changeFromBaselineMm }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="deltaFromPrevious">
            <th mat-header-cell *matHeaderCellDef>전회 대비 (mm)</th>
            <td mat-cell *matCellDef="let m">
              @if (m.changeFromLastMm !== null && m.changeFromLastMm !== undefined) {
                <span [class.ax-crack-hist-val--danger]="m.changeFromLastMm > 0.1">
                  {{ m.changeFromLastMm > 0 ? '+' : '' }}{{ m.changeFromLastMm }}
                </span>
              } @else { — }
            </td>
          </ng-container>

          <ng-container matColumnDef="method">
            <th mat-header-cell *matHeaderCellDef>측정 방식</th>
            <td mat-cell *matCellDef="let m">
              @if (m.isManualOverride) {
                <span class="ax-crack-hist-method ax-crack-hist-method--manual">수동</span>
              } @else {
                <span class="ax-crack-hist-method ax-crack-hist-method--auto">
                  이미지 ({{ ((m.autoConfidence ?? 0) * 100) | number:'1.0-0' }}%)
                </span>
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="measuredBy">
            <th mat-header-cell *matHeaderCellDef>측정자</th>
            <td mat-cell *matCellDef="let m">
              <span class="ax-crack-hist-meta">{{ m.measuredBy }}</span>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns;"
            [class.ax-crack-hist-row--exceed]="row.exceedsThreshold"></tr>
        </table>

        @if (measurements().length === 0) {
          <ax-empty-state
            type="empty"
            icon="sensors_off"
            title="등록된 측정 이력이 없습니다"
            description="이 게이지 포인트에 기록된 측정값이 아직 없습니다"
          />
        }
      </div>
    }
  `,
  styles: [`
    /* ── 뒤로가기 내비 ── */
    .ax-crack-hist-nav {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-2);
      margin-bottom: var(--ax-spacing-4);
    }
    .ax-crack-hist-nav__title {
      margin: 0;
      font-size: var(--ax-font-size-xl);
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
    }
    .ax-crack-hist-nav__sub {
      font-weight: var(--ax-font-weight-normal);
      color: var(--ax-color-text-secondary);
    }

    /* ── 정보 카드 ── */
    .ax-crack-hist-info {
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border-muted);
      border-radius: var(--ax-radius-lg);
      padding: var(--ax-spacing-4);
      margin-bottom: var(--ax-spacing-4);
    }
    .ax-crack-hist-info__hdr {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-3);
      margin-bottom: var(--ax-spacing-4);
    }
    .ax-crack-hist-info__icon-wrap {
      width: 44px; height: 44px;
      border-radius: var(--ax-radius-md);
      display: flex; align-items: center; justify-content: center;
      color: #fff; flex-shrink: 0;
    }
    .ax-crack-hist-info__icon-wrap--high { background: var(--ax-color-danger); }
    .ax-crack-hist-info__icon-wrap--warn { background: var(--ax-color-warning); }
    .ax-crack-hist-info__icon-wrap--ok   { background: var(--ax-color-success); }
    .ax-crack-hist-info__name {
      margin: 0;
      font-size: var(--ax-font-size-lg);
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
    }
    .ax-crack-hist-info__sub {
      margin: 2px 0 0;
      font-size: var(--ax-font-size-sm);
      color: var(--ax-color-text-secondary);
    }
    .ax-crack-hist-info__status {
      margin-left: auto;
      padding: 4px 12px;
      border-radius: var(--ax-radius-full);
      font-size: var(--ax-font-size-sm);
      font-weight: var(--ax-font-weight-semibold);
    }
    .ax-crack-hist-info__status--high {
      background: var(--ax-color-danger-subtle);
      color: var(--ax-color-danger);
    }
    .ax-crack-hist-info__status--warn {
      background: var(--ax-color-warning-subtle);
      color: var(--ax-color-warning);
    }
    .ax-crack-hist-info__status--ok {
      background: var(--ax-color-success-subtle);
      color: var(--ax-color-success);
    }

    /* 메트릭 그리드 */
    .ax-crack-hist-metrics {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--ax-spacing-4);
      margin-bottom: var(--ax-spacing-3);
    }
    .ax-crack-hist-metric {
      display: flex;
      flex-direction: column;
      gap: var(--ax-spacing-1);
    }
    .ax-crack-hist-metric__lbl {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .ax-crack-hist-metric__val {
      font-size: var(--ax-font-size-xl);
      font-weight: var(--ax-font-weight-bold);
      color: var(--ax-color-text-primary);
      line-height: 1.2;
    }
    .ax-crack-hist-metric__val em {
      font-style: normal;
      font-size: var(--ax-font-size-xs);
      font-weight: var(--ax-font-weight-normal);
      color: var(--ax-color-text-tertiary);
      margin-left: 2px;
    }
    .ax-crack-hist-metric__val--warn   { color: var(--ax-color-warning); }
    .ax-crack-hist-metric__val--danger { color: var(--ax-color-danger); }

    /* 임계치 초과 알림 */
    .ax-crack-hist-alert {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-2);
      background: var(--ax-color-danger-subtle);
      border: 1px solid var(--ax-color-danger-border);
      color: var(--ax-color-danger);
      padding: var(--ax-spacing-3) var(--ax-spacing-4);
      border-radius: var(--ax-radius-md);
      font-weight: var(--ax-font-weight-semibold);
      margin-top: var(--ax-spacing-3);
    }

    /* ── 차트 카드 ── */
    .ax-crack-hist-chart {
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border-muted);
      border-radius: var(--ax-radius-lg);
      overflow: hidden;
      margin-bottom: var(--ax-spacing-4);
    }
    .ax-crack-hist-chart__hdr {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-2);
      padding: var(--ax-spacing-3) var(--ax-spacing-4);
      border-bottom: 1px solid var(--ax-color-border-muted);
      font-size: var(--ax-font-size-base);
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
      background: var(--ax-color-bg-surface-alt);
    }
    .ax-crack-hist-chart__hdr mat-icon {
      color: var(--ax-color-brand-primary);
    }
    .ax-crack-hist-chart__body {
      padding: var(--ax-spacing-4);
    }

    /* ── 테이블 헤더 ── */
    .ax-crack-hist-table-hdr {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-2);
      padding: var(--ax-spacing-3) var(--ax-spacing-4);
      border-bottom: 1px solid var(--ax-color-border-muted);
      font-size: var(--ax-font-size-base);
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
      background: var(--ax-color-bg-surface-alt);
    }
    .ax-crack-hist-table-hdr mat-icon {
      color: var(--ax-color-brand-primary);
    }
    .ax-crack-hist-table { width: 100%; }
    th.mat-mdc-header-cell {
      font-size: var(--ax-font-size-xs);
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-secondary);
    }
    td.mat-mdc-cell { padding: 0 var(--ax-spacing-2); }

    /* 값 색상 */
    .ax-crack-hist-val--danger {
      color: var(--ax-color-danger);
      font-weight: var(--ax-font-weight-semibold);
    }
    .ax-crack-hist-warn-icon {
      font-size: 14px; width: 14px; height: 14px;
      color: var(--ax-color-danger);
      vertical-align: middle;
      margin-left: var(--ax-spacing-1);
    }

    /* 측정 방식 */
    .ax-crack-hist-method {
      display: inline-block;
      padding: 2px 8px;
      border-radius: var(--ax-radius-sm);
      font-size: var(--ax-font-size-xs);
    }
    .ax-crack-hist-method--manual {
      background: var(--ax-color-warning-subtle);
      color: var(--ax-color-warning);
    }
    .ax-crack-hist-method--auto {
      background: var(--ax-color-bg-surface-alt);
      color: var(--ax-color-text-secondary);
    }

    /* 메타 텍스트 */
    .ax-crack-hist-meta {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-secondary);
    }

    /* 초과 행 */
    .ax-crack-hist-row--exceed td {
      background: color-mix(in srgb, var(--ax-color-danger-subtle) 50%, transparent);
    }
  `],
})
export class CrackHistoryPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);

  readonly gaugePoint = signal<CrackGaugePoint | null>(null);
  readonly measurements = signal<CrackMeasurement[]>([]);
  readonly loading = signal(true);

  readonly columns = ['measuredAt', 'measuredWidthMm', 'changeFromBaselineMm', 'deltaFromPrevious', 'method', 'measuredBy'];

  private gaugeId = '';

  ngOnInit() {
    this.gaugeId = this.route.snapshot.paramMap.get('gaugeId') ?? '';
    this.loadData();
  }

  ngOnDestroy() {}

  private loadData() {
    this.loading.set(true);
    const apiBase = environment.apiUrl;
    Promise.all([
      this.http.get<any>(`${apiBase}/cracks/gauge-points/${this.gaugeId}`).toPromise(),
      this.http.get<any>(`${apiBase}/cracks/gauge-points/${this.gaugeId}/trend?days=365`).toPromise(),
    ]).then(([gpRes, trendRes]) => {
      this.gaugePoint.set(gpRes?.data ?? gpRes);
      const measurements: CrackMeasurement[] = trendRes?.measurements ?? trendRes?.data?.measurements ?? [];
      this.measurements.set([...measurements].sort((a, b) =>
        new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime(),
      ));
      this.loading.set(false);
    }).catch(() => {
      this.loading.set(false);
      this.snackBar.open('데이터를 불러오지 못했습니다.', '닫기', { duration: 3000 });
    });
  }

  readonly latest = () => {
    const m = this.measurements();
    return m.length > 0 ? m[0] : null;
  };

  readonly latestExceeds = () => this.latest()?.exceedsThreshold ?? false;

  readonly latestDelta = () => {
    const v = this.latest()?.changeFromBaselineMm;
    if (v == null) return '—';
    return `${v > 0 ? '+' : ''}${v} mm`;
  };

  readonly latestFromLast = () => {
    const v = this.latest()?.changeFromLastMm;
    if (v == null) return '—';
    return `${v > 0 ? '+' : ''}${v} mm`;
  };

  readonly riskKey = () => {
    if (this.latestExceeds()) return 'high';
    const latest = this.latest();
    const threshold = this.gaugePoint()?.thresholdMm ?? 0;
    if (latest && latest.measuredWidthMm >= threshold * 0.8) return 'warn';
    return 'ok';
  };

  readonly riskLabel = () => {
    if (this.latestExceeds()) return '임계치 초과';
    const latest = this.latest();
    const threshold = this.gaugePoint()?.thresholdMm ?? 0;
    if (latest && latest.measuredWidthMm >= threshold * 0.8) return '경고';
    return '정상';
  };
}
