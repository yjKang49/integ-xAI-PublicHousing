import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonList, IonItem, IonLabel, IonBadge, IonRefresher, IonRefresherContent,
} from '@ionic/angular/standalone';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-complaint-list-mobile',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonList, IonItem, IonLabel, IonBadge, IonRefresher, IonRefresherContent,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>민원 목록</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="onRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      <ion-list>
        @for (c of complaints(); track c._id) {
          <ion-item [routerLink]="[c._id]">
            <ion-label>
              <h2>{{ c.title }}</h2>
              <p>{{ c.submittedBy }} · {{ c.submittedAt | date:'MM/dd' }}</p>
            </ion-label>
            <ion-badge slot="end" [color]="statusColor(c.status)">{{ c.status }}</ion-badge>
          </ion-item>
        }
        @if (complaints().length === 0) {
          <ion-item><ion-label>민원이 없습니다.</ion-label></ion-item>
        }
      </ion-list>
    </ion-content>
  `,
})
export class ComplaintListMobileComponent implements OnInit {
  complaints = signal<any[]>([]);

  constructor(private http: HttpClient) {}

  ngOnInit() { this.loadComplaints(); }

  async onRefresh(event: any) {
    await this.loadComplaints();
    event.target.complete();
  }

  private async loadComplaints() {
    try {
      const res = await firstValueFrom(
        this.http.get<any>(`${environment.apiUrl}/complaints?limit=20`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        }),
      );
      this.complaints.set(res.data ?? []);
    } catch {}
  }

  statusColor(status: string) {
    const map: Record<string, string> = {
      RECEIVED: 'primary', ASSIGNED: 'secondary', IN_PROGRESS: 'warning',
      RESOLVED: 'success', CLOSED: 'medium',
    };
    return map[status] ?? 'medium';
  }
}
