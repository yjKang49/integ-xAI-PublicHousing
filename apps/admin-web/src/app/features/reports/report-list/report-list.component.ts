import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Report, ReportType } from '@ax/shared';
import { environment } from '../../../../environments/environment';
import {
  PageHeaderComponent,
  EmptyStateComponent,
  SkeletonComponent,
} from '../../../shared/components';

const REPORT_TYPE_LABELS: Record<string, string> = {
  INSPECTION_RESULT: '점검 결과',
  PHOTO_SHEET:       '사진 대지',
  DEFECT_LIST:       '결함 목록',
  SUMMARY:           '요약 보고서',
  CRACK_TREND:       '균열 추이',
};

@Component({
  selector: 'ax-report-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatTableModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatFormFieldModule, MatInputModule,
    MatTooltipModule, MatSnackBarModule, MatPaginatorModule,
    PageHeaderComponent, EmptyStateComponent, SkeletonComponent,
  ],
  template: `
    <ax-page-header
      title="보고서 목록"
      description="점검·결함·균열 분석 결과 보고서 생성 및 다운로드"
      icon="description"
      [meta]="'전체 ' + total() + '건'">
      <div ax-page-actions>
        <button mat-flat-button color="primary" routerLink="generate">
          <mat-icon>picture_as_pdf</mat-icon> 보고서 생성
        </button>
      </div>
    </ax-page-header>

    <!-- Filter bar -->
    <div class="ax-filter-bar">
      <div class="ax-filter-bar__filters">
        <mat-form-field appearance="outline" class="ax-filter-bar__field">
          <mat-label>보고서 유형</mat-label>
          <mat-select [(ngModel)]="filterType" (ngModelChange)="load()">
            <mat-option value="">전체</mat-option>
            @for (t of reportTypeItems; track t.value) {
              <mat-option [value]="t.value">{{ t.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="ax-filter-bar__field">
          <mat-label>생성일 시작</mat-label>
          <input matInput type="date" [(ngModel)]="filterDateFrom" (change)="load()" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="ax-filter-bar__field">
          <mat-label>생성일 종료</mat-label>
          <input matInput type="date" [(ngModel)]="filterDateTo" (change)="load()" />
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
        <table mat-table [dataSource]="reports()" class="ax-report-table">

          <ng-container matColumnDef="reportType">
            <th mat-header-cell *matHeaderCellDef>유형</th>
            <td mat-cell *matCellDef="let r">
              <span class="report-type-tag">{{ reportTypeLabel(r.reportType) }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="title">
            <th mat-header-cell *matHeaderCellDef>제목</th>
            <td mat-cell *matCellDef="let r">
              <span class="ax-text-body report-title">{{ r.title }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="generatedBy">
            <th mat-header-cell *matHeaderCellDef>생성자</th>
            <td mat-cell *matCellDef="let r" class="ax-text-meta">{{ r.generatedBy }}</td>
          </ng-container>

          <ng-container matColumnDef="fileSize">
            <th mat-header-cell *matHeaderCellDef>파일 크기</th>
            <td mat-cell *matCellDef="let r" class="ax-text-meta">{{ formatSize(r.fileSize) }}</td>
          </ng-container>

          <ng-container matColumnDef="generatedAt">
            <th mat-header-cell *matHeaderCellDef>생성일시</th>
            <td mat-cell *matCellDef="let r" class="ax-text-meta">{{ r.generatedAt | date:'yyyy-MM-dd HH:mm' }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let r">
              <button mat-icon-button (click)="download(r)" matTooltip="다운로드">
                <mat-icon>download</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let r; columns: columns;" class="ax-table-row"></tr>
        </table>

        @if (reports().length === 0) {
          <ax-empty-state
            type="empty"
            title="생성된 보고서가 없습니다"
            description="보고서를 생성하거나 필터 조건을 변경해 주세요."
            primaryLabel="보고서 생성"
            (primaryAction)="goGenerate()" />
        }
      }

      <mat-paginator [length]="total()" [pageSize]="pageSize"
        [pageSizeOptions]="[10, 20, 50]" (page)="onPage($event)" showFirstLastButtons />
    </div>
  `,
  styles: [`
    /* Filter */
    .ax-filter-bar__field { min-width: 140px; }

    /* Table */
    .ax-report-table { width: 100%; }

    .ax-table-row {
      transition: background 0.12s;
      &:hover { background: var(--ax-color-bg-surface-alt); }
    }

    .report-type-tag {
      display: inline-block;
      padding: 2px var(--ax-space-2);
      background: var(--ax-color-info-subtle);
      color: var(--ax-color-info);
      border-radius: var(--ax-radius-sm);
      font-size: var(--ax-font-size-xs);
      font-weight: 500;
      white-space: nowrap;
    }

    .report-title { font-weight: 500; }

    mat-paginator { border-top: 1px solid var(--ax-color-border); }
  `],
})
export class ReportListComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);

  readonly reports = signal<Report[]>([]);
  readonly loading = signal(false);
  readonly total = signal(0);

  columns = ['reportType', 'title', 'generatedBy', 'fileSize', 'generatedAt', 'actions'];
  filterType = '';
  filterDateFrom = '';
  filterDateTo = '';
  pageSize = 20;
  pageIndex = 0;

  readonly reportTypeItems = Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => ({ value, label }));

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const params = new URLSearchParams({
      page: String(this.pageIndex + 1), limit: String(this.pageSize),
      ...(this.filterType && { reportType: this.filterType }),
      ...(this.filterDateFrom && { dateFrom: this.filterDateFrom }),
      ...(this.filterDateTo && { dateTo: this.filterDateTo }),
    });
    this.http.get<any>(`${environment.apiUrl}/reports?${params}`).subscribe({
      next: (res) => {
        this.reports.set(res.data ?? []);
        this.total.set(res.meta?.total ?? (res.data ?? []).length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  download(report: Report) {
    this.http.get<any>(`${environment.apiUrl}/reports/${encodeURIComponent(report._id)}/download-url`).subscribe({
      next: (res) => {
        const url = res.data?.url ?? res.url;
        if (url) window.open(url, '_blank');
      },
      error: () => this.snackBar.open('다운로드 URL을 가져오지 못했습니다.', '닫기', { duration: 3000 }),
    });
  }

  goGenerate() { /* navigation handled via routerLink="generate" in header action */ }
  resetFilters() { this.filterType = ''; this.filterDateFrom = ''; this.filterDateTo = ''; this.pageIndex = 0; this.load(); }
  onPage(e: PageEvent) { this.pageIndex = e.pageIndex; this.pageSize = e.pageSize; this.load(); }
  reportTypeLabel(t: string) { return REPORT_TYPE_LABELS[t] ?? t; }
  formatSize(bytes: number): string {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}
