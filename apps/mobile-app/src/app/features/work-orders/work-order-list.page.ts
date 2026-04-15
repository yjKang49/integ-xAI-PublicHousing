// apps/mobile-app/src/app/features/work-orders/work-order-list.page.ts
/**
 * WorkOrderListPage (Mobile Inspector)
 *
 * Shows all work orders assigned to the current inspector.
 * Allows quick start / complete actions inline.
 * Navigates to ComplaintActionPage for full detail.
 */
import {
  Component, OnInit, inject, signal, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonRefresher, IonRefresherContent,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonButton, IonIcon, IonBadge, IonSegment, IonSegmentButton,
  IonLabel, IonSpinner, IonChip,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { playOutline, checkmarkCircleOutline, eyeOutline } from 'ionicons/icons';
import { WorkOrder, WorkOrderStatus } from '@ax/shared';
import { WORK_ORDER_STATUS_LABELS } from '@ax/shared';
import { environment } from '../../../environments/environment';
import { AuthStore } from '../../core/store/auth.store';

addIcons({ playOutline, checkmarkCircleOutline, eyeOutline });

@Component({
  selector: 'ax-work-order-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonRefresher, IonRefresherContent,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonButton, IonIcon, IonBadge, IonSegment, IonSegmentButton,
    IonLabel, IonSpinner, IonChip,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="dark">
        <ion-title>내 작업지시</ion-title>
      </ion-toolbar>
      <ion-toolbar color="dark">
        <ion-segment [value]="filterStatus()" (ionChange)="onSegmentChange($event)">
          <ion-segment-button value="">전체</ion-segment-button>
          <ion-segment-button value="OPEN">대기</ion-segment-button>
          <ion-segment-button value="IN_PROGRESS">진행중</ion-segment-button>
          <ion-segment-button value="COMPLETED">완료</ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      @if (loading()) {
        <div class="center"><ion-spinner name="crescent"></ion-spinner></div>
      } @else if (filtered().length === 0) {
        <div class="empty">
          <ion-icon name="checkmark-circle-outline"></ion-icon>
          <p>작업지시가 없습니다</p>
        </div>
      } @else {
        @for (wo of filtered(); track wo._id) {
          <ion-card [class]="'wo-card wo-' + wo.status.toLowerCase()">
            <ion-card-header>
              <ion-card-title>
                {{ wo.title }}
                <ion-badge [color]="badgeColor(wo.status)" style="float:right;margin-top:2px">
                  {{ woLabel(wo.status) }}
                </ion-badge>
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p class="wo-desc">{{ wo.description }}</p>
              <div class="wo-meta">
                <ion-chip [color]="priorityColor(wo.priority)" outline="true" style="margin:0">
                  <ion-label>{{ priorityLabel(wo.priority) }}</ion-label>
                </ion-chip>
                <span class="schedule">예정: {{ wo.scheduledDate | date:'MM/dd HH:mm' }}</span>
              </div>

              @if (wo.actionNotes) {
                <div class="action-notes">{{ wo.actionNotes }}</div>
              }

              <div class="wo-actions">
                <ion-button fill="outline" size="small" (click)="goToDetail(wo)">
                  <ion-icon name="eye-outline" slot="start"></ion-icon>
                  상세
                </ion-button>

                @if (wo.status === 'OPEN') {
                  <ion-button color="primary" size="small" (click)="start(wo)">
                    <ion-icon name="play-outline" slot="start"></ion-icon>
                    조치 시작
                  </ion-button>
                }

                @if (wo.status === 'IN_PROGRESS') {
                  <ion-button color="success" size="small" (click)="goToComplete(wo)">
                    <ion-icon name="checkmark-circle-outline" slot="start"></ion-icon>
                    완료 등록
                  </ion-button>
                }
              </div>
            </ion-card-content>
          </ion-card>
        }
      }
    </ion-content>
  `,
  styles: [`
    .center { display: flex; justify-content: center; align-items: center; height: 200px; }
    .empty {
      display: flex; flex-direction: column; align-items: center;
      padding: 48px 16px; color: #888;
    }
    .empty ion-icon { font-size: 48px; margin-bottom: 12px; }
    .wo-card { margin: 8px 12px; border-radius: 12px; }
    .wo-card.wo-open        { border-left: 4px solid #2196f3; }
    .wo-card.wo-in_progress { border-left: 4px solid #ff9800; }
    .wo-card.wo-completed   { border-left: 4px solid #4caf50; }
    .wo-card.wo-cancelled   { border-left: 4px solid #9e9e9e; }
    .wo-desc { font-size: 13px; color: #555; margin: 0 0 8px; }
    .wo-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .schedule { font-size: 12px; color: #888; }
    .action-notes {
      font-size: 12px; background: #f0fff4; border-left: 3px solid #4caf50;
      padding: 6px 10px; border-radius: 4px; margin-bottom: 8px; color: #2e7d32;
    }
    .wo-actions { display: flex; gap: 8px; justify-content: flex-end; }
  `],
})
export class WorkOrderListPage implements OnInit {
  private readonly http   = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toast  = inject(ToastController);
  private readonly auth   = inject(AuthStore);

  readonly loading      = signal(true);
  readonly workOrders   = signal<WorkOrder[]>([]);
  readonly filterStatus = signal('');

  get filtered() {
    return () => {
      const s = this.filterStatus();
      const all = this.workOrders();
      return s ? all.filter((w) => w.status === s) : all;
    };
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const userId = this.auth.user()?.id ?? '';
    const qs = userId ? `?assignedTo=${encodeURIComponent(userId)}` : '';
    this.http.get<any>(`${environment.apiUrl}/work-orders${qs}&limit=50`).subscribe({
      next: (r) => { this.workOrders.set(r.data ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  refresh(event: any) {
    this.load();
    setTimeout(() => event.target.complete(), 800);
  }

  onSegmentChange(e: any) {
    this.filterStatus.set(e.detail.value ?? '');
  }

  start(wo: WorkOrder) {
    this.http.patch<any>(`${environment.apiUrl}/work-orders/${wo._id}/start`, {}).subscribe({
      next: (r) => {
        this.workOrders.update((list) => list.map((w) => w._id === wo._id ? (r.data ?? r) : w));
        this.showToast('현장 조치를 시작했습니다.');
      },
      error: () => this.showToast('오류가 발생했습니다.'),
    });
  }

  goToDetail(wo: WorkOrder) {
    this.router.navigate(['/tabs/inspection/complaint-action'], {
      queryParams: {
        complaintId: wo.complaintId,
        workOrderId: wo._id,
      },
    });
  }

  goToComplete(wo: WorkOrder) {
    this.router.navigate(['/tabs/inspection/complaint-action'], {
      queryParams: {
        complaintId: wo.complaintId,
        workOrderId: wo._id,
      },
    });
  }

  private async showToast(message: string) {
    const t = await this.toast.create({ message, duration: 2500, position: 'bottom' });
    await t.present();
  }

  woLabel(s: string)      { return WORK_ORDER_STATUS_LABELS[s] ?? s; }
  priorityLabel(p: string) {
    return { LOW: '낮음', MEDIUM: '보통', HIGH: '높음', URGENT: '긴급' }[p] ?? p;
  }
  badgeColor(s: string): string {
    return { OPEN: 'primary', IN_PROGRESS: 'warning', COMPLETED: 'success', CANCELLED: 'medium' }[s] ?? 'medium';
  }
  priorityColor(p: string): string {
    return { LOW: 'success', MEDIUM: 'primary', HIGH: 'warning', URGENT: 'danger' }[p] ?? 'medium';
  }
}
