"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORK_ORDER_TRANSITIONS = exports.WORK_ORDER_STATUS_COLORS = exports.WORK_ORDER_STATUS_LABELS = void 0;
// packages/shared/src/domain/work-order.ts
const enums_1 = require("../types/enums");
exports.WORK_ORDER_STATUS_LABELS = {
    OPEN: '대기',
    IN_PROGRESS: '진행중',
    COMPLETED: '완료',
    CANCELLED: '취소',
};
exports.WORK_ORDER_STATUS_COLORS = {
    OPEN: '#2196f3',
    IN_PROGRESS: '#ff9800',
    COMPLETED: '#4caf50',
    CANCELLED: '#9e9e9e',
};
/** Transition rules: which statuses can transition to which */
exports.WORK_ORDER_TRANSITIONS = {
    OPEN: [enums_1.WorkOrderStatus.IN_PROGRESS, enums_1.WorkOrderStatus.CANCELLED],
    IN_PROGRESS: [enums_1.WorkOrderStatus.COMPLETED, enums_1.WorkOrderStatus.OPEN, enums_1.WorkOrderStatus.CANCELLED],
    COMPLETED: [],
    CANCELLED: [enums_1.WorkOrderStatus.OPEN],
};
//# sourceMappingURL=work-order.js.map