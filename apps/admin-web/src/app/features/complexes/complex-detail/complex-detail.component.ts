import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';

import { ComplexesService, Complex } from '../../../core/api/complexes.service';
import { BuildingsService, Building, CreateBuildingDto } from '../../../core/api/buildings.service';
import { FloorsService, Floor, CreateFloorDto } from '../../../core/api/floors.service';
import { ZonesService, Zone, CreateZoneDto } from '../../../core/api/zones.service';
import { ComplexesApi } from '../data-access/complexes.api';
import { ComplexFormComponent } from '../complex-form/complex-form.component';
import { BuildingFormComponent } from '../../buildings/building-form/building-form.component';
import { FloorFormComponent } from '../../floors/floor-form/floor-form.component';
import { ZoneFormComponent } from '../../zones/zone-form/zone-form.component';

@Component({
  selector: 'ax-complex-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatExpansionModule, MatTableModule, MatFormFieldModule, MatInputModule,
    MatDialogModule, MatSnackBarModule, MatTooltipModule,
    MatProgressSpinnerModule, MatDividerModule,
  ],
  template: `
    <!-- 네비게이션 브레드크럼 -->
    <div class="breadcrumb">
      <a routerLink="/complexes" class="breadcrumb-link">단지 관리</a>
      <mat-icon>chevron_right</mat-icon>
      <span>{{ complex()?.name ?? '...' }}</span>
    </div>

    @if (loading()) {
      <div class="loading-center"><mat-spinner diameter="48"/></div>
    }

    @if (complex(); as c) {
      <!-- 단지 정보 카드 -->
      <mat-card class="info-card">
        <mat-card-header>
          <mat-icon mat-card-avatar>apartment</mat-icon>
          <mat-card-title>{{ c.name }}</mat-card-title>
          <mat-card-subtitle>{{ c.address }}</mat-card-subtitle>
          <div class="card-actions">
            <button mat-stroked-button (click)="editComplex()">
              <mat-icon>edit</mat-icon> 수정
            </button>
          </div>
        </mat-card-header>
        <mat-card-content>
          <div class="info-grid">
            <div class="info-item"><span class="label">동수</span><span>{{ c.totalBuildings }}동</span></div>
            <div class="info-item"><span class="label">세대수</span><span>{{ c.totalUnits }}세대</span></div>
            <div class="info-item"><span class="label">준공연도</span><span>{{ c.builtYear }}년</span></div>
            <div class="info-item"><span class="label">좌표</span>
              <span>{{ c.latitude ?? '-' }}, {{ c.longitude ?? '-' }}</span>
            </div>
          </div>
          @if (c.tags?.length) {
            <mat-chip-set class="tags">
              @for (tag of c.tags; track tag) { <mat-chip>{{ tag }}</mat-chip> }
            </mat-chip-set>
          }
        </mat-card-content>
      </mat-card>

      <!-- 동(Building) 섹션 -->
      <div class="section-header">
        <h3><mat-icon>domain</mat-icon> 동 목록 ({{ buildings().length }})</h3>
        <button mat-raised-button color="primary" (click)="openBuildingForm()">
          <mat-icon>add</mat-icon> 동 추가
        </button>
      </div>

      @for (building of buildings(); track building._id) {
        <mat-expansion-panel class="building-panel"
                             (opened)="onBuildingOpen(building._id)">
          <mat-expansion-panel-header>
            <mat-panel-title>
              <mat-icon>home_work</mat-icon>
              <strong>{{ building.name }}</strong>
              <span class="panel-meta">{{ building.code }}</span>
            </mat-panel-title>
            <mat-panel-description>
              지상 {{ building.totalFloors }}층 / 지하 {{ building.undergroundFloors }}층 /
              {{ building.totalUnits }}세대 / {{ building.structureType }}
            </mat-panel-description>
            <div class="panel-actions" (click)="$event.stopPropagation()">
              <button mat-icon-button matTooltip="수정"
                      (click)="openBuildingForm(building)">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button color="warn" matTooltip="삭제"
                      (click)="deleteBuilding(building)">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </mat-expansion-panel-header>

          <!-- 층 목록 -->
          <div class="floors-section">
            <div class="sub-header">
              <span>층 목록 ({{ (floorMap()[building._id] ?? []).length }})</span>
              <button mat-stroked-button size="small"
                      (click)="openFloorForm(building)">
                <mat-icon>add</mat-icon> 층 추가
              </button>
            </div>

            @for (floor of (floorMap()[building._id] ?? []); track floor._id) {
              <mat-expansion-panel class="floor-panel"
                                   (opened)="onFloorOpen(floor._id)">
                <mat-expansion-panel-header>
                  <mat-panel-title>
                    <strong>{{ floor.floorName }}</strong>
                    <span class="panel-meta">{{ floor.area }}㎡</span>
                  </mat-panel-title>
                  <div class="panel-actions" (click)="$event.stopPropagation()">
                    <button mat-icon-button matTooltip="수정"
                            (click)="openFloorForm(building, floor)">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button color="warn" matTooltip="삭제"
                            (click)="deleteFloor(floor)">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </mat-expansion-panel-header>

                <!-- 구역 목록 -->
                <div class="zones-section">
                  <div class="sub-header">
                    <span>구역 ({{ (zoneMap()[floor._id] ?? []).length }})</span>
                    <button mat-stroked-button size="small"
                            (click)="openZoneForm(building, floor)">
                      <mat-icon>add</mat-icon> 구역 추가
                    </button>
                  </div>
                  <table mat-table [dataSource]="zoneMap()[floor._id] ?? []"
                         class="zone-table">
                    <ng-container matColumnDef="name">
                      <th mat-header-cell *matHeaderCellDef>구역명</th>
                      <td mat-cell *matCellDef="let z">{{ z.name }}</td>
                    </ng-container>
                    <ng-container matColumnDef="code">
                      <th mat-header-cell *matHeaderCellDef>코드</th>
                      <td mat-cell *matCellDef="let z">{{ z.code }}</td>
                    </ng-container>
                    <ng-container matColumnDef="description">
                      <th mat-header-cell *matHeaderCellDef>설명</th>
                      <td mat-cell *matCellDef="let z">{{ z.description ?? '-' }}</td>
                    </ng-container>
                    <ng-container matColumnDef="actions">
                      <th mat-header-cell *matHeaderCellDef></th>
                      <td mat-cell *matCellDef="let z">
                        <button mat-icon-button matTooltip="수정"
                                (click)="openZoneForm(building, floor, z)">
                          <mat-icon>edit</mat-icon>
                        </button>
                        <button mat-icon-button color="warn" matTooltip="삭제"
                                (click)="deleteZone(z)">
                          <mat-icon>delete</mat-icon>
                        </button>
                      </td>
                    </ng-container>
                    <tr mat-header-row *matHeaderRowDef="zoneColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: zoneColumns;"></tr>
                    <tr class="mat-row" *matNoDataRow>
                      <td colspan="4" class="empty-row">등록된 구역 없음</td>
                    </tr>
                  </table>
                </div>
              </mat-expansion-panel>
            }

            @if (!(floorMap()[building._id]?.length)) {
              <div class="empty-row">층 정보가 없습니다. 층 추가 버튼으로 등록하세요.</div>
            }
          </div>
        </mat-expansion-panel>
      }

      @if (!buildings().length) {
        <mat-card class="empty-card">
          <mat-icon>domain_disabled</mat-icon>
          <p>등록된 동이 없습니다.</p>
          <button mat-raised-button color="primary" (click)="openBuildingForm()">
            첫 번째 동 추가
          </button>
        </mat-card>
      }
    }
  `,
  styles: [`
    .breadcrumb { display: flex; align-items: center; gap: 4px; margin-bottom: 20px;
                  font-size: 14px; color: #666; }
    .breadcrumb-link { color: #1565c0; text-decoration: none; }
    .breadcrumb-link:hover { text-decoration: underline; }
    .loading-center { display: flex; justify-content: center; padding: 64px; }
    .info-card { margin-bottom: 24px; }
    .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; padding: 8px 0; }
    .info-item { display: flex; flex-direction: column; }
    .label { font-size: 12px; color: #999; }
    .tags { margin-top: 12px; }
    .card-actions { margin-left: auto; }
    .section-header { display: flex; justify-content: space-between; align-items: center;
                      margin: 24px 0 12px; }
    .section-header h3 { display: flex; align-items: center; gap: 8px; margin: 0; }
    .building-panel { margin-bottom: 8px; }
    .floor-panel { margin: 4px 0; }
    .panel-meta { margin-left: 8px; font-size: 12px; color: #999; }
    .panel-actions { display: flex; gap: 4px; }
    .floors-section, .zones-section { padding: 8px; }
    .sub-header { display: flex; justify-content: space-between; align-items: center;
                  margin-bottom: 8px; font-size: 14px; font-weight: 500; }
    .zone-table { width: 100%; font-size: 13px; }
    .empty-row { padding: 12px; color: #999; text-align: center; font-size: 13px; }
    .empty-card { text-align: center; padding: 48px; color: #999; }
    .empty-card mat-icon { font-size: 48px; height: 48px; width: 48px; }
    mat-expansion-panel-header { padding-right: 8px; }
  `],
})
export class ComplexDetailComponent implements OnInit {
  private readonly route       = inject(ActivatedRoute);
  private readonly dialog      = inject(MatDialog);
  private readonly snack       = inject(MatSnackBar);
  private readonly complexApi  = inject(ComplexesApi);
  private readonly complexSvc  = inject(ComplexesService);
  private readonly buildingSvc = inject(BuildingsService);
  private readonly floorSvc    = inject(FloorsService);
  private readonly zoneSvc     = inject(ZonesService);

  loading   = signal(true);
  complex   = signal<Complex | null>(null);
  buildings = signal<Building[]>([]);
  // 동 ID → floors / 층 ID → zones (pre-populated from tree endpoint)
  floorMap  = signal<Record<string, Floor[]>>({});
  zoneMap   = signal<Record<string, Zone[]>>({});

  zoneColumns = ['name', 'code', 'description', 'actions'];

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('complexId')!;
    this.loadTree(id);
  }

  /** Use tree endpoint to pre-load entire hierarchy in one request */
  loadTree(complexId: string) {
    this.loading.set(true);
    this.complexApi.getComplexTree(complexId).subscribe({
      next: (tree) => {
        this.complex.set(tree);
        this.buildings.set(tree.buildings as any[]);

        // Pre-populate floorMap and zoneMap from tree
        const newFloorMap: Record<string, Floor[]> = {};
        const newZoneMap: Record<string, Zone[]> = {};
        for (const b of tree.buildings) {
          newFloorMap[b._id] = b.floors as any[];
          for (const f of b.floors) {
            newZoneMap[f._id] = f.zones;
          }
        }
        this.floorMap.set(newFloorMap);
        this.zoneMap.set(newZoneMap);
        this.loading.set(false);
      },
      error: () => {
        // Fallback: load complex + buildings separately
        this.complexSvc.get(complexId).subscribe((c) => {
          this.complex.set(c);
          this.loadBuildings(c._id);
        });
      },
    });
  }

  load(id: string) { this.loadTree(id); }

  loadBuildings(complexId: string) {
    this.buildingSvc.listByComplex(complexId).subscribe((bs) => {
      this.buildings.set(bs);
      this.loading.set(false);
    });
  }

  // 패널 열릴 때: tree에서 이미 로드됐으면 skip, 아니면 lazy load
  onBuildingOpen(buildingId: string) {
    if (this.floorMap()[buildingId] !== undefined) return;
    this.floorSvc.listByBuilding(buildingId).subscribe((floors) => {
      this.floorMap.update((m) => ({ ...m, [buildingId]: floors }));
    });
  }

  onFloorOpen(floorId: string) {
    if (this.zoneMap()[floorId] !== undefined) return;
    this.zoneSvc.listByFloor(floorId).subscribe((zones) => {
      this.zoneMap.update((m) => ({ ...m, [floorId]: zones }));
    });
  }

  // ── 단지 편집 ───────────────────────────────────────────────────
  editComplex() {
    this.dialog.open(ComplexFormComponent, {
      width: '600px', data: this.complex(),
    }).afterClosed().subscribe((saved) => {
      if (saved) this.complex.set(saved);
    });
  }

  // ── 동 CRUD ─────────────────────────────────────────────────────
  openBuildingForm(building?: Building) {
    this.dialog.open(BuildingFormComponent, {
      width: '600px',
      data: { building: building ?? null, complexId: this.complex()?._id },
    }).afterClosed().subscribe((saved) => {
      if (saved) this.loadBuildings(this.complex()!._id);
    });
  }

  deleteBuilding(b: Building) {
    if (!confirm(`"${b.name}" 동을 삭제하시겠습니까?`)) return;
    this.buildingSvc.delete(b._id).subscribe({
      next: () => {
        this.snack.open('삭제되었습니다.', '닫기', { duration: 2500 });
        this.loadBuildings(this.complex()!._id);
      },
      error: (e) => this.snack.open(e.error?.message ?? '삭제 실패', '닫기', { duration: 3000 }),
    });
  }

  // ── 층 CRUD ─────────────────────────────────────────────────────
  openFloorForm(building: Building, floor?: Floor) {
    this.dialog.open(FloorFormComponent, {
      width: '480px',
      data: { floor: floor ?? null, buildingId: building._id, complexId: building.complexId },
    }).afterClosed().subscribe((saved) => {
      if (saved) {
        this.floorMap.update((m) => ({ ...m, [building._id]: undefined as any }));
        this.onBuildingOpen(building._id);
      }
    });
  }

  deleteFloor(f: Floor) {
    if (!confirm(`"${f.floorName}" 층을 삭제하시겠습니까?`)) return;
    this.floorSvc.delete(f._id).subscribe({
      next: () => {
        this.snack.open('삭제되었습니다.', '닫기', { duration: 2500 });
        this.floorMap.update((m) => ({
          ...m, [f.buildingId]: (m[f.buildingId] ?? []).filter((x) => x._id !== f._id),
        }));
      },
      error: (e) => this.snack.open(e.error?.message ?? '삭제 실패', '닫기', { duration: 3000 }),
    });
  }

  // ── 구역 CRUD ────────────────────────────────────────────────────
  openZoneForm(building: Building, floor: Floor, zone?: Zone) {
    this.dialog.open(ZoneFormComponent, {
      width: '480px',
      data: {
        zone: zone ?? null,
        floorId: floor._id,
        buildingId: building._id,
        complexId: building.complexId,
      },
    }).afterClosed().subscribe((saved) => {
      if (saved) {
        this.zoneMap.update((m) => ({ ...m, [floor._id]: undefined as any }));
        this.onFloorOpen(floor._id);
      }
    });
  }

  deleteZone(z: Zone) {
    if (!confirm(`"${z.name}" 구역을 삭제하시겠습니까?`)) return;
    this.zoneSvc.delete(z._id).subscribe({
      next: () => {
        this.snack.open('삭제되었습니다.', '닫기', { duration: 2500 });
        this.zoneMap.update((m) => ({
          ...m, [z.floorId]: (m[z.floorId] ?? []).filter((x) => x._id !== z._id),
        }));
      },
      error: (e) => this.snack.open(e.error?.message ?? '삭제 실패', '닫기', { duration: 3000 }),
    });
  }
}
