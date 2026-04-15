// packages/shared/src/index.ts
export * from './types/enums';
export * from './types/couch';
export * from './types/entities';
export * from './types/api';
export * from './auth/auth-user';
// domain/ re-exports entities with Input types — use these in frontend forms
export * from './domain/organization';
export * from './domain/housing-complex';
export * from './domain/building';
export * from './domain/floor';
export * from './domain/zone';
export * from './domain/defect';
export * from './domain/defect-media';
export * from './domain/defect-marker-3d';
export * from './domain/complaint';
export * from './domain/work-order';
// Crack monitoring domain types
export * from './domain/crack-gauge-point';
export * from './domain/crack-measurement';
export * from './domain/alert';
// Reports & KPI domain types
export * from './domain/report';
export * from './domain/kpi-record';
// AX-SPRINT 도메인 타입
export * from './domain/rpa-task';
// Note: auth/role.ts re-exports UserRole — already exported from types/enums above.
// Phase 2: async job infrastructure & feature flags
export * from './jobs'
export * from './feature-flags'
// Phase 2: drone media pipeline domain types
export * from './domain/drone-mission'
export * from './domain/media-frame'
export * from './domain/media-analysis-job'
// Phase 2: AI 결함 탐지 파이프라인 도메인 타입
export * from './domain/defect-candidate'
export * from './ai/vision-detection-result'
// Phase 2: 균열 심층 분석 파이프라인 도메인 타입
export * from './cv/crack-analysis-types'
export * from './domain/crack-analysis-result'
// Phase 2: AI 진단 의견 파이프라인 도메인 타입
export * from './domain/diagnosis-opinion'
export * from './domain/repair-recommendation'
// Phase 2-6: 민원 AI 트리아지 도메인 타입
export * from './domain/complaint-triage'
// Phase 2-7: RPA/업무 자동화 엔진 도메인 타입
export * from './domain/automation-rule'
export * from './domain/automation-execution'
// Phase 2-8: IoT 센서 연동 도메인 타입
export * from './domain/sensor-device'
export * from './domain/sensor-reading'
// Phase 2-9: 예지정비 & 장기수선 의사결정 도메인 타입
export * from './domain/risk-score'
export * from './domain/maintenance-recommendation'
