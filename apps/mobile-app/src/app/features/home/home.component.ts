import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonCardSubtitle,
  IonGrid, IonRow, IonCol, IonIcon, IonBadge, IonButton, IonChip, IonLabel,
  IonRefresher, IonRefresherContent,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { warning, construct, chatbubble, alertCircle, checkmarkCircle } from 'ionicons/icons';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonCardSubtitle,
    IonGrid, IonRow, IonCol, IonIcon, IonBadge, IonButton, IonChip, IonLabel,
    IonRefresher, IonRefresherContent,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>AX 공공임대주택 안전관리</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="onRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <ion-grid class="ion-padding">
        <ion-row>
          <ion-col size="6">
            <ion-card color="danger">
              <ion-card-content class="stat-card">
                <ion-icon name="warning" size="large"></ion-icon>
                <div class="stat-value">{{ stats().criticalDefects }}</div>
                <div class="stat-label">긴급 결함</div>
              </ion-card-content>
            </ion-card>
          </ion-col>
          <ion-col size="6">
            <ion-card color="warning">
              <ion-card-content class="stat-card">
                <ion-icon name="construct" size="large"></ion-icon>
                <div class="stat-value">{{ stats().unrepairedDefects }}</div>
                <div class="stat-label">미수리 결함</div>
              </ion-card-content>
            </ion-card>
          </ion-col>
          <ion-col size="6">
            <ion-card color="primary">
              <ion-card-content class="stat-card">
                <ion-icon name="chatbubble" size="large"></ion-icon>
                <div class="stat-value">{{ stats().pendingComplaints }}</div>
                <div class="stat-label">처리중 민원</div>
              </ion-card-content>
            </ion-card>
          </ion-col>
          <ion-col size="6">
            <ion-card color="success">
              <ion-card-content class="stat-card">
                <ion-icon name="checkmark-circle" size="large"></ion-icon>
                <div class="stat-value">{{ stats().activeProjects }}</div>
                <div class="stat-label">진행중 점검</div>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>

        <ion-card>
          <ion-card-header>
            <ion-card-title>빠른 실행</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-button expand="block" [routerLink]="['/tabs/inspection/qr-scan']">
              QR 스캔으로 점검 시작
            </ion-button>
            <ion-button expand="block" fill="outline" [routerLink]="['/tabs/cracks/capture']">
              균열 촬영 측정
            </ion-button>
          </ion-card-content>
        </ion-card>
      </ion-grid>
    </ion-content>
  `,
  styles: [`
    .stat-card { text-align: center; padding: 12px; }
    .stat-value { font-size: 32px; font-weight: bold; margin: 4px 0; }
    .stat-label { font-size: 12px; opacity: 0.9; }
  `],
})
export class HomeComponent implements OnInit {
  private readonly http = inject(HttpClient);
  stats = signal({ criticalDefects: 0, unrepairedDefects: 0, pendingComplaints: 0, activeProjects: 0 });

  constructor() {
    addIcons({ warning, construct, chatbubble, alertCircle, checkmarkCircle });
  }

  ngOnInit() { this.loadStats(); }

  async onRefresh(event: any) {
    await this.loadStats();
    event.target.complete();
  }

  private async loadStats() {
    try {
      const res = await firstValueFrom(
        this.http.get<any>(`${environment.apiUrl}/dashboard`)
      );
      const d = res.data ?? res;
      this.stats.set({
        criticalDefects: d.criticalDefects ?? 0,
        unrepairedDefects: d.unrepairedDefects ?? 0,
        pendingComplaints: d.pendingComplaints ?? 0,
        activeProjects: d.activeProjects ?? 0,
      });
    } catch (err) {
      console.error('[home] loadStats error:', err);
    }
  }
}
