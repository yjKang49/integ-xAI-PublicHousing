import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonList, IonItem, IonLabel, IonIcon, IonButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { qrCode, clipboardOutline, camera } from 'ionicons/icons';

@Component({
  selector: 'app-inspection-home',
  standalone: true,
  imports: [
    RouterLink,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonList, IonItem, IonLabel, IonIcon, IonButton,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>점검 관리</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-list>
        <ion-item button [routerLink]="['qr-scan']">
          <ion-icon name="qr-code" slot="start"></ion-icon>
          <ion-label>
            <h2>QR 스캔 점검 시작</h2>
            <p>시설물 QR 코드를 스캔하여 점검을 시작합니다</p>
          </ion-label>
        </ion-item>
        <ion-item button [routerLink]="['checklist']">
          <ion-icon name="clipboard-outline" slot="start"></ion-icon>
          <ion-label>
            <h2>점검 체크리스트</h2>
            <p>항목별 PASS/FAIL 체크리스트</p>
          </ion-label>
        </ion-item>
        <ion-item button [routerLink]="['defect-form']">
          <ion-icon name="camera" slot="start"></ion-icon>
          <ion-label>
            <h2>결함 등록</h2>
            <p>사진 촬영 및 결함 정보 입력</p>
          </ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  `,
})
export class InspectionHomeComponent {
  constructor() { addIcons({ qrCode, clipboardOutline, camera }); }
}
