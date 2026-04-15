import { RpaTaskType, RpaTaskStatus } from '../types/enums';
/** RPA 작업 타입별 자동화 목표율 */
export declare const RPA_AUTOMATION_TARGETS: Record<RpaTaskType, number>;
/** RPA 작업 타입 한글 레이블 */
export declare const RPA_TASK_TYPE_LABELS: Record<RpaTaskType, string>;
/** RPA 작업 생성 요청 */
export interface CreateRpaTaskInput {
    orgId: string;
    complexId?: string;
    taskType: RpaTaskType;
    /** cron 표현식 또는 즉시 실행 여부 */
    scheduleExpression?: string;
    triggerNow?: boolean;
    /** 작업별 파라미터 (JSON) */
    payload?: Record<string, unknown>;
}
/** RPA 작업 실행 결과 */
export interface RpaTaskResult {
    taskType: RpaTaskType;
    status: RpaTaskStatus;
    processedCount: number;
    automatedCount: number;
    manualCount: number;
    errorCount: number;
    durationMs: number;
    summary?: string;
    errorDetails?: string[];
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
