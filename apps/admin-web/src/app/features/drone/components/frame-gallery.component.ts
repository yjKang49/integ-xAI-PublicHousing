// apps/admin-web/src/app/features/drone/components/frame-gallery.component.ts
// 드론 미션 프레임 갤러리 — 그리드 표시, 페이지네이션, 결함 뱃지
import {
  Component, OnInit, Input, inject, signal, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { DroneApi } from '../data-access/drone.api';

// 결함 심각도별 색상
const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: '#c62828',
  HIGH:     '#e65100',
  MEDIUM:   '#f57c00',
  LOW:      '#388e3c',
};

@Component({
  selector: 'ax-frame-gallery',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatProgressBarModule, MatProgressSpinnerModule,
    MatPaginatorModule, MatChipsModule, MatTooltipModule, MatDialogModule,
  ],
  template: `
    <!-- 헤더 -->
    <div class="gallery-header">
      <div class="gallery-title">
        <mat-icon>photo_library</mat-icon>
        <span>추출 프레임 ({{ total() }}개)</span>
      </div>
      <button mat-stroked-button (click)="load()">
        <mat-icon>refresh</mat-icon> 새로고침
      </button>
    </div>

    @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

    <!-- 그리드 -->
    @if (frames().length > 0) {
      <div class="frame-grid">
        @for (frame of frames(); track frame._id) {
          <div
            class="frame-card"
            [class.has-defect]="hasDefect(frame)"
            (click)="openDetail(frame)"
            matTooltip="{{ frameLabel(frame) }}"
          >
            <!-- 실제 이미지 썸네일 (S3 URL이 있을 때만, 없으면 플레이스홀더) -->
            <div class="frame-thumb">
              @if (frame.thumbnailUrl) {
                <img [src]="frame.thumbnailUrl" [alt]="frameLabel(frame)" loading="lazy" />
              } @else {
                <div class="frame-placeholder">
                  <mat-icon>image</mat-icon>
                  <span>#{{ frame.frameIndex }}</span>
                </div>
              }

              <!-- 결함 뱃지 -->
              @if (hasDefect(frame)) {
                <div class="defect-badge" [style.background]="defectColor(frame)">
                  <mat-icon class="badge-icon">warning</mat-icon>
                  {{ defectLabel(frame) }}
                </div>
              }

              <!-- 타임스탬프 오버레이 -->
              <div class="timestamp-overlay">{{ formatTime(frame.timestampMs) }}</div>
            </div>

            <!-- 프레임 정보 -->
            <div class="frame-info">
              <span class="frame-index">프레임 #{{ frame.frameIndex }}</span>
              @if (frame.aiResult?.detections?.length) {
                <span class="detection-count" [style.color]="defectColor(frame)">
                  {{ frame.aiResult.detections.length }}건
                </span>
              }
            </div>
          </div>
        }
      </div>

      <mat-paginator
        [length]="total()"
        [pageSize]="pageSize"
        [pageSizeOptions]="[24, 48, 100]"
        (page)="onPage($event)"
        showFirstLastButtons
        style="margin-top:8px"
      />
    } @else if (!loading()) {
      <div class="empty-state">
        <mat-icon>image_search</mat-icon>
        <p>추출된 프레임이 없습니다.</p>
      </div>
    }

    <!-- 프레임 상세 다이얼로그 (인라인) -->
    @if (selectedFrame()) {
      <div class="frame-modal-backdrop" (click)="selectedFrame.set(null)">
        <div class="frame-modal" (click)="$event.stopPropagation()">
          <button class="modal-close" mat-icon-button (click)="selectedFrame.set(null)">
            <mat-icon>close</mat-icon>
          </button>

          <div class="modal-content">
            <!-- 이미지 영역 -->
            <div class="modal-image-area">
              @if (selectedFrame()?.thumbnailUrl) {
                <img [src]="selectedFrame()!.thumbnailUrl" alt="frame" class="modal-image" />
              } @else {
                <div class="modal-placeholder">
                  <mat-icon>image</mat-icon>
                  <p>이미지 미리보기 없음</p>
                  <p class="modal-storage-key">{{ selectedFrame()?.storageKey }}</p>
                </div>
              }
            </div>

            <!-- 프레임 메타 + AI 결과 -->
            <div class="modal-sidebar">
              <h3 class="modal-title">프레임 #{{ selectedFrame()?.frameIndex }}</h3>
              <div class="modal-meta">
                <span class="meta-label">타임스탬프</span>
                <span>{{ formatTime(selectedFrame()?.timestampMs ?? 0) }}</span>
              </div>
              <div class="modal-meta">
                <span class="meta-label">미디어 아이템</span>
                <span class="mono">{{ selectedFrame()?.mediaItemId }}</span>
              </div>

              @if (selectedFrame()?.aiResult?.detections?.length) {
                <div class="detection-list">
                  <h4>AI 탐지 결과</h4>
                  @for (d of selectedFrame()!.aiResult.detections; track $index) {
                    <div class="detection-item" [style.border-left-color]="SEVERITY_COLOR[d.severity]">
                      <div class="detection-type">{{ d.defectType }}</div>
                      <div class="detection-meta">
                        심각도: <strong [style.color]="SEVERITY_COLOR[d.severity]">{{ d.severity }}</strong>
                        · 신뢰도: {{ (d.confidence * 100).toFixed(0) }}%
                      </div>
                      @if (d.aiCaption) {
                        <div class="detection-caption">{{ d.aiCaption }}</div>
                      }
                    </div>
                  }
                </div>
              } @else {
                <div class="no-detection">
                  <mat-icon>check_circle_outline</mat-icon>
                  <p>탐지된 결함 없음</p>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .gallery-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 12px;
    }
    .gallery-title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 15px; }

    .frame-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 10px;
    }

    .frame-card {
      border-radius: 6px; overflow: hidden; cursor: pointer;
      border: 2px solid #e0e0e0; transition: transform .15s, border-color .15s;
    }
    .frame-card:hover { transform: scale(1.02); border-color: #90caf9; }
    .frame-card.has-defect { border-color: #ef9a9a; }

    .frame-thumb { position: relative; aspect-ratio: 16/9; background: #f5f5f5; overflow: hidden; }
    .frame-thumb img { width: 100%; height: 100%; object-fit: cover; }

    .frame-placeholder {
      width: 100%; height: 100%;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      color: #bdbdbd; gap: 4px;
    }
    .frame-placeholder mat-icon { font-size: 28px; width: 28px; height: 28px; }
    .frame-placeholder span { font-size: 11px; }

    .defect-badge {
      position: absolute; top: 4px; left: 4px;
      display: flex; align-items: center; gap: 2px;
      padding: 2px 6px; border-radius: 10px;
      color: #fff; font-size: 10px; font-weight: 700;
    }
    .badge-icon { font-size: 12px; width: 12px; height: 12px; }

    .timestamp-overlay {
      position: absolute; bottom: 2px; right: 4px;
      font-size: 10px; color: rgba(255,255,255,.85);
      text-shadow: 0 0 3px rgba(0,0,0,.8);
    }

    .frame-info {
      display: flex; justify-content: space-between; align-items: center;
      padding: 4px 8px; font-size: 11px;
    }
    .frame-index { color: #555; }
    .detection-count { font-weight: 700; }

    .empty-state {
      text-align: center; padding: 64px; color: #9e9e9e;
      display: flex; flex-direction: column; align-items: center; gap: 12px;
    }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; }

    /* 모달 */
    .frame-modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,.6);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000;
    }
    .frame-modal {
      background: #fff; border-radius: 8px;
      width: min(900px, 95vw); max-height: 90vh;
      overflow: hidden; position: relative;
      display: flex; flex-direction: column;
    }
    .modal-close { position: absolute; top: 8px; right: 8px; z-index: 1; }
    .modal-content { display: flex; flex: 1; overflow: hidden; }
    .modal-image-area {
      flex: 1; background: #111;
      display: flex; align-items: center; justify-content: center;
      overflow: hidden;
    }
    .modal-image { max-width: 100%; max-height: 80vh; object-fit: contain; }
    .modal-placeholder {
      display: flex; flex-direction: column; align-items: center;
      color: #555; gap: 8px; padding: 32px; text-align: center;
    }
    .modal-placeholder mat-icon { font-size: 48px; width: 48px; height: 48px; color: #757575; }
    .modal-storage-key { font-size: 10px; word-break: break-all; color: #9e9e9e; }
    .modal-sidebar {
      width: 280px; flex-shrink: 0;
      padding: 48px 16px 16px; overflow-y: auto;
      border-left: 1px solid #e0e0e0;
    }
    .modal-title { margin: 0 0 12px; font-size: 16px; font-weight: 600; }
    .modal-meta {
      display: flex; justify-content: space-between; font-size: 12px;
      padding: 4px 0; border-bottom: 1px solid #f5f5f5;
    }
    .meta-label { color: #9e9e9e; }
    .mono { font-family: monospace; font-size: 11px; word-break: break-all; }

    .detection-list { margin-top: 16px; }
    .detection-list h4 { margin: 0 0 8px; font-size: 13px; }
    .detection-item {
      padding: 8px; border-left: 3px solid; border-radius: 0 4px 4px 0;
      background: #fafafa; margin-bottom: 8px;
    }
    .detection-type { font-size: 13px; font-weight: 600; }
    .detection-meta { font-size: 11px; color: #555; margin-top: 2px; }
    .detection-caption { font-size: 11px; color: #757575; margin-top: 4px; font-style: italic; }

    .no-detection {
      display: flex; flex-direction: column; align-items: center;
      color: #9e9e9e; gap: 6px; margin-top: 16px; font-size: 13px;
    }
    .no-detection mat-icon { color: #4caf50; }
  `],
})
export class FrameGalleryComponent implements OnInit {
  @Input({ required: true }) missionId!: string;

  private readonly droneApi = inject(DroneApi);

  readonly frames  = signal<any[]>([]);
  readonly total   = signal(0);
  readonly loading = signal(false);
  readonly selectedFrame = signal<any>(null);

  readonly SEVERITY_COLOR = SEVERITY_COLOR;

  pageSize  = 24;
  pageIndex = 0;

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.droneApi.listFrames(this.missionId, this.pageIndex + 1, this.pageSize).subscribe({
      next: (res) => {
        this.frames.set(res.data ?? []);
        this.total.set(res.meta?.total ?? (res.data ?? []).length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onPage(e: PageEvent) {
    this.pageIndex = e.pageIndex;
    this.pageSize  = e.pageSize;
    this.load();
  }

  openDetail(frame: any) { this.selectedFrame.set(frame); }

  hasDefect(frame: any): boolean {
    return (frame.aiResult?.detections ?? []).length > 0;
  }

  defectColor(frame: any): string {
    const detections = frame.aiResult?.detections ?? [];
    if (!detections.length) return '#9e9e9e';
    // 가장 심각한 severity 색상 반환
    const order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    for (const sev of order) {
      if (detections.some((d: any) => d.severity === sev)) {
        return SEVERITY_COLOR[sev];
      }
    }
    return '#9e9e9e';
  }

  defectLabel(frame: any): string {
    const detections = frame.aiResult?.detections ?? [];
    if (!detections.length) return '';
    const order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    for (const sev of order) {
      if (detections.some((d: any) => d.severity === sev)) return sev;
    }
    return '';
  }

  frameLabel(frame: any): string {
    return `프레임 #${frame.frameIndex} — ${this.formatTime(frame.timestampMs)}`;
  }

  formatTime(ms: number): string {
    if (!ms && ms !== 0) return '—';
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
}
