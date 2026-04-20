// apps/admin-web/src/app/shared/components/crack-trend-chart/crack-trend-chart.component.ts
// Apache ECharts 기반 균열 추이 차트 — 시계열 데이터, 줌인/아웃, 임계치 표시
import {
  Component, Input, OnChanges, SimpleChanges,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';

export interface CrackDataPoint {
  date: string;   // ISO date
  widthMm: number;
}

@Component({
  selector: 'ax-crack-trend-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgxEchartsDirective],
  template: `
    <div
      echarts
      [options]="chartOptions"
      [merge]="chartMerge"
      class="ax-crack-chart"
    ></div>
  `,
  styles: [`
    .ax-crack-chart {
      width: 100%;
      height: 260px;
    }
  `],
})
export class CrackTrendChartComponent implements OnChanges {
  @Input() data: CrackDataPoint[] = [];
  @Input() thresholdMm = 1.0;
  @Input() criticalMm  = 2.0;
  @Input() title       = '균열 폭 추이';

  chartOptions: EChartsOption = {};
  chartMerge: EChartsOption  = {};

  ngOnChanges(_: SimpleChanges) {
    this._buildChart();
  }

  private _buildChart() {
    const dates  = this.data.map(d => d.date.slice(0, 10));
    const values = this.data.map(d => d.widthMm);
    const max    = Math.max(...values, this.criticalMm * 1.2);

    this.chartOptions = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#0d1117',
        borderColor: '#30363d',
        textStyle: { color: '#e6edf3', fontSize: 12 },
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          return `<b>${p.axisValue}</b><br/>균열 폭: <b style="color:#58a6ff">${p.value} mm</b>`;
        },
      },
      grid: { top: 48, bottom: 60, left: 52, right: 24 },
      dataZoom: [
        { type: 'inside', xAxisIndex: 0, start: 0, end: 100 },
        { type: 'slider', xAxisIndex: 0, bottom: 8, height: 20,
          borderColor: '#21262d', textStyle: { color: '#8b949e' },
          fillerColor: 'rgba(88,166,255,0.1)', handleStyle: { color: '#58a6ff' } },
      ],
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: '#21262d' } },
        axisLabel: { color: '#8b949e', fontSize: 11 },
        splitLine: { lineStyle: { color: '#21262d', type: 'dashed' } },
      },
      yAxis: {
        type: 'value',
        name: '균열폭 (mm)',
        nameTextStyle: { color: '#8b949e', fontSize: 11 },
        min: 0,
        max: +max.toFixed(2),
        axisLine: { lineStyle: { color: '#21262d' } },
        axisLabel: { color: '#8b949e', fontSize: 11 },
        splitLine: { lineStyle: { color: '#21262d', type: 'dashed' } },
      },
      series: [
        {
          name: '균열 폭',
          type: 'line',
          data: values,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { color: '#58a6ff', width: 2 },
          itemStyle: { color: '#58a6ff' },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(88,166,255,0.3)' },
                { offset: 1, color: 'rgba(88,166,255,0.02)' },
              ],
            },
          },
          markLine: {
            silent: true,
            symbol: ['none', 'none'],
            data: [
              {
                yAxis: this.thresholdMm,
                lineStyle: { color: '#d29922', type: 'dashed', width: 1.5 },
                label: { formatter: `허용 기준 ${this.thresholdMm}mm`, color: '#d29922', fontSize: 10 },
              },
              {
                yAxis: this.criticalMm,
                lineStyle: { color: '#f85149', type: 'dashed', width: 1.5 },
                label: { formatter: `긴급 기준 ${this.criticalMm}mm`, color: '#f85149', fontSize: 10 },
              },
            ],
          },
        },
      ],
    };
  }
}
