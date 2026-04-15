import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'ax-login',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatInputModule, MatFormFieldModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>AX 기반 공공임대주택 안전 유지관리</mat-card-title>
          <mat-card-subtitle>관리자 로그인</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form (ngSubmit)="onLogin()" #loginForm="ngForm">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>이메일</mat-label>
              <input matInput type="email" name="email" [(ngModel)]="email"
                     required placeholder="admin@example.com" />
              <mat-icon matSuffix>email</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>비밀번호</mat-label>
              <input matInput [type]="hidePassword() ? 'password' : 'text'"
                     name="password" [(ngModel)]="password" required />
              <button mat-icon-button matSuffix type="button"
                      (click)="hidePassword.set(!hidePassword())">
                <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>

            @if (errorMsg()) {
              <p class="error-msg">{{ errorMsg() }}</p>
            }

            <button mat-raised-button color="primary" type="submit"
                    class="full-width login-btn" [disabled]="loading()">
              @if (loading()) {
                <mat-spinner diameter="20" />
              } @else {
                로그인
              }
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1565c0 0%, #0097a7 100%);
    }
    .login-card {
      width: 400px;
      padding: 24px;
    }
    .full-width { width: 100%; }
    .login-btn { margin-top: 16px; height: 48px; }
    .error-msg { color: #f44336; font-size: 14px; margin: 4px 0; }
    mat-card-title { font-size: 18px; }
  `],
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  loading = signal(false);
  hidePassword = signal(true);
  errorMsg = signal('');

  async onLogin() {
    if (!this.email || !this.password) return;

    this.loading.set(true);
    this.errorMsg.set('');

    try {
      await firstValueFrom(this.authService.login(this.email, this.password));
      await this.router.navigate(['/dashboard']);
    } catch (err: any) {
      this.errorMsg.set(err?.error?.message ?? '로그인에 실패했습니다.');
    } finally {
      this.loading.set(false);
    }
  }
}
