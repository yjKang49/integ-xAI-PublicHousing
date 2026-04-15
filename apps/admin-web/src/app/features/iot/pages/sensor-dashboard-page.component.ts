// apps/admin-web/src/app/features/iot/pages/sensor-dashboard-page.component.ts
// Phase 2-8: IoT 센서 대시보드 페이지

import {
  Component, OnInit, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SensorType, SensorStatus, SENSOR_TYPE_LABELS, SENSOR_STATUS_LABELS } from '@ax/shared';
import { SensorStatusCardComponent } from '../components/sensor-status-card.component';
import { SensorTrendChartComponent } from '../components/sensor-trend-chart.component';
import { SensorRegistrationFormComponent } from '../components/sensor-registration-form.component';
import { LiveSensorOverviewComponent } from '../components/live-sensor-overview.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'ax-sensor-dashboard-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatIconModule, MatSelectModule,
    MatFormFieldModule, MatTabsModule,
    MatDividerModule, MatSnackBarModule, MatProgressSpinnerModule,
    MatTooltipModule,
    SensorStatusCardComponent, SensorTrendChartComponent, SensorRegistrationFormComponent,
    LiveSensorOverviewComponent, EmptyStateComponent,
  ],
  template: `
    <div class="ax-sensor-page">

      <!-- 헤더 -->
      <div class="ax-sensor-header">
        <div class="ax-sensor-header__identity">
          <div class="ax-sensor-header__icon-wrap">
            <mat-icon>sensors</mat-icon>
          </div>
          <div>
            <h1 class="ax-sensor-header__title">IoT 센서 대시보드</h1>
            <p class="ax-sensor-header__desc">
              {{ sensors().length }}개 센서 실시간 상태 모니터링 및 임계값 관리
            </p>
          </div>
        </div>
        <div class="ax-sensor-header__actions">
          <button mat-stroked-button (click)="loadSensors()" matTooltip="데이터 새로고침">
            <mat-icon>refresh</mat-icon> 새로고침
          </button>
          <button mat-flat-button color="primary" (click)="showRegister = !showRegister">
            <mat-icon>add</mat-icon> 센서 등록
          </button>
        </div>
      </div>

      <!-- AI 실시간 5센서 개요 패널 -->
      <ax-live-sensor-overview
        class="ax-sensor-live-overview"
        (sensorClick)="onLiveSensorClick($event)"
      />

      <!-- 요약 통계 -->
      <div class="ax-sensor-stats">
        <button
          class="ax-sensor-stat"
          [class.ax-sensor-stat--active]="filterStatus === ''"
          (click)="filterStatus = ''; applyFilter()"
        >
          <span class="ax-sensor-stat__num">{{ sensors().length }}</span>
          <span class="ax-sensor-stat__lbl">전체</span>
        </button>
        <button
          class="ax-sensor-stat ax-sensor-stat--danger"
          [class.ax-sensor-stat--active]="filterStatus === 'CRITICAL'"
          (click)="filterStatus = filterStatus === 'CRITICAL' ? '' : 'CRITICAL'; applyFilter()"
        >
          <span class="ax-sensor-stat__num">{{ criticalCount() }}</span>
          <span class="ax-sensor-stat__lbl">위험</span>
        </button>
        <button
          class="ax-sensor-stat ax-sensor-stat--warn"
          [class.ax-sensor-stat--active]="filterStatus === 'WARNING'"
          (click)="filterStatus = filterStatus === 'WARNING' ? '' : 'WARNING'; applyFilter()"
        >
          <span class="ax-sensor-stat__num">{{ warningCount() }}</span>
          <span class="ax-sensor-stat__lbl">주의</span>
        </button>
        <div class="ax-sensor-stat ax-sensor-stat--error">
          <span class="ax-sensor-stat__num">{{ errorCount() }}</span>
          <span class="ax-sensor-stat__lbl">오류</span>
        </div>
      </div>

      <!-- 필터 바 -->
      <div class="ax-filter-bar">
        <div class="ax-filter-bar__filters">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>센서 유형</mat-label>
            <mat-select [(ngModel)]="filterType" (selectionChange)="applyFilter()">
              <mat-option value="">전체 유형</mat-option>
              @for (opt of typeOptions; track opt.value) {
                <mat-option [value]="opt.value">{{ opt.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>센서 상태</mat-label>
            <mat-select [(ngModel)]="filterStatus" (selectionChange)="applyFilter()">
              <mat-option value="">전체 상태</mat-option>
              @for (opt of statusOptions; track opt.value) {
                <mat-option [value]="opt.value">{{ opt.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>
        @if (filterType || filterStatus) {
          <div class="ax-filter-bar__actions">
            <button mat-stroked-button (click)="clearFilter()">
              <mat-icon>clear_all</mat-icon> 필터 초기화
            </button>
          </div>
        }
      </div>

      <!-- 센서 등록/수정 폼 (인라인) -->
      @if (showRegister) {
        <div class="ax-sensor-register-panel">
          <div class="ax-sensor-register-panel__hdr">
            <mat-icon>{{ editingSensor ? 'edit' : 'add_circle' }}</mat-icon>
            <span>{{ editingSensor ? '센서 수정' : '새 센서 등록' }}</span>
            <button mat-icon-button (click)="showRegister = false; editingSensor = null" matTooltip="닫기">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <div class="ax-sensor-register-panel__body">
            <ax-sensor-registration-form
              [sensor]="editingSensor"
              (saved)="onSaved($event)"
              (cancelled)="showRegister = false; editingSensor = null"
            />
          </div>
        </div>
      }

      <!-- 로딩 -->
      @if (loading()) {
        <div class="ax-loading-center">
          <mat-spinner diameter="40" />
        </div>
      }

      <!-- 센서 그리드 (상세 패널 열리지 않은 경우) -->
      @if (!loading() && !selectedSensor()) {
        @if (filteredSensors().length === 0) {
          <ax-empty-state
            type="empty"
            icon="sensors_off"
            title="등록된 센서가 없습니다"
            description="센서를 등록하면 실시간 상태와 임계값 알림을 확인할 수 있습니다"
            primaryLabel="첫 센서 등록"
            primaryIcon="add"
            (primaryAction)="showRegister = true"
          />
        } @else {
          <div class="ax-sensor-grid">
            @for (s of filteredSensors(); track s._id) {
              <ax-sensor-status-card
                [sensor]="s"
                (detail)="selectSensor($event)"
              />
            }
          </div>
        }
      }

      <!-- 센서 상세 + 추이 패널 -->
      @if (selectedSensor()) {
        <div class="ax-sensor-detail">
          <div class="ax-sensor-detail__hdr">
            <mat-icon class="ax-sensor-detail__hdr-icon">sensors</mat-icon>
            <span class="ax-sensor-detail__hdr-title">{{ selectedSensor().name }}</span>
            <span class="ax-sensor-detail__hdr-sub">측정 추이</span>
            <button mat-icon-button matTooltip="수정" (click)="editSensor(selectedSensor())">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button matTooltip="닫기" (click)="selectedSensor.set(null)">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="ax-sensor-detail__body">
            <!-- 메타 정보 -->
            <div class="ax-sensor-detail__meta">
              <span class="ax-sensor-detail__meta-item">
                <mat-icon>place</mat-icon>
                {{ selectedSensor().locationDescription }}
              </span>
              <span class="ax-sensor-detail__meta-item">
                <mat-icon>tag</mat-icon>
                {{ selectedSensor().deviceKey }}
              </span>
              @if (selectedSensor().manufacturer) {
                <span class="ax-sensor-detail__meta-item">
                  <mat-icon>precision_manufacturing</mat-icon>
                  {{ selectedSensor().manufacturer }} {{ selectedSensor().model }}
                </span>
              }
            </div>

            <!-- 시간 범위 선택 -->
            <div class="ax-sensor-detail__range">
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>표시 범위</mat-label>
                <mat-select [(ngModel)]="readingLimit" (selectionChange)="loadReadings(selectedSensor()._id)">
                  <mat-option [value]="20">최근 20개</mat-option>
                  <mat-option [value]="50">최근 50개</mat-option>
                  <mat-option [value]="100">최근 100개</mat-option>
                </mat-select>
              </mat-form-field>
              <span class="ax-sensor-detail__reading-count">{{ readings().length }}개 데이터</span>
            </div>

            <!-- 추이 차트 -->
            <ax-sensor-trend-chart
              [readings]="readings()"
              [thresholds]="selectedSensor().thresholds"
              [unit]="selectedSensor().thresholds?.unit"
              [loading]="readingLoading()"
            />

            <!-- 최근 측정값 테이블 -->
            <div class="ax-sensor-table-wrap">
              <table class="ax-sensor-table">
                <thead>
                  <tr>
                    <th>시각</th>
                    <th>측정값</th>
                    <th>상태</th>
                    <th>품질</th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of readings().slice(0, 10); track r._id) {
                    <tr [class]="'ax-sensor-table__row--' + r.thresholdStatus.toLowerCase()">
                      <td>{{ r.recordedAt | date:'MM/dd HH:mm:ss' }}</td>
                      <td class="ax-sensor-table__val">{{ r.value | number:'1.1-2' }} {{ r.unit }}</td>
                      <td>
                        <span class="ax-sensor-table__dot ax-sensor-table__dot--{{ r.thresholdStatus.toLowerCase() }}"></span>
                        {{ thresholdLabel(r.thresholdStatus) }}
                      </td>
                      <td>{{ r.quality }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    /* ── 페이지 래퍼 ── */
    .ax-sensor-page {
      display: flex;
      flex-direction: column;
      gap: var(--ax-spacing-5);
      max-width: 1200px;
      margin: 0 auto;
    }

    /* ── 헤더 ── */
    .ax-sensor-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: var(--ax-spacing-4);
    }
    .ax-sensor-header__identity {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-3);
    }
    .ax-sensor-header__icon-wrap {
      width: 44px; height: 44px;
      border-radius: var(--ax-radius-md);
      background: var(--ax-color-info);
      display: flex; align-items: center; justify-content: center;
      color: #fff; flex-shrink: 0;
    }
    .ax-sensor-header__title {
      margin: 0;
      font-size: var(--ax-font-size-xl);
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
      line-height: 1.3;
    }
    .ax-sensor-header__desc {
      margin: 2px 0 0;
      font-size: var(--ax-font-size-sm);
      color: var(--ax-color-text-secondary);
    }
    .ax-sensor-header__actions {
      display: flex;
      gap: var(--ax-spacing-2);
      flex-shrink: 0;
    }

    /* ── 라이브 개요 ── */
    .ax-sensor-live-overview {
      display: block;
    }

    /* ── 통계 카운터 ── */
    .ax-sensor-stats {
      display: flex;
      gap: var(--ax-spacing-3);
      flex-wrap: wrap;
    }
    .ax-sensor-stat {
      flex: 1;
      min-width: 72px;
      padding: var(--ax-spacing-3) var(--ax-spacing-4);
      border-radius: var(--ax-radius-md);
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border-muted);
      text-align: center;
      cursor: pointer;
      transition: box-shadow 0.15s ease;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--ax-spacing-1);
    }
    .ax-sensor-stat:hover {
      box-shadow: var(--ax-shadow-sm);
    }
    .ax-sensor-stat--active {
      border-color: var(--ax-color-brand-primary);
      box-shadow: var(--ax-shadow-sm);
    }
    .ax-sensor-stat__num {
      display: block;
      font-size: 26px;
      font-weight: var(--ax-font-weight-bold);
      color: var(--ax-color-text-primary);
      line-height: 1.2;
    }
    .ax-sensor-stat__lbl {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-secondary);
    }
    .ax-sensor-stat--danger .ax-sensor-stat__num { color: var(--ax-color-danger); }
    .ax-sensor-stat--warn   .ax-sensor-stat__num { color: var(--ax-color-warning); }
    .ax-sensor-stat--error  .ax-sensor-stat__num { color: var(--ax-color-brand-accent, #7b1fa2); }
    .ax-sensor-stat--error  { cursor: default; }

    /* ── 등록 패널 ── */
    .ax-sensor-register-panel {
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border-muted);
      border-radius: var(--ax-radius-lg);
      overflow: hidden;
    }
    .ax-sensor-register-panel__hdr {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-2);
      padding: var(--ax-spacing-3) var(--ax-spacing-4);
      background: var(--ax-color-bg-surface-alt);
      border-bottom: 1px solid var(--ax-color-border-muted);
      font-size: var(--ax-font-size-base);
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
    }
    .ax-sensor-register-panel__hdr mat-icon:first-child {
      color: var(--ax-color-brand-primary);
    }
    .ax-sensor-register-panel__hdr button {
      margin-left: auto;
    }
    .ax-sensor-register-panel__body {
      padding: var(--ax-spacing-4);
    }

    /* ── 센서 그리드 ── */
    .ax-sensor-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: var(--ax-spacing-4);
    }

    /* ── 상세 패널 ── */
    .ax-sensor-detail {
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border-muted);
      border-radius: var(--ax-radius-lg);
      overflow: hidden;
    }
    .ax-sensor-detail__hdr {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-2);
      padding: var(--ax-spacing-3) var(--ax-spacing-4);
      background: var(--ax-color-bg-sidebar);
      color: #fff;
    }
    .ax-sensor-detail__hdr-icon {
      font-size: 18px; width: 18px; height: 18px;
      color: rgba(255, 255, 255, 0.8);
    }
    .ax-sensor-detail__hdr-title {
      font-size: var(--ax-font-size-base);
      font-weight: var(--ax-font-weight-semibold);
    }
    .ax-sensor-detail__hdr-sub {
      font-size: var(--ax-font-size-sm);
      color: rgba(255, 255, 255, 0.6);
    }
    .ax-sensor-detail__hdr button {
      color: rgba(255, 255, 255, 0.7);
    }
    .ax-sensor-detail__hdr button:hover {
      color: #fff;
    }
    .ax-sensor-detail__hdr button:last-child {
      margin-left: auto;
    }
    .ax-sensor-detail__body {
      padding: var(--ax-spacing-4);
      display: flex;
      flex-direction: column;
      gap: var(--ax-spacing-4);
    }
    .ax-sensor-detail__meta {
      display: flex;
      gap: var(--ax-spacing-4);
      flex-wrap: wrap;
    }
    .ax-sensor-detail__meta-item {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-1);
      font-size: var(--ax-font-size-sm);
      color: var(--ax-color-text-secondary);
    }
    .ax-sensor-detail__meta-item mat-icon {
      font-size: 16px; width: 16px; height: 16px;
      color: var(--ax-color-brand-primary);
    }
    .ax-sensor-detail__range {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-4);
    }
    .ax-sensor-detail__reading-count {
      font-size: var(--ax-font-size-sm);
      color: var(--ax-color-text-secondary);
    }

    /* ── 측정값 테이블 ── */
    .ax-sensor-table-wrap {
      overflow-x: auto;
    }
    .ax-sensor-table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--ax-font-size-sm);
    }
    .ax-sensor-table th {
      background: var(--ax-color-bg-surface-alt);
      padding: var(--ax-spacing-2) var(--ax-spacing-3);
      text-align: left;
      border-bottom: 1px solid var(--ax-color-border-muted);
      font-weight: var(--ax-font-weight-medium);
      color: var(--ax-color-text-secondary);
      font-size: var(--ax-font-size-xs);
    }
    .ax-sensor-table td {
      padding: var(--ax-spacing-2) var(--ax-spacing-3);
      border-bottom: 1px solid var(--ax-color-border-muted);
      color: var(--ax-color-text-primary);
    }
    .ax-sensor-table__row--warning td { background: color-mix(in srgb, var(--ax-color-warning-subtle) 60%, transparent); }
    .ax-sensor-table__row--critical td { background: color-mix(in srgb, var(--ax-color-danger-subtle) 60%, transparent); }
    .ax-sensor-table__val {
      font-weight: var(--ax-font-weight-semibold);
      font-family: var(--ax-font-family-mono, monospace);
    }
    .ax-sensor-table__dot {
      display: inline-block;
      width: 8px; height: 8px;
      border-radius: 50%;
      margin-right: var(--ax-spacing-1);
      vertical-align: middle;
    }
    .ax-sensor-table__dot--normal   { background: var(--ax-color-success); }
    .ax-sensor-table__dot--warning  { background: var(--ax-color-warning); }
    .ax-sensor-table__dot--critical { background: var(--ax-color-danger); }
  `],
})
export class SensorDashboardPageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);

  readonly sensors = signal<any[]>([]);
  readonly loading = signal(false);
  readonly selectedSensor = signal<any>(null);
  readonly readings = signal<any[]>([]);
  readonly readingLoading = signal(false);

  readonly criticalCount = () => this.sensors().filter((s) => this.isThreshold(s, 'CRITICAL')).length;
  readonly warningCount  = () => this.sensors().filter((s) => this.isThreshold(s, 'WARNING')).length;
  readonly errorCount    = () => this.sensors().filter((s) => s.status === 'ERROR').length;

  filterType = '';
  filterStatus = '';
  showRegister = false;
  editingSensor: any = null;
  readingLimit = 50;

  typeOptions   = Object.values(SensorType).map((v) => ({ value: v, label: SENSOR_TYPE_LABELS[v] }));
  statusOptions = Object.values(SensorStatus).map((v) => ({ value: v, label: SENSOR_STATUS_LABELS[v] }));

  filteredSensors() {
    return this.sensors().filter((s) => {
      if (this.filterType   && s.sensorType !== this.filterType)   return false;
      if (this.filterStatus && s.status     !== this.filterStatus) return false;
      return true;
    });
  }

  ngOnInit() { this.loadSensors(); }

  onLiveSensorClick(event: { config: any; data: any }) {
    const status = event.data.status === 'critical' ? '위험'
                 : event.data.status === 'warning'  ? '주의' : '정상';
    this.snackBar.open(
      `${event.config.label} 센서 — 현재값: ${event.data.currentValue.toFixed(2)}${event.config.unit} (${status})`,
      '닫기', { duration: 3000 }
    );
  }

  loadSensors() {
    this.loading.set(true);
    this.http.get<any>('/api/v1/sensors', { params: { limit: '200' } }).subscribe({
      next: (res) => { this.sensors.set(res.data ?? []); this.loading.set(false); },
      error: () => { this.loading.set(false); this.snackBar.open('센서 목록 조회 실패', '닫기', { duration: 3000 }); },
    });
  }

  selectSensor(s: any) {
    this.selectedSensor.set(s);
    this.loadReadings(s._id);
  }

  loadReadings(deviceId: string) {
    this.readingLoading.set(true);
    this.http.get<any>('/api/v1/sensor-readings', { params: { deviceId, limit: String(this.readingLimit) } }).subscribe({
      next: (res) => { this.readings.set(res.data ?? []); this.readingLoading.set(false); },
      error: () => { this.readingLoading.set(false); },
    });
  }

  editSensor(s: any) {
    this.editingSensor = s;
    this.showRegister = true;
    this.selectedSensor.set(null);
  }

  onSaved(_result: any) {
    this.showRegister = false;
    this.editingSensor = null;
    this.snackBar.open('저장 완료', '닫기', { duration: 2000 });
    this.loadSensors();
  }

  applyFilter() {}
  clearFilter() { this.filterType = ''; this.filterStatus = ''; }

  private isThreshold(sensor: any, status: string): boolean {
    const v = sensor.lastValue;
    if (v == null) return false;
    const t = sensor.thresholds;
    if (!t) return false;
    if (status === 'CRITICAL') {
      return (t.criticalMax != null && v > t.criticalMax) || (t.criticalMin != null && v < t.criticalMin);
    }
    return (t.warningMax != null && v > t.warningMax) || (t.warningMin != null && v < t.warningMin);
  }

  thresholdLabel(s: string) {
    return s === 'CRITICAL' ? '위험' : s === 'WARNING' ? '주의' : '정상';
  }
}
