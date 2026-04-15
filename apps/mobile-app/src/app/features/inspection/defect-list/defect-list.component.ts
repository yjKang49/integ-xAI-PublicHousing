// apps/mobile-app/src/app/features/inspection/defect-list/defect-list.component.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonList, IonItem, IonLabel, IonBadge, IonBackButton, IonButtons,
  IonButton, IonIcon, IonChip, IonCard, IonCardContent, IonCardHeader,
  IonCardSubtitle, IonRefresher, IonRefresherContent, IonNote,
  IonFab, IonFabButton, IonProgressBar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addCircle, warning, checkmarkCircle, cloudOffline,
  filterOutline, refreshOutline,
} from 'ionicons/icons';
import { PouchService } from '../../../core/sync/pouch.service';
import { Defect, DefectType, SeverityLevel } from '@ax/shared';

addIcons({ addCircle, warning, checkmarkCircle, cloudOffline, filterOutline, refreshOutline });

const SEVERITY_LABEL: Record<string, string> = {
  CRITICAL: '긴급', HIGH: '높음', MEDIUM: '보통', LOW: '낮음',
};
const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: 'danger', HIGH: 'warning', MEDIUM: 'primary', LOW: 'medium',
};
const TYPE_LABEL: Record<string, string> = {
  CRACK: '균열', LEAK: '누수', SPALLING: '박리/박락',
  CORROSION: '부식', EFFLORESCENCE: '백태',
  DEFORMATION: '변형', SETTLEMENT: '침하', OTHER: '기타',
};

@Component({
  selector: 'ax-defect-list-mobile',
  standalone: true,
  imports: [
    CommonModule,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonList, IonItem, IonLabel, IonBadge, IonBackButton, IonButtons,
    IonButton, IonIcon, IonChip, IonCard, IonCardContent, IonCardHeader,
    IonCardSubtitle, IonRefresher, IonRefresherContent, IonNote,
    IonFab, IonFabButton, IonProgressBar,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/inspection" />
        </ion-buttons>
        <ion-title>결함 목록 ({{ defects().length }}건)</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="reload()">
            <ion-icon name="refresh-outline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <!-- Pending sync indicator -->
      @if (pendingCount() > 0) {
        <ion-toolbar color="warning" style="--min-height:32px">
          <div style="text-align:center; font-size:12px; padding: 4px 16px">
            <ion-icon name="cloud-offline" style="vertical-align:middle" />
            동기화 대기: {{ pendingCount() }}건
          </div>
        </ion-toolbar>
      }
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content />
      </ion-refresher>

      <!-- Summary chips -->
      <div class="summary-chips">
        @for (s of severitySummary(); track s.key) {
          <ion-chip [color]="s.ionColor"
            (click)="activeFilter.set(activeFilter() === s.key ? null : s.key)">
            {{ s.label }} {{ s.count }}
          </ion-chip>
        }
        @if (activeFilter()) {
          <ion-chip (click)="activeFilter.set(null)">전체보기</ion-chip>
        }
      </div>

      @if (loading()) {
        <ion-progress-bar type="indeterminate" />
      }

      <ion-list>
        @for (defect of filteredDefects(); track defect._id) {
          <ion-item button detail (click)="goToDetail(defect)">
            <!-- Severity indicator bar -->
            <div slot="start" class="severity-bar" [class]="'sev-' + defect.severity"></div>

            <ion-label>
              <h2 class="defect-type">{{ typeLabel(defect.defectType) }}</h2>
              <p class="defect-location">{{ defect.locationDescription }}</p>

              <div class="meta-row">
                @if (defect.widthMm || defect.lengthMm) {
                  <ion-note class="measure-note">
                    {{ defect.widthMm ?? '?' }}mm × {{ defect.lengthMm ?? '?' }}mm
                  </ion-note>
                }
                @if ((defect.mediaIds?.length ?? 0) > 0) {
                  <ion-note>
                    📷 {{ defect.mediaIds?.length }}
                  </ion-note>
                }
                @if (isPending(defect)) {
                  <ion-note color="warning">⏳ 동기화 대기</ion-note>
                }
              </div>

              <p class="defect-date">{{ defect.createdAt | date:'MM/dd HH:mm' }}</p>
            </ion-label>

            <ion-badge slot="end" [color]="severityColor(defect.severity)">
              {{ severityLabel(defect.severity) }}
            </ion-badge>
          </ion-item>
        }

        @if (!loading() && filteredDefects().length === 0) {
          <ion-item>
            <ion-label style="text-align:center; color: #999; padding: 32px 0">
              <p>{{ activeFilter() ? '해당 심각도의 결함이 없습니다.' : '등록된 결함이 없습니다.' }}</p>
            </ion-label>
          </ion-item>
        }
      </ion-list>

      <!-- FAB: new defect -->
      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button color="primary" (click)="registerNewDefect()">
          <ion-icon name="add-circle" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  `,
  styles: [`
    .summary-chips {
      display: flex; gap: 6px; padding: 8px 12px; flex-wrap: wrap;
      background: #f8f8f8; border-bottom: 1px solid #e0e0e0;
    }
    .severity-bar {
      width: 4px; height: 48px; border-radius: 2px; margin-right: 4px; flex-shrink: 0;
    }
    .sev-CRITICAL { background: #f44336; }
    .sev-HIGH     { background: #ff9800; }
    .sev-MEDIUM   { background: #2196f3; }
    .sev-LOW      { background: #4caf50; }
    .defect-type { font-size: 15px; font-weight: 600; margin-bottom: 2px; }
    .defect-location { font-size: 13px; color: #555; }
    .meta-row { display: flex; gap: 8px; margin-top: 4px; flex-wrap: wrap; }
    .measure-note { font-family: monospace; }
    .defect-date { font-size: 11px; color: #999; margin-top: 4px; }
  `],
})
export class DefectListMobileComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pouch = inject(PouchService);

  readonly defects = signal<Defect[]>([]);
  readonly loading = signal(false);
  readonly pendingCount = signal(0);
  readonly activeFilter = signal<string | null>(null);

  private sessionId = '';
  private queryParams: Record<string, string> = {};

  readonly filteredDefects = computed(() => {
    const filter = this.activeFilter();
    const all = this.defects();
    return filter ? all.filter((d) => d.severity === filter) : all;
  });

  readonly severitySummary = computed(() => {
    const all = this.defects();
    return (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((key) => ({
      key,
      label: SEVERITY_LABEL[key],
      ionColor: SEVERITY_COLOR[key],
      count: all.filter((d) => d.severity === key).length,
    })).filter((s) => s.count > 0);
  });

  ngOnInit() {
    const params = this.route.snapshot.queryParams;
    this.sessionId = params['sessionId'] ?? '';
    this.queryParams = params;
    this.reload();

    // Track pending sync count
    this.pouch.syncState.subscribe((state) => {
      this.pendingCount.set(state.pendingCount);
    });
  }

  async reload() {
    this.loading.set(true);
    const selector: Record<string, any> = { docType: 'defect' };
    if (this.sessionId) selector.sessionId = this.sessionId;

    const result = await this.pouch.find<Defect>(selector, {
      sort: [{ createdAt: 'desc' }],
      limit: 200,
    });
    this.defects.set(result);
    this.loading.set(false);
  }

  async handleRefresh(event: any) {
    await this.reload();
    event.target.complete();
  }

  goToDetail(defect: Defect) {
    this.router.navigate(['/tabs/inspection/defect-detail', defect._id]);
  }

  registerNewDefect() {
    this.router.navigate(['/tabs/inspection/defect-form'], {
      queryParams: this.queryParams,
    });
  }

  isPending(defect: any): boolean {
    return (defect as any).syncStatus === 'PENDING';
  }

  severityLabel(s: string) { return SEVERITY_LABEL[s] ?? s; }
  severityColor(s: string) { return SEVERITY_COLOR[s] ?? 'medium'; }
  typeLabel(t: string) { return TYPE_LABEL[t] ?? t; }
}
