import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonList, IonItem, IonLabel, IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { camera, timeOutline } from 'ionicons/icons';

@Component({
  selector: 'app-crack-home',
  standalone: true,
  imports: [
    RouterLink,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonList, IonItem, IonLabel, IonIcon,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>균열 측정</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-list>
        <ion-item button [routerLink]="['capture']">
          <ion-icon name="camera" slot="start"></ion-icon>
          <ion-label>
            <h2>균열 촬영 측정</h2>
            <p>OpenCV.js 이미지 분석으로 균열 폭 측정</p>
          </ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  `,
})
export class CrackHomeComponent {
  constructor() { addIcons({ camera, timeOutline }); }
}
