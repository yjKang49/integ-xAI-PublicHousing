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
  AI_DEFECT_DETECTION    = 'ai.defect_detection',  // 결함 후보 자동 탐지 파이프라인
  AI_CRACK_ANALYSIS      = 'ai.crack_analysis',    // 균열 심층 분석 파이프라인 (OpenCV WASM)
  AI_DIAGNOSIS_OPINION   = 'ai.diagnosis_opinion', // AI 진단 의견 생성 파이프라인 (LLM)
  AI_COMPLAINT_TRIAGE    = 'ai.complaint_triage',  // 민원 AI 자동 분류·우선순위·배정 추천
  RPA_DRY_RUN            = 'rpa.dry_run',
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
]
