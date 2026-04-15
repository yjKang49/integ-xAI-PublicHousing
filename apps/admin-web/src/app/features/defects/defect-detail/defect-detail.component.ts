import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Defect, DefectMarker3D } from '@ax/shared';
import { DefectsService } from '../../../core/api/defects.service';

const SEVERITY_LABELS: Record<string, string> = {
  LOW: '낮음', MEDIUM: '보통', HIGH: '높음', CRITICAL: '긴급',
};
const SEVERITY_COLORS: Record<string, string> = {
  LOW: '#4caf50', MEDIUM: '#2196f3', HIGH: '#ff9800', CRITICAL: '#f44336',
};
const DEFECT_TYPE_LABELS: Record<string, string> = {
  CRACK: '균열', LEAK: '누수', SPALLING: '박리/박락',
  CORROSION: '부식', EFFLORESCENCE: '백태',
  DEFORMATION: '변형', SETTLEMENT: '침하', OTHER: '기타',
};

@Component({
  selector: 'ax-defect-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatDividerModule, MatDialogModule, MatSnackBarModule,
    MatProgressBarModule, MatTooltipModule, MatInputModule, MatFormFieldModule,
  ],
  template: `
    <div class="detail-layout">

      <!-- Back + Header -->
      <div class="page-header">
        <button mat-icon-button routerLink="../" matTooltip="목록으로">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h2>결함 상세</h2>
        @if (defect()) {
          <mat-chip [style.background]="severityColor(defect()!.severity)" style="color:white">
            {{ severityLabel(defect()!.severity) }}
          </mat-chip>
        }
      </div>

      @if (loading()) {
        <mat-progress-bar mode="indeterminate" />
      }

      @if (defect(); as d) {
        <div class="detail-grid">

          <!-- Left column: info + measurements -->
          <div class="left-col">

            <!-- Basic info -->
            <mat-card>
              <mat-card-header>
                <mat-card-title>기본 정보</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="info-row">
                  <span class="info-label">결함 유형</span>
                  <span class="info-value">{{ defectTypeLabel(d.defectType) }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">심각도</span>
                  <span class="info-value" [style.color]="severityColor(d.severity)">
                    <strong>{{ severityLabel(d.severity) }}</strong>
                  </span>
                </div>
                <div class="info-row">
                  <span class="info-label">위치 설명</span>
                  <span class="info-value">{{ d.locationDescription }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">상세 설명</span>
                  <span class="info-value">{{ d.description || '—' }}</span>
                </div>
                <mat-divider style="margin: 12px 0" />
                <div class="info-row">
                  <span class="info-label">등록일</span>
                  <span class="info-value">{{ d.createdAt | date:'yyyy-MM-dd HH:mm' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">등록자</span>
                  <span class="info-value">{{ d.createdBy }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">세션 ID</span>
                  <span class="info-value id-text">{{ d.sessionId }}</span>
                </div>
              </mat-card-content>
            </mat-card>

            <!-- Measurements -->
            <mat-card style="margin-top: 16px">
              <mat-card-header>
                <mat-card-title>측정값</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="measure-grid">
                  <div class="measure-item">
                    <div class="measure-val">{{ d.widthMm ?? '—' }}</div>
                    <div class="measure-unit">폭 (mm)</div>
                  </div>
                  <div class="measure-item">
                    <div class="measure-val">{{ d.lengthMm ?? '—' }}</div>
                    <div class="measure-unit">길이 (mm)</div>
                  </div>
                  <div class="measure-item">
                    <div class="measure-val">{{ d.depthMm ?? '—' }}</div>
                    <div class="measure-unit">깊이 (mm)</div>
                  </div>
                  <div class="measure-item">
                    <div class="measure-val">{{ d.areaSqm ?? '—' }}</div>
                    <div class="measure-unit">면적 (m²)</div>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <!-- Repair status -->
            <mat-card style="margin-top: 16px">
              <mat-card-header>
                <mat-card-title>조치 현황</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                @if (d.isRepaired) {
                  <div class="repair-done">
                    <mat-icon color="primary">check_circle</mat-icon>
                    <div>
                      <strong>조치 완료</strong>
                      <p>{{ d.repairedAt | date:'yyyy-MM-dd HH:mm' }}</p>
                      @if (d.repairNotes) { <p class="repair-notes">{{ d.repairNotes }}</p> }
                    </div>
                  </div>
                } @else {
                  <div class="repair-form">
                    <p style="color: #e65100; margin-bottom: 12px">
                      <mat-icon style="vertical-align: middle">warning</mat-icon>
                      아직 조치되지 않은 결함입니다.
                    </p>
                    <mat-form-field appearance="outline" style="width: 100%">
                      <mat-label>조치 내용 메모</mat-label>
                      <textarea matInput [(ngModel)]="repairNotes" rows="3"
                        placeholder="수행한 조치 내용을 입력하세요"></textarea>
                    </mat-form-field>
                    <button mat-raised-button color="primary" (click)="markRepaired()"
                      [disabled]="saving()">
                      <mat-icon>build</mat-icon>
                      조치 완료 처리
                    </button>
                  </div>
                }
              </mat-card-content>
            </mat-card>
          </div>

          <!-- Right column: photos + 3D markers -->
          <div class="right-col">

            <!-- Photos -->
            <mat-card>
              <mat-card-header>
                <mat-card-title>첨부 사진 ({{ d.mediaIds?.length ?? 0 }}장)</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                @if ((d.mediaIds?.length ?? 0) === 0) {
                  <div class="empty-media">
                    <mat-icon>photo_library</mat-icon>
                    <p>첨부된 사진이 없습니다.</p>
                  </div>
                } @else {
                  <div class="photo-grid">
                    @for (url of photoUrls(); track url) {
                      <div class="photo-item" (click)="openPhoto(url)">
                        <img [src]="url" [alt]="'결함 사진'" loading="lazy"
                          onerror="this.src='assets/img-error.png'" />
                        <div class="photo-overlay">
                          <mat-icon>zoom_in</mat-icon>
                        </div>
                      </div>
                    }
                    @if (loadingPhotos()) {
                      @for (i of photoLoadingPlaceholders(); track i) {
                        <div class="photo-placeholder">
                          <mat-icon class="spin">sync</mat-icon>
                        </div>
                      }
                    }
                  </div>
                }
              </mat-card-content>
            </mat-card>

            <!-- 3D Markers -->
            <mat-card style="margin-top: 16px">
              <mat-card-header>
                <mat-card-title>3D 마커</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                @if (markers().length === 0) {
                  <div class="empty-media">
                    <mat-icon>place</mat-icon>
                    <p>등록된 3D 마커가 없습니다.</p>
                  </div>
                } @else {
                  @for (marker of markers(); track marker._id) {
                    <div class="marker-item">
                      <div class="marker-color" [style.background]="marker.color ?? '#FF6B6B'"></div>
                      <div class="marker-info">
                        <div class="marker-label">{{ marker.label ?? '마커 ' + $index }}</div>
                        <div class="marker-coords">
                          x: {{ marker.position.x | number:'1.2-3' }},
                          y: {{ marker.position.y | number:'1.2-3' }},
                          z: {{ marker.position.z | number:'1.2-3' }}
                        </div>
                        @if (marker.meshName) {
                          <div class="marker-mesh">{{ marker.meshName }}</div>
                        }
                      </div>
                    </div>
                  }
                }
              </mat-card-content>
            </mat-card>

          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .detail-layout { max-width: 1100px; }
    .page-header {
      display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
    }
    .page-header h2 { margin: 0; font-size: 22px; font-weight: 600; flex: 1; }
    .detail-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
    }
    @media (max-width: 900px) { .detail-grid { grid-template-columns: 1fr; } }
    .info-row {
      display: flex; gap: 12px; padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #666; font-size: 13px; min-width: 100px; }
    .info-value { font-size: 14px; flex: 1; }
    .id-text { font-family: monospace; font-size: 11px; color: #888; word-break: break-all; }
    .measure-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 8px 0;
    }
    .measure-item { text-align: center; }
    .measure-val { font-size: 24px; font-weight: 700; color: #333; }
    .measure-unit { font-size: 12px; color: #888; margin-top: 4px; }
    .repair-done {
      display: flex; gap: 12px; align-items: flex-start;
    }
    .repair-done mat-icon { font-size: 32px; width: 32px; height: 32px; margin-top: 4px; }
    .repair-notes { color: #555; font-size: 13px; margin-top: 4px; }
    .repair-form {}
    .photo-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
    }
    .photo-item {
      position: relative; aspect-ratio: 1; overflow: hidden; border-radius: 8px;
      cursor: pointer;
    }
    .photo-item img { width: 100%; height: 100%; object-fit: cover; }
    .photo-overlay {
      position: absolute; inset: 0; background: rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity 0.2s;
    }
    .photo-item:hover .photo-overlay { opacity: 1; }
    .photo-overlay mat-icon { color: white; font-size: 32px; }
    .photo-placeholder {
      aspect-ratio: 1; border-radius: 8px; background: #f5f5f5;
      display: flex; align-items: center; justify-content: center;
    }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .empty-media { text-align: center; padding: 32px; color: #bbb; }
    .empty-media mat-icon { font-size: 40px; width: 40px; height: 40px; }
    .empty-media p { margin-top: 8px; }
    .marker-item {
      display: flex; gap: 12px; align-items: flex-start;
      padding: 8px 0; border-bottom: 1px solid #f0f0f0;
    }
    .marker-item:last-child { border-bottom: none; }
    .marker-color { width: 16px; height: 16px; border-radius: 50%; margin-top: 2px; flex-shrink: 0; }
    .marker-label { font-weight: 500; font-size: 13px; }
    .marker-coords { font-family: monospace; font-size: 11px; color: #666; margin-top: 2px; }
    .marker-mesh { font-size: 11px; color: #999; }
  `],
})
export class DefectDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly defectsService = inject(DefectsService);
  private readonly snackBar = inject(MatSnackBar);

  readonly defect = signal<Defect | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadingPhotos = signal(false);
  readonly photoUrls = signal<string[]>([]);
  readonly markers = signal<DefectMarker3D[]>([]);

  repairNotes = '';

  photoLoadingPlaceholders() {
    const remaining = (this.defect()?.mediaIds?.length ?? 0) - this.photoUrls().length;
    return Array.from({ length: Math.max(0, remaining) }, (_, i) => i);
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loadDefect(id);
  }

  private loadDefect(id: string) {
    this.loading.set(true);
    this.defectsService.get(id).subscribe({
      next: (defect) => {
        this.defect.set(defect);
        this.loading.set(false);
        this.loadPhotos(defect);
        this.loadMarkers(defect);
      },
      error: () => {
        this.snackBar.open('결함 정보를 불러오지 못했습니다.', '닫기', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  private loadPhotos(defect: Defect) {
    if (!defect.mediaIds?.length) return;
    this.loadingPhotos.set(true);

    const urls: string[] = [];
    let pending = defect.mediaIds.length;

    defect.mediaIds.forEach((mediaId) => {
      // GET /api/v1/media/:mediaId/url — returns { url, expiresIn }
      this.defectsService.getMediaUrl(mediaId).subscribe({
        next: (res) => {
          urls.push(res.url);
          if (--pending === 0) {
            this.photoUrls.set(urls);
            this.loadingPhotos.set(false);
          }
        },
        error: () => {
          if (--pending === 0) {
            this.photoUrls.set(urls);
            this.loadingPhotos.set(false);
          }
        },
      });
    });
  }

  private loadMarkers(defect: Defect) {
    this.defectsService.getMarkersByDefect(defect._id).subscribe({
      next: (markers) => this.markers.set(markers),
      error: () => {},
    });
  }

  openPhoto(url: string) {
    window.open(url, '_blank');
  }

  markRepaired() {
    const defect = this.defect();
    if (!defect) return;
    this.saving.set(true);
    this.defectsService.markRepaired(defect._id, this.repairNotes).subscribe({
      next: (updated) => {
        this.defect.set(updated);
        this.saving.set(false);
        this.snackBar.open('조치 완료 처리되었습니다.', '닫기', { duration: 2000 });
      },
      error: () => {
        this.snackBar.open('처리 중 오류가 발생했습니다.', '닫기', { duration: 3000 });
        this.saving.set(false);
      },
    });
  }

  severityLabel(s: string) { return SEVERITY_LABELS[s] ?? s; }
  severityColor(s: string) { return SEVERITY_COLORS[s] ?? '#999'; }
  defectTypeLabel(t: string) { return DEFECT_TYPE_LABELS[t] ?? t; }
}
