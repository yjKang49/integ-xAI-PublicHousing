// apps/admin-web/src/app/features/iot/components/sensor-status-card.component.ts
// Phase 2-8: 센서 상태 카드 컴포넌트

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import {
  SensorType, SensorStatus,
  SENSOR_TYPE_LABELS, SENSOR_TYPE_ICONS, SENSOR_STATUS_LABELS,
  THRESHOLD_STATUS_COLORS, THRESHOLD_STATUS_LABELS,
} from '@ax/shared';

@Component({
  selector: 'ax-sensor-status-card',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatIconModule, MatButtonModule,
    MatTooltipModule, MatChipsModule,
  ],
  template: `
    <mat-card class="sensor-card" [class]="'card-' + thresholdClass">
      <!-- 헤더: 센서 유형 아이콘 + 이름 -->
      <div class="card-header">
        <div class="type-icon-wrap" [style.background]="typeColor">
          <mat-icon>{{ typeIcon }}</mat-icon>
        </div>
        <div class="card-title-area">
          <span class="sensor-name">{{ sensor.name }}</span>
          <span class="device-key">{{ sensor.deviceKey }}</span>
        </div>
        <button mat-icon-button class="action-btn" (click)="detail.emit(sensor)"
          matTooltip="상세 / 추이">
          <mat-icon>bar_chart</mat-icon>
        </button>
      </div>

      <!-- 측정값 -->
      <div class="value-area">
        @if (sensor.lastValue != null) {
          <span class="value-number" [style.color]="thresholdColor">
            {{ sensor.lastValue | number:'1.1-1' }}
          </span>
          <span class="value-unit">{{ sensor.thresholds.unit }}</span>
        } @else {
          <span class="no-value">—</span>
        }
      </div>

      <!-- 임계치 배지 -->
      @if (sensor.lastValue != null) {
        <div class="threshold-row">
          <span class="threshold-badge" [style.background]="thresholdColor + '22'" [style.color]="thresholdColor">
            {{ thresholdLabel }}
          </span>
          <span class="last-seen">{{ sensor.lastValueAt | date:'MM/dd HH:mm' }}</span>
        </div>
      }

      <!-- 메타 -->
      <div class="meta-row">
        <mat-chip class="status-chip" [style.background]="statusBg">
          <mat-icon class="chip-icon">{{ statusIcon }}</mat-icon>
          {{ statusLabel }}
        </mat-chip>
        <span class="location-text" [matTooltip]="sensor.locationDescription">
          {{ sensor.locationDescription | slice:0:20 }}{{ sensor.locationDescription?.length > 20 ? '…' : '' }}
        </span>
      </div>

      @if (sensor.batteryLevel != null) {
        <div class="battery-row">
          <mat-icon class="bat-icon" [style.color]="batteryColor">
            {{ batteryIcon }}
          </mat-icon>
          <span class="bat-text">{{ sensor.batteryLevel }}%</span>
        </div>
      }
    </mat-card>
  `,
  styles: [`
    .sensor-card {
      padding: 12px;
      border-radius: 10px;
      border-top: 3px solid transparent;
      transition: box-shadow .15s;
      cursor: default;
    }
    .sensor-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.15); }
    .card-normal   { border-top-color: #2e7d32; }
    .card-warning  { border-top-color: #f57c00; }
    .card-critical { border-top-color: #c62828; background: #fff9f9; }

    .card-header { display:flex; align-items:flex-start; gap:10px; margin-bottom:10px; }
    .type-icon-wrap {
      width:36px; height:36px; border-radius:8px;
      display:flex; align-items:center; justify-content:center; flex-shrink:0;
    }
    .type-icon-wrap mat-icon { color:white; font-size:20px; width:20px; height:20px; }
    .card-title-area { flex:1; min-width:0; }
    .sensor-name { display:block; font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .device-key  { display:block; font-size:11px; color:#888; font-family:monospace; }
    .action-btn  { margin-top:-4px; }

    .value-area { text-align:center; padding:8px 0; }
    .value-number { font-size:32px; font-weight:700; line-height:1; }
    .value-unit   { font-size:14px; color:#666; margin-left:4px; }
    .no-value     { font-size:28px; color:#ccc; }

    .threshold-row { display:flex; align-items:center; justify-content:space-between; margin:4px 0 8px; }
    .threshold-badge {
      font-size:11px; font-weight:600; padding:2px 8px;
      border-radius:10px; border:1px solid currentColor;
    }
    .last-seen { font-size:11px; color:#999; }

    .meta-row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    .status-chip {
      font-size:11px; height:22px; color:#333;
      display:inline-flex; align-items:center; gap:4px;
      padding:0 8px; border-radius:11px;
    }
    .chip-icon { font-size:14px; width:14px; height:14px; }
    .location-text { font-size:11px; color:#777; }

    .battery-row { display:flex; align-items:center; gap:4px; margin-top:6px; }
    .bat-icon { font-size:16px; width:16px; height:16px; }
    .bat-text { font-size:11px; color:#777; }
  `],
})
export class SensorStatusCardComponent {
  @Input() sensor: any;
  @Output() detail = new EventEmitter<any>();

  // 센서 유형 표시
  get typeIcon() { return SENSOR_TYPE_ICONS[this.sensor?.sensorType as SensorType] ?? 'sensors'; }
  get typeColor() {
    const colors: Record<SensorType, string> = {
      TEMPERATURE: '#e53935', HUMIDITY: '#1976d2', VIBRATION: '#7b1fa2',
      LEAK: '#0288d1', POWER: '#f9a825', CO2: '#388e3c',
      PRESSURE: '#5d4037', WATER_LEVEL: '#00838f',
    };
    return colors[this.sensor?.sensorType as SensorType] ?? '#607d8b';
  }

  // 임계치 상태 표시
  get thresholdClass(): string {
    const s = this.sensor?.lastValue != null
      ? this.evaluateThreshold(this.sensor.lastValue)
      : 'normal';
    return s.toLowerCase();
  }
  get thresholdColor() { return THRESHOLD_STATUS_COLORS[this.evaluateThreshold(this.sensor?.lastValue)] ?? '#2e7d32'; }
  get thresholdLabel() { return THRESHOLD_STATUS_LABELS[this.evaluateThreshold(this.sensor?.lastValue)] ?? '정상'; }

  private evaluateThreshold(value?: number): 'NORMAL' | 'WARNING' | 'CRITICAL' {
    if (value == null) return 'NORMAL';
    const t = this.sensor?.thresholds;
    if (!t) return 'NORMAL';
    if ((t.criticalMax != null && value > t.criticalMax) || (t.criticalMin != null && value < t.criticalMin)) return 'CRITICAL';
    if ((t.warningMax  != null && value > t.warningMax)  || (t.warningMin  != null && value < t.warningMin))  return 'WARNING';
    return 'NORMAL';
  }

  // 운영 상태 표시
  get statusLabel() { return SENSOR_STATUS_LABELS[this.sensor?.status as SensorStatus] ?? ''; }
  get statusBg() {
    const colors: Record<SensorStatus, string> = {
      ACTIVE: '#e8f5e9', INACTIVE: '#f5f5f5', ERROR: '#ffebee', MAINTENANCE: '#fff3e0',
    };
    return colors[this.sensor?.status as SensorStatus] ?? '#f5f5f5';
  }
  get statusIcon() {
    const icons: Record<SensorStatus, string> = {
      ACTIVE: 'check_circle', INACTIVE: 'pause_circle', ERROR: 'error', MAINTENANCE: 'build',
    };
    return icons[this.sensor?.status as SensorStatus] ?? 'help';
  }

  // 배터리
  get batteryColor() {
    const l = this.sensor?.batteryLevel ?? 100;
    return l <= 20 ? '#c62828' : l <= 50 ? '#f57c00' : '#2e7d32';
  }
  get batteryIcon() {
    const l = this.sensor?.batteryLevel ?? 100;
    return l <= 20 ? 'battery_1_bar' : l <= 50 ? 'battery_3_bar' : 'battery_full';
  }
}
