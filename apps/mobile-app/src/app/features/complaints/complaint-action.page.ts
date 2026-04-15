// apps/mobile-app/src/app/features/complaints/complaint-action.page.ts
/**
 * ComplaintActionPage (Mobile Inspector)
 *
 * Allows a field inspector to:
 *   1. View complaint details + linked work order
 *   2. Start work order (OPEN → IN_PROGRESS)
 *   3. Register field action result (IN_PROGRESS → COMPLETED)
 *      — with notes, cost, and photo upload
 *
 * Route: /tabs/inspection/complaint-action?complaintId=...&workOrderId=...
 */
import {
  Component, OnInit, inject, signal, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonButton, IonIcon, IonItem, IonLabel, IonTextarea, IonInput,
  IonBadge, IonSpinner, IonChip,
  ToastController, ActionSheetController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  playOutline, checkmarkCircleOutline, cameraOutline,
  timeOutline, personOutline, alertCircleOutline,
} from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Complaint, WorkOrder, WorkOrderStatus, ComplaintStatus } from '@ax/shared';
import {
  COMPLAINT_STATUS_LABELS, COMPLAINT_PRIORITY_COLORS,
  WORK_ORDER_STATUS_LABELS,
} from '@ax/shared';
import { environment } from '../../../environments/environment';

addIcons({
  playOutline, checkmarkCircleOutline, cameraOutline,
  timeOutline, personOutline, alertCircleOutline,
});

@Component({
  selector: 'ax-complaint-action-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
    IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonButton, IonIcon, IonItem, IonLabel, IonTextarea, IonInput,
    IonBadge, IonSpinner, IonChip,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="dark">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/inspection"></ion-back-button>
        </ion-buttons>
        <ion-title>현장 조치</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      @if (loading()) {
        <div class="center">
          <ion-spinner name="crescent"></ion-spinner>
        </div>
      } @else {

        <!-- Complaint summary -->
        @if (complaint()) {
          <ion-card>
            <ion-card-header>
              <ion-card-title>
                <ion-chip [style.--background]="priorityBg(complaint()!.priority)"
                  [style.--color]="priorityColor(complaint()!.priority)">
                  {{ complaint()!.priority }}
                </ion-chip>
                {{ complaint()!.title }}
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p>{{ complaint()!.description }}</p>
              <ion-item lines="none" class="meta-item">
                <ion-icon name="person-outline" slot="start"></ion-icon>
                <ion-label>{{ complaint()!.submittedBy }}</ion-label>
                <ion-badge slot="end" [color]="statusBadgeColor(complaint()!.status)">
                  {{ statusLabel(complaint()!.status) }}
                </ion-badge>
              </ion-item>
              @if (complaint()!.classificationHint) {
                <ion-item lines="none" class="hint-item">
                  <ion-label class="hint-text">
                    힌트: {{ complaint()!.classificationHint }}
                  </ion-label>
                </ion-item>
              }
              @if (complaint()!.dueDate) {
                <ion-item lines="none" class="meta-item">
                  <ion-icon name="time-outline" slot="start"></ion-icon>
                  <ion-label>기한: {{ complaint()!.dueDate | date:'MM/dd HH:mm' }}</ion-label>
                </ion-item>
              }
            </ion-card-content>
          </ion-card>
        }

        <!-- Work order -->
        @if (workOrder()) {
          <ion-card>
            <ion-card-header>
              <ion-card-title>
                작업지시
                <ion-badge [color]="woBadgeColor(workOrder()!.status)" style="margin-left:8px">
                  {{ woStatusLabel(workOrder()!.status) }}
                </ion-badge>
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p><strong>{{ workOrder()!.title }}</strong></p>
              <p>{{ workOrder()!.description }}</p>
              @if (workOrder()!.estimatedCost) {
                <p>예상 비용: {{ workOrder()!.estimatedCost | number }}원</p>
              }
              @if (workOrder()!.vendor) {
                <p>업체: {{ workOrder()!.vendor }}</p>
              }
            </ion-card-content>
          </ion-card>

          <!-- Action buttons by status -->
          @if (workOrder()!.status === 'OPEN') {
            <ion-button expand="block" color="primary" (click)="startWorkOrder()">
              <ion-icon name="play-outline" slot="start"></ion-icon>
              현장 조치 시작
            </ion-button>
          }

          @if (workOrder()!.status === 'IN_PROGRESS') {
            <ion-card>
              <ion-card-header>
                <ion-card-title>조치 완료 등록</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <ion-item>
                  <ion-label position="stacked">조치 내용 *</ion-label>
                  <ion-textarea
                    [(ngModel)]="actionNotes"
                    rows="4"
                    placeholder="현장 점검 및 조치 내용을 상세히 입력하세요">
                  </ion-textarea>
                </ion-item>

                <ion-item>
                  <ion-label position="stacked">실제 비용 (원)</ion-label>
                  <ion-input type="number" [(ngModel)]="actualCost"></ion-input>
                </ion-item>

                <!-- Photo section -->
                <div class="photo-section">
                  <ion-button fill="outline" size="small" (click)="takePhoto()">
                    <ion-icon name="camera-outline" slot="start"></ion-icon>
                    사진 추가 ({{ photos().length }})
                  </ion-button>
                  @if (photos().length > 0) {
                    <div class="photo-grid">
                      @for (p of photos(); track p) {
                        <img [src]="p" class="thumb" />
                      }
                    </div>
                  }
                </div>

                <ion-button
                  expand="block"
                  color="success"
                  [disabled]="!actionNotes || submitting()"
                  (click)="completeWorkOrder()">
                  @if (submitting()) {
                    <ion-spinner name="dots"></ion-spinner>
                  } @else {
                    <ion-icon name="checkmark-circle-outline" slot="start"></ion-icon>
                    조치 완료 처리
                  }
                </ion-button>
              </ion-card-content>
            </ion-card>
          }

          @if (workOrder()!.status === 'COMPLETED') {
            <ion-card color="success">
              <ion-card-content>
                <div class="completed-msg">
                  <ion-icon name="checkmark-circle-outline"></ion-icon>
                  <span>조치 완료됨</span>
                </div>
                @if (workOrder()!.actionNotes) {
                  <p>{{ workOrder()!.actionNotes }}</p>
                }
              </ion-card-content>
            </ion-card>
          }
        } @else if (!loading()) {
          <!-- No work order — show complaint-only actions -->
          <ion-card>
            <ion-card-content>
              <p>연계된 작업지시가 없습니다. 관리자에게 작업지시 생성을 요청하세요.</p>
            </ion-card-content>
          </ion-card>
        }

      }
    </ion-content>
  `,
  styles: [`
    .center { display: flex; justify-content: center; align-items: center; height: 200px; }
    .meta-item { --padding-start: 0; font-size: 13px; }
    .hint-item { --padding-start: 0; }
    .hint-text { font-size: 12px; color: #9c27b0; font-style: italic; }
    .photo-section { padding: 12px 0 4px; }
    .photo-grid { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
    .thumb { width: 72px; height: 72px; object-fit: cover; border-radius: 8px; }
    .completed-msg {
      display: flex; align-items: center; gap: 8px;
      font-size: 18px; font-weight: 600; color: white;
    }
  `],
})
export class ComplaintActionPage implements OnInit {
  private readonly route         = inject(ActivatedRoute);
  private readonly router        = inject(Router);
  private readonly http          = inject(HttpClient);
  private readonly toast         = inject(ToastController);
  private readonly actionSheet   = inject(ActionSheetController);

  readonly loading    = signal(true);
  readonly submitting = signal(false);
  readonly complaint  = signal<Complaint | null>(null);
  readonly workOrder  = signal<WorkOrder | null>(null);
  readonly photos     = signal<string[]>([]); // base64 data URLs

  actionNotes = '';
  actualCost: number | null = null;

  ngOnInit() {
    const q = this.route.snapshot.queryParams;
    const complaintId = q['complaintId'];
    const workOrderId = q['workOrderId'];

    if (!complaintId) { this.loading.set(false); return; }

    Promise.all([
      this.http.get<any>(`${environment.apiUrl}/complaints/${complaintId}`).toPromise()
        .then((r) => this.complaint.set(r?.data ?? r)),
      workOrderId
        ? this.http.get<any>(`${environment.apiUrl}/work-orders/${workOrderId}`).toPromise()
          .then((r) => this.workOrder.set(r?.data ?? r))
        : this.http.get<any>(`${environment.apiUrl}/work-orders?complaintId=${complaintId}&limit=1`).toPromise()
          .then((r) => { const list = r?.data ?? []; if (list.length) this.workOrder.set(list[0]); }),
    ]).finally(() => this.loading.set(false));
  }

  async startWorkOrder() {
    const wo = this.workOrder();
    if (!wo) return;
    this.http.patch<any>(`${environment.apiUrl}/work-orders/${wo._id}/start`, {}).subscribe({
      next: (r) => {
        this.workOrder.set(r.data ?? r);
        this.showToast('현장 조치를 시작했습니다.');
      },
      error: () => this.showToast('오류가 발생했습니다.'),
    });
  }

  async completeWorkOrder() {
    const wo = this.workOrder();
    if (!wo || !this.actionNotes) return;
    this.submitting.set(true);

    this.http.patch<any>(`${environment.apiUrl}/work-orders/${wo._id}/complete`, {
      actionNotes: this.actionNotes,
      actualCost: this.actualCost ?? undefined,
    }).subscribe({
      next: (r) => {
        this.workOrder.set(r.data ?? r);
        this.submitting.set(false);
        this.showToast('조치 완료 처리되었습니다.');
        // reload complaint to reflect status update
        const c = this.complaint();
        if (c) {
          this.http.get<any>(`${environment.apiUrl}/complaints/${c._id}`).subscribe({
            next: (cr) => this.complaint.set(cr.data ?? cr),
          });
        }
      },
      error: () => {
        this.submitting.set(false);
        this.showToast('완료 처리 중 오류가 발생했습니다.');
      },
    });
  }

  async takePhoto() {
    const sheet = await this.actionSheet.create({
      header: '사진 추가',
      buttons: [
        { text: '카메라로 촬영', handler: () => this.capturePhoto(CameraSource.Camera) },
        { text: '갤러리에서 선택', handler: () => this.capturePhoto(CameraSource.Photos) },
        { text: '취소', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  private async capturePhoto(source: CameraSource) {
    try {
      const photo = await Camera.getPhoto({
        quality: 70,
        resultType: CameraResultType.DataUrl,
        source,
      });
      if (photo.dataUrl) {
        this.photos.update((list) => [...list, photo.dataUrl!]);
      }
    } catch {
      // User cancelled
    }
  }

  private async showToast(message: string) {
    const t = await this.toast.create({ message, duration: 2500, position: 'bottom' });
    await t.present();
  }

  // ── Display helpers ─────────────────────────────────────────────
  statusLabel(s: string) { return COMPLAINT_STATUS_LABELS[s] ?? s; }
  woStatusLabel(s: string) { return WORK_ORDER_STATUS_LABELS[s] ?? s; }

  priorityColor(p: string): string { return COMPLAINT_PRIORITY_COLORS[p] ?? '#9e9e9e'; }
  priorityBg(p: string): string {
    const map: Record<string, string> = {
      LOW: '#e8f5e9', MEDIUM: '#e3f2fd', HIGH: '#fff3e0', URGENT: '#ffebee',
    };
    return map[p] ?? '#f5f5f5';
  }
  statusBadgeColor(s: string): string {
    const map: Record<string, string> = {
      OPEN: 'primary', RECEIVED: 'primary', TRIAGED: 'secondary',
      ASSIGNED: 'success', IN_PROGRESS: 'warning', RESOLVED: 'tertiary', CLOSED: 'medium',
    };
    return map[s] ?? 'medium';
  }
  woBadgeColor(s: string): string {
    const map: Record<string, string> = {
      OPEN: 'primary', IN_PROGRESS: 'warning', COMPLETED: 'success', CANCELLED: 'medium',
    };
    return map[s] ?? 'medium';
  }
}
