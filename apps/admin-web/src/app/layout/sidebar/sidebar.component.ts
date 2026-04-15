// apps/admin-web/src/app/layout/sidebar/sidebar.component.ts
import { Component, inject, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthStore } from '../../core/store/auth.store';
import { UserRole } from '@ax/shared';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: UserRole[];
  badge?: string;
  badgeColor?: 'danger' | 'warn' | 'info';
}

interface NavGroup {
  groupLabel: string;
  groupIcon?: string;
  items: NavItem[];
}

@Component({
  selector: 'ax-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatIconModule, MatTooltipModule],
  template: `
    <!-- ── 브랜드 헤더 ── -->
    <div class="sb-brand">
      <div class="sb-brand__icon">
        <mat-icon>shield</mat-icon>
      </div>
      <div class="sb-brand__text">
        <span class="sb-brand__name">에이톰-AX</span>
        <span class="sb-brand__sub">공공임대 AI 관리 플랫폼</span>
      </div>
    </div>

    <!-- ── 네비게이션 그룹 목록 ── -->
    <nav class="sb-nav" aria-label="주 메뉴">
      @for (group of visibleNavGroups; track group.groupLabel) {
        <div class="sb-group">
          <span class="sb-group__label" aria-hidden="true">{{ group.groupLabel }}</span>
          <ul class="sb-group__list" role="list">
            @for (item of group.items; track item.route) {
              <li>
                <a
                  class="sb-item"
                  [routerLink]="item.route"
                  routerLinkActive="sb-item--active"
                  [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
                  (click)="navItemClick.emit()"
                  [attr.aria-label]="item.badge ? item.label + ' ' + item.badge + '건 대기' : item.label"
                >
                  <mat-icon class="sb-item__icon" aria-hidden="true">{{ item.icon }}</mat-icon>
                  <span class="sb-item__label">{{ item.label }}</span>
                  @if (item.badge) {
                    <span class="sb-item__badge sb-item__badge--{{ item.badgeColor ?? 'danger' }}"
                          aria-label="{{ item.badge }}건">
                      {{ item.badge }}
                    </span>
                  }
                </a>
              </li>
            }
          </ul>
        </div>
      }
    </nav>

    <!-- ── 하단 유틸 영역 ── -->
    <div class="sb-footer">
      <div class="sb-footer__user">
        <mat-icon class="sb-footer__avatar" aria-hidden="true">account_circle</mat-icon>
        <div class="sb-footer__info">
          <span class="sb-footer__name">{{ authStore.user()?.name }}</span>
          <span class="sb-footer__role">{{ roleLabel() }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--ax-color-bg-sidebar);
      overflow: hidden;
    }

    /* ── 브랜드 ── */
    .sb-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 18px 16px 14px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      flex-shrink: 0;
    }

    .sb-brand__icon {
      width: 32px;
      height: 32px;
      background: rgba(255,255,255,0.12);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: rgba(255,255,255,0.9);
      }
    }

    .sb-brand__text {
      display: flex;
      flex-direction: column;
      gap: 1px;
      min-width: 0;
    }

    .sb-brand__name {
      font-size: 14px;
      font-weight: 700;
      color: rgba(255,255,255,0.95);
      letter-spacing: -0.01em;
      line-height: 1.2;
      white-space: nowrap;
    }

    .sb-brand__sub {
      font-size: 10px;
      color: rgba(255,255,255,0.45);
      letter-spacing: 0.01em;
      white-space: nowrap;
    }

    /* ── 내비게이션 ── */
    .sb-nav {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 8px 0;

      /* 내부 스크롤바 */
      &::-webkit-scrollbar { width: 4px; }
      &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }
    }

    .sb-group {
      padding: 12px 0 4px;

      &:first-child { padding-top: 4px; }
    }

    .sb-group__label {
      display: block;
      padding: 0 16px 4px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: rgba(255,255,255,0.35);
    }

    .sb-group__list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    /* ── 메뉴 아이템 ── */
    .sb-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 16px;
      margin: 1px 8px;
      border-radius: 6px;
      cursor: pointer;
      text-decoration: none;
      color: rgba(255,255,255,0.65);
      transition: background 120ms ease, color 120ms ease;
      position: relative;
      min-height: 36px;

      &:hover {
        background: rgba(255,255,255,0.08);
        color: rgba(255,255,255,0.90);
      }

      /* active 상태: 좌측 인디케이터 + 배경 */
      &--active {
        background: rgba(255,255,255,0.12);
        color: #ffffff;

        &::before {
          content: '';
          position: absolute;
          left: -8px;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 20px;
          background: var(--ax-color-brand-primary);
          border-radius: 0 3px 3px 0;
        }

        .sb-item__icon {
          color: rgba(255,255,255,0.95);
        }
      }

      &:focus-visible {
        outline: 2px solid rgba(255,255,255,0.6);
        outline-offset: -2px;
      }
    }

    .sb-item__icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: rgba(255,255,255,0.55);
      flex-shrink: 0;
      transition: color 120ms ease;
    }

    .sb-item__label {
      flex: 1;
      font-size: 13px;
      font-weight: 400;
      line-height: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sb-item__badge {
      flex-shrink: 0;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 10px;
      line-height: 1.4;

      &--danger {
        background: rgba(220, 38, 38, 0.9);
        color: #fff;
      }

      &--warn {
        background: rgba(217, 119, 6, 0.9);
        color: #fff;
      }

      &--info {
        background: rgba(37, 99, 235, 0.9);
        color: #fff;
      }
    }

    /* ── 하단 유저 영역 ── */
    .sb-footer {
      flex-shrink: 0;
      border-top: 1px solid rgba(255,255,255,0.08);
      padding: 12px 16px;
    }

    .sb-footer__user {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 8px;
      border-radius: 6px;
      cursor: default;
    }

    .sb-footer__avatar {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: rgba(255,255,255,0.5);
      flex-shrink: 0;
    }

    .sb-footer__info {
      display: flex;
      flex-direction: column;
      gap: 1px;
      min-width: 0;
    }

    .sb-footer__name {
      font-size: 13px;
      font-weight: 500;
      color: rgba(255,255,255,0.80);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sb-footer__role {
      font-size: 10px;
      color: rgba(255,255,255,0.40);
    }
  `],
})
export class SidebarComponent {
  readonly navItemClick = output<void>();
  readonly authStore = inject(AuthStore);

  // ── 도메인별 그룹화 ──────────────────────────────────────────────────────────
  private readonly allGroups: NavGroup[] = [
    {
      groupLabel: '개요',
      items: [
        { label: '운영 대시보드', icon: 'dashboard', route: '/dashboard' },
      ],
    },
    {
      groupLabel: 'AI 운영',
      items: [
        {
          label: 'AI 검토 수신함',   icon: 'mark_email_unread', route: '/ai-inbox',
          badge: '9', badgeColor: 'danger',
          roles: [UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.SUPER_ADMIN],
        },
        {
          label: 'AI 운영 성과',     icon: 'auto_awesome',      route: '/ai-performance',
          roles: [UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.VIEWER, UserRole.SUPER_ADMIN],
        },
        {
          label: 'AI 파이프라인',    icon: 'hub',               route: '/ai-pipeline',
          roles: [UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.SUPER_ADMIN],
        },
        {
          label: 'CleanHouse 마일리지', icon: 'workspace_premium', route: '/mileage',
          roles: [UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.VIEWER, UserRole.SUPER_ADMIN],
        },
        {
          label: 'Vision 2030',     icon: 'rocket_launch',     route: '/vision2030',
          roles: [UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.VIEWER, UserRole.SUPER_ADMIN],
        },
      ],
    },
    {
      groupLabel: '시설물 관리',
      items: [
        { label: '단지/시설물',   icon: 'apartment',           route: '/complexes' },
        {
          label: '점검 관리',    icon: 'assignment',          route: '/inspection/projects',
          roles: [UserRole.ORG_ADMIN, UserRole.INSPECTOR, UserRole.REVIEWER],
        },
        {
          label: '결함 관리',    icon: 'report_problem',      route: '/defects',
          roles: [UserRole.ORG_ADMIN, UserRole.INSPECTOR, UserRole.REVIEWER],
        },
        { label: '균열 모니터링', icon: 'timeline',            route: '/cracks' },
      ],
    },
    {
      groupLabel: '민원 & 작업',
      items: [
        {
          label: '민원 관리',       icon: 'support_agent',       route: '/complaints',
          roles: [UserRole.ORG_ADMIN, UserRole.COMPLAINT_MGR, UserRole.VIEWER],
        },
        {
          label: 'AI 민원 트리아지', icon: 'model_training',      route: '/complaints/triage',
          roles: [UserRole.ORG_ADMIN, UserRole.COMPLAINT_MGR, UserRole.REVIEWER, UserRole.SUPER_ADMIN],
        },
        {
          label: '작업지시',        icon: 'build_circle',        route: '/work-orders',
          roles: [UserRole.ORG_ADMIN, UserRole.COMPLAINT_MGR, UserRole.INSPECTOR, UserRole.REVIEWER],
        },
        { label: '일정 관리',       icon: 'event',               route: '/schedules' },
        { label: '경보',            icon: 'notifications_active', route: '/alerts' },
      ],
    },
    {
      groupLabel: '분석 & 보고',
      items: [
        {
          label: '보고서',     icon: 'description', route: '/reports',
          roles: [UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.VIEWER],
        },
        {
          label: 'KPI',       icon: 'bar_chart',   route: '/kpi',
          roles: [UserRole.ORG_ADMIN, UserRole.VIEWER],
        },
        {
          label: '행정자동화 RPA', icon: 'smart_toy', route: '/rpa',
          roles: [UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN, UserRole.REVIEWER],
        },
        {
          label: 'IoT 센서',  icon: 'sensors',     route: '/iot',
          roles: [UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.INSPECTOR, UserRole.SUPER_ADMIN],
        },
        {
          label: '예지정비',  icon: 'shield',      route: '/risk',
          roles: [UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.SUPER_ADMIN],
        },
      ],
    },
    {
      groupLabel: 'AI 분석 검토',
      items: [
        {
          label: 'AI 결함 탐지',   icon: 'manage_search', route: '/ai-detections',
          roles: [UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.INSPECTOR, UserRole.SUPER_ADMIN],
        },
        {
          label: 'AI 진단 의견',   icon: 'psychology',    route: '/diagnosis',
          roles: [UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.SUPER_ADMIN],
        },
        {
          label: '균열 분석 검토', icon: 'biotech',       route: '/crack-analysis',
          roles: [UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.INSPECTOR, UserRole.SUPER_ADMIN],
        },
      ],
    },
    {
      groupLabel: '시스템',
      items: [
        {
          label: '비동기 작업', icon: 'pending_actions', route: '/jobs',
          roles: [UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN, UserRole.REVIEWER],
        },
        {
          label: '기능 플래그', icon: 'toggle_on',      route: '/feature-flags',
          roles: [UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN],
        },
        {
          label: '설정',       icon: 'settings',       route: '/settings',
          roles: [UserRole.ORG_ADMIN],
        },
      ],
    },
  ];

  get visibleNavGroups(): NavGroup[] {
    const userRole = this.authStore.user()?.role;
    if (!userRole) return [];

    return this.allGroups
      .map((group) => ({
        ...group,
        items: userRole === UserRole.SUPER_ADMIN
          ? group.items
          : group.items.filter((item) => !item.roles || item.roles.includes(userRole)),
      }))
      .filter((group) => group.items.length > 0);
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
}
