// apps/admin-web/src/app/features/feature-flags/pages/feature-flag-page.component.ts
import {
  Component, OnInit, inject, signal, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { environment } from '../../../../environments/environment';
import { FeatureFlag } from '@ax/shared';
import {
  PageHeaderComponent,
  EmptyStateComponent,
  SkeletonComponent,
} from '../../../shared/components';

// ── Flag group definitions ─────────────────────────────────────────────────
interface FlagGroup {
  key: string;
  label: string;
  icon: string;
  tokenColor: string;
  prefix: string;
  flags: FeatureFlag[];
}

const GROUP_DEFS = [
  { key: 'phase2', label: 'Phase 2 기능', icon: 'rocket_launch',          tokenColor: 'var(--ax-color-brand-primary)', prefix: 'phase2.' },
  { key: 'ai',     label: 'AI 설정',      icon: 'smart_toy',               tokenColor: 'var(--ax-color-info)',          prefix: 'ai.'     },
  { key: 'rpa',    label: 'RPA 설정',     icon: 'precision_manufacturing',  tokenColor: 'var(--ax-color-success)',       prefix: 'rpa.'    },
];

@Component({
  selector: 'ax-feature-flag-page',
  standalone: true,
  imports: [
    CommonModule,
    MatSlideToggleModule, MatSnackBarModule,
    MatIconModule, MatButtonModule,
    PageHeaderComponent, EmptyStateComponent, SkeletonComponent,
  ],
  template: `
    <ax-page-header
      title="기능 플래그 관리"
      description="Phase 2 기능을 점진적으로 활성화하세요"
      icon="toggle_on">
      <div ax-page-actions>
        <button mat-stroked-button (click)="load()">
          <mat-icon [class.ax-spinning]="loading()">refresh</mat-icon> 새로고침
        </button>
      </div>
    </ax-page-header>

    @if (loading() && flags().length === 0) {
      <ax-skeleton type="list" />
    }

    @for (group of groupedFlags(); track group.key) {
      @if (group.flags.length > 0) {
        <div class="flag-group">
          <div class="flag-group__header">
            <mat-icon [style.color]="group.tokenColor">{{ group.icon }}</mat-icon>
            <span class="flag-group__label ax-text-section-title">{{ group.label }}</span>
            <span class="flag-group__count">{{ group.flags.length }}개</span>
          </div>

          <div class="flag-list">
            @for (flag of group.flags; track flag._id) {
              <div class="flag-card" [class.flag-card--enabled]="flag.enabled">
                <div class="flag-card__body">
                  <code class="flag-key">{{ flag.key }}</code>
                  <p class="ax-text-body flag-desc">{{ flag.description }}</p>

                  @if (flag.enabledForOrgIds && flag.enabledForOrgIds.length > 0) {
                    <div class="org-list">
                      <mat-icon class="org-list__icon">business</mat-icon>
                      <span class="ax-text-meta">활성화 조직:</span>
                      @for (orgId of flag.enabledForOrgIds; track orgId) {
                        <code class="org-chip">{{ orgId }}</code>
                      }
                    </div>
                  }

                  <div class="flag-updated ax-text-meta">
                    <mat-icon style="font-size:13px;width:13px;height:13px">schedule</mat-icon>
                    최종 수정: {{ flag.updatedAt | date:'yyyy-MM-dd HH:mm' }}
                  </div>
                </div>

                <div class="flag-card__toggle">
                  @if (saving() === flag.key) {
                    <div class="toggle-saving ax-spinning">
                      <mat-icon>sync</mat-icon>
                    </div>
                  } @else {
                    <mat-slide-toggle
                      [checked]="flag.enabled"
                      color="primary"
                      (change)="onToggle(flag, $event.checked)"
                      [matTooltip]="flag.enabled ? '비활성화' : '활성화'" />
                  }
                  <span class="toggle-label" [class.toggle-label--on]="flag.enabled">
                    {{ flag.enabled ? '활성' : '비활성' }}
                  </span>
                </div>
              </div>
            }
          </div>
        </div>
        <hr class="group-divider" />
      }
    }

    @if (ungroupedFlags().length > 0) {
      <div class="flag-group">
        <div class="flag-group__header">
          <mat-icon style="color: var(--ax-color-text-secondary)">label</mat-icon>
          <span class="flag-group__label ax-text-section-title">기타</span>
        </div>
        <div class="flag-list">
          @for (flag of ungroupedFlags(); track flag._id) {
            <div class="flag-card" [class.flag-card--enabled]="flag.enabled">
              <div class="flag-card__body">
                <code class="flag-key">{{ flag.key }}</code>
                <p class="ax-text-body flag-desc">{{ flag.description }}</p>
                <div class="flag-updated ax-text-meta">
                  <mat-icon style="font-size:13px;width:13px;height:13px">schedule</mat-icon>
                  최종 수정: {{ flag.updatedAt | date:'yyyy-MM-dd HH:mm' }}
                </div>
              </div>
              <div class="flag-card__toggle">
                @if (saving() === flag.key) {
                  <div class="toggle-saving ax-spinning"><mat-icon>sync</mat-icon></div>
                } @else {
                  <mat-slide-toggle
                    [checked]="flag.enabled"
                    color="primary"
                    (change)="onToggle(flag, $event.checked)"
                    [matTooltip]="flag.enabled ? '비활성화' : '활성화'" />
                }
                <span class="toggle-label" [class.toggle-label--on]="flag.enabled">
                  {{ flag.enabled ? '활성' : '비활성' }}
                </span>
              </div>
            </div>
          }
        </div>
      </div>
    }

    @if (!loading() && flags().length === 0) {
      <ax-empty-state
        type="empty"
        title="등록된 기능 플래그가 없습니다"
        description="시스템에 기능 플래그를 등록한 후 확인해 주세요."
        (primaryAction)="load()" />
    }
  `,
  styles: [`
    /* Flag group */
    .flag-group { margin-bottom: var(--ax-space-4); }

    .flag-group__header {
      display: flex;
      align-items: center;
      gap: var(--ax-space-2);
      margin-bottom: var(--ax-space-3);
      padding: var(--ax-space-1) 0;
    }

    .flag-group__label { flex: 1; }

    .flag-group__count {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-secondary);
      background: var(--ax-color-bg-surface-alt);
      border: 1px solid var(--ax-color-border);
      padding: 2px var(--ax-space-2);
      border-radius: var(--ax-radius-pill);
    }

    /* Flag list */
    .flag-list {
      display: flex;
      flex-direction: column;
      gap: var(--ax-space-2);
    }

    /* Flag card */
    .flag-card {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--ax-space-4);
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border);
      border-left: 4px solid var(--ax-color-border);
      border-radius: var(--ax-radius-card);
      padding: var(--ax-space-4);
      transition: border-color 0.2s, box-shadow 0.2s;

      &:hover { box-shadow: var(--ax-shadow-card-hover); }
      &--enabled { border-left-color: var(--ax-color-brand-primary); }
    }

    .flag-card__body { flex: 1; }

    /* Flag key */
    .flag-key {
      display: inline-block;
      font-family: 'Roboto Mono', 'Consolas', monospace;
      font-size: var(--ax-font-size-xs);
      font-weight: 600;
      background: var(--ax-color-brand-primary-subtle);
      color: var(--ax-color-brand-primary);
      padding: 3px var(--ax-space-2);
      border-radius: var(--ax-radius-sm);
      letter-spacing: 0.3px;
      margin-bottom: var(--ax-space-2);
    }

    .flag-desc { margin: var(--ax-space-1) 0 var(--ax-space-2); }

    /* Org list */
    .org-list {
      display: flex;
      align-items: center;
      gap: var(--ax-space-2);
      flex-wrap: wrap;
      margin-bottom: var(--ax-space-2);
    }
    .org-list__icon { font-size: 14px; width: 14px; height: 14px; }
    .org-chip {
      font-family: monospace;
      font-size: var(--ax-font-size-xs);
      background: var(--ax-color-warning-subtle);
      color: var(--ax-color-warning);
      border: 1px solid var(--ax-color-warning);
      border-radius: var(--ax-radius-sm);
      padding: 1px var(--ax-space-2);
    }

    /* Updated timestamp */
    .flag-updated {
      display: flex;
      align-items: center;
      gap: var(--ax-space-1);
    }

    /* Toggle area */
    .flag-card__toggle {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--ax-space-1);
      padding-top: var(--ax-space-1);
      flex-shrink: 0;
    }

    .toggle-saving { color: var(--ax-color-brand-primary); }
    .toggle-label {
      font-size: var(--ax-font-size-xs);
      font-weight: 600;
      color: var(--ax-color-text-secondary);
      &--on { color: var(--ax-color-brand-primary); }
    }

    /* Divider */
    .group-divider {
      border: none;
      border-top: 1px solid var(--ax-color-border);
      margin: var(--ax-space-5) 0;
    }
  `],
})
export class FeatureFlagPageComponent implements OnInit {
  private readonly http     = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);

  readonly flags   = signal<FeatureFlag[]>([]);
  readonly loading = signal(false);
  readonly saving  = signal<string | null>(null);

  readonly groupedFlags = computed<FlagGroup[]>(() =>
    GROUP_DEFS.map((def) => ({
      ...def,
      flags: this.flags().filter((f) => f.key.startsWith(def.prefix)),
    })),
  );

  readonly ungroupedFlags = computed<FeatureFlag[]>(() => {
    const allPrefixes = GROUP_DEFS.map((g) => g.prefix);
    return this.flags().filter(
      (f) => !allPrefixes.some((p) => f.key.startsWith(p)),
    );
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.http.get<any>(`${environment.apiUrl}/feature-flags`).subscribe({
      next: (res) => {
        this.flags.set(res.data ?? res ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('기능 플래그를 불러오지 못했습니다.', '닫기', { duration: 3000 });
      },
    });
  }

  onToggle(flag: FeatureFlag, newEnabled: boolean): void {
    this.saving.set(flag.key);
    this.http
      .put<any>(`${environment.apiUrl}/feature-flags/${encodeURIComponent(flag.key)}`, {
        enabled: newEnabled,
      })
      .subscribe({
        next: () => {
          this.flags.update((list) =>
            list.map((f) =>
              f.key === flag.key
                ? { ...f, enabled: newEnabled, updatedAt: new Date().toISOString() }
                : f,
            ),
          );
          this.saving.set(null);
          this.snackBar.open(
            `"${flag.key}" 플래그가 ${newEnabled ? '활성화' : '비활성화'}되었습니다.`,
            '닫기', { duration: 2500 },
          );
        },
        error: () => {
          this.flags.update((list) =>
            list.map((f) =>
              f.key === flag.key ? { ...f, enabled: flag.enabled } : f,
            ),
          );
          this.saving.set(null);
          this.snackBar.open(
            `"${flag.key}" 변경에 실패했습니다.`,
            '닫기', { duration: 3000, panelClass: 'error-snack' },
          );
        },
      });
  }
}
