// apps/admin-web/src/app/features/automation/components/rule-builder.component.ts
// Phase 2-7: 자동화 룰 생성/수정 빌더 컴포넌트 (최소 실행 가능 구조)

import {
  Component, Input, Output, EventEmitter, OnInit, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  AutomationRuleCategory, AutomationTriggerType, AutomationActionType,
  NotificationChannel, AlertType, SeverityLevel,
  AUTOMATION_RULE_CATEGORY_LABELS, AUTOMATION_TRIGGER_TYPE_LABELS,
  AUTOMATION_ACTION_TYPE_LABELS,
} from '@ax/shared';

/** 신규 Action 빈 객체 */
function emptyAction() {
  return { type: AutomationActionType.SEND_NOTIFICATION, channel: NotificationChannel.IN_APP };
}

@Component({
  selector: 'ax-rule-builder',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatInputModule, MatFormFieldModule,
    MatSelectModule, MatSlideToggleModule, MatIconModule, MatDividerModule,
    MatSnackBarModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="builder-container">
      <form #f="ngForm" (ngSubmit)="save(f.valid)">

        <!-- 기본 정보 -->
        <mat-card class="section-card">
          <mat-card-header><mat-card-title>기본 정보</mat-card-title></mat-card-header>
          <mat-card-content>
            <div class="field-row">
              <mat-form-field appearance="outline" class="field-wide">
                <mat-label>룰 이름 *</mat-label>
                <input matInput [(ngModel)]="form.name" name="name" required maxlength="100" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>룰 키 (영문, 고유값) *</mat-label>
                <input matInput [(ngModel)]="form.ruleKey" name="ruleKey" required
                  pattern="[a-z0-9_]+" placeholder="e.g., complaint_resolved_notify" />
              </mat-form-field>
            </div>
            <div class="field-row">
              <mat-form-field appearance="outline">
                <mat-label>카테고리</mat-label>
                <mat-select [(ngModel)]="form.category" name="category">
                  @for (opt of categoryOptions; track opt.value) {
                    <mat-option [value]="opt.value">{{ opt.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>우선순위 (낮을수록 먼저)</mat-label>
                <input matInput type="number" [(ngModel)]="form.priority" name="priority" min="1" max="999" />
              </mat-form-field>
              <div class="toggle-wrap">
                <mat-slide-toggle [(ngModel)]="form.isActive" name="isActive" color="primary">
                  {{ form.isActive ? '활성화' : '비활성화' }}
                </mat-slide-toggle>
              </div>
            </div>
            <mat-form-field appearance="outline" class="field-full">
              <mat-label>설명</mat-label>
              <textarea matInput [(ngModel)]="form.description" name="description" rows="2"></textarea>
            </mat-form-field>
          </mat-card-content>
        </mat-card>

        <!-- 트리거 설정 -->
        <mat-card class="section-card">
          <mat-card-header>
            <mat-card-title>트리거 설정</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="field-row">
              <mat-form-field appearance="outline">
                <mat-label>트리거 유형 *</mat-label>
                <mat-select [(ngModel)]="form.trigger.type" name="triggerType" required>
                  @for (opt of triggerOptions; track opt.value) {
                    <mat-option [value]="opt.value">{{ opt.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>

            <!-- DATE_BASED 전용 -->
            @if (form.trigger.type === 'DATE_BASED') {
              <div class="field-row">
                <mat-form-field appearance="outline" class="field-wide">
                  <mat-label>Cron 표현식</mat-label>
                  <input matInput [(ngModel)]="form.trigger.cronExpression" name="cronExpr"
                    placeholder="0 9 * * * (매일 09:00)" />
                  <mat-hint>분 시 일 월 요일 형식. 비워두면 24시간 간격</mat-hint>
                </mat-form-field>
              </div>
            }

            <!-- STATUS_CHANGE 전용 -->
            @if (form.trigger.type === 'STATUS_CHANGE') {
              <div class="field-row">
                <mat-form-field appearance="outline">
                  <mat-label>감시 docType *</mat-label>
                  <mat-select [(ngModel)]="form.trigger.watchDocType" name="watchDocType">
                    <mat-option value="complaint">민원 (complaint)</mat-option>
                    <mat-option value="inspectionSession">점검 세션 (inspectionSession)</mat-option>
                    <mat-option value="workOrder">작업지시 (workOrder)</mat-option>
                    <mat-option value="schedule">일정 (schedule)</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>이전 상태 (빈값=모두)</mat-label>
                  <input matInput [(ngModel)]="form.trigger.fromStatus" name="fromStatus"
                    placeholder="e.g., IN_PROGRESS" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>변경 후 상태 *</mat-label>
                  <input matInput [(ngModel)]="form.trigger.toStatus" name="toStatus"
                    placeholder="e.g., RESOLVED" required />
                </mat-form-field>
              </div>
            }
          </mat-card-content>
        </mat-card>

        <!-- 액션 설정 -->
        <mat-card class="section-card">
          <mat-card-header>
            <mat-card-title>액션 설정</mat-card-title>
            <div class="spacer"></div>
            <button mat-stroked-button type="button" (click)="addAction()">
              <mat-icon>add</mat-icon> 액션 추가
            </button>
          </mat-card-header>
          <mat-card-content>
            @for (action of form.actions; track $index; let idx = $index) {
              <div class="action-block">
                <div class="action-header">
                  <span class="action-num">액션 {{ idx + 1 }}</span>
                  <button mat-icon-button type="button" color="warn" (click)="removeAction(idx)"
                    [disabled]="form.actions.length === 1">
                    <mat-icon>remove_circle_outline</mat-icon>
                  </button>
                </div>
                <div class="field-row">
                  <mat-form-field appearance="outline">
                    <mat-label>액션 유형 *</mat-label>
                    <mat-select [(ngModel)]="action.type" [name]="'action_type_' + idx">
                      @for (opt of actionOptions; track opt.value) {
                        <mat-option [value]="opt.value">{{ opt.label }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>

                  @if (action.type === 'SEND_NOTIFICATION') {
                    <mat-form-field appearance="outline">
                      <mat-label>채널</mat-label>
                      <mat-select [(ngModel)]="action.channel" [name]="'action_ch_' + idx">
                        <mat-option value="IN_APP">인앱 (즉시)</mat-option>
                        <mat-option value="EMAIL">이메일 (mock)</mat-option>
                        <mat-option value="SMS">SMS (mock)</mat-option>
                      </mat-select>
                    </mat-form-field>
                  }
                </div>

                @if (action.type === 'SEND_NOTIFICATION') {
                  <div class="field-row">
                    <mat-form-field appearance="outline" class="field-wide">
                      <mat-label>제목 템플릿</mat-label>
                      <input matInput [(ngModel)]="action.titleTemplate" [name]="'action_title_' + idx"
                        placeholder="e.g., {{title}} 처리 완료 안내" />
                      <mat-hint>&#123;&#123;title&#125;&#125;, &#123;&#123;complexId&#125;&#125; 등 컨텍스트 변수 사용 가능</mat-hint>
                    </mat-form-field>
                  </div>
                  <div class="field-row">
                    <mat-form-field appearance="outline" class="field-wide">
                      <mat-label>본문 템플릿</mat-label>
                      <textarea matInput [(ngModel)]="action.bodyTemplate" [name]="'action_body_' + idx"
                        rows="2" placeholder="e.g., 접수하신 민원이 처리되었습니다."></textarea>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>수신자 (고정)</mat-label>
                      <input matInput [(ngModel)]="action.recipientStatic" [name]="'action_to_' + idx"
                        placeholder="이메일 또는 userId" />
                    </mat-form-field>
                  </div>
                }

                @if (action.type === 'CREATE_ALERT') {
                  <div class="field-row">
                    <mat-form-field appearance="outline">
                      <mat-label>경보 제목</mat-label>
                      <input matInput [(ngModel)]="action.alertTitle" [name]="'action_atitle_' + idx" />
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>심각도</mat-label>
                      <mat-select [(ngModel)]="action.alertSeverity" [name]="'action_sev_' + idx">
                        <mat-option value="LOW">낮음</mat-option>
                        <mat-option value="MEDIUM">보통</mat-option>
                        <mat-option value="HIGH">높음</mat-option>
                        <mat-option value="CRITICAL">긴급</mat-option>
                      </mat-select>
                    </mat-form-field>
                  </div>
                }

                @if (action.type === 'CREATE_SCHEDULE') {
                  <div class="field-row">
                    <mat-form-field appearance="outline" class="field-wide">
                      <mat-label>일정 제목</mat-label>
                      <input matInput [(ngModel)]="action.scheduleTitle" [name]="'action_stitle_' + idx"
                        placeholder="e.g., [자동] 정기 점검" />
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>기준일로부터 (일)</mat-label>
                      <input matInput type="number" [(ngModel)]="action.scheduleDaysOffset"
                        [name]="'action_days_' + idx" placeholder="30" />
                    </mat-form-field>
                  </div>
                }

                @if ($index < form.actions.length - 1) {
                  <mat-divider class="action-divider" />
                }
              </div>
            }
          </mat-card-content>
        </mat-card>

        <!-- 저장 버튼 -->
        <div class="footer-actions">
          <button mat-button type="button" (click)="cancelled.emit()">취소</button>
          <button mat-raised-button color="primary" type="submit" [disabled]="saving()">
            @if (saving()) { <mat-spinner diameter="18" /> }
            @else { <mat-icon>save</mat-icon> }
            {{ isEdit ? '수정 저장' : '룰 생성' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .builder-container { display:flex; flex-direction:column; gap:16px; }
    .section-card mat-card-header { align-items:center; }
    .field-row { display:flex; gap:12px; flex-wrap:wrap; align-items:flex-start; margin-bottom:4px; }
    .field-wide { flex:2; min-width:200px; }
    .field-full { width:100%; }
    mat-form-field { min-width:160px; flex:1; }
    .toggle-wrap { display:flex; align-items:center; padding:8px 0; }
    .action-block { padding:12px 0; }
    .action-header { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
    .action-num { font-weight:600; font-size:13px; color:#555; }
    .action-divider { margin:12px 0; }
    .spacer { flex:1; }
    .footer-actions { display:flex; justify-content:flex-end; gap:12px; padding:8px 0; }
  `],
})
export class RuleBuilderComponent implements OnInit {
  @Input() rule: any = null;
  @Output() saved = new EventEmitter<any>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);

  readonly saving = signal(false);
  isEdit = false;

  form: any = {
    name: '',
    ruleKey: '',
    description: '',
    category: AutomationRuleCategory.MAINTENANCE,
    isActive: true,
    priority: 100,
    trigger: { type: AutomationTriggerType.STATUS_CHANGE },
    conditions: [],
    actions: [emptyAction()],
  };

  categoryOptions = Object.values(AutomationRuleCategory).map(v => ({
    value: v, label: AUTOMATION_RULE_CATEGORY_LABELS[v],
  }));
  triggerOptions = Object.values(AutomationTriggerType).map(v => ({
    value: v, label: AUTOMATION_TRIGGER_TYPE_LABELS[v],
  }));
  actionOptions = [
    AutomationActionType.SEND_NOTIFICATION,
    AutomationActionType.CREATE_ALERT,
    AutomationActionType.CREATE_SCHEDULE,
  ].map(v => ({ value: v, label: AUTOMATION_ACTION_TYPE_LABELS[v] }));

  ngOnInit() {
    if (this.rule) {
      this.isEdit = true;
      this.form = {
        name: this.rule.name,
        ruleKey: this.rule.ruleKey,
        description: this.rule.description ?? '',
        category: this.rule.category,
        isActive: this.rule.isActive,
        priority: this.rule.priority,
        trigger: { ...this.rule.trigger },
        conditions: [...(this.rule.conditions ?? [])],
        actions: this.rule.actions.map((a: any) => ({ ...a })),
      };
    }
  }

  addAction() { this.form.actions = [...this.form.actions, emptyAction()]; }
  removeAction(idx: number) {
    this.form.actions = this.form.actions.filter((_: any, i: number) => i !== idx);
  }

  save(valid: boolean | null) {
    if (!valid) {
      this.snackBar.open('필수 항목을 확인하세요.', '닫기', { duration: 3000 });
      return;
    }
    this.saving.set(true);

    const req$ = this.isEdit
      ? this.http.patch<any>(`/api/v1/automation-rules/${this.rule._id}`, this.form)
      : this.http.post<any>('/api/v1/automation-rules', this.form);

    req$.subscribe({
      next: result => {
        this.saving.set(false);
        this.saved.emit(result);
      },
      error: (err: any) => {
        this.saving.set(false);
        const msg = err?.error?.message ?? '저장 실패';
        this.snackBar.open(msg, '닫기', { duration: 4000 });
      },
    });
  }
}
