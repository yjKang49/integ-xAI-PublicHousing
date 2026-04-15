// apps/admin-web/src/app/features/iot/components/sensor-trend-chart.component.ts
// Phase 2-8: 센서 추이 SVG 차트 컴포넌트

import {
  Component, Input, OnChanges, ElementRef, ViewChild, AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

interface ChartPoint { x: number; y: number; value: number; ts: string; status: string; }

@Component({
  selector: 'ax-sensor-trend-chart',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  template: `
    <div class="chart-wrap">
      @if (loading) {
        <div class="chart-loading"><mat-spinner diameter="28" /></div>
      } @else if (!readings?.length) {
        <div class="chart-empty">
          <span>데이터 없음</span>
        </div>
      } @else {
        <svg #svgEl class="chart-svg" [attr.viewBox]="viewBox" preserveAspectRatio="none">
          <!-- 임계치 라인 (warning) -->
          @if (warningMaxY != null) {
            <line [attr.x1]="PAD" [attr.y1]="warningMaxY" [attr.x2]="W - PAD" [attr.y2]="warningMaxY"
              stroke="#f57c00" stroke-width="1" stroke-dasharray="4,3" opacity=".7" />
          }
          @if (criticalMaxY != null) {
            <line [attr.x1]="PAD" [attr.y1]="criticalMaxY" [attr.x2]="W - PAD" [attr.y2]="criticalMaxY"
              stroke="#c62828" stroke-width="1" stroke-dasharray="4,3" opacity=".7" />
          }

          <!-- 영역 그라디언트 -->
          <defs>
            <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#1976d2" stop-opacity=".2" />
              <stop offset="100%" stop-color="#1976d2" stop-opacity="0" />
            </linearGradient>
          </defs>

          <!-- 영역 채우기 -->
          @if (areaPath) {
            <path [attr.d]="areaPath" fill="url(#area-grad)" />
          }

          <!-- 라인 -->
          @if (linePath) {
            <path [attr.d]="linePath" fill="none" stroke="#1976d2" stroke-width="2" stroke-linejoin="round" />
          }

          <!-- 포인트 -->
          @for (p of points; track p.ts) {
            <circle [attr.cx]="p.x" [attr.cy]="p.y" r="3"
              [attr.fill]="dotColor(p.status)"
              stroke="white" stroke-width="1.5">
              <title>{{ p.value | number:'1.1-2' }} {{ unit }} — {{ p.ts | date:'MM/dd HH:mm' }}</title>
            </circle>
          }

          <!-- X 레이블 (첫/중간/마지막) -->
          @for (label of xLabels; track label.x) {
            <text [attr.x]="label.x" [attr.y]="H - 4" text-anchor="middle"
              font-size="9" fill="#aaa">{{ label.text }}</text>
          }

          <!-- Y 레이블 (최소/최대) -->
          <text [attr.x]="PAD - 2" [attr.y]="PAD + 4" text-anchor="end"
            font-size="9" fill="#aaa">{{ yMax | number:'1.0-0' }}</text>
          <text [attr.x]="PAD - 2" [attr.y]="H - PAD_B + 4" text-anchor="end"
            font-size="9" fill="#aaa">{{ yMin | number:'1.0-0' }}</text>
        </svg>
      }
    </div>
  `,
  styles: [`
    .chart-wrap { width:100%; height:140px; position:relative; }
    .chart-svg { width:100%; height:100%; display:block; }
    .chart-loading, .chart-empty {
      position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
      color:#aaa; font-size:13px;
    }
  `],
})
export class SensorTrendChartComponent implements OnChanges {
  @Input() readings: any[] = [];
  @Input() thresholds: any = {};
  @Input() unit = '';
  @Input() loading = false;

  readonly W = 400;
  readonly H = 120;
  readonly PAD = 30;
  readonly PAD_B = 18;

  points: ChartPoint[] = [];
  linePath = '';
  areaPath = '';
  xLabels: { x: number; text: string }[] = [];
  yMin = 0;
  yMax = 100;
  warningMaxY: number | null = null;
  criticalMaxY: number | null = null;

  get viewBox() { return `0 0 ${this.W} ${this.H}`; }

  ngOnChanges() { this.build(); }

  private build() {
    if (!this.readings?.length) { this.points = []; this.linePath = ''; return; }

    const sorted = [...this.readings].sort((a, b) => a.recordedAt < b.recordedAt ? -1 : 1);
    const values = sorted.map((r) => r.value as number);
    const raw_min = Math.min(...values);
    const raw_max = Math.max(...values);
    const pad = (raw_max - raw_min) * 0.1 || 1;
    this.yMin = raw_min - pad;
    this.yMax = raw_max + pad;

    const chartW = this.W - this.PAD * 2;
    const chartH = this.H - this.PAD - this.PAD_B;
    const toX = (i: number) => this.PAD + (chartW / Math.max(sorted.length - 1, 1)) * i;
    const toY = (v: number) => this.PAD + chartH - ((v - this.yMin) / (this.yMax - this.yMin)) * chartH;

    this.points = sorted.map((r, i) => ({
      x: toX(i), y: toY(r.value),
      value: r.value, ts: r.recordedAt, status: r.thresholdStatus,
    }));

    this.linePath = this.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const bottom = this.H - this.PAD_B;
    this.areaPath = `${this.linePath} L${this.points[this.points.length - 1].x},${bottom} L${this.points[0].x},${bottom} Z`;

    // 임계치 라인
    const { warningMax, criticalMax } = this.thresholds ?? {};
    this.warningMaxY  = warningMax  != null ? toY(warningMax)  : null;
    this.criticalMaxY = criticalMax != null ? toY(criticalMax) : null;

    // X 레이블
    const n = sorted.length;
    const idxs = n <= 2 ? [0, n - 1] : [0, Math.floor(n / 2), n - 1];
    this.xLabels = [...new Set(idxs)].map((i) => ({
      x: toX(i),
      text: new Date(sorted[i].recordedAt).toLocaleTimeString('ko', { hour: '2-digit', minute: '2-digit' }),
    }));
  }

  dotColor(status: string) {
    return status === 'CRITICAL' ? '#c62828' : status === 'WARNING' ? '#f57c00' : '#1976d2';
  }
}
