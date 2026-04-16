import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDialogModule, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Defect, DefectType, SeverityLevel } from '@ax/shared';
import { DefectsService } from '../../../core/api/defects.service';
import { ComplexesService, Complex } from '../../../core/api/complexes.service';
import { BuildingsService, Building } from '../../../core/api/buildings.service';
import { environment } from '../../../../environments/environment';
import {
  PageHeaderComponent,
  StatusBadgeComponent,
  EmptyStateComponent,
  SkeletonComponent,
  severityToVariant,
} from '../../../shared/components';

const SEVERITY_CONFIG: Record<string, { label: string; icon: string; tokenColor: string }> = {
  LOW:      { label: '낮음', icon: 'check_circle',   tokenColor: 'var(--ax-color-success, #16a34a)' },
  MEDIUM:   { label: '보통', icon: 'warning_amber',  tokenColor: '#d97706' },
  HIGH:     { label: '높음', icon: 'report_problem', tokenColor: '#c2410c' },
  CRITICAL: { label: '긴급', icon: 'dangerous',      tokenColor: 'var(--ax-color-danger, #dc2626)' },
};

const DEFECT_TYPE_LABELS: Record<string, string> = {
  CRACK: '균열', LEAK: '누수', SPALLING: '박리/박락',
  CORROSION: '부식', EFFLORESCENCE: '백태',
  DEFORMATION: '변형', SETTLEMENT: '침하', OTHER: '기타',
};

// ── 결함 등록 다이얼로그 ──────────────────────────────────────────────────────

interface PendingFile {
  id: string;
  file: File;
  previewUrl: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
}

@Component({
  selector: 'ax-create-defect-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatProgressBarModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon style="vertical-align:middle;margin-right:8px;color:var(--ax-color-danger)">report_problem</mat-icon>
      결함 등록
    </h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="ax-df-form">

        <div class="ax-df-row">
          <mat-form-field appearance="outline" class="ax-df-field">
            <mat-label>단지 *</mat-label>
            <mat-select formControlName="complexId" (selectionChange)="onComplexChange($event.value)">
              @for (c of complexes; track c._id) {
                <mat-option [value]="c._id">{{ c.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="ax-df-field">
            <mat-label>건물 *</mat-label>
            <mat-select formControlName="buildingId">
              @if (buildings.length === 0) {
                <mat-option disabled>단지를 먼저 선택하세요</mat-option>
              }
              @for (b of buildings; track b._id) {
                <mat-option [value]="b._id">{{ b.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        <div class="ax-df-row">
          <mat-form-field appearance="outline" class="ax-df-field">
            <mat-label>결함 유형 *</mat-label>
            <mat-select formControlName="defectType">
              @for (t of defectTypeOpts; track t.value) {
                <mat-option [value]="t.value">{{ t.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="ax-df-field">
            <mat-label>심각도 *</mat-label>
            <mat-select formControlName="severity">
              @for (s of severityOpts; track s.value) {
                <mat-option [value]="s.value">{{ s.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>위치 설명 *</mat-label>
          <input matInput formControlName="locationDescription"
                 placeholder="예) 101동 B1 계단실 동쪽 벽면">
        </mat-form-field>

        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>결함 상세 설명 *</mat-label>
          <textarea matInput formControlName="description" rows="3"
                    placeholder="균열 패턴, 누수 범위, 부식 정도 등 구체적으로 입력하세요"></textarea>
        </mat-form-field>

        <div class="ax-df-row">
          <mat-form-field appearance="outline" class="ax-df-field">
            <mat-label>폭 (mm)</mat-label>
            <input matInput type="number" formControlName="widthMm" min="0">
          </mat-form-field>
          <mat-form-field appearance="outline" class="ax-df-field">
            <mat-label>길이 (mm)</mat-label>
            <input matInput type="number" formControlName="lengthMm" min="0">
          </mat-form-field>
          <mat-form-field appearance="outline" class="ax-df-field">
            <mat-label>깊이 (mm)</mat-label>
            <input matInput type="number" formControlName="depthMm" min="0">
          </mat-form-field>
        </div>

        <!-- 사진 첨부 -->
        <div class="ax-df-photo-label">
          <mat-icon>photo_camera</mat-icon>
          <span>사진 첨부</span>
          <span class="ax-df-photo-note">선택사항 · JPG, PNG, HEIC · 최대 10MB</span>
        </div>

        <div class="ax-df-dropzone"
             [class.ax-df-dropzone--over]="isDragOver()"
             (dragover)="onDragOver($event)"
             (dragleave)="onDragLeave($event)"
             (drop)="onDrop($event)"
             (click)="fileInput.click()">
          <mat-icon class="ax-df-dropzone__icon">cloud_upload</mat-icon>
          <span class="ax-df-dropzone__text">파일을 드래그하거나 클릭하여 첨부</span>
        </div>
        <input #fileInput type="file" accept="image/*" multiple style="display:none"
               (change)="onFilesSelected($event)">

        @if (pendingFiles().length > 0) {
          <div class="ax-df-file-queue">
            @for (f of pendingFiles(); track f.id) {
              <div class="ax-df-file-item">
                <img [src]="f.previewUrl" class="ax-df-thumb" alt="">
                <div class="ax-df-file-info">
                  <span class="ax-df-file-name">{{ f.file.name }}</span>
                  <span class="ax-df-file-size">{{ formatFileSize(f.file.size) }}</span>
                </div>
                <div class="ax-df-file-action">
                  @switch (f.status) {
                    @case ('pending') {
                      <button mat-icon-button class="ax-df-remove-btn"
                              (click)="removeFile(f.id); $event.stopPropagation()">
                        <mat-icon>close</mat-icon>
                      </button>
                    }
                    @case ('uploading') {
                      <mat-spinner diameter="20" />
                    }
                    @case ('done') {
                      <mat-icon class="ax-df-status-done">check_circle</mat-icon>
                    }
                    @case ('error') {
                      <mat-icon class="ax-df-status-error">error</mat-icon>
                    }
                  }
                </div>
              </div>
            }
          </div>
        }

      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button mat-dialog-close>취소</button>
      <button mat-raised-button color="warn"
              [disabled]="form.invalid || saving"
              (click)="submit()">
        @if (saving) {
          <mat-spinner diameter="16" style="display:inline-block;margin-right:6px" />
        } @else {
          <mat-icon>add</mat-icon>
        }
        등록
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .ax-df-form { display: flex; flex-direction: column; gap: 4px; min-width: 540px; padding-top: 4px; }
    .ax-df-row  { display: flex; gap: 12px; }
    .ax-df-field { flex: 1; min-width: 0; }
    mat-dialog-content { max-height: 78vh; }

    /* Photo section */
    .ax-df-photo-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      color: var(--ax-color-text-secondary);
      margin-top: 4px;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }
    .ax-df-photo-note {
      font-size: 11px;
      font-weight: 400;
      color: var(--ax-color-text-tertiary, #9ca3af);
      margin-left: 2px;
    }

    /* Drop zone */
    .ax-df-dropzone {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 20px 16px;
      border: 2px dashed var(--ax-color-border-default);
      border-radius: var(--ax-radius-lg);
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
      background: var(--ax-color-bg-surface);
      margin-top: 4px;

      &:hover, &--over {
        background: rgba(29, 66, 137, 0.04);
        border-color: var(--ax-color-brand-primary);
      }
      &--over { background: rgba(29, 66, 137, 0.08); }
    }
    .ax-df-dropzone__icon {
      font-size: 32px; width: 32px; height: 32px;
      color: var(--ax-color-text-tertiary, #9ca3af);
    }
    .ax-df-dropzone__text {
      font-size: 13px;
      color: var(--ax-color-text-secondary);
    }

    /* File queue */
    .ax-df-file-queue {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 8px;
      max-height: 200px;
      overflow-y: auto;
    }
    .ax-df-file-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 10px;
      border: 1px solid var(--ax-color-border);
      border-radius: 8px;
      background: var(--ax-color-bg-surface);
    }
    .ax-df-thumb {
      width: 40px;
      height: 40px;
      object-fit: cover;
      border-radius: 4px;
      flex-shrink: 0;
      background: var(--ax-color-bg-surface-alt);
    }
    .ax-df-file-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .ax-df-file-name {
      font-size: 13px;
      font-weight: 500;
      color: var(--ax-color-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .ax-df-file-size {
      font-size: 11px;
      color: var(--ax-color-text-tertiary, #9ca3af);
    }
    .ax-df-file-action {
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }
    .ax-df-remove-btn { width: 28px; height: 28px; line-height: 28px; mat-icon { font-size: 16px; } }
    .ax-df-status-done { color: var(--ax-color-success, #22c55e); font-size: 20px; width: 20px; height: 20px; }
    .ax-df-status-error { color: var(--ax-color-danger, #ef4444); font-size: 20px; width: 20px; height: 20px; }
  `],
})
export class CreateDefectDialogComponent implements OnInit {
  private readonly fb           = inject(FormBuilder);
  private readonly http         = inject(HttpClient);
  private readonly complexesSvc = inject(ComplexesService);
  private readonly buildingsSvc = inject(BuildingsService);
  readonly dialogRef = inject(MatDialogRef<CreateDefectDialogComponent>);

  form = this.fb.group({
    complexId:           ['', Validators.required],
    buildingId:          ['', Validators.required],
    defectType:          ['', Validators.required],
    severity:            ['', Validators.required],
    locationDescription: ['', [Validators.required, Validators.maxLength(500)]],
    description:         ['', [Validators.required, Validators.maxLength(1000)]],
    widthMm:  [null as number | null],
    lengthMm: [null as number | null],
    depthMm:  [null as number | null],
  });

  complexes: Complex[] = [];
  buildings: Building[] = [];
  saving = false;

  readonly pendingFiles = signal<PendingFile[]>([]);
  readonly isDragOver   = signal(false);

  readonly defectTypeOpts = Object.entries(DEFECT_TYPE_LABELS).map(([value, label]) => ({ value, label }));
  readonly severityOpts = [
    { value: 'LOW',      label: '낮음' },
    { value: 'MEDIUM',   label: '보통' },
    { value: 'HIGH',     label: '높음' },
    { value: 'CRITICAL', label: '긴급' },
  ];

  ngOnInit() {
    this.complexesSvc.list().subscribe((list) => (this.complexes = list));
  }

  onComplexChange(complexId: string) {
    this.buildings = [];
    this.form.patchValue({ buildingId: '' });
    if (!complexId) return;
    this.buildingsSvc.listByComplex(complexId).subscribe((list) => (this.buildings = list));
  }

  // ── File handling ─────────────────────────────────────────

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.addFiles(Array.from(input.files));
      input.value = '';
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
    const files = Array.from(event.dataTransfer?.files ?? []).filter((f) =>
      f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name)
    );
    if (files.length) this.addFiles(files);
  }

  private addFiles(files: File[]) {
    const newItems: PendingFile[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'pending',
    }));
    this.pendingFiles.update((prev) => [...prev, ...newItems]);
  }

  removeFile(id: string) {
    const item = this.pendingFiles().find((f) => f.id === id);
    if (item) URL.revokeObjectURL(item.previewUrl);
    this.pendingFiles.update((list) => list.filter((f) => f.id !== id));
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ── Submit ────────────────────────────────────────────────

  submit() {
    if (this.form.invalid) return;
    this.saving = true;
    const v = this.form.value;
    const dto: Record<string, any> = {
      complexId:           v.complexId!,
      buildingId:          v.buildingId!,
      defectType:          v.defectType!,
      severity:            v.severity!,
      locationDescription: v.locationDescription!,
      description:         v.description!,
      sessionId:  '',
      projectId:  '',
    };
    if (v.widthMm  != null) dto['widthMm']  = v.widthMm;
    if (v.lengthMm != null) dto['lengthMm'] = v.lengthMm;
    if (v.depthMm  != null) dto['depthMm']  = v.depthMm;

    this.http.post<any>(`${environment.apiUrl}/defects`, dto).subscribe({
      next: async (res) => {
        const defect = res.data ?? res;
        const files = this.pendingFiles();
        let mediaIds: string[] = [];
        if (files.length > 0) {
          mediaIds = await this.uploadAllFiles(defect._id, v.complexId!);
        }
        files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
        this.dialogRef.close({ ...defect, mediaIds });
      },
      error: () => { this.saving = false; },
    });
  }

  private async uploadAllFiles(defectId: string, complexId: string): Promise<string[]> {
    const collectedIds: string[] = [];
    for (const f of this.pendingFiles()) {
      this.pendingFiles.update((list) =>
        list.map((x) => x.id === f.id ? { ...x, status: 'uploading' } : x)
      );
      const fd = new FormData();
      fd.append('file', f.file);
      fd.append('entityType', 'defect');
      fd.append('entityId', defectId);
      fd.append('complexId', complexId);
      try {
        const res = await lastValueFrom(this.http.post<any>(`${environment.apiUrl}/media/upload/direct`, fd));
        const media = res.data ?? res;
        if (media._id) collectedIds.push(media._id);
        this.pendingFiles.update((list) =>
          list.map((x) => x.id === f.id ? { ...x, status: 'done' } : x)
        );
      } catch {
        this.pendingFiles.update((list) =>
          list.map((x) => x.id === f.id ? { ...x, status: 'error' } : x)
        );
      }
    }
    // Link collected mediaIds back to the defect document
    if (collectedIds.length > 0) {
      try {
        await lastValueFrom(
          this.http.patch<any>(`${environment.apiUrl}/defects/${encodeURIComponent(defectId)}`, { mediaIds: collectedIds })
        );
      } catch { /* non-fatal */ }
    }
    return collectedIds;
  }
}

// ── 결함 목록 컴포넌트 ──────────────────────────────────────────────────────

@Component({
  selector: 'ax-defect-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatTableModule, MatPaginatorModule,
    MatSelectModule, MatInputModule, MatFormFieldModule,
    MatButtonModule, MatIconModule,
    MatTooltipModule, MatSnackBarModule,
    MatDatepickerModule, MatNativeDateModule,
    MatDialogModule,
    PageHeaderComponent, StatusBadgeComponent, EmptyStateComponent, SkeletonComponent,
  ],
  template: `
    <ax-page-header
      title="결함 목록"
      description="시설물 결함 발생 현황 및 조치 이력 관리"
      icon="report_problem"
      [meta]="'전체 ' + totalCount() + '건'">
      <button mat-raised-button color="warn" ax-page-actions (click)="openCreateDialog()">
        <mat-icon>add</mat-icon> 결함 등록
      </button>
    </ax-page-header>

    <!-- Severity summary strip -->
    <div class="ax-severity-strip">
      @for (s of severitySummary(); track s.key) {
        <button class="sev-card" [style.--sev-color]="s.tokenColor"
          [class.sev-card--active]="filterSeverity === s.key"
          (click)="filterBySeverity(s.key)">
          <span class="sev-card__icon"><mat-icon>{{ s.icon }}</mat-icon></span>
          <span class="sev-card__value">{{ s.count }}</span>
          <span class="sev-card__label">{{ s.label }}</span>
        </button>
      }
      <div class="sev-card sev-card--unrepaired" style="--sev-color: var(--ax-color-warning); cursor:default">
        <span class="sev-card__icon"><mat-icon>handyman</mat-icon></span>
        <span class="sev-card__value">{{ unrepairedCount() }}</span>
        <span class="sev-card__label">미조치</span>
      </div>
    </div>

    <!-- Filter bar -->
    <div class="ax-filter-bar">
      <div class="ax-filter-bar__filters">
        <mat-form-field appearance="outline" class="ax-filter-bar__field">
          <mat-label>결함 유형</mat-label>
          <mat-select [(ngModel)]="filterType" (ngModelChange)="applyFilters()">
            <mat-option value="">전체</mat-option>
            @for (t of defectTypeOptions; track t.value) {
              <mat-option [value]="t.value">{{ t.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="ax-filter-bar__field">
          <mat-label>심각도</mat-label>
          <mat-select [(ngModel)]="filterSeverity" (ngModelChange)="applyFilters()">
            <mat-option value="">전체</mat-option>
            @for (s of severityOptions; track s.value) {
              <mat-option [value]="s.value">{{ s.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="ax-filter-bar__field">
          <mat-label>조치 상태</mat-label>
          <mat-select [(ngModel)]="filterRepaired" (ngModelChange)="applyFilters()">
            <mat-option value="">전체</mat-option>
            <mat-option value="false">미조치</mat-option>
            <mat-option value="true">조치 완료</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="ax-filter-bar__field">
          <mat-label>등록일 시작</mat-label>
          <input matInput [matDatepicker]="fromPicker"
                 [ngModel]="filterDateFrom"
                 (dateChange)="filterDateFrom = $event.value; applyFilters()">
          <mat-datepicker-toggle matIconSuffix [for]="fromPicker" />
          <mat-datepicker #fromPicker />
        </mat-form-field>

        <mat-form-field appearance="outline" class="ax-filter-bar__field">
          <mat-label>등록일 종료</mat-label>
          <input matInput [matDatepicker]="toPicker"
                 [ngModel]="filterDateTo"
                 (dateChange)="filterDateTo = $event.value; applyFilters()">
          <mat-datepicker-toggle matIconSuffix [for]="toPicker" />
          <mat-datepicker #toPicker />
        </mat-form-field>
      </div>

      <div class="ax-filter-bar__actions">
        <button mat-stroked-button (click)="resetFilters()">
          <mat-icon>clear</mat-icon> 초기화
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="ax-table-container">
      @if (loading()) {
        <ax-skeleton type="table" />
      } @else {
        <table mat-table [dataSource]="defects()" class="ax-defect-table">

          <!-- Severity -->
          <ng-container matColumnDef="severity">
            <th mat-header-cell *matHeaderCellDef>심각도</th>
            <td mat-cell *matCellDef="let d">
              <div class="sev-cell">
                <mat-icon class="sev-cell__icon" [style.color]="severityTokenColor(d.severity)">
                  {{ severityIcon(d.severity) }}
                </mat-icon>
                <ax-status-badge [variant]="severityToVariant(d.severity)" [label]="severityLabel(d.severity)" />
              </div>
            </td>
          </ng-container>

          <!-- Defect type -->
          <ng-container matColumnDef="defectType">
            <th mat-header-cell *matHeaderCellDef>결함 유형</th>
            <td mat-cell *matCellDef="let d" class="ax-text-body">{{ defectTypeLabel(d.defectType) }}</td>
          </ng-container>

          <!-- Project -->
          <ng-container matColumnDef="project">
            <th mat-header-cell *matHeaderCellDef>프로젝트</th>
            <td mat-cell *matCellDef="let d">
              <span class="proj-text" [matTooltip]="projectName(d.projectId)">
                {{ projectName(d.projectId) }}
              </span>
            </td>
          </ng-container>

          <!-- Location -->
          <ng-container matColumnDef="location">
            <th mat-header-cell *matHeaderCellDef>위치</th>
            <td mat-cell *matCellDef="let d">
              <span class="loc-text" [matTooltip]="d.locationDescription">
                {{ d.locationDescription | slice:0:36 }}{{ (d.locationDescription?.length ?? 0) > 36 ? '…' : '' }}
              </span>
            </td>
          </ng-container>

          <!-- Measurements -->
          <ng-container matColumnDef="measurements">
            <th mat-header-cell *matHeaderCellDef>측정값</th>
            <td mat-cell *matCellDef="let d">
              @if (d.widthMm || d.lengthMm) {
                <span class="measure-text">
                  {{ d.widthMm ? d.widthMm + 'mm' : '-' }} × {{ d.lengthMm ? d.lengthMm + 'mm' : '-' }}
                </span>
              } @else {
                <span class="ax-text-meta">—</span>
              }
            </td>
          </ng-container>

          <!-- Repaired -->
          <ng-container matColumnDef="repaired">
            <th mat-header-cell *matHeaderCellDef>조치</th>
            <td mat-cell *matCellDef="let d">
              @if (d.isRepaired) {
                <ax-status-badge variant="success" label="조치 완료" />
              } @else {
                <ax-status-badge variant="warning" label="미조치" />
              }
            </td>
          </ng-container>

          <!-- Photo count -->
          <ng-container matColumnDef="media">
            <th mat-header-cell *matHeaderCellDef>사진</th>
            <td mat-cell *matCellDef="let d">
              @if ((d.mediaIds?.length ?? 0) > 0) {
                <div class="media-cell">
                  <mat-icon class="media-cell__icon" [matTooltip]="d.mediaIds.length + '장'">photo_library</mat-icon>
                  <span class="ax-text-meta">{{ d.mediaIds?.length ?? 0 }}</span>
                </div>
              } @else {
                <span class="ax-text-meta">—</span>
              }
            </td>
          </ng-container>

          <!-- Created at -->
          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef>등록일</th>
            <td mat-cell *matCellDef="let d" class="ax-text-meta">{{ d.createdAt | date:'yy.MM.dd HH:mm' }}</td>
          </ng-container>

          <!-- Actions -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let d" (click)="$event.stopPropagation()">
              <button mat-icon-button [routerLink]="[d._id]" matTooltip="상세보기">
                <mat-icon>open_in_new</mat-icon>
              </button>
              @if (!d.isRepaired) {
                <button mat-icon-button color="primary"
                  (click)="markRepaired(d)"
                  matTooltip="조치 완료 처리">
                  <mat-icon>build_circle</mat-icon>
                </button>
              }
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let d; columns: columns;"
            class="ax-table-row"
            [class.ax-table-row--critical]="d.severity === 'CRITICAL'"
            [routerLink]="[d._id]"></tr>
        </table>

        @if (defects().length === 0) {
          <ax-empty-state
            type="search-no-result"
            title="조건에 맞는 결함이 없습니다"
            description="필터를 변경하거나 초기화한 후 다시 확인해 주세요."
            (primaryAction)="resetFilters()" />
        }
      }

      <mat-paginator
        [length]="totalCount()"
        [pageSize]="pageSize"
        [pageSizeOptions]="[10, 20, 50]"
        (page)="onPageChange($event)"
        showFirstLastButtons />
    </div>
  `,
  styles: [`
    /* Severity summary strip */
    .ax-severity-strip {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }

    .sev-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 16px 12px;
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border-default);
      border-top: 4px solid var(--sev-color, var(--ax-color-border-default));
      border-radius: var(--ax-radius-lg);
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
      font-family: inherit;
      text-align: center;

      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--ax-shadow-sm);
      }

      &--active {
        background: color-mix(in srgb, var(--sev-color) 8%, white);
        box-shadow: 0 0 0 2px var(--sev-color);
      }

      &--unrepaired { cursor: default; }
    }

    .sev-card__icon {
      mat-icon { color: var(--sev-color, var(--ax-color-text-secondary)); font-size: 22px; width: 22px; height: 22px; }
    }
    .sev-card__value {
      font-size: var(--ax-font-size-kpi);
      font-weight: 700;
      color: var(--ax-color-text-primary);
      line-height: 1;
    }
    .sev-card__label {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-secondary);
      font-weight: 500;
    }

    /* Filter bar */
    .ax-filter-bar__field {
      min-width: 140px;
    }

    /* Table */
    .ax-defect-table { width: 100%; }

    .ax-table-row {
      cursor: pointer;
      transition: background 0.12s;

      &:hover { background: var(--ax-color-bg-surface-alt); }
      &--critical { background: rgba(220, 38, 38, 0.03); }
      &--critical:hover { background: rgba(220, 38, 38, 0.07); }
    }

    /* Cell layouts */
    .sev-cell {
      display: flex;
      align-items: center;
      gap: var(--ax-space-2);
    }
    .sev-cell__icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .proj-text {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-secondary);
      max-width: 120px;
      display: inline-block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .media-cell {
      display: flex;
      align-items: center;
      gap: var(--ax-space-1);
    }
    .media-cell__icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--ax-color-info);
      cursor: pointer;
    }

    .loc-text {
      font-size: var(--ax-font-size-sm);
      color: var(--ax-color-text-primary);
    }

    .measure-text {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-secondary);
      font-family: 'Roboto Mono', monospace;
    }

    /* Paginator */
    mat-paginator {
      border-top: 1px solid var(--ax-color-border-default);
    }

    @media (max-width: 960px) {
      .ax-severity-strip { grid-template-columns: repeat(3, 1fr); }
    }
    @media (max-width: 600px) {
      .ax-severity-strip { grid-template-columns: repeat(2, 1fr); }
    }
  `],
})
export class DefectListComponent implements OnInit {
  private readonly defectsService = inject(DefectsService);
  private readonly dialog         = inject(MatDialog);
  private readonly http           = inject(HttpClient);
  private readonly snackBar       = inject(MatSnackBar);

  readonly defects    = signal<Defect[]>([]);
  readonly loading    = signal(false);
  readonly projectMap = signal<Map<string, string>>(new Map());

  // Unfiltered totals — source of truth for both severity strip and total count.
  // The API always returns meta.total = -1 (CouchDB Mango has no efficient count),
  // so we derive all counts from this single unfiltered dataset.
  private readonly allForStats = signal<Defect[]>([]);
  readonly totalCount = computed(() => this.allForStats().length);

  columns = ['severity', 'defectType', 'project', 'location', 'measurements', 'repaired', 'media', 'createdAt', 'actions'];

  // Filters
  filterType     = '';
  filterSeverity = '';
  filterRepaired = '';
  filterDateFrom: Date | null = null;
  filterDateTo:   Date | null = null;

  pageSize    = 20;
  currentPage = 0;

  readonly severitySummary = computed(() => {
    const all = this.allForStats();
    return Object.entries(SEVERITY_CONFIG).map(([key, cfg]) => ({
      key,
      label: cfg.label,
      icon: cfg.icon,
      tokenColor: cfg.tokenColor,
      count: all.filter((d) => d.severity === key).length,
    }));
  });

  readonly unrepairedCount = computed(() => this.allForStats().filter((d) => !d.isRepaired).length);

  readonly defectTypeOptions = Object.entries(DEFECT_TYPE_LABELS).map(([value, label]) => ({ value, label }));
  readonly severityOptions   = Object.entries(SEVERITY_CONFIG).map(([value, cfg]) => ({ value, label: cfg.label }));

  ngOnInit() {
    this.loadProjects();
    this.loadStats();
    this.load();
  }

  private loadStats() {
    this.defectsService.list({ limit: 1000 }).subscribe({
      next: (res) => this.allForStats.set(res.data ?? []),
      error: () => {},
    });
  }

  private loadProjects() {
    this.http.get<any>(`${environment.apiUrl}/projects?limit=200`).subscribe({
      next: (res) => {
        const list: any[] = res.data ?? [];
        this.projectMap.set(new Map(list.map((p: any) => [p._id, p.name])));
      },
      error: () => {},
    });
  }

  load() {
    this.loading.set(true);
    this.defectsService.list({
      defectType: this.filterType     || undefined,
      severity:   this.filterSeverity || undefined,
      isRepaired: this.filterRepaired !== '' ? this.filterRepaired === 'true' : undefined,
      dateFrom: this.filterDateFrom ? this.toDateStr(this.filterDateFrom) : undefined,
      dateTo:   this.filterDateTo   ? this.toDateStr(this.filterDateTo)   : undefined,
      page:  this.currentPage + 1,
      limit: this.pageSize,
    }).subscribe({
      next: (res) => {
        this.defects.set(res.data ?? (res as any));
        this.loading.set(false);
      },
      error: () => {
        this.snackBar.open('결함 목록을 불러오지 못했습니다.', '닫기', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  applyFilters() {
    this.currentPage = 0;
    this.load();
  }

  resetFilters() {
    this.filterType     = '';
    this.filterSeverity = '';
    this.filterRepaired = '';
    this.filterDateFrom = null;
    this.filterDateTo   = null;
    this.applyFilters();
  }

  filterBySeverity(severity: string) {
    this.filterSeverity = this.filterSeverity === severity ? '' : severity;
    this.applyFilters();
  }

  onPageChange(event: PageEvent) {
    this.pageSize   = event.pageSize;
    this.currentPage = event.pageIndex;
    this.load();
  }

  openCreateDialog() {
    const ref = this.dialog.open(CreateDefectDialogComponent, {
      width: '580px',
      disableClose: false,
    });
    ref.afterClosed().subscribe((newDefect: Defect | undefined) => {
      if (newDefect) {
        this.defects.update((list) => [newDefect, ...list]);
        this.allForStats.update((list) => [newDefect, ...list]); // keeps totalCount & strip in sync
        this.snackBar.open('결함이 등록되었습니다.', '닫기', { duration: 2000 });
      }
    });
  }

  markRepaired(defect: Defect) {
    this.defectsService.markRepaired(defect._id, '').subscribe({
      next: (updated) => {
        this.defects.update((list) => list.map((d) => d._id === updated._id ? updated : d));
        this.snackBar.open('조치 완료 처리되었습니다.', '닫기', { duration: 2000 });
      },
      error: () => this.snackBar.open('처리 중 오류가 발생했습니다.', '닫기', { duration: 3000 }),
    });
  }

  projectName(projectId: string | undefined): string {
    if (!projectId) return '직접 등록';
    return this.projectMap().get(projectId) ?? '—';
  }

  private toDateStr(d: Date): string {
    // Pad to YYYY-MM-DD
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  readonly severityToVariant = severityToVariant;

  severityLabel(s: string)      { return SEVERITY_CONFIG[s]?.label ?? s; }
  severityTokenColor(s: string) { return SEVERITY_CONFIG[s]?.tokenColor ?? 'var(--ax-color-text-secondary)'; }
  severityIcon(s: string)       { return SEVERITY_CONFIG[s]?.icon ?? 'warning'; }
  defectTypeLabel(t: string)    { return DEFECT_TYPE_LABELS[t] ?? t; }
}
