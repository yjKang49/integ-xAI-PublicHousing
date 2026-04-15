import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonItem, IonLabel, IonBadge, IonBackButton, IonButtons,
} from '@ionic/angular/standalone';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-complaint-detail-mobile',
  standalone: true,
  imports: [
    CommonModule,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonCard, IonCardContent, IonCardHeader, IonCardTitle,
    IonItem, IonLabel, IonBadge, IonBackButton, IonButtons,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/complaints"></ion-back-button></ion-buttons>
        <ion-title>민원 상세</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      @if (complaint()) {
        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ complaint().title }}</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-item lines="none">
              <ion-label>상태</ion-label>
              <ion-badge slot="end">{{ complaint().status }}</ion-badge>
            </ion-item>
            <ion-item lines="none">
              <ion-label>
                <h3>설명</h3>
                <p>{{ complaint().description }}</p>
              </ion-label>
            </ion-item>
            <ion-item lines="none">
              <ion-label>
                <p>접수: {{ complaint().submittedAt | date:'yyyy-MM-dd HH:mm' }}</p>
              </ion-label>
            </ion-item>
          </ion-card-content>
        </ion-card>
      }
    </ion-content>
  `,
})
export class ComplaintDetailMobileComponent implements OnInit {
  complaint = signal<any>(null);

  constructor(private route: ActivatedRoute, private http: HttpClient) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      try {
        const res = await firstValueFrom(
          this.http.get<any>(`${environment.apiUrl}/complaints/${id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
          }),
        );
        this.complaint.set(res.data);
      } catch {}
    }
  }
}
