// apps/admin-web/src/app/features/cracks/components/crack-chart.component.ts
// 재사용 가능한 균열 폭 시계열 차트 컴포넌트
import {
  Component, OnChanges, OnDestroy, ViewChild, ElementRef,
  input, output, signal, SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Chart, registerables, type TooltipItem } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { ko } from 'date-fns/locale';
import { CrackGaugePoint, CrackMeasurement } from '@ax/shared';

Chart.register(...registerables);

export type ChartDateRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';
export type ChartType = 'line' | 'bar';

@Component({
  selector: 'ax-crack-chart',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="chart-wrapper">
      <!-- Controls -->
      <div class="chart-controls">
        <div class="range-btns">
          @for (r of dateRanges; track r.value) {
            <button mat-stroked-button
              [class.active-range]="selectedRange() === r.value"
              (click)="setRange(r.value)">{{ r.label }}</button>
          }
        </div>
        <div class="action-btns">
          <button mat-icon-button (click)="toggleChartType()" matTooltip="차트 유형 변경">
            <mat-icon>{{ chartType() === 'line' ? 'bar_chart' : 'show_chart' }}</mat-icon>
          </button>
          <button mat-icon-button (click)="exportCsv()" matTooltip="CSV 내보내기">
            <mat-icon>download</mat-icon>
          </button>
        </div>
      </div>

      <!-- Canvas -->
      <div class="canvas-container">
        <canvas #chartCanvas></canvas>
      </div>

      <!-- Trend summary -->
      <div class="trend-summary">
        <div class="trend-item">
          <mat-icon [class]="trendClass()">{{ trendIcon() }}</mat-icon>
          <span>{{ trendLabel() }}</span>
        </div>
        <div class="trend-item">
          <span class="muted">최근 30일 변화</span>
          <span [class.danger]="recentDelta() > 0" [class.safe]="recentDelta() < 0">
            {{ recentDelta() > 0 ? '+' : '' }}{{ recentDelta() | number:'1.2-2' }} mm
          </span>
        </div>
        <div class="trend-item">
          <span class="muted">표시 데이터</span>
          <span>{{ visibleData().length }}건</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chart-wrapper { display: flex; flex-direction: column; gap: 12px; }
    .chart-controls { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
    .range-btns { display: flex; gap: 4px; flex-wrap: wrap; }
    .active-range { background: #1976d2 !important; color: white !important; }
    .action-btns { display: flex; }
    .canvas-container { height: 300px; position: relative; }
    .trend-summary {
      display: flex; gap: 24px; padding-top: 12px;
      border-top: 1px solid #f0f0f0; flex-wrap: wrap;
    }
    .trend-item { display: flex; align-items: center; gap: 6px; font-size: 13px; }
    .muted { color: #888; }
    .danger { color: #f44336; font-weight: 600; }
    .safe { color: #4caf50; font-weight: 600; }
    mat-icon.up { color: #f44336; }
    mat-icon.down { color: #4caf50; }
    mat-icon.stable { color: #9e9e9e; }
  `],
})
export class CrackChartComponent implements OnChanges, OnDestroy {
  @ViewChild('chartCanvas', { static: false }) chartCanvasRef!: ElementRef<HTMLCanvasElement>;

  readonly gaugePoint = input<CrackGaugePoint | null>(null);
  readonly measurements = input<CrackMeasurement[]>([]);
  readonly rangeChange = output<ChartDateRange>();

  readonly selectedRange = signal<ChartDateRange>('6M');
  readonly chartType = signal<ChartType>('line');

  private chart: Chart | null = null;

  readonly dateRanges: { label: string; value: ChartDateRange }[] = [
    { label: '1개월', value: '1M' },
    { label: '3개월', value: '3M' },
    { label: '6개월', value: '6M' },
    { label: '1년',   value: '1Y' },
    { label: '전체',  value: 'ALL' },
  ];

  ngOnChanges(changes: SimpleChanges) {
    if (changes['measurements'] || changes['gaugePoint']) {
      // Rebuild chart after DOM settles
      setTimeout(() => this.buildChart(), 50);
    }
  }

  ngOnDestroy() {
    this.chart?.destroy();
  }

  readonly visibleData = () => {
    const cutoff = this.getCutoff();
    if (!cutoff) return this.measurements();
    return this.measurements().filter((m) => new Date(m.measuredAt) >= cutoff);
  };

  readonly recentDelta = () => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const recent = this.measurements().filter((m) => new Date(m.measuredAt) >= cutoff);
    if (recent.length < 2) return 0;
    return recent[recent.length - 1].measuredWidthMm - recent[0].measuredWidthMm;
  };

  readonly trendIcon = () => {
    const d = this.recentDelta();
    if (d > 0.1) return 'trending_up';
    if (d < -0.05) return 'trending_down';
    return 'trending_flat';
  };

  readonly trendClass = () => {
    const d = this.recentDelta();
    if (d > 0.1) return 'up';
    if (d < -0.05) return 'down';
    return 'stable';
  };

  readonly trendLabel = () => {
    const d = this.recentDelta();
    if (d > 0.1) return '균열 진행 중';
    if (d < -0.05) return '균열 회복 중';
    return '균열 안정';
  };

  setRange(range: ChartDateRange) {
    this.selectedRange.set(range);
    this.rangeChange.emit(range);
    setTimeout(() => this.buildChart(), 0);
  }

  toggleChartType() {
    this.chartType.set(this.chartType() === 'line' ? 'bar' : 'line');
    setTimeout(() => this.buildChart(), 0);
  }

  buildChart() {
    if (!this.chartCanvasRef?.nativeElement) return;
    this.chart?.destroy();

    const data = this.visibleData();
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
              ? data.map((m) => m.exceedsThreshold ? 'rgba(244,67,54,0.65)' : 'rgba(25,118,210,0.55)')
              : 'rgba(25,118,210,0.08)',
            borderWidth: 2,
            pointRadius: data.map((m) => m.exceedsThreshold ? 6 : 3),
            pointBackgroundColor: data.map((m) => m.exceedsThreshold ? '#f44336' : '#1976d2'),
            tension: 0.35,
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
              label: (ctx: TooltipItem<'line'>) =>
                `${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(2) ?? '0'} mm`,
              afterLabel: (ctx: TooltipItem<'line'>) => {
                if (ctx.datasetIndex !== 0) return [];
                const m = data[ctx.dataIndex];
                if (!m) return [];
                const lines = [
                  `기준 대비: ${m.changeFromBaselineMm > 0 ? '+' : ''}${m.changeFromBaselineMm} mm`,
                ];
                if (m.changeFromLastMm !== undefined && m.changeFromLastMm !== null) {
                  lines.push(`전회 대비: ${m.changeFromLastMm > 0 ? '+' : ''}${m.changeFromLastMm} mm`);
                }
                lines.push(m.isManualOverride ? '수동 측정' : `신뢰도: ${((m.autoConfidence ?? 0) * 100).toFixed(0)}%`);
                if (m.exceedsThreshold) lines.push('⚠ 임계치 초과');
                return lines;
              },
            },
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
            suggestedMax: widths.length > 0
              ? Math.max(...widths, threshold) * 1.25
              : threshold * 1.5 || 1,
          },
        },
      },
    });
  }

  exportCsv() {
    const rows = [
      ['측정일시', '측정값(mm)', '기준대비(mm)', '전회대비(mm)', '임계치초과', '신뢰도', '방식'],
      ...this.measurements().map((m) => [
        m.measuredAt,
        m.measuredWidthMm,
        m.changeFromBaselineMm,
        m.changeFromLastMm ?? '',
        m.exceedsThreshold ? 'Y' : 'N',
        m.isManualOverride ? '수동' : `${((m.autoConfidence ?? 0) * 100).toFixed(0)}%`,
        m.isManualOverride ? 'MANUAL' : 'IMAGE_ASSISTED',
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crack_measurements_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private getCutoff(): Date | null {
    const now = new Date();
    switch (this.selectedRange()) {
      case '1M': { const d = new Date(now); d.setMonth(d.getMonth() - 1);  return d; }
      case '3M': { const d = new Date(now); d.setMonth(d.getMonth() - 3);  return d; }
      case '6M': { const d = new Date(now); d.setMonth(d.getMonth() - 6);  return d; }
      case '1Y': { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return d; }
      default: return null;
    }
  }

  private getTimeUnit(): 'day' | 'week' | 'month' {
    switch (this.selectedRange()) {
      case '1M': return 'day';
      case '3M': case '6M': return 'week';
      default: return 'month';
    }
  }
}
