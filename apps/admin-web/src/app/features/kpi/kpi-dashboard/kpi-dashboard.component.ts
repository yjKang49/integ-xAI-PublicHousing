import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { KPIRecord } from '@ax/shared';
import { environment } from '../../../../environments/environment';
import {
  PageHeaderComponent,
  EmptyStateComponent,
  SkeletonComponent,
} from '../../../shared/components';

@Component({
  selector: 'ax-kpi-dashboard',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatIconModule, MatSelectModule,
    MatFormFieldModule, MatTooltipModule,
    PageHeaderComponent, EmptyStateComponent, SkeletonComponent,
  ],
  template: `
    <ax-page-header
      title="KPI 대시보드"
      description="시설물 안전관리 핵심 성과 지표 집계"
      icon="insights">
      <div ax-page-actions>
        <mat-form-field appearance="outline" style="width:160px">
          <mat-label>기간</mat-label>
          <mat-select [(ngModel)]="selectedPeriod" (ngModelChange)="load()">
            @for (p of periodOptions; track p.value) {
              <mat-option [value]="p.value">{{ p.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <button mat-icon-button (click)="load()" matTooltip="새로고침">
          <mat-icon>refresh</mat-icon>
        </button>
      </div>
    </ax-page-header>

    @if (loading()) {
      <ax-skeleton type="kpi" />
    } @else if (kpi()) {

      <!-- 민원 KPI -->
      <p class="ax-section-label">민원 처리</p>
      <div class="ax-kpi-grid">
        <div class="kpi-card">
          <div class="kpi-card__icon" style="--icon-bg: var(--ax-color-info-subtle); --icon-color: var(--ax-color-info)">
            <mat-icon>support_agent</mat-icon>
          </div>
          <div class="kpi-card__value">{{ kpi()!.totalComplaints }}</div>
          <div class="kpi-card__label">총 민원 수</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card__icon" style="--icon-bg: var(--ax-color-success-subtle); --icon-color: var(--ax-color-success)">
            <mat-icon>check_circle</mat-icon>
          </div>
          <div class="kpi-card__value">{{ kpi()!.resolvedComplaints }}</div>
          <div class="kpi-card__label">해결 민원</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card__icon" style="--icon-bg: var(--ax-color-warning-subtle); --icon-color: var(--ax-color-warning)">
            <mat-icon>timer</mat-icon>
          </div>
          <div class="kpi-card__value">{{ kpi()!.avgResolutionHours | number:'1.1-1' }}</div>
          <div class="kpi-card__label">평균 처리 시간 (h)</div>
        </div>
        <div class="kpi-card kpi-card--rate">
          <div class="kpi-card__icon" style="--icon-bg: var(--ax-color-success-subtle); --icon-color: var(--ax-color-success)">
            <mat-icon>trending_up</mat-icon>
          </div>
          <div class="kpi-card__value" [style.color]="rateTokenColor(kpi()!.complaintResolutionRate)">
            {{ (kpi()!.complaintResolutionRate * 100) | number:'1.1-1' }}%
          </div>
          <div class="kpi-card__label">민원 해결률</div>
          <div class="rate-bar">
            <div class="rate-bar__fill"
              [style.width.%]="kpi()!.complaintResolutionRate * 100"
              [style.background]="rateTokenColor(kpi()!.complaintResolutionRate)"></div>
          </div>
        </div>
      </div>

      <!-- 점검 KPI -->
      <p class="ax-section-label" style="margin-top: var(--ax-space-6)">점검</p>
      <div class="ax-kpi-grid">
        <div class="kpi-card">
          <div class="kpi-card__icon" style="--icon-bg: var(--ax-color-info-subtle); --icon-color: var(--ax-color-info)">
            <mat-icon>assignment</mat-icon>
          </div>
          <div class="kpi-card__value">{{ kpi()!.totalInspections }}</div>
          <div class="kpi-card__label">총 점검 수</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card__icon" style="--icon-bg: var(--ax-color-success-subtle); --icon-color: var(--ax-color-success)">
            <mat-icon>assignment_turned_in</mat-icon>
          </div>
          <div class="kpi-card__value">{{ kpi()!.completedInspections }}</div>
          <div class="kpi-card__label">완료 점검</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card__icon" style="--icon-bg: var(--ax-color-danger-subtle); --icon-color: var(--ax-color-danger)">
            <mat-icon>assignment_late</mat-icon>
          </div>
          <div class="kpi-card__value" style="color: var(--ax-color-danger)">{{ kpi()!.overdueInspections }}</div>
          <div class="kpi-card__label">지연 점검</div>
        </div>
        <div class="kpi-card kpi-card--rate">
          <div class="kpi-card__icon" style="--icon-bg: var(--ax-color-success-subtle); --icon-color: var(--ax-color-success)">
            <mat-icon>trending_up</mat-icon>
          </div>
          <div class="kpi-card__value" [style.color]="rateTokenColor(kpi()!.inspectionCompletionRate)">
            {{ (kpi()!.inspectionCompletionRate * 100) | number:'1.1-1' }}%
          </div>
          <div class="kpi-card__label">점검 완료율</div>
          <div class="rate-bar">
            <div class="rate-bar__fill"
              [style.width.%]="kpi()!.inspectionCompletionRate * 100"
              [style.background]="rateTokenColor(kpi()!.inspectionCompletionRate)"></div>
          </div>
        </div>
      </div>

      <!-- 결함 KPI -->
      <p class="ax-section-label" style="margin-top: var(--ax-space-6)">결함 관리</p>
      <div class="ax-kpi-grid">
        <div class="kpi-card">
          <div class="kpi-card__icon" style="--icon-bg: var(--ax-color-warning-subtle); --icon-color: var(--ax-color-warning)">
            <mat-icon>report_problem</mat-icon>
          </div>
          <div class="kpi-card__value">{{ kpi()!.totalDefects }}</div>
          <div class="kpi-card__label">총 결함 수</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card__icon" style="--icon-bg: var(--ax-color-danger-subtle); --icon-color: var(--ax-color-danger)">
            <mat-icon>dangerous</mat-icon>
          </div>
          <div class="kpi-card__value" style="color: var(--ax-color-danger)">{{ kpi()!.criticalDefects }}</div>
          <div class="kpi-card__label">긴급 결함</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card__icon" style="--icon-bg: var(--ax-color-success-subtle); --icon-color: var(--ax-color-success)">
            <mat-icon>build</mat-icon>
          </div>
          <div class="kpi-card__value">{{ kpi()!.repairedDefects }}</div>
          <div class="kpi-card__label">조치 완료</div>
        </div>
        <div class="kpi-card kpi-card--rate">
          <div class="kpi-card__icon" style="--icon-bg: var(--ax-color-success-subtle); --icon-color: var(--ax-color-success)">
            <mat-icon>build_circle</mat-icon>
          </div>
          <div class="kpi-card__value" [style.color]="rateTokenColor(kpi()!.defectRepairRate)">
            {{ (kpi()!.defectRepairRate * 100) | number:'1.1-1' }}%
          </div>
          <div class="kpi-card__label">결함 조치율</div>
          <div class="rate-bar">
            <div class="rate-bar__fill"
              [style.width.%]="kpi()!.defectRepairRate * 100"
              [style.background]="rateTokenColor(kpi()!.defectRepairRate)"></div>
          </div>
        </div>
      </div>

      <!-- 비용 / 만족도 -->
      @if (kpi()!.preventiveMaintenanceCost || kpi()!.avgSatisfactionScore) {
        <p class="ax-section-label" style="margin-top: var(--ax-space-6)">비용 및 만족도</p>
        <div class="ax-kpi-grid">
          @if (kpi()!.preventiveMaintenanceCost) {
            <div class="kpi-card">
              <div class="kpi-card__icon" style="--icon-bg: var(--ax-color-info-subtle); --icon-color: var(--ax-color-info)">
                <mat-icon>payments</mat-icon>
              </div>
              <div class="kpi-card__value">{{ kpi()!.preventiveMaintenanceCost | number:'1.0-0' }}</div>
              <div class="kpi-card__label">예방 유지관리 비용 (원)</div>
            </div>
          }
          @if (kpi()!.avgSatisfactionScore) {
            <div class="kpi-card">
              <div class="kpi-card__icon" style="--icon-bg: var(--ax-color-warning-subtle); --icon-color: var(--ax-color-warning)">
                <mat-icon>star</mat-icon>
              </div>
              <div class="kpi-card__value">{{ kpi()!.avgSatisfactionScore | number:'1.1-1' }}/5</div>
              <div class="kpi-card__label">평균 만족도</div>
            </div>
          }
        </div>
      }

      <p class="period-info ax-text-meta">
        집계 기간: {{ kpi()!.periodStart | date:'yyyy-MM-dd' }} ~ {{ kpi()!.periodEnd | date:'yyyy-MM-dd' }}
      </p>
    } @else {
      <ax-empty-state
        type="zero"
        title="KPI 데이터가 없습니다"
        description="집계 기간을 변경하거나 점검 데이터가 쌓인 후 확인하세요."
        (primaryAction)="load()" />
    }
  `,
  styles: [`
    /* KPI grid — 4 columns */
    .ax-kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--ax-space-4);
    }

    /* KPI card */
    .kpi-card {
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border);
      border-radius: var(--ax-radius-card);
      box-shadow: var(--ax-shadow-card);
      padding: var(--ax-space-5) var(--ax-space-4);
    }

    .kpi-card__icon {
      width: 40px;
      height: 40px;
      border-radius: var(--ax-radius-md);
      background: var(--icon-bg, var(--ax-color-bg-surface-alt));
      color: var(--icon-color, var(--ax-color-text-secondary));
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: var(--ax-space-3);

      mat-icon { font-size: 20px; }
    }

    .kpi-card__value {
      font-size: var(--ax-font-size-kpi);
      font-weight: 700;
      color: var(--ax-color-text-primary);
      margin-bottom: var(--ax-space-1);
      line-height: 1;
    }

    .kpi-card__label {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-secondary);
      font-weight: 500;
    }

    /* Rate bar */
    .rate-bar {
      height: 6px;
      background: var(--ax-color-bg-surface-alt);
      border-radius: 3px;
      margin-top: var(--ax-space-3);
      overflow: hidden;
    }
    .rate-bar__fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s ease;
    }

    /* Period info */
    .period-info {
      text-align: right;
      margin-top: var(--ax-space-4);
    }

    @media (max-width: 960px) {
      .ax-kpi-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 600px) {
      .ax-kpi-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class KpiDashboardComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly kpi = signal<KPIRecord | null>(null);
  readonly loading = signal(false);
  selectedPeriod = 'current_month';

  readonly periodOptions = [
    { value: 'current_month',   label: '이번 달' },
    { value: 'last_month',      label: '지난 달' },
    { value: 'current_quarter', label: '이번 분기' },
    { value: 'current_year',    label: '올해' },
  ];

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.http.get<any>(`${environment.apiUrl}/kpi?period=${this.selectedPeriod}`).subscribe({
      next: (res) => { this.kpi.set(res.data ?? null); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  rateTokenColor(rate: number): string {
    if (rate >= 0.9) return 'var(--ax-color-success)';
    if (rate >= 0.7) return 'var(--ax-color-warning)';
    return 'var(--ax-color-danger)';
  }
}
