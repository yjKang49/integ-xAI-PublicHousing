import { ReportType } from '../types/enums';
export interface GenerateReportInput {
    /** 보고서 제목 (미입력 시 자동 생성) */
    title?: string;
    reportType: ReportType;
    complexId: string;
    projectId?: string;
    sessionId?: string;
    /** 보고서 조회 기간 */
    dateFrom?: string;
    dateTo?: string;
    /** 공개 여부 (VIEWER 역할도 열람 가능) */
    isPublic?: boolean;
    /** 추가 파라미터 */
    parameters?: {
        includePhotos?: boolean;
        includeCrackTrend?: boolean;
        locale?: 'ko' | 'en';
        pageSize?: 'A4' | 'A3' | 'LETTER';
        notes?: string;
        [key: string]: unknown;
    };
}
/**
 * 사진대지(Photo Sheet) 생성 입력
 */
export interface GeneratePhotoSheetInput {
    complexId: string;
    projectId?: string;
    sessionId?: string;
    /** 포함할 결함 ID 목록 (미지정 시 전체) */
    defectIds?: string[];
    /** 페이지당 사진 수 (2 | 4 | 6) */
    photosPerPage?: 2 | 4 | 6;
    title?: string;
    isPublic?: boolean;
}
/**
 * 보고서 상태 (Bull 큐 기반 비동기 처리)
 */
export type ReportStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
/**
 * 보고서 생성 응답
 */
export interface GenerateReportResponse {
    reportId: string;
    status: 'QUEUED';
    estimatedCompletionSeconds?: number;
}
/**
 * 보고서 다운로드 URL 응답
 */
export interface ReportDownloadUrlResponse {
    url: string;
    expiresAt: string;
    fileName: string;
}
/**
 * 보고서 유형 레이블 (한국어)
 */
export declare const REPORT_TYPE_LABELS: Record<ReportType, string>;
