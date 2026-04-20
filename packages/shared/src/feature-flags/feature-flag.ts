// packages/shared/src/feature-flags/feature-flag.ts

export interface FeatureFlag {
  _id: string        // 'featureFlag:_platform:{key}'
  docType: 'featureFlag'
  key: string
  enabled: boolean
  description: string
  enabledForOrgIds?: string[]   // null/empty = all orgs
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
  updatedBy: string
}

export enum FeatureFlagKey {
  PHASE2_AI              = 'phase2.ai',
  PHASE2_RPA             = 'phase2.rpa',
  PHASE2_IOT             = 'phase2.iot',
  PHASE2_DRONE           = 'phase2.drone',
  PHASE2_DIGITAL_TWIN    = 'phase2.digital_twin',
  AI_AUTO_ACCEPT         = 'ai.auto_accept',
  AI_DEFECT_DETECTION    = 'ai.defect_detection',    // 결함 후보 자동 탐지 파이프라인
  AI_CRACK_ANALYSIS      = 'ai.crack_analysis',      // 균열 심층 분석 파이프라인 (OpenCV WASM)
  AI_DIAGNOSIS_OPINION   = 'ai.diagnosis_opinion',   // AI 진단 의견 생성 파이프라인 (LLM)
  AI_COMPLAINT_TRIAGE    = 'ai.complaint_triage',    // 민원 AI 자동 분류·우선순위·배정 추천
  RPA_DRY_RUN            = 'rpa.dry_run',
  // TRL-8 보완 — 사업계획서(V8) 핵심 사양 구현 플래그
  AI_ANTIGRAVITY_ENGINE  = 'ai.antigravity_engine',  // Antigravity 오탐 보정 엔진 (FP 0건 목표)
  AI_FEM_VALIDATION      = 'ai.fem_validation',      // 세종대 비선형 FEM 교차검증 파이프라인
  AI_LIO_SLAM            = 'ai.lio_slam',            // LIO-SLAM 6-DoF 3D 점군 맵핑
  AI_VIDEO_DEIDENTIFY    = 'ai.video_deidentify',    // 드론·앱 영상 실시간 비식별화 (「개인정보보호법」)
  AI_AGING_CURVE_PREDICT = 'ai.aging_curve_predict', // KALIS-FMS 30년 이력 기반 노후화 곡선 예측
  AI_LEGAL_REPORT        = 'ai.legal_report',        // LLM/RAG 법정 안전진단 보고서 자동 생성 (KDS)
  EXTERNAL_KALIS_FMS     = 'external.kalis_fms',     // 국토안전관리원 KALIS-FMS API 연동
  EXTERNAL_SEJUMTEO      = 'external.sejumteo',      // 세움터 건축물대장 API 연동
}

/** Default flag definitions used for seeding — no DB-managed fields */
export const DEFAULT_FEATURE_FLAGS: Omit<FeatureFlag, '_id' | 'createdAt' | 'updatedAt' | 'updatedBy'>[] = [
  {
    docType: 'featureFlag',
    key: FeatureFlagKey.PHASE2_AI,
    enabled: false,
    description: 'AI 이미지·드론 분석 비동기 처리',
  },
  {
    docType: 'featureFlag',
    key: FeatureFlagKey.PHASE2_RPA,
    enabled: false,
    description: 'RPA 행정자동화 (고지서·계약·민원)',
  },
  {
    docType: 'featureFlag',
    key: FeatureFlagKey.PHASE2_IOT,
    enabled: false,
    description: 'IoT 센서 실시간 데이터 수집',
  },
  {
    docType: 'featureFlag',
    key: FeatureFlagKey.PHASE2_DRONE,
    enabled: false,
    description: '드론 영상 자동 분석 파이프라인',
  },
  {
    docType: 'featureFlag',
    key: FeatureFlagKey.PHASE2_DIGITAL_TWIN,
    enabled: false,
    description: '3D 디지털 트윈 (Three.js)',
  },
  {
    docType: 'featureFlag',
    key: FeatureFlagKey.AI_AUTO_ACCEPT,
    enabled: false,
    description: 'AI 신뢰도 ≥90% 자동 확정 입력',
  },
  {
    docType: 'featureFlag',
    key: FeatureFlagKey.AI_DEFECT_DETECTION,
    enabled: false,
    description: 'AI 결함 후보 자동 탐지 파이프라인 (Mask R-CNN / Y-MaskNet)',
  },
  {
    docType: 'featureFlag',
    key: FeatureFlagKey.AI_CRACK_ANALYSIS,
    enabled: false,
    description: '균열 심층 분석 파이프라인 (OpenCV WASM / ROI 캘리브레이션)',
  },
  {
    docType: 'featureFlag',
    key: FeatureFlagKey.AI_DIAGNOSIS_OPINION,
    enabled: false,
    description: 'AI 진단 의견 초안 자동 생성 파이프라인 (LLM — draft only, 자동 확정 금지)',
  },
  {
    docType: 'featureFlag',
    key: FeatureFlagKey.AI_COMPLAINT_TRIAGE,
    enabled: false,
    description: '민원 AI 자동 분류·우선순위·담당자 배정 추천 (초안 only — 담당자 최종 확정 필수)',
  },
  {
    docType: 'featureFlag',
    key: FeatureFlagKey.RPA_DRY_RUN,
    enabled: true,
    description: 'RPA 드라이런 모드 (실제 발송 없음)',
  },
  // TRL-8 보완 플래그
  {
    docType: 'featureFlag',
    key: FeatureFlagKey.AI_ANTIGRAVITY_ENGINE,
    enabled: false,
    description: 'Antigravity 오탐 보정 엔진 — 비정형 패턴·그림자·페인트 오탐 원천 차단 (FP 0건 목표)',
  },
  {
    docType: 'featureFlag',
    key: FeatureFlagKey.AI_FEM_VALIDATION,
    enabled: false,
    description: '세종대 비선형 FEM 교차검증 — Y-MaskNet 탐지 결과 구조해석 교차 검증 (잔류 하중 지지력)',
  },
  {
    docType: 'featureFlag',
    key: FeatureFlagKey.AI_LIO_SLAM,
    enabled: false,
    description: 'LIO-SLAM 3D Digital Twin — GPS 음영 환경 6-DoF LiDAR 융합 점군 맵핑',
  },
  {
    docType: 'featureFlag',
    key: FeatureFlagKey.AI_VIDEO_DEIDENTIFY,
    enabled: false,
    description: '드론·앱 영상 실시간 비식별화 — NPU 기반 얼굴·차량번호 가명처리 (「개인정보보호법」 대응)',
  },
  {
    docType: 'featureFlag',
    key: FeatureFlagKey.AI_AGING_CURVE_PREDICT,
    enabled: false,
    description: 'KALIS-FMS 30년 이력 기반 노후화 곡선 자율 도출 및 6개월 사전 경보 예측',
  },
  {
    docType: 'featureFlag',
    key: FeatureFlagKey.AI_LEGAL_REPORT,
    enabled: false,
    description: 'LLM/RAG 법정 안전진단 보고서 자동 생성 — KDS 부합, 법무법인 수호 자문 반영',
  },
  {
    docType: 'featureFlag',
    key: FeatureFlagKey.EXTERNAL_KALIS_FMS,
    enabled: false,
    description: '국토안전관리원 KALIS-FMS API 연동 — 시설물 30년 결함 이력 매핑',
  },
  {
    docType: 'featureFlag',
    key: FeatureFlagKey.EXTERNAL_SEJUMTEO,
    enabled: false,
    description: '세움터 건축물대장 API 연동 — 구조 형식·설계 하중·지반 정보 실시간 호출',
  },
]
