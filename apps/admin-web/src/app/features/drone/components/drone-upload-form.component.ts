// apps/admin-web/src/app/features/drone/components/drone-upload-form.component.ts
// 드론 미디어 파일 업로드 폼 (다이얼로그)
// S3 pre-signed PUT URL 2단계 업로드: init → PUT to S3 → complete
import {
  Component, OnInit, inject, signal, Inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { HttpEventType } from '@angular/common/http';
import { DroneApi } from '../data-access/drone.api';

interface UploadItem {
  file: File;
  mediaType: 'VIDEO' | 'IMAGE';
  status: 'PENDING' | 'UPLOADING' | 'DONE' | 'FAILED';
  progress: number;
  error?: string;
  mediaItemId?: string;
}

@Component({
  selector: 'ax-drone-upload-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatDialogModule, MatButtonModule, MatIconModule,
    MatProgressBarModule, MatListModule, MatChipsModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon style="vertical-align:middle;margin-right:8px">cloud_upload</mat-icon>
      드론 미디어 업로드
    </h2>

    <mat-dialog-content>
      <!-- 파일 선택 드롭존 -->
      <div
        class="dropzone"
        [class.drag-over]="dragging()"
        (dragover)="$event.preventDefault(); dragging.set(true)"
        (dragleave)="dragging.set(false)"
        (drop)="onDrop($event)"
        (click)="fileInput.click()"
      >
        <mat-icon class="upload-icon">cloud_upload</mat-icon>
        <p class="drop-text">클릭하거나 파일을 드래그하세요</p>
        <p class="drop-hint">MP4, MOV, AVI (영상) · JPG, PNG, WEBP (이미지)</p>
        <input #fileInput type="file" hidden multiple
          accept="video/mp4,video/quicktime,video/x-msvideo,image/jpeg,image/png,image/webp"
          (change)="onFileSelect($event)" />
      </div>

      <!-- 파일 목록 -->
      @if (items().length > 0) {
        <div class="file-list">
          @for (item of items(); track item.file.name) {
            <div class="file-row" [class.done]="item.status === 'DONE'" [class.failed]="item.status === 'FAILED'">
              <mat-icon class="file-icon">{{ item.mediaType === 'VIDEO' ? 'videocam' : 'image' }}</mat-icon>
              <div class="file-info">
                <div class="file-name">{{ item.file.name }}</div>
                <div class="file-meta">
                  {{ item.mediaType === 'VIDEO' ? '영상' : '이미지' }} · {{ formatBytes(item.file.size) }}
                </div>
                @if (item.status === 'UPLOADING') {
                  <mat-progress-bar mode="determinate" [value]="item.progress" style="margin-top:4px" />
                }
                @if (item.error) {
                  <div class="file-error">{{ item.error }}</div>
                }
              </div>
              <mat-icon class="status-icon" [style.color]="statusColor(item.status)">
                {{ statusIcon(item.status) }}
              </mat-icon>
              @if (item.status === 'PENDING') {
                <button mat-icon-button (click)="removeItem(item)">
                  <mat-icon>close</mat-icon>
                </button>
              }
            </div>
          }
        </div>

        <!-- 전체 진행률 -->
        @if (uploading()) {
          <div class="overall-progress">
            <span class="overall-label">업로드 중 {{ doneCount() }}/{{ items().length }}</span>
            <mat-progress-bar mode="determinate" [value]="overallProgress()" />
          </div>
        }
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close [disabled]="uploading()">취소</button>
      <button
        mat-raised-button color="primary"
        [disabled]="items().length === 0 || uploading() || allDone()"
        (click)="upload()"
      >
        <mat-icon>upload</mat-icon>
        업로드 ({{ pendingCount() }}개)
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dropzone {
      border: 2px dashed #90caf9; border-radius: 8px;
      padding: 32px; text-align: center; cursor: pointer;
      transition: background .2s;
      margin-bottom: 16px;
    }
    .dropzone:hover, .drag-over { background: #e3f2fd; }
    .upload-icon { font-size: 40px; width: 40px; height: 40px; color: #90caf9; }
    .drop-text { margin: 8px 0 4px; font-size: 14px; font-weight: 600; color: #555; }
    .drop-hint { margin: 0; font-size: 12px; color: #9e9e9e; }

    .file-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
    .file-row {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 12px; border-radius: 6px; background: #fafafa;
      border: 1px solid #e0e0e0;
    }
    .file-row.done  { border-color: #c8e6c9; background: #f1f8e9; }
    .file-row.failed { border-color: #ffcdd2; background: #fff8f8; }
    .file-icon { color: #9e9e9e; }
    .file-info { flex: 1; min-width: 0; }
    .file-name { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .file-meta { font-size: 11px; color: #9e9e9e; }
    .file-error { font-size: 11px; color: #c62828; margin-top: 2px; }
    .status-icon { font-size: 20px; width: 20px; height: 20px; }

    .overall-progress { margin-top: 8px; }
    .overall-label { font-size: 12px; color: #555; display: block; margin-bottom: 4px; }
  `],
})
export class DroneUploadFormComponent implements OnInit {
  private readonly droneApi = inject(DroneApi);
  private readonly dialogRef = inject(MatDialogRef<DroneUploadFormComponent>);

  readonly items = signal<UploadItem[]>([]);
  readonly dragging = signal(false);
  readonly uploading = signal(false);

  missionId = '';

  readonly pendingCount = () => this.items().filter(i => i.status === 'PENDING').length;
  readonly doneCount    = () => this.items().filter(i => i.status === 'DONE').length;
  readonly allDone      = () => this.items().length > 0 && this.items().every(i => i.status === 'DONE');
  readonly overallProgress = () =>
    this.items().length === 0 ? 0 :
    Math.round(this.items().reduce((s, i) => s + i.progress, 0) / this.items().length);

  constructor(@Inject(MAT_DIALOG_DATA) private readonly data: { missionId: string }) {}

  ngOnInit() {
    this.missionId = this.data.missionId;
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) this.addFiles(Array.from(input.files));
    input.value = '';
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragging.set(false);
    const files = Array.from(event.dataTransfer?.files ?? []);
    this.addFiles(files);
  }

  addFiles(files: File[]) {
    const allowed = ['video/mp4', 'video/quicktime', 'video/x-msvideo',
                     'image/jpeg', 'image/png', 'image/webp'];
    const newItems: UploadItem[] = files
      .filter(f => allowed.includes(f.type))
      .map(f => ({
        file: f,
        mediaType: f.type.startsWith('video/') ? 'VIDEO' : 'IMAGE',
        status: 'PENDING',
        progress: 0,
      }));
    this.items.update(prev => [...prev, ...newItems]);
  }

  removeItem(item: UploadItem) {
    this.items.update(prev => prev.filter(i => i !== item));
  }

  async upload() {
    this.uploading.set(true);
    const pending = this.items().filter(i => i.status === 'PENDING');

    for (const item of pending) {
      await this.uploadOne(item);
    }

    this.uploading.set(false);
    if (this.allDone()) {
      setTimeout(() => this.dialogRef.close(true), 800);
    }
  }

  private async uploadOne(item: UploadItem): Promise<void> {
    this.updateItem(item, { status: 'UPLOADING', progress: 0 });

    return new Promise<void>((resolve) => {
      // 단계 1: upload init → pre-signed URL 획득
      this.droneApi.initMediaUpload(this.missionId, {
        fileName: item.file.name,
        mimeType: item.file.type,
        fileSize: item.file.size,
        mediaType: item.mediaType,
      }).subscribe({
        next: (initRes) => {
          const { uploadUrl, mediaItemId } = initRes;
          this.updateItem(item, { mediaItemId, progress: 10 });

          // 단계 2: S3 pre-signed URL로 PUT
          this.droneApi.uploadFileToS3(uploadUrl, item.file).subscribe({
            next: (event) => {
              if (event.type === HttpEventType.UploadProgress && event.total) {
                const pct = 10 + Math.round((event.loaded / event.total) * 80);
                this.updateItem(item, { progress: pct });
              } else if (event.type === HttpEventType.Response) {
                // 단계 3: complete 콜백
                this.droneApi.completeMediaUpload(this.missionId, mediaItemId, {}).subscribe({
                  next: () => {
                    this.updateItem(item, { status: 'DONE', progress: 100 });
                    resolve();
                  },
                  error: (e) => {
                    this.updateItem(item, { status: 'FAILED', error: `완료 처리 실패: ${e.message}` });
                    resolve();
                  },
                });
              }
            },
            error: (e) => {
              this.updateItem(item, { status: 'FAILED', error: `S3 업로드 실패: ${e.message}` });
              resolve();
            },
          });
        },
        error: (e) => {
          this.updateItem(item, { status: 'FAILED', error: `초기화 실패: ${e.error?.message ?? e.message}` });
          resolve();
        },
      });
    });
  }

  private updateItem(target: UploadItem, patch: Partial<UploadItem>) {
    this.items.update(prev =>
      prev.map(i => i === target ? { ...i, ...patch } : i),
    );
  }

  statusIcon(s: string): string {
    switch (s) {
      case 'DONE':      return 'check_circle';
      case 'FAILED':    return 'error';
      case 'UPLOADING': return 'cloud_upload';
      default:          return 'radio_button_unchecked';
    }
  }

  statusColor(s: string): string {
    switch (s) {
      case 'DONE':      return '#2e7d32';
      case 'FAILED':    return '#c62828';
      case 'UPLOADING': return '#1565c0';
      default:          return '#bdbdbd';
    }
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
