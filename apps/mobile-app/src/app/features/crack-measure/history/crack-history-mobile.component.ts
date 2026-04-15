import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonList, IonItem, IonLabel, IonBadge, IonBackButton, IonButtons,
} from '@ionic/angular/standalone';
import { PouchService } from '../../../core/sync/pouch.service';

@Component({
  selector: 'app-crack-history-mobile',
  standalone: true,
  imports: [
    CommonModule,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonList, IonItem, IonLabel, IonBadge, IonBackButton, IonButtons,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start"><ion-back-button></ion-back-button></ion-buttons>
        <ion-title>균열 측정 이력</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list>
        @for (m of measurements(); track m._id) {
          <ion-item>
            <ion-label>
              <h2>{{ m.measuredAt | date:'yyyy-MM-dd HH:mm' }}</h2>
              <p>균열 폭: {{ m.widthMm }}mm</p>
            </ion-label>
            @if (m.exceedsThreshold) {
              <ion-badge slot="end" color="danger">임계 초과</ion-badge>
            }
          </ion-item>
        }
        @if (measurements().length === 0) {
          <ion-item><ion-label>측정 이력이 없습니다.</ion-label></ion-item>
        }
      </ion-list>
    </ion-content>
  `,
})
export class CrackHistoryMobileComponent implements OnInit {
  measurements = signal<any[]>([]);

  constructor(private route: ActivatedRoute, private pouch: PouchService) {}

  async ngOnInit() {
    const gaugeId = this.route.snapshot.paramMap.get('gaugeId');
    if (gaugeId) {
      const result = await this.pouch.find({ docType: 'crackMeasurement', gaugePointId: gaugeId });
      this.measurements.set(result.sort((a: any, b: any) => b.measuredAt.localeCompare(a.measuredAt)));
    }
  }
}
