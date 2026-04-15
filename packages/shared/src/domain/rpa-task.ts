// packages/shared/src/domain/rpa-task.ts
// AX-SPRINT — 지능형 행정자동화 (RPA) 작업 도메인 타입
//
// 자동화 목표 (AX-SPRINT 사업계획서 기준):
//   관리비 고지서 생성:  80% 자동화
//   계약 만료 알림:      100% 자동화
//   민원 접수·분류:      70% 자동화
//   점검 일정 생성:      90% 자동화

import { RpaTaskType, RpaTaskStatus } from '../types/enums';

/** RPA 작업 타입별 자동화 목표율 */
export const RPA_AUTOMATION_TARGETS: Record<RpaTaskType, number> = {
  [RpaTaskType.BILL_GENERATION]:         0.80,  // 80%
  [RpaTaskType.CONTRACT_EXPIRY_NOTICE]:  1.00,  // 100%
  [RpaTaskType.COMPLAINT_INTAKE]:        0.70,  // 70%
  [RpaTaskType.INSPECTION_SCHEDULE]:     0.90,  // 90%
  [RpaTaskType.REPORT_SUBMISSION]:       0.85,  // 85%
  [RpaTaskType.MILEAGE_GRANT]:           1.00,  // 100%
};

/** RPA 작업 타입 한글 레이블 */
export const RPA_TASK_TYPE_LABELS: Record<RpaTaskType, string> = {
  [RpaTaskType.BILL_GENERATION]:         '관리비 고지서 생성',
  [RpaTaskType.CONTRACT_EXPIRY_NOTICE]:  '계약 만료 알림 발송',
  [RpaTaskType.COMPLAINT_INTAKE]:        '민원 접수·AI 자동 분류',
  [RpaTaskType.INSPECTION_SCHEDULE]:     '정기 점검 일정 생성',
  [RpaTaskType.REPORT_SUBMISSION]:       '안전관리계획 법정 보고',
  [RpaTaskType.MILEAGE_GRANT]:           '클린하우스 마일리지 지급',
};

/** RPA 작업 생성 요청 */
export interface CreateRpaTaskInput {
  orgId: string;
  complexId?: string;
  taskType: RpaTaskType;
  /** cron 표현식 또는 즉시 실행 여부 */
  scheduleExpression?: string;  // e.g. "0 9 1 * *" = 매월 1일 09:00
  triggerNow?: boolean;
  /** 작업별 파라미터 (JSON) */
  payload?: Record<string, unknown>;
}

/** RPA 작업 실행 결과 */
export interface RpaTaskResult {
  taskType: RpaTaskType;
  status: RpaTaskStatus;
  processedCount: number;    // 처리된 건수
  automatedCount: number;    // 자동화 완료 건수
  manualCount: number;       // 수동 개입 필요 건수
  errorCount: number;        // 오류 건수
  durationMs: number;        // 실행 시간 (ms)
  summary?: string;          // 처리 요약 메시지
  errorDetails?: string[];   // 오류 상세
}

/** 대시보드용 RPA 자동화 현황 집계 */
export interface RpaAutomationSummary {
  /** 오늘 실행된 RPA 작업 수 */
  todayTaskCount: number;
  /** 전체 자동화율 (automatedCount / processedCount) */
  overallAutomationRate: number;
  /** 작업 유형별 자동화율 */
  byTaskType: Partial<Record<RpaTaskType, {
    automationRate: number;
    target: number;
    lastRunAt?: string;
  }>>;
  /** 이번 달 절감 추정 시간 (시간) */
  estimatedTimeSavedHours: number;
}
