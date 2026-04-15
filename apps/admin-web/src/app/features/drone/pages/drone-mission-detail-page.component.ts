// apps/admin-web/src/app/features/drone/pages/drone-mission-detail-page.component.ts
import {
  Component, OnInit, OnDestroy, inject, signal, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { DroneApi } from '../data-access/drone.api';
import { DroneUploadFormComponent } from '../components/drone-upload-form.component';
import { FrameGalleryComponent } from '../components/frame-gallery.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

const STATUS_LABELS: Record<string, string> = {
  CREATED: '생성됨', UPLOADING: '업로드 중', UPLOADED: '업로드 완료',
  PROCESSING: '분석 중', COMPLETED: '완료', FAILED: '실패',
};

const MEDIA_STATUS_LABELS: Record<string, string> = {
  PENDING: '대기', UPLOADED: '업로드됨', EXTRACTING: '추출 중', DONE: '완료', FAILED: '실패',
};

@Component({
  selector: 'ax-drone-mission-detail-page',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatButtonModule, MatIconModule,
    MatProgressBarModule, MatDividerModule,
    MatTooltipModule, MatTabsModule, MatSnackBarModule, MatDialogModule,
    DroneUploadFormComponent, FrameGalleryComponent, EmptyStateComponent,
  ],
  template: `
    <!-- 상단 네비게이션 -->
    <div class="ax-drone-detail-nav">
      <a routerLink="/drone" class="ax-drone-detail-nav__back">
        <mat-icon>arrow_back</mat-icon> 미션 목록
      </a>
    </div>

    @if (loading() && !mission()) {
      <div class="ax-loading-center">
        <mat-progress-bar mode="indeterminate" style="max-width:320px" />
      </div>
    }

    @if (mission(); as m) {
      <!-- 헤더 -->
      <div class="ax-drone-detail-header">
        <div class="ax-drone-detail-header__left">
          <div class="ax-drone-detail-header__icon-wrap">
            <mat-icon>flight</mat-icon>
          </div>
          <div>
            <h2 class="ax-drone-detail-header__title">{{ m.title }}</h2>
            <div class="ax-drone-detail-header__sub">
              {{ m.pilot }} · {{ m.flightDate }} · {{ m.droneModel ?? '드론 기종 미입력' }}
            </div>
          </div>
          <span class="ax-drone-status ax-drone-status--{{ m.status.toLowerCase() }}"
            [class.ax-drone-status--animated]="isAnimated(m.status)">
            {{ statusLabel(m.status) }}
          </span>
        </div>
        <div class="ax-drone-detail-header__actions">
          <button mat-stroked-button (click)="refresh()">
            <mat-icon>refresh</mat-icon> 새로고침
          </button>
          @if (canAnalyze()) {
            <button mat-flat-button color="primary" (click)="startAnalysis()" [disabled]="analyzing()">
              <mat-icon>psychology</mat-icon> AI 분석 시작
            </button>
          }
        </div>
      </div>

      @if (loading()) { <mat-progress-bar mode="indeterminate" class="ax-drone-detail-progress" /> }

      <mat-tab-group animationDuration="200ms">

        <!-- ── 탭 1: 미션 정보 + 미디어 ── -->
        <mat-tab label="미션 정보">
          <div class="ax-drone-detail-tab">
            <div class="ax-drone-detail-two-col">

              <!-- 기본 정보 -->
              <div class="ax-drone-panel">
                <div class="ax-drone-panel__hdr">
                  <mat-icon class="ax-drone-panel__hdr-icon">info_outline</mat-icon>
                  기본 정보
                </div>
                <div class="ax-drone-panel__body">
                  <div class="ax-drone-info-grid">
                    <div class="ax-drone-info-item">
                      <span class="ax-drone-info-lbl">단지 ID</span>
                      <span class="ax-drone-info-val">{{ m.complexId }}</span>
                    </div>
                    @if (m.buildingId) {
                      <div class="ax-drone-info-item">
                        <span class="ax-drone-info-lbl">동 ID</span>
                        <span class="ax-drone-info-val">{{ m.buildingId }}</span>
                      </div>
                    }
                    <div class="ax-drone-info-item">
                      <span class="ax-drone-info-lbl">조종사</span>
                      <span class="ax-drone-info-val">{{ m.pilot }}</span>
                    </div>
                    <div class="ax-drone-info-item">
                      <span class="ax-drone-info-lbl">비행일</span>
                      <span class="ax-drone-info-val">{{ m.flightDate }}</span>
                    </div>
                    @if (m.droneModel) {
                      <div class="ax-drone-info-item">
                        <span class="ax-drone-info-lbl">드론 기종</span>
                        <span class="ax-drone-info-val">{{ m.droneModel }}</span>
                      </div>
                    }
                    @if (m.weatherCondition) {
                      <div class="ax-drone-info-item">
                        <span class="ax-drone-info-lbl">기상 조건</span>
                        <span class="ax-drone-info-val">{{ m.weatherCondition }}</span>
                      </div>
                    }
                    <div class="ax-drone-info-item">
                      <span class="ax-drone-info-lbl">총 프레임</span>
                      <span class="ax-drone-info-val ax-drone-info-val--accent">{{ m.totalFrameCount ?? '—' }}</span>
                    </div>
                    <div class="ax-drone-info-item">
                      <span class="ax-drone-info-lbl">생성일시</span>
                      <span class="ax-drone-info-val">{{ m.createdAt | date:'yyyy-MM-dd HH:mm' }}</span>
                    </div>
                  </div>
                  @if (m.description) {
                    <mat-divider class="ax-drone-divider" />
                    <p class="ax-drone-description">{{ m.description }}</p>
                  }
                </div>
              </div>

              <!-- 파이프라인 상태 -->
              <div class="ax-drone-panel">
                <div class="ax-drone-panel__hdr">
                  <mat-icon class="ax-drone-panel__hdr-icon">account_tree</mat-icon>
                  분석 파이프라인
                </div>
                <div class="ax-drone-panel__body">
                  @if (pipeline()) {
                    @for (entry of pipelineEntries(); track entry.key) {
                      <div class="ax-drone-pipeline-row">
                        <mat-icon class="ax-drone-pipeline-icon ax-drone-pipeline-icon--{{ stageKey(entry.stage.status) }}">
                          {{ stageIcon(entry.stage.status) }}
                        </mat-icon>
                        <div class="ax-drone-pipeline-info">
                          <div class="ax-drone-pipeline-lbl">{{ stageName(entry.key) }}</div>
                          <div class="ax-drone-pipeline-status ax-drone-pipeline-status--{{ stageKey(entry.stage.status) }}">
                            {{ entry.stage.status }}
                          </div>
                        </div>
                      </div>
                    }
                  } @else {
                    <div class="ax-drone-no-pipeline">
                      <mat-icon>info_outline</mat-icon>
                      <span>미디어 업로드 후 분석을 시작하면 파이프라인이 생성됩니다.</span>
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- 미디어 목록 -->
            <div class="ax-drone-panel">
              <div class="ax-drone-panel__hdr">
                <mat-icon class="ax-drone-panel__hdr-icon">perm_media</mat-icon>
                미디어 파일 ({{ m.mediaItems?.length ?? 0 }}개)
                <button mat-stroked-button class="ax-drone-panel__hdr-action"
                  (click)="openUploadDialog()" [disabled]="!canUpload()">
                  <mat-icon>upload</mat-icon> 파일 추가
                </button>
              </div>
              @if ((m.mediaItems ?? []).length === 0) {
                <div class="ax-drone-panel__body">
                  <ax-empty-state
                    type="empty"
                    icon="cloud_upload"
                    title="업로드된 미디어가 없습니다"
                    description="드론 비행 영상 또는 이미지를 업로드하세요"
                    primaryLabel="파일 업로드"
                    primaryIcon="upload"
                    (primaryAction)="openUploadDialog()"
                  />
                </div>
              } @else {
                <div class="ax-drone-media-list">
                  @for (item of m.mediaItems; track item.mediaItemId) {
                    <div class="ax-drone-media-row">
                      <mat-icon class="ax-drone-media-row__type-icon">
                        {{ item.mediaType === 'VIDEO' ? 'videocam' : 'image' }}
                      </mat-icon>
                      <div class="ax-drone-media-row__info">
                        <div class="ax-drone-media-row__name">{{ item.fileName }}</div>
                        <div class="ax-drone-media-row__meta">
                          {{ formatBytes(item.fileSize) }}
                          @if (item.capturedAt) { · {{ item.capturedAt | date:'MM/dd HH:mm' }} }
                        </div>
                      </div>
                      <span class="ax-drone-media-status ax-drone-media-status--{{ item.status.toLowerCase() }}">
                        {{ mediaStatusLabel(item.status) }}
                      </span>
                      <button mat-icon-button
                        matTooltip="삭제"
                        (click)="deleteMedia(item.mediaItemId)"
                        [disabled]="!canUpload()">
                        <mat-icon class="ax-drone-media-row__delete">delete_outline</mat-icon>
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </mat-tab>

        <!-- ── 탭 2: 프레임 갤러리 ── -->
        <mat-tab label="프레임 갤러리">
          <div class="ax-drone-detail-tab">
            @if (mission()?.totalFrameCount) {
              <ax-frame-gallery [missionId]="missionId" />
            } @else {
              <ax-empty-state
                type="empty"
                icon="image_search"
                title="추출된 프레임이 없습니다"
                description="AI 분석을 시작하면 비디오에서 프레임이 자동으로 추출됩니다"
              />
            }
          </div>
        </mat-tab>

      </mat-tab-group>
    }
  `,
  styles: [`
    /* ── 네비게이션 ── */
    .ax-drone-detail-nav { margin-bottom: var(--ax-spacing-3); }
    .ax-drone-detail-nav__back {
      display: inline-flex; align-items: center; gap: var(--ax-spacing-1);
      color: var(--ax-color-brand-primary); text-decoration: none;
      font-size: var(--ax-font-size-sm); font-weight: var(--ax-font-weight-medium);
    }
    .ax-drone-detail-nav__back:hover { text-decoration: underline; }
    .ax-drone-detail-nav__back mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* ── 헤더 ── */
    .ax-drone-detail-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      flex-wrap: wrap; gap: var(--ax-spacing-3);
      margin-bottom: var(--ax-spacing-4);
    }
    .ax-drone-detail-header__left {
      display: flex; align-items: center; gap: var(--ax-spacing-3);
    }
    .ax-drone-detail-header__icon-wrap {
      width: 44px; height: 44px; border-radius: var(--ax-radius-md);
      background: var(--ax-color-info); display: flex;
      align-items: center; justify-content: center;
      color: #fff; flex-shrink: 0;
    }
    .ax-drone-detail-header__title {
      margin: 0; font-size: var(--ax-font-size-xl);
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
    }
    .ax-drone-detail-header__sub {
      font-size: var(--ax-font-size-xs); color: var(--ax-color-text-tertiary); margin-top: 2px;
    }
    .ax-drone-detail-header__actions {
      display: flex; gap: var(--ax-spacing-2); flex-shrink: 0; flex-wrap: wrap;
    }
    .ax-drone-detail-progress { margin-bottom: var(--ax-spacing-2); }

    /* ── 상태 배지 ── */
    .ax-drone-status {
      display: inline-block; padding: 3px 10px;
      border-radius: var(--ax-radius-full);
      font-size: var(--ax-font-size-xs); font-weight: var(--ax-font-weight-semibold);
      white-space: nowrap;
    }
    @keyframes ax-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.65; } }
    .ax-drone-status--animated   { animation: ax-pulse 1.8s ease-in-out infinite; }
    .ax-drone-status--created    { background: var(--ax-color-bg-surface-alt); color: var(--ax-color-text-tertiary); }
    .ax-drone-status--uploading  { background: var(--ax-color-info-subtle);    color: var(--ax-color-info); }
    .ax-drone-status--uploaded   { background: var(--ax-color-success-subtle); color: var(--ax-color-success); }
    .ax-drone-status--processing { background: var(--ax-color-warning-subtle); color: var(--ax-color-warning); }
    .ax-drone-status--completed  { background: var(--ax-color-success-subtle); color: var(--ax-color-success); }
    .ax-drone-status--failed     { background: var(--ax-color-danger-subtle);  color: var(--ax-color-danger); }

    /* ── 탭 콘텐츠 ── */
    .ax-drone-detail-tab { padding: var(--ax-spacing-4) 0; }
    .ax-drone-detail-two-col {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: var(--ax-spacing-4); margin-bottom: var(--ax-spacing-4);
    }

    /* ── 패널 ── */
    .ax-drone-panel {
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border);
      border-radius: var(--ax-radius-lg);
      overflow: hidden;
    }
    .ax-drone-panel__hdr {
      display: flex; align-items: center; gap: var(--ax-spacing-2);
      padding: var(--ax-spacing-3) var(--ax-spacing-4);
      background: var(--ax-color-bg-surface-alt);
      border-bottom: 1px solid var(--ax-color-border);
      font-size: var(--ax-font-size-sm); font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
    }
    .ax-drone-panel__hdr-icon {
      font-size: 16px; width: 16px; height: 16px;
      color: var(--ax-color-text-secondary);
    }
    .ax-drone-panel__hdr-action { margin-left: auto; }
    .ax-drone-panel__body { padding: var(--ax-spacing-4); }

    /* ── 정보 그리드 ── */
    .ax-drone-info-grid { display: flex; flex-direction: column; gap: var(--ax-spacing-2); }
    .ax-drone-info-item { display: flex; justify-content: space-between; align-items: baseline; }
    .ax-drone-info-lbl { font-size: var(--ax-font-size-xs); color: var(--ax-color-text-secondary); }
    .ax-drone-info-val {
      font-size: var(--ax-font-size-sm); font-weight: var(--ax-font-weight-medium);
      color: var(--ax-color-text-primary);
    }
    .ax-drone-info-val--accent {
      color: var(--ax-color-info);
      font-size: var(--ax-font-size-md); font-weight: var(--ax-font-weight-bold);
    }
    .ax-drone-divider { margin: var(--ax-spacing-3) 0; }
    .ax-drone-description {
      font-size: var(--ax-font-size-sm); color: var(--ax-color-text-secondary); margin: 0;
    }

    /* ── 파이프라인 ── */
    .ax-drone-pipeline-row {
      display: flex; align-items: center; gap: var(--ax-spacing-2);
      padding: var(--ax-spacing-2) 0;
      border-bottom: 1px solid var(--ax-color-border-subtle);
    }
    .ax-drone-pipeline-row:last-child { border-bottom: none; }
    .ax-drone-pipeline-icon { font-size: 20px; width: 20px; height: 20px; }
    .ax-drone-pipeline-icon--success { color: var(--ax-color-success); }
    .ax-drone-pipeline-icon--warn    { color: var(--ax-color-warning); }
    .ax-drone-pipeline-icon--danger  { color: var(--ax-color-danger); }
    .ax-drone-pipeline-icon--neutral { color: var(--ax-color-text-tertiary); }
    .ax-drone-pipeline-lbl { font-size: var(--ax-font-size-sm); font-weight: var(--ax-font-weight-medium); }
    .ax-drone-pipeline-status { font-size: var(--ax-font-size-xs); margin-top: 1px; }
    .ax-drone-pipeline-status--success { color: var(--ax-color-success); }
    .ax-drone-pipeline-status--warn    { color: var(--ax-color-warning); }
    .ax-drone-pipeline-status--danger  { color: var(--ax-color-danger); }
    .ax-drone-pipeline-status--neutral { color: var(--ax-color-text-tertiary); }
    .ax-drone-no-pipeline {
      display: flex; align-items: center; gap: var(--ax-spacing-2);
      color: var(--ax-color-text-tertiary); font-size: var(--ax-font-size-sm);
      padding: var(--ax-spacing-2) 0;
    }

    /* ── 미디어 목록 ── */
    .ax-drone-media-list { display: flex; flex-direction: column; }
    .ax-drone-media-row {
      display: flex; align-items: center; gap: var(--ax-spacing-3);
      padding: var(--ax-spacing-2) var(--ax-spacing-4);
      border-bottom: 1px solid var(--ax-color-border-subtle);
    }
    .ax-drone-media-row:last-child { border-bottom: none; }
    .ax-drone-media-row__type-icon {
      font-size: 20px; width: 20px; height: 20px;
      color: var(--ax-color-text-tertiary); flex-shrink: 0;
    }
    .ax-drone-media-row__info { flex: 1; min-width: 0; }
    .ax-drone-media-row__name {
      font-size: var(--ax-font-size-sm); font-weight: var(--ax-font-weight-medium);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .ax-drone-media-row__meta {
      font-size: var(--ax-font-size-xs); color: var(--ax-color-text-tertiary); margin-top: 1px;
    }
    .ax-drone-media-row__delete { color: var(--ax-color-danger); }
    .ax-drone-media-status {
      font-size: var(--ax-font-size-xs); font-weight: var(--ax-font-weight-semibold);
      white-space: nowrap;
    }
    .ax-drone-media-status--pending    { color: var(--ax-color-text-tertiary); }
    .ax-drone-media-status--uploaded   { color: var(--ax-color-success); }
    .ax-drone-media-status--extracting { color: var(--ax-color-warning); }
    .ax-drone-media-status--done       { color: var(--ax-color-info); }
    .ax-drone-media-status--failed     { color: var(--ax-color-danger); }

    @media (max-width: 768px) {
      .ax-drone-detail-two-col { grid-template-columns: 1fr; }
    }
  `],
})
export class DroneMissionDetailPageComponent implements OnInit, OnDestroy {
  private readonly route    = inject(ActivatedRoute);
  private readonly droneApi = inject(DroneApi);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog   = inject(MatDialog);

  readonly mission   = signal<any>(null);
  readonly pipeline  = signal<any>(null);
  readonly loading   = signal(false);
  readonly analyzing = signal(false);

  missionId = '';
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  readonly canUpload = computed(() => {
    const s = this.mission()?.status;
    return s === 'CREATED' || s === 'UPLOADING' || s === 'UPLOADED';
  });

  readonly canAnalyze = computed(() => {
    const m = this.mission();
    return m?.status === 'UPLOADED' && (m?.mediaItems ?? []).length > 0;
  });

  readonly pipelineEntries = computed(() => {
    const p = this.pipeline();
    if (!p?.stages) return [];
    return Object.entries(p.stages).map(([key, stage]) => ({ key, stage: stage as any }));
  });

  ngOnInit() {
    this.missionId = this.route.snapshot.paramMap.get('missionId') ?? '';
    this.refresh();
    this.pollTimer = setInterval(() => {
      const s = this.mission()?.status;
      if (s === 'UPLOADING' || s === 'PROCESSING') this.refresh();
    }, 10_000);
  }

  ngOnDestroy() {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  refresh() {
    if (!this.missionId) return;
    this.loading.set(true);
    this.droneApi.getById(this.missionId).subscribe({
      next: (m) => {
        this.mission.set(m);
        this.loading.set(false);
        this.loadPipeline();
      },
      error: () => this.loading.set(false),
    });
  }

  private loadPipeline() {
    this.droneApi.getPipelineStatus(this.missionId).subscribe({
      next: (res) => this.pipeline.set(res),
      error: () => {},
    });
  }

  openUploadDialog() {
    const ref = this.dialog.open(DroneUploadFormComponent, {
      width: '560px',
      data: { missionId: this.missionId },
    });
    ref.afterClosed().subscribe((uploaded) => {
      if (uploaded) this.refresh();
    });
  }

  startAnalysis() {
    this.analyzing.set(true);
    this.droneApi.startAnalysis(this.missionId).subscribe({
      next: () => {
        this.snackBar.open('AI 분석을 시작했습니다.', '닫기', { duration: 3000 });
        this.analyzing.set(false);
        this.refresh();
      },
      error: (e) => {
        this.snackBar.open(`분석 시작 실패: ${e.error?.message ?? e.message}`, '닫기', { duration: 4000 });
        this.analyzing.set(false);
      },
    });
  }

  deleteMedia(mediaItemId: string) {
    if (!confirm('이 미디어 파일을 삭제하시겠습니까?')) return;
    this.droneApi.removeMedia(this.missionId, mediaItemId).subscribe({
      next: () => {
        this.snackBar.open('삭제되었습니다.', '닫기', { duration: 2000 });
        this.refresh();
      },
      error: () => this.snackBar.open('삭제 실패', '닫기', { duration: 3000 }),
    });
  }

  statusLabel(s: string)      { return STATUS_LABELS[s] ?? s; }
  isAnimated(s: string)       { return s === 'UPLOADING' || s === 'PROCESSING'; }
  mediaStatusLabel(s: string) { return MEDIA_STATUS_LABELS[s] ?? s; }

  stageName(key: string): string {
    const map: Record<string, string> = {
      metadataExtraction: '메타데이터 추출',
      frameExtraction:    '프레임 추출',
      aiAnalysis:         'AI 분석',
    };
    return map[key] ?? key;
  }

  stageIcon(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'check_circle';
      case 'RUNNING':   return 'sync';
      case 'FAILED':    return 'error';
      case 'SKIPPED':   return 'remove_circle_outline';
      default:          return 'radio_button_unchecked';
    }
  }

  stageKey(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'RUNNING':   return 'warn';
      case 'FAILED':    return 'danger';
      default:          return 'neutral';
    }
  }

  formatBytes(bytes: number): string {
    if (!bytes) return '—';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
