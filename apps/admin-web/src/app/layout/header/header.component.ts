// apps/admin-web/src/app/layout/header/header.component.ts
import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthStore } from '../../core/store/auth.store';
import { AlertStore } from '../../core/store/alert.store';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'ax-header',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatIconModule, MatButtonModule, MatMenuModule,
    MatDividerModule, MatTooltipModule,
  ],
  template: `
    <header class="ax-topbar" role="banner">
      <!-- ── 좌측: 메뉴 토글 + 앱명 ── -->
      <div class="ax-topbar__left">
        <button
          class="ax-topbar__menu-btn"
          (click)="menuToggle.emit()"
          aria-label="사이드 메뉴 토글"
          matTooltip="메뉴"
        >
          <mat-icon>menu</mat-icon>
        </button>

        <div class="ax-topbar__brand" aria-label="앱 이름">
          <span class="ax-topbar__app-name">AX 공공임대주택 안전 유지관리</span>
        </div>
      </div>

      <!-- ── 우측: 알림 + 유저 ── -->
      <div class="ax-topbar__right">

        <!-- 활성 경보 카운트 -->
        <a
          class="ax-topbar__action-btn"
          routerLink="/alerts"
          [attr.aria-label]="alertStore.activeCount() > 0 ? '활성 경보 ' + alertStore.activeCount() + '건' : '경보'"
          matTooltip="{{ alertStore.activeCount() > 0 ? '활성 경보 ' + alertStore.activeCount() + '건' : '경보 없음' }}"
        >
          <mat-icon>notifications</mat-icon>
          @if (alertStore.activeCount() > 0) {
            <span class="ax-topbar__alert-badge" aria-hidden="true">
              {{ alertStore.activeCount() > 99 ? '99+' : alertStore.activeCount() }}
            </span>
          }
        </a>

        <!-- 구분선 -->
        <div class="ax-topbar__sep" aria-hidden="true"></div>

        <!-- 유저 메뉴 -->
        <button
          class="ax-topbar__user-btn"
          [matMenuTriggerFor]="userMenu"
          [attr.aria-label]="authStore.user()?.name + ' 계정 메뉴'"
        >
          <div class="ax-topbar__avatar" aria-hidden="true">
            {{ userInitial() }}
          </div>
          <div class="ax-topbar__user-info">
            <span class="ax-topbar__user-name">{{ authStore.user()?.name }}</span>
            <span class="ax-topbar__user-role">{{ roleLabel() }}</span>
          </div>
          <mat-icon class="ax-topbar__chevron" aria-hidden="true">expand_more</mat-icon>
        </button>

        <!-- 유저 드롭다운 -->
        <mat-menu #userMenu="matMenu" class="ax-user-menu">
          <div class="ax-user-menu__header">
            <div class="ax-user-menu__avatar">{{ userInitial() }}</div>
            <div class="ax-user-menu__info">
              <span class="ax-user-menu__name">{{ authStore.user()?.name }}</span>
              <span class="ax-user-menu__email">{{ authStore.user()?.email }}</span>
            </div>
          </div>
          <div class="ax-user-menu__role-chip">{{ roleLabel() }}</div>

          <mat-divider />

          <button mat-menu-item routerLink="/settings">
            <mat-icon>settings</mat-icon>
            <span>설정</span>
          </button>

          <mat-divider />

          <button mat-menu-item class="ax-user-menu__logout" (click)="logout()">
            <mat-icon>logout</mat-icon>
            <span>로그아웃</span>
          </button>
        </mat-menu>

      </div>
    </header>
  `,
  styles: [`
    .ax-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: var(--ax-header-height);
      background: var(--ax-color-bg-header);
      padding: 0 var(--ax-spacing-16);
      flex-shrink: 0;
      position: relative;
      z-index: var(--ax-z-header);
      /* 헤더 하단 분리선 */
      box-shadow: 0 1px 0 rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.12);
    }

    /* ── 좌측 ── */
    .ax-topbar__left {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-12);
    }

    .ax-topbar__menu-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      background: transparent;
      border: none;
      border-radius: var(--ax-radius-md);
      cursor: pointer;
      color: rgba(255,255,255,0.75);
      transition: background var(--ax-transition-fast), color var(--ax-transition-fast);

      mat-icon { font-size: 20px; width: 20px; height: 20px; }

      &:hover {
        background: rgba(255,255,255,0.10);
        color: rgba(255,255,255,0.95);
      }

      &:focus-visible {
        outline: 2px solid rgba(255,255,255,0.5);
        outline-offset: 2px;
      }
    }

    .ax-topbar__app-name {
      font-size: 14px;
      font-weight: 500;
      color: rgba(255,255,255,0.80);
      letter-spacing: -0.01em;
      white-space: nowrap;
    }

    /* ── 우측 ── */
    .ax-topbar__right {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-4);
    }

    .ax-topbar__action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      width: 36px;
      height: 36px;
      background: transparent;
      border: none;
      border-radius: var(--ax-radius-md);
      cursor: pointer;
      color: rgba(255,255,255,0.70);
      text-decoration: none;
      transition: background var(--ax-transition-fast), color var(--ax-transition-fast);

      mat-icon { font-size: 20px; width: 20px; height: 20px; }

      &:hover {
        background: rgba(255,255,255,0.10);
        color: rgba(255,255,255,0.95);
      }

      &:focus-visible {
        outline: 2px solid rgba(255,255,255,0.5);
        outline-offset: 2px;
      }
    }

    .ax-topbar__alert-badge {
      position: absolute;
      top: 4px;
      right: 3px;
      background: var(--ax-color-danger);
      color: #fff;
      font-size: 9px;
      font-weight: 700;
      padding: 0 4px;
      border-radius: 8px;
      min-width: 14px;
      height: 14px;
      line-height: 14px;
      text-align: center;
    }

    .ax-topbar__sep {
      width: 1px;
      height: 20px;
      background: rgba(255,255,255,0.12);
      margin: 0 var(--ax-spacing-4);
    }

    /* ── 유저 버튼 ── */
    .ax-topbar__user-btn {
      display: flex;
      align-items: center;
      gap: var(--ax-spacing-8);
      padding: 4px 10px 4px 6px;
      background: transparent;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: var(--ax-radius-md);
      cursor: pointer;
      color: rgba(255,255,255,0.85);
      transition: background var(--ax-transition-fast), border-color var(--ax-transition-fast);
      max-width: 200px;

      &:hover {
        background: rgba(255,255,255,0.08);
        border-color: rgba(255,255,255,0.22);
      }

      &:focus-visible {
        outline: 2px solid rgba(255,255,255,0.5);
        outline-offset: 2px;
      }
    }

    .ax-topbar__avatar {
      width: 26px;
      height: 26px;
      background: var(--ax-color-brand-primary);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      color: #fff;
      flex-shrink: 0;
      letter-spacing: -0.01em;
    }

    .ax-topbar__user-info {
      display: flex;
      flex-direction: column;
      gap: 0;
      min-width: 0;
    }

    .ax-topbar__user-name {
      font-size: 13px;
      font-weight: 500;
      color: rgba(255,255,255,0.90);
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ax-topbar__user-role {
      font-size: 10px;
      color: rgba(255,255,255,0.45);
      line-height: 1;
    }

    .ax-topbar__chevron {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: rgba(255,255,255,0.45);
    }
  `],
})
export class HeaderComponent {
  readonly menuToggle = output<void>();
  readonly authStore = inject(AuthStore);
  readonly alertStore = inject(AlertStore);
  private readonly authService = inject(AuthService);

  userInitial(): string {
    const name = this.authStore.user()?.name ?? '';
    return name.charAt(0).toUpperCase() || '?';
  }

  roleLabel(): string {
    const roleMap: Record<string, string> = {
      SUPER_ADMIN:   '슈퍼 관리자',
      ORG_ADMIN:     '기관 관리자',
      REVIEWER:      '검토자',
      INSPECTOR:     '점검자',
      COMPLAINT_MGR: '민원 담당',
      VIEWER:        '열람자',
    };
    const role = this.authStore.user()?.role;
    return role ? (roleMap[role] ?? role) : '';
  }

  logout() {
    this.authService.logout();
  }
}
