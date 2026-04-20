// apps/admin-web/src/app/core/services/screenshot.service.ts
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ScreenshotService {
  readonly capturing = signal(false);

  /**
   * 현재 페이지(메인 콘텐츠 영역)를 캡처하여 PNG 다운로드
   * html2canvas CDN이 window.html2canvas 로 로드되어 있어야 합니다.
   */
  async captureAndDownload(filename?: string): Promise<void> {
    if (this.capturing()) return;

    const h2c = (window as any)['html2canvas'];
    if (!h2c) {
      console.error('[ScreenshotService] html2canvas not loaded');
      return;
    }

    this.capturing.set(true);
    try {
      const target = document.querySelector('mat-sidenav-content .ax-shell__main')
        ?? document.querySelector('mat-sidenav-content')
        ?? document.body;

      const canvas: HTMLCanvasElement = await h2c(target as HTMLElement, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        backgroundColor: '#0b1220',
        logging: false,
        ignoreElements: (el: Element) =>
          el.classList.contains('ax-syslog') || el.tagName === 'MAT-SNACK-BAR-CONTAINER',
      });

      this._applyBrandOverlay(canvas);

      const link = document.createElement('a');
      link.download = filename ?? `AX_${this._dateTag()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('[ScreenshotService] capture failed', err);
    } finally {
      this.capturing.set(false);
    }
  }

  private _applyBrandOverlay(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const scale = 2;

    // 하단 브랜드 바
    const barH = 28 * scale;
    ctx.fillStyle = 'rgba(5, 12, 26, 0.92)';
    ctx.fillRect(0, H - barH, W, barH);

    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(0, H - barH, 3 * scale, barH);

    ctx.font = `${11 * scale}px "Segoe UI", system-ui, sans-serif`;
    ctx.fillStyle = '#93c5fd';
    ctx.textBaseline = 'middle';
    ctx.fillText('에이톰-AX', 8 * scale, H - barH / 2);

    ctx.fillStyle = '#475569';
    ctx.fillText('|', 70 * scale, H - barH / 2);

    ctx.fillStyle = '#94a3b8';
    ctx.fillText('AX 공공임대주택 안전 유지관리 플랫폼', 80 * scale, H - barH / 2);

    ctx.fillStyle = '#64748b';
    const dateStr = new Date().toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
    const dateW = ctx.measureText(dateStr).width;
    ctx.fillText(dateStr, W - dateW - 8 * scale, H - barH / 2);
  }

  private _dateTag(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  }
}
