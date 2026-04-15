// apps/admin-web/src/app/shared/components/index.ts
// 공통 컴포넌트 단일 진입점
export { PageHeaderComponent } from './page-header/page-header.component';
export { StatusBadgeComponent, severityToVariant, statusToVariant } from './status-badge/status-badge.component';
export type { BadgeVariant, BadgeSize } from './status-badge/status-badge.component';
export { EmptyStateComponent } from './empty-state/empty-state.component';
export type { EmptyStateType } from './empty-state/empty-state.component';
export { SkeletonComponent } from './skeleton/skeleton.component';
export type { SkeletonType } from './skeleton/skeleton.component';
export { AiConfidenceChipComponent } from './ai-confidence-chip/ai-confidence-chip.component';
