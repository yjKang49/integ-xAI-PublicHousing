// packages/shared/src/domain/defect.ts
export { Defect } from '../types/entities';
export { DefectType, SeverityLevel } from '../types/enums';

/** Request body for POST /api/v1/defects (online path) */
export interface CreateDefectInput {
  sessionId: string;
  projectId: string;
  complexId: string;
  buildingId: string;
  floorId?: string;
  zoneId?: string;
  assetId?: string;

  defectType: string;      // DefectType enum value
  severity: string;        // SeverityLevel enum value

  description: string;     // max 1000 chars
  locationDescription: string; // max 500 chars

  widthMm?: number;
  lengthMm?: number;
  depthMm?: number;
  areaSqm?: number;

  photo2DCoords?: { x: number; y: number };
  mediaIds?: string[];     // DefectMedia._id list

  // ── AX-SPRINT: AI 진단 필드 ───────────────────────────────────────
  /** AI 탐지 방법 (AX-SPRINT 3단계: 실시간 결함 탐지) */
  aiDetectionMethod?: string;   // AiDetectionMethod enum value
  /** AI 신뢰도 점수 0.0~1.0 (AX-SPRINT 4단계: AI Confidence Score)
   *  ≥ 0.9 → AUTO_ACCEPT, 0.8~0.89 → REQUIRES_REVIEW, < 0.8 → MANUAL_REQUIRED */
  aiConfidence?: number;
  /** AI 자동 캡셔닝 — KCS 전문용어 기반 (AX-SPRINT 5단계)
   *  예: "RC 슬래브 하면 0.3mm 건조수축 균열 발생" */
  aiCaption?: string;
  /** KCS 기준 참조 코드 (AX-SPRINT 6단계: 법적 기준 즉시 대조)
   *  예: "KCS 14 20 10" */
  kcsStandardRef?: string;
  /** KCS 허용 기준 초과 여부 (true = 보수 필요) */
  kcsExceedsLimit?: boolean;
  /** AI 자동 확정 여부 (신뢰도 ≥ 90%로 자동 입력된 결함) */
  isAiAutoAccepted?: boolean;
  /** 드론 촬영 탐지 여부 (Y-MaskNet / Mask R-CNN) */
  isDroneDetected?: boolean;
}

/** Request body for PATCH /api/v1/defects/:id */
export interface UpdateDefectInput {
  defectType?: string;
  severity?: string;
  description?: string;
  locationDescription?: string;
  widthMm?: number;
  lengthMm?: number;
  depthMm?: number;
  areaSqm?: number;
  mediaIds?: string[];
  isRepaired?: boolean;
  repairedAt?: string;
  repairNotes?: string;
}

/** Defect list query parameters */
export interface DefectListInput {
  complexId?: string;
  buildingId?: string;
  sessionId?: string;
  defectType?: string;
  severity?: string;
  isRepaired?: boolean;
  dateFrom?: string;   // ISO date string
  dateTo?: string;     // ISO date string
  page?: number;
  limit?: number;
  order?: 'asc' | 'desc';
}
