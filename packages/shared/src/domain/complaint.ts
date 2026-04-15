// packages/shared/src/domain/complaint.ts
import { ComplaintCategory, ComplaintStatus } from '../types/enums';

export interface CreateComplaintInput {
  complexId: string;
  buildingId?: string;
  unitNumber?: string;
  category: ComplaintCategory;
  title: string;
  description: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  submittedBy: string;           // 접수자명 or userId
  submittedPhone?: string;
  dueDate?: string;
  mediaIds?: string[];
  classificationHint?: string;  // 키워드 힌트 (AI 분류 입력)

  // ── AX-SPRINT: AI 자동 분류 필드 (RpaTaskType.COMPLAINT_INTAKE) ──
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
  notes?: string;                // 이력 메모
  resolutionNotes?: string;
  satisfactionScore?: number;
  satisfactionFeedback?: string;
  aiSuggestion?: string;        // AI 제안 (KoELECTRA 기반 Phase 2)
  /** 클린하우스 마일리지 지급 여부 */
  milestoneGranted?: boolean;
}

export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export const COMPLAINT_TYPE_LABELS: Record<string, string> = {
  LEAK: '누수',
  CRACK: '균열',
  NOISE: '소음',
  EXTERIOR_DAMAGE: '외벽 손상',
  COMMON_AREA: '공용부 파손',
  FACILITY: '시설물 결함',
  SANITATION: '위생',
  SAFETY: '안전',
  PARKING: '주차',
  ELEVATOR: '엘리베이터',
  OTHER: '기타',
};

export const COMPLAINT_STATUS_LABELS: Record<string, string> = {
  OPEN:        '접수',
  RECEIVED:    '접수',
  TRIAGED:     '검토완료',
  ASSIGNED:    '담당자배정',
  IN_PROGRESS: '처리중',
  RESOLVED:    '처리완료',
  CLOSED:      '종결',
};

export const COMPLAINT_PRIORITY_LABELS: Record<string, string> = {
  LOW:    '낮음',
  MEDIUM: '보통',
  HIGH:   '높음',
  URGENT: '긴급',
};

export const COMPLAINT_PRIORITY_COLORS: Record<string, string> = {
  LOW:    '#4caf50',
  MEDIUM: '#2196f3',
  HIGH:   '#ff9800',
  URGENT: '#f44336',
};

/** Ordered status steps for timeline/stepper display */
export const COMPLAINT_STATUS_STEPS: ComplaintStatus[] = [
  ComplaintStatus.OPEN,
  ComplaintStatus.TRIAGED,
  ComplaintStatus.ASSIGNED,
  ComplaintStatus.IN_PROGRESS,
  ComplaintStatus.RESOLVED,
  ComplaintStatus.CLOSED,
];
