// apps/mobile-app/src/app/features/inspection/checklist/checklist.component.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { PouchService } from '../../../core/sync/pouch.service';
import { AuthStore } from '../../../core/store/auth.store';
import { InspectionSession, ChecklistItem, InspectionStatus, SessionStatus } from '@ax/shared';
import { v4 as uuid } from 'uuid';

type ChecklistResult = 'PASS' | 'FAIL' | 'N/A' | null;

interface ChecklistGroup {
  category: string;
  items: ChecklistItem[];
  collapsed: boolean;
}

@Component({
  selector: 'ax-checklist',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button />
        </ion-buttons>
        <ion-title>점검 체크리스트</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="saveSession()" [disabled]="saving()">
            @if (saving()) { <ion-spinner name="dots" /> }
            @else { 저장 }
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <!-- Progress bar -->
      <ion-toolbar>
        <div class="progress-container">
          <ion-progress-bar [value]="progressRatio()" color="success" />
          <span class="progress-text">
            {{ answeredCount() }} / {{ totalItems() }}
            ({{ (progressRatio() * 100) | number:'1.0-0' }}%)
          </span>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Location context -->
      <ion-card color="light">
        <ion-card-content>
          <div class="context-info">
            <ion-icon name="location-outline" color="primary" />
            <span>{{ sessionContext().complexName }} /
              {{ sessionContext().buildingName }} /
              {{ sessionContext().zoneName }}</span>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- Summary chips -->
      <div class="summary-chips">
        <ion-chip color="success" (click)="filterResult('PASS')">
          <ion-icon name="checkmark-circle" />
          <ion-label>양호 {{ countByResult('PASS') }}</ion-label>
        </ion-chip>
        <ion-chip color="danger" (click)="filterResult('FAIL')">
          <ion-icon name="close-circle" />
          <ion-label>불량 {{ countByResult('FAIL') }}</ion-label>
        </ion-chip>
        <ion-chip color="medium" (click)="filterResult('N/A')">
          <ion-icon name="remove-circle" />
          <ion-label>해당없음 {{ countByResult('N/A') }}</ion-label>
        </ion-chip>
        <ion-chip color="warning" (click)="filterResult(null)">
          <ion-icon name="ellipse-outline" />
          <ion-label>미답변 {{ countByResult(null) }}</ion-label>
        </ion-chip>
        @if (activeFilter()) {
          <ion-chip (click)="activeFilter.set(null)">
            <ion-icon name="close" />
            <ion-label>필터 해제</ion-label>
          </ion-chip>
        }
      </div>

      <!-- Checklist by category -->
      @for (group of filteredGroups(); track group.category) {
        <ion-card>
          <ion-item
            button
            (click)="group.collapsed = !group.collapsed"
            [detail]="false">
            <ion-icon
              slot="start"
              [name]="group.collapsed ? 'chevron-forward' : 'chevron-down'"
              color="medium" />
            <ion-label>
              <h3>{{ group.category }}</h3>
              <p>{{ getCategoryProgress(group) }}</p>
            </ion-label>
            <div slot="end" class="category-chips">
              <ion-badge color="success">{{ passCount(group) }}</ion-badge>
              <ion-badge color="danger">{{ failCount(group) }}</ion-badge>
            </div>
          </ion-item>

          @if (!group.collapsed) {
            @for (item of group.items; track item.id) {
              <div class="checklist-item" [class.fail-item]="item.result === 'FAIL'">
                <div class="item-header">
                  <span class="item-order">{{ item.order }}</span>
                  <p class="item-desc">{{ item.description }}</p>
                </div>

                <!-- Result buttons -->
                <div class="result-buttons">
                  <button class="result-btn pass"
                    [class.active]="item.result === 'PASS'"
                    (click)="setResult(item, 'PASS')">
                    <ion-icon name="checkmark-circle" />
                    양호
                  </button>
                  <button class="result-btn fail"
                    [class.active]="item.result === 'FAIL'"
                    (click)="setResult(item, 'FAIL')">
                    <ion-icon name="close-circle" />
                    불량
                  </button>
                  <button class="result-btn na"
                    [class.active]="item.result === 'N/A'"
                    (click)="setResult(item, 'N/A')">
                    <ion-icon name="remove-circle" />
                    해당없음
                  </button>
                </div>

                <!-- FAIL → defect registration shortcut -->
                @if (item.result === 'FAIL') {
                  <div class="fail-actions">
                    <ion-input
                      [(ngModel)]="item.notes"
                      placeholder="불량 내용 메모"
                      class="fail-note"
                      (ionChange)="markDirty()" />
                    <ion-button size="small" fill="outline" color="danger"
                      (click)="registerDefectFromItem(item)">
                      <ion-icon slot="start" name="warning-outline" />
                      결함 등록
                    </ion-button>
                  </div>
                }

                @if (item.result !== 'FAIL' && item.result !== null) {
                  <ion-input
                    [(ngModel)]="item.notes"
                    placeholder="메모 (선택)"
                    class="item-note"
                    (ionChange)="markDirty()" />
                }
              </div>
            }
          }
        </ion-card>
      }

      <!-- Weather conditions -->
      <ion-card>
        <ion-card-header>
          <ion-card-subtitle>현장 환경 정보</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <ion-item>
            <ion-label position="floating">날씨</ion-label>
            <ion-select [(ngModel)]="weatherCondition" (ionChange)="markDirty()">
              <ion-select-option value="맑음">맑음</ion-select-option>
              <ion-select-option value="흐림">흐림</ion-select-option>
              <ion-select-option value="비">비</ion-select-option>
              <ion-select-option value="눈">눈</ion-select-option>
            </ion-select>
          </ion-item>
          <div class="env-row">
            <ion-item>
              <ion-label position="floating">기온 (°C)</ion-label>
              <ion-input type="number" [(ngModel)]="temperature" (ionChange)="markDirty()" />
            </ion-item>
            <ion-item>
              <ion-label position="floating">습도 (%)</ion-label>
              <ion-input type="number" [(ngModel)]="humidity" (ionChange)="markDirty()" />
            </ion-item>
          </div>
          <ion-item>
            <ion-label position="floating">점검 메모</ion-label>
            <ion-textarea rows="2" [(ngModel)]="sessionNotes" (ionChange)="markDirty()" />
          </ion-item>
        </ion-card-content>
      </ion-card>

      <!-- Complete button -->
      <div class="complete-section">
        <ion-button expand="block" color="success" (click)="completeSession()"
          [disabled]="progressRatio() < 1 || saving()">
          <ion-icon slot="start" name="checkmark-done-circle-outline" />
          점검 완료 ({{ (progressRatio() * 100) | number:'1.0-0' }}%)
        </ion-button>
        @if (progressRatio() < 1) {
          <p class="incomplete-hint">
            모든 항목에 결과를 입력해야 완료할 수 있습니다.
            ({{ totalItems() - answeredCount() }}개 남음)
          </p>
        }
      </div>
    </ion-content>
  `,
  styles: [`
    .progress-container {
      display: flex; align-items: center; gap: 8px;
      padding: 4px 16px;
    }
    .progress-text { font-size: 12px; white-space: nowrap; color: #666; }
    .context-info { display: flex; align-items: center; gap: 8px; font-size: 13px; }
    .summary-chips { display: flex; gap: 4px; padding: 8px 16px; flex-wrap: wrap; }
    .checklist-item {
      padding: 12px 16px; border-bottom: 1px solid #f0f0f0;
    }
    .fail-item { background: rgba(244, 67, 54, 0.04); }
    .item-header { display: flex; gap: 8px; margin-bottom: 8px; }
    .item-order {
      min-width: 24px; height: 24px; border-radius: 50%;
      background: #e0e0e0; display: flex; align-items: center;
      justify-content: center; font-size: 11px; font-weight: 600;
    }
    .item-desc { flex: 1; font-size: 14px; line-height: 1.4; margin: 0; }
    .result-buttons { display: flex; gap: 6px; }
    .result-btn {
      flex: 1; padding: 8px 4px; border: 2px solid #e0e0e0;
      border-radius: 8px; background: white; cursor: pointer;
      display: flex; flex-direction: column; align-items: center;
      gap: 2px; font-size: 11px; font-weight: 600; transition: all 0.2s;
    }
    .result-btn.pass.active { border-color: #4caf50; background: #e8f5e9; color: #2e7d32; }
    .result-btn.fail.active { border-color: #f44336; background: #ffebee; color: #c62828; }
    .result-btn.na.active { border-color: #9e9e9e; background: #f5f5f5; color: #616161; }
    .result-btn ion-icon { font-size: 20px; }
    .fail-actions { margin-top: 8px; display: flex; align-items: center; gap: 8px; }
    .fail-note { flex: 1; font-size: 13px; }
    .item-note { margin-top: 6px; font-size: 13px; }
    .category-chips { display: flex; gap: 4px; }
    .env-row { display: grid; grid-template-columns: 1fr 1fr; }
    .complete-section { padding: 16px; }
    .incomplete-hint { text-align: center; color: #888; font-size: 12px; margin-top: 8px; }
  `],
})
export class ChecklistComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pouch = inject(PouchService);
  private readonly authStore = inject(AuthStore);

  readonly saving = signal(false);
  readonly activeFilter = signal<ChecklistResult | 'filter-none'>(null as any);
  readonly groups = signal<ChecklistGroup[]>([]);
  readonly isDirty = signal(false);

  readonly sessionContext = signal({ complexName: '', buildingName: '', zoneName: '' });

  weatherCondition = '맑음';
  temperature: number | null = null;
  humidity: number | null = null;
  sessionNotes = '';

  private session: InspectionSession | null = null;
  private sessionId = '';

  // Default checklist template (loaded from PouchDB in production)
  private readonly DEFAULT_CHECKLIST: ChecklistItem[] = [
    // 구조체
    { id: uuid(), category: '구조체', description: '기초/기둥 균열 여부', result: null, order: 1 },
    { id: uuid(), category: '구조체', description: '보/슬래브 처짐 및 균열', result: null, order: 2 },
    { id: uuid(), category: '구조체', description: '내력벽 균열 및 변형', result: null, order: 3 },
    { id: uuid(), category: '구조체', description: '계단 구조체 균열', result: null, order: 4 },
    // 외벽
    { id: uuid(), category: '외벽', description: '외벽 균열 (폭/길이 확인)', result: null, order: 5 },
    { id: uuid(), category: '외벽', description: '외벽 타일 박리/탈락', result: null, order: 6 },
    { id: uuid(), category: '외벽', description: '외벽 백태/부식', result: null, order: 7 },
    { id: uuid(), category: '외벽', description: '창호 실링 상태', result: null, order: 8 },
    // 방수/누수
    { id: uuid(), category: '방수/누수', description: '지하주차장 천장 누수 흔적', result: null, order: 9 },
    { id: uuid(), category: '방수/누수', description: '옥상 방수층 상태', result: null, order: 10 },
    { id: uuid(), category: '방수/누수', description: '배관 주변 누수 여부', result: null, order: 11 },
    // 공용설비
    { id: uuid(), category: '공용설비', description: '복도/계단 조명 상태', result: null, order: 12 },
    { id: uuid(), category: '공용설비', description: '소화기/소방시설 점검', result: null, order: 13 },
    { id: uuid(), category: '공용설비', description: '엘리베이터 홀/문 상태', result: null, order: 14 },
    // 마감
    { id: uuid(), category: '마감', description: '복도 바닥 마감 파손', result: null, order: 15 },
    { id: uuid(), category: '마감', description: '벽체 페인트 박리', result: null, order: 16 },
  ];

  ngOnInit() {
    const params = this.route.snapshot.queryParams;
    this.sessionId = params['sessionId'] ?? '';
    this.sessionContext.set({
      complexName: params['complexName'] ?? '',
      buildingName: params['buildingName'] ?? '',
      zoneName: params['zoneName'] ?? '',
    });

    this.loadSession();
  }

  private async loadSession() {
    let items: ChecklistItem[];

    if (this.sessionId) {
      const session = await this.pouch.get<InspectionSession>(this.sessionId);
      if (session) {
        this.session = session;
        items = session.checklistItems?.length > 0
          ? session.checklistItems
          : this.DEFAULT_CHECKLIST;
        this.weatherCondition = session.weatherCondition ?? '맑음';
        this.temperature = session.temperature ?? null;
        this.humidity = session.humidity ?? null;
        this.sessionNotes = session.notes ?? '';
      } else {
        items = this.DEFAULT_CHECKLIST;
      }
    } else {
      items = this.DEFAULT_CHECKLIST;
    }

    // Group by category
    const grouped = items.reduce((acc: Record<string, ChecklistItem[]>, item) => {
      (acc[item.category] ??= []).push(item);
      return acc;
    }, {});

    this.groups.set(
      Object.entries(grouped).map(([category, items]) => ({
        category,
        items,
        collapsed: false,
      })),
    );
  }

  // ── Computed ──────────────────────────────────

  readonly allItems = computed(() => this.groups().flatMap((g) => g.items));
  readonly totalItems = computed(() => this.allItems().length);
  readonly answeredCount = computed(() => this.allItems().filter((i) => i.result !== null).length);
  readonly progressRatio = computed(() =>
    this.totalItems() > 0 ? this.answeredCount() / this.totalItems() : 0,
  );

  readonly filteredGroups = computed(() => {
    const filter = this.activeFilter();
    if (!filter) return this.groups();
    return this.groups()
      .map((g) => ({
        ...g,
        items: g.items.filter((i) => i.result === filter),
      }))
      .filter((g) => g.items.length > 0);
  });

  // ── Actions ──────────────────────────────────

  setResult(item: ChecklistItem, result: ChecklistResult) {
    item.result = item.result === result ? null : result;
    this.isDirty.set(true);
    // Force signal update
    this.groups.update((g) => [...g]);
  }

  filterResult(result: ChecklistResult) {
    this.activeFilter.set(
      this.activeFilter() === (result as any) ? null as any : result as any,
    );
  }

  markDirty() { this.isDirty.set(true); }

  countByResult(result: ChecklistResult): number {
    return this.allItems().filter((i) => i.result === result).length;
  }

  passCount(group: ChecklistGroup): number {
    return group.items.filter((i) => i.result === 'PASS').length;
  }

  failCount(group: ChecklistGroup): number {
    return group.items.filter((i) => i.result === 'FAIL').length;
  }

  getCategoryProgress(group: ChecklistGroup): string {
    const answered = group.items.filter((i) => i.result !== null).length;
    return `${answered} / ${group.items.length} 완료`;
  }

  registerDefectFromItem(item: ChecklistItem) {
    const params = this.route.snapshot.queryParams;
    this.saveSession().then(() => {
      this.router.navigate(['/tabs/inspection/defect-form'], {
        queryParams: {
          ...params,
          checklistItemId: item.id,
          locationDescription: item.description,
        },
      });
    });
  }

  async saveSession(): Promise<void> {
    this.saving.set(true);
    const user = this.authStore.user()!;
    const now = new Date().toISOString();
    const items = this.allItems();

    try {
      if (this.session) {
        const updated = await this.pouch.update({
          ...this.session,
          checklistItems: items,
          weatherCondition: this.weatherCondition,
          temperature: this.temperature ?? undefined,
          humidity: this.humidity ?? undefined,
          notes: this.sessionNotes,
          updatedAt: now,
          updatedBy: user.id,
        });
        this.session = updated as any;
      } else {
        // Create new session
        const params = this.route.snapshot.queryParams;
        const sessionId = `inspectionSession:${user.organizationId}:ses_${Date.now()}_${uuid().slice(0, 8)}`;
        const newSession: InspectionSession = {
          _id: sessionId,
          docType: 'inspectionSession',
          orgId: user.organizationId,
          projectId: params['projectId'] ?? '',
          complexId: params['complexId'] ?? '',
          buildingId: params['buildingId'] ?? '',
          floorId: params['floorId'],
          zoneId: params['zoneId'],
          inspectorId: user.id,
          status: SessionStatus.IN_PROGRESS,
          startedAt: now,
          checklistItems: items,
          defectCount: 0,
          weatherCondition: this.weatherCondition,
          temperature: this.temperature ?? undefined,
          humidity: this.humidity ?? undefined,
          notes: this.sessionNotes,
          createdAt: now,
          updatedAt: now,
          createdBy: user.id,
          updatedBy: user.id,
        };
        const saved = await this.pouch.create(newSession);
        this.session = saved as any;
        this.sessionId = sessionId;
      }
      this.isDirty.set(false);
    } finally {
      this.saving.set(false);
    }
  }

  async completeSession() {
    await this.saveSession();
    if (this.session) {
      const user = this.authStore.user()!;
      await this.pouch.update({
        ...this.session,
        status: InspectionStatus.PENDING_REVIEW,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: user.id,
      });
    }
    this.router.navigate(['/tabs/inspection']);
  }
}
