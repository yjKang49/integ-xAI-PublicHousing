// apps/admin-web/src/app/features/jobs/pages/job-detail-page.component.ts
import {
  Component, OnInit, OnDestroy, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { JobsApi } from '../data-access/jobs.api';

// ── Shared config (same as list page) ─────────────────────────────────────
interface StatusChipCfg { label: string; bg: string; color: string; animated?: boolean; }
const STATUS_CFG: Record<string, StatusChipCfg> = {
  PENDING:   { label: '대기',    bg: '#f5f5f5', color: '#757575' },
  QUEUED:    { label: '큐 대기', bg: '#e3f2fd', color: '#1565c0' },
  RUNNING:   { label: '실행 중', bg: '#fff3e0', color: '#e65100', animated: true },
  COMPLETED: { label: '완료',    bg: '#e8f5e9', color: '#2e7d32' },
  FAILED:    { label: '실패',    bg: '#ffebee', color: '#c62828' },
  CANCELLED: { label: '취소됨',  bg: '#f5f5f5', color: '#9e9e9e' },
};

interface PriorityCfg { label: string; bg: string; color: string; }
const PRIORITY_CFG: Record<string, PriorityCfg> = {
  HIGH:   { label: '높음', bg: '#ffebee', color: '#c62828' },
  NORMAL: { label: '보통', bg: '#e3f2fd', color: '#1565c0' },
  LOW:    { label: '낮음', bg: '#f5f5f5', color: '#9e9e9e' },
};

const JOB_TYPE_LABELS: Record<string, string> = {
  AI_IMAGE_ANALYSIS:       'AI 이미지 분석',
  DRONE_VIDEO_ANALYSIS:    '드론 영상 분석',
  CRACK_WIDTH_MEASUREMENT: '균열 폭 측정',
  REPORT_GENERATION:       '보고서 생성',
  RPA_BILL_GENERATION:     'RPA 고지서',
  RPA_CONTRACT_EXPIRY:     'RPA 계약만료',
  RPA_COMPLAINT_INTAKE:    'RPA 민원분류',
  SCHEDULE_AUTO_GENERATE:  '일정 자동생성',
};

const ACTIVE_STATUSES = new Set(['PENDING', 'QUEUED', 'RUNNING']);
const CANCELLABLE_STATUSES = new Set(['PENDING', 'QUEUED']);

@Component({
  selector: 'ax-job-detail-page',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule, MatProgressBarModule,
    MatChipsModule, MatTooltipModule, MatSnackBarModule, MatDividerModule,
  ],
  template: `
    <!-- Back button -->
    <div class="back-row">
      <button mat-button routerLink="/jobs">
        <mat-icon>arrow_back</mat-icon> 목록으로
      </button>
    </div>

    <!-- 404 state -->
    @if (notFound()) {
      <div class="not-found">
        <mat-icon>search_off</mat-icon>
        <p>작업을 찾을 수 없습니다.</p>
        <button mat-raised-button color="primary" routerLink="/jobs">목록으로 돌아가기</button>
      </div>
    }

    @if (job() && !notFound()) {
      <!-- ── 1. Header card ──────────────────────────────────────────── -->
      <mat-card class="header-card">
        <mat-card-content>
          <div class="header-row">
            <div class="header-left">
              <h2 class="job-title">{{ typeLabel(job().type) }}</h2>
              <span
                class="status-chip"
                [class.status-animated]="statusCfg(job().status).animated"
                [style.background]="statusCfg(job().status).bg"
                [style.color]="statusCfg(job().status).color"
              >{{ statusCfg(job().status).label }}</span>
              <span
                class="priority-chip"
                [style.background]="priorityCfg(job().priority).bg"
                [style.color]="priorityCfg(job().priority).color"
              >{{ priorityCfg(job().priority).label }}</span>
            </div>
            @if (isCancellable(job())) {
              <button mat-stroked-button color="warn" (click)="cancel()">
                <mat-icon>cancel</mat-icon> 작업 취소
              </button>
            }
          </div>
          <div class="job-id">ID: {{ job()._id }}</div>
          @if (job().complexId) {
            <div class="job-meta">단지 ID: {{ job().complexId }}</div>
          }
          @if (job().queueName) {
            <div class="job-meta">큐: {{ job().queueName }}</div>
          }
          @if (job().retryCount > 0) {
            <div class="job-meta retry">재시도: {{ job().retryCount }}회</div>
          }
        </mat-card-content>
      </mat-card>

      <!-- ── 2. Progress section (RUNNING only) ─────────────────────── -->
      @if (job().status === 'RUNNING') {
        <mat-card class="progress-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon class="spin-icon">sync</mat-icon>
              진행 중
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="progress-row">
              <mat-progress-bar
                mode="determinate"
                [value]="job().progress ?? 0"
                class="main-progress-bar"
              />
              <span class="pct-label">{{ job().progress ?? 0 }}%</span>
            </div>
          </mat-card-content>
        </mat-card>
      }

      <!-- ── 3. Timeline card ────────────────────────────────────────── -->
      <mat-card class="timeline-card">
        <mat-card-header>
          <mat-card-title>타임라인</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="timeline">

            <!-- Created -->
            <div class="tl-item done">
              <div class="tl-dot done-dot"></div>
              <div class="tl-content">
                <div class="tl-label">생성됨</div>
                <div class="tl-time">{{ job().createdAt | date:'yyyy-MM-dd HH:mm:ss' }}</div>
              </div>
            </div>

            <!-- Queued — shown when past PENDING -->
            <div class="tl-item"
              [class.done]="job().status !== 'PENDING'"
              [class.pending-step]="job().status === 'PENDING'">
              <div class="tl-dot"
                [class.done-dot]="job().status !== 'PENDING'"
                [class.pending-dot]="job().status === 'PENDING'"></div>
              <div class="tl-content">
                <div class="tl-label">큐 등록</div>
                @if (job().status !== 'PENDING') {
                  <div class="tl-time tl-sub">Bull Queue 전달 완료</div>
                }
              </div>
            </div>

            <!-- Started -->
            <div class="tl-item"
              [class.done]="job().startedAt"
              [class.pending-step]="!job().startedAt">
              <div class="tl-dot"
                [class.done-dot]="job().startedAt"
                [class.active-dot]="job().status === 'RUNNING'"
                [class.pending-dot]="!job().startedAt && job().status !== 'RUNNING'"></div>
              <div class="tl-content">
                <div class="tl-label">실행 시작</div>
                @if (job().startedAt) {
                  <div class="tl-time">{{ job().startedAt | date:'yyyy-MM-dd HH:mm:ss' }}</div>
                }
              </div>
            </div>

            <!-- Completed / Failed -->
            @if (job().status === 'COMPLETED') {
              <div class="tl-item done">
                <div class="tl-dot completed-dot"></div>
                <div class="tl-content">
                  <div class="tl-label" style="color:#2e7d32">완료</div>
                  <div class="tl-time">{{ job().completedAt | date:'yyyy-MM-dd HH:mm:ss' }}</div>
                </div>
              </div>
            } @else if (job().status === 'FAILED') {
              <div class="tl-item done">
                <div class="tl-dot failed-dot"></div>
                <div class="tl-content">
                  <div class="tl-label" style="color:#c62828">실패</div>
                  <div class="tl-time">{{ job().failedAt | date:'yyyy-MM-dd HH:mm:ss' }}</div>
                </div>
              </div>
            } @else if (job().status === 'CANCELLED') {
              <div class="tl-item done">
                <div class="tl-dot cancelled-dot"></div>
                <div class="tl-content">
                  <div class="tl-label" style="color:#9e9e9e">취소됨</div>
                </div>
              </div>
            } @else {
              <div class="tl-item pending-step">
                <div class="tl-dot pending-dot"></div>
                <div class="tl-content">
                  <div class="tl-label">완료 예정</div>
                </div>
              </div>
            }
          </div>
        </mat-card-content>
      </mat-card>

      <!-- ── 4. Payload card ────────────────────────────────────────── -->
      <mat-card class="json-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>data_object</mat-icon> 요청 페이로드
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <pre class="json-pre">{{ job().payload | json }}</pre>
        </mat-card-content>
      </mat-card>

      <!-- ── 5. Result card (COMPLETED) ─────────────────────────────── -->
      @if (job().status === 'COMPLETED' && job().result !== undefined) {
        <mat-card class="json-card result-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon style="color:#2e7d32">check_circle</mat-icon> 처리 결과
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <pre class="json-pre">{{ job().result | json }}</pre>
          </mat-card-content>
        </mat-card>
      }

      <!-- ── 6. Error card (FAILED) ─────────────────────────────────── -->
      @if (job().status === 'FAILED') {
        <div class="error-box">
          <mat-icon class="error-icon">error</mat-icon>
          <div class="error-content">
            <div class="error-title">작업 실패</div>
            <div class="error-message">{{ job().error ?? '알 수 없는 오류가 발생했습니다.' }}</div>
          </div>
        </div>
      }
    }
  `,
  styles: [`
    .back-row { margin-bottom: 12px; }

    .not-found {
      text-align: center; padding: 80px; color: #9e9e9e;
      display: flex; flex-direction: column; align-items: center; gap: 12px;
    }
    .not-found mat-icon { font-size: 56px; width: 56px; height: 56px; }

    /* Header card */
    .header-card { margin-bottom: 16px; }
    .header-row {
      display: flex; align-items: center;
      justify-content: space-between; flex-wrap: wrap; gap: 12px;
    }
    .header-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .job-title { margin: 0; font-size: 20px; font-weight: 600; }
    .job-id { font-size: 11px; color: #9e9e9e; margin-top: 6px; font-family: monospace; }
    .job-meta { font-size: 12px; color: #757575; margin-top: 2px; }
    .retry { color: #e65100; }

    .status-chip {
      display: inline-block;
      padding: 4px 12px; border-radius: 12px;
      font-size: 12px; font-weight: 600;
    }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.65; } }
    .status-animated { animation: pulse 1.8s ease-in-out infinite; }

    .priority-chip {
      display: inline-block;
      padding: 4px 12px; border-radius: 12px;
      font-size: 12px; font-weight: 600;
    }

    /* Progress */
    .progress-card { margin-bottom: 16px; }
    .progress-card mat-card-title {
      display: flex; align-items: center; gap: 6px; font-size: 15px;
    }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .spin-icon { font-size: 18px; width: 18px; height: 18px; animation: spin 1.5s linear infinite; }
    .progress-row { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
    .main-progress-bar { flex: 1; border-radius: 4px; height: 10px; }
    .pct-label { font-size: 16px; font-weight: 700; color: #e65100; min-width: 42px; }

    /* Timeline */
    .timeline-card { margin-bottom: 16px; }
    .timeline { padding: 8px 0; }
    .tl-item {
      display: flex; gap: 16px; align-items: flex-start;
      padding-left: 8px; position: relative; padding-bottom: 20px;
    }
    .tl-item:not(:last-child)::before {
      content: '';
      position: absolute; left: 15px; top: 24px;
      width: 2px; bottom: 0;
      background: #e0e0e0;
    }
    .tl-item.done:not(:last-child)::before { background: #81c784; }

    .tl-dot {
      width: 16px; height: 16px; border-radius: 50%;
      border: 2px solid #e0e0e0; background: #fff;
      flex-shrink: 0; margin-top: 2px;
    }
    .done-dot      { border-color: #81c784; background: #81c784; }
    .active-dot    { border-color: #e65100; background: #e65100; }
    .completed-dot { border-color: #2e7d32; background: #2e7d32; }
    .failed-dot    { border-color: #c62828; background: #c62828; }
    .cancelled-dot { border-color: #9e9e9e; background: #9e9e9e; }
    .pending-dot   { border-color: #bdbdbd; background: #fff; }

    .tl-content {}
    .tl-label { font-size: 13px; font-weight: 600; color: #333; }
    .tl-time  { font-size: 12px; color: #757575; margin-top: 2px; }
    .tl-sub   { color: #bdbdbd; }
    .pending-step .tl-label { color: #bdbdbd; }

    /* JSON cards */
    .json-card { margin-bottom: 16px; }
    .json-card mat-card-title {
      display: flex; align-items: center; gap: 6px; font-size: 15px;
    }
    .json-pre {
      background: #f8f8f8; border: 1px solid #e0e0e0;
      border-radius: 6px; padding: 12px;
      font-size: 12px; font-family: 'Consolas', 'Monaco', monospace;
      white-space: pre-wrap; word-break: break-all;
      max-height: 340px; overflow-y: auto; margin: 0;
    }
    .result-card { border-left: 4px solid #2e7d32; }

    /* Error box */
    .error-box {
      display: flex; gap: 12px; align-items: flex-start;
      background: #ffebee; border: 1.5px solid #ef9a9a;
      border-radius: 8px; padding: 16px; margin-bottom: 16px;
    }
    .error-icon { color: #c62828; font-size: 28px; width: 28px; height: 28px; flex-shrink: 0; }
    .error-title { font-size: 14px; font-weight: 700; color: #c62828; margin-bottom: 4px; }
    .error-message { font-size: 13px; color: #b71c1c; font-family: monospace; white-space: pre-wrap; }
  `],
})
export class JobDetailPageComponent implements OnInit, OnDestroy {
  private readonly jobsApi  = inject(JobsApi);
  private readonly route    = inject(ActivatedRoute);
  private readonly router   = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly job      = signal<any>(null);
  readonly notFound = signal(false);

  private jobId    = '';
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.jobId = this.route.snapshot.paramMap.get('jobId') ?? '';
    this.loadJob();

    this.pollTimer = setInterval(() => {
      const current = this.job();
      if (current && ACTIVE_STATUSES.has(current.status)) {
        this.loadJob();
      }
    }, 5_000);
  }

  ngOnDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  loadJob(): void {
    this.jobsApi.getById(this.jobId).subscribe({
      next: (res) => {
        const j = res.data ?? res;
        this.job.set(j);
        this.notFound.set(false);
      },
      error: (err) => {
        if (err?.status === 404) {
          this.notFound.set(true);
        }
      },
    });
  }

  cancel(): void {
    this.jobsApi.cancel(this.jobId).subscribe({
      next: () => {
        this.snackBar.open('작업이 취소되었습니다.', '닫기', { duration: 2000 });
        this.loadJob();
      },
      error: () =>
        this.snackBar.open('취소에 실패했습니다.', '닫기', { duration: 3000 }),
    });
  }

  isCancellable(job: any): boolean {
    return CANCELLABLE_STATUSES.has(job?.status);
  }

  statusCfg(status: string): StatusChipCfg {
    return STATUS_CFG[status] ?? { label: status, bg: '#f5f5f5', color: '#9e9e9e' };
  }

  priorityCfg(priority: string): PriorityCfg {
    return PRIORITY_CFG[priority] ?? PRIORITY_CFG['NORMAL'];
  }

  typeLabel(type: string): string {
    return JOB_TYPE_LABELS[type] ?? type;
  }
}
