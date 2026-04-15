// apps/mobile-app/src/app/features/inspection/defect-form/defect-form.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { v4 as uuid } from 'uuid';
import { PouchService } from '../../../core/sync/pouch.service';
import { SyncQueueService } from '../../../core/offline/sync-queue.service';
import { MediaUploadService } from '../../../core/media/media-upload.service';
import { AuthStore } from '../../../core/store/auth.store';
import { Defect, DefectMedia, DefectType, SeverityLevel, MediaType } from '@ax/shared';
import { LocalDefectMedia } from '../../../core/offline/local-doc-types';

interface PhotoCapture {
  id: string;
  dataUrl: string;
  blob: Blob;
  fileName: string;
}

@Component({
  selector: 'ax-defect-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/" />
        </ion-buttons>
        <ion-title>결함 등록</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="save()" [disabled]="!form.valid || saving()">
            @if (saving()) { <ion-spinner name="dots" /> }
            @else { 저장 }
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <form [formGroup]="form">
        <!-- Location context (read-only from scan) -->
        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>점검 위치</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <ion-item lines="none">
              <ion-icon name="location-outline" slot="start" color="primary" />
              <ion-label>
                <h3>{{ locationContext().complexName }}</h3>
                <p>{{ locationContext().buildingName }} / {{ locationContext().zoneName }}</p>
              </ion-label>
            </ion-item>
          </ion-card-content>
        </ion-card>

        <!-- Defect type & severity -->
        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>결함 분류</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <!-- Defect type grid -->
            <div class="type-grid">
              @for (type of defectTypes; track type.value) {
                <div class="type-btn"
                  [class.selected]="form.get('defectType')!.value === type.value"
                  (click)="form.get('defectType')!.setValue(type.value)">
                  <span class="type-icon">{{ type.icon }}</span>
                  <span class="type-label">{{ type.label }}</span>
                </div>
              }
            </div>
            @if (form.get('defectType')!.invalid && form.get('defectType')!.touched) {
              <ion-note color="danger">결함 유형을 선택하세요</ion-note>
            }

            <!-- Severity -->
            <ion-item>
              <ion-label>심각도</ion-label>
              <ion-select formControlName="severity" interface="action-sheet">
                @for (s of severities; track s.value) {
                  <ion-select-option [value]="s.value">{{ s.label }}</ion-select-option>
                }
              </ion-select>
            </ion-item>
          </ion-card-content>
        </ion-card>

        <!-- Measurements -->
        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>수치 측정 (선택)</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <div class="measure-grid">
              <ion-item>
                <ion-label position="floating">폭 (mm)</ion-label>
                <ion-input type="number" formControlName="widthMm" min="0" step="0.1" />
              </ion-item>
              <ion-item>
                <ion-label position="floating">길이 (mm)</ion-label>
                <ion-input type="number" formControlName="lengthMm" min="0" step="1" />
              </ion-item>
              <ion-item>
                <ion-label position="floating">깊이 (mm)</ion-label>
                <ion-input type="number" formControlName="depthMm" min="0" step="0.1" />
              </ion-item>
              <ion-item>
                <ion-label position="floating">면적 (m²)</ion-label>
                <ion-input type="number" formControlName="areaSqm" min="0" step="0.01" />
              </ion-item>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Description -->
        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>결함 설명</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <ion-item>
              <ion-label position="floating">위치 설명 *</ion-label>
              <ion-input formControlName="locationDescription" />
            </ion-item>
            <ion-item>
              <ion-label position="floating">상세 설명</ion-label>
              <ion-textarea formControlName="description" rows="3" auto-grow="true" />
            </ion-item>
          </ion-card-content>
        </ion-card>

        <!-- Photo capture -->
        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>사진 첨부</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <div class="photo-grid">
              @for (photo of photos(); track photo.id) {
                <div class="photo-item">
                  <img [src]="photo.dataUrl" />
                  <button class="photo-delete" (click)="removePhoto(photo.id)">
                    <ion-icon name="close-circle" color="danger" />
                  </button>
                </div>
              }

              @if (photos().length < 10) {
                <div class="photo-add-btn" (click)="addPhoto()">
                  <ion-icon name="camera-outline" size="large" />
                  <span>사진 추가</span>
                </div>
              }
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Offline indicator -->
        @if (!isOnline()) {
          <ion-card color="warning">
            <ion-card-content>
              <ion-icon name="cloud-offline-outline" />
              오프라인 모드 — 저장 후 온라인 복귀 시 자동 동기화됩니다.
            </ion-card-content>
          </ion-card>
        }
      </form>
    </ion-content>
  `,
  styles: [`
    .type-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px;
    }
    .type-btn {
      display: flex; flex-direction: column; align-items: center;
      padding: 12px 8px; border: 2px solid #e0e0e0; border-radius: 8px;
      cursor: pointer; transition: all 0.2s;
    }
    .type-btn.selected { border-color: var(--ion-color-primary); background: rgba(var(--ion-color-primary-rgb), 0.1); }
    .type-icon { font-size: 24px; }
    .type-label { font-size: 11px; margin-top: 4px; text-align: center; }
    .measure-grid { display: grid; grid-template-columns: 1fr 1fr; }
    .photo-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
    }
    .photo-item { position: relative; aspect-ratio: 1; }
    .photo-item img { width: 100%; height: 100%; object-fit: cover; border-radius: 8px; }
    .photo-delete { position: absolute; top: -8px; right: -8px; background: none; border: none; }
    .photo-add-btn {
      aspect-ratio: 1; border: 2px dashed #ccc; border-radius: 8px;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      cursor: pointer; color: #888; gap: 4px; font-size: 12px;
    }
  `],
})
export class DefectFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pouch = inject(PouchService);
  private readonly syncQueue = inject(SyncQueueService);
  private readonly mediaUpload = inject(MediaUploadService);
  private readonly authStore = inject(AuthStore);

  readonly saving = signal(false);
  readonly photos = signal<PhotoCapture[]>([]);
  readonly isOnline = signal(navigator.onLine);
  readonly locationContext = signal({
    complexName: '',
    buildingName: '',
    zoneName: '',
  });

  // Form params from route
  private sessionId = '';
  private projectId = '';
  private complexId = '';
  private buildingId = '';
  private floorId = '';
  private zoneId = '';

  readonly defectTypes = [
    { value: DefectType.CRACK, label: '균열', icon: '⚡' },
    { value: DefectType.LEAK, label: '누수', icon: '💧' },
    { value: DefectType.SPALLING, label: '박리/박락', icon: '🪨' },
    { value: DefectType.CORROSION, label: '부식', icon: '🔴' },
    { value: DefectType.EFFLORESCENCE, label: '백태', icon: '⬜' },
    { value: DefectType.DEFORMATION, label: '변형', icon: '⚠️' },
  ];

  readonly severities = [
    { value: SeverityLevel.LOW, label: '낮음 (경미)' },
    { value: SeverityLevel.MEDIUM, label: '보통 (유지관리)' },
    { value: SeverityLevel.HIGH, label: '높음 (조속 조치)' },
    { value: SeverityLevel.CRITICAL, label: '긴급 (즉시 조치)' },
  ];

  readonly form = this.fb.group({
    defectType: [null as DefectType | null, Validators.required],
    severity: [SeverityLevel.MEDIUM, Validators.required],
    locationDescription: ['', [Validators.required, Validators.maxLength(500)]],
    description: ['', Validators.maxLength(1000)],
    widthMm: [null as number | null],
    lengthMm: [null as number | null],
    depthMm: [null as number | null],
    areaSqm: [null as number | null],
  });

  ngOnInit() {
    const params = this.route.snapshot.queryParams;
    this.sessionId = params['sessionId'] ?? '';
    this.projectId = params['projectId'] ?? '';
    this.complexId = params['complexId'] ?? '';
    this.buildingId = params['buildingId'] ?? '';
    this.floorId = params['floorId'] ?? '';
    this.zoneId = params['zoneId'] ?? '';

    this.locationContext.set({
      complexName: params['complexName'] ?? '',
      buildingName: params['buildingName'] ?? '',
      zoneName: params['zoneName'] ?? '',
    });

    window.addEventListener('online', () => this.isOnline.set(true));
    window.addEventListener('offline', () => this.isOnline.set(false));
  }

  async addPhoto() {
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt,
        quality: 80,
        saveToGallery: false,
      });

      if (photo.dataUrl) {
        const blob = await (await fetch(photo.dataUrl)).blob();
        const id = uuid();
        this.photos.update((p) => [...p, {
          id,
          dataUrl: photo.dataUrl!,
          blob,
          fileName: `defect_${id}.jpg`,
        }]);
      }
    } catch (err) {
      console.debug('Camera cancelled:', err);
    }
  }

  removePhoto(id: string) {
    this.photos.update((p) => p.filter((ph) => ph.id !== id));
  }

  async save() {
    if (!this.form.valid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);

    const user = this.authStore.user()!;
    const userId = user._id ?? user.id ?? '';
    const orgId = user.organizationId ?? '';
    const now = new Date().toISOString();
    const defectId = `defect:${orgId}:def_${Date.now()}_${uuid().slice(0, 8)}`;
    const mediaIds: string[] = [];

    try {
      for (const photo of this.photos()) {
        const mediaId = `defectMedia:${orgId}:img_${Date.now()}_${uuid().slice(0, 8)}`;

        if (this.isOnline()) {
          // ── Online path: upload directly to S3 via presigned URL ──
          const result = await this.mediaUpload.uploadPhoto(photo.blob, {
            fileName: photo.fileName,
            defectId,
            complexId: this.complexId,
            capturedAt: now,
          });
          if (result.success) {
            mediaIds.push(result.mediaId);
          }
        } else {
          // ── Offline path: save as PouchDB attachment + enqueue ──
          const mediaDoc: LocalDefectMedia = {
            _id: mediaId,
            docType: 'defectMedia',
            orgId,
            defectId,
            sessionId: this.sessionId,
            complexId: this.complexId,
            mediaType: MediaType.PHOTO,
            fileName: photo.fileName,
            fileSize: photo.blob.size,
            mimeType: photo.blob.type || 'image/jpeg',
            storageKey: '',      // filled by server worker after S3 upload
            capturedAt: now,
            capturedBy: userId,
            createdAt: now,
            updatedAt: now,
            createdBy: userId,
            updatedBy: userId,
            attachmentKey: photo.fileName,
            uploadStatus: 'PENDING',
            syncStatus: 'PENDING',
            localModifiedAt: now,
          };

          const savedMedia = await this.pouch.create(mediaDoc);
          await this.pouch.saveAttachment(mediaId, savedMedia._rev, photo.fileName, photo.blob);

          // Enqueue for upload when online
          await this.syncQueue.enqueue({
            orgId,
            mediaId,
            defectId,
            complexId: this.complexId,
            fileName: photo.fileName,
            mimeType: photo.blob.type || 'image/jpeg',
            fileSize: photo.blob.size,
            attachmentKey: photo.fileName,
            createdAt: now,
          });

          mediaIds.push(mediaId);
        }
      }

      // Save defect to PouchDB (always local-first)
      const v = this.form.value;
      const defect: Defect = {
        _id: defectId,
        docType: 'defect',
        orgId,
        sessionId: this.sessionId,
        projectId: this.projectId,
        complexId: this.complexId,
        buildingId: this.buildingId,
        floorId: this.floorId || undefined,
        zoneId: this.zoneId || undefined,
        defectType: v.defectType!,
        severity: v.severity!,
        description: v.description ?? '',
        locationDescription: v.locationDescription!,
        widthMm: v.widthMm ?? undefined,
        lengthMm: v.lengthMm ?? undefined,
        depthMm: v.depthMm ?? undefined,
        areaSqm: v.areaSqm ?? undefined,
        mediaIds,
        isRepaired: false,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId,
      };

      await this.pouch.create(defect);

      // Increment session defect count
      const session = await this.pouch.get<any>(this.sessionId);
      if (session) {
        await this.pouch.update({
          ...session,
          defectCount: (session.defectCount ?? 0) + 1,
          updatedAt: now,
          updatedBy: userId,
        });
      }

      await this.presentToast(`결함 저장 완료${!this.isOnline() ? ' (오프라인 — 나중에 동기화)' : ''}`);
      this.router.navigate(['../'], { relativeTo: this.route });
    } catch (err) {
      console.error('Save error:', err);
      await this.presentToast('저장 중 오류가 발생했습니다.', 'danger');
    } finally {
      this.saving.set(false);
    }
  }

  private async presentToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    try {
      const { ToastController } = await import('@ionic/angular');
      const ctrl = new ToastController();
      const toast = await ctrl.create({ message, duration: 2500, color, position: 'bottom' });
      await toast.present();
    } catch {
      // Fallback for browser/test environments
      console.info(`[Toast/${color}] ${message}`);
    }
  }
}
