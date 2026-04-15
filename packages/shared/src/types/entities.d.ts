import { CouchDocument } from './couch';
import { UserRole, DefectType, SeverityLevel, InspectionStatus, SessionStatus, ComplaintStatus, ComplaintCategory, WorkOrderStatus, AlertType, AlertStatus, FacilityAssetType, MediaType, ReportType, SensorType, SensorStatus, SensorReadingQuality, RiskLevel, MaintenanceType, RecommendationStatus, RiskTargetType } from './enums';
export interface User extends CouchDocument {
    docType: 'user';
    email: string;
    passwordHash: string;
    name: string;
    phone?: string;
    role: UserRole;
    organizationId: string;
    assignedComplexIds: string[];
    isActive: boolean;
    lastLoginAt?: string;
    refreshTokenHash?: string;
    avatarUrl?: string;
}
export type UserProfile = Omit<User, 'passwordHash' | 'refreshTokenHash'>;
export interface Organization extends CouchDocument {
    docType: 'organization';
    name: string;
    businessNumber: string;
    address: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    plan: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
    dbName: string;
    isActive: boolean;
    contractStartDate: string;
    contractEndDate: string;
    logoUrl?: string;
}
export interface HousingComplex extends CouchDocument {
    docType: 'housingComplex';
    name: string;
    address: string;
    totalUnits: number;
    totalBuildings: number;
    builtYear: number;
    managedBy: string;
    latitude?: number;
    longitude?: number;
    qrCode: string;
    floorPlanUrl?: string;
    siteModelUrl?: string;
    tags: string[];
}
export interface Building extends CouchDocument {
    docType: 'building';
    complexId: string;
    name: string;
    code: string;
    totalFloors: number;
    undergroundFloors: number;
    totalUnits: number;
    builtDate: string;
    structureType: string;
    qrCode: string;
    modelUrl?: string;
    floorPlanUrls: Record<string, string>;
}
export interface Floor extends CouchDocument {
    docType: 'floor';
    buildingId: string;
    complexId: string;
    floorNumber: number;
    floorName: string;
    area: number;
    planImageUrl?: string;
    zones: string[];
}
export interface Zone extends CouchDocument {
    docType: 'zone';
    floorId: string;
    buildingId: string;
    complexId: string;
    name: string;
    code: string;
    description?: string;
    qrCode: string;
    boundingBox2D?: BoundingBox2D;
}
export interface BoundingBox2D {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface FacilityAsset extends CouchDocument {
    docType: 'facilityAsset';
    complexId: string;
    buildingId?: string;
    floorId?: string;
    zoneId?: string;
    name: string;
    code: string;
    assetType: FacilityAssetType;
    material?: string;
    installDate?: string;
    serviceLifeYears?: number;
    expectedReplacementDate?: string;
    qrCode: string;
    specifications: Record<string, string | number>;
    lastInspectionDate?: string;
    riskLevel?: SeverityLevel;
    notes?: string;
}
export interface InspectionProject extends CouchDocument {
    docType: 'inspectionProject';
    complexId: string;
    name: string;
    round: number;
    inspectionType: 'REGULAR' | 'EMERGENCY' | 'SPECIAL';
    plannedStartDate: string;
    plannedEndDate: string;
    actualStartDate?: string;
    actualEndDate?: string;
    status: InspectionStatus;
    leadInspectorId: string;
    reviewerId?: string;
    description?: string;
    checklistTemplateId?: string;
    sessionIds: string[];
}
export interface InspectionSession extends CouchDocument {
    docType: 'inspectionSession';
    projectId: string;
    complexId: string;
    buildingId: string;
    floorId?: string;
    zoneId?: string;
    inspectorId: string;
    /** 세션 워크플로우: DRAFT→ASSIGNED→IN_PROGRESS→SUBMITTED→APPROVED */
    status: SessionStatus;
    checklistTemplateId?: string;
    startedAt?: string;
    submittedAt?: string;
    approvedAt?: string;
    completedAt?: string;
    checklistItems: ChecklistItem[];
    defectCount: number;
    notes?: string;
    weatherCondition?: string;
    temperature?: number;
    humidity?: number;
    syncStatus?: 'SYNCED' | 'PENDING' | 'CONFLICT' | 'ERROR';
    localModifiedAt?: string;
}
export type ChecklistResult = 'PASS' | 'FAIL' | 'N/A' | null;
export interface ChecklistItem {
    id: string;
    category: string;
    description: string;
    result: ChecklistResult;
    notes?: string;
    photoUrls?: string[];
    referenceImageUrl?: string;
    order: number;
}
/** 재사용 가능한 체크리스트 템플릿 — 플랫폼 수준 (platform DB) */
export interface ChecklistTemplate extends CouchDocument {
    docType: 'checklistTemplate';
    name: string;
    description?: string;
    version: string;
    inspectionType: 'REGULAR' | 'EMERGENCY' | 'SPECIAL' | 'ALL';
    items: Omit<ChecklistItem, 'id' | 'result' | 'notes' | 'photoUrls'>[];
    isDefault: boolean;
    isActive: boolean;
}
export interface Defect extends CouchDocument {
    docType: 'defect';
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
    marker3DId?: string;
    mediaIds: string[];
    isRepaired: boolean;
    repairedAt?: string;
    repairedBy?: string;
    repairNotes?: string;
    workOrderId?: string;
    actionPlanId?: string;
    aiClassification?: string;
    aiConfidence?: number;
    aiDiagnosis?: string;
}
export interface DefectMedia extends CouchDocument {
    docType: 'defectMedia';
    defectId: string;
    sessionId: string;
    complexId: string;
    mediaType: MediaType;
    fileName: string;
    fileSize: number;
    mimeType: string;
    storageKey: string;
    thumbnailKey?: string;
    url?: string;
    capturedAt: string;
    capturedBy: string;
    _attachments?: Record<string, {
        content_type: string;
        data: string;
    }>;
    gpsLat?: number;
    gpsLng?: number;
    gpsAlt?: number;
}
export interface DefectMarker3D extends CouchDocument {
    docType: 'defectMarker3D';
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
    floor?: number;
    severity?: string;
    color: string;
    label: string;
    iconType: DefectType;
    isVisible: boolean;
    historicalMarkerIds?: string[];
}
export interface CrackGaugePoint extends CouchDocument {
    docType: 'crackGaugePoint';
    complexId: string;
    buildingId: string;
    floorId?: string;
    zoneId?: string;
    assetId?: string;
    name: string;
    description: string;
    qrCode: string;
    installDate: string;
    baselineWidthMm: number;
    thresholdMm: number;
    location: string;
    photo2DCoords?: {
        x: number;
        y: number;
    };
    marker3DId?: string;
    isActive: boolean;
}
export interface CrackMeasurement extends CouchDocument {
    docType: 'crackMeasurement';
    gaugePointId: string;
    complexId: string;
    sessionId?: string;
    measuredBy: string;
    measuredAt: string;
    capturedImageKey: string;
    roiImageKey?: string;
    measuredWidthMm: number;
    changeFromBaselineMm: number;
    changeFromLastMm?: number;
    isManualOverride: boolean;
    manualWidthMm?: number;
    autoConfidence?: number;
    graduationCount?: number;
    scaleMmPerGraduation?: number;
    exceedsThreshold: boolean;
    alertId?: string;
    notes?: string;
}
export interface Complaint extends CouchDocument {
    docType: 'complaint';
    complexId: string;
    buildingId?: string;
    unitNumber?: string;
    category: ComplaintCategory;
    status: ComplaintStatus;
    title: string;
    description: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    submittedBy: string;
    submittedPhone?: string;
    submittedAt: string;
    assignedTo?: string;
    assignedAt?: string;
    dueDate?: string;
    resolvedAt?: string;
    closedAt?: string;
    resolutionNotes?: string;
    mediaIds: string[];
    workOrderId?: string;
    satisfactionScore?: number;
    satisfactionFeedback?: string;
    classificationHint?: string;
    aiSuggestion?: string;
    aiCategory?: string;
    aiPriority?: string;
    aiConfidence?: number;
    timeline: ComplaintEvent[];
}
export interface ComplaintEvent {
    timestamp: string;
    fromStatus: ComplaintStatus | null;
    toStatus: ComplaintStatus;
    actorId: string;
    notes?: string;
}
export interface WorkOrder extends CouchDocument {
    docType: 'workOrder';
    complexId: string;
    buildingId?: string;
    defectId?: string;
    complaintId?: string;
    title: string;
    description: string;
    assignedTo: string;
    scheduledDate: string;
    startedAt?: string;
    completedAt?: string;
    status: WorkOrderStatus;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    estimatedCost?: number;
    actualCost?: number;
    vendor?: string;
    mediaIds: string[];
    actionNotes?: string;
    notes?: string;
    timeline: WorkOrderEvent[];
}
export interface WorkOrderEvent {
    timestamp: string;
    fromStatus: WorkOrderStatus | null;
    toStatus: WorkOrderStatus;
    actorId: string;
    notes?: string;
}
export interface Schedule extends CouchDocument {
    docType: 'schedule';
    complexId: string;
    title: string;
    description?: string;
    scheduleType: 'REGULAR_INSPECTION' | 'EMERGENCY_INSPECTION' | 'MAINTENANCE' | 'CONTRACT_RENEWAL';
    recurrence: 'ONCE' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
    nextOccurrence: string;
    lastOccurrence?: string;
    assignedTo: string[];
    isActive: boolean;
    overdueAlertDays: number;
    linkedProjectId?: string;
}
export interface Alert extends CouchDocument {
    docType: 'alert';
    complexId: string;
    alertType: AlertType;
    status: AlertStatus;
    severity: SeverityLevel;
    title: string;
    message: string;
    sourceEntityType: string;
    sourceEntityId: string;
    assignedTo?: string[];
    acknowledgedBy?: string;
    acknowledgedAt?: string;
    resolvedBy?: string;
    resolvedAt?: string;
    expiresAt?: string;
}
export interface ActionPlan extends CouchDocument {
    docType: 'actionPlan';
    complexId: string;
    defectId?: string;
    title: string;
    description: string;
    plannedDate: string;
    estimatedCost: number;
    priority: SeverityLevel;
    status: 'DRAFT' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED';
    approvedBy?: string;
    approvedAt?: string;
    completedAt?: string;
    workOrderIds: string[];
    category: 'IMMEDIATE' | 'SHORT_TERM' | 'LONG_TERM';
}
export interface Report extends CouchDocument {
    docType: 'report';
    complexId: string;
    projectId?: string;
    sessionId?: string;
    reportType: ReportType;
    title: string;
    generatedBy: string;
    generatedAt: string;
    fileKey: string;
    fileSize: number;
    downloadUrl?: string;
    parameters: Record<string, unknown>;
    isPublic: boolean;
}
export interface KPIRecord extends CouchDocument {
    docType: 'kpiRecord';
    complexId: string;
    periodStart: string;
    periodEnd: string;
    totalComplaints: number;
    resolvedComplaints: number;
    avgResolutionHours: number;
    totalInspections: number;
    completedInspections: number;
    overdueInspections: number;
    avgInspectionHours: number;
    totalDefects: number;
    criticalDefects: number;
    repairedDefects: number;
    preventiveMaintenanceCost: number;
    correctiveMaintenanceCost: number;
    avgSatisfactionScore?: number;
    complaintResolutionRate: number;
    inspectionCompletionRate: number;
    defectRepairRate: number;
}
/** 서브스코어 항목 — 근거와 함께 저장 */
export interface RiskSubScore {
    score: number;
    weight: number;
    contribution: number;
    details: string;
    dataPoints: number;
}
/** 계산 근거 증거 */
export interface RiskEvidence {
    unrepairedDefects: number;
    criticalDefects: number;
    highDefects: number;
    crackThresholdExceedances: number;
    maxCrackWidthMm?: number;
    openComplaints: number;
    urgentComplaints: number;
    activeAlerts: number;
    criticalAlerts: number;
    sensorAnomalies: number;
    sensorCriticalCount: number;
    assetAgeYears?: number;
    serviceLifeYears?: number;
    remainingLifeRatio?: number;
    lastInspectionDaysAgo?: number;
    evidenceSummary: string;
}
/** 자산/구역 단위 위험도 스코어 문서 */
export interface RiskScore extends CouchDocument {
    docType: 'riskScore';
    orgId: string;
    complexId: string;
    targetType: RiskTargetType;
    targetId: string;
    targetName: string;
    score: number;
    level: RiskLevel;
    confidence: number;
    calculatedAt: string;
    subScores: {
        defect: RiskSubScore;
        crack: RiskSubScore;
        sensor: RiskSubScore;
        complaint: RiskSubScore;
        age: RiskSubScore;
    };
    evidence: RiskEvidence;
    isLatest: boolean;
}
/** 장기수선 / 예지정비 권장 문서 */
export interface MaintenanceRecommendation extends CouchDocument {
    docType: 'maintenanceRecommendation';
    orgId: string;
    complexId: string;
    riskScoreId: string;
    targetType: RiskTargetType;
    targetId: string;
    targetName: string;
    riskScore: number;
    riskLevel: RiskLevel;
    maintenanceType: MaintenanceType;
    priority: 'IMMEDIATE' | 'HIGH' | 'MEDIUM' | 'LOW';
    suggestedTimeline: {
        earliest: string;
        latest: string;
        label: string;
    };
    estimatedCostBand: {
        min: number;
        max: number;
        currency: 'KRW';
        basis: string;
    };
    evidenceSummary: string;
    reasoning: string[];
    status: RecommendationStatus;
    approvedBy?: string;
    approvedAt?: string;
    deferredReason?: string;
    deferredUntil?: string;
    linkedActionPlanId?: string;
    linkedWorkOrderId?: string;
    notes?: string;
}
/** 임계치 설정 — 경보 생성 기준 */
export interface SensorThreshold {
    unit: string;
    warningMin?: number;
    warningMax?: number;
    criticalMin?: number;
    criticalMax?: number;
}
/** IoT 센서 기기 등록 문서 */
export interface SensorDevice extends CouchDocument {
    docType: 'sensorDevice';
    orgId: string;
    complexId: string;
    buildingId?: string;
    floorId?: string;
    zoneId?: string;
    assetId?: string;
    name: string;
    deviceKey: string;
    sensorType: SensorType;
    status: SensorStatus;
    locationDescription: string;
    latitude?: number;
    longitude?: number;
    thresholds: SensorThreshold;
    manufacturer?: string;
    model?: string;
    installDate?: string;
    lastSeenAt?: string;
    lastValue?: number;
    lastValueAt?: string;
    batteryLevel?: number;
    firmwareVersion?: string;
    isActive: boolean;
    notes?: string;
}
/** IoT 센서 시계열 측정값 */
export interface SensorReading extends CouchDocument {
    docType: 'sensorReading';
    orgId: string;
    deviceId: string;
    deviceKey: string;
    complexId: string;
    sensorType: SensorType;
    value: number;
    unit: string;
    quality: SensorReadingQuality;
    recordedAt: string;
    thresholdStatus: 'NORMAL' | 'WARNING' | 'CRITICAL';
    alertId?: string;
    source: 'REST_INGEST' | 'BATCH_IMPORT' | 'MANUAL';
    rawPayload?: Record<string, unknown>;
}
export interface AuditLog extends CouchDocument {
    docType: 'auditLog';
    action: string;
    entityType: string;
    entityId: string;
    actorId: string;
    actorRole: UserRole;
    ipAddress?: string;
    userAgent?: string;
    changes?: {
        before: Record<string, unknown>;
        after: Record<string, unknown>;
    };
    metadata?: Record<string, unknown>;
}
