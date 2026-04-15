// apps/api/src/modules/ai-inspection/ai-inspection.service.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  AiDetectionMethod,
  AiConfidenceLevel,
  DefectType,
  SeverityLevel,
} from '@ax/shared';

/** 단일 AI 탐지 결과 */
export interface AiDetectionResult {
  /** 탐지된 결함 유형 */
  defectType: DefectType;
  /** 신뢰도 점수 0.0~1.0 */
  confidence: number;
  /** 신뢰도 등급 */
  confidenceLevel: AiConfidenceLevel;
  /** 탐지 방법 */
  method: AiDetectionMethod;
  /** KCS 전문용어 자동 캡션 (5단계) */
  aiCaption: string;
  /** KCS 기준 참조 코드 (6단계) */
  kcsStandardRef?: string;
  /** KCS 허용 기준 초과 여부 (6단계) */
  kcsExceedsLimit: boolean;
  /** AI 자동 확정 여부 (4단계: ≥90% 자동 입력) */
  isAutoAccepted: boolean;
  /** 권장 심각도 (7단계: 위험 등급 자동 분류) */
  suggestedSeverity: SeverityLevel;
  /** 균열 폭 추정값 mm (Y-MaskNet 탐지 시) */
  estimatedWidthMm?: number;
  /** 바운딩 박스 [x, y, w, h] normalized */
  boundingBox?: [number, number, number, number];
}

/** 이미지 분석 요청 */
export interface AnalyzeImageRequest {
  /** S3 이미지 키 또는 Base64 데이터 */
  imageKey: string;
  /** 탐지 방법 선택 */
  method: AiDetectionMethod;
  /** 건물 ID (위치 자동매핑 — 1단계) */
  buildingId?: string;
  /** 층 ID */
  floorId?: string;
}

@Injectable()
export class AiInspectionService {
  private readonly logger = new Logger(AiInspectionService.name);

  /**
   * 3단계: 실시간 결함 탐지 (Y-MaskNet / Mask R-CNN)
   * AX-SPRINT 사업계획서 기준: 0.2~0.5mm 균열 해상도
   */
  async detectDefects(request: AnalyzeImageRequest): Promise<AiDetectionResult[]> {
    this.logger.log(`AI 결함 탐지 시작: method=${request.method}, building=${request.buildingId}`);
    // TODO: Phase 2 — FastAPI AI 마이크로서비스 호출 (Y-MaskNet / Mask R-CNN)
    // 현재: OpenCV.js WASM 결과를 서버에서 수신하여 신뢰도 분류만 수행
    return [];
  }

  /**
   * 4단계: AI 신뢰도 등급 분류
   *   ≥ 0.90 → AUTO_ACCEPT   (자동 확정 입력)
   *   0.80~0.89 → REQUIRES_REVIEW (엔지니어 확인 필요)
   *   < 0.80 → MANUAL_REQUIRED   (수동 입력 유도)
   */
  classifyConfidence(score: number): AiConfidenceLevel {
    if (score >= 0.90) return AiConfidenceLevel.AUTO_ACCEPT;
    if (score >= 0.80) return AiConfidenceLevel.REQUIRES_REVIEW;
    return AiConfidenceLevel.MANUAL_REQUIRED;
  }

  /**
   * 5단계: KCS 전문용어 기반 자동 캡셔닝
   * 예: "RC 슬래브 하면 0.3mm 건조수축 균열 발생"
   */
  generateAiCaption(defectType: DefectType, widthMm?: number, location?: string): string {
    const widthStr = widthMm != null ? `${widthMm}mm ` : '';
    const loc = location ?? '해당 부위';
    const captions: Partial<Record<DefectType, string>> = {
      [DefectType.CRACK]:         `${loc} ${widthStr}균열 발생 — 건조수축 또는 구조적 원인 검토 필요`,
      [DefectType.LEAK]:          `${loc} 누수 흔적 — 방수층 손상 또는 배관 결함 의심`,
      [DefectType.SPALLING]:      `${loc} 콘크리트 박리·박락 — 철근부식 또는 동결융해 손상`,
      [DefectType.CORROSION]:     `${loc} 철근 부식 발생 — 탄산화 또는 염해 원인 조사 필요`,
      [DefectType.EFFLORESCENCE]: `${loc} 백태 발생 — 수분 침투 및 염분 석출`,
      [DefectType.DEFORMATION]:   `${loc} 구조 변형 발생 — 하중 초과 또는 기초 침하 검토`,
      [DefectType.SETTLEMENT]:    `${loc} 침하 발생 — 기초 지반 조사 필요`,
      [DefectType.OTHER]:         `${loc} 결함 발생 — 전문가 현장 확인 필요`,
    };
    return captions[defectType] ?? `${loc} 결함 발생`;
  }

  /**
   * 6단계: KCS 기준 대조 — 허용 기준 초과 여부 자동 판정
   * 균열폭 기준: KCS 14 20 10 — 0.3mm 초과 시 보수 필요
   */
  checkKcsCompliance(defectType: DefectType, widthMm?: number): {
    kcsStandardRef: string;
    kcsExceedsLimit: boolean;
  } {
    if (defectType === DefectType.CRACK && widthMm != null) {
      return {
        kcsStandardRef: 'KCS 14 20 10',
        kcsExceedsLimit: widthMm > 0.3,
      };
    }
    return { kcsStandardRef: '', kcsExceedsLimit: false };
  }

  /**
   * 7단계: 위험 등급 자동 분류 (국토관리청 기준)
   */
  suggestSeverity(defectType: DefectType, confidence: number, widthMm?: number): SeverityLevel {
    if (defectType === DefectType.CRACK && widthMm != null) {
      if (widthMm >= 1.0) return SeverityLevel.CRITICAL;
      if (widthMm >= 0.5) return SeverityLevel.HIGH;
      if (widthMm >= 0.3) return SeverityLevel.MEDIUM;
      return SeverityLevel.LOW;
    }
    if ([DefectType.SETTLEMENT, DefectType.DEFORMATION].includes(defectType)) {
      return SeverityLevel.HIGH;
    }
    if (confidence >= 0.9) return SeverityLevel.MEDIUM;
    return SeverityLevel.LOW;
  }

  /**
   * 9단계: 피드백 학습 — 엔지니어 오분류 수정 기록
   * Phase 2에서 강화학습 모델에 반영
   */
  async recordFeedback(params: {
    defectId: string;
    originalPrediction: DefectType;
    correctedValue: DefectType;
    engineerId: string;
  }): Promise<void> {
    this.logger.log(
      `[AI 피드백] defect=${params.defectId}: ${params.originalPrediction} → ${params.correctedValue} (by ${params.engineerId})`,
    );
    // TODO: Phase 2 — FastAPI 강화학습 서비스로 피드백 전송
  }
}
