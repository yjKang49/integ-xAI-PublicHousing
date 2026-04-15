"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMPLAINT_STATUS_STEPS = exports.COMPLAINT_PRIORITY_COLORS = exports.COMPLAINT_PRIORITY_LABELS = exports.COMPLAINT_STATUS_LABELS = exports.COMPLAINT_TYPE_LABELS = void 0;
// packages/shared/src/domain/complaint.ts
const enums_1 = require("../types/enums");
exports.COMPLAINT_TYPE_LABELS = {
    LEAK: '누수',
    CRACK: '균열',
    NOISE: '소음',
    EXTERIOR_DAMAGE: '외벽 손상',
    COMMON_AREA: '공용부 파손',
    FACILITY: '시설물 결함',
    SANITATION: '위생',
    SAFETY: '안전',
    PARKING: '주차',
    ELEVATOR: '엘리베이터',
    OTHER: '기타',
};
exports.COMPLAINT_STATUS_LABELS = {
    OPEN: '접수',
    RECEIVED: '접수',
    TRIAGED: '검토완료',
    ASSIGNED: '담당자배정',
    IN_PROGRESS: '처리중',
    RESOLVED: '처리완료',
    CLOSED: '종결',
};
exports.COMPLAINT_PRIORITY_LABELS = {
    LOW: '낮음',
    MEDIUM: '보통',
    HIGH: '높음',
    URGENT: '긴급',
};
exports.COMPLAINT_PRIORITY_COLORS = {
    LOW: '#4caf50',
    MEDIUM: '#2196f3',
    HIGH: '#ff9800',
    URGENT: '#f44336',
};
/** Ordered status steps for timeline/stepper display */
exports.COMPLAINT_STATUS_STEPS = [
    enums_1.ComplaintStatus.OPEN,
    enums_1.ComplaintStatus.TRIAGED,
    enums_1.ComplaintStatus.ASSIGNED,
    enums_1.ComplaintStatus.IN_PROGRESS,
    enums_1.ComplaintStatus.RESOLVED,
    enums_1.ComplaintStatus.CLOSED,
];
//# sourceMappingURL=complaint.js.map