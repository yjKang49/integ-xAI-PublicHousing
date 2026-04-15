// apps/mobile-app/src/app/features/sync-status/sync-status.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { PouchService, SyncState } from '../../core/sync/pouch.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'ax-sync-status',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>동기화 상태</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (syncState$ | async; as state) {
        <!-- Phase indicator -->
        <ion-card>
          <ion-card-content>
            <div class="phase-row">
              <ion-icon
                [name]="getPhaseIcon(state.phase)"
                [color]="getPhaseColor(state.phase)"
                size="large" />
              <div class="phase-info">
                <strong>{{ getPhaseLabel(state.phase) }}</strong>
                @if (state.lastSyncAt) {
                  <small>마지막 동기화: {{ state.lastSyncAt | date:'HH:mm:ss' }}</small>
                }
              </div>
              @if (state.phase === 'active') {
                <ion-spinner name="dots" color="primary" />
              }
            </div>

            @if (state.errorMessage) {
              <ion-note color="danger">{{ state.errorMessage }}</ion-note>
            }
          </ion-card-content>
        </ion-card>

        <!-- Pending count -->
        <ion-card>
          <ion-item>
            <ion-icon name="cloud-upload-outline" slot="start" color="warning" />
            <ion-label>
              <h3>업로드 대기 중</h3>
              <p>서버에 동기화 되지 않은 문서</p>
            </ion-label>
            <ion-badge slot="end" [color]="state.pendingCount > 0 ? 'warning' : 'success'">
              {{ state.pendingCount }}
            </ion-badge>
          </ion-item>
        </ion-card>

        <!-- Progress bars -->
        @if (state.phase === 'active') {
          <ion-card>
            <ion-card-header>
              <ion-card-subtitle>동기화 진행률</ion-card-subtitle>
            </ion-card-header>
            <ion-card-content>
              @if (state.pullProgress) {
                <div class="progress-row">
                  <ion-icon name="cloud-download-outline" color="primary" />
                  <span>다운로드</span>
                  <ion-progress-bar
                    [value]="state.pullProgress.total > 0
                      ? state.pullProgress.completed / state.pullProgress.total : 0"
                    color="primary" />
                  <span>{{ state.pullProgress.completed }}/{{ state.pullProgress.total }}</span>
                </div>
              }
              @if (state.pushProgress) {
                <div class="progress-row">
                  <ion-icon name="cloud-upload-outline" color="success" />
                  <span>업로드</span>
                  <ion-progress-bar
                    [value]="1"
                    color="success" />
                  <span>{{ state.pushProgress.completed }}</span>
                </div>
              }
            </ion-card-content>
          </ion-card>
        }

        <!-- Network status -->
        <ion-card>
          <ion-item>
            <ion-icon
              [name]="isOnline ? 'wifi-outline' : 'wifi-outline'"
              [color]="isOnline ? 'success' : 'danger'"
              slot="start" />
            <ion-label>
              <h3>네트워크 상태</h3>
            </ion-label>
            <ion-chip slot="end" [color]="isOnline ? 'success' : 'danger'">
              {{ isOnline ? '온라인' : '오프라인' }}
            </ion-chip>
          </ion-item>
        </ion-card>

        <!-- Manual sync button -->
        @if (state.phase !== 'active') {
          <div class="manual-sync-btn">
            <ion-button expand="block" (click)="manualSync()">
              <ion-icon slot="start" name="refresh-outline" />
              수동 동기화
            </ion-button>
          </div>
        }
      }

      <!-- Offline data summary -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>로컬 저장 데이터</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          @for (item of localSummary; track item.label) {
            <ion-item lines="inset">
              <ion-icon [name]="item.icon" slot="start" [color]="item.color" />
              <ion-label>{{ item.label }}</ion-label>
              <ion-badge slot="end" color="medium">{{ item.count }}</ion-badge>
            </ion-item>
          }
        </ion-card-content>
      </ion-card>
    </ion-content>
  `,
  styles: [`
    .phase-row { display: flex; align-items: center; gap: 16px; }
    .phase-info { flex: 1; display: flex; flex-direction: column; }
    .progress-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .progress-row ion-progress-bar { flex: 1; }
    .manual-sync-btn { padding: 16px; }
  `],
})
export class SyncStatusComponent implements OnInit {
  private readonly pouch = inject(PouchService);

  readonly syncState$: Observable<SyncState> = this.pouch.syncState;
  readonly isOnline = navigator.onLine;

  localSummary = [
    { label: '점검 세션', icon: 'clipboard-outline', color: 'primary', count: 0 },
    { label: '결함', icon: 'warning-outline', color: 'danger', count: 0 },
    { label: '균열 측정', icon: 'analytics-outline', color: 'warning', count: 0 },
    { label: '미업로드 사진', icon: 'image-outline', color: 'medium', count: 0 },
  ];

  async ngOnInit() {
    await this.loadLocalSummary();
  }

  private async loadLocalSummary() {
    const types = [
      { docType: 'inspectionSession', idx: 0 },
      { docType: 'defect', idx: 1 },
      { docType: 'crackMeasurement', idx: 2 },
    ];
    for (const { docType, idx } of types) {
      const docs = await this.pouch.find({ docType }, { limit: 1000, fields: ['_id'] });
      this.localSummary[idx].count = docs.length;
    }
    // Pending media (has attachment but no storageKey)
    const mediaWithAttachment = await this.pouch.find(
      { docType: 'defectMedia', storageKey: '' },
      { limit: 1000, fields: ['_id'] },
    );
    this.localSummary[3].count = mediaWithAttachment.length;
  }

  manualSync() {
    // Trigger manual sync by canceling and restarting (handled by PouchService live sync)
    console.info('Manual sync triggered');
  }

  getPhaseIcon(phase: string): string {
    const map: Record<string, string> = {
      idle: 'pause-circle-outline',
      active: 'sync-outline',
      paused: 'checkmark-circle-outline',
      error: 'alert-circle-outline',
      denied: 'lock-closed-outline',
      complete: 'checkmark-done-circle-outline',
    };
    return map[phase] ?? 'help-circle-outline';
  }

  getPhaseColor(phase: string): string {
    const map: Record<string, string> = {
      idle: 'medium', active: 'primary', paused: 'success',
      error: 'danger', denied: 'warning', complete: 'success',
    };
    return map[phase] ?? 'medium';
  }

  getPhaseLabel(phase: string): string {
    const map: Record<string, string> = {
      idle: '대기 중', active: '동기화 중', paused: '동기화 완료',
      error: '오류 발생', denied: '접근 거부', complete: '완료',
    };
    return map[phase] ?? phase;
  }
}
