// apps/mobile-app/src/app/features/viewer/viewer.page.ts
/**
 * ViewerPage (Mobile)
 *
 * Read-only 3D building viewer for the mobile inspector app.
 * Loads markers for the current building and lets the user:
 *   - Orbit / pan / zoom the model (OrbitControls)
 *   - Tap a marker to see defect info + navigate to defect detail
 *   - Filter by floor and severity
 *
 * Route: /tabs/inspection/viewer?buildingId=...&modelUrl=...&sessionId=...
 * (navigated from inspection-home or defect-list)
 */
import {
  Component, OnInit, inject, signal, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonButton, IonIcon, IonFooter, IonContent,
  IonChip, IonLabel, IonSpinner, IonBadge,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { homeOutline, layersOutline, refreshOutline } from 'ionicons/icons';

import { DefectMarker3D, SeverityLevel, floorFromMeshName } from '@ax/shared';
import { GltfViewerMobileComponent } from './gltf-viewer-mobile.component';
import { MarkersApiMobileService } from './markers-api-mobile.service';

addIcons({ homeOutline, layersOutline, refreshOutline });

@Component({
  selector: 'ax-viewer-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
    IonButton, IonIcon, IonFooter, IonContent,
    IonChip, IonLabel, IonSpinner, IonBadge,
    GltfViewerMobileComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="dark">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/inspection"></ion-back-button>
        </ion-buttons>
        <ion-title>3D 디지털 트윈</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="viewerRef?.resetCamera()">
            <ion-icon slot="icon-only" name="home-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <!-- Severity filter chips -->
      <ion-toolbar color="dark" style="--min-height:44px">
        <div style="display:flex;gap:6px;padding:0 8px;overflow-x:auto">
          @for (s of severities; track s.value) {
            <ion-chip
              [style.--background]="activeSeverities().has(s.value) ? s.color + '33' : 'transparent'"
              [style.--color]="activeSeverities().has(s.value) ? s.color : '#666'"
              [style.border]="'1px solid ' + s.color"
              (click)="toggleSeverity(s.value)">
              <ion-label style="font-size:12px">{{ s.label }}</ion-label>
            </ion-chip>
          }
        </div>
      </ion-toolbar>

      <!-- Floor selector -->
      @if (availableFloors().length > 1) {
        <ion-toolbar color="dark" style="--min-height:40px">
          <div style="display:flex;gap:4px;padding:0 8px;overflow-x:auto">
            @for (floor of availableFloors(); track floor) {
              <ion-chip
                [style.--background]="selectedFloor() === floor ? 'rgba(255,255,255,0.2)' : 'transparent'"
                [style.--color]="'white'"
                (click)="selectedFloor.set(floor)">
                <ion-label style="font-size:12px">{{ floor === 0 ? '전체' : floor + 'F' }}</ion-label>
              </ion-chip>
            }
          </div>
        </ion-toolbar>
      }
    </ion-header>

    <ion-content style="--padding-bottom:0">
      <!-- Loading state -->
      @if (loading()) {
        <div style="display:flex;align-items:center;justify-content:center;height:100%">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
        </div>
      }

      <!-- 3D Viewer -->
      <ax-gltf-viewer-mobile #viewerRef
        [modelUrl]="modelUrl()"
        [markers]="markers()"
        [selectedFloor]="selectedFloor()"
        [activeSeverities]="activeSeverities()"
        (markerSelect)="onMarkerSelect($event)"
        (loadComplete)="onLoadComplete()"
        (loadError)="onLoadError($event)"
        style="display:block;height:100%"
      />
    </ion-content>

    <!-- Selected marker info panel -->
    @if (selectedMarker()) {
      <div class="marker-panel">
        <div class="marker-panel-header">
          <span class="marker-title">{{ selectedMarker()!.label }}</span>
          <button class="close-btn" (click)="selectedMarker.set(null)">✕</button>
        </div>
        <div class="marker-panel-body">
          <div class="info-row">
            <span class="lbl">결함 유형</span>
            <span>{{ typeLabel(selectedMarker()!.iconType) }}</span>
          </div>
          <div class="info-row">
            <span class="lbl">위치</span>
            <span class="mono">
              {{ selectedMarker()!.position.x | number:'1.1-1' }},
              {{ selectedMarker()!.position.y | number:'1.1-1' }},
              {{ selectedMarker()!.position.z | number:'1.1-1' }}
            </span>
          </div>
          @if (selectedMarker()!.meshName) {
            <div class="info-row">
              <span class="lbl">메쉬</span>
              <span class="mono small">{{ selectedMarker()!.meshName }}</span>
            </div>
          }
        </div>
        <ion-button expand="block" size="small" (click)="goToDefect(selectedMarker()!.defectId)">
          결함 상세 보기
        </ion-button>
      </div>
    }

    <!-- Status bar -->
    <ion-footer>
      <ion-toolbar color="dark" style="--min-height:32px">
        <div style="padding:0 12px;font-size:11px;color:#aaa">
          마커 {{ markers().length }}개
          @if (sessionId()) { | 세션 {{ sessionId() }} }
        </div>
      </ion-toolbar>
    </ion-footer>
  `,
  styles: [`
    .marker-panel {
      position: fixed; bottom: 48px; left: 0; right: 0;
      background: white; border-radius: 16px 16px 0 0;
      padding: 16px; box-shadow: 0 -4px 24px rgba(0,0,0,0.25);
      z-index: 100;
    }
    .marker-panel-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 12px;
    }
    .marker-title { font-weight: 600; font-size: 15px; }
    .close-btn {
      background: none; border: none; font-size: 18px; color: #666;
      padding: 4px 8px; cursor: pointer;
    }
    .marker-panel-body { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
    .info-row { display: flex; justify-content: space-between; font-size: 13px; }
    .lbl { color: #888; }
    .mono { font-family: monospace; font-size: 12px; }
    .small { font-size: 11px; }
  `],
})
export class ViewerPage implements OnInit {
  private readonly route   = inject(ActivatedRoute);
  private readonly router  = inject(Router);
  private readonly markersApi = inject(MarkersApiMobileService);
  private readonly toast   = inject(ToastController);

  viewerRef?: GltfViewerMobileComponent;

  // Route state
  readonly buildingId = signal('');
  readonly modelUrl   = signal('');
  readonly sessionId  = signal('');

  // Viewer state
  readonly loading          = signal(true);
  readonly markers          = signal<DefectMarker3D[]>([]);
  readonly selectedMarker   = signal<DefectMarker3D | null>(null);
  readonly availableFloors  = signal<number[]>([0]);
  readonly selectedFloor    = signal(0);
  readonly activeSeverities = signal<Set<string>>(new Set(Object.values(SeverityLevel)));

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

  ngOnInit() {
    const q = this.route.snapshot.queryParams;
    const p = this.route.snapshot.params;

    const buildingId = q['buildingId'] ?? p['buildingId'] ?? '';
    const sessionId  = q['sessionId'] ?? '';
    const modelUrl   = q['modelUrl'] ?? `/assets/models/building-${buildingId}.glb`;

    this.buildingId.set(buildingId);
    this.sessionId.set(sessionId);
    this.modelUrl.set(modelUrl);

    this.loadMarkers();
  }

  private loadMarkers() {
    const bid = this.buildingId();
    if (!bid) return;

    this.markersApi.getByBuilding(bid, { sessionId: this.sessionId() || undefined })
      .subscribe({
        next: (list) => {
          this.markers.set(list);
          // Derive available floors from stored floor field or meshName
          const floors = new Set<number>([0]);
          list.forEach((m) => {
            const f = m.floor ?? (m.meshName ? floorFromMeshName(m.meshName) : null);
            if (f != null) floors.add(f);
          });
          if (floors.size > 1) this.availableFloors.set([...floors].sort((a, b) => a - b));
        },
        error: () => this.showToast('마커를 불러오지 못했습니다.'),
      });
  }

  onLoadComplete() {
    this.loading.set(false);
    this.showToast('3D 모델 로드 완료', 1500);
  }

  onLoadError(msg: string) {
    this.loading.set(false);
    this.showToast(`모델 로드 실패: ${msg}`);
  }

  onMarkerSelect(m: DefectMarker3D | null) {
    this.selectedMarker.set(m);
  }

  goToDefect(defectId: string) {
    this.router.navigate(['/tabs/inspection/defect-form'], {
      queryParams: { defectId, readOnly: true },
    });
  }

  toggleSeverity(value: string) {
    this.activeSeverities.update((s) => {
      const next = new Set(s);
      next.has(value) ? next.delete(value) : next.add(value);
      return next;
    });
  }

  typeLabel(type: string): string {
    return ViewerPage.TYPE_LABELS[type] ?? type;
  }

  private async showToast(message: string, duration = 3000) {
    const t = await this.toast.create({ message, duration, position: 'bottom' });
    await t.present();
  }
}
