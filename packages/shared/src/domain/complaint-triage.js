"use strict";
// packages/shared/src/domain/complaint-triage.ts
// 민원 AI 자동 분류(Triage) 도메인 — Phase 2 여섯 번째 기능
// 설계 원칙:
//   - AI는 추천까지만 수행, 최종 확정은 담당자(human-in-the-loop)
//   - AI 미응답 시 rule-based fallback 자동 적용
//   - 기존 Complaint 상태 머신은 변경하지 않음
Object.defineProperty(exports, "__esModule", { value: true });
exports.CATEGORY_DEFAULT_SLA = exports.TRIAGE_DECISION_LABELS = exports.TRIAGE_STATUS_LABELS = exports.RoutingSuggestionType = exports.TriageDecisionStatus = exports.ComplaintTriageStatus = void 0;
// ── 열거형 ──────────────────────────────────────────────────────────────────
/** 민원 트리아지 처리 상태 */
var ComplaintTriageStatus;
(function (ComplaintTriageStatus) {
    ComplaintTriageStatus["PENDING"] = "PENDING";
    ComplaintTriageStatus["PROCESSING"] = "PROCESSING";
    ComplaintTriageStatus["COMPLETED"] = "COMPLETED";
    ComplaintTriageStatus["FAILED"] = "FAILED";
})(ComplaintTriageStatus || (exports.ComplaintTriageStatus = ComplaintTriageStatus = {}));
/** 담당자의 검토 결정 상태 (Human-in-the-loop) */
var TriageDecisionStatus;
(function (TriageDecisionStatus) {
    TriageDecisionStatus["PENDING_REVIEW"] = "PENDING_REVIEW";
    TriageDecisionStatus["ACCEPTED"] = "ACCEPTED";
    TriageDecisionStatus["MODIFIED"] = "MODIFIED";
    TriageDecisionStatus["REJECTED"] = "REJECTED";
})(TriageDecisionStatus || (exports.TriageDecisionStatus = TriageDecisionStatus = {}));
/** 추천 라우팅 대상 유형 */
var RoutingSuggestionType;
(function (RoutingSuggestionType) {
    RoutingSuggestionType["USER"] = "USER";
    RoutingSuggestionType["TEAM"] = "TEAM";
})(RoutingSuggestionType || (exports.RoutingSuggestionType = RoutingSuggestionType = {}));
// ── 레이블 맵 ────────────────────────────────────────────────────────────────
exports.TRIAGE_STATUS_LABELS = {
    [ComplaintTriageStatus.PENDING]: '대기',
    [ComplaintTriageStatus.PROCESSING]: '분석중',
    [ComplaintTriageStatus.COMPLETED]: '완료',
    [ComplaintTriageStatus.FAILED]: '실패',
};
exports.TRIAGE_DECISION_LABELS = {
    [TriageDecisionStatus.PENDING_REVIEW]: '검토대기',
    [TriageDecisionStatus.ACCEPTED]: '수락',
    [TriageDecisionStatus.MODIFIED]: '수정확정',
    [TriageDecisionStatus.REJECTED]: '기각',
};
/** 카테고리별 기본 SLA */
exports.CATEGORY_DEFAULT_SLA = {
    SAFETY: '24h', // 안전: 24시간
    ELEVATOR: '24h', // 엘리베이터: 24시간
    FACILITY: '72h', // 시설물: 72시간
    LEAK: '48h', // 누수: 48시간
    NOISE: '72h', // 소음: 72시간
    SANITATION: '48h', // 위생: 48시간
    PARKING: '7d', // 주차: 7일
    OTHER: '7d', // 기타: 7일
};
//# sourceMappingURL=complaint-triage.js.map