import { Component } from '@angular/core';
import {
  IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { home, search, expand, chatbubble, sync } from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="home">
          <ion-icon name="home"></ion-icon>
          <ion-label>홈</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="inspection">
          <ion-icon name="search"></ion-icon>
          <ion-label>점검</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="cracks">
          <ion-icon name="expand"></ion-icon>
          <ion-label>균열</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="complaints">
          <ion-icon name="chatbubble"></ion-icon>
          <ion-label>민원</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="sync">
          <ion-icon name="sync"></ion-icon>
          <ion-label>동기화</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
})
export class TabsComponent {
  constructor() {
    addIcons({ home, search, expand, chatbubble, sync });
  }
}
