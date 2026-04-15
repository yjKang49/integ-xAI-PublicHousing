"use strict";
// packages/shared/src/ai/vision-detection-result.ts
// AI Vision 추론 결과 타입 — inference adapter 계층의 출력 인터페이스
Object.defineProperty(exports, "__esModule", { value: true });
exports.KCS_THRESHOLD_DESCRIPTION = exports.KCS_REF_BY_DEFECT_TYPE = void 0;
exports.getConfidenceLevel = getConfidenceLevel;
// ── 신뢰도 등급 헬퍼 ──────────────────────────────────────────────────────────
function getConfidenceLevel(confidence) {
    if (confidence >= 0.9)
        return 'AUTO_ACCEPT';
    if (confidence >= 0.8)
        return 'REQUIRES_REVIEW';
    return 'MANUAL_REQUIRED';
}
// ── KCS 참조 매핑 ──────────────────────────────────────────────────────────────
exports.KCS_REF_BY_DEFECT_TYPE = {
    CRACK: 'KCS 41 55 02',
    LEAK: 'KCS 41 40 06',
    DELAMINATION: 'KCS 41 55 02',
    SPOILING: 'KCS 41 55 03',
    CORROSION: 'KCS 14 20 22',
    EFFLORESCENCE: 'KCS 41 55 04',
    FIRE_RISK_CLADDING: 'KCS 41 55 08',
    OTHER: '',
};
// ── 결함 유형별 KCS 임계치 기준 ────────────────────────────────────────────────
exports.KCS_THRESHOLD_DESCRIPTION = {
    CRACK: '균열폭 0.3mm 초과 시 보수 필요 (KCS 41 55 02)',
    LEAK: '외벽 누수 발생 시 즉시 조치 (KCS 41 40 06)',
    DELAMINATION: '박리 면적 0.5㎡ 초과 시 긴급 보수 (KCS 41 55 02)',
    SPOILING: '오손 면적 1㎡ 초과 시 미관 보수 (KCS 41 55 03)',
    CORROSION: '철근 노출 또는 단면 손실 발생 즉시 조치 (KCS 14 20 22)',
    EFFLORESCENCE: '반복 발생 시 누수 경로 점검 필요 (KCS 41 55 04)',
    FIRE_RISK_CLADDING: '화재위험 외장재 확인 즉시 위험관리 프로세스 가동 (KCS 41 55 08)',
    OTHER: '기타 결함 — 전문가 현장 확인 필요',
};
//# sourceMappingURL=vision-detection-result.js.map