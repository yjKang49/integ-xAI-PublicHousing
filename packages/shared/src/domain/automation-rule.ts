// packages/shared/src/domain/automation-rule.ts
// Phase 2-7: RPA/업무 자동화 엔진 — AutomationRule 도메인 타입

import {
  AutomationTriggerType,
  AutomationActionType,
  AutomationRuleCategory,
  NotificationChannel,
  AlertType,
  SeverityLevel,
} from '../types/enums';
import { CouchDocument } from '../types/couch';

// ── 트리거 정의 ───────────────────────────────────────────────────────────

export interface AutomationTrigger {
  type: AutomationTriggerType;

  // DATE_BASED 전용
  cronExpression?: string; // e.g., '0 9 * * *' (매일 09:00)
  offsetDays?: number;     // e.g., -30 = 기준일 30일 전에 발동
  targetField?: string;    // 기준 날짜 필드명 (e.g., 'contractExpiryDate')
  targetDocType?: string;  // 스캔 대상 docType (e.g., 'schedule')

  // STATUS_CHANGE 전용
  watchDocType?: string;   // 감시 대상 docType (e.g., 'complaint')
  fromStatus?: string | null; // null = 어느 상태에서든
  toStatus?: string;          // 이 상태로 변경될 때 발동

  // THRESHOLD 전용
  metric?: string;
  operator?: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  threshold?: number;
}

// ── 조건 필터 ─────────────────────────────────────────────────────────────

export interface AutomationCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains';
  value: unknown;
}

// ── 액션 정의 ─────────────────────────────────────────────────────────────

export interface AutomationAction {
  type: AutomationActionType;

  // SEND_NOTIFICATION
  channel?: NotificationChannel;
  recipientField?: string;   // 대상 문서의 수신자 필드 (e.g., 'submittedBy', 'assignedTo')
  recipientStatic?: string;  // 고정 수신자 (userId 또는 이메일)
  titleTemplate?: string;    // Handlebars 스타일 (e.g., '{{title}} 처리 완료')
  bodyTemplate?: string;     // e.g., '{{description}}가 처리되었습니다.'

  // CREATE_ALERT
  alertType?: AlertType;
  alertSeverity?: SeverityLevel;
  alertTitle?: string;
  alertBody?: string;

  // CREATE_SCHEDULE
  scheduleTitle?: string;
  scheduleDaysOffset?: number; // 현재 날짜로부터 N일 후

  // Generic params
  params?: Record<string, unknown>;
}

// ── AutomationRule 엔티티 ─────────────────────────────────────────────────

export interface AutomationRule extends CouchDocument {
  docType: 'automationRule';

  name: string;
  description?: string;
  ruleKey: string;                    // 고유 식별 키 (e.g., 'complaint_resolved_notify')
  category: AutomationRuleCategory;
  isActive: boolean;

  trigger: AutomationTrigger;
  conditions?: AutomationCondition[];
  actions: AutomationAction[];

  targetComplexId?: string;           // null = 조직 전체
  priority: number;                   // 실행 순위 (낮을수록 먼저)

  // 통계 (시스템 관리)
  executionCount: number;
  successCount: number;
  failureCount: number;
  lastTriggeredAt?: string;
  lastSuccessAt?: string;
  lastFailedAt?: string;
}

// ── Input Types ───────────────────────────────────────────────────────────

export interface CreateAutomationRuleInput {
  name: string;
  description?: string;
  ruleKey: string;
  category: AutomationRuleCategory;
  isActive?: boolean;
  trigger: AutomationTrigger;
  conditions?: AutomationCondition[];
  actions: AutomationAction[];
  targetComplexId?: string;
  priority?: number;
}

export interface UpdateAutomationRuleInput {
  name?: string;
  description?: string;
  isActive?: boolean;
  trigger?: AutomationTrigger;
  conditions?: AutomationCondition[];
  actions?: AutomationAction[];
  targetComplexId?: string;
  priority?: number;
}

// ── 사전 정의된 룰 키 상수 ────────────────────────────────────────────────

export const AUTOMATION_RULE_KEYS = {
  CONTRACT_EXPIRY_30D:       'contract_expiry_30d',       // 계약 만료 30일 전
  CONTRACT_EXPIRY_7D:        'contract_expiry_7d',        // 계약 만료 7일 전
  INSPECTION_SCHEDULE_AUTO:  'inspection_schedule_auto',  // 정기 점검 일정 자동 생성
  COMPLAINT_RESOLVED_NOTIFY: 'complaint_resolved_notify', // 민원 처리 완료 통지
  INSPECTION_REMINDER:       'inspection_reminder',       // 점검 미수행 리마인드
} as const;

export type AutomationRuleKey = typeof AUTOMATION_RULE_KEYS[keyof typeof AUTOMATION_RULE_KEYS];

/** 룰 카테고리 레이블 (UI 표시용) */
export const AUTOMATION_RULE_CATEGORY_LABELS: Record<AutomationRuleCategory, string> = {
  [AutomationRuleCategory.CONTRACT]:    '계약 관리',
  [AutomationRuleCategory.INSPECTION]:  '점검 관리',
  [AutomationRuleCategory.COMPLAINT]:   '민원 관리',
  [AutomationRuleCategory.DEFECT]:      '결함 관리',
  [AutomationRuleCategory.MAINTENANCE]: '유지관리',
};

/** 트리거 타입 레이블 (UI 표시용) */
export const AUTOMATION_TRIGGER_TYPE_LABELS: Record<AutomationTriggerType, string> = {
  [AutomationTriggerType.DATE_BASED]:    '날짜 기반',
  [AutomationTriggerType.STATUS_CHANGE]: '상태 변경',
  [AutomationTriggerType.THRESHOLD]:     '임계치 초과',
  [AutomationTriggerType.MANUAL]:        '수동 실행',
};

/** 액션 타입 레이블 (UI 표시용) */
export const AUTOMATION_ACTION_TYPE_LABELS: Record<AutomationActionType, string> = {
  [AutomationActionType.SEND_NOTIFICATION]: '알림 발송',
  [AutomationActionType.CREATE_ALERT]:      '경보 생성',
  [AutomationActionType.CREATE_SCHEDULE]:   '점검 일정 생성',
  [AutomationActionType.CREATE_WORK_ORDER]: '작업지시 생성',
  [AutomationActionType.UPDATE_STATUS]:     '상태 변경',
};
