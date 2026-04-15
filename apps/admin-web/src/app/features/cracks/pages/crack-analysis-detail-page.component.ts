// apps/admin-web/src/app/features/cracks/pages/crack-analysis-detail-page.component.ts
// 균열 분석 단건 상세 페이지 (직접 URL 진입 또는 외부 링크 지원)
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { CrackAnalysisResult } from '@ax/shared';
import { CrackOverlayViewerComponent } from '../components/crack-overlay-viewer.component';
import { CrackMetricsPanelComponent, ReviewSubmit } from '../components/crack-metrics-panel.component';

@Component({
  selector: 'ax-crack-analysis-detail-page',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatButtonModule, MatIconModule, MatProgressBarModule, MatDividerModule,
    CrackOverlayViewerComponent, CrackMetricsPanelComponent,
  ],
  template: `
    <div class="ax-crack-detail-page">
      <!-- 헤더 -->
      <div class="ax-crack-detail-hdr">
        <button mat-icon-button routerLink="/crack-analysis">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div class="ax-crack-detail-hdr__title-wrap">
          <h1 class="ax-crack-detail-hdr__title">균열 분석 상세</h1>
          @if (result()) {
            <span class="ax-crack-detail-hdr__id">{{ result()!._id }}</span>
          }
        </div>
      </div>

      @if (loading()) {
        <mat-progress-bar mode="indeterminate" />
      } @else if (!result()) {
        <div class="ax-crack-detail-error">
          <mat-icon>error_outline</mat-icon>
          <span>분석 결과를 불러올 수 없습니다</span>
        </div>
      } @else {
        <div class="ax-crack-detail-layout">
          <div class="ax-crack-detail-viewer">
            <ax-crack-overlay-viewer [result]="result()!" />
          </div>
          <mat-divider [vertical]="true" />
          <div class="ax-crack-detail-metrics">
            <ax-crack-metrics-panel
              [result]="result()!"
              [loading]="reviewLoading()"
              (reviewed)="onReviewed($event)"
            />
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .ax-crack-detail-page {
      height: 100%; display: flex; flex-direction: column;
    }
    .ax-crack-detail-hdr {
      display: flex; align-items: center; gap: var(--ax-spacing-3);
      padding: var(--ax-spacing-3) var(--ax-spacing-5);
      border-bottom: 1px solid var(--ax-color-border);
      flex-shrink: 0;
    }
    .ax-crack-detail-hdr__title-wrap {
      display: flex; align-items: baseline; gap: var(--ax-spacing-2);
    }
    .ax-crack-detail-hdr__title {
      margin: 0; font-size: var(--ax-font-size-lg);
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
    }
    .ax-crack-detail-hdr__id {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-tertiary);
      font-family: var(--ax-font-family-mono, monospace);
    }
    .ax-crack-detail-error {
      display: flex; flex-direction: column; align-items: center;
      gap: var(--ax-spacing-2); padding: var(--ax-spacing-8);
      color: var(--ax-color-text-tertiary);
    }
    .ax-crack-detail-error mat-icon { font-size: 48px; width: 48px; height: 48px; }
    .ax-crack-detail-layout { display: flex; flex: 1; overflow: hidden; }
    .ax-crack-detail-viewer { flex: 1; min-width: 0; padding: var(--ax-spacing-2); }
    .ax-crack-detail-metrics { width: 380px; overflow-y: auto; }
  `],
})
export class CrackAnalysisDetailPageComponent implements OnInit {
  private readonly http  = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);

  result        = signal<CrackAnalysisResult | null>(null);
  loading       = signal(true);
  reviewLoading = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('analysisId');
    if (!id) { this.loading.set(false); return; }

    this.http.get<CrackAnalysisResult>(`/api/v1/crack-analysis/${id}`).subscribe({
      next: (doc) => { this.result.set(doc); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  onReviewed(payload: ReviewSubmit): void {
    const current = this.result();
    if (!current) return;
    this.reviewLoading.set(true);
    this.http.patch<CrackAnalysisResult>(`/api/v1/crack-analysis/${current._id}/review`, payload).subscribe({
      next: (updated) => { this.result.set(updated); this.reviewLoading.set(false); },
      error: () => this.reviewLoading.set(false),
    });
  }
}
