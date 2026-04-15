// apps/admin-web/src/app/features/viewer/components/gltf-viewer.component.ts
/**
 * GltfViewerComponent
 *
 * Pure Three.js rendering engine wrapped as an Angular component.
 * Responsibilities:
 *   - Init/destroy WebGLRenderer, Scene, Camera, OrbitControls
 *   - Load a glTF model (with optional Draco compression)
 *   - Render DefectMarker3D spheres as overlays
 *   - Emit raycaster hits (marker click / model click for add-marker mode)
 *   - Floor visibility filter (mesh name convention: *_3F, *_B1, *Floor3)
 *   - Severity visibility filter
 *
 * All UI chrome (toolbar, info panel, chips) lives in MarkerOverlayComponent.
 */
import {
  Component, ElementRef, OnInit, OnDestroy, ViewChild,
  inject, signal, input, output, effect, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  Scene, PerspectiveCamera, WebGLRenderer,
  AmbientLight, DirectionalLight, HemisphereLight,
  Raycaster, Vector2, Vector3,
  SphereGeometry, MeshBasicMaterial, Mesh,
  Box3, Group, GridHelper, AxesHelper, Color,
  Object3D, BufferGeometry,
} from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DefectMarker3D, SeverityLevel } from '@ax/shared';

/** Marker sphere mesh with typed userData */
interface MarkerMesh extends Mesh<BufferGeometry, MeshBasicMaterial> {
  userData: { markerId: string; defectId: string; severity: string };
}

/** Event emitted when the user clicks in add-marker mode */
export interface MarkerPlacedEvent {
  coords: { x: number; y: number; z: number };
  normal: { x: number; y: number; z: number } | null;
  meshName: string;
}

const SEVERITY_COLOR: Record<string, number> = {
  [SeverityLevel.CRITICAL]: 0xf44336,
  [SeverityLevel.HIGH]:     0xff9800,
  [SeverityLevel.MEDIUM]:   0xffeb3b,
  [SeverityLevel.LOW]:      0x4caf50,
};
const DEFAULT_COLOR = 0xff6b6b;

@Component({
  selector: 'ax-gltf-viewer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatProgressSpinnerModule],
  template: `
    <div class="viewer-root">
      @if (loading()) {
        <div class="loading-overlay">
          <mat-spinner diameter="48" />
          <p>3D 모델 로딩 중…</p>
        </div>
      }
      <canvas #canvas class="viewer-canvas"></canvas>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .viewer-root { position: relative; width: 100%; height: 100%; background: #1a1a2e; }
    .viewer-canvas { display: block; width: 100%; height: 100%; }
    .loading-overlay {
      position: absolute; inset: 0; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      background: rgba(26,26,46,0.92); z-index: 5; color: white; gap: 16px;
    }
  `],
})
export class GltfViewerComponent implements OnInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  // ── Inputs ────────────────────────────────────────
  readonly modelUrl        = input<string>('');
  readonly markers         = input<DefectMarker3D[]>([]);
  readonly addMarkerMode   = input<boolean>(false);
  readonly selectedFloor   = input<number>(0);           // 0 = show all
  readonly activeSeverities = input<Set<string>>(new Set(Object.values(SeverityLevel)));

  // ── Outputs ───────────────────────────────────────
  readonly markerHover    = output<DefectMarker3D | null>();
  readonly markerSelect   = output<DefectMarker3D | null>();
  readonly markerPlaced   = output<MarkerPlacedEvent>();
  readonly mousePos       = output<{ x: number; y: number }>();
  readonly floorsExtracted = output<number[]>();
  readonly loadComplete   = output<void>();

  readonly loading = signal(true);

  // Three.js internals
  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private renderer!: WebGLRenderer;
  private controls!: OrbitControls;
  private animId = 0;
  private raycaster = new Raycaster();
  private mouse = new Vector2();

  private modelGroup   = new Group();
  private markersGroup = new Group();
  private grid!: GridHelper;
  private axes!: AxesHelper;

  private markerMeshMap = new Map<string, MarkerMesh>();   // markerId → mesh
  private markerDataMap = new Map<string, DefectMarker3D>(); // markerId → data

  constructor() {
    // React to new marker list from parent
    effect(() => {
      const list = this.markers();
      this.syncMarkers(list);
    });

    // React to floor filter changes
    effect(() => {
      this.applyFloorFilter(this.selectedFloor());
    });

    // React to severity filter changes
    effect(() => {
      this.applySeverityFilter(this.activeSeverities());
    });
  }

  // ────────────────────────────────────────────────────────────────
  // Lifecycle
  // ────────────────────────────────────────────────────────────────

  ngOnInit() {
    this.initScene();
    this.loadModel();
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animId);
    this.renderer?.dispose();
    this.controls?.dispose();
    window.removeEventListener('resize', this.onResize);
    const canvas = this.canvasRef.nativeElement;
    canvas.removeEventListener('click', this.onClick);
    canvas.removeEventListener('mousemove', this.onMouseMove);
  }

  // ────────────────────────────────────────────────────────────────
  // Scene Initialization
  // ────────────────────────────────────────────────────────────────

  private initScene() {
    const canvas = this.canvasRef.nativeElement;
    const W = canvas.clientWidth  || 800;
    const H = canvas.clientHeight || 600;

    // Scene + background
    this.scene = new Scene();
    this.scene.background = new Color(0x1a1a2e);

    // Camera
    this.camera = new PerspectiveCamera(45, W / H, 0.05, 5000);
    this.camera.position.set(20, 15, 20);

    // Renderer
    this.renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(W, H);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;

    // Lighting
    this.scene.add(new AmbientLight(0xffffff, 0.5));
    this.scene.add(new HemisphereLight(0xddeeff, 0x202020, 0.4));
    const sun = new DirectionalLight(0xffffff, 0.9);
    sun.position.set(50, 100, 50);
    sun.castShadow = true;
    this.scene.add(sun);

    // Controls
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 1000;

    // Helpers
    this.grid = new GridHelper(200, 80, 0x444444, 0x333333);
    this.scene.add(this.grid);
    this.axes = new AxesHelper(5);
    this.axes.visible = false;
    this.scene.add(this.axes);

    // Scene groups
    this.scene.add(this.modelGroup);
    this.scene.add(this.markersGroup);

    // Events
    canvas.addEventListener('click', this.onClick);
    canvas.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('resize', this.onResize);

    this.animate();
  }

  private animate() {
    this.animId = requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  // ────────────────────────────────────────────────────────────────
  // Model Loading
  // ────────────────────────────────────────────────────────────────

  private loadModel() {
    const url = this.modelUrl();
    if (!url) { this.loading.set(false); return; }

    const draco = new DRACOLoader();
    // Draco decoder WASM lives at assets/draco/ (see angular.json assets config)
    draco.setDecoderPath('assets/draco/');
    draco.preload();

    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);

    loader.load(
      url,
      (gltf: GLTF) => this.onModelLoaded(gltf),
      undefined,
      (err) => {
        console.error('[GltfViewer] Model load error:', err);
        this.loading.set(false);
      },
    );
  }

  private onModelLoaded(gltf: GLTF) {
    // Center on origin
    const box = new Box3().setFromObject(gltf.scene);
    const center = box.getCenter(new Vector3());
    gltf.scene.position.sub(center);

    // Enable shadows on all meshes
    gltf.scene.traverse((child) => {
      if ((child as any).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this.modelGroup.add(gltf.scene);
    this.fitCamera(box);
    this.extractFloors(gltf.scene);
    this.loading.set(false);
    this.loadComplete.emit();
  }

  private fitCamera(box: Box3) {
    const size = box.getSize(new Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const dist = (maxDim / 2) / Math.tan((this.camera.fov * Math.PI) / 360) * 1.6;
    this.camera.position.set(dist, dist * 0.6, dist);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  private extractFloors(root: Object3D) {
    const floors = new Set<number>([0]);
    root.traverse((child) => {
      const m = child.name.match(/[Bb](\d+)|(\d+)[Ff]|Floor(\d+)/i);
      if (m) floors.add(parseInt(m[1] ?? m[2] ?? m[3]));
    });
    this.floorsExtracted.emit(Array.from(floors).sort((a, b) => a - b));
  }

  // ────────────────────────────────────────────────────────────────
  // Marker Synchronisation
  // ────────────────────────────────────────────────────────────────

  private syncMarkers(markers: DefectMarker3D[]) {
    // Remove stale meshes
    const incomingIds = new Set(markers.map((m) => m._id));
    for (const [id, mesh] of this.markerMeshMap) {
      if (!incomingIds.has(id)) {
        this.markersGroup.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
        this.markerMeshMap.delete(id);
        this.markerDataMap.delete(id);
      }
    }

    // Add / update
    for (const m of markers) {
      this.markerDataMap.set(m._id, m);
      if (this.markerMeshMap.has(m._id)) {
        // Update position & visibility
        const mesh = this.markerMeshMap.get(m._id)!;
        mesh.position.set(m.position.x, m.position.y, m.position.z);
        mesh.visible = m.isVisible;
      } else {
        this.createMarkerMesh(m);
      }
    }

    this.applySeverityFilter(this.activeSeverities());
  }

  private createMarkerMesh(m: DefectMarker3D) {
    const colorHex = SEVERITY_COLOR[m.color] ?? DEFAULT_COLOR;
    const geo = new SphereGeometry(0.25, 16, 12);
    const mat = new MeshBasicMaterial({ color: colorHex });
    const mesh = new Mesh(geo, mat) as unknown as MarkerMesh;

    mesh.position.set(m.position.x, m.position.y, m.position.z);
    mesh.visible = m.isVisible;
    mesh.userData = { markerId: m._id, defectId: m.defectId, severity: m.color };

    this.markersGroup.add(mesh);
    this.markerMeshMap.set(m._id, mesh);
  }

  // ────────────────────────────────────────────────────────────────
  // Filters
  // ────────────────────────────────────────────────────────────────

  private applyFloorFilter(floor: number) {
    this.modelGroup.traverse((child: any) => {
      if (!child.isMesh) return;
      if (floor === 0) { child.visible = true; return; }
      const m = child.name.match(/(\d+)[Ff]|[Ff]loor(\d+)/i);
      child.visible = m ? parseInt(m[1] ?? m[2]) === floor : true;
    });
  }

  private applySeverityFilter(active: Set<string>) {
    for (const [id, mesh] of this.markerMeshMap) {
      const data = this.markerDataMap.get(id);
      if (data) {
        mesh.visible = data.isVisible && active.has(mesh.userData.severity);
      }
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Interaction handlers
  // ────────────────────────────────────────────────────────────────

  private readonly onClick = (e: MouseEvent) => {
    this.updateMouse(e);

    if (this.addMarkerMode()) {
      // Raycast against model geometry
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const hits = this.raycaster.intersectObjects(this.modelGroup.children, true);
      if (hits.length > 0) {
        const hit = hits[0];
        const n = hit.face?.normal ?? null;
        this.markerPlaced.emit({
          coords: { x: hit.point.x, y: hit.point.y, z: hit.point.z },
          normal: n ? { x: n.x, y: n.y, z: n.z } : null,
          meshName: (hit.object as Object3D).name,
        });
      }
      return;
    }

    // Raycast against markers
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObjects([...this.markerMeshMap.values()], false);
    if (hits.length > 0) {
      const mesh = hits[0].object as MarkerMesh;
      this.markerSelect.emit(this.markerDataMap.get(mesh.userData.markerId) ?? null);
    } else {
      this.markerSelect.emit(null);
    }
  };

  private readonly onMouseMove = (e: MouseEvent) => {
    this.updateMouse(e);
    const canvas = this.canvasRef.nativeElement;
    canvas.style.cursor = this.addMarkerMode() ? 'crosshair' : 'grab';

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObjects([...this.markerMeshMap.values()], false);
    if (hits.length > 0) {
      const mesh = hits[0].object as MarkerMesh;
      this.markerHover.emit(this.markerDataMap.get(mesh.userData.markerId) ?? null);
      canvas.style.cursor = 'pointer';
    } else {
      this.markerHover.emit(null);
    }

    const rect = canvas.getBoundingClientRect();
    this.mousePos.emit({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  private updateMouse(e: MouseEvent) {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private readonly onResize = () => {
    const canvas = this.canvasRef.nativeElement;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    this.camera.aspect = W / H;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(W, H);
  };

  // ────────────────────────────────────────────────────────────────
  // Public API (called by parent page)
  // ────────────────────────────────────────────────────────────────

  resetCamera() {
    this.camera.position.set(20, 15, 20);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }
  toggleGrid()     { this.grid.visible  = !this.grid.visible; }
  toggleAxes()     { this.axes.visible  = !this.axes.visible; }
  toggleFullscreen() {
    const el = this.canvasRef.nativeElement.parentElement as any;
    document.fullscreenElement ? document.exitFullscreen() : el?.requestFullscreen?.();
  }
}
