// apps/admin-web/src/app/features/viewer/pages/model-viewer-page.component.ts
/**
 * ModelViewerPageComponent
 *
 * Route-aware wrapper for the 3D viewer.
 * Reads route params → loads markers → orchestrates viewer + overlay.
 *
 * Route: /complexes/:complexId/buildings/:buildingId/3d
 * Query params:
 *   modelUrl  — path to glTF (optional, falls back to asset convention)
 *   sessionId — filter markers by inspection session
 */
import {
  Component, OnInit, inject, signal, computed, viewChild, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';

import { DefectMarker3D, SeverityLevel, SEVERITY_MARKER_COLOR } from '@ax/shared';
import { GltfViewerComponent, MarkerPlacedEvent } from '../components/gltf-viewer.component';
import { MarkerOverlayComponent } from '../components/marker-overlay.component';
import { MarkersApiService } from '../data-access/markers.api';

@Component({
  selector: 'ax-model-viewer-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, RouterLink, FormsModule,
    MatButtonModule, MatIconModule, MatTooltipModule,
    MatSnackBarModule, MatDialogModule,
    GltfViewerComponent, MarkerOverlayComponent,
  ],
  template: `
    <div class="page-layout">
      <!-- Top toolbar -->
      <div class="page-toolbar">
        <button mat-icon-button [routerLink]="backLink()" matTooltip="단지로 돌아가기">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <span class="title">3D 디지털 트윈</span>
        <span class="subtitle">{{ buildingId() }}</span>
        <span class="spacer"></span>

        <button mat-icon-button matTooltip="홈 뷰" (click)="viewer()?.resetCamera()">
          <mat-icon>home</mat-icon>
        </button>
        <button mat-icon-button matTooltip="그리드 토글" (click)="viewer()?.toggleGrid()">
          <mat-icon>grid_on</mat-icon>
        </button>
        <button mat-icon-button matTooltip="축 토글" (click)="viewer()?.toggleAxes()">
          <mat-icon>3d_rotation</mat-icon>
        </button>
        <button mat-icon-button
          [class.active-btn]="addMarkerMode()"
          matTooltip="마커 추가 모드 (결함 위치 클릭)"
          (click)="addMarkerMode.set(!addMarkerMode())">
          <mat-icon>add_location</mat-icon>
        </button>
        <button mat-icon-button matTooltip="전체화면" (click)="viewer()?.toggleFullscreen()">
          <mat-icon>fullscreen</mat-icon>
        </button>
      </div>

      <!-- Viewer area -->
      <div class="viewer-area">
        <ax-gltf-viewer
          #viewer
          [modelUrl]="modelUrl()"
          [markers]="markers()"
          [addMarkerMode]="addMarkerMode()"
          [selectedFloor]="selectedFloor()"
          [activeSeverities]="activeSeverities()"
          (markerHover)="onMarkerHover($event)"
          (markerSelect)="onMarkerSelect($event)"
          (markerPlaced)="onMarkerPlaced($event)"
          (mousePos)="tooltipPos.set($event)"
          (floorsExtracted)="availableFloors.set($event)"
          (loadComplete)="onLoadComplete()"
        />

        <!-- 2D overlay (floor/severity/tooltip/info panel) -->
        <ax-marker-overlay
          [hoveredMarker]="hoveredMarker()"
          [selectedMarker]="selectedMarker()"
          [tooltipPos]="tooltipPos()"
          [addMarkerMode]="addMarkerMode()"
          [availableFloors]="availableFloors()"
          [selectedFloor]="selectedFloor()"
          [activeSeverities]="activeSeverities()"
          (floorChange)="selectedFloor.set($event)"
          (severityToggle)="toggleSeverity($event)"
          (markerDeselect)="selectedMarker.set(null)"
          (markerHide)="hideMarker($event)"
          style="position:absolute;inset:0;pointer-events:none"
        />
      </div>

      <!-- Status bar -->
      <div class="status-bar">
        <span>마커 {{ markers().length }}개</span>
        <span class="sep">|</span>
        <span>{{ statusText() }}</span>
        @if (sessionId()) {
          <span class="sep">|</span>
          <span>세션 필터: {{ sessionId() }}</span>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .page-layout {
      display: flex; flex-direction: column; height: calc(100vh - 64px);
      background: #0f0f1e;
    }
    .page-toolbar {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 12px; background: #16213e; color: white;
    }
    .title { font-size: 16px; font-weight: 600; }
    .subtitle { font-size: 12px; color: #aaa; }
    .spacer { flex: 1; }
    .active-btn { background: rgba(33,150,243,0.35) !important; }
    .viewer-area { flex: 1; position: relative; overflow: hidden; }
    .status-bar {
      display: flex; align-items: center; gap: 8px;
      padding: 4px 16px; background: #16213e; color: #aaa; font-size: 12px;
    }
    .sep { color: #444; }
  `],
})
export class ModelViewerPageComponent implements OnInit {
  private readonly route   = inject(ActivatedRoute);
  private readonly router  = inject(Router);
  private readonly markersApi = inject(MarkersApiService);
  private readonly snackBar   = inject(MatSnackBar);

  readonly viewer = viewChild<GltfViewerComponent>('viewer');

  // Route params
  readonly complexId  = signal('');
  readonly buildingId = signal('');
  readonly modelUrl   = signal('');
  readonly sessionId  = signal('');

  // Viewer state
  readonly markers          = signal<DefectMarker3D[]>([]);
  readonly hoveredMarker    = signal<DefectMarker3D | null>(null);
  readonly selectedMarker   = signal<DefectMarker3D | null>(null);
  readonly tooltipPos       = signal({ x: 0, y: 0 });
  readonly availableFloors  = signal<number[]>([0]);
  readonly selectedFloor    = signal(0);
  readonly addMarkerMode    = signal(false);
  readonly activeSeverities = signal<Set<string>>(new Set(Object.values(SeverityLevel)));

  readonly backLink = computed(() => ['/complexes', this.complexId()]);
  readonly statusText = computed(() =>
    this.addMarkerMode() ? '⊕ 마커 추가 모드 — 모델 표면 클릭' : '준비됨',
  );

  ngOnInit() {
    const params = this.route.snapshot.params;
    const query  = this.route.snapshot.queryParams;

    this.complexId.set(params['complexId'] ?? '');
    this.buildingId.set(params['buildingId'] ?? '');
    this.sessionId.set(query['sessionId'] ?? '');

    // Resolve model URL: prefer query param → asset convention
    const qUrl = query['modelUrl'] ?? '';
    this.modelUrl.set(qUrl || `/assets/models/building-${params['buildingId']}.glb`);

    this.loadMarkers();
  }

  private loadMarkers() {
    this.markersApi
      .getByBuilding(this.buildingId(), { sessionId: this.sessionId() || undefined })
      .subscribe({
        next: (list) => this.markers.set(list),
        error: () => this.snackBar.open('마커를 불러오지 못했습니다.', '닫기', { duration: 3000 }),
      });
  }

  onLoadComplete() {
    this.snackBar.open('3D 모델 로드 완료', '', { duration: 1500 });
  }

  onMarkerHover(m: DefectMarker3D | null) { this.hoveredMarker.set(m); }
  onMarkerSelect(m: DefectMarker3D | null) { this.selectedMarker.set(m); }

  /**
   * Called when the user clicks on the model surface in add-marker mode.
   * Opens a quick dialog to select which defect to link, then saves the marker.
   */
  onMarkerPlaced(event: MarkerPlacedEvent) {
    this.addMarkerMode.set(false);

    // Determine color from defect severity — use default until dialog is available
    const defectId = this.route.snapshot.queryParams['defectId'] ?? '';
    if (!defectId) {
      this.snackBar.open('마커를 저장하려면 URL에 defectId 파라미터가 필요합니다.', '닫기', { duration: 4000 });
      return;
    }

    // Lookup defect severity to pick color (simplified — use HIGH as default)
    const severity = this.route.snapshot.queryParams['severity'] ?? 'HIGH';
    const color = SEVERITY_MARKER_COLOR[severity] ?? '#ff9800';

    this.markersApi.create({
      defectId,
      complexId:  this.complexId(),
      buildingId: this.buildingId(),
      modelUrl:   this.modelUrl(),
      position:   event.coords,
      normal:     event.normal ?? undefined,
      meshName:   event.meshName,
      color,
      label:      `결함 마커 @ ${event.meshName}`,
    }).subscribe({
      next: (saved) => {
        this.markers.update((list) => [...list, saved]);
        this.snackBar.open('마커가 저장되었습니다.', '닫기', { duration: 2000 });
      },
      error: () => this.snackBar.open('마커 저장 실패', '닫기', { duration: 3000 }),
    });
  }

  hideMarker(markerId: string) {
    this.markersApi.hide(markerId).subscribe({
      next: () => {
        this.markers.update((list) => list.filter((m) => m._id !== markerId));
        this.selectedMarker.set(null);
        this.snackBar.open('마커가 숨겨졌습니다.', '닫기', { duration: 2000 });
      },
      error: () => this.snackBar.open('마커 숨기기 실패', '닫기', { duration: 3000 }),
    });
  }

  toggleSeverity(value: string) {
    this.activeSeverities.update((s) => {
      const next = new Set(s);
      next.has(value) ? next.delete(value) : next.add(value);
      return next;
    });
  }
}
