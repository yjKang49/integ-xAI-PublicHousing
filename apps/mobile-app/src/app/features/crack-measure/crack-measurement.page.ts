// apps/mobile-app/src/app/features/crack-measure/crack-measurement.page.ts
// 균열 측정 등록 페이지 — CrackCaptureComponent 결과를 API에 제출
import {
  Component, OnInit, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonButton, IonIcon, IonItem, IonLabel, IonNote,
  IonSpinner, IonBadge, IonToast,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  checkmarkCircleOutline, warningOutline, closeCircleOutline,
  cloudUploadOutline, informationCircleOutline,
} from 'ionicons/icons';
import {
  CrackCaptureComponent,
  CrackMeasurementResult,
} from './capture/crack-capture.component';
import { environment } from '../../../../environments/environment';

type SubmitState = 'idle' | 'uploading' | 'submitting' | 'success' | 'error';

@Component({
  selector: 'app-crack-measurement',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonButton, IonIcon, IonItem, IonLabel, IonNote,
    IonSpinner, IonBadge, IonToast,
    CrackCaptureComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/cracks/home" />
        </ion-buttons>
        <ion-title>균열 측정 등록</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Gauge info header -->
      @if (gaugeName()) {
        <ion-card color="light">
          <ion-card-content>
            <ion-item lines="none">
              <ion-icon name="information-circle-outline" slot="start" color="primary" />
              <ion-label>
                <h3>{{ gaugeName() }}</h3>
                <p>ID: {{ gaugePointId() }}</p>
              </ion-label>
              @if (baselineWidthMm() !== null) {
                <ion-badge slot="end" color="medium">
                  기준 {{ baselineWidthMm() }} mm
                </ion-badge>
              }
            </ion-item>
          </ion-card-content>
        </ion-card>
      }

      <!-- Step 1: Capture & measure -->
      @if (submitState() === 'idle') {
        <ax-crack-capture
          [gaugePointId]="gaugePointId()"
          (measurementConfirmed)="onMeasurementConfirmed($event)" />
      }

      <!-- Step 2: Measurement confirmed — review & submit -->
      @if (result() && submitState() === 'idle') {
        <ion-card class="submit-card">
          <ion-card-header>
            <ion-card-title>측정 결과 확인</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="result-summary">
              <div class="result-row">
                <span class="rl">측정 폭</span>
                <span class="rv bold" [class.danger]="exceedsThreshold()">
                  {{ result()!.measuredWidthMm | number:'1.2-2' }} mm
                </span>
              </div>
              <div class="result-row">
                <span class="rl">측정 방식</span>
                <span class="rv">
                  {{ result()!.isManualOverride ? '수동 입력' : '이미지 분석' }}
                </span>
              </div>
              @if (!result()!.isManualOverride) {
                <div class="result-row">
                  <span class="rl">신뢰도</span>
                  <span class="rv" [class.warn]="result()!.autoConfidence < 0.6">
                    {{ (result()!.autoConfidence * 100) | number:'1.0-0' }}%
                  </span>
                </div>
                <div class="result-row">
                  <span class="rl">검출 눈금 수</span>
                  <span class="rv">{{ result()!.graduationCount }}개</span>
                </div>
              }
              @if (deltaFromBaseline() !== null) {
                <div class="result-row">
                  <span class="rl">기준 대비 변화</span>
                  <span class="rv" [class.danger]="(deltaFromBaseline() ?? 0) > 0">
                    {{ (deltaFromBaseline() ?? 0) > 0 ? '+' : '' }}{{ deltaFromBaseline() | number:'1.2-2' }} mm
                  </span>
                </div>
              }
            </div>

            @if (exceedsThreshold()) {
              <ion-note color="danger" class="threshold-note">
                <ion-icon name="warning-outline" />
                임계치({{ thresholdMm() }} mm)를 초과했습니다. 측정 후 경보가 자동 생성됩니다.
              </ion-note>
            }

            <ion-button expand="block" color="success" (click)="submit()" style="margin-top:12px">
              <ion-icon slot="start" name="cloud-upload-outline" />
              서버에 전송
            </ion-button>
            <ion-button expand="block" fill="outline" color="medium" (click)="reset()">
              다시 측정
            </ion-button>
          </ion-card-content>
        </ion-card>
      }

      <!-- Step 3: Uploading / Submitting -->
      @if (submitState() === 'uploading' || submitState() === 'submitting') {
        <ion-card>
          <ion-card-content class="progress-card">
            <ion-spinner name="crescent" />
            <p>{{ submitState() === 'uploading' ? '이미지 업로드 중…' : '측정값 저장 중…' }}</p>
          </ion-card-content>
        </ion-card>
      }

      <!-- Step 4: Success -->
      @if (submitState() === 'success') {
        <ion-card color="success" class="result-card">
          <ion-card-content>
            <ion-icon name="checkmark-circle-outline" class="result-icon" />
            <h2>측정값이 저장되었습니다</h2>
            @if (savedMeasurementId()) {
              <p class="muted">ID: {{ savedMeasurementId() }}</p>
            }
            <ion-button expand="block" fill="outline" color="light" (click)="goToHistory()">
              이력 보기
            </ion-button>
            <ion-button expand="block" fill="outline" color="light" (click)="reset()">
              새 측정 등록
            </ion-button>
          </ion-card-content>
        </ion-card>
      }

      <!-- Step 5: Error -->
      @if (submitState() === 'error') {
        <ion-card color="danger" class="result-card">
          <ion-card-content>
            <ion-icon name="close-circle-outline" class="result-icon" />
            <h2>전송 실패</h2>
            <p>{{ errorMessage() }}</p>
            <ion-button expand="block" fill="outline" color="light" (click)="submit()">
              다시 시도
            </ion-button>
            <ion-button expand="block" fill="outline" color="light" (click)="reset()">
              취소
            </ion-button>
          </ion-card-content>
        </ion-card>
      }
    </ion-content>
  `,
  styles: [`
    .submit-card { margin: 12px; }
    .result-summary { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
    .result-row { display: flex; align-items: center; }
    .rl { flex: 1; font-size: 13px; color: #666; }
    .rv { font-weight: 600; font-size: 15px; }
    .rv.bold { font-size: 22px; }
    .rv.danger { color: var(--ion-color-danger); }
    .rv.warn { color: var(--ion-color-warning-shade); }
    .threshold-note {
      display: flex; align-items: center; gap: 6px;
      padding: 8px; border-radius: 6px; font-size: 13px;
    }
    .progress-card { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 32px; }
    .result-card { margin: 16px; text-align: center; }
    .result-icon { font-size: 56px; display: block; margin: 8px auto; }
    .muted { color: rgba(255,255,255,0.7); font-size: 12px; }
  `],
})
export class CrackMeasurementPage implements OnInit {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http   = inject(HttpClient);

  readonly gaugePointId = signal('');
  readonly gaugeName    = signal('');
  readonly baselineWidthMm = signal<number | null>(null);
  readonly thresholdMm     = signal<number | null>(null);

  readonly result         = signal<CrackMeasurementResult | null>(null);
  readonly submitState    = signal<SubmitState>('idle');
  readonly errorMessage   = signal('');
  readonly savedMeasurementId = signal<string | null>(null);

  constructor() {
    addIcons({
      checkmarkCircleOutline, warningOutline, closeCircleOutline,
      cloudUploadOutline, informationCircleOutline,
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('gaugeId') ?? '';
    this.gaugePointId.set(id);
    if (id) this.loadGaugeInfo(id);
  }

  private loadGaugeInfo(gaugeId: string) {
    this.http.get<any>(`${environment.apiUrl}/cracks/gauge-points/${gaugeId}`)
      .subscribe({
        next: (res) => {
          const gp = res?.data ?? res;
          this.gaugeName.set(gp?.name ?? '');
          this.baselineWidthMm.set(gp?.baselineWidthMm ?? null);
          this.thresholdMm.set(gp?.thresholdMm ?? null);
        },
        error: () => {},
      });
  }

  onMeasurementConfirmed(r: CrackMeasurementResult) {
    this.result.set(r);
  }

  readonly exceedsThreshold = () => {
    const r = this.result();
    const t = this.thresholdMm();
    if (!r || t === null) return false;
    return r.measuredWidthMm >= t;
  };

  readonly deltaFromBaseline = () => {
    const r = this.result();
    const b = this.baselineWidthMm();
    if (!r || b === null) return null;
    return parseFloat((r.measuredWidthMm - b).toFixed(3));
  };

  async submit() {
    const r = this.result();
    if (!r) return;

    const now = new Date().toISOString();

    try {
      // Step 1: Upload ROI image if available
      let capturedImageKey = `crack-measure/placeholder_${Date.now()}.jpg`;
      let roiImageKey: string | undefined;

      if (r.roiImageDataUrl) {
        this.submitState.set('uploading');
        const presignRes = await this.http.get<any>(
          `${environment.apiUrl}/media/presign?prefix=crack-measure&ext=jpg`,
        ).toPromise().catch(() => null);

        if (presignRes?.uploadUrl && presignRes?.key) {
          const blob = await (await fetch(r.roiImageDataUrl)).blob();
          await fetch(presignRes.uploadUrl, {
            method: 'PUT',
            body: blob,
            headers: { 'Content-Type': 'image/jpeg' },
          });
          capturedImageKey = presignRes.key;
          roiImageKey = presignRes.key;
        }
      }

      // Step 2: Submit measurement to API
      this.submitState.set('submitting');
      const payload = {
        gaugePointId:        this.gaugePointId(),
        complexId:           this.route.snapshot.queryParamMap.get('complexId') ?? '',
        measuredAt:          now,
        capturedImageKey,
        roiImageKey,
        measuredWidthMm:     r.measuredWidthMm,
        method:              r.isManualOverride ? 'MANUAL' : 'IMAGE_ASSISTED',
        isManualOverride:    r.isManualOverride,
        manualWidthMm:       r.isManualOverride ? r.manualWidthMm : undefined,
        autoConfidence:      r.isManualOverride ? undefined : r.autoConfidence,
        graduationCount:     r.isManualOverride ? undefined : r.graduationCount,
        scaleMmPerGraduation: r.isManualOverride ? undefined : r.scaleMmPerGraduation,
      };

      const res = await this.http.post<any>(
        `${environment.apiUrl}/cracks/measurements`,
        payload,
      ).toPromise();

      this.savedMeasurementId.set(res?.data?._id ?? res?._id ?? null);
      this.submitState.set('success');
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message ?? err?.message ?? '알 수 없는 오류가 발생했습니다.');
      this.submitState.set('error');
    }
  }

  goToHistory() {
    this.router.navigate(['/cracks', 'history', this.gaugePointId()]);
  }

  reset() {
    this.result.set(null);
    this.submitState.set('idle');
    this.errorMessage.set('');
    this.savedMeasurementId.set(null);
  }
}
