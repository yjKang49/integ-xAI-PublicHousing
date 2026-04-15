// packages/shared/src/domain/automation-execution.ts
// Phase 2-7: RPA/업무 자동화 엔진 — AutomationExecution 도메인 타입 (실행 이력)

import { AutomationTriggerType, AutomationExecutionStatus } from '../types/enums';
import { CouchDocument } from '../types/couch';

// ── 액션 실행 결과 ─────────────────────────────────────────────────────────

export interface AutomationActionResult {
  type: string;                                  // AutomationActionType 값
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  result?: unknown;                              // 생성된 문서 ID 등
  error?: string;                                // 실패 시 에러 메시지
  executedAt: string;                            // ISO 타임스탬프
  durationMs: number;                            // 실행 소요 시간 (ms)
}

// ── AutomationExecution 엔티티 ────────────────────────────────────────────

export interface AutomationExecution extends CouchDocument {
  docType: 'automationExecution';

  ruleId: string;
  ruleName: string;
  ruleKey: string;

  triggerType: AutomationTriggerType;
  triggerContext: Record<string, unknown>; // 트리거 발동 컨텍스트 (상태변화 정보 등)

  status: AutomationExecutionStatus;

  startedAt: string;
  completedAt?: string;
  durationMs?: number;

  actionsExecuted: AutomationActionResult[];

  affectedDocIds: string[];  // 처리된 대상 문서 ID 목록
  affectedCount: number;

  error?: string;     // 전체 실패 에러
  summary?: string;   // 실행 요약 (e.g., "3/3 액션 성공")
}

// ── Input Types ───────────────────────────────────────────────────────────

export interface UpdateExecutionResultInput {
  status: AutomationExecutionStatus;
  actionsExecuted?: AutomationActionResult[];
  error?: string;
  summary?: string;
}

// ── 집계/통계 ─────────────────────────────────────────────────────────────

export interface AutomationExecutionSummary {
  ruleId: string;
  ruleName: string;
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  lastExecutedAt?: string;
  avgDurationMs?: number;
}
