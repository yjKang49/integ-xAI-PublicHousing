import { UserRole, DefectType, SeverityLevel, ComplaintCategory, ComplaintStatus } from './enums';
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    meta?: PaginationMeta;
    timestamp: string;
}
export interface ApiError {
    success: false;
    error: {
        code: string;
        message: string;
        details?: Record<string, string[]>;
    };
    timestamp: string;
}
export interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
}
export interface PaginationQuery {
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
}
export interface LoginRequest {
    email: string;
    password: string;
}
export interface RefreshTokenRequest {
    refreshToken: string;
}
export interface RefreshTokenResponse {
    accessToken: string;
    refreshToken: string;
}
export interface CreateUserRequest {
    email: string;
    password: string;
    name: string;
    phone?: string;
    role: UserRole;
    assignedComplexIds?: string[];
}
export interface UpdateUserRequest {
    name?: string;
    phone?: string;
    role?: UserRole;
    assignedComplexIds?: string[];
    isActive?: boolean;
}
export interface UserListQuery extends PaginationQuery {
    role?: UserRole;
    complexId?: string;
    isActive?: boolean;
    search?: string;
}
export interface CreateComplexRequest {
    name: string;
    address: string;
    totalUnits: number;
    totalBuildings: number;
    builtYear: number;
    managedBy: string;
    latitude?: number;
    longitude?: number;
    tags?: string[];
}
export interface UpdateComplexRequest extends Partial<CreateComplexRequest> {
}
export interface CreateBuildingRequest {
    name: string;
    code: string;
    totalFloors: number;
    undergroundFloors: number;
    totalUnits: number;
    builtDate: string;
    structureType: string;
}
export interface CreateProjectRequest {
    complexId: string;
    name: string;
    round: number;
    inspectionType: 'REGULAR' | 'EMERGENCY' | 'SPECIAL';
    plannedStartDate: string;
    plannedEndDate: string;
    leadInspectorId: string;
    reviewerId?: string;
    description?: string;
}
export interface UpdateProjectStatusRequest {
    status: 'IN_PROGRESS' | 'PENDING_REVIEW' | 'REVIEWED' | 'COMPLETED' | 'CANCELLED';
    notes?: string;
}
export interface CreateSessionRequest {
    buildingId: string;
    floorId?: string;
    zoneId?: string;
    inspectorId: string;
    notes?: string;
    weatherCondition?: string;
    temperature?: number;
    humidity?: number;
}
export interface UpdateSessionRequest {
    status?: string;
    completedAt?: string;
    checklistItems?: ChecklistItemUpdate[];
    notes?: string;
}
export interface ChecklistItemUpdate {
    id: string;
    result: 'PASS' | 'FAIL' | 'N/A';
    notes?: string;
}
export interface CreateDefectRequest {
    sessionId: string;
    projectId: string;
    complexId: string;
    buildingId: string;
    floorId?: string;
    zoneId?: string;
    assetId?: string;
    defectType: DefectType;
    severity: SeverityLevel;
    description: string;
    widthMm?: number;
    lengthMm?: number;
    depthMm?: number;
    areaSqm?: number;
    locationDescription: string;
    photo2DCoords?: {
        x: number;
        y: number;
    };
    mediaIds?: string[];
}
export interface UpdateDefectRequest {
    severity?: SeverityLevel;
    description?: string;
    widthMm?: number;
    lengthMm?: number;
    depthMm?: number;
    isRepaired?: boolean;
    repairNotes?: string;
    actionPlanId?: string;
}
export interface DefectListQuery extends PaginationQuery {
    complexId?: string;
    buildingId?: string;
    sessionId?: string;
    defectType?: DefectType;
    severity?: SeverityLevel;
    isRepaired?: boolean;
    dateFrom?: string;
    dateTo?: string;
}
export interface MediaUploadInitRequest {
    fileName: string;
    mimeType: string;
    fileSize: number;
    entityType: 'defect' | 'complaint' | 'workOrder';
    entityId: string;
    complexId: string;
}
export interface MediaUploadInitResponse {
    mediaId: string;
    uploadUrl: string;
    storageKey: string;
}
export interface MediaUploadCompleteRequest {
    mediaId: string;
    capturedAt?: string;
    gpsLat?: number;
    gpsLng?: number;
}
export interface CreateMarker3DRequest {
    defectId: string;
    complexId: string;
    buildingId: string;
    modelUrl: string;
    position: {
        x: number;
        y: number;
        z: number;
    };
    normal?: {
        x: number;
        y: number;
        z: number;
    };
    meshName?: string;
}
export interface MarkerListQuery {
    buildingId: string;
    sessionId?: string;
    defectType?: DefectType;
    severity?: SeverityLevel;
    includeHistory?: boolean;
}
export interface CreateCrackMeasurementRequest {
    gaugePointId: string;
    complexId: string;
    sessionId?: string;
    measuredAt: string;
    capturedImageKey: string;
    roiImageKey?: string;
    measuredWidthMm: number;
    isManualOverride: boolean;
    manualWidthMm?: number;
    autoConfidence?: number;
    graduationCount?: number;
    scaleMmPerGraduation?: number;
    notes?: string;
}
export interface CrackHistoryQuery {
    gaugePointId: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
}
export interface CrackHistoryResponse {
    gaugePointId: string;
    baselineWidthMm: number;
    thresholdMm: number;
    measurements: Array<{
        id: string;
        measuredAt: string;
        measuredWidthMm: number;
        changeFromBaselineMm: number;
        exceedsThreshold: boolean;
    }>;
}
export interface CreateComplaintRequest {
    complexId: string;
    buildingId?: string;
    unitNumber?: string;
    category: ComplaintCategory;
    title: string;
    description: string;
    submittedBy: string;
    submittedPhone?: string;
    mediaIds?: string[];
}
export interface UpdateComplaintRequest {
    status?: ComplaintStatus;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    assignedTo?: string;
    dueDate?: string;
    resolutionNotes?: string;
    satisfactionScore?: number;
    satisfactionFeedback?: string;
    notes?: string;
}
export interface ComplaintListQuery extends PaginationQuery {
    complexId?: string;
    status?: ComplaintStatus;
    category?: ComplaintCategory;
    assignedTo?: string;
    priority?: string;
    dateFrom?: string;
    dateTo?: string;
    overdueOnly?: boolean;
}
export interface CreateScheduleRequest {
    complexId: string;
    title: string;
    description?: string;
    scheduleType: string;
    recurrence: 'ONCE' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
    nextOccurrence: string;
    assignedTo: string[];
    overdueAlertDays: number;
}
export interface AlertListQuery extends PaginationQuery {
    complexId?: string;
    status?: string;
    alertType?: string;
    severity?: SeverityLevel;
}
export interface AcknowledgeAlertRequest {
    notes?: string;
}
export interface GenerateReportRequest {
    reportType: string;
    projectId?: string;
    sessionId?: string;
    complexId: string;
    parameters?: Record<string, unknown>;
    isPublic?: boolean;
}
export interface DashboardResponse {
    totalComplexes: number;
    criticalDefects: number;
    highDefects: number;
    unrepairedDefects: number;
    activeAlerts: number;
    pendingComplaints: number;
    overdueComplaints: number;
    /** 민원 평균 처리 시간 (시간) — complaintAvgProcessingHours */
    avgResolutionHours: number;
    activeProjects: number;
    overdueInspections: number;
    completedThisMonth: number;
    thresholdExceedances: number;
    activeGaugePoints: number;
    /** 균열 임계치 초과 활성 알림 건수 — crackAlertCount */
    crackAlertCount: number;
    complaintResolutionRate: number;
    inspectionCompletionRate: number;
    defectRepairRate: number;
    /** 예방 정비 절감 추산 (KRW) — preventiveMaintenanceSavingsEstimate */
    preventiveMaintenanceSavingsEstimate: number;
    recentAlerts: Array<{
        id: string;
        title: string;
        severity: string;
        createdAt: string;
    }>;
    recentComplaints: Array<{
        id: string;
        title: string;
        status: string;
        submittedAt: string;
    }>;
    defectsByType: Array<{
        type: string;
        count: number;
    }>;
    crackTrendSummary: Array<{
        gaugeId: string;
        name: string;
        latestMm: number;
        trend: 'UP' | 'STABLE' | 'DOWN';
    }>;
}
export interface KPIQuery {
    complexId?: string;
    periodStart: string;
    periodEnd: string;
}
