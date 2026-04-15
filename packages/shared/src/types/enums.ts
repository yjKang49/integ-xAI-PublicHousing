// ============================================================
// packages/shared/src/types/enums.ts
// Shared enums used across API, Admin Web, and Mobile App
// ============================================================

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',       // platform operator
  ORG_ADMIN = 'ORG_ADMIN',           // organization administrator
  INSPECTOR = 'INSPECTOR',           // field inspector
  REVIEWER = 'REVIEWER',             // responsible engineer / reviewer
  COMPLAINT_MGR = 'COMPLAINT_MGR',   // complaint handler
  VIEWER = 'VIEWER',                 // read-only public agency viewer
}

export enum DefectType {
  CRACK = 'CRACK',           // 균열
  LEAK = 'LEAK',             // 누수
  SPALLING = 'SPALLING',     // 박리/박락
  CORROSION = 'CORROSION',   // 부식
  EFFLORESCENCE = 'EFFLORESCENCE', // 백태
  DEFORMATION = 'DEFORMATION',     // 변형
  SETTLEMENT = 'SETTLEMENT',       // 침하
  OTHER = 'OTHER',
}

export enum SeverityLevel {
  LOW = 'LOW',         // 경미 — 관찰
  MEDIUM = 'MEDIUM',   // 보통 — 유지관리 필요
  HIGH = 'HIGH',       // 높음 — 조속 조치
  CRITICAL = 'CRITICAL', // 긴급 — 즉시 조치
}

export enum InspectionStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  PENDING_REVIEW = 'PENDING_REVIEW',
  REVIEWED = 'REVIEWED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/** 세션별 세분화된 상태 — 모바일 점검 워크플로우에 사용 */
export enum SessionStatus {
  DRAFT = 'DRAFT',             // 생성됨 (점검자 미배정)
  ASSIGNED = 'ASSIGNED',       // 점검자 배정 완료
  IN_PROGRESS = 'IN_PROGRESS', // 점검 진행 중 (모바일 시작)
  SUBMITTED = 'SUBMITTED',     // 점검 완료 제출
  APPROVED = 'APPROVED',       // 검토자 승인 완료
}

export enum ComplaintStatus {
  OPEN = 'OPEN',              // 민원 접수 (초기 상태)
  RECEIVED = 'RECEIVED',      // 하위 호환용 (OPEN과 동일)
  TRIAGED = 'TRIAGED',        // 내용 검토 및 우선순위 분류 완료
  ASSIGNED = 'ASSIGNED',      // 담당자 배정 완료
  IN_PROGRESS = 'IN_PROGRESS',// 현장 조치 진행 중
  RESOLVED = 'RESOLVED',      // 처리 완료 (확인 대기)
  CLOSED = 'CLOSED',          // 종결
}

export enum WorkOrderStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ComplaintCategory {
  FACILITY = 'FACILITY',     // 시설물 결함
  NOISE = 'NOISE',           // 소음
  SANITATION = 'SANITATION', // 위생
  SAFETY = 'SAFETY',         // 안전
  PARKING = 'PARKING',       // 주차
  ELEVATOR = 'ELEVATOR',     // 엘리베이터
  OTHER = 'OTHER',
}

export enum AlertStatus {
  ACTIVE = 'ACTIVE',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESOLVED = 'RESOLVED',
}

export enum FacilityAssetType {
  STRUCTURAL = 'STRUCTURAL',   // 구조체
  EXTERIOR = 'EXTERIOR',       // 외벽
  INTERIOR = 'INTERIOR',       // 내벽/내부
  MECHANICAL = 'MECHANICAL',   // 기계설비
  ELECTRICAL = 'ELECTRICAL',   // 전기설비
  PLUMBING = 'PLUMBING',       // 배관
  ROOF = 'ROOF',               // 지붕
  UNDERGROUND = 'UNDERGROUND', // 지하
}

export enum MediaType {
  PHOTO = 'PHOTO',
  VIDEO = 'VIDEO',
  DRAWING = 'DRAWING',
  MODEL_3D = 'MODEL_3D',
  DRONE_VIDEO = 'DRONE_VIDEO',   // 드론 촬영 영상
}

export enum ReportType {
  INSPECTION_RESULT = 'INSPECTION_RESULT',
  PHOTO_SHEET = 'PHOTO_SHEET',
  DEFECT_LIST = 'DEFECT_LIST',
  SUMMARY = 'SUMMARY',
  CRACK_TREND = 'CRACK_TREND',
  XAI_ASSESSMENT = 'XAI_ASSESSMENT',       // KICT 기준 설명가능 AI 책임 평가 보고서
  MAINTENANCE_PLAN = 'MAINTENANCE_PLAN',    // 장기수선계획
  COMPLAINT_ANALYSIS = 'COMPLAINT_ANALYSIS', // 민원 분석 보고서
}

export enum SyncStatus {
  SYNCED = 'SYNCED',
  PENDING = 'PENDING',
  CONFLICT = 'CONFLICT',
  ERROR = 'ERROR',
}

// ── AX-SPRINT 추가 열거형 ─────────────────────────────────────────────

/**
 * AI 결함 탐지 방법 (AX-SPRINT — AI 현장점검 10단계 자동화)
 * 4단계 신뢰도 점수 시스템과 연동:
 *   ≥ 90%  → AUTO_ACCEPT (자동 확정 입력)
 *   80~89% → REQUIRES_REVIEW (엔지니어 확인 버튼 클릭 필요)
 *   < 80%  → MANUAL_REQUIRED (수동 입력 유도)
 */
export enum AiDetectionMethod {
  MASK_RCNN = 'MASK_RCNN',         // Mask R-CNN 인스턴스 세그멘테이션
  Y_MASKNET = 'Y_MASKNET',         // Y-MaskNet (드론 비전 AI, 균열 정밀진단)
  OPENCV_WASM = 'OPENCV_WASM',     // OpenCV.js WASM (특허 10-2398241 구현)
  RESIDENT_PHOTO = 'RESIDENT_PHOTO', // 거주자 참여형 비접촉 진단 (앱 촬영)
  MANUAL = 'MANUAL',               // 엔지니어 수동 입력
}

/**
 * AI 신뢰도 등급 (AX-SPRINT 4단계: AI Confidence Score)
 */
export enum AiConfidenceLevel {
  AUTO_ACCEPT = 'AUTO_ACCEPT',       // ≥ 90% — 자동 확정 입력
  REQUIRES_REVIEW = 'REQUIRES_REVIEW', // 80~89% — 엔지니어 확인 필요
  MANUAL_REQUIRED = 'MANUAL_REQUIRED', // < 80% — 수동 입력 유도
}

/**
 * RPA 자동화 작업 유형 (AX-SPRINT — 지능형 행정자동화)
 * - 관리비 고지서 생성: 80% 자동화
 * - 계약 만료 알림:     100% 자동화
 * - 민원 접수·분류:     70% 자동화
 * - 점검 일정 생성:     90% 자동화
 */
export enum RpaTaskType {
  BILL_GENERATION = 'BILL_GENERATION',         // 관리비 고지서 자동 생성 (80%)
  CONTRACT_EXPIRY_NOTICE = 'CONTRACT_EXPIRY_NOTICE', // 계약 만료 알림 발송 (100%)
  COMPLAINT_INTAKE = 'COMPLAINT_INTAKE',       // 민원 접수·AI 자동 분류 (70%)
  INSPECTION_SCHEDULE = 'INSPECTION_SCHEDULE', // 정기 점검 일정 자동 생성 (90%)
  REPORT_SUBMISSION = 'REPORT_SUBMISSION',     // 안전관리계획 법정 보고 자동 제출
  MILEAGE_GRANT = 'MILEAGE_GRANT',            // 클린하우스 마일리지 지급
}

export enum RpaTaskStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

export enum AlertType {
  CRACK_THRESHOLD = 'CRACK_THRESHOLD',         // 균열 임계치 초과
  INSPECTION_OVERDUE = 'INSPECTION_OVERDUE',   // 점검 미수행
  CONTRACT_EXPIRY = 'CONTRACT_EXPIRY',         // 계약 만료 임박
  DEFECT_CRITICAL = 'DEFECT_CRITICAL',         // 긴급 결함 등록
  COMPLAINT_OVERDUE = 'COMPLAINT_OVERDUE',     // 민원 처리 지연
  DRONE_DEFECT = 'DRONE_DEFECT',               // 드론 AI 결함 자동 탐지
  RPA_FAILURE = 'RPA_FAILURE',                 // RPA 자동화 실패
  AUTOMATION_FAILURE = 'AUTOMATION_FAILURE',   // 자동화 룰 실행 실패
  IOT_THRESHOLD = 'IOT_THRESHOLD',             // Phase 2-8: IoT 센서 임계치 초과
}

// ── Phase 2-9: 예지정비 & 장기수선 의사결정 열거형 ─────────────────────

/** 위험도 등급 */
export enum RiskLevel {
  LOW      = 'LOW',       // 0~25  — 관찰
  MEDIUM   = 'MEDIUM',    // 26~50 — 계획 유지보수 필요
  HIGH     = 'HIGH',      // 51~75 — 단기 조치 필요
  CRITICAL = 'CRITICAL',  // 76~100 — 즉시 조치
}

/** 권장 유지보수 유형 */
export enum MaintenanceType {
  IMMEDIATE_REPAIR      = 'IMMEDIATE_REPAIR',      // 즉시 보수 (1개월 이내)
  SHORT_TERM_REPAIR     = 'SHORT_TERM_REPAIR',     // 단기 보수 (3~6개월)
  SCHEDULED_MAINTENANCE = 'SCHEDULED_MAINTENANCE', // 계획 유지보수 (6~12개월)
  ROUTINE_INSPECTION    = 'ROUTINE_INSPECTION',    // 일상 점검 (12개월 이내)
  REPLACEMENT           = 'REPLACEMENT',           // 교체 (장기수선)
}

/** 예지정비 추천 상태 */
export enum RecommendationStatus {
  PENDING    = 'PENDING',     // 검토 대기
  APPROVED   = 'APPROVED',    // 승인됨
  IN_PROGRESS= 'IN_PROGRESS', // 진행 중
  COMPLETED  = 'COMPLETED',   // 완료
  DEFERRED   = 'DEFERRED',    // 연기
  REJECTED   = 'REJECTED',    // 반려
}

/** 리스크 계산 대상 유형 */
export enum RiskTargetType {
  ASSET    = 'ASSET',    // 시설물 자산
  ZONE     = 'ZONE',     // 구역
  BUILDING = 'BUILDING', // 건물
  COMPLEX  = 'COMPLEX',  // 단지 전체
}

// ── Phase 2-8: IoT 센서 연동 열거형 ────────────────────────────────────

/** IoT 센서 유형 */
export enum SensorType {
  TEMPERATURE  = 'TEMPERATURE',   // 온도 (°C)
  HUMIDITY     = 'HUMIDITY',      // 습도 (%)
  VIBRATION    = 'VIBRATION',     // 진동 (mm/s)
  LEAK         = 'LEAK',          // 누수 감지 (0=정상, 1=감지)
  POWER        = 'POWER',         // 전력 사용량 (kW)
  CO2          = 'CO2',           // 이산화탄소 농도 (ppm)
  PRESSURE     = 'PRESSURE',      // 압력 (kPa)
  WATER_LEVEL  = 'WATER_LEVEL',   // 수위 (%)
}

/** IoT 센서 운영 상태 */
export enum SensorStatus {
  ACTIVE      = 'ACTIVE',       // 정상 운영
  INACTIVE    = 'INACTIVE',     // 비활성 (수동 중지)
  ERROR       = 'ERROR',        // 오류 (통신 두절 등)
  MAINTENANCE = 'MAINTENANCE',  // 점검 중
}

/** 센서 측정값 품질 등급 */
export enum SensorReadingQuality {
  GOOD = 'GOOD',   // 정상 수신
  FAIR = 'FAIR',   // 약한 신호 / 추정값 포함
  POOR = 'POOR',   // 신뢰도 낮음 (센서 오류 의심)
}

// ── Phase 2-7: RPA/업무 자동화 엔진 열거형 ───────────────────────────────

/** 자동화 룰 트리거 유형 */
export enum AutomationTriggerType {
  DATE_BASED    = 'DATE_BASED',    // 날짜/시간 기반 (cron)
  STATUS_CHANGE = 'STATUS_CHANGE', // 상태 변경 이벤트 기반
  THRESHOLD     = 'THRESHOLD',     // 측정값 임계치 초과 기반
  MANUAL        = 'MANUAL',        // 수동 트리거
}

/** 자동화 룰 액션 유형 */
export enum AutomationActionType {
  SEND_NOTIFICATION = 'SEND_NOTIFICATION', // 알림 발송 (in-app / email / SMS)
  CREATE_ALERT      = 'CREATE_ALERT',      // 경보 문서 생성
  CREATE_SCHEDULE   = 'CREATE_SCHEDULE',   // 점검 일정 문서 생성
  CREATE_WORK_ORDER = 'CREATE_WORK_ORDER', // 작업지시 생성
  UPDATE_STATUS     = 'UPDATE_STATUS',     // 대상 문서 상태 변경
}

/** 알림 채널 */
export enum NotificationChannel {
  IN_APP = 'IN_APP', // 인앱 알림 (즉시)
  EMAIL  = 'EMAIL',  // 이메일 (mock)
  SMS    = 'SMS',    // 문자 (mock)
}

/** 자동화 룰 카테고리 */
export enum AutomationRuleCategory {
  CONTRACT    = 'CONTRACT',    // 계약 관련
  INSPECTION  = 'INSPECTION',  // 점검 관련
  COMPLAINT   = 'COMPLAINT',   // 민원 관련
  DEFECT      = 'DEFECT',      // 결함 관련
  MAINTENANCE = 'MAINTENANCE', // 유지관리
}

/** 자동화 실행 상태 */
export enum AutomationExecutionStatus {
  RUNNING   = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED    = 'FAILED',
  SKIPPED   = 'SKIPPED',
}
