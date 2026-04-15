import { AutomationTriggerType, AutomationActionType, AutomationRuleCategory, NotificationChannel, AlertType, SeverityLevel } from '../types/enums';
import { CouchDocument } from '../types/couch';
export interface AutomationTrigger {
    type: AutomationTriggerType;
    cronExpression?: string;
    offsetDays?: number;
    targetField?: string;
    targetDocType?: string;
    watchDocType?: string;
    fromStatus?: string | null;
    toStatus?: string;
    metric?: string;
    operator?: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
    threshold?: number;
}
export interface AutomationCondition {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains';
    value: unknown;
}
export interface AutomationAction {
    type: AutomationActionType;
    channel?: NotificationChannel;
    recipientField?: string;
    recipientStatic?: string;
    titleTemplate?: string;
    bodyTemplate?: string;
    alertType?: AlertType;
    alertSeverity?: SeverityLevel;
    alertTitle?: string;
    alertBody?: string;
    scheduleTitle?: string;
    scheduleDaysOffset?: number;
    params?: Record<string, unknown>;
}
export interface AutomationRule extends CouchDocument {
    docType: 'automationRule';
    name: string;
    description?: string;
    ruleKey: string;
    category: AutomationRuleCategory;
    isActive: boolean;
    trigger: AutomationTrigger;
    conditions?: AutomationCondition[];
    actions: AutomationAction[];
    targetComplexId?: string;
    priority: number;
    executionCount: number;
    successCount: number;
    failureCount: number;
    lastTriggeredAt?: string;
    lastSuccessAt?: string;
    lastFailedAt?: string;
}
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
export declare const AUTOMATION_RULE_KEYS: {
    readonly CONTRACT_EXPIRY_30D: "contract_expiry_30d";
    readonly CONTRACT_EXPIRY_7D: "contract_expiry_7d";
    readonly INSPECTION_SCHEDULE_AUTO: "inspection_schedule_auto";
    readonly COMPLAINT_RESOLVED_NOTIFY: "complaint_resolved_notify";
    readonly INSPECTION_REMINDER: "inspection_reminder";
};
export type AutomationRuleKey = typeof AUTOMATION_RULE_KEYS[keyof typeof AUTOMATION_RULE_KEYS];
/** 룰 카테고리 레이블 (UI 표시용) */
export declare const AUTOMATION_RULE_CATEGORY_LABELS: Record<AutomationRuleCategory, string>;
/** 트리거 타입 레이블 (UI 표시용) */
export declare const AUTOMATION_TRIGGER_TYPE_LABELS: Record<AutomationTriggerType, string>;
/** 액션 타입 레이블 (UI 표시용) */
export declare const AUTOMATION_ACTION_TYPE_LABELS: Record<AutomationActionType, string>;
