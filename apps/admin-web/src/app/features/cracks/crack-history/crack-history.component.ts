// apps/admin-web/src/app/features/cracks/crack-history/crack-history.component.ts
import {
  Component, OnInit, OnDestroy, ViewChild, ElementRef,
  inject, signal, input, effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { Chart, registerables, type TooltipItem } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { ko } from 'date-fns/locale';
import { CrackGaugePoint, CrackMeasurement } from '@ax/shared';
import { environment } from '../../../../environments/environment';

Chart.register(...registerables);

type DateRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';

@Component({
  selector: 'ax-crack-history',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatSelectModule,
    MatChipsModule, MatTooltipModule, MatProgressSpinnerModule, MatTableModule,
  ],
  template: `
    @if (loading()) {
      <div class="loading-center"><mat-spinner diameter="40" /></div>
    } @else {
      <div class="history-layout">

        <!-- Gauge point info -->
        <mat-card class="info-card">
          <mat-card-header>
            <mat-icon mat-card-avatar [class]="'gauge-icon ' + getRiskClass()">sensors</mat-icon>
            <mat-card-title>{{ gaugePoint()?.name }}</mat-card-title>
            <mat-card-subtitle>{{ gaugePoint()?.description }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="gauge-metrics">
              <div class="metric">
                <span class="metric-label">기준 폭 (설치시)</span>
                <span class="metric-value">{{ gaugePoint()?.baselineWidthMm }} mm</span>
              </div>
              <div class="metric">
                <span class="metric-label">경보 임계치</span>
                <span class="metric-value threshold">{{ gaugePoint()?.thresholdMm }} mm</span>
              </div>
              <div class="metric">
                <span class="metric-label">최근 측정값</span>
                <span class="metric-value" [class.danger]="latestExceedsThreshold()">
                  {{ latestMeasurement()?.measuredWidthMm ?? '-' }} mm
                </span>
              </div>
              <div class="metric">
                <span class="metric-label">기준 대비 변화</span>
                <span class="metric-value" [class.danger]="latestExceedsThreshold()">
                  {{ latestMeasurement()?.changeFromBaselineMm
                      ? (latestMeasurement()!.changeFromBaselineMm > 0 ? '+' : '') +
                        latestMeasurement()!.changeFromBaselineMm
                      : '-' }} mm
                </span>
              </div>
              <div class="metric">
                <span class="metric-label">측정 횟수</span>
                <span class="metric-value">{{ measurements().length }}회</span>
              </div>
              <div class="metric">
                <span class="metric-label">최근 측정일</span>
                <span class="metric-value">
                  {{ latestMeasurement()?.measuredAt | date:'yyyy-MM-dd' }}
                </span>
              </div>
            </div>

            @if (latestExceedsThreshold()) {
              <div class="threshold-alert">
                <mat-icon>warning</mat-icon>
                임계치 초과 — 즉시 점검이 필요합니다!
              </div>
            }
          </mat-card-content>
        </mat-card>

        <!-- Chart Card -->
        <mat-card class="chart-card">
          <mat-card-header>
            <mat-card-title>균열 폭 추이 (시계열)</mat-card-title>
            <div class="chart-controls">
              <!-- Date range buttons -->
              @for (r of dateRanges; track r.value) {
                <button mat-stroked-button [class.active-range]="selectedRange() === r.value"
                  (click)="setRange(r.value)">{{ r.label }}</button>
              }
              <!-- Chart type toggle -->
              <button mat-icon-button (click)="toggleChartType()" matTooltip="차트 유형 변경">
                <mat-icon>{{ chartType() === 'line' ? 'bar_chart' : 'show_chart' }}</mat-icon>
              </button>
              <!-- Export -->
              <button mat-icon-button (click)="exportCsv()" matTooltip="CSV 내보내기">
                <mat-icon>download</mat-icon>
              </button>
            </div>
          </mat-card-header>
          <mat-card-content>
            <div class="chart-wrapper">
              <canvas #chartCanvas></canvas>
            </div>

            <!-- Trend indicator -->
            <div class="trend-row">
              <div class="trend-item">
                <mat-icon [class]="getTrendClass()">{{ getTrendIcon() }}</mat-icon>
                <span>{{ getTrendLabel() }}</span>
              </div>
              <div class="trend-item">
                <span class="trend-label">최근 30일 변화:</span>
                <span [class.danger]="recentChange() > 0">
                  {{ recentChange() > 0 ? '+' : '' }}{{ recentChange() | number:'1.2-2' }} mm
                </span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Measurement table -->
        <mat-card class="table-card">
          <mat-card-header>
            <mat-card-title>측정 이력</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-table [dataSource]="filteredMeasurements()">
              <ng-container matColumnDef="measuredAt">
                <mat-header-cell *matHeaderCellDef>측정일시</mat-header-cell>
                <mat-cell *matCellDef="let m">{{ m.measuredAt | date:'yyyy-MM-dd HH:mm' }}</mat-cell>
              </ng-container>
              <ng-container matColumnDef="measuredWidthMm">
                <mat-header-cell *matHeaderCellDef>측정값 (mm)</mat-header-cell>
                <mat-cell *matCellDef="let m">
                  <span [class.danger]="m.exceedsThreshold">{{ m.measuredWidthMm }}</span>
                  @if (m.exceedsThreshold) {
                    <mat-icon class="warn-icon" matTooltip="임계치 초과">warning</mat-icon>
                  }
                </mat-cell>
              </ng-container>
              <ng-container matColumnDef="changeFromBaseline">
                <mat-header-cell *matHeaderCellDef>기준 대비</mat-header-cell>
                <mat-cell *matCellDef="let m">
                  <span [class.danger]="m.changeFromBaselineMm > 0">
                    {{ m.changeFromBaselineMm > 0 ? '+' : '' }}{{ m.changeFromBaselineMm }}
                  </span>
                </mat-cell>
              </ng-container>
              <ng-container matColumnDef="changeFromLast">
                <mat-header-cell *matHeaderCellDef>전회 대비</mat-header-cell>
                <mat-cell *matCellDef="let m">
                  @if (m.changeFromLastMm !== null && m.changeFromLastMm !== undefined) {
                    <span [class.danger]="m.changeFromLastMm > 0.1">
                      {{ m.changeFromLastMm > 0 ? '+' : '' }}{{ m.changeFromLastMm }}
                    </span>
                  } @else { - }
                </mat-cell>
              </ng-container>
              <ng-container matColumnDef="confidence">
                <mat-header-cell *matHeaderCellDef>신뢰도</mat-header-cell>
                <mat-cell *matCellDef="let m">
                  @if (m.isManualOverride) {
                    <mat-chip size="small" color="warn">수동</mat-chip>
                  } @else {
                    <span>{{ ((m.autoConfidence ?? 0) * 100) | number:'1.0-0' }}%</span>
                  }
                </mat-cell>
              </ng-container>
              <ng-container matColumnDef="measuredBy">
                <mat-header-cell *matHeaderCellDef>측정자</mat-header-cell>
                <mat-cell *matCellDef="let m">{{ m.measuredBy }}</mat-cell>
              </ng-container>

              <mat-header-row *matHeaderRowDef="tableColumns" />
              <mat-row *matRowDef="let row; columns: tableColumns;"
                [class.exceed-row]="row.exceedsThreshold" />
            </mat-table>
          </mat-card-content>
        </mat-card>
      </div>
    }
  `,
  styles: [`
    .loading-center { display: flex; justify-content: center; padding: 80px; }
    .history-layout { display: flex; flex-direction: column; gap: 16px; }
    .gauge-icon { font-size: 32px; height: 32px; width: 32px; }
    .gauge-icon.risk-high { color: #f44336; }
    .gauge-icon.risk-medium { color: #ff9800; }
    .gauge-icon.risk-low { color: #4caf50; }
    .gauge-metrics {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 12px 0;
    }
    .metric { display: flex; flex-direction: column; gap: 4px; }
    .metric-label { font-size: 11px; color: #888; text-transform: uppercase; }
    .metric-value { font-size: 20px; font-weight: 700; }
    .metric-value.threshold { color: #ff9800; }
    .metric-value.danger { color: #f44336; }
    .threshold-alert {
      display: flex; align-items: center; gap: 8px;
      background: #ffebee; color: #c62828; padding: 10px 16px;
      border-radius: 8px; font-weight: 600; margin-top: 12px;
    }
    .chart-card { }
    .chart-controls { display: flex; align-items: center; gap: 4px; margin-left: auto; flex-wrap: wrap; }
    .active-range { background: #1976d2 !important; color: white !important; }
    .chart-wrapper { height: 320px; }
    .trend-row { display: flex; gap: 24px; margin-top: 12px; padding-top: 12px; border-top: 1px solid #f0f0f0; }
    .trend-item { display: flex; align-items: center; gap: 6px; font-size: 13px; }
    .trend-item mat-icon.up { color: #f44336; }
    .trend-item mat-icon.down { color: #4caf50; }
    .trend-item mat-icon.stable { color: #9e9e9e; }
    .trend-label { color: #888; }
    .danger { color: #f44336; font-weight: 600; }
    .warn-icon { font-size: 14px; color: #f44336; vertical-align: middle; }
    .exceed-row { background: rgba(244, 67, 54, 0.05); }
    .table-card mat-table { width: 100%; }
    mat-header-cell, mat-cell { padding: 0 8px; }
  `],
})
export class CrackHistoryComponent implements OnInit, OnDestroy {
  @ViewChild('chartCanvas', { static: false }) chartCanvasRef!: ElementRef<HTMLCanvasElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);

  readonly gaugePoint = signal<CrackGaugePoint | null>(null);
  readonly measurements = signal<CrackMeasurement[]>([]);
  readonly loading = signal(true);
  readonly selectedRange = signal<DateRange>('6M');
  readonly chartType = signal<'line' | 'bar'>('line');

  private chart: Chart | null = null;
  private gaugeId = '';

  readonly tableColumns = ['measuredAt', 'measuredWidthMm', 'changeFromBaseline', 'changeFromLast', 'confidence', 'measuredBy'];

  readonly dateRanges: { label: string; value: DateRange }[] = [
    { label: '1개월', value: '1M' },
    { label: '3개월', value: '3M' },
    { label: '6개월', value: '6M' },
    { label: '1년', value: '1Y' },
    { label: '전체', value: 'ALL' },
  ];

  ngOnInit() {
    this.gaugeId = this.route.snapshot.paramMap.get('gaugeId')!;
    this.loadData();
  }

  ngOnDestroy() {
    this.chart?.destroy();
  }

  private loadData() {
    this.loading.set(true);
    Promise.all([
      this.http.get<any>(`${environment.apiUrl}/cracks/gauge-points/${this.gaugeId}`).toPromise(),
      this.http.get<any>(`${environment.apiUrl}/cracks/measurements/history?gaugePointId=${this.gaugeId}&limit=200`).toPromise(),
    ]).then(([gpRes, histRes]) => {
      this.gaugePoint.set(gpRes.data);
      this.measurements.set(histRes.data?.measurements ?? []);
      this.loading.set(false);
      setTimeout(() => this.buildChart(), 100);
    }).catch(() => this.loading.set(false));
  }

  readonly filteredMeasurements = () => {
    const cutoff = this.getRangeCutoff();
    if (!cutoff) return this.measurements();
    return this.measurements().filter((m) => new Date(m.measuredAt) >= cutoff);
  };

  readonly latestMeasurement = () => {
    const m = this.measurements();
    return m.length > 0 ? m[m.length - 1] : null;
  };

  readonly latestExceedsThreshold = () => this.latestMeasurement()?.exceedsThreshold ?? false;

  readonly recentChange = () => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const recent = this.measurements().filter((m) => new Date(m.measuredAt) >= cutoff);
    if (recent.length < 2) return 0;
    return recent[recent.length - 1].measuredWidthMm - recent[0].measuredWidthMm;
  };

  private buildChart() {
    if (!this.chartCanvasRef) return;
    this.chart?.destroy();

    const data = this.filteredMeasurements();
    const threshold = this.gaugePoint()?.thresholdMm ?? 0;
    const baseline = this.gaugePoint()?.baselineWidthMm ?? 0;

    const labels = data.map((m) => new Date(m.measuredAt));
    const widths = data.map((m) => m.measuredWidthMm);

    this.chart = new Chart(this.chartCanvasRef.nativeElement, {
      type: this.chartType(),
      data: {
        labels,
        datasets: [
          {
            label: '균열 폭 (mm)',
            data: widths,
            borderColor: '#1976d2',
            backgroundColor: this.chartType() === 'bar'
              ? data.map((m) => m.exceedsThreshold ? 'rgba(244,67,54,0.6)' : 'rgba(25,118,210,0.5)')
              : 'rgba(25,118,210,0.1)',
            borderWidth: 2,
            pointRadius: data.map((m) => m.exceedsThreshold ? 6 : 4),
            pointBackgroundColor: data.map((m) => m.exceedsThreshold ? '#f44336' : '#1976d2'),
            tension: 0.3,
            fill: this.chartType() === 'line',
          },
          {
            label: `임계치 (${threshold} mm)`,
            data: labels.map(() => threshold),
            borderColor: '#f44336',
            borderDash: [6, 4],
            borderWidth: 2,
            pointRadius: 0,
            type: 'line',
            fill: false,
          },
          {
            label: `기준값 (${baseline} mm)`,
            data: labels.map(() => baseline),
            borderColor: '#4caf50',
            borderDash: [3, 3],
            borderWidth: 1.5,
            pointRadius: 0,
            type: 'line',
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              label: (ctx: TooltipItem<'line'>) => `${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(2) ?? '0'} mm`,
              afterLabel: (ctx: TooltipItem<'line'>) => {
                const m = data[ctx.dataIndex];
                if (m && ctx.datasetIndex === 0) {
                  return [
                    `기준 대비: ${m.changeFromBaselineMm > 0 ? '+' : ''}${m.changeFromBaselineMm} mm`,
                    m.isManualOverride ? '(수동 측정)' : `신뢰도: ${((m.autoConfidence ?? 0) * 100).toFixed(0)}%`,
                  ];
                }
                return [];
              },
            },
          },
          annotation: {
            // chartjs-plugin-annotation for shading above threshold
          },
        } as any,
        scales: {
          x: {
            type: 'time',
            time: {
              unit: this.getTimeUnit(),
              displayFormats: { day: 'MM/dd', week: 'MM/dd', month: 'yyyy/MM' },
            },
            adapters: { date: { locale: ko } },
            title: { display: true, text: '측정일' },
          },
          y: {
            title: { display: true, text: '균열 폭 (mm)' },
            min: 0,
            suggestedMax: Math.max(...widths, threshold) * 1.2,
          },
        },
      },
    });
  }

  setRange(range: DateRange) {
    this.selectedRange.set(range);
    setTimeout(() => this.buildChart(), 0);
  }

  toggleChartType() {
    this.chartType.set(this.chartType() === 'line' ? 'bar' : 'line');
    setTimeout(() => this.buildChart(), 0);
  }

  exportCsv() {
    const rows = [
      ['측정일시', '측정값(mm)', '기준대비(mm)', '전회대비(mm)', '임계치초과', '신뢰도', '측정자'],
      ...this.measurements().map((m) => [
        m.measuredAt,
        m.measuredWidthMm,
        m.changeFromBaselineMm,
        m.changeFromLastMm ?? '',
        m.exceedsThreshold ? 'Y' : 'N',
        m.isManualOverride ? '수동' : ((m.autoConfidence ?? 0) * 100).toFixed(0) + '%',
        m.measuredBy,
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crack_${this.gaugeId}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private getRangeCutoff(): Date | null {
    const now = new Date();
    switch (this.selectedRange()) {
      case '1M': return new Date(now.setMonth(now.getMonth() - 1));
      case '3M': return new Date(now.setMonth(now.getMonth() - 3));
      case '6M': return new Date(now.setMonth(now.getMonth() - 6));
      case '1Y': return new Date(now.setFullYear(now.getFullYear() - 1));
      default: return null;
    }
  }

  private getTimeUnit(): 'day' | 'week' | 'month' {
    switch (this.selectedRange()) {
      case '1M': return 'day';
      case '3M': return 'week';
      case '6M': return 'week';
      default: return 'month';
    }
  }

  getRiskClass(): string {
    if (this.latestExceedsThreshold()) return 'risk-high';
    const latest = this.latestMeasurement();
    const threshold = this.gaugePoint()?.thresholdMm ?? 0;
    if (latest && latest.measuredWidthMm > threshold * 0.8) return 'risk-medium';
    return 'risk-low';
  }

  getTrendIcon(): string {
    const change = this.recentChange();
    if (change > 0.1) return 'trending_up';
    if (change < -0.05) return 'trending_down';
    return 'trending_flat';
  }
  getTrendClass(): string {
    const change = this.recentChange();
    if (change > 0.1) return 'up';
    if (change < -0.05) return 'down';
    return 'stable';
  }
  getTrendLabel(): string {
    const change = this.recentChange();
    if (change > 0.1) return '균열 진행 중';
    if (change < -0.05) return '균열 회복 중';
    return '균열 안정';
  }
}
