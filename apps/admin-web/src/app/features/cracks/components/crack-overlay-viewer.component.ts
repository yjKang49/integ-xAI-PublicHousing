// apps/admin-web/src/app/features/cracks/components/crack-overlay-viewer.component.ts
// 균열 분석 결과 오버레이 뷰어 — 원본 이미지 위에 bbox, 측정선, ROI를 시각적으로 표시
import { Component, Input, OnChanges, ElementRef, ViewChild, AfterViewInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { MatButtonToggleModule } from '@angular/material/button-toggle'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'
import { CrackAnalysisResult, CrackRoi } from '@ax/shared'

export type OverlayMode = 'original' | 'overlay' | 'roi'

@Component({
  selector: 'ax-crack-overlay-viewer',
  standalone: true,
  imports: [CommonModule, MatButtonToggleModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="viewer-container">
      <div class="viewer-toolbar">
        <mat-button-toggle-group [(value)]="mode" (change)="onModeChange()">
          <mat-button-toggle value="original" matTooltip="원본 이미지">
            <mat-icon>image</mat-icon> 원본
          </mat-button-toggle>
          <mat-button-toggle value="overlay" matTooltip="분석 오버레이" [disabled]="!result?.overlayImageKey">
            <mat-icon>layers</mat-icon> 오버레이
          </mat-button-toggle>
          <mat-button-toggle value="roi" matTooltip="관심 영역(ROI)" [disabled]="!result?.roi">
            <mat-icon>crop</mat-icon> ROI
          </mat-button-toggle>
        </mat-button-toggle-group>

        <div class="spacer"></div>

        <button mat-icon-button (click)="zoomIn()" matTooltip="확대">
          <mat-icon>zoom_in</mat-icon>
        </button>
        <button mat-icon-button (click)="zoomOut()" matTooltip="축소">
          <mat-icon>zoom_out</mat-icon>
        </button>
        <button mat-icon-button (click)="resetZoom()" matTooltip="원래 크기">
          <mat-icon>fit_screen</mat-icon>
        </button>
      </div>

      <div class="canvas-wrapper" (wheel)="onWheel($event)">
        @if (imageSrc) {
          <div class="image-container" [style.transform]="'scale(' + zoom + ')'" [style.transform-origin]="'top left'">
            <img
              #imgEl
              [src]="imageSrc"
              alt="균열 이미지"
              class="crack-image"
              (load)="onImageLoad()"
              (error)="onImageError()"
            />

            <!-- ROI 표시 오버레이 (원본 모드일 때만) -->
            @if (mode === 'original' && result?.roi && imgLoaded) {
              <div
                class="roi-box"
                [style.left.%]="result!.roi!.x * 100"
                [style.top.%]="result!.roi!.y * 100"
                [style.width.%]="result!.roi!.w * 100"
                [style.height.%]="result!.roi!.h * 100"
              ></div>
            }

            <!-- BBox 표시 (원본 모드, analysis 있을 때) -->
            @if (mode === 'original' && result?.analysis?.boundingBox && imgLoaded) {
              <div
                class="bbox-box"
                [style.left.px]="bboxLeft"
                [style.top.px]="bboxTop"
                [style.width.px]="bboxWidth"
                [style.height.px]="bboxHeight"
              >
                <span class="bbox-label">{{ result!.analysis!.maxWidthMm | number:'1.3-3' }}mm</span>
              </div>
            }
          </div>
        } @else {
          <div class="no-image">
            <mat-icon>broken_image</mat-icon>
            <span>이미지를 불러올 수 없습니다</span>
          </div>
        }
      </div>

      @if (result?.analysis) {
        <div class="viewer-footer">
          <span class="metric">최대폭: <strong>{{ result!.analysis!.maxWidthMm | number:'1.3-3' }}mm</strong></span>
          <span class="metric">길이: <strong>{{ result!.analysis!.lengthMm | number:'1.1-1' }}mm</strong></span>
          <span class="metric">방향: <strong>{{ result!.analysis!.orientationDeg | number:'1.0-0' }}°</strong></span>
          <span class="metric">신뢰도: <strong>{{ (result!.confidence * 100) | number:'1.0-0' }}%</strong></span>
        </div>
      }
    </div>
  `,
  styles: [`
    .viewer-container {
      display: flex;
      flex-direction: column;
      background: #1a1a2e;
      border-radius: 8px;
      overflow: hidden;
      height: 100%;
      min-height: 300px;
    }
    .viewer-toolbar {
      display: flex;
      align-items: center;
      padding: 8px;
      background: #16213e;
      gap: 4px;
    }
    .spacer { flex: 1; }
    .canvas-wrapper {
      flex: 1;
      overflow: auto;
      position: relative;
      background: #0f3460;
      display: flex;
      align-items: flex-start;
      justify-content: flex-start;
      padding: 8px;
    }
    .image-container {
      position: relative;
      display: inline-block;
      transition: transform 0.15s ease;
    }
    .crack-image {
      display: block;
      max-width: 100%;
      object-fit: contain;
    }
    .roi-box {
      position: absolute;
      border: 2px dashed #00e5ff;
      background: rgba(0, 229, 255, 0.08);
      pointer-events: none;
    }
    .bbox-box {
      position: absolute;
      border: 2px solid #ff4081;
      background: rgba(255, 64, 129, 0.1);
      pointer-events: none;
    }
    .bbox-label {
      position: absolute;
      top: -22px;
      left: 0;
      background: #ff4081;
      color: white;
      font-size: 11px;
      padding: 2px 4px;
      border-radius: 2px;
      white-space: nowrap;
    }
    .no-image {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      color: rgba(255,255,255,0.4);
      gap: 8px;
      padding: 48px;
    }
    .no-image mat-icon { font-size: 48px; width: 48px; height: 48px; }
    .viewer-footer {
      display: flex;
      gap: 16px;
      padding: 8px 12px;
      background: #16213e;
      color: rgba(255,255,255,0.8);
      font-size: 13px;
    }
    .metric strong { color: #00e5ff; }
    mat-button-toggle-group { background: rgba(255,255,255,0.1); }
    button[mat-icon-button] { color: rgba(255,255,255,0.7); }
  `],
})
export class CrackOverlayViewerComponent implements OnChanges {
  @Input() result: CrackAnalysisResult | null = null
  @Input() imageBaseUrl = '/api/v1/media/file'

  @ViewChild('imgEl') imgEl?: ElementRef<HTMLImageElement>

  mode: OverlayMode = 'original'
  zoom = 1
  imgLoaded = false

  get imageSrc(): string | null {
    if (!this.result) return null
    const key = this.mode === 'overlay' && this.result.overlayImageKey
      ? this.result.overlayImageKey
      : this.mode === 'roi' && this.result.roiImageKey
      ? this.result.roiImageKey
      : this.result.capturedImageKey
    return key ? `${this.imageBaseUrl}?key=${encodeURIComponent(key)}` : null
  }

  // BBox position in pixels (relative to displayed image size)
  get bboxLeft(): number {
    const bb = this.result?.analysis?.boundingBox
    if (!bb || !this.imgEl) return 0
    const scaleX = this.imgEl.nativeElement.clientWidth / (this.imgEl.nativeElement.naturalWidth || 1)
    return bb.x * scaleX
  }
  get bboxTop(): number {
    const bb = this.result?.analysis?.boundingBox
    if (!bb || !this.imgEl) return 0
    const scaleY = this.imgEl.nativeElement.clientHeight / (this.imgEl.nativeElement.naturalHeight || 1)
    return bb.y * scaleY
  }
  get bboxWidth(): number {
    const bb = this.result?.analysis?.boundingBox
    if (!bb || !this.imgEl) return 0
    const scaleX = this.imgEl.nativeElement.clientWidth / (this.imgEl.nativeElement.naturalWidth || 1)
    return bb.w * scaleX
  }
  get bboxHeight(): number {
    const bb = this.result?.analysis?.boundingBox
    if (!bb || !this.imgEl) return 0
    const scaleY = this.imgEl.nativeElement.clientHeight / (this.imgEl.nativeElement.naturalHeight || 1)
    return bb.h * scaleY
  }

  ngOnChanges(): void {
    this.mode = 'original'
    this.imgLoaded = false
    this.zoom = 1
  }

  onModeChange(): void {
    this.imgLoaded = false
  }

  onImageLoad(): void {
    this.imgLoaded = true
  }

  onImageError(): void {
    this.imgLoaded = false
  }

  zoomIn(): void { this.zoom = Math.min(this.zoom * 1.25, 5) }
  zoomOut(): void { this.zoom = Math.max(this.zoom / 1.25, 0.2) }
  resetZoom(): void { this.zoom = 1 }

  onWheel(event: WheelEvent): void {
    if (event.ctrlKey) {
      event.preventDefault()
      event.deltaY < 0 ? this.zoomIn() : this.zoomOut()
    }
  }
}
