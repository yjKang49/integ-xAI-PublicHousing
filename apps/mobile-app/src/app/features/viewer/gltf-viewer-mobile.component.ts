// apps/mobile-app/src/app/features/viewer/gltf-viewer-mobile.component.ts
/**
 * GltfViewerMobileComponent
 *
 * Lightweight Three.js glTF viewer for mobile (Ionic/Capacitor).
 * Read-only — no marker placement, no grid/axes toggle.
 * Renders markers as colored spheres; tap to select.
 *
 * Touch controls: OrbitControls (pinch-to-zoom, drag-to-orbit).
 */
import {
  Component, ElementRef, OnDestroy, OnInit,
  input, output, effect, ChangeDetectionStrategy,
} from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { DefectMarker3D, SEVERITY_MARKER_COLOR } from '@ax/shared';

@Component({
  selector: 'ax-gltf-viewer-mobile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas #canvas style="display:block;width:100%;height:100%"></canvas>`,
  styles: [':host { display: block; width: 100%; height: 100%; }'],
})
export class GltfViewerMobileComponent implements OnInit, OnDestroy {
  // ── Inputs ─────────────────────────────────────────────────────
  readonly modelUrl        = input.required<string>();
  readonly markers         = input<DefectMarker3D[]>([]);
  readonly selectedFloor   = input<number>(0);
  readonly activeSeverities = input<Set<string>>(new Set());

  // ── Outputs ────────────────────────────────────────────────────
  readonly markerSelect  = output<DefectMarker3D | null>();
  readonly loadComplete  = output<void>();
  readonly loadError     = output<string>();

  // ── Three.js internals ─────────────────────────────────────────
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private animFrameId = 0;
  private readonly markerMeshMap = new Map<string, THREE.Mesh>();
  private modelGroup: THREE.Group | null = null;

  constructor(private readonly host: ElementRef<HTMLElement>) {
    // React to marker changes
    effect(() => this.syncMarkers(this.markers()));
    effect(() => this.applyFloorFilter(this.selectedFloor()));
    effect(() => this.applySeverityFilter(this.activeSeverities()));
  }

  ngOnInit() {
    this.initThree();
    this.loadModel(this.modelUrl());
    this.startLoop();
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animFrameId);
    this.controls?.dispose();
    this.renderer?.dispose();
  }

  // ── Three.js setup ─────────────────────────────────────────────

  private initThree() {
    const canvas = this.host.nativeElement.querySelector('canvas') as HTMLCanvasElement;
    const w = canvas.clientWidth || 400;
    const h = canvas.clientHeight || 600;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = false; // perf on mobile

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const dir = new THREE.DirectionalLight(0xffffff, 1.5);
    dir.position.set(10, 20, 10);
    this.scene.add(dir);

    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
    this.camera.position.set(0, 15, 25);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.enablePan = true;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 200;

    // Handle resize (e.g. device rotation)
    const ro = new ResizeObserver(() => {
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      this.renderer.setSize(cw, ch);
      this.camera.aspect = cw / ch;
      this.camera.updateProjectionMatrix();
    });
    ro.observe(this.host.nativeElement);

    // Tap to select marker
    canvas.addEventListener('click', (e) => this.onTap(e, canvas));
  }

  private loadModel(url: string) {
    if (!url) return;

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('assets/draco/');

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    loader.load(
      url,
      (gltf) => {
        if (this.modelGroup) this.scene.remove(this.modelGroup);
        this.modelGroup = gltf.scene;
        this.scene.add(this.modelGroup);
        this.fitCamera();
        this.applyFloorFilter(this.selectedFloor());
        this.loadComplete.emit();
      },
      undefined,
      (err) => this.loadError.emit(String(err)),
    );
  }

  private fitCamera() {
    if (!this.modelGroup) return;
    const box = new THREE.Box3().setFromObject(this.modelGroup);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    this.camera.position.set(center.x, center.y + maxDim, center.z + maxDim * 1.5);
    this.controls.target.copy(center);
    this.controls.update();
  }

  private startLoop() {
    const tick = () => {
      this.animFrameId = requestAnimationFrame(tick);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    tick();
  }

  // ── Marker management ──────────────────────────────────────────

  private syncMarkers(list: DefectMarker3D[]) {
    const incoming = new Set(list.map((m) => m._id));

    // Remove stale
    for (const [id, mesh] of this.markerMeshMap) {
      if (!incoming.has(id)) {
        this.scene.remove(mesh);
        this.markerMeshMap.delete(id);
      }
    }

    // Add new
    for (const m of list) {
      if (!this.markerMeshMap.has(m._id)) {
        const mesh = this.createMarkerMesh(m);
        this.scene.add(mesh);
        this.markerMeshMap.set(m._id, mesh);
      }
    }

    this.applySeverityFilter(this.activeSeverities());
  }

  private createMarkerMesh(m: DefectMarker3D): THREE.Mesh {
    const color = m.color ?? (SEVERITY_MARKER_COLOR as Record<string, string>)[m.severity ?? ''] ?? '#ff9800';
    const geo = new THREE.SphereGeometry(0.3, 12, 8);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color) });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(m.position.x, m.position.y, m.position.z);
    mesh.userData['marker'] = m;
    return mesh;
  }

  private applyFloorFilter(floor: number) {
    if (!this.modelGroup) return;
    this.modelGroup.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const name = obj.name ?? '';
      if (floor === 0) {
        obj.visible = true;
        return;
      }
      const match = name.match(/(\d+)[Ff]|Floor(\d+)/i);
      const meshFloor = match ? parseInt(match[1] ?? match[2], 10) : null;
      obj.visible = meshFloor === null || meshFloor === floor;
    });
  }

  private applySeverityFilter(active: Set<string>) {
    for (const [, mesh] of this.markerMeshMap) {
      const m = mesh.userData['marker'] as DefectMarker3D;
      mesh.visible = !m.severity || active.size === 0 || active.has(m.severity);
    }
  }

  // ── Tap picking ────────────────────────────────────────────────

  private onTap(event: MouseEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, this.camera);

    const meshes = [...this.markerMeshMap.values()];
    const hits = raycaster.intersectObjects(meshes, false);
    if (hits.length > 0) {
      this.markerSelect.emit(hits[0].object.userData['marker'] as DefectMarker3D);
    } else {
      this.markerSelect.emit(null);
    }
  }

  /** Public: reset camera to fit model */
  resetCamera() { this.fitCamera(); }
}
