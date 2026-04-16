import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { Defect, DefectMarker3D } from '@ax/shared';
import { DefectsService } from '../../../core/api/defects.service';
import { environment } from '../../../../environments/environment';

const SEVERITY_LABELS: Record<string, string> = {
  LOW: '낮음', MEDIUM: '보통', HIGH: '높음', CRITICAL: '긴급',
};
const SEVERITY_COLORS: Record<string, string> = {
  LOW: '#16a34a', MEDIUM: '#d97706', HIGH: '#c2410c', CRITICAL: '#dc2626',
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
    MatProgressBarModule, MatProgressSpinnerModule,
    MatTooltipModule, MatInputModule, MatFormFieldModule, MatSelectModule,
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

          <!-- Left column: info + measurements + repair -->
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
                  <span class="info-value">{{ formatUser(d.createdBy) }}</span>
                </div>
                <mat-divider style="margin: 12px 0" />

                <!-- Session ID row -->
                <div class="info-row info-row--session">
                  <span class="info-label">점검 세션</span>
                  <span class="info-value">
                    @if (d.sessionId) {
                      <span class="id-text">{{ d.sessionId }}</span>
                    } @else {
                      <span class="badge-direct">직접 등록</span>
                      @if (!showSessionPicker()) {
                        <button mat-stroked-button class="link-btn"
                                (click)="openSessionPicker()">
                          <mat-icon>link</mat-icon> 세션 연결
                        </button>
                      }
                    }
                  </span>
                </div>

                <!-- Inline session picker -->
                @if (showSessionPicker()) {
                  <div class="session-picker">
                    <mat-form-field appearance="outline" style="width:100%">
                      <mat-label>프로젝트 선택</mat-label>
                      <mat-select [(ngModel)]="pickerProjectId"
                                  (ngModelChange)="onPickerProjectChange($event)">
                        @for (p of pickerProjects(); track p._id) {
                          <mat-option [value]="p._id">{{ p.name }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>

                    <mat-form-field appearance="outline" style="width:100%">
                      <mat-label>세션 선택</mat-label>
                      <mat-select [(ngModel)]="pickerSessionId"
                                  [disabled]="pickerSessions().length === 0">
                        @if (pickerSessions().length === 0) {
                          <mat-option disabled>프로젝트를 먼저 선택하세요</mat-option>
                        }
                        @for (s of pickerSessions(); track s._id) {
                          <mat-option [value]="s._id">
                            {{ s.buildingId }} · {{ s.status }}
                            <span class="session-date">{{ s.startedAt | date:'MM.dd' }}</span>
                          </mat-option>
                        }
                      </mat-select>
                    </mat-form-field>

                    <div class="picker-actions">
                      <button mat-stroked-button (click)="showSessionPicker.set(false)">취소</button>
                      <button mat-raised-button color="primary"
                              [disabled]="!pickerSessionId || linkingSession()"
                              (click)="linkSession()">
                        @if (linkingSession()) { <mat-spinner diameter="14" style="display:inline-block" /> }
                        연결
                      </button>
                    </div>
                  </div>
                }

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
                    <p style="color: #c2410c; margin-bottom: 12px">
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
                <div class="card-header-actions">
                  <input #markerFileInput type="file" accept=".json" style="display:none"
                         (change)="importMarkersFromFile($event)">
                  <button mat-stroked-button (click)="markerFileInput.click()"
                          matTooltip="JSON 파일로 마커 일괄 등록">
                    <mat-icon>upload_file</mat-icon> 파일 첨부
                  </button>
                  <button mat-stroked-button color="primary"
                          (click)="showMarkerForm.set(!showMarkerForm())">
                    <mat-icon>{{ showMarkerForm() ? 'close' : 'add_location' }}</mat-icon>
                    {{ showMarkerForm() ? '닫기' : '마커 추가' }}
                  </button>
                </div>
              </mat-card-header>
              <mat-card-content>

                <!-- Inline marker entry form -->
                @if (showMarkerForm()) {
                  <div class="marker-form">
                    <div class="marker-form-row">
                      <mat-form-field appearance="outline" class="mf-field">
                        <mat-label>X</mat-label>
                        <input matInput type="number" [(ngModel)]="markerX" step="0.001">
                      </mat-form-field>
                      <mat-form-field appearance="outline" class="mf-field">
                        <mat-label>Y</mat-label>
                        <input matInput type="number" [(ngModel)]="markerY" step="0.001">
                      </mat-form-field>
                      <mat-form-field appearance="outline" class="mf-field">
                        <mat-label>Z</mat-label>
                        <input matInput type="number" [(ngModel)]="markerZ" step="0.001">
                      </mat-form-field>
                    </div>
                    <div class="marker-form-row">
                      <mat-form-field appearance="outline" style="flex:2">
                        <mat-label>레이블</mat-label>
                        <input matInput [(ngModel)]="markerLabel" placeholder="마커 설명">
                      </mat-form-field>
                      <mat-form-field appearance="outline" style="flex:1">
                        <mat-label>색상</mat-label>
                        <input matInput [(ngModel)]="markerColor" placeholder="#FF6B6B">
                        <span matPrefix style="width:18px;height:18px;border-radius:50%;display:inline-block;margin-right:6px;flex-shrink:0"
                              [style.background]="markerColor"></span>
                      </mat-form-field>
                      <mat-form-field appearance="outline" style="flex:2">
                        <mat-label>메쉬명 (선택)</mat-label>
                        <input matInput [(ngModel)]="markerMeshName" placeholder="예) Wall_3F">
                      </mat-form-field>
                    </div>
                    <div class="marker-form-actions">
                      <button mat-raised-button color="primary"
                              [disabled]="markerX === null || markerY === null || markerZ === null || savingMarker()"
                              (click)="addMarker()">
                        @if (savingMarker()) { <mat-spinner diameter="14" style="display:inline-block;margin-right:4px" /> }
                        마커 등록
                      </button>
                    </div>
                  </div>
                }

                <!-- Marker list -->
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
                      <button mat-icon-button color="warn"
                              matTooltip="마커 삭제"
                              (click)="deleteMarker(marker._id)">
                        <mat-icon>delete_outline</mat-icon>
                      </button>
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

    /* Info rows */
    .info-row {
      display: flex; gap: 12px; padding: 8px 0;
      border-bottom: 1px solid var(--ax-color-border-default);
    }
    .info-row:last-child { border-bottom: none; }
    .info-label {
      color: var(--ax-color-text-tertiary);
      font-size: var(--ax-font-size-sm);
      min-width: 90px;
      flex-shrink: 0;
      padding-top: 2px;
    }
    .info-value { font-size: var(--ax-font-size-md); flex: 1; }
    .id-text { font-family: monospace; font-size: 11px; color: #888; word-break: break-all; }

    /* Session row */
    .info-row--session .info-value { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .badge-direct {
      display: inline-block;
      padding: 2px 8px;
      background: var(--ax-color-neutral-subtle);
      color: var(--ax-color-neutral-text);
      border-radius: var(--ax-radius-full);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.03em;
    }
    .link-btn {
      height: 28px;
      font-size: 12px;
      padding: 0 10px;
      line-height: 26px;
      mat-icon { font-size: 14px; width: 14px; height: 14px; margin-right: 2px; }
    }

    /* Session picker */
    .session-picker {
      background: var(--ax-color-bg-surface-alt);
      border: 1px solid var(--ax-color-border-default);
      border-radius: var(--ax-radius-lg);
      padding: 12px;
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .session-date { font-size: 11px; color: #999; margin-left: 6px; }
    .picker-actions { display: flex; gap: 8px; justify-content: flex-end; }

    /* Measurements */
    .measure-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 8px 0;
    }
    .measure-item { text-align: center; }
    .measure-val { font-size: 24px; font-weight: 700; color: #333; }
    .measure-unit { font-size: 12px; color: #888; margin-top: 4px; }

    /* Repair */
    .repair-done { display: flex; gap: 12px; align-items: flex-start; }
    .repair-done mat-icon { font-size: 32px; width: 32px; height: 32px; margin-top: 4px; }
    .repair-notes { color: #555; font-size: 13px; margin-top: 4px; }

    /* Photos */
    .photo-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
    }
    .photo-item {
      position: relative; aspect-ratio: 1; overflow: hidden; border-radius: 8px; cursor: pointer;
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

    /* Card header actions */
    .card-header-actions {
      display: flex; gap: 8px; align-items: center; margin-left: auto;
    }
    mat-card-header { align-items: center; }

    /* Marker form */
    .marker-form {
      background: var(--ax-color-bg-surface-alt);
      border: 1px solid var(--ax-color-border-default);
      border-radius: var(--ax-radius-lg);
      padding: 12px;
      margin-bottom: 12px;
    }
    .marker-form-row {
      display: flex; gap: 8px;
    }
    .mf-field { flex: 1; }
    .marker-form-actions { display: flex; justify-content: flex-end; margin-top: 4px; }

    /* Marker list */
    .marker-item {
      display: flex; gap: 12px; align-items: flex-start;
      padding: 8px 0; border-bottom: 1px solid var(--ax-color-border-default);
    }
    .marker-item:last-child { border-bottom: none; }
    .marker-color { width: 16px; height: 16px; border-radius: 50%; margin-top: 4px; flex-shrink: 0; }
    .marker-info { flex: 1; }
    .marker-label { font-weight: 500; font-size: 13px; }
    .marker-coords { font-family: monospace; font-size: 11px; color: #666; margin-top: 2px; }
    .marker-mesh { font-size: 11px; color: #999; }
  `],
})
export class DefectDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly defectsService = inject(DefectsService);
  private readonly snackBar = inject(MatSnackBar);

  readonly defect = signal<Defect | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadingPhotos = signal(false);
  readonly photoUrls = signal<string[]>([]);
  readonly markers = signal<DefectMarker3D[]>([]);

  // User display names
  private readonly userMap = signal<Map<string, string>>(new Map());

  // Session picker
  readonly showSessionPicker = signal(false);
  readonly pickerProjects = signal<any[]>([]);
  readonly pickerSessions = signal<any[]>([]);
  pickerProjectId = '';
  pickerSessionId = '';
  readonly linkingSession = signal(false);

  // 3D marker form
  readonly showMarkerForm = signal(false);
  readonly savingMarker = signal(false);
  markerLabel = '';
  markerColor = '#FF6B6B';
  markerX: number | null = null;
  markerY: number | null = null;
  markerZ: number | null = null;
  markerMeshName = '';

  repairNotes = '';

  photoLoadingPlaceholders() {
    const remaining = (this.defect()?.mediaIds?.length ?? 0) - this.photoUrls().length;
    return Array.from({ length: Math.max(0, remaining) }, (_, i) => i);
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('defectId')!;
    this.loadDefect(id);
    this.loadUsers();
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

  private loadUsers() {
    this.http.get<any>(`${environment.apiUrl}/users`).subscribe({
      next: (res) => {
        const list: any[] = res.data ?? res;
        this.userMap.set(new Map(list.map((u: any) => [u._id, u.name])));
      },
      error: () => {},
    });
  }

  formatUser(userId: string): string {
    if (!userId) return '—';
    const name = this.userMap().get(userId);
    if (name) return name;
    // Fallback: extract human-readable part from "user:org:userId" pattern
    const parts = userId.split(':');
    return parts.length >= 3 ? parts[parts.length - 1] : userId;
  }

  private loadPhotos(defect: Defect) {
    if (!defect.mediaIds?.length) return;
    this.loadingPhotos.set(true);
    const urls: string[] = [];
    let pending = defect.mediaIds.length;
    defect.mediaIds.forEach((mediaId) => {
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

  // ── Session linking ──────────────────────────────────────────

  openSessionPicker() {
    this.showSessionPicker.set(true);
    this.pickerProjectId = '';
    this.pickerSessionId = '';
    this.pickerSessions.set([]);
    this.http.get<any>(`${environment.apiUrl}/projects?limit=100`).subscribe({
      next: (res) => this.pickerProjects.set(res.data ?? []),
      error: () => {},
    });
  }

  onPickerProjectChange(projectId: string) {
    this.pickerSessionId = '';
    this.pickerSessions.set([]);
    if (!projectId) return;
    this.http.get<any>(`${environment.apiUrl}/projects/${encodeURIComponent(projectId)}/sessions`).subscribe({
      next: (res) => this.pickerSessions.set(res.data ?? []),
      error: () => {},
    });
  }

  linkSession() {
    const sessionId = this.pickerSessionId;
    const defect = this.defect();
    if (!sessionId || !defect) return;
    this.linkingSession.set(true);
    this.defectsService.update(defect._id, { sessionId } as any).subscribe({
      next: (updated) => {
        this.defect.set(updated);
        this.showSessionPicker.set(false);
        this.linkingSession.set(false);
        this.snackBar.open('세션이 연결되었습니다.', '닫기', { duration: 2000 });
      },
      error: () => {
        this.linkingSession.set(false);
        this.snackBar.open('세션 연결 중 오류가 발생했습니다.', '닫기', { duration: 3000 });
      },
    });
  }

  // ── 3D Marker management ─────────────────────────────────────

  addMarker() {
    const d = this.defect();
    if (!d || this.markerX === null || this.markerY === null || this.markerZ === null) return;
    this.savingMarker.set(true);
    const dto = {
      defectId: d._id,
      complexId: d.complexId ?? '',
      buildingId: d.buildingId ?? '',
      modelUrl: '',
      position: { x: +this.markerX, y: +this.markerY, z: +this.markerZ },
      color: this.markerColor || '#FF6B6B',
      label: this.markerLabel || undefined,
      meshName: this.markerMeshName || undefined,
    };
    this.http.post<any>(`${environment.apiUrl}/markers`, dto).subscribe({
      next: (res) => {
        const marker = res.data ?? res;
        this.markers.update((list) => [...list, marker]);
        this.showMarkerForm.set(false);
        this.markerX = this.markerY = this.markerZ = null;
        this.markerLabel = '';
        this.markerMeshName = '';
        this.markerColor = '#FF6B6B';
        this.savingMarker.set(false);
        this.snackBar.open('3D 마커가 등록되었습니다.', '닫기', { duration: 2000 });
      },
      error: () => {
        this.savingMarker.set(false);
        this.snackBar.open('마커 등록 중 오류가 발생했습니다.', '닫기', { duration: 3000 });
      },
    });
  }

  importMarkersFromFile(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
      const d = this.defect();
      if (!d) return;
      try {
        const parsed = JSON.parse(e.target!.result as string);
        const list: any[] = Array.isArray(parsed) ? parsed : [parsed];
        let successCount = 0;
        for (const m of list) {
          if (!m.position?.x === undefined) continue;
          const dto = {
            defectId: d._id,
            complexId: (d as any).complexId ?? '',
            buildingId: (d as any).buildingId ?? '',
            modelUrl: m.modelUrl ?? '',
            position: m.position,
            color: m.color ?? '#FF6B6B',
            label: m.label ?? undefined,
            meshName: m.meshName ?? undefined,
          };
          try {
            const res = await lastValueFrom(this.http.post<any>(`${environment.apiUrl}/markers`, dto));
            this.markers.update((prev) => [...prev, res.data ?? res]);
            successCount++;
          } catch {}
        }
        this.snackBar.open(`${successCount}개 마커가 등록되었습니다.`, '닫기', { duration: 2500 });
      } catch {
        this.snackBar.open('JSON 파일 파싱 오류입니다.', '닫기', { duration: 3000 });
      }
      input.value = '';
    };
    reader.readAsText(file);
  }

  deleteMarker(markerId: string) {
    this.http.delete<any>(`${environment.apiUrl}/markers/${encodeURIComponent(markerId)}`).subscribe({
      next: () => {
        this.markers.update((list) => list.filter((m) => m._id !== markerId));
        this.snackBar.open('마커가 삭제되었습니다.', '닫기', { duration: 2000 });
      },
      error: () => this.snackBar.open('마커 삭제 중 오류가 발생했습니다.', '닫기', { duration: 3000 }),
    });
  }

  severityLabel(s: string) { return SEVERITY_LABELS[s] ?? s; }
  severityColor(s: string) { return SEVERITY_COLORS[s] ?? '#999'; }
  defectTypeLabel(t: string) { return DEFECT_TYPE_LABELS[t] ?? t; }
}
