// apps/admin-web/src/app/features/viewer/components/marker-overlay.component.ts
/**
 * MarkerOverlayComponent
 *
 * Renders a 2D overlay panel on top of the Three.js canvas.
 * Displays:
 *   - Hovered marker tooltip
 *   - Selected marker info panel with link to defect detail
 *   - Add-marker mode hint banner
 *   - Severity filter chip bar
 *   - Floor selector buttons
 *
 * This is a *dumb* component — all state comes from inputs.
 * Parent (GltfViewerComponent or ModelViewerPageComponent) owns Three.js state.
 */
import {
  Component, input, output, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DefectMarker3D, SeverityLevel } from '@ax/shared';

export interface TooltipPos { x: number; y: number }

@Component({
  selector: 'ax-marker-overlay',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, RouterLink,
    MatButtonModule, MatIconModule, MatChipsModule, MatTooltipModule,
  ],
  template: `
    <!-- Hovered marker tooltip -->
    @if (hoveredMarker()) {
      <div class="marker-tooltip"
        [style.left.px]="tooltipPos().x + 16"
        [style.top.px]="tooltipPos().y - 32">
        <strong>{{ hoveredMarker()!.label || hoveredMarker()!.iconType }}</strong>
        <span>{{ defectTypeLabel(hoveredMarker()!.iconType) }}</span>
        <small>클릭하여 상세 보기</small>
      </div>
    }

    <!-- Add-marker mode hint -->
    @if (addMarkerMode()) {
      <div class="mode-hint">
        <mat-icon>add_location</mat-icon>
        클릭하여 결함 마커 위치 지정 — ESC로 취소
      </div>
    }

    <!-- Floor filter bar -->
    @if (availableFloors().length > 1) {
      <div class="floor-bar">
        @for (floor of availableFloors(); track floor) {
          <button mat-button
            [class.active-floor]="selectedFloor() === floor"
            (click)="floorChange.emit(floor)">
            {{ floor === 0 ? '전체' : floor + 'F' }}
          </button>
        }
      </div>
    }

    <!-- Severity filter chips -->
    <div class="severity-bar">
      @for (s of severities; track s.value) {
        <button mat-button class="sev-chip"
          [class.sev-inactive]="!activeSeverities().has(s.value)"
          [style.border-color]="s.color"
          [style.color]="activeSeverities().has(s.value) ? s.color : '#666'"
          (click)="severityToggle.emit(s.value)"
          [matTooltip]="s.label + ' 필터'">
          <span class="sev-dot" [style.background]="s.color"></span>
          {{ s.label }}
        </button>
      }
    </div>

    <!-- Selected marker panel -->
    @if (selectedMarker()) {
      <div class="info-panel">
        <div class="info-header">
          <span>결함 마커 정보</span>
          <button mat-icon-button (click)="markerDeselect.emit()">
            <mat-icon>close</mat-icon>
          </button>
        </div>
        <div class="info-body">
          <div class="info-row">
            <span class="lbl">결함 유형</span>
            <span>{{ defectTypeLabel(selectedMarker()!.iconType) }}</span>
          </div>
          <div class="info-row">
            <span class="lbl">위치 (X·Y·Z)</span>
            <span class="mono">
              {{ selectedMarker()!.position.x | number:'1.1-1' }},
              {{ selectedMarker()!.position.y | number:'1.1-1' }},
              {{ selectedMarker()!.position.z | number:'1.1-1' }}
            </span>
          </div>
          @if (selectedMarker()!.meshName) {
            <div class="info-row">
              <span class="lbl">메쉬</span>
              <span class="mono">{{ selectedMarker()!.meshName }}</span>
            </div>
          }
          <div class="info-row">
            <span class="lbl">레이블</span>
            <span>{{ selectedMarker()!.label }}</span>
          </div>
          <div class="panel-actions">
            <a mat-stroked-button
              [routerLink]="['/defects', selectedMarker()!.defectId]"
              style="font-size:12px">
              <mat-icon>open_in_new</mat-icon> 결함 상세
            </a>
            <button mat-stroked-button color="warn" style="font-size:12px"
              (click)="markerHide.emit(selectedMarker()!._id)">
              <mat-icon>visibility_off</mat-icon> 숨기기
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    /* All children are absolutely positioned over the canvas */
    :host {
      position: absolute; inset: 0;
      pointer-events: none; z-index: 10;
    }
    /* Re-enable pointer events only where needed */
    .marker-tooltip, .mode-hint, .floor-bar,
    .severity-bar, .info-panel { pointer-events: auto; }

    .marker-tooltip {
      position: absolute;
      background: rgba(0,0,0,0.85); color: white;
      padding: 8px 12px; border-radius: 6px;
      font-size: 12px; display: flex; flex-direction: column; gap: 2px;
      pointer-events: none; white-space: nowrap;
    }

    .mode-hint {
      position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%);
      background: rgba(33, 150, 243, 0.92); color: white;
      padding: 8px 20px; border-radius: 24px;
      display: flex; align-items: center; gap: 8px; font-size: 13px;
    }

    .floor-bar {
      position: absolute; top: 8px; left: 8px;
      display: flex; gap: 4px; flex-wrap: wrap;
      background: rgba(0,0,0,0.6); padding: 4px 8px; border-radius: 6px;
    }
    .floor-bar button { color: rgba(255,255,255,0.7); font-size: 12px; min-width: 36px; padding: 2px 4px; }
    .floor-bar .active-floor { background: rgba(255,255,255,0.2) !important; color: white !important; }

    .severity-bar {
      position: absolute; top: 8px; right: 8px;
      display: flex; gap: 6px;
    }
    .sev-chip {
      display: flex; align-items: center; gap: 4px;
      border: 1px solid; border-radius: 16px;
      padding: 2px 10px; font-size: 12px; background: rgba(0,0,0,0.55);
      transition: opacity 0.15s;
    }
    .sev-chip.sev-inactive { opacity: 0.35; }
    .sev-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

    .info-panel {
      position: absolute; right: 12px; top: 44px;
      width: 260px; background: rgba(255,255,255,0.97);
      border-radius: 10px; box-shadow: 0 4px 24px rgba(0,0,0,0.35);
    }
    .info-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 14px; border-bottom: 1px solid #eee; font-weight: 600; font-size: 14px;
    }
    .info-body { padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; }
    .info-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
    .lbl { color: #666; }
    .mono { font-family: monospace; font-size: 12px; }
    .panel-actions { display: flex; gap: 8px; margin-top: 4px; }
  `],
})
export class MarkerOverlayComponent {
  // ── Inputs ────────────────────────────────────────
  readonly hoveredMarker   = input<DefectMarker3D | null>(null);
  readonly selectedMarker  = input<DefectMarker3D | null>(null);
  readonly tooltipPos      = input<TooltipPos>({ x: 0, y: 0 });
  readonly addMarkerMode   = input<boolean>(false);
  readonly availableFloors = input<number[]>([0]);
  readonly selectedFloor   = input<number>(0);
  readonly activeSeverities = input<Set<string>>(new Set(Object.values(SeverityLevel)));

  // ── Outputs ───────────────────────────────────────
  readonly floorChange    = output<number>();
  readonly severityToggle = output<string>();
  readonly markerDeselect = output<void>();
  readonly markerHide     = output<string>(); // markerId

  readonly severities = [
    { value: SeverityLevel.CRITICAL, label: '긴급', color: '#f44336' },
    { value: SeverityLevel.HIGH,     label: '높음', color: '#ff9800' },
    { value: SeverityLevel.MEDIUM,   label: '보통', color: '#ffeb3b' },
    { value: SeverityLevel.LOW,      label: '낮음', color: '#4caf50' },
  ];

  private static readonly TYPE_LABELS: Record<string, string> = {
    CRACK: '균열', LEAK: '누수', SPALLING: '박리/박락',
    CORROSION: '부식', EFFLORESCENCE: '백태',
    DEFORMATION: '변형', SETTLEMENT: '침하', OTHER: '기타',
  };

  defectTypeLabel(type: string): string {
    return MarkerOverlayComponent.TYPE_LABELS[type] ?? type;
  }
}
