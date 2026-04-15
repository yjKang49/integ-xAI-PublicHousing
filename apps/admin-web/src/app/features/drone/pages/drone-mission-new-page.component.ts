// apps/admin-web/src/app/features/drone/pages/drone-mission-new-page.component.ts
import {
  Component, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DroneApi } from '../data-access/drone.api';

@Component({
  selector: 'ax-drone-mission-new-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule,
    MatSnackBarModule,
  ],
  template: `
    <!-- 상단 네비게이션 -->
    <div class="ax-drone-new-nav">
      <a routerLink="/drone" class="ax-drone-new-nav__back">
        <mat-icon>arrow_back</mat-icon> 미션 목록
      </a>
    </div>

    <!-- 헤더 -->
    <div class="ax-drone-new-header">
      <div class="ax-drone-new-header__icon-wrap">
        <mat-icon>flight_takeoff</mat-icon>
      </div>
      <div>
        <h2 class="ax-drone-new-header__title">드론 미션 생성</h2>
        <p class="ax-drone-new-header__desc">비행 정보를 입력하여 새 드론 점검 미션을 등록합니다</p>
      </div>
    </div>

    <!-- 폼 카드 -->
    <div class="ax-drone-new-card">
      <div class="ax-drone-new-card__body">
        <div class="ax-drone-new-grid">

          <mat-form-field appearance="outline" class="ax-span-full">
            <mat-label>미션 제목 *</mat-label>
            <input matInput [(ngModel)]="form.title" placeholder="예) 101동 외벽 점검 2024-Q1" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>단지 ID *</mat-label>
            <input matInput [(ngModel)]="form.complexId" placeholder="complex:org:xxx" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>동 ID (선택)</mat-label>
            <input matInput [(ngModel)]="form.buildingId" placeholder="building:org:xxx" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>조종사 *</mat-label>
            <input matInput [(ngModel)]="form.pilot" placeholder="조종사 이름" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>비행일 *</mat-label>
            <input matInput [(ngModel)]="form.flightDate" placeholder="YYYY-MM-DD" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>드론 기종</mat-label>
            <mat-select [(ngModel)]="form.droneModel">
              <mat-option value="">선택 안 함</mat-option>
              <mat-option value="DJI Mavic 3 Enterprise">DJI Mavic 3 Enterprise</mat-option>
              <mat-option value="DJI Matrice 300 RTK">DJI Matrice 300 RTK</mat-option>
              <mat-option value="DJI Matrice 350 RTK">DJI Matrice 350 RTK</mat-option>
              <mat-option value="DJI Mini 4 Pro">DJI Mini 4 Pro</mat-option>
              <mat-option value="기타">기타</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>기상 조건</mat-label>
            <mat-select [(ngModel)]="form.weatherCondition">
              <mat-option value="">선택 안 함</mat-option>
              <mat-option value="맑음">맑음</mat-option>
              <mat-option value="흐림">흐림</mat-option>
              <mat-option value="바람">바람</mat-option>
              <mat-option value="안개">안개</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="ax-span-full">
            <mat-label>설명</mat-label>
            <textarea matInput rows="3" [(ngModel)]="form.description"
              placeholder="점검 목적, 범위, 특이사항 등"></textarea>
          </mat-form-field>
        </div>
      </div>

      <div class="ax-drone-new-card__footer">
        <button mat-button routerLink="/drone">취소</button>
        <button mat-flat-button color="primary"
          [disabled]="!isValid() || saving()"
          (click)="submit()">
          <mat-icon>save</mat-icon>
          미션 생성
        </button>
      </div>
    </div>
  `,
  styles: [`
    /* ── 네비게이션 ── */
    .ax-drone-new-nav { margin-bottom: var(--ax-spacing-3); }
    .ax-drone-new-nav__back {
      display: inline-flex; align-items: center; gap: var(--ax-spacing-1);
      color: var(--ax-color-brand-primary); text-decoration: none;
      font-size: var(--ax-font-size-sm); font-weight: var(--ax-font-weight-medium);
    }
    .ax-drone-new-nav__back:hover { text-decoration: underline; }
    .ax-drone-new-nav__back mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* ── 헤더 ── */
    .ax-drone-new-header {
      display: flex; align-items: center; gap: var(--ax-spacing-3);
      margin-bottom: var(--ax-spacing-5);
    }
    .ax-drone-new-header__icon-wrap {
      width: 44px; height: 44px; border-radius: var(--ax-radius-md);
      background: var(--ax-color-info); display: flex;
      align-items: center; justify-content: center;
      color: #fff; flex-shrink: 0;
    }
    .ax-drone-new-header__title {
      margin: 0; font-size: var(--ax-font-size-xl);
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
    }
    .ax-drone-new-header__desc {
      margin: 2px 0 0; font-size: var(--ax-font-size-sm);
      color: var(--ax-color-text-secondary);
    }

    /* ── 폼 카드 ── */
    .ax-drone-new-card {
      max-width: 720px;
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border);
      border-radius: var(--ax-radius-lg);
      overflow: hidden;
    }
    .ax-drone-new-card__body { padding: var(--ax-spacing-5); }
    .ax-drone-new-card__footer {
      display: flex; align-items: center; justify-content: flex-end;
      gap: var(--ax-spacing-2);
      padding: var(--ax-spacing-3) var(--ax-spacing-5);
      background: var(--ax-color-bg-surface-alt);
      border-top: 1px solid var(--ax-color-border);
    }

    /* ── 폼 그리드 ── */
    .ax-drone-new-grid {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 0 var(--ax-spacing-4);
    }
    .ax-span-full { grid-column: 1 / -1; }
  `],
})
export class DroneMissionNewPageComponent {
  private readonly droneApi = inject(DroneApi);
  private readonly router   = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly saving = signal(false);

  form = {
    title: '',
    complexId: '',
    buildingId: '',
    pilot: '',
    flightDate: new Date().toISOString().slice(0, 10),
    droneModel: '',
    weatherCondition: '',
    description: '',
  };

  isValid(): boolean {
    return !!(this.form.title.trim() && this.form.complexId.trim() &&
              this.form.pilot.trim() && this.form.flightDate);
  }

  submit() {
    if (!this.isValid()) return;
    this.saving.set(true);
    this.droneApi.create({
      title:            this.form.title.trim(),
      complexId:        this.form.complexId.trim(),
      buildingId:       this.form.buildingId.trim() || undefined,
      pilot:            this.form.pilot.trim(),
      flightDate:       this.form.flightDate,
      droneModel:       this.form.droneModel || undefined,
      weatherCondition: this.form.weatherCondition || undefined,
      description:      this.form.description.trim() || undefined,
    }).subscribe({
      next: (mission) => {
        this.snackBar.open('드론 미션이 생성되었습니다.', '닫기', { duration: 3000 });
        this.router.navigate(['/drone', mission._id]);
      },
      error: (e) => {
        this.snackBar.open(`생성 실패: ${e.error?.message ?? e.message}`, '닫기', { duration: 4000 });
        this.saving.set(false);
      },
    });
  }
}
