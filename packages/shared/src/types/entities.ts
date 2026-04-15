// ============================================================
// packages/shared/src/types/entities.ts
// Core domain entity TypeScript interfaces
// All entities extend CouchDocument for DB persistence
// ============================================================

import { CouchDocument } from './couch';
import {
  UserRole,
  DefectType,
  SeverityLevel,
  InspectionStatus,
  SessionStatus,
  ComplaintStatus,
  ComplaintCategory,
  WorkOrderStatus,
  AlertType,
  AlertStatus,
  FacilityAssetType,
  MediaType,
  ReportType,
  SensorType,
  SensorStatus,
  SensorReadingQuality,
  RiskLevel,
  MaintenanceType,
  RecommendationStatus,
  RiskTargetType,
} from './enums';

// ──────────────────────────────────────────────
// USER & ORG
// ──────────────────────────────────────────────

export interface User extends CouchDocument {
  docType: 'user';
  email: string;
  passwordHash: string;       // bcrypt — never sent to client
  name: string;
  phone?: string;
  role: UserRole;
  organizationId: string;
  assignedComplexIds: string[]; // which complexes this user can access
  isActive: boolean;
  lastLoginAt?: string;
  refreshTokenHash?: string;
  avatarUrl?: string;
}

// Client-safe user projection (no passwordHash, no tokens)
export type UserProfile = Omit<User, 'passwordHash' | 'refreshTokenHash'>;

export interface Organization extends CouchDocument {
  docType: 'organization';
  name: string;
  businessNumber: string;     // 사업자등록번호
  address: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  plan: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
  dbName: string;             // CouchDB database name for this org
  isActive: boolean;
  contractStartDate: string;  // ISO date
  contractEndDate: string;    // ISO date — triggers CONTRACT_EXPIRY alert
  logoUrl?: string;
}

// ──────────────────────────────────────────────
// HOUSING COMPLEX HIERARCHY
// HousingComplex → Building → Floor → Zone → FacilityAsset
// ──────────────────────────────────────────────

export interface HousingComplex extends CouchDocument {
  docType: 'housingComplex';
  name: string;
  address: string;
  totalUnits: number;
  totalBuildings: number;
  builtYear: number;
  managedBy: string;          // userId of responsible manager
  latitude?: number;
  longitude?: number;
  qrCode: string;             // unique QR payload for this complex
  floorPlanUrl?: string;
  siteModelUrl?: string;      // glTF site-level 3D model
  tags: string[];
}

export interface Building extends CouchDocument {
  docType: 'building';
  complexId: string;
  name: string;               // e.g. "101동"
  code: string;               // short code for QR
  totalFloors: number;
  undergroundFloors: number;
  totalUnits: number;
  builtDate: string;
  structureType: string;      // 철근콘크리트 etc.
  qrCode: string;
  modelUrl?: string;          // building-level glTF
  floorPlanUrls: Record<string, string>; // floorNumber -> url
}

export interface Floor extends CouchDocument {
  docType: 'floor';
  buildingId: string;
  complexId: string;
  floorNumber: number;        // negative for underground
  floorName: string;          // e.g. "B1", "1F", "2F"
  area: number;               // m²
  planImageUrl?: string;
  zones: string[];            // zoneId[]
}

export interface Zone extends CouchDocument {
  docType: 'zone';
  floorId: string;
  buildingId: string;
  complexId: string;
  name: string;               // e.g. "계단실A", "복도 북측"
  code: string;
  description?: string;
  qrCode: string;
  boundingBox2D?: BoundingBox2D;
}

export interface BoundingBox2D {
  x: number; y: number;
  width: number; height: number;
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
  specifications: Record<string, string | number>; // key-value specs
  lastInspectionDate?: string;
  riskLevel?: SeverityLevel;
  notes?: string;
}

// ──────────────────────────────────────────────
// INSPECTION
// ──────────────────────────────────────────────

export interface InspectionProject extends CouchDocument {
  docType: 'inspectionProject';
  complexId: string;
  name: string;
  round: number;              // 점검 차수
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
  checklistTemplateId?: string;  // 사용된 템플릿 ID
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
  // PouchDB offline sync — present only on mobile
  syncStatus?: 'SYNCED' | 'PENDING' | 'CONFLICT' | 'ERROR';
  localModifiedAt?: string;
}

export type ChecklistResult = 'PASS' | 'FAIL' | 'N/A' | null;

export interface ChecklistItem {
  id: string;
  category: string;           // 구조체, 외벽, 방수/누수, 공용설비, 마감 etc.
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
  name: string;               // 예: "공동주택 정기점검 표준"
  description?: string;
  version: string;            // 예: "2026.1"
  inspectionType: 'REGULAR' | 'EMERGENCY' | 'SPECIAL' | 'ALL';
  items: Omit<ChecklistItem, 'id' | 'result' | 'notes' | 'photoUrls'>[];
  isDefault: boolean;
  isActive: boolean;
}

// ──────────────────────────────────────────────
// DEFECT
// ──────────────────────────────────────────────

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
  // measurements
  widthMm?: number;           // 폭 (mm)
  lengthMm?: number;          // 길이 (mm)
  depthMm?: number;           // 깊이 (mm)
  areaSqm?: number;           // 면적 (m²)
  // location
  locationDescription: string;
  photo2DCoords?: { x: number; y: number }; // on floor plan image
  marker3DId?: string;        // FK to DefectMarker3D
  mediaIds: string[];         // FK to DefectMedia[]
  // workflow
  isRepaired: boolean;
  repairedAt?: string;
  repairedBy?: string;
  repairNotes?: string;
  workOrderId?: string;
  actionPlanId?: string;
  // AI extension point (Phase 2)
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
  fileSize: number;           // bytes
  mimeType: string;
  storageKey: string;         // S3 object key
  thumbnailKey?: string;
  url?: string;               // pre-signed URL (transient, not stored)
  capturedAt: string;
  capturedBy: string;
  // for mobile offline — base64 blob stored in PouchDB attachment
  _attachments?: Record<string, { content_type: string; data: string }>;
  gpsLat?: number;
  gpsLng?: number;
  gpsAlt?: number;
}

// ──────────────────────────────────────────────
// 3D DIGITAL TWIN
// ──────────────────────────────────────────────

export interface DefectMarker3D extends CouchDocument {
  docType: 'defectMarker3D';
  defectId: string;
  complexId: string;
  buildingId: string;
  modelUrl: string;           // which glTF model this marker belongs to
  // Three.js world coordinates
  position: { x: number; y: number; z: number };
  normal?: { x: number; y: number; z: number };  // surface normal
  meshName?: string;          // clicked mesh name in the scene
  floor?: number;             // derived from meshName (0 = all floors)
  severity?: string;          // denormalized from defect for fast color filtering
  color: string;              // hex color based on severity
  label: string;              // display label
  iconType: DefectType;
  isVisible: boolean;
  historicalMarkerIds?: string[]; // previous inspection markers at same location
}

// ──────────────────────────────────────────────
// CRACK MONITORING
// ──────────────────────────────────────────────

export interface CrackGaugePoint extends CouchDocument {
  docType: 'crackGaugePoint';
  complexId: string;
  buildingId: string;
  floorId?: string;
  zoneId?: string;
  assetId?: string;
  name: string;               // 균열 게이지 포인트 명칭
  description: string;
  qrCode: string;             // QR code attached near gauge
  installDate: string;
  baselineWidthMm: number;    // initial crack width at install
  thresholdMm: number;        // alert threshold
  location: string;
  photo2DCoords?: { x: number; y: number };
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
  // OpenCV.js measurement result
  capturedImageKey: string;   // S3 key
  roiImageKey?: string;       // extracted ROI image
  measuredWidthMm: number;    // auto-measured value
  changeFromBaselineMm: number; // delta from installDate baseline
  changeFromLastMm?: number;  // delta from previous measurement
  isManualOverride: boolean;  // true if auto-measurement failed
  manualWidthMm?: number;
  autoConfidence?: number;    // 0-1 confidence score from OpenCV
  graduationCount?: number;   // scale graduation count detected
  scaleMmPerGraduation?: number;
  exceedsThreshold: boolean;
  alertId?: string;
  notes?: string;
}

// ──────────────────────────────────────────────
// COMPLAINT MANAGEMENT
// ──────────────────────────────────────────────

export interface Complaint extends CouchDocument {
  docType: 'complaint';
  complexId: string;
  buildingId?: string;
  unitNumber?: string;        // 호실
  category: ComplaintCategory;
  status: ComplaintStatus;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  submittedBy: string;        // resident name or userId
  submittedPhone?: string;
  submittedAt: string;
  assignedTo?: string;        // userId
  assignedAt?: string;
  dueDate?: string;
  resolvedAt?: string;
  closedAt?: string;
  resolutionNotes?: string;
  mediaIds: string[];
  workOrderId?: string;
  satisfactionScore?: number; // 1-5
  satisfactionFeedback?: string;
  // AI 자동 분류 확장 포인트 (Phase 2)
  classificationHint?: string;   // 접수 시 키워드 기반 힌트 (e.g. '누수', '균열')
  aiSuggestion?: string;         // AI 분류 제안 결과 (Phase 2에서 채워짐)
  aiCategory?: string;
  aiPriority?: string;
  aiConfidence?: number;
  // timeline of status changes
  timeline: ComplaintEvent[];
}

export interface ComplaintEvent {
  timestamp: string;
  fromStatus: ComplaintStatus | null;
  toStatus: ComplaintStatus;
  actorId: string;
  notes?: string;
}

// ──────────────────────────────────────────────
// WORK ORDER
// ──────────────────────────────────────────────

export interface WorkOrder extends CouchDocument {
  docType: 'workOrder';
  complexId: string;
  buildingId?: string;
  defectId?: string;
  complaintId?: string;        // FK to Complaint (민원 연계)
  title: string;
  description: string;
  assignedTo: string;          // userId of the assigned inspector/maintainer
  scheduledDate: string;       // 조치 예정일
  startedAt?: string;
  completedAt?: string;
  status: WorkOrderStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  estimatedCost?: number;
  actualCost?: number;
  vendor?: string;
  mediaIds: string[];
  actionNotes?: string;        // 현장 조치 결과 (inspector가 입력)
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

// ──────────────────────────────────────────────
// SCHEDULE & ALERTS
// ──────────────────────────────────────────────

export interface Schedule extends CouchDocument {
  docType: 'schedule';
  complexId: string;
  title: string;
  description?: string;
  scheduleType: 'REGULAR_INSPECTION' | 'EMERGENCY_INSPECTION' | 'MAINTENANCE' | 'CONTRACT_RENEWAL';
  recurrence: 'ONCE' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  nextOccurrence: string;
  lastOccurrence?: string;
  assignedTo: string[];       // userIds
  isActive: boolean;
  overdueAlertDays: number;   // trigger alert if N days past due
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
  sourceEntityType: string;   // 'defect' | 'crackMeasurement' | 'schedule' etc.
  sourceEntityId: string;
  assignedTo?: string[];      // userIds to notify
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  expiresAt?: string;
}

// ──────────────────────────────────────────────
// ACTION PLAN
// ──────────────────────────────────────────────

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

// ──────────────────────────────────────────────
// REPORT
// ──────────────────────────────────────────────

export interface Report extends CouchDocument {
  docType: 'report';
  complexId: string;
  projectId?: string;
  sessionId?: string;
  reportType: ReportType;
  title: string;
  generatedBy: string;
  generatedAt: string;
  fileKey: string;            // S3 key of generated PDF
  fileSize: number;
  downloadUrl?: string;       // transient pre-signed URL
  parameters: Record<string, unknown>; // generation parameters
  isPublic: boolean;          // accessible to VIEWER role
}

// ──────────────────────────────────────────────
// KPI
// ──────────────────────────────────────────────

export interface KPIRecord extends CouchDocument {
  docType: 'kpiRecord';
  complexId: string;
  periodStart: string;        // ISO date
  periodEnd: string;
  // complaint KPIs
  totalComplaints: number;
  resolvedComplaints: number;
  avgResolutionHours: number;
  // inspection KPIs
  totalInspections: number;
  completedInspections: number;
  overdueInspections: number;
  avgInspectionHours: number;
  // defect KPIs
  totalDefects: number;
  criticalDefects: number;
  repairedDefects: number;
  // cost KPIs
  preventiveMaintenanceCost: number;
  correctiveMaintenanceCost: number;
  // satisfaction
  avgSatisfactionScore?: number;
  // computed
  complaintResolutionRate: number;   // resolved/total
  inspectionCompletionRate: number;
  defectRepairRate: number;
}

// ──────────────────────────────────────────────
// PREDICTIVE MAINTENANCE (Phase 2-9)
// RiskScore → MaintenanceRecommendation
// ──────────────────────────────────────────────

/** 서브스코어 항목 — 근거와 함께 저장 */
export interface RiskSubScore {
  score: number;    // 0~100
  weight: number;   // 가중치 (합 = 1.0)
  contribution: number; // score × weight
  details: string;  // 근거 설명 (한국어)
  dataPoints: number; // 근거 데이터 건수
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
  sensorAnomalies: number;     // WARNING + CRITICAL 측정값 건수
  sensorCriticalCount: number;
  assetAgeYears?: number;
  serviceLifeYears?: number;
  remainingLifeRatio?: number; // 0~1 (잔여 수명 비율)
  lastInspectionDaysAgo?: number;
  evidenceSummary: string;     // 1~3줄 한국어 요약
}

/** 자산/구역 단위 위험도 스코어 문서 */
export interface RiskScore extends CouchDocument {
  docType: 'riskScore';
  orgId: string;
  complexId: string;
  targetType: RiskTargetType;
  targetId: string;
  targetName: string;
  score: number;          // 0~100 종합 위험도
  level: RiskLevel;
  confidence: number;     // 0~1 (근거 데이터 충분도)
  calculatedAt: string;
  subScores: {
    defect: RiskSubScore;
    crack: RiskSubScore;
    sensor: RiskSubScore;
    complaint: RiskSubScore;
    age: RiskSubScore;
  };
  evidence: RiskEvidence;
  isLatest: boolean;      // 대상별 최신 계산 결과 여부
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
    earliest: string;  // ISO date
    latest: string;    // ISO date
    label: string;     // 예: '즉시 (1개월 이내)'
  };
  estimatedCostBand: {
    min: number;       // KRW
    max: number;       // KRW
    currency: 'KRW';
    basis: string;     // 비용 산정 근거
  };
  evidenceSummary: string;
  reasoning: string[];         // 불릿 형태 근거 목록 (최소 3개)
  status: RecommendationStatus;
  approvedBy?: string;
  approvedAt?: string;
  deferredReason?: string;
  deferredUntil?: string;
  linkedActionPlanId?: string;
  linkedWorkOrderId?: string;
  notes?: string;
}

// ──────────────────────────────────────────────
// IOT SENSORS (Phase 2-8)
// SensorDevice → SensorReading (time-series)
// ──────────────────────────────────────────────

/** 임계치 설정 — 경보 생성 기준 */
export interface SensorThreshold {
  unit: string;          // 측정 단위 (°C, %, mm/s, ppm, kW, ...)
  warningMin?: number;   // 이 값 미만이면 WARNING
  warningMax?: number;   // 이 값 초과이면 WARNING
  criticalMin?: number;  // 이 값 미만이면 CRITICAL
  criticalMax?: number;  // 이 값 초과이면 CRITICAL
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
  name: string;               // 센서 표시명 (예: "101동 지하 온도계 #1")
  deviceKey: string;          // 인제스트 식별자 (예: "bldg101-temp-b1-01") — 고유값
  sensorType: SensorType;
  status: SensorStatus;
  locationDescription: string;
  latitude?: number;
  longitude?: number;
  thresholds: SensorThreshold;
  manufacturer?: string;
  model?: string;
  installDate?: string;
  lastSeenAt?: string;        // 마지막 수신 시각 (ISO)
  lastValue?: number;         // 마지막 측정값
  lastValueAt?: string;       // 마지막 측정 시각 (ISO)
  batteryLevel?: number;      // 0-100 (null이면 유선)
  firmwareVersion?: string;
  isActive: boolean;
  notes?: string;
}

/** IoT 센서 시계열 측정값 */
export interface SensorReading extends CouchDocument {
  docType: 'sensorReading';
  orgId: string;
  deviceId: string;           // FK to SensorDevice._id
  deviceKey: string;          // 비정규화 (인제스트 식별자)
  complexId: string;
  sensorType: SensorType;
  value: number;
  unit: string;
  quality: SensorReadingQuality;
  recordedAt: string;         // 센서 측정 시각 (ISO) — 인제스트 시각과 다를 수 있음
  thresholdStatus: 'NORMAL' | 'WARNING' | 'CRITICAL';
  alertId?: string;           // 임계치 초과 시 생성된 Alert._id
  source: 'REST_INGEST' | 'BATCH_IMPORT' | 'MANUAL';
  rawPayload?: Record<string, unknown>;
}

// ──────────────────────────────────────────────
// AUDIT LOG
// ──────────────────────────────────────────────

export interface AuditLog extends CouchDocument {
  docType: 'auditLog';
  action: string;             // e.g. 'defect.create', 'complaint.status_change'
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
