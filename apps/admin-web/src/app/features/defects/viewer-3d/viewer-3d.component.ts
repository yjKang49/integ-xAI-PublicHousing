// apps/admin-web/src/app/features/defects/viewer-3d/viewer-3d.component.ts
import {
  Component, ElementRef, OnInit, OnDestroy,
  ViewChild, inject, signal, input, output, effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  Scene, PerspectiveCamera, WebGLRenderer, AmbientLight, DirectionalLight,
  Raycaster, Vector2, Vector3, SphereGeometry, MeshBasicMaterial, Mesh,
  Box3, Group, Object3D, GridHelper, AxesHelper, Color, TextureLoader,
} from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DefectMarker3D, DefectType, SeverityLevel } from '@ax/shared';
import { environment } from '../../../../environments/environment';

/** Maps severity to marker color */
const SEVERITY_COLOR: Record<string, string> = {
  [SeverityLevel.CRITICAL]: '#f44336',
  [SeverityLevel.HIGH]: '#ff9800',
  [SeverityLevel.MEDIUM]: '#ffeb3b',
  [SeverityLevel.LOW]: '#4caf50',
};

/** Maps defect type to emoji label */
const DEFECT_ICON: Record<string, string> = {
  [DefectType.CRACK]: '⚡',
  [DefectType.LEAK]: '💧',
  [DefectType.SPALLING]: '🪨',
  [DefectType.CORROSION]: '🔴',
  [DefectType.EFFLORESCENCE]: '⬜',
  [DefectType.DEFORMATION]: '⚠️',
};

interface MarkerMesh extends Mesh {
  userData: { markerId: string; defectId: string; severity: string };
}

@Component({
  selector: 'ax-viewer-3d',
  standalone: true,
  imports: [
    CommonModule, MatButtonModule, MatIconModule,
    MatSliderModule, MatTooltipModule, MatChipsModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="viewer-container">
      <!-- Toolbar -->
      <div class="viewer-toolbar">
        <span class="viewer-title">3D 디지털 트윈 — {{ buildingId() }}</span>

        <div class="toolbar-actions">
          <!-- Floor filter -->
          <div class="floor-filter">
            <span>층 필터:</span>
            @for (floor of availableFloors(); track floor) {
              <button mat-button [class.active-floor]="selectedFloor() === floor"
                (click)="filterFloor(floor)">
                {{ floor === 0 ? '전체' : floor + 'F' }}
              </button>
            }
          </div>

          <!-- Severity filter chips -->
          <mat-chip-listbox [multiple]="true" (change)="onSeverityFilter($event)">
            @for (s of severities; track s.value) {
              <mat-chip-option [value]="s.value" [selected]="true"
                [style.--mdc-chip-label-text-color]="s.color">
                {{ s.label }}
              </mat-chip-option>
            }
          </mat-chip-listbox>

          <!-- Controls -->
          <button mat-icon-button matTooltip="홈 뷰로 초기화" (click)="resetCamera()">
            <mat-icon>home</mat-icon>
          </button>
          <button mat-icon-button matTooltip="그리드 토글" (click)="toggleGrid()">
            <mat-icon>grid_on</mat-icon>
          </button>
          <button mat-icon-button matTooltip="축 토글" (click)="toggleAxes()">
            <mat-icon>3d_rotation</mat-icon>
          </button>
          <button mat-icon-button matTooltip="마커 추가 모드" [class.active-btn]="addMarkerMode()"
            (click)="addMarkerMode.set(!addMarkerMode())">
            <mat-icon>add_location</mat-icon>
          </button>
          <button mat-icon-button matTooltip="전체화면" (click)="toggleFullscreen()">
            <mat-icon>fullscreen</mat-icon>
          </button>
        </div>
      </div>

      <!-- Canvas -->
      <div class="canvas-wrapper">
        @if (loading()) {
          <div class="loading-overlay">
            <mat-spinner diameter="48" />
            <p>3D 모델 로딩 중...</p>
          </div>
        }
        <canvas #rendererCanvas class="viewer-canvas"></canvas>

        <!-- Marker tooltip -->
        @if (hoveredMarker()) {
          <div class="marker-tooltip" [style.left.px]="tooltipPos().x" [style.top.px]="tooltipPos().y">
            <strong>{{ hoveredMarker()!.label }}</strong>
            <span>{{ hoveredMarker()!.iconType }} — {{ hoveredMarker()!.color }}</span>
          </div>
        }

        <!-- Add marker mode hint -->
        @if (addMarkerMode()) {
          <div class="mode-hint">
            <mat-icon>add_location</mat-icon>
            클릭하여 결함 마커 위치 지정
          </div>
        }
      </div>

      <!-- Info panel -->
      @if (selectedMarker()) {
        <div class="info-panel">
          <div class="info-header">
            <span>결함 상세</span>
            <button mat-icon-button (click)="selectedMarker.set(null)">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <div class="info-body">
            <p><strong>ID:</strong> {{ selectedMarker()!.defectId }}</p>
            <p><strong>유형:</strong> {{ selectedMarker()!.iconType }}</p>
            <p><strong>위치:</strong>
              X={{ selectedMarker()!.position.x | number:'1.2-2' }}
              Y={{ selectedMarker()!.position.y | number:'1.2-2' }}
              Z={{ selectedMarker()!.position.z | number:'1.2-2' }}
            </p>
            <p><strong>메쉬:</strong> {{ selectedMarker()!.meshName }}</p>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .viewer-container {
      display: flex; flex-direction: column; height: 100%;
      background: #1a1a2e; border-radius: 8px; overflow: hidden;
    }
    .viewer-toolbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 16px; background: #16213e; color: white; flex-wrap: wrap; gap: 8px;
    }
    .viewer-title { font-size: 14px; font-weight: 600; }
    .toolbar-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .floor-filter { display: flex; align-items: center; gap: 4px; color: #aaa; font-size: 12px; }
    .active-floor { background: rgba(255,255,255,0.2) !important; }
    .active-btn { background: rgba(33, 150, 243, 0.4) !important; }
    .canvas-wrapper { position: relative; flex: 1; }
    .viewer-canvas { width: 100%; height: 100%; display: block; }
    .loading-overlay {
      position: absolute; inset: 0; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      background: rgba(26, 26, 46, 0.9); z-index: 10; color: white; gap: 16px;
    }
    .marker-tooltip {
      position: absolute; background: rgba(0,0,0,0.8);
      color: white; padding: 8px 12px; border-radius: 6px;
      pointer-events: none; font-size: 12px; z-index: 20;
      display: flex; flex-direction: column; gap: 2px;
    }
    .mode-hint {
      position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%);
      background: rgba(33, 150, 243, 0.9); color: white;
      padding: 8px 16px; border-radius: 20px; display: flex; align-items: center; gap: 8px;
      font-size: 13px; z-index: 20;
    }
    .info-panel {
      position: absolute; right: 16px; top: 60px; width: 260px;
      background: rgba(255,255,255,0.95); border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3); z-index: 15;
    }
    .info-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 16px; border-bottom: 1px solid #eee; font-weight: 600;
    }
    .info-body { padding: 12px 16px; }
    .info-body p { margin: 4px 0; font-size: 13px; }
  `],
})
export class Viewer3dComponent implements OnInit, OnDestroy {
  @ViewChild('rendererCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly buildingId = input<string>('');
  readonly modelUrl = input<string>('');

  /** Emitted when user clicks a point in add-marker mode */
  readonly markerPlaced = output<{ coords: { x: number; y: number; z: number }; meshName: string }>();

  private readonly http = inject(HttpClient);

  readonly loading = signal(true);
  readonly availableFloors = signal<number[]>([0]);
  readonly selectedFloor = signal<number>(0);
  readonly addMarkerMode = signal(false);
  readonly selectedMarker = signal<DefectMarker3D | null>(null);
  readonly hoveredMarker = signal<DefectMarker3D | null>(null);
  readonly tooltipPos = signal({ x: 0, y: 0 });

  readonly severities = [
    { value: SeverityLevel.CRITICAL, label: '긴급', color: '#f44336' },
    { value: SeverityLevel.HIGH, label: '높음', color: '#ff9800' },
    { value: SeverityLevel.MEDIUM, label: '보통', color: '#ffeb3b' },
    { value: SeverityLevel.LOW, label: '낮음', color: '#4caf50' },
  ];

  // Three.js objects
  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private renderer!: WebGLRenderer;
  private controls!: OrbitControls;
  private raycaster = new Raycaster();
  private mouse = new Vector2();
  private animationId = 0;

  private modelGroup = new Group();
  private markersGroup = new Group();
  private gridHelper!: GridHelper;
  private axesHelper!: AxesHelper;
  private markerMeshes: MarkerMesh[] = [];
  private markerDataMap = new Map<string, DefectMarker3D>();
  private selectedSeverities = new Set<string>(Object.values(SeverityLevel));

  ngOnInit() {
    this.initThree();
    this.loadModel();
    this.loadMarkers();
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animationId);
    this.renderer.dispose();
    this.controls.dispose();
    window.removeEventListener('resize', this.onResize);
  }

  // ────────────────────────────────────────────────
  // Three.js Initialization
  // ────────────────────────────────────────────────

  private initThree() {
    const canvas = this.canvasRef.nativeElement;
    const width = canvas.clientWidth || 800;
    const height = canvas.clientHeight || 600;

    // Scene
    this.scene = new Scene();
    this.scene.background = new Color(0x1a1a2e);

    // Camera
    this.camera = new PerspectiveCamera(45, width / height, 0.1, 10000);
    this.camera.position.set(20, 20, 20);

    // Renderer
    this.renderer = new WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;

    // Lights
    const ambientLight = new AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    const dirLight = new DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 100, 50);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    // Orbit controls
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 500;

    // Grid
    this.gridHelper = new GridHelper(100, 50, 0x444444, 0x333333);
    this.scene.add(this.gridHelper);

    // Axes
    this.axesHelper = new AxesHelper(5);
    this.axesHelper.visible = false;
    this.scene.add(this.axesHelper);

    // Groups
    this.scene.add(this.modelGroup);
    this.scene.add(this.markersGroup);

    // Event listeners
    canvas.addEventListener('click', this.onClick.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('resize', this.onResize.bind(this));

    this.animate();
  }

  private animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  // ────────────────────────────────────────────────
  // Model Loading (glTF + Draco)
  // ────────────────────────────────────────────────

  private loadModel() {
    const url = this.modelUrl() || `${environment.apiUrl}/complexes/buildings/${this.buildingId()}/model`;

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('assets/draco/');

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    loader.load(
      url,
      (gltf: GLTF) => {
        // Center model
        const box = new Box3().setFromObject(gltf.scene);
        const center = box.getCenter(new Vector3());
        gltf.scene.position.sub(center);

        this.modelGroup.add(gltf.scene);
        this.loading.set(false);
        this.fitCameraToModel(box);
        this.extractFloors(gltf.scene);
      },
      (progress) => {
        if (progress.total) {
          const pct = Math.round((progress.loaded / progress.total) * 100);
          console.debug(`Model loading: ${pct}%`);
        }
      },
      (error) => {
        console.error('Model load error:', error);
        this.loading.set(false);
      },
    );
  }

  private fitCameraToModel(box: Box3) {
    const size = box.getSize(new Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;
    this.camera.position.set(cameraZ, cameraZ * 0.6, cameraZ);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  private extractFloors(model: Object3D) {
    const floorNumbers = new Set<number>([0]); // 0 = all floors
    model.traverse((child) => {
      // Convention: mesh names contain floor info like "Floor_3F", "B1_ceiling"
      const match = child.name.match(/[Bb](\d+)|(\d+)[Ff]/);
      if (match) {
        floorNumbers.add(parseInt(match[1] || match[2]));
      }
    });
    this.availableFloors.set(Array.from(floorNumbers).sort((a, b) => a - b));
  }

  // ────────────────────────────────────────────────
  // Marker Management
  // ────────────────────────────────────────────────

  private loadMarkers() {
    const buildingId = this.buildingId();
    if (!buildingId) return;

    this.http
      .get<any>(`${environment.apiUrl}/markers?buildingId=${buildingId}&includeHistory=true`)
      .subscribe((res) => {
        (res.data as DefectMarker3D[]).forEach((m) => this.addMarker(m));
      });
  }

  addMarker(markerData: DefectMarker3D) {
    const color = SEVERITY_COLOR[markerData.color] ?? '#ffffff';

    const geometry = new SphereGeometry(0.3, 16, 16);
    const material = new MeshBasicMaterial({ color: parseInt(color.replace('#', '0x')) });
    const sphere = new Mesh(geometry, material) as unknown as MarkerMesh;

    sphere.position.set(
      markerData.position.x,
      markerData.position.y,
      markerData.position.z,
    );
    sphere.userData = {
      markerId: markerData._id,
      defectId: markerData.defectId,
      severity: markerData.color,
    };
    sphere.visible = markerData.isVisible;

    this.markersGroup.add(sphere);
    this.markerMeshes.push(sphere);
    this.markerDataMap.set(markerData._id, markerData);
  }

  // ────────────────────────────────────────────────
  // Interaction
  // ────────────────────────────────────────────────

  private onClick(event: MouseEvent) {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    if (this.addMarkerMode()) {
      this.placeMarkerAtClick();
      return;
    }

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.markersGroup.children, false);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as MarkerMesh;
      const markerId = mesh.userData.markerId;
      const markerData = this.markerDataMap.get(markerId) ?? null;
      this.selectedMarker.set(markerData);
    } else {
      this.selectedMarker.set(null);
    }
  }

  private onMouseMove(event: MouseEvent) {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.markersGroup.children, false);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as MarkerMesh;
      const markerId = mesh.userData.markerId;
      this.hoveredMarker.set(this.markerDataMap.get(markerId) ?? null);
      this.tooltipPos.set({ x: event.clientX - rect.left + 16, y: event.clientY - rect.top - 32 });
      canvas.style.cursor = 'pointer';
    } else {
      this.hoveredMarker.set(null);
      canvas.style.cursor = this.addMarkerMode() ? 'crosshair' : 'grab';
    }
  }

  private placeMarkerAtClick() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.modelGroup.children, true);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      const normal = intersects[0].face?.normal;
      const meshName = (intersects[0].object as any).name;

      const coords = { x: point.x, y: point.y, z: point.z };
      this.markerPlaced.emit({ coords, meshName });
      this.addMarkerMode.set(false);
    }
  }

  private readonly onResize = () => {
    const canvas = this.canvasRef.nativeElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  // ────────────────────────────────────────────────
  // Controls
  // ────────────────────────────────────────────────

  filterFloor(floor: number) {
    this.selectedFloor.set(floor);
    this.modelGroup.traverse((child: any) => {
      if (!child.isMesh) return;
      if (floor === 0) {
        child.visible = true;
        return;
      }
      const fMatch = child.name.match(/(\d+)[Ff]/);
      child.visible = fMatch ? parseInt(fMatch[1]) === floor : true;
    });
  }

  onSeverityFilter(event: any) {
    this.selectedSeverities = new Set(event.value);
    this.markerMeshes.forEach((mesh) => {
      const markerData = this.markerDataMap.get(mesh.userData.markerId);
      if (markerData) {
        mesh.visible = markerData.isVisible && this.selectedSeverities.has(mesh.userData.severity);
      }
    });
  }

  resetCamera() {
    this.camera.position.set(20, 20, 20);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  toggleGrid() {
    this.gridHelper.visible = !this.gridHelper.visible;
  }

  toggleAxes() {
    this.axesHelper.visible = !this.axesHelper.visible;
  }

  toggleFullscreen() {
    const el = this.canvasRef.nativeElement.parentElement as any;
    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  }
}
