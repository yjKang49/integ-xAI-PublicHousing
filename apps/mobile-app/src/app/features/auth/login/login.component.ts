// apps/mobile-app/src/app/features/auth/login/login.component.ts
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonItem, IonLabel, IonInput, IonButton, IonText, IonSpinner,
} from '@ionic/angular/standalone';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonCard, IonCardContent, IonCardHeader, IonCardTitle,
    IonItem, IonLabel, IonInput, IonButton, IonText, IonSpinner,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>AX 안전관리</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="login-wrap">
        <ion-card>
          <ion-card-header>
            <ion-card-title>로그인</ion-card-title>
          </ion-card-header>

          <ion-card-content>
            <ion-item>
              <ion-label position="stacked">이메일</ion-label>
              <ion-input
                type="email"
                [(ngModel)]="email"
                placeholder="inspector@example.com"
                autocomplete="email"
              />
            </ion-item>

            <ion-item>
              <ion-label position="stacked">비밀번호</ion-label>
              <ion-input
                type="password"
                [(ngModel)]="password"
                autocomplete="current-password"
              />
            </ion-item>

            @if (errorMsg()) {
              <ion-text color="danger">
                <p class="error-msg">{{ errorMsg() }}</p>
              </ion-text>
            }

            <ion-button
              expand="block"
              (click)="onLogin()"
              [disabled]="loading()"
              class="ion-margin-top"
            >
              @if (loading()) {
                <ion-spinner name="crescent" />
              } @else {
                로그인
              }
            </ion-button>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  `,
  styles: [`
    .login-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
    }
    .error-msg { font-size: 13px; margin: 8px 0 0; }
  `],
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  loading = signal(false);
  errorMsg = signal('');

  async onLogin() {
    if (!this.email || !this.password) {
      this.errorMsg.set('이메일과 비밀번호를 입력하세요.');
      return;
    }

    this.loading.set(true);
    this.errorMsg.set('');

    try {
      await firstValueFrom(this.authService.login(this.email, this.password));
      await this.router.navigate(['/tabs/home']);
    } catch (err: any) {
      this.errorMsg.set(
        err?.error?.message ?? err?.message ?? '로그인에 실패했습니다.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}
