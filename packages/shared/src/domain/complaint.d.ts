import { ComplaintCategory, ComplaintStatus } from '../types/enums';
export interface CreateComplaintInput {
    complexId: string;
    buildingId?: string;
    unitNumber?: string;
    category: ComplaintCategory;
    title: string;
    description: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    submittedBy: string;
    submittedPhone?: string;
    dueDate?: string;
    mediaIds?: string[];
    classificationHint?: string;
    /** AI가 분류한 민원 유형 (70% 자동화 대상) */
    aiCategory?: ComplaintCategory;
    /** AI 분류 신뢰도 0.0~1.0 */
    aiCategoryConfidence?: number;
    /** AI가 제안한 우선순위 */
    aiPriority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    /** AI 자동 분류 적용 여부 */
    isAiClassified?: boolean;
    /** 거주자 참여형 진단 사진 경유 여부 */
    isResidentDiagnosis?: boolean;
}
export interface UpdateComplaintInput {
    status?: ComplaintStatus;
    assignedTo?: string;
    dueDate?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    notes?: string;
    resolutionNotes?: string;
    satisfactionScore?: number;
    satisfactionFeedback?: string;
    aiSuggestion?: string;
    /** 클린하우스 마일리지 지급 여부 */
    milestoneGranted?: boolean;
}
export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export declare const COMPLAINT_TYPE_LABELS: Record<string, string>;
export declare const COMPLAINT_STATUS_LABELS: Record<string, string>;
export declare const COMPLAINT_PRIORITY_LABELS: Record<string, string>;
export declare const COMPLAINT_PRIORITY_COLORS: Record<string, string>;
/** Ordered status steps for timeline/stepper display */
export declare const COMPLAINT_STATUS_STEPS: ComplaintStatus[];
