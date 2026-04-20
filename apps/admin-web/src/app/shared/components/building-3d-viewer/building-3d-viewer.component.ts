// apps/admin-web/src/app/shared/components/building-3d-viewer/building-3d-viewer.component.ts
// Three.js WebGL — 3D 건물 모델 위에 결함 마커를 표시하고 회전/확대로 탐색
import {
  Component, Input, OnChanges, AfterViewInit, OnDestroy,
  ElementRef, ViewChild, NgZone, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { gsap } from 'gsap';

export interface DefectMarker3D {
  id: string;
  label: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** 정규화 좌표 (건물 bbox 기준, -1 ~ +1) */
  x: number;
  y: number;
  z: number;
}

const SEVERITY_COLOR: Record<string, number> = {
  LOW:      0x22c55e,
  MEDIUM:   0xf59e0b,
  HIGH:     0xef4444,
  CRITICAL: 0xdc2626,
};

@Component({
  selector: 'ax-building-3d-viewer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="viewer-wrap">
      <canvas #canvas class="viewer-canvas"></canvas>
      <div class="viewer-hint">드래그로 회전 · 스크롤로 확대</div>
      <div class="viewer-legend">
        @for (item of legendItems; track item.label) {
          <span class="legend-dot" [style.background]="item.color"></span>
          <span class="legend-label">{{ item.label }}</span>
        }
      </div>
    </div>
  `,
  styles: [`
    .viewer-wrap {
      position: relative;
      width: 100%;
      height: 340px;
      background: #050c1a;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid rgba(30,80,150,0.32);
    }
    .viewer-canvas { width: 100%; height: 100%; display: block; }
    .viewer-hint {
      position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%);
      font-size: 11px; color: rgba(148,163,184,.5);
      pointer-events: none; white-space: nowrap;
    }
    .viewer-legend {
      position: absolute; top: 8px; right: 8px;
      display: flex; flex-wrap: wrap; gap: 6px 10px;
      align-items: center;
      background: rgba(5,12,26,0.7);
      border-radius: 4px; padding: 4px 8px;
    }
    .legend-dot {
      width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
    }
    .legend-label { font-size: 10px; color: #94a3b8; }
  `],
})
export class Building3dViewerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() markers: DefectMarker3D[] = [];
  @Input() floors = 10;

  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  legendItems = [
    { label: '낮음',  color: '#22c55e' },
    { label: '보통',  color: '#f59e0b' },
    { label: '높음',  color: '#ef4444' },
    { label: '긴급',  color: '#dc2626' },
  ];

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private animId = 0;
  private markerGroup = new THREE.Group();

  private isDragging = false;
  private lastMouse = { x: 0, y: 0 };
  private theta = 0.4;
  private phi   = 0.5;
  private radius = 5;

  constructor(private zone: NgZone) {}

  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => this._init());
  }

  ngOnChanges() {
    if (this.scene) this._rebuildMarkers();
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animId);
    this.renderer?.dispose();
    window.removeEventListener('mouseup', this._onMouseUp);
  }

  private _init() {
    const canvas = this.canvasRef.nativeElement;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(W, H, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x050c1a, 12, 25);

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    this._updateCamera();

    // Lights
    const ambient = new THREE.AmbientLight(0x1e3a5f, 1.5);
    const dir = new THREE.DirectionalLight(0x3b82f6, 2);
    dir.position.set(4, 8, 4);
    dir.castShadow = true;
    this.scene.add(ambient, dir);

    // Grid
    const grid = new THREE.GridHelper(10, 10, 0x1e3a5f, 0x0d1f3c);
    grid.position.y = -0.01;
    this.scene.add(grid);

    // Building floors
    this._buildFloors();

    // Markers
    this.scene.add(this.markerGroup);
    this._rebuildMarkers();

    // Mouse events
    canvas.addEventListener('mousedown', this._onMouseDown);
    canvas.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mouseup', this._onMouseUp);
    canvas.addEventListener('wheel', this._onWheel, { passive: true });

    // Resize
    new ResizeObserver(() => this._onResize()).observe(canvas.parentElement!);

    this._animate();
  }

  private _buildFloors() {
    const floorH = 0.3;
    const gap    = 0.02;
    const W = 1.4, D = 0.9;

    for (let f = 0; f < this.floors; f++) {
      const geo = new THREE.BoxGeometry(W, floorH, D);
      const mat = new THREE.MeshPhongMaterial({
        color: 0x0c1d36,
        emissive: 0x091525,
        transparent: true,
        opacity: 0.92,
        wireframe: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = f * (floorH + gap) + floorH / 2;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      // Edge lines
      const edges = new THREE.EdgesGeometry(geo);
      const line  = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0x1e3a5f }),
      );
      line.position.copy(mesh.position);
      this.scene.add(line);
    }
  }

  private _rebuildMarkers() {
    this.markerGroup.clear();
    const floorH  = 0.3;
    const gap     = 0.02;
    const totalH  = this.floors * (floorH + gap);

    for (const m of this.markers) {
      const color = SEVERITY_COLOR[m.severity] ?? 0x3b82f6;

      // Sphere
      const geo  = new THREE.SphereGeometry(0.06, 16, 16);
      const mat  = new THREE.MeshPhongMaterial({
        color, emissive: color, emissiveIntensity: 0.5,
        transparent: true, opacity: 0.9,
      });
      const sphere = new THREE.Mesh(geo, mat);
      sphere.position.set(
        m.x * 0.7,
        m.y * totalH * 0.5 + totalH * 0.5,
        m.z * 0.45,
      );
      sphere.castShadow = true;

      // Pulse ring (GSAP)
      const ringGeo = new THREE.TorusGeometry(0.1, 0.008, 8, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 });
      const ring    = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(sphere.position);
      ring.rotation.x = Math.PI / 2;

      gsap.to(ring.scale, {
        x: 2.5, y: 2.5, z: 2.5, duration: 1.2,
        repeat: -1, yoyo: false, ease: 'power1.out',
        onUpdate: () => { ringMat.opacity = 0.7 * (1 - (ring.scale.x - 1) / 1.5); },
      });

      this.markerGroup.add(sphere, ring);
    }
  }

  private _animate = () => {
    this.animId = requestAnimationFrame(this._animate);
    this.renderer.render(this.scene, this.camera);
  };

  private _updateCamera() {
    this.camera.position.set(
      this.radius * Math.sin(this.theta) * Math.cos(this.phi),
      this.radius * Math.sin(this.phi),
      this.radius * Math.cos(this.theta) * Math.cos(this.phi),
    );
    this.camera.lookAt(0, 1.5, 0);
  }

  private _onMouseDown = (e: MouseEvent) => {
    this.isDragging = true;
    this.lastMouse = { x: e.clientX, y: e.clientY };
  };

  private _onMouseMove = (e: MouseEvent) => {
    if (!this.isDragging) return;
    const dx = e.clientX - this.lastMouse.x;
    const dy = e.clientY - this.lastMouse.y;
    this.theta -= dx * 0.006;
    this.phi    = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, this.phi + dy * 0.004));
    this.lastMouse = { x: e.clientX, y: e.clientY };
    this._updateCamera();
  };

  private _onMouseUp = () => { this.isDragging = false; };

  private _onWheel = (e: WheelEvent) => {
    this.radius = Math.max(2, Math.min(12, this.radius + e.deltaY * 0.005));
    this._updateCamera();
  };

  private _onResize() {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    this.renderer.setSize(W, H, false);
    this.camera.aspect = W / H;
    this.camera.updateProjectionMatrix();
  }
}
