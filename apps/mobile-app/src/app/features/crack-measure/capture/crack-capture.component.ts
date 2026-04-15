// apps/mobile-app/src/app/features/crack-measure/capture/crack-capture.component.ts
import {
  Component, ElementRef, ViewChild, OnInit, OnDestroy,
  inject, signal, input, output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

/** OpenCV.js is loaded globally via script tag in index.html */
declare const cv: any;

export interface CrackMeasurementResult {
  measuredWidthMm: number;
  autoConfidence: number;         // 0-1
  graduationCount: number;
  scaleMmPerGraduation: number;
  roiImageDataUrl: string;        // base64 ROI image
  isManualOverride: boolean;
  manualWidthMm?: number;
}

@Component({
  selector: 'ax-crack-capture',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-content>
      <div class="capture-container">
        <!-- Instructions -->
        <ion-card class="instruction-card">
          <ion-card-content>
            <ion-icon name="information-circle-outline" color="primary" />
            균열 측정자가 포함된 사진을 촬영하거나 갤러리에서 선택하세요.
          </ion-card-content>
        </ion-card>

        <!-- Camera / Preview area -->
        <div class="preview-area">
          @if (!capturedImage()) {
            <div class="camera-placeholder">
              <ion-icon name="camera-outline" size="large" />
              <p>이미지 없음</p>
            </div>
          } @else {
            <div class="image-wrapper">
              <!-- Original image -->
              <canvas #originalCanvas class="preview-canvas"></canvas>

              <!-- ROI selector overlay -->
              @if (showRoiSelector()) {
                <svg class="roi-overlay"
                  (mousedown)="startRoi($event)"
                  (mousemove)="updateRoi($event)"
                  (mouseup)="endRoi($event)"
                  (touchstart)="startRoi($event)"
                  (touchmove)="updateRoi($event)"
                  (touchend)="endRoi($event)">
                  @if (roi()) {
                    <rect
                      [attr.x]="roi()!.x" [attr.y]="roi()!.y"
                      [attr.width]="roi()!.w" [attr.height]="roi()!.h"
                      fill="none" stroke="#2196F3" stroke-width="2"
                      stroke-dasharray="5,5" />
                  }
                </svg>
              }
            </div>

            <!-- ROI result -->
            @if (roiCanvas()) {
              <div class="roi-result">
                <p class="roi-label">추출된 ROI (눈금 영역)</p>
                <canvas #roiCanvas class="roi-canvas"></canvas>
              </div>
            }
          }
        </div>

        <!-- Action buttons -->
        <div class="action-row">
          <ion-button fill="outline" (click)="takePicture()">
            <ion-icon slot="start" name="camera-outline" />
            촬영
          </ion-button>
          <ion-button fill="outline" (click)="pickFromGallery()">
            <ion-icon slot="start" name="images-outline" />
            갤러리
          </ion-button>
          @if (capturedImage() && !showRoiSelector()) {
            <ion-button fill="outline" color="secondary" (click)="selectRoi()">
              <ion-icon slot="start" name="crop-outline" />
              ROI 선택
            </ion-button>
          }
        </div>

        <!-- Hidden file input for gallery -->
        <input #fileInput type="file" accept="image/*" hidden (change)="onFileSelect($event)" />

        <!-- OpenCV Processing -->
        @if (capturedImage()) {
          <ion-card class="processing-card">
            <ion-card-header>
              <ion-card-title>균열 폭 측정</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <!-- Scale calibration -->
              <ion-item>
                <ion-label>눈금 1칸 = </ion-label>
                <ion-input
                  type="number" slot="end" [(ngModel)]="scaleMmPerGraduation"
                  min="0.1" step="0.1" style="max-width: 80px; text-align: right;" />
                <ion-label slot="end">mm</ion-label>
              </ion-item>

              <ion-button expand="block" (click)="runMeasurement()" [disabled]="processing()">
                @if (processing()) {
                  <ion-spinner slot="start" name="dots" />
                  분석 중...
                } @else {
                  <ion-icon slot="start" name="analytics-outline" />
                  자동 측정 실행
                }
              </ion-button>

              <!-- Result display -->
              @if (result()) {
                <div class="result-display" [class.low-confidence]="result()!.autoConfidence < 0.6">
                  <div class="result-row">
                    <span class="result-label">측정 폭</span>
                    <span class="result-value">{{ result()!.measuredWidthMm | number:'1.2-2' }} mm</span>
                  </div>
                  <div class="result-row">
                    <span class="result-label">신뢰도</span>
                    <ion-progress-bar
                      [value]="result()!.autoConfidence"
                      [color]="result()!.autoConfidence > 0.7 ? 'success' : result()!.autoConfidence > 0.4 ? 'warning' : 'danger'">
                    </ion-progress-bar>
                    <span class="result-value">{{ (result()!.autoConfidence * 100) | number:'1.0-0' }}%</span>
                  </div>
                  <div class="result-row">
                    <span class="result-label">감지된 눈금 수</span>
                    <span class="result-value">{{ result()!.graduationCount }}개</span>
                  </div>

                  @if (result()!.autoConfidence < 0.6) {
                    <ion-note color="warning">
                      <ion-icon name="warning-outline" />
                      신뢰도가 낮습니다. 수동 보정 입력을 사용하세요.
                    </ion-note>
                  }
                </div>

                <!-- Manual override -->
                <ion-item lines="none">
                  <ion-checkbox slot="start" [(ngModel)]="useManualOverride" />
                  <ion-label>수동 보정 입력</ion-label>
                </ion-item>

                @if (useManualOverride) {
                  <ion-item>
                    <ion-label position="floating">수동 측정값 (mm)</ion-label>
                    <ion-input type="number" [(ngModel)]="manualWidthMm" min="0" step="0.1" />
                  </ion-item>
                }

                <ion-button expand="block" color="success" (click)="confirmMeasurement()">
                  <ion-icon slot="start" name="checkmark-circle-outline" />
                  측정값 확인
                </ion-button>
              }
            </ion-card-content>
          </ion-card>
        }
      </div>
    </ion-content>
  `,
  styles: [`
    .capture-container { padding: 16px; display: flex; flex-direction: column; gap: 16px; }
    .instruction-card ion-card-content { display: flex; align-items: center; gap: 8px; font-size: 13px; }
    .preview-area { background: #000; border-radius: 8px; min-height: 240px; overflow: hidden; position: relative; }
    .camera-placeholder {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; height: 240px; color: #666;
    }
    .image-wrapper { position: relative; }
    .preview-canvas { width: 100%; display: block; }
    .roi-overlay { position: absolute; inset: 0; width: 100%; height: 100%; cursor: crosshair; }
    .roi-result { padding: 8px; }
    .roi-canvas { width: 100%; max-height: 120px; object-fit: contain; display: block; }
    .roi-label { color: #aaa; font-size: 11px; text-align: center; margin-bottom: 4px; }
    .action-row { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
    .result-display { margin: 12px 0; padding: 12px; background: #f8f8f8; border-radius: 8px; }
    .low-confidence { background: #fff3e0; border: 1px solid #ff9800; }
    .result-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .result-label { flex: 1; font-size: 13px; color: #555; }
    .result-value { font-weight: 600; font-size: 14px; min-width: 60px; text-align: right; }
  `],
})
export class CrackCaptureComponent implements OnInit, OnDestroy {
  @ViewChild('originalCanvas') originalCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('roiCanvas') roiCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  readonly gaugePointId = input<string>('');
  readonly measurementConfirmed = output<CrackMeasurementResult>();

  readonly capturedImage = signal<HTMLImageElement | null>(null);
  readonly processing = signal(false);
  readonly result = signal<CrackMeasurementResult | null>(null);
  readonly showRoiSelector = signal(false);
  readonly roi = signal<{ x: number; y: number; w: number; h: number } | null>(null);
  readonly roiCanvas = signal<boolean>(false);

  scaleMmPerGraduation = 0.1;  // default: 1 graduation = 0.1mm
  useManualOverride = false;
  manualWidthMm: number | null = null;

  private cvReady = false;
  private roiStart: { x: number; y: number } | null = null;
  private isDragging = false;

  ngOnInit() {
    if (typeof cv !== 'undefined' && cv.Mat) {
      this.cvReady = true;
    } else {
      // cv.onRuntimeInitialized fires when OpenCV.js WASM is ready
      (window as any).onOpenCvReady = () => { this.cvReady = true; };
    }
  }

  ngOnDestroy() {
    (window as any).onOpenCvReady = null;
  }

  // ────────────────────────────────────────────────
  // Image capture
  // ────────────────────────────────────────────────

  async takePicture() {
    // In Capacitor environment, use Camera plugin
    // In browser/dev, fall back to file input
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        quality: 90,
      });
      if (photo.dataUrl) this.loadImageFromDataUrl(photo.dataUrl);
    } catch {
      // Fallback for browser dev
      this.fileInputRef.nativeElement.click();
    }
  }

  async pickFromGallery() {
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
        quality: 90,
      });
      if (photo.dataUrl) this.loadImageFromDataUrl(photo.dataUrl);
    } catch {
      this.fileInputRef.nativeElement.click();
    }
  }

  onFileSelect(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => this.loadImageFromDataUrl(e.target!.result as string);
    reader.readAsDataURL(file);
  }

  private loadImageFromDataUrl(dataUrl: string) {
    const img = new Image();
    img.onload = () => {
      this.capturedImage.set(img);
      this.result.set(null);
      this.roi.set(null);
      this.roiCanvas.set(false);
      setTimeout(() => this.drawImageToCanvas(img), 0);
    };
    img.src = dataUrl;
  }

  private drawImageToCanvas(img: HTMLImageElement) {
    const canvas = this.originalCanvasRef.nativeElement;
    const maxW = canvas.parentElement!.clientWidth;
    const scale = maxW / img.naturalWidth;
    canvas.width = maxW;
    canvas.height = img.naturalHeight * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }

  // ────────────────────────────────────────────────
  // ROI Selection
  // ────────────────────────────────────────────────

  selectRoi() {
    this.showRoiSelector.set(true);
    this.roi.set(null);
  }

  startRoi(event: MouseEvent | TouchEvent) {
    event.preventDefault();
    const canvas = this.originalCanvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    this.roiStart = { x: clientX - rect.left, y: clientY - rect.top };
    this.isDragging = true;
  }

  updateRoi(event: MouseEvent | TouchEvent) {
    if (!this.isDragging || !this.roiStart) return;
    event.preventDefault();
    const canvas = this.originalCanvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    this.roi.set({
      x: Math.min(this.roiStart.x, x),
      y: Math.min(this.roiStart.y, y),
      w: Math.abs(x - this.roiStart.x),
      h: Math.abs(y - this.roiStart.y),
    });
  }

  endRoi(event: MouseEvent | TouchEvent) {
    event.preventDefault();
    this.isDragging = false;
    this.showRoiSelector.set(false);
    if (this.roi()) this.extractRoi();
  }

  private extractRoi() {
    const src = this.originalCanvasRef.nativeElement;
    const roi = this.roi()!;
    if (roi.w < 10 || roi.h < 10) return;

    const scale = src.width / this.capturedImage()!.naturalWidth;
    const rx = roi.x / scale;
    const ry = roi.y / scale;
    const rw = roi.w / scale;
    const rh = roi.h / scale;

    const roiCanvas = document.createElement('canvas');
    roiCanvas.width = rw;
    roiCanvas.height = rh;
    const ctx = roiCanvas.getContext('2d')!;
    ctx.drawImage(this.capturedImage()!, rx, ry, rw, rh, 0, 0, rw, rh);

    // Draw to visible ROI canvas
    setTimeout(() => {
      const visibleRoi = this.roiCanvasRef?.nativeElement;
      if (!visibleRoi) return;
      const maxW = src.parentElement!.clientWidth;
      visibleRoi.width = Math.min(maxW, rw);
      visibleRoi.height = (visibleRoi.width / rw) * rh;
      visibleRoi.getContext('2d')!.drawImage(roiCanvas, 0, 0, visibleRoi.width, visibleRoi.height);
      this.roiCanvas.set(true);
    }, 50);

    // Store for OpenCV
    (this as any)._roiCanvas = roiCanvas;
  }

  // ────────────────────────────────────────────────
  // OpenCV.js Measurement
  // ────────────────────────────────────────────────

  async runMeasurement() {
    if (!this.cvReady) {
      alert('OpenCV.js 로딩 중입니다. 잠시 후 다시 시도하세요.');
      return;
    }
    this.processing.set(true);
    this.result.set(null);

    // Use ROI if available, else full image
    const sourceCanvas = (this as any)._roiCanvas ?? this.originalCanvasRef.nativeElement;

    try {
      const result = await this.measureCrackWidth(sourceCanvas);
      this.result.set(result);
    } catch (err) {
      console.error('OpenCV measurement error:', err);
      alert('자동 측정에 실패했습니다. 수동 보정 입력을 사용하세요.');
    } finally {
      this.processing.set(false);
    }
  }

  /**
   * OpenCV.js crack width measurement algorithm:
   * 1. Convert to grayscale
   * 2. Apply Gaussian blur to reduce noise
   * 3. Adaptive threshold → binary image
   * 4. Morphological operations to isolate crack
   * 5. Find contours of crack region
   * 6. Detect scale graduation marks (horizontal lines)
   * 7. Calculate pixel-per-mm ratio from graduation spacing
   * 8. Measure crack width in mm
   */
  private async measureCrackWidth(sourceCanvas: HTMLCanvasElement): Promise<CrackMeasurementResult> {
    return new Promise((resolve, reject) => {
      // Run in next tick to allow loading spinner to render
      setTimeout(() => {
        let src: any, gray: any, blurred: any, binary: any, morphed: any;
        try {
          // Load image into OpenCV mat
          src = cv.imread(sourceCanvas);
          gray = new cv.Mat();
          blurred = new cv.Mat();
          binary = new cv.Mat();
          morphed = new cv.Mat();

          // Step 1: Grayscale
          cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

          // Step 2: Gaussian blur to reduce noise
          cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

          // Step 3: Adaptive threshold
          cv.adaptiveThreshold(
            blurred, binary,
            255,
            cv.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv.THRESH_BINARY_INV,
            11, 2,
          );

          // Step 4: Morphological operations — close small gaps in crack
          const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
          cv.morphologyEx(binary, morphed, cv.MORPH_CLOSE, kernel);
          kernel.delete();

          // Step 5: Find contours
          const contours = new cv.MatVector();
          const hierarchy = new cv.Mat();
          cv.findContours(morphed, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

          // Find the largest contour (assumed to be the crack region)
          let maxArea = 0;
          let crackWidthPx = 0;

          for (let i = 0; i < contours.size(); i++) {
            const contour = contours.get(i);
            const area = cv.contourArea(contour);
            if (area > maxArea) {
              maxArea = area;
              const rect = cv.boundingRect(contour);
              // Crack width = minimum dimension of bounding rect
              crackWidthPx = Math.min(rect.width, rect.height);
            }
            contour.delete();
          }

          // Step 6: Detect graduation marks using horizontal line detection
          const { graduationCount, pxPerMm } = this.detectGraduations(gray, this.scaleMmPerGraduation);

          // Step 7: Calculate crack width in mm
          const measuredWidthMm = pxPerMm > 0 ? crackWidthPx / pxPerMm : crackWidthPx * 0.01;

          // Confidence: based on contour area and graduation detection
          const hasGoodContour = maxArea > 100;
          const hasGraduations = graduationCount > 0;
          const autoConfidence = (hasGoodContour ? 0.5 : 0.1) + (hasGraduations ? 0.5 : 0);

          // ROI image as base64
          const roiDataUrl = sourceCanvas.toDataURL('image/jpeg', 0.85);

          contours.delete();
          hierarchy.delete();

          resolve({
            measuredWidthMm: Math.round(measuredWidthMm * 100) / 100,
            autoConfidence,
            graduationCount,
            scaleMmPerGraduation: this.scaleMmPerGraduation,
            roiImageDataUrl: roiDataUrl,
            isManualOverride: false,
          });
        } catch (err) {
          reject(err);
        } finally {
          src?.delete();
          gray?.delete();
          blurred?.delete();
          binary?.delete();
          morphed?.delete();
        }
      }, 50);
    });
  }

  /**
   * Detect scale graduation marks using Hough line transform.
   * Returns graduation count and estimated pixels-per-mm ratio.
   */
  private detectGraduations(
    grayMat: any,
    mmPerGraduation: number,
  ): { graduationCount: number; pxPerMm: number } {
    let edges: any, lines: any;
    try {
      edges = new cv.Mat();
      lines = new cv.Mat();

      cv.Canny(grayMat, edges, 50, 150);

      // Detect horizontal lines via Hough
      cv.HoughLines(edges, lines, 1, Math.PI / 180, 80);

      // Filter for near-horizontal lines (angle close to 0 or π)
      const horizontalYPositions: number[] = [];
      for (let i = 0; i < lines.rows; i++) {
        const theta = lines.data32F[i * 2 + 1];
        if (Math.abs(theta) < 0.2 || Math.abs(theta - Math.PI) < 0.2) {
          const rho = lines.data32F[i * 2];
          horizontalYPositions.push(Math.abs(rho));
        }
      }

      // Cluster close lines (within 3px) to count unique graduations
      const uniquePositions = this.clusterPositions(horizontalYPositions, 3);
      const graduationCount = uniquePositions.length;

      // Estimate graduation spacing in pixels
      let pxPerMm = 0;
      if (graduationCount >= 2) {
        uniquePositions.sort((a, b) => a - b);
        const spacings: number[] = [];
        for (let i = 1; i < uniquePositions.length; i++) {
          spacings.push(uniquePositions[i] - uniquePositions[i - 1]);
        }
        const avgSpacingPx = spacings.reduce((s, v) => s + v, 0) / spacings.length;
        pxPerMm = mmPerGraduation > 0 ? avgSpacingPx / mmPerGraduation : 0;
      }

      return { graduationCount, pxPerMm };
    } finally {
      edges?.delete();
      lines?.delete();
    }
  }

  private clusterPositions(positions: number[], threshold: number): number[] {
    if (positions.length === 0) return [];
    positions.sort((a, b) => a - b);
    const clusters: number[] = [positions[0]];
    for (let i = 1; i < positions.length; i++) {
      if (positions[i] - clusters[clusters.length - 1] > threshold) {
        clusters.push(positions[i]);
      }
    }
    return clusters;
  }

  // ────────────────────────────────────────────────
  // Confirm & emit
  // ────────────────────────────────────────────────

  confirmMeasurement() {
    const r = this.result();
    if (!r) return;

    const finalResult: CrackMeasurementResult = {
      ...r,
      isManualOverride: this.useManualOverride,
      manualWidthMm: this.useManualOverride ? (this.manualWidthMm ?? undefined) : undefined,
      measuredWidthMm: this.useManualOverride && this.manualWidthMm
        ? this.manualWidthMm
        : r.measuredWidthMm,
    };

    this.measurementConfirmed.emit(finalResult);
  }
}
