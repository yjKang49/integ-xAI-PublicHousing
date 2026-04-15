import { WorkOrderStatus } from '../types/enums';
export interface CreateWorkOrderInput {
    complexId: string;
    buildingId?: string;
    complaintId?: string;
    defectId?: string;
    title: string;
    description: string;
    assignedTo: string;
    scheduledDate: string;
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
    actionNotes?: string;
    notes?: string;
    mediaIds?: string[];
}
export declare const WORK_ORDER_STATUS_LABELS: Record<string, string>;
export declare const WORK_ORDER_STATUS_COLORS: Record<string, string>;
/** Transition rules: which statuses can transition to which */
export declare const WORK_ORDER_TRANSITIONS: Record<string, WorkOrderStatus[]>;
