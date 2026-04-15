// apps/mobile-app/src/app/features/inspection/qr-scan/qr-scan.component.ts
import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { PouchService } from '../../../core/sync/pouch.service';
import { HousingComplex, Building, Zone } from '@ax/shared';

/**
 * QR code format convention:
 * AX:{docType}:{orgId}:{entityId}
 * Examples:
 *   AX:housingComplex:org001:cplx001
 *   AX:building:org001:bldg_101
 *   AX:zone:org001:zone_stairA
 */
interface QrScanContext {
  docType: 'housingComplex' | 'building' | 'zone' | 'crackGaugePoint';
  orgId: string;
  entityId: string;
  entityName?: string;
  complexId?: string;
  buildingId?: string;
}

@Component({
  selector: 'ax-qr-scan',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/inspection" />
        </ion-buttons>
        <ion-title>QR 스캔</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="toggleTorch()">
            <ion-icon [name]="torchOn() ? 'flash' : 'flash-outline'" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="scan-container">
        <!-- Camera viewfinder -->
        <div class="viewfinder">
          <div class="scan-frame">
            <div class="corner tl"></div><div class="corner tr"></div>
            <div class="corner bl"></div><div class="corner br"></div>
            <div class="scan-line" [class.scanning]="!scanned()"></div>
          </div>
          <p class="scan-hint">QR 코드를 프레임 안에 맞춰주세요</p>
        </div>

        <!-- Scan result -->
        @if (scanContext()) {
          <ion-card class="result-card">
            <ion-card-header>
              <ion-icon name="checkmark-circle" color="success" size="large" />
              <ion-card-title>{{ getContextTitle(scanContext()!.docType) }}</ion-card-title>
              <ion-card-subtitle>{{ scanContext()!.entityName }}</ion-card-subtitle>
            </ion-card-header>
            <ion-card-content>
              <div class="context-details">
                <p><strong>단지:</strong> {{ scanContext()!.complexId ?? '-' }}</p>
                @if (scanContext()!.buildingId) {
                  <p><strong>건물:</strong> {{ scanContext()!.buildingId }}</p>
                }
              </div>

              <!-- Action buttons based on QR type -->
              @if (scanContext()!.docType === 'zone' || scanContext()!.docType === 'building') {
                <ion-button expand="block" (click)="startInspection()">
                  <ion-icon slot="start" name="clipboard-outline" />
                  점검 시작
                </ion-button>
                <ion-button expand="block" fill="outline" (click)="registerDefect()">
                  <ion-icon slot="start" name="warning-outline" />
                  즉시 결함 등록
                </ion-button>
              }

              @if (scanContext()!.docType === 'crackGaugePoint') {
                <ion-button expand="block" color="warning" (click)="goToCrackMeasure()">
                  <ion-icon slot="start" name="analytics-outline" />
                  균열 측정 시작
                </ion-button>
              }

              <ion-button expand="block" fill="outline" color="medium" (click)="resetScan()">
                <ion-icon slot="start" name="qr-code-outline" />
                다시 스캔
              </ion-button>
            </ion-card-content>
          </ion-card>
        }

        <!-- Error state -->
        @if (scanError()) {
          <ion-card color="danger">
            <ion-card-content>
              <ion-icon name="alert-circle-outline" />
              {{ scanError() }}
              <ion-button fill="clear" (click)="resetScan()">다시 시도</ion-button>
            </ion-card-content>
          </ion-card>
        }

        <!-- Manual input fallback -->
        <ion-card class="manual-card">
          <ion-card-content>
            <p>QR 스캔이 안 되는 경우 직접 코드 입력</p>
            <ion-item>
              <ion-input placeholder="QR 코드 직접 입력" [(ngModel)]="manualCode" />
            </ion-item>
            <ion-button expand="block" fill="outline" (click)="processManualCode()">
              입력
            </ion-button>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  `,
  styles: [`
    .scan-container { display: flex; flex-direction: column; align-items: center; padding: 16px; gap: 16px; }
    .viewfinder {
      width: 100%; max-width: 320px; aspect-ratio: 1;
      background: rgba(0,0,0,0.6); border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      position: relative; overflow: hidden;
    }
    .scan-frame {
      width: 220px; height: 220px; position: relative;
    }
    .corner {
      position: absolute; width: 24px; height: 24px;
      border: 3px solid #4CAF50;
    }
    .tl { top: 0; left: 0; border-right: none; border-bottom: none; }
    .tr { top: 0; right: 0; border-left: none; border-bottom: none; }
    .bl { bottom: 0; left: 0; border-right: none; border-top: none; }
    .br { bottom: 0; right: 0; border-left: none; border-top: none; }
    .scan-line {
      position: absolute; left: 0; right: 0; height: 2px;
      background: rgba(76, 175, 80, 0.8); top: 50%;
    }
    .scan-line.scanning {
      animation: scanMove 2s linear infinite;
    }
    @keyframes scanMove {
      0% { top: 10%; } 50% { top: 90%; } 100% { top: 10%; }
    }
    .scan-hint { position: absolute; bottom: -32px; color: #aaa; font-size: 12px; text-align: center; width: 100%; }
    .result-card { width: 100%; }
    .result-card ion-card-header { display: flex; flex-direction: column; align-items: center; text-align: center; }
    .context-details { margin-bottom: 16px; }
    .manual-card { width: 100%; }
  `],
})
export class QrScanComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly pouch = inject(PouchService);

  readonly scanContext = signal<QrScanContext | null>(null);
  readonly scanError = signal<string | null>(null);
  readonly scanned = signal(false);
  readonly torchOn = signal(false);

  manualCode = '';
  private barcodeScanner: any = null;

  async ngOnInit() {
    await this.startCameraScanner();
  }

  ngOnDestroy() {
    this.stopScanner();
  }

  private async startCameraScanner() {
    try {
      // Use @capacitor-mlkit/barcode-scanning in production
      // Fallback to browser-based scanning (ZXing) in dev
      const { BarcodeScanner } = await import('@capacitor-mlkit/barcode-scanning');
      this.barcodeScanner = BarcodeScanner;

      await BarcodeScanner.startScan({
        formats: ['QR_CODE'] as any,
        lensFacing: 'BACK' as any,
      }).catch(() => {});

      const listener = await BarcodeScanner.addListener('barcodesScanned' as any, async (result: any) => {
        const rawValue = result?.barcodes?.[0]?.rawValue;
        if (rawValue) {
          await this.stopScanner();
          this.processQrPayload(rawValue);
        }
      });
    } catch (err) {
      // Development fallback — simulate a scan result for testing
      console.debug('Camera scanner not available (dev mode). Use manual input.');
    }
  }

  private async stopScanner() {
    try {
      const { BarcodeScanner } = await import('@capacitor-mlkit/barcode-scanning');
      await BarcodeScanner.stopScan();
    } catch {}
  }

  async toggleTorch() {
    try {
      const { BarcodeScanner } = await import('@capacitor-mlkit/barcode-scanning');
      if (this.torchOn()) {
        await (BarcodeScanner as any).disableTorch();
      } else {
        await (BarcodeScanner as any).enableTorch();
      }
      this.torchOn.update((v) => !v);
    } catch {}
  }

  processManualCode() {
    if (this.manualCode.trim()) {
      this.processQrPayload(this.manualCode.trim());
    }
  }

  private async processQrPayload(payload: string) {
    // Expected format: AX:{docType}:{orgId}:{entityId}
    const parts = payload.split(':');
    if (parts.length < 4 || parts[0] !== 'AX') {
      this.scanError.set(`올바르지 않은 QR 코드 형식입니다: ${payload}`);
      return;
    }

    const [, docType, orgId, entityId] = parts;
    this.scanned.set(true);
    this.scanError.set(null);

    try {
      // Look up entity in local PouchDB
      const entity = await this.pouch.get<any>(
        `${docType}:${orgId}:${entityId}`,
      );

      if (!entity) {
        this.scanError.set('해당 시설물 정보를 찾을 수 없습니다. 동기화 후 다시 시도하세요.');
        this.scanned.set(false);
        return;
      }

      this.scanContext.set({
        docType: docType as QrScanContext['docType'],
        orgId,
        entityId,
        entityName: entity.name ?? entity.title,
        complexId: entity.complexId,
        buildingId: entity.buildingId,
      });
    } catch (err) {
      this.scanError.set('데이터 조회 중 오류가 발생했습니다.');
      this.scanned.set(false);
    }
  }

  startInspection() {
    const ctx = this.scanContext()!;
    this.router.navigate(['/tabs/inspection/checklist'], {
      queryParams: {
        complexId: ctx.complexId,
        buildingId: ctx.buildingId ?? ctx.entityId,
        zoneId: ctx.docType === 'zone' ? ctx.entityId : undefined,
        entityName: ctx.entityName,
      },
    });
  }

  registerDefect() {
    const ctx = this.scanContext()!;
    this.router.navigate(['/tabs/inspection/defect-form'], {
      queryParams: {
        complexId: ctx.complexId,
        buildingId: ctx.buildingId ?? ctx.entityId,
        zoneId: ctx.docType === 'zone' ? ctx.entityId : undefined,
        zoneName: ctx.entityName,
      },
    });
  }

  goToCrackMeasure() {
    const ctx = this.scanContext()!;
    this.router.navigate(['/tabs/cracks/capture'], {
      queryParams: { gaugePointId: ctx.entityId },
    });
  }

  resetScan() {
    this.scanContext.set(null);
    this.scanError.set(null);
    this.scanned.set(false);
    this.manualCode = '';
    this.startCameraScanner();
  }

  getContextTitle(docType: string): string {
    const map: Record<string, string> = {
      housingComplex: '단지 인식됨',
      building: '건물 인식됨',
      zone: '구역 인식됨',
      crackGaugePoint: '균열 게이지 포인트 인식됨',
    };
    return map[docType] ?? 'QR 인식됨';
  }
}
