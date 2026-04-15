// AX-SPRINT — RPA 지능형 행정자동화 대시보드
// 자동화 목표: 관리비 80% · 계약만료 100% · 민원 70% · 점검일정 90%
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  RpaTaskType,
  RpaTaskStatus,
  RpaAutomationSummary,
  RPA_TASK_TYPE_LABELS,
  RPA_AUTOMATION_TARGETS,
} from '@ax/shared';
import { RpaService } from '../../../core/api/rpa.service';
import {
  PageHeaderComponent,
  StatusBadgeComponent,
  EmptyStateComponent,
  SkeletonComponent,
} from '../../../shared/components';

interface TaskTypeRow {
  type: RpaTaskType;
  label: string;
  target: number;
  automationRate: number;
  lastRunAt?: string;
  targetMet: boolean;
}

@Component({
  selector: 'ax-rpa-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule, MatIconModule,
    MatTooltipModule, MatSnackBarModule,
    PageHeaderComponent, StatusBadgeComponent, EmptyStateComponent, SkeletonComponent,
  ],
  template: `
    <ax-page-header
      title="지능형 행정자동화"
      description="AX-RPA 자동화율 목표 달성 현황 및 즉시 실행"
      icon="smart_toy">
      <div ax-page-actions>
        <button mat-icon-button (click)="load()" matTooltip="새로고침">
          <mat-icon [class.ax-spinning]="loading()">refresh</mat-icon>
        </button>
        <button mat-flat-button color="primary" (click)="runContractExpiry()" [disabled]="running()">
          <mat-icon>send</mat-icon> 계약 만료 알림 즉시 실행
        </button>
      </div>
    </ax-page-header>

    @if (loading() && !summary()) {
      <ax-skeleton type="kpi" />
    }

    @if (summary(); as s) {
      <!-- KPI strip -->
      <div class="rpa-kpi-row">
        <div class="rpa-kpi-card">
          <div class="rpa-kpi-card__icon" style="--icon-bg: var(--ax-color-info-subtle); --icon-color: var(--ax-color-info)">
            <mat-icon>task_alt</mat-icon>
          </div>
          <div class="rpa-kpi-card__value">{{ s.todayTaskCount }}</div>
          <div class="rpa-kpi-card__label">오늘 실행 작업 수</div>
        </div>
        <div class="rpa-kpi-card">
          <div class="rpa-kpi-card__icon" style="--icon-bg: var(--ax-color-success-subtle); --icon-color: var(--ax-color-success)">
            <mat-icon>auto_awesome</mat-icon>
          </div>
          <div class="rpa-kpi-card__value">{{ (s.overallAutomationRate * 100) | number:'1.0-0' }}%</div>
          <div class="rpa-kpi-card__label">전체 자동화율</div>
        </div>
        <div class="rpa-kpi-card">
          <div class="rpa-kpi-card__icon" style="--icon-bg: var(--ax-color-warning-subtle); --icon-color: var(--ax-color-warning)">
            <mat-icon>schedule</mat-icon>
          </div>
          <div class="rpa-kpi-card__value">{{ s.estimatedTimeSavedHours | number:'1.0-1' }}h</div>
          <div class="rpa-kpi-card__label">이번 달 절감 추정 시간</div>
        </div>
      </div>

      <!-- Task type automation rates -->
      <div class="ax-card" style="margin-bottom: var(--ax-space-5)">
        <div class="ax-card__header">
          <mat-icon class="section-icon">bar_chart</mat-icon>
          <span class="ax-text-section-title">작업 유형별 자동화율</span>
          <span class="ax-text-meta" style="margin-left: var(--ax-space-2)">AX-SPRINT 사업계획서 기준 목표 달성률</span>
        </div>

        <div class="task-type-list">
          @for (row of taskRows(); track row.type) {
            <div class="task-row">
              <div class="task-row__info">
                <span class="task-row__label ax-text-body">{{ row.label }}</span>
                <ax-status-badge
                  [variant]="row.targetMet ? 'success' : 'warning'"
                  [label]="'목표 ' + ((row.target * 100) | number:'1.0-0') + '%'" />
                @if (row.lastRunAt) {
                  <span class="ax-text-meta">마지막 실행: {{ row.lastRunAt | date:'MM/dd HH:mm' }}</span>
                }
              </div>
              <div class="task-row__bar">
                <div class="rpa-bar-track">
                  <div class="rpa-bar-fill"
                    [style.width.%]="row.automationRate * 100"
                    [style.background]="row.targetMet ? 'var(--ax-color-brand-primary)' : 'var(--ax-color-warning)'"
                    [matTooltip]="((row.automationRate * 100) | number:'1.0-1') + '% 달성'">
                  </div>
                </div>
                <span class="rpa-bar-value ax-text-meta">{{ (row.automationRate * 100) | number:'1.0-0' }}%</span>
              </div>
            </div>
          }
        </div>
      </div>
    }

    <!-- Quick actions -->
    <div class="ax-card">
      <div class="ax-card__header">
        <mat-icon class="section-icon">play_circle</mat-icon>
        <span class="ax-text-section-title">작업 즉시 실행</span>
      </div>

      <div class="quick-actions">
        @for (action of quickActions; track action.type) {
          <button mat-stroked-button
            [disabled]="running()"
            (click)="runTask(action.type)"
            [matTooltip]="action.tooltip">
            <mat-icon>{{ action.icon }}</mat-icon>
            {{ action.label }}
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    /* KPI row */
    .rpa-kpi-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--ax-space-4);
      margin-bottom: var(--ax-space-5);
    }

    .rpa-kpi-card {
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border);
      border-radius: var(--ax-radius-card);
      box-shadow: var(--ax-shadow-card);
      padding: var(--ax-space-5) var(--ax-space-4);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .rpa-kpi-card__icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--icon-bg);
      color: var(--icon-color);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: var(--ax-space-3);
      mat-icon { font-size: 24px; }
    }

    .rpa-kpi-card__value {
      font-size: var(--ax-font-size-kpi);
      font-weight: 700;
      color: var(--ax-color-text-primary);
      line-height: 1;
    }

    .rpa-kpi-card__label {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-secondary);
      margin-top: var(--ax-space-1);
    }

    /* Card header */
    .ax-card__header {
      display: flex;
      align-items: center;
      gap: var(--ax-space-2);
      margin-bottom: var(--ax-space-4);
    }
    .section-icon {
      color: var(--ax-color-brand-primary);
      font-size: 20px;
    }

    /* Task type list */
    .task-type-list {
      display: flex;
      flex-direction: column;
      gap: var(--ax-space-5);
    }

    .task-row {
      display: flex;
      flex-direction: column;
      gap: var(--ax-space-2);
    }

    .task-row__info {
      display: flex;
      align-items: center;
      gap: var(--ax-space-3);
    }

    .task-row__label { flex: 1; }

    .task-row__bar {
      display: flex;
      align-items: center;
      gap: var(--ax-space-3);
    }

    .rpa-bar-track {
      flex: 1;
      height: 8px;
      background: var(--ax-color-bg-surface-alt);
      border-radius: 4px;
      overflow: hidden;
    }

    .rpa-bar-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.4s ease;
      cursor: default;
    }

    .rpa-bar-value {
      width: 40px;
      text-align: right;
      font-weight: 600;
    }

    /* Quick actions */
    .quick-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ax-space-3);
    }

    @media (max-width: 600px) {
      .rpa-kpi-row { grid-template-columns: 1fr; }
    }
  `],
})
export class RpaDashboardPageComponent implements OnInit {
  private readonly rpaService = inject(RpaService);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(false);
  readonly running = signal(false);
  readonly summary = signal<RpaAutomationSummary | null>(null);
  readonly taskRows = signal<TaskTypeRow[]>([]);

  readonly quickActions = [
    {
      type: RpaTaskType.INSPECTION_SCHEDULE,
      label: '점검 일정 자동 생성',
      icon: 'calendar_today',
      tooltip: '법정 점검 주기 기준 다음 달 일정 자동 생성 (목표 90%)',
    },
    {
      type: RpaTaskType.COMPLAINT_INTAKE,
      label: '민원 AI 재분류',
      icon: 'support_agent',
      tooltip: 'OPEN 상태 민원 AI 자동 분류 실행 (목표 70%)',
    },
    {
      type: RpaTaskType.BILL_GENERATION,
      label: '관리비 고지서 생성',
      icon: 'receipt_long',
      tooltip: '이번 달 관리비 고지서 자동 생성 (목표 80%)',
    },
    {
      type: RpaTaskType.MILEAGE_GRANT,
      label: '마일리지 지급',
      icon: 'stars',
      tooltip: '클린하우스 마일리지 자동 지급 (목표 100%)',
    },
  ];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.rpaService.getSummary().subscribe({
      next: (s) => {
        this.summary.set(s);
        this.taskRows.set(this.buildTaskRows(s));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('자동화 현황 조회 실패', '닫기', { duration: 3000 });
      },
    });
  }

  runContractExpiry(): void {
    this.running.set(true);
    this.rpaService.runContractExpiryNotice().subscribe({
      next: (r) => {
        this.running.set(false);
        this.snackBar.open(`계약 만료 알림 작업 등록 완료 (jobId: ${r.jobId})`, '닫기', { duration: 4000 });
      },
      error: () => {
        this.running.set(false);
        this.snackBar.open('작업 등록 실패', '닫기', { duration: 3000 });
      },
    });
  }

  runTask(type: RpaTaskType): void {
    this.running.set(true);
    this.rpaService.enqueueTask({ orgId: '', taskType: type, triggerNow: true }).subscribe({
      next: (r) => {
        this.running.set(false);
        this.snackBar.open(
          `${RPA_TASK_TYPE_LABELS[type]} 작업 등록 완료 (jobId: ${r.jobId})`,
          '닫기', { duration: 4000 },
        );
      },
      error: () => {
        this.running.set(false);
        this.snackBar.open('작업 등록 실패', '닫기', { duration: 3000 });
      },
    });
  }

  private buildTaskRows(s: RpaAutomationSummary): TaskTypeRow[] {
    return Object.values(RpaTaskType).map((type) => {
      const data = s.byTaskType[type];
      const target = RPA_AUTOMATION_TARGETS[type];
      const rate = data?.automationRate ?? 0;
      return {
        type,
        label: RPA_TASK_TYPE_LABELS[type],
        target,
        automationRate: rate,
        lastRunAt: data?.lastRunAt,
        targetMet: rate >= target,
      };
    });
  }
}
