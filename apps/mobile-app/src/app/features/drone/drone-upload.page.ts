// apps/mobile-app/src/app/features/drone/drone-upload.page.ts
// 드론 미디어 현장 업로드 페이지 (Ionic)
// 카메라 촬영 또는 갤러리에서 선택 → S3 pre-signed PUT → complete 콜백
import {
  Component, OnInit, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpEventType } from '@angular/common/http';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonFooter,
  IonButton, IonButtons, IonIcon, IonItem, IonLabel,
  IonList, IonProgressBar, IonBadge, IonChip,
  IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonSelect, IonSelectOption, IonInput, IonTextarea,
  IonBackButton, IonSpinner, IonNote,
  ToastController, AlertController, LoadingController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cloudUpload, videocam, image, checkmarkCircle,
  closeCircle, sync, trash, addCircle, close,
} from 'ionicons/icons';
import { environment } from '../../../environments/environment';

interface UploadFile {
  file: File;
  mediaType: 'VIDEO' | 'IMAGE';
  name: string;
  sizeMb: string;
  status: 'PENDING' | 'UPLOADING' | 'DONE' | 'FAILED';
  progress: number;
  error?: string;
  mediaItemId?: string;
}

@Component({
  selector: 'ax-drone-upload-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonFooter,
    IonButton, IonButtons, IonIcon, IonItem, IonLabel,
    IonList, IonProgressBar, IonBadge, IonChip,
    IonCard, IonCardContent, IonCardHeader, IonCardTitle,
    IonSelect, IonSelectOption, IonInput, IonTextarea,
    IonBackButton, IonSpinner, IonNote,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/inspection"></ion-back-button>
        </ion-buttons>
        <ion-title>드론 미디어 업로드</ion-title>
        @if (uploading()) {
          <ion-buttons slot="end">
            <ion-spinner name="crescent" style="color:#fff"></ion-spinner>
          </ion-buttons>
        }
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">

      <!-- 미션 선택 or 새 미션 -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>미션 정보</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          @if (!missionId()) {
            <!-- 빠른 미션 생성 폼 -->
            <ion-item>
              <ion-label position="stacked">단지 ID *</ion-label>
              <ion-input [(ngModel)]="quickForm.complexId" placeholder="complex:org:xxx" clearInput></ion-input>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">미션 제목 *</ion-label>
              <ion-input [(ngModel)]="quickForm.title" placeholder="예) 101동 외벽 드론 점검" clearInput></ion-input>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">조종사 *</ion-label>
              <ion-input [(ngModel)]="quickForm.pilot" placeholder="이름" clearInput></ion-input>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">드론 기종</ion-label>
              <ion-select [(ngModel)]="quickForm.droneModel" placeholder="선택 안 함">
                <ion-select-option value="">선택 안 함</ion-select-option>
                <ion-select-option value="DJI Mavic 3 Enterprise">DJI Mavic 3 Enterprise</ion-select-option>
                <ion-select-option value="DJI Matrice 300 RTK">DJI Matrice 300 RTK</ion-select-option>
                <ion-select-option value="DJI Matrice 350 RTK">DJI Matrice 350 RTK</ion-select-option>
                <ion-select-option value="DJI Mini 4 Pro">DJI Mini 4 Pro</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-button expand="block" fill="outline" style="margin-top:12px"
              [disabled]="!canCreateMission() || creatingMission()"
              (click)="createMission()">
              <ion-icon slot="start" name="addCircle"></ion-icon>
              미션 생성
            </ion-button>
          } @else {
            <div class="mission-info">
              <ion-icon name="checkmarkCircle" color="success"></ion-icon>
              <span>미션 생성됨: <strong>{{ missionId() }}</strong></span>
              <ion-button fill="clear" size="small" (click)="missionId.set('')">변경</ion-button>
            </div>
          }
        </ion-card-content>
      </ion-card>

      <!-- 파일 선택 -->
      @if (missionId()) {
        <ion-card>
          <ion-card-header>
            <ion-card-title>미디어 선택</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="upload-buttons">
              <ion-button expand="block" fill="outline" (click)="pickVideo.click()">
                <ion-icon slot="start" name="videocam"></ion-icon>
                영상 선택
              </ion-button>
              <ion-button expand="block" fill="outline" (click)="pickImage.click()">
                <ion-icon slot="start" name="image"></ion-icon>
                이미지 선택
              </ion-button>
            </div>

            <!-- 숨겨진 파일 입력 -->
            <input #pickVideo type="file" hidden multiple
              accept="video/mp4,video/quicktime,video/x-msvideo"
              capture="environment"
              (change)="onFileSelect($event, 'VIDEO')" />
            <input #pickImage type="file" hidden multiple
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              (change)="onFileSelect($event, 'IMAGE')" />
          </ion-card-content>
        </ion-card>

        <!-- 파일 목록 -->
        @if (files().length > 0) {
          <ion-card>
            <ion-card-header>
              <ion-card-title>업로드 목록 ({{ files().length }}개)</ion-card-title>
            </ion-card-header>
            <ion-card-content style="padding:0">
              <ion-list lines="full">
                @for (f of files(); track f.name) {
                  <ion-item>
                    <ion-icon slot="start"
                      [name]="f.mediaType === 'VIDEO' ? 'videocam' : 'image'"
                      [color]="f.mediaType === 'VIDEO' ? 'tertiary' : 'secondary'">
                    </ion-icon>
                    <ion-label>
                      <h3 style="font-size:13px;white-space:normal;word-break:break-all">{{ f.name }}</h3>
                      <p>{{ f.mediaType === 'VIDEO' ? '영상' : '이미지' }} · {{ f.sizeMb }} MB</p>
                      @if (f.status === 'UPLOADING') {
                        <ion-progress-bar [value]="f.progress / 100" style="margin-top:4px"></ion-progress-bar>
                        <p style="font-size:11px;color:#666">{{ f.progress }}%</p>
                      }
                      @if (f.error) {
                        <p style="color:#c62828;font-size:11px">{{ f.error }}</p>
                      }
                    </ion-label>
                    <ion-badge slot="end" [color]="statusColor(f.status)">
                      {{ statusLabel(f.status) }}
                    </ion-badge>
                    @if (f.status === 'PENDING') {
                      <ion-button slot="end" fill="clear" color="danger" size="small"
                        (click)="removeFile(f)">
                        <ion-icon name="trash"></ion-icon>
                      </ion-button>
                    }
                  </ion-item>
                }
              </ion-list>
            </ion-card-content>
          </ion-card>

          <!-- 전체 진행률 -->
          @if (uploading()) {
            <ion-card>
              <ion-card-content>
                <p style="font-size:13px;margin-bottom:6px">
                  전체 진행: {{ doneCount() }}/{{ files().length }}
                </p>
                <ion-progress-bar [value]="overallProgress() / 100" color="primary"></ion-progress-bar>
              </ion-card-content>
            </ion-card>
          }
        }
      }
    </ion-content>

    @if (missionId() && files().length > 0) {
      <ion-footer>
        <ion-toolbar>
          <ion-button
            expand="block" class="ion-margin"
            [disabled]="pendingCount() === 0 || uploading()"
            (click)="startUpload()">
            <ion-icon slot="start" name="cloudUpload"></ion-icon>
            업로드 시작 ({{ pendingCount() }}개)
          </ion-button>
        </ion-toolbar>
      </ion-footer>
    }
  `,
  styles: [`
    .mission-info {
      display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
      font-size: 13px; padding: 4px 0;
    }
    .upload-buttons { display: flex; flex-direction: column; gap: 8px; }
  `],
})
export class DroneUploadPage implements OnInit {
  private readonly http   = inject(HttpClient);
  private readonly toast  = inject(ToastController);
  private readonly alert  = inject(AlertController);
  private readonly loading = inject(LoadingController);

  private readonly base = `${environment.apiUrl}/drone-missions`;

  readonly missionId      = signal('');
  readonly files          = signal<UploadFile[]>([]);
  readonly uploading      = signal(false);
  readonly creatingMission = signal(false);

  quickForm = {
    title: '',
    complexId: '',
    pilot: '',
    droneModel: '',
    flightDate: new Date().toISOString().slice(0, 10),
  };

  readonly pendingCount = () => this.files().filter(f => f.status === 'PENDING').length;
  readonly doneCount    = () => this.files().filter(f => f.status === 'DONE').length;
  readonly overallProgress = () =>
    this.files().length === 0 ? 0 :
    Math.round(this.files().reduce((s, f) => s + f.progress, 0) / this.files().length);

  canCreateMission = () =>
    !!(this.quickForm.title.trim() && this.quickForm.complexId.trim() && this.quickForm.pilot.trim());

  ngOnInit() {
    addIcons({ cloudUpload, videocam, image, checkmarkCircle, closeCircle, sync, trash, addCircle, close });
  }

  createMission() {
    if (!this.canCreateMission()) return;
    this.creatingMission.set(true);
    this.http.post<any>(this.base, {
      title:      this.quickForm.title.trim(),
      complexId:  this.quickForm.complexId.trim(),
      pilot:      this.quickForm.pilot.trim(),
      flightDate: this.quickForm.flightDate,
      droneModel: this.quickForm.droneModel || undefined,
    }).subscribe({
      next: (res) => {
        this.missionId.set(res._id);
        this.creatingMission.set(false);
        this.showToast('미션이 생성되었습니다.', 'success');
      },
      error: (e) => {
        this.creatingMission.set(false);
        this.showToast(`미션 생성 실패: ${e.error?.message ?? e.message}`, 'danger');
      },
    });
  }

  onFileSelect(event: Event, mediaType: 'VIDEO' | 'IMAGE') {
    const input = event.target as HTMLInputElement;
    const added = Array.from(input.files ?? []).map(file => ({
      file,
      mediaType,
      name: file.name,
      sizeMb: (file.size / (1024 * 1024)).toFixed(1),
      status: 'PENDING' as const,
      progress: 0,
    }));
    this.files.update(prev => [...prev, ...added]);
    input.value = '';
  }

  removeFile(item: UploadFile) {
    this.files.update(prev => prev.filter(f => f !== item));
  }

  async startUpload() {
    this.uploading.set(true);
    const pending = this.files().filter(f => f.status === 'PENDING');

    for (const item of pending) {
      await this.uploadOne(item);
    }

    this.uploading.set(false);

    const failed = this.files().filter(f => f.status === 'FAILED').length;
    const done   = this.files().filter(f => f.status === 'DONE').length;

    if (failed === 0) {
      await this.showToast(`${done}개 파일 업로드 완료.`, 'success');
    } else {
      await this.showToast(`완료: ${done}개, 실패: ${failed}개`, 'warning');
    }
  }

  private async uploadOne(item: UploadFile): Promise<void> {
    this.patchFile(item, { status: 'UPLOADING', progress: 0 });

    return new Promise<void>((resolve) => {
      // 단계 1: init → pre-signed URL
      this.http.post<any>(
        `${this.base}/${encodeURIComponent(this.missionId())}/media/upload/init`,
        {
          fileName:  item.file.name,
          mimeType:  item.file.type,
          fileSize:  item.file.size,
          mediaType: item.mediaType,
        },
      ).subscribe({
        next: (initRes) => {
          const { uploadUrl, mediaItemId } = initRes;
          this.patchFile(item, { mediaItemId, progress: 10 });

          // 단계 2: S3 PUT
          this.http.put(uploadUrl, item.file, {
            headers: { 'Content-Type': item.file.type },
            reportProgress: true,
            observe: 'events',
          }).subscribe({
            next: (event) => {
              if (event.type === HttpEventType.UploadProgress && event.total) {
                const pct = 10 + Math.round((event.loaded / event.total) * 80);
                this.patchFile(item, { progress: pct });
              } else if (event.type === HttpEventType.Response) {
                // 단계 3: complete
                this.http.patch<any>(
                  `${this.base}/${encodeURIComponent(this.missionId())}/media/${encodeURIComponent(mediaItemId)}/complete`,
                  {},
                ).subscribe({
                  next: () => {
                    this.patchFile(item, { status: 'DONE', progress: 100 });
                    resolve();
                  },
                  error: (e) => {
                    this.patchFile(item, { status: 'FAILED', error: `완료 처리 실패: ${e.message}` });
                    resolve();
                  },
                });
              }
            },
            error: (e) => {
              this.patchFile(item, { status: 'FAILED', error: `S3 업로드 실패: ${e.message}` });
              resolve();
            },
          });
        },
        error: (e) => {
          this.patchFile(item, { status: 'FAILED', error: `초기화 실패: ${e.error?.message ?? e.message}` });
          resolve();
        },
      });
    });
  }

  private patchFile(target: UploadFile, patch: Partial<UploadFile>) {
    this.files.update(prev =>
      prev.map(f => f === target ? { ...f, ...patch } : f),
    );
  }

  statusLabel(s: string): string {
    switch (s) {
      case 'PENDING':   return '대기';
      case 'UPLOADING': return '업로드 중';
      case 'DONE':      return '완료';
      case 'FAILED':    return '실패';
      default:          return s;
    }
  }

  statusColor(s: string): string {
    switch (s) {
      case 'DONE':      return 'success';
      case 'FAILED':    return 'danger';
      case 'UPLOADING': return 'primary';
      default:          return 'medium';
    }
  }

  private async showToast(message: string, color: string) {
    const t = await this.toast.create({ message, duration: 3000, color, position: 'bottom' });
    await t.present();
  }
}
