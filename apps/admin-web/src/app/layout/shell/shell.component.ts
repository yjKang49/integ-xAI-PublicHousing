// apps/admin-web/src/app/layout/shell/shell.component.ts
import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { AuthStore } from '../../core/store/auth.store';
import { AlertStore } from '../../core/store/alert.store';
import { SystemLogComponent } from '../../shared/components/system-log/system-log.component';

@Component({
  selector: 'ax-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    SidebarComponent,
    HeaderComponent,
    SystemLogComponent,
  ],
  template: `
    <mat-sidenav-container class="ax-shell">
      <mat-sidenav
        #sidenav
        [mode]="sidenavMode()"
        [opened]="sidenavOpen()"
        (openedChange)="sidenavOpen.set($event)"
        class="ax-shell__nav"
      >
        <ax-sidebar (navItemClick)="onNavItemClick()" />
      </mat-sidenav>

      <mat-sidenav-content class="ax-shell__body">
        <ax-header (menuToggle)="sidenav.toggle()" />
        <main class="ax-shell__main">
          <router-outlet />
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>

    <ax-system-log />
  `,
  styles: [`
    .ax-shell {
      height: 100vh;
      background: var(--ax-color-bg-canvas);
    }

    .ax-shell__nav {
      width: var(--ax-sidebar-width);
      border-right: none;
      background: var(--ax-color-bg-sidebar);
      /* 사이드바 자체 그림자로 콘텐츠와 시각 분리 */
      box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
    }

    .ax-shell__body {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--ax-color-bg-canvas);
    }

    .ax-shell__main {
      flex: 1;
      overflow-y: auto;
      padding: var(--ax-page-gutter);
      padding-bottom: calc(var(--ax-page-gutter) + 28px); /* clear system log bar */
      background: var(--ax-color-bg-canvas);
    }
  `],
})
export class ShellComponent {
  readonly authStore = inject(AuthStore);
  private readonly alertStore = inject(AlertStore);
  readonly sidenavOpen = signal(true);
  readonly sidenavMode = signal<'side' | 'over'>('side');

  constructor() {
    this.alertStore.refresh();
  }

  onNavItemClick() {
    if (this.sidenavMode() === 'over') this.sidenavOpen.set(false);
  }
}
