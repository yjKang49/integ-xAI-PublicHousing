// apps/admin-web/src/app/features/iot/components/sensor-registration-form.component.ts
// Phase 2-8: 센서 등록/수정 폼 컴포넌트

import {
  Component, Input, Output, EventEmitter, OnInit, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  SensorType, SensorStatus,
  SENSOR_TYPE_LABELS, SENSOR_TYPE_UNITS, DEFAULT_SENSOR_THRESHOLDS,
} from '@ax/shared';

@Component({
  selector: 'ax-sensor-registration-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatInputModule, MatFormFieldModule,
    MatSelectModule, MatIconModule, MatDividerModule, MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="form-container">
      <form #f="ngForm" (ngSubmit)="save(f.valid)">

        <!-- 기본 정보 -->
        <mat-card class="section-card">
          <mat-card-header><mat-card-title>센서 기본 정보</mat-card-title></mat-card-header>
          <mat-card-content>
            <div class="field-row">
              <mat-form-field appearance="outline" class="field-wide">
                <mat-label>센서 이름 *</mat-label>
                <input matInput [(ngModel)]="form.name" name="name" required maxlength="100" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Device Key (고유값) *</mat-label>
                <input matInput [(ngModel)]="form.deviceKey" name="deviceKey" required
                  pattern="[a-z0-9_-]+" placeholder="e.g., bldg101-temp-b1-01" />
                <mat-hint>소문자·숫자·하이픈·언더스코어</mat-hint>
              </mat-form-field>
            </div>
            <div class="field-row">
              <mat-form-field appearance="outline">
                <mat-label>센서 유형 *</mat-label>
                <mat-select [(ngModel)]="form.sensorType" name="sensorType" required
                  (selectionChange)="onTypeChange()">
                  @for (opt of typeOptions; track opt.value) {
                    <mat-option [value]="opt.value">{{ opt.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>단지 ID *</mat-label>
                <input matInput [(ngModel)]="form.complexId" name="complexId" required />
              </mat-form-field>
            </div>
            <div class="field-row">
              <mat-form-field appearance="outline" class="field-wide">
                <mat-label>설치 위치 설명 *</mat-label>
                <input matInput [(ngModel)]="form.locationDescription" name="location" required
                  placeholder="예: 101동 지하 1층 기계실" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>동 ID</mat-label>
                <input matInput [(ngModel)]="form.buildingId" name="buildingId" />
              </mat-form-field>
            </div>
            <div class="field-row">
              <mat-form-field appearance="outline">
                <mat-label>제조사</mat-label>
                <input matInput [(ngModel)]="form.manufacturer" name="manufacturer" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>모델명</mat-label>
                <input matInput [(ngModel)]="form.model" name="model" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>설치일</mat-label>
                <input matInput type="date" [(ngModel)]="form.installDate" name="installDate" />
              </mat-form-field>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- 임계치 설정 -->
        <mat-card class="section-card">
          <mat-card-header><mat-card-title>알림 임계치</mat-card-title></mat-card-header>
          <mat-card-content>
            <p class="threshold-hint">센서 유형 선택 시 기본값이 자동 설정됩니다. 필요 시 수정하세요.</p>
            <div class="field-row">
              <mat-form-field appearance="outline">
                <mat-label>측정 단위</mat-label>
                <input matInput [(ngModel)]="form.thresholds.unit" name="unit" />
              </mat-form-field>
            </div>
            <div class="field-row">
              <mat-form-field appearance="outline">
                <mat-label>주의 최솟값 (WARNING min)</mat-label>
                <input matInput type="number" [(ngModel)]="form.thresholds.warningMin" name="wMin" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>주의 최댓값 (WARNING max)</mat-label>
                <input matInput type="number" [(ngModel)]="form.thresholds.warningMax" name="wMax" />
              </mat-form-field>
            </div>
            <div class="field-row">
              <mat-form-field appearance="outline">
                <mat-label>위험 최솟값 (CRITICAL min)</mat-label>
                <input matInput type="number" [(ngModel)]="form.thresholds.criticalMin" name="cMin" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>위험 최댓값 (CRITICAL max)</mat-label>
                <input matInput type="number" [(ngModel)]="form.thresholds.criticalMax" name="cMax" />
              </mat-form-field>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- 버튼 -->
        <div class="footer-actions">
          <button mat-button type="button" (click)="cancelled.emit()">취소</button>
          <button mat-raised-button color="primary" type="submit" [disabled]="saving()">
            @if (saving()) { <mat-spinner diameter="18" /> }
            @else { <mat-icon>save</mat-icon> }
            {{ isEdit ? '수정 저장' : '센서 등록' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .form-container { display:flex; flex-direction:column; gap:16px; }
    .section-card mat-card-header { margin-bottom:4px; }
    .field-row { display:flex; gap:12px; flex-wrap:wrap; align-items:flex-start; margin-bottom:4px; }
    .field-wide { flex:2; min-width:200px; }
    mat-form-field { min-width:150px; flex:1; }
    .threshold-hint { font-size:12px; color:#888; margin:0 0 12px; }
    .footer-actions { display:flex; justify-content:flex-end; gap:12px; padding:8px 0; }
  `],
})
export class SensorRegistrationFormComponent implements OnInit {
  @Input() sensor: any = null;
  @Output() saved = new EventEmitter<any>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);

  readonly saving = signal(false);
  isEdit = false;

  form: any = {
    name: '', deviceKey: '', sensorType: SensorType.TEMPERATURE,
    complexId: '', buildingId: '', locationDescription: '',
    manufacturer: '', model: '', installDate: '',
    thresholds: { unit: '°C', warningMin: 5, warningMax: 30, criticalMin: 0, criticalMax: 40 },
  };

  typeOptions = Object.values(SensorType).map((v) => ({
    value: v, label: SENSOR_TYPE_LABELS[v],
  }));

  ngOnInit() {
    if (this.sensor) {
      this.isEdit = true;
      this.form = {
        name: this.sensor.name,
        deviceKey: this.sensor.deviceKey,
        sensorType: this.sensor.sensorType,
        complexId: this.sensor.complexId,
        buildingId: this.sensor.buildingId ?? '',
        locationDescription: this.sensor.locationDescription,
        manufacturer: this.sensor.manufacturer ?? '',
        model: this.sensor.model ?? '',
        installDate: this.sensor.installDate ?? '',
        thresholds: { ...this.sensor.thresholds },
      };
    }
  }

  onTypeChange() {
    const defaults = DEFAULT_SENSOR_THRESHOLDS[this.form.sensorType as SensorType];
    this.form.thresholds = { ...defaults };
  }

  save(valid: boolean | null) {
    if (!valid) {
      this.snackBar.open('필수 항목을 확인하세요.', '닫기', { duration: 3000 });
      return;
    }
    this.saving.set(true);

    const req$ = this.isEdit
      ? this.http.patch<any>(`/api/v1/sensors/${this.sensor._id}`, this.form)
      : this.http.post<any>('/api/v1/sensors', this.form);

    req$.subscribe({
      next: (result) => {
        this.saving.set(false);
        this.saved.emit(result);
      },
      error: (err: any) => {
        this.saving.set(false);
        this.snackBar.open(err?.error?.message ?? '저장 실패', '닫기', { duration: 4000 });
      },
    });
  }
}
