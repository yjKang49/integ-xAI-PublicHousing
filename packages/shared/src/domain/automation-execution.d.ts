import { AutomationTriggerType, AutomationExecutionStatus } from '../types/enums';
import { CouchDocument } from '../types/couch';
export interface AutomationActionResult {
    type: string;
    status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
    result?: unknown;
    error?: string;
    executedAt: string;
    durationMs: number;
}
export interface AutomationExecution extends CouchDocument {
    docType: 'automationExecution';
    ruleId: string;
    ruleName: string;
    ruleKey: string;
    triggerType: AutomationTriggerType;
    triggerContext: Record<string, unknown>;
    status: AutomationExecutionStatus;
    startedAt: string;
    completedAt?: string;
    durationMs?: number;
    actionsExecuted: AutomationActionResult[];
    affectedDocIds: string[];
    affectedCount: number;
    error?: string;
    summary?: string;
}
export interface UpdateExecutionResultInput {
    status: AutomationExecutionStatus;
    actionsExecuted?: AutomationActionResult[];
    error?: string;
    summary?: string;
}
export interface AutomationExecutionSummary {
    ruleId: string;
    ruleName: string;
    totalExecutions: number;
    successCount: number;
    failureCount: number;
    lastExecutedAt?: string;
    avgDurationMs?: number;
}
