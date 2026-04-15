// apps/mobile-app/src/app/features/crack-measure/components/crack-manual-calibration.component.ts
// 수동 캘리브레이션 입력 컴포넌트 — 눈금 자동 검출 실패 시 점검자가 직접 px/mm 비율 입력
// Phase 2 균열 심층 분석(CrackAnalysisPayload)에서 manualPxPerMm 폴백으로 사용
import {
  Component, Output, EventEmitter, signal, ChangeDetectionStrategy,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import {
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonItem, IonLabel, IonInput, IonButton, IonIcon, IonNote,
  IonRange, IonText,
} from '@ionic/angular/standalone'
import { addIcons } from 'ionicons'
import {
  rulerOutline, checkmarkCircleOutline, informationCircleOutline,
  warningOutline, refreshOutline,
} from 'ionicons/icons'

export interface ManualCalibrationResult {
  /** 눈금 1칸 mm — 게이지에 인쇄된 단위 (예: 0.1mm) */
  mmPerGraduation: number
  /** 수동 측정 px/mm 비율 — 직접 측정 또는 계산한 값 */
  manualPxPerMm: number
  /** 수동 측정한 눈금 간격 (px) — 비율 계산에 사용 */
  measuredSpacingPx?: number
  /** 검증 메모 */
  calibrationNote?: string
}

@Component({
  selector: 'app-crack-manual-calibration',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonItem, IonLabel, IonInput, IonButton, IonIcon, IonNote,
    IonRange, IonText,
  ],
  template: `
    <ion-card class="calibration-card">
      <ion-card-header>
        <ion-card-title>
          <ion-icon name="ruler-outline" color="warning" /> 수동 캘리브레이션
        </ion-card-title>
      </ion-card-header>
      <ion-card-content>

        <ion-note color="warning" class="info-note">
          <ion-icon name="warning-outline" />
          자동 눈금 검출에 실패했습니다. 아래 값을 직접 입력해주세요.
        </ion-note>

        <!-- 눈금 단위 입력 -->
        <ion-item lines="full" class="input-item">
          <ion-label position="stacked">
            눈금 1칸 (mm)
            <ion-text color="medium">
              <small>게이지 눈금 간격. 예) 0.1mm, 0.05mm</small>
            </ion-text>
          </ion-label>
          <ion-input
            type="number"
            [(ngModel)]="mmPerGraduation"
            [min]="0.001"
            [max]="10"
            step="0.001"
            placeholder="0.1"
            inputmode="decimal"
          />
        </ion-item>

        <!-- 측정 방식 선택 -->
        <div class="method-section">
          <div class="method-label">비율 입력 방식</div>
          <div class="method-buttons">
            <ion-button
              [fill]="inputMode() === 'spacing' ? 'solid' : 'outline'"
              size="small"
              (click)="setMode('spacing')"
            >
              눈금 간격 측정
            </ion-button>
            <ion-button
              [fill]="inputMode() === 'ratio' ? 'solid' : 'outline'"
              size="small"
              (click)="setMode('ratio')"
            >
              px/mm 직접 입력
            </ion-button>
          </div>
        </div>

        <!-- 눈금 간격 측정 방식 -->
        @if (inputMode() === 'spacing') {
          <ion-item lines="full" class="input-item">
            <ion-label position="stacked">
              눈금 1칸 간격 (px)
              <ion-text color="medium">
                <small>이미지에서 눈금 2개 사이 픽셀 수를 측정하세요</small>
              </ion-text>
            </ion-label>
            <ion-input
              type="number"
              [(ngModel)]="measuredSpacingPx"
              [min]="1"
              step="1"
              placeholder="예) 12"
              inputmode="decimal"
              (ionInput)="recalculateRatio()"
            />
          </ion-item>
          @if (calculatedPxPerMm() > 0) {
            <ion-note color="primary" class="calc-note">
              <ion-icon name="information-circle-outline" />
              계산된 px/mm: <strong>{{ calculatedPxPerMm() | number:'1.2-2' }}</strong>
              ({{ measuredSpacingPx }}px ÷ {{ mmPerGraduation }}mm)
            </ion-note>
          }
        }

        <!-- px/mm 직접 입력 방식 -->
        @if (inputMode() === 'ratio') {
          <ion-item lines="full" class="input-item">
            <ion-label position="stacked">
              px/mm 비율
              <ion-text color="medium">
                <small>1mm 당 픽셀 수. 일반 스마트폰 근거리 촬영 기준 5~20</small>
              </ion-text>
            </ion-label>
            <ion-input
              type="number"
              [(ngModel)]="directPxPerMm"
              [min]="0.1"
              [max]="100"
              step="0.1"
              placeholder="예) 10"
              inputmode="decimal"
            />
          </ion-item>
        }

        <!-- 슬라이더로 미리보기 (선택) -->
        <div class="preview-section">
          <div class="preview-label">신뢰 구간 추정</div>
          <div class="preview-scale">
            <span>낮음</span>
            <ion-range
              [min]="1" [max]="5" [step]="1"
              [(ngModel)]="confidenceLevel"
              color="warning"
              class="confidence-range"
            />
            <span>높음</span>
          </div>
          <div class="confidence-hint">
            {{ confidenceHint() }}
          </div>
        </div>

        <!-- 메모 -->
        <ion-item lines="full" class="input-item">
          <ion-label position="stacked">보정 메모 (선택)</ion-label>
          <ion-input
            type="text"
            [(ngModel)]="calibrationNote"
            placeholder="예) 캘리브레이션 자 2번 타입 사용"
          />
        </ion-item>

        <!-- 유효성 검사 결과 -->
        @if (validationError()) {
          <ion-note color="danger" class="validation-note">
            {{ validationError() }}
          </ion-note>
        }

        <!-- 액션 버튼 -->
        <div class="action-buttons">
          <ion-button
            expand="block"
            color="warning"
            (click)="confirm()"
            [disabled]="!!validationError()"
          >
            <ion-icon slot="start" name="checkmark-circle-outline" />
            수동 캘리브레이션 적용
          </ion-button>
          <ion-button
            expand="block"
            fill="outline"
            color="medium"
            (click)="reset()"
          >
            <ion-icon slot="start" name="refresh-outline" />
            초기화
          </ion-button>
        </div>

      </ion-card-content>
    </ion-card>
  `,
  styles: [`
    .calibration-card { margin: 8px; }
    .info-note {
      display: flex; align-items: flex-start; gap: 8px;
      padding: 10px; border-radius: 8px; margin-bottom: 16px; font-size: 13px;
    }
    .input-item { margin-bottom: 4px; }
    .method-section { padding: 12px 0 8px; }
    .method-label { font-size: 12px; color: #666; margin-bottom: 8px; }
    .method-buttons { display: flex; gap: 8px; }
    .calc-note {
      display: flex; align-items: center; gap: 6px;
      padding: 8px; border-radius: 6px; font-size: 13px; margin: 8px 0;
    }
    .preview-section { padding: 12px 0; }
    .preview-label { font-size: 12px; color: #666; margin-bottom: 4px; }
    .preview-scale { display: flex; align-items: center; gap: 8px; }
    .confidence-range { flex: 1; }
    .confidence-hint { font-size: 12px; color: #888; padding: 4px 0; font-style: italic; }
    .validation-note {
      display: block; padding: 8px; border-radius: 6px;
      font-size: 13px; margin: 8px 0;
    }
    .action-buttons { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }
  `],
})
export class CrackManualCalibrationComponent {
  @Output() calibrationConfirmed = new EventEmitter<ManualCalibrationResult>()
  @Output() cancelled = new EventEmitter<void>()

  inputMode = signal<'spacing' | 'ratio'>('spacing')

  // 입력 값
  mmPerGraduation = 0.1
  measuredSpacingPx = 0
  directPxPerMm = 0
  calibrationNote = ''
  confidenceLevel = 3

  calculatedPxPerMm = signal(0)

  constructor() {
    addIcons({
      rulerOutline, checkmarkCircleOutline, informationCircleOutline,
      warningOutline, refreshOutline,
    })
  }

  setMode(mode: 'spacing' | 'ratio'): void {
    this.inputMode.set(mode)
  }

  recalculateRatio(): void {
    if (this.measuredSpacingPx > 0 && this.mmPerGraduation > 0) {
      this.calculatedPxPerMm.set(this.measuredSpacingPx / this.mmPerGraduation)
    } else {
      this.calculatedPxPerMm.set(0)
    }
  }

  validationError = () => {
    if (!this.mmPerGraduation || this.mmPerGraduation <= 0) {
      return '눈금 1칸(mm)을 입력해주세요.'
    }
    if (this.inputMode() === 'spacing') {
      if (!this.measuredSpacingPx || this.measuredSpacingPx <= 0) {
        return '눈금 간격(px)을 측정하여 입력해주세요.'
      }
    } else {
      if (!this.directPxPerMm || this.directPxPerMm <= 0) {
        return 'px/mm 비율을 입력해주세요.'
      }
    }
    return null
  }

  confidenceHint = () => {
    const hints: Record<number, string> = {
      1: '매우 불확실 — 재측정을 권장합니다',
      2: '불확실 — 검토자 확인 필요',
      3: '보통 — 일반적인 현장 조건',
      4: '신뢰 가능 — 캘리브레이션 자 사용',
      5: '매우 신뢰 — 정밀 계측 도구 사용',
    }
    return hints[this.confidenceLevel] ?? ''
  }

  confirm(): void {
    if (this.validationError()) return

    const pxPerMm = this.inputMode() === 'spacing'
      ? this.calculatedPxPerMm()
      : this.directPxPerMm

    this.calibrationConfirmed.emit({
      mmPerGraduation: this.mmPerGraduation,
      manualPxPerMm: pxPerMm,
      measuredSpacingPx: this.inputMode() === 'spacing' ? this.measuredSpacingPx : undefined,
      calibrationNote: this.calibrationNote || undefined,
    })
  }

  reset(): void {
    this.mmPerGraduation = 0.1
    this.measuredSpacingPx = 0
    this.directPxPerMm = 0
    this.calibrationNote = ''
    this.confidenceLevel = 3
    this.calculatedPxPerMm.set(0)
  }
}
