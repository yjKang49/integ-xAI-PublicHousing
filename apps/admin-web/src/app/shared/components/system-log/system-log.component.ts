// apps/admin-web/src/app/shared/components/system-log/system-log.component.ts
import {
  Component, inject, signal, AfterViewChecked,
  ElementRef, ViewChild, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SystemLogService, LogLevel } from '../../../core/services/system-log.service';

const LEVEL_CLASS: Record<LogLevel, string> = {
  DEBUG: 'ax-log--debug',
  INFO:  'ax-log--info',
  WARN:  'ax-log--warn',
  ERROR: 'ax-log--error',
};

@Component({
  selector: 'ax-system-log',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <div class="ax-syslog" [class.ax-syslog--open]="open()">

      <!-- Title bar (always visible) -->
      <div class="ax-syslog__bar" (click)="toggle()">
        <span class="ax-syslog__title">
          <mat-icon class="ax-syslog__title-icon">terminal</mat-icon>
          시스템 로그
          @if (svc.errorCount() > 0) {
            <span class="ax-syslog__badge ax-syslog__badge--error">{{ svc.errorCount() }}</span>
          }
          @if (svc.warnCount() > 0) {
            <span class="ax-syslog__badge ax-syslog__badge--warn">{{ svc.warnCount() }}</span>
          }
        </span>

        <span class="ax-syslog__bar-actions" (click)="$event.stopPropagation()">
          <!-- Level filter -->
          @for (f of filters; track f) {
            <button
              class="ax-syslog__filter-btn"
              [class.active]="svc.filter() === f"
              (click)="svc.setFilter(f)"
              [matTooltip]="f"
            >{{ f }}</button>
          }
          <button mat-icon-button (click)="svc.clear()" matTooltip="로그 지우기" class="ax-syslog__icon-btn">
            <mat-icon>delete_sweep</mat-icon>
          </button>
          <button mat-icon-button (click)="toggle()" [matTooltip]="open() ? '접기' : '펼치기'" class="ax-syslog__icon-btn">
            <mat-icon>{{ open() ? 'expand_more' : 'expand_less' }}</mat-icon>
          </button>
        </span>
      </div>

      <!-- Log body -->
      @if (open()) {
        <div class="ax-syslog__body" #logBody>
          @if (svc.filtered().length === 0) {
            <div class="ax-syslog__empty">로그 없음</div>
          }
          @for (entry of svc.filtered(); track entry.id) {
            <div class="ax-syslog__entry" [ngClass]="levelClass(entry.level)">
              <span class="ax-syslog__ts">{{ entry.timestamp | date:'HH:mm:ss.SSS' }}</span>
              <span class="ax-syslog__lvl">{{ entry.level }}</span>
              <span class="ax-syslog__msg">{{ entry.message }}</span>
              @if (entry.detail) {
                <span class="ax-syslog__detail">{{ entry.detail }}</span>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .ax-syslog {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 9999;
      font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
      font-size: 11px;
      background: #0d1117;
      border-top: 1px solid #30363d;
      box-shadow: 0 -2px 12px rgba(0,0,0,.4);
      transition: height 0.2s ease;
    }

    .ax-syslog__bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 8px;
      height: 28px;
      cursor: pointer;
      user-select: none;
      background: #161b22;
      border-bottom: 1px solid #21262d;
    }

    .ax-syslog__title {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #8b949e;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: .5px;
    }

    .ax-syslog__title-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: #58a6ff;
    }

    .ax-syslog__badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      border-radius: 8px;
      font-size: 10px;
      font-weight: 700;
    }
    .ax-syslog__badge--error { background: #da3633; color: #fff; }
    .ax-syslog__badge--warn  { background: #9e6a03; color: #fff; }

    .ax-syslog__bar-actions {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .ax-syslog__filter-btn {
      background: transparent;
      border: 1px solid #30363d;
      border-radius: 4px;
      color: #8b949e;
      font-size: 10px;
      font-family: inherit;
      padding: 1px 6px;
      cursor: pointer;
      transition: all .15s;
    }
    .ax-syslog__filter-btn:hover,
    .ax-syslog__filter-btn.active {
      background: #21262d;
      color: #e6edf3;
      border-color: #58a6ff;
    }

    .ax-syslog__icon-btn {
      width: 24px !important;
      height: 24px !important;
      line-height: 24px !important;
      color: #8b949e !important;
    }
    .ax-syslog__icon-btn mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      line-height: 16px;
    }

    .ax-syslog__body {
      height: 200px;
      overflow-y: auto;
      padding: 4px 0;
      scroll-behavior: smooth;
    }

    .ax-syslog__empty {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #484f58;
      font-size: 12px;
    }

    .ax-syslog__entry {
      display: flex;
      align-items: baseline;
      gap: 8px;
      padding: 1px 12px;
      line-height: 1.6;
      border-left: 3px solid transparent;
    }
    .ax-syslog__entry:hover { background: rgba(255,255,255,.03); }

    .ax-log--debug { border-left-color: #484f58; color: #8b949e; }
    .ax-log--info  { border-left-color: #58a6ff; color: #cdd9e5; }
    .ax-log--warn  { border-left-color: #d29922; color: #e3b341; }
    .ax-log--error { border-left-color: #f85149; color: #ffa198; }

    .ax-syslog__ts  { flex-shrink: 0; color: #484f58; font-size: 10px; }
    .ax-syslog__lvl { flex-shrink: 0; width: 40px; font-weight: 700; font-size: 10px; }
    .ax-syslog__msg { flex: 1; white-space: pre-wrap; word-break: break-all; }
    .ax-syslog__detail {
      flex-shrink: 0;
      color: #484f58;
      font-size: 10px;
      white-space: pre-wrap;
      word-break: break-all;
    }
  `],
})
export class SystemLogComponent implements AfterViewChecked {
  readonly svc = inject(SystemLogService);
  readonly open = signal(false);

  @ViewChild('logBody') logBody?: ElementRef<HTMLElement>;

  readonly filters: Array<'ALL' | LogLevel> = ['ALL', 'DEBUG', 'INFO', 'WARN', 'ERROR'];

  private _prevCount = 0;
  private _shouldScroll = false;

  toggle() {
    this.open.update(v => !v);
    if (!this.open()) return;
    this._shouldScroll = true;
  }

  levelClass(level: LogLevel) {
    return LEVEL_CLASS[level];
  }

  ngAfterViewChecked() {
    const count = this.svc.filtered().length;
    if (count !== this._prevCount) {
      this._prevCount = count;
      this._shouldScroll = true;
    }
    if (this._shouldScroll && this.logBody) {
      const el = this.logBody.nativeElement;
      el.scrollTop = el.scrollHeight;
      this._shouldScroll = false;
    }
  }
}
