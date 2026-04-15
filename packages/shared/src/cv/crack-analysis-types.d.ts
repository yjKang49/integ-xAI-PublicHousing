/** 관심 영역 (이미지 크기 기준 0~1 비율) */
export interface CrackRoi {
    x: number;
    y: number;
    w: number;
    h: number;
}
/** 픽셀 좌표 ROI */
export interface CrackRoiPixel {
    x: number;
    y: number;
    w: number;
    h: number;
}
/** 스케일 교정 파라미터 */
export interface CrackCalibrationParams {
    /** 눈금 1칸 mm (ex. 0.1mm/눈금) */
    mmPerGraduation: number;
    /** 계산된 픽셀/mm 비율 */
    pxPerMm: number;
    /** 검출된 눈금 수 */
    graduationCount: number;
    /** 눈금 평균 간격 (px) */
    avgGraduationSpacingPx: number;
    /** 수동 보정된 캘리브레이션 여부 */
    isManualCalibration: boolean;
    /** 수동 보정 주석 */
    calibrationNote?: string;
}
/** 균열 세그멘테이션 마스크 (RLE 또는 좌표 배열) */
export interface CrackSegmentationMask {
    /** 인코딩 방식 */
    encoding: 'rle' | 'polygon' | 'bitmap';
    /** 원본 이미지 해상도 */
    imageWidth: number;
    imageHeight: number;
    /** RLE 인코딩 데이터 (선택) */
    rleData?: number[];
    /** 폴리곤 좌표 [[x1,y1],[x2,y2],...] (선택) */
    polygon?: [number, number][];
    /** 균열 영역 픽셀 수 */
    pixelCount?: number;
}
/** 균열 골격선 (중심선) */
export interface CrackSkeleton {
    /** 중심선 좌표 배열 [[x1,y1],[x2,y2],...] (이미지 좌표) */
    points: [number, number][];
    /** 중심선 총 길이 (px) */
    totalLengthPx: number;
}
/** 단일 지점 균열 폭 측정 */
export interface CrackWidthSample {
    /** 측정 위치 (중심선 기준 정규화 0~1) */
    position: number;
    /** 균열 폭 (px) */
    widthPx: number;
    /** 균열 폭 (mm) */
    widthMm: number;
}
/** OpenCV/AI CV 처리 완료 후 원시 결과 */
export interface CrackCvAnalysisRaw {
    /** 최대 균열 폭 (mm) */
    maxWidthMm: number;
    /** 평균 균열 폭 (mm) */
    avgWidthMm: number;
    /** 균열 추정 길이 (mm) */
    lengthMm: number;
    /** 최대 균열 폭 (px) */
    maxWidthPx: number;
    /** 균열 길이 (px) */
    lengthPx: number;
    /** 균열 영역 면적 (px²) */
    crackAreaPx: number;
    /** 여러 지점 폭 샘플링 */
    widthSamples: CrackWidthSample[];
    /** 균열 방향 (deg, 0=수평) */
    orientationDeg: number;
    /** 바운딩 박스 (픽셀 좌표) */
    boundingBox: CrackRoiPixel;
    /** 세그멘테이션 마스크 (선택) */
    mask?: CrackSegmentationMask;
    /** 균열 골격선 (선택) */
    skeleton?: CrackSkeleton;
}
/** 신뢰도 세부 분해 */
export interface CrackConfidenceBreakdown {
    /** 균열 윤곽 검출 여부 */
    crackDetected: boolean;
    /** 눈금 검출 여부 */
    graduationsDetected: boolean;
    /** 캘리브레이션 신뢰도 0~1 */
    calibrationConfidence: number;
    /** 윤곽 품질 0~1 (면적/형상 기반) */
    contourQuality: number;
    /** 종합 신뢰도 0~1 */
    overall: number;
}
/** 점검자가 입력한 수동 보정값 */
export interface CrackManualCorrection {
    correctedWidthMm: number;
    correctedLengthMm?: number;
    correctionNote?: string;
    correctedBy: string;
    correctedAt: string;
}
/** 서버/워커에서 CV 분석 시 사용할 옵션 */
export interface CrackAnalysisOptions {
    /** 관심 영역 (선택, 없으면 전체 이미지) */
    roi?: CrackRoi;
    /** 캘리브레이션 파라미터 */
    calibration: {
        mmPerGraduation: number;
        manualPxPerMm?: number;
    };
    /** 세그멘테이션 마스크 추출 여부 */
    extractMask?: boolean;
    /** 골격선 추출 여부 */
    extractSkeleton?: boolean;
    /** 사용할 모델 */
    model: 'OPENCV_WASM' | 'MOCK';
    /** 폭 샘플링 수 (기본 5) */
    widthSampleCount?: number;
}
/** 분석 결과 UI 요약 카드 */
export interface CrackAnalysisSummary {
    analysisId: string;
    gaugePointId: string;
    measurementId?: string;
    finalWidthMm: number;
    finalLengthMm?: number;
    confidence: number;
    reviewStatus: string;
    analysisStatus: string;
    hasManualCorrection: boolean;
    capturedAt: string;
}
