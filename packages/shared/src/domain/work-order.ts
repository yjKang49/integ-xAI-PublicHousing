// packages/shared/src/domain/work-order.ts
import { WorkOrderStatus } from '../types/enums';

export interface CreateWorkOrderInput {
  complexId: string;
  buildingId?: string;
  complaintId?: string;
  defectId?: string;
  title: string;
  description: string;
  assignedTo: string;         // userId
  scheduledDate: string;      // ISO date string
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  estimatedCost?: number;
  vendor?: string;
  mediaIds?: string[];
}

export interface UpdateWorkOrderInput {
  status?: WorkOrderStatus;
  assignedTo?: string;
  scheduledDate?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  estimatedCost?: number;
  actualCost?: number;
  vendor?: string;
  actionNotes?: string;       // 현장 조치 내용 (inspector 입력)
  notes?: string;
  mediaIds?: string[];
}

export const WORK_ORDER_STATUS_LABELS: Record<string, string> = {
  OPEN:        '대기',
  IN_PROGRESS: '진행중',
  COMPLETED:   '완료',
  CANCELLED:   '취소',
};

export const WORK_ORDER_STATUS_COLORS: Record<string, string> = {
  OPEN:        '#2196f3',
  IN_PROGRESS: '#ff9800',
  COMPLETED:   '#4caf50',
  CANCELLED:   '#9e9e9e',
};

/** Transition rules: which statuses can transition to which */
export const WORK_ORDER_TRANSITIONS: Record<string, WorkOrderStatus[]> = {
  OPEN:        [WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.CANCELLED],
  IN_PROGRESS: [WorkOrderStatus.COMPLETED, WorkOrderStatus.OPEN, WorkOrderStatus.CANCELLED],
  COMPLETED:   [],
  CANCELLED:   [WorkOrderStatus.OPEN],
};
