// apps/api/src/modules/crack-analysis/dto/crack-analysis.dto.ts
import {
  IsString, IsNumber, IsOptional, IsEnum, IsBoolean,
  Min, Max, ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  CrackAnalysisStatus, CrackAnalysisReviewStatus,
} from '@ax/shared'

// ── 분석 트리거 DTO ──────────────────────────────────────────────────────────

export class CrackRoiDto {
  @ApiProperty({ description: '좌측 상단 x (0~1 비율)' })
  @IsNumber() @Min(0) @Max(1)
  x: number

  @ApiProperty({ description: '좌측 상단 y (0~1 비율)' })
  @IsNumber() @Min(0) @Max(1)
  y: number

  @ApiProperty({ description: '너비 (0~1 비율)' })
  @IsNumber() @Min(0) @Max(1)
  w: number

  @ApiProperty({ description: '높이 (0~1 비율)' })
  @IsNumber() @Min(0) @Max(1)
  h: number
}

export class TriggerCrackAnalysisDto {
  @ApiProperty({ description: '균열 게이지 포인트 ID' })
  @IsString()
  gaugePointId: string

  @ApiProperty({ description: '단지 ID' })
  @IsString()
  complexId: string

  @ApiProperty({ description: '원본 이미지 S3 키' })
  @IsString()
  capturedImageKey: string

  @ApiPropertyOptional({ description: '연결된 CrackMeasurement ID' })
  @IsOptional() @IsString()
  measurementId?: string

  @ApiPropertyOptional({ type: CrackRoiDto, description: 'ROI (없으면 전체 이미지)' })
  @IsOptional() @ValidateNested() @Type(() => CrackRoiDto)
  roi?: CrackRoiDto

  @ApiProperty({ description: '눈금 1칸 mm (캘리브레이션)' })
  @IsNumber() @Min(0.001)
  mmPerGraduation: number

  @ApiPropertyOptional({ description: '수동 px/mm 비율 (자동 검출 실패 폴백)' })
  @IsOptional() @IsNumber() @Min(0.001)
  manualPxPerMm?: number

  @ApiPropertyOptional({ enum: ['OPENCV_WASM', 'MOCK'], default: 'MOCK' })
  @IsOptional() @IsEnum(['OPENCV_WASM', 'MOCK'])
  model?: 'OPENCV_WASM' | 'MOCK'

  @ApiPropertyOptional({ description: '세그멘테이션 마스크 추출', default: false })
  @IsOptional() @IsBoolean()
  extractMask?: boolean

  @ApiPropertyOptional({ description: '골격선 추출', default: false })
  @IsOptional() @IsBoolean()
  extractSkeleton?: boolean

  @ApiPropertyOptional({ description: '폭 샘플링 수', default: 5 })
  @IsOptional() @IsNumber() @Min(1) @Max(20)
  widthSampleCount?: number
}

// ── 검토 DTO ─────────────────────────────────────────────────────────────────

export class ManualCorrectionDto {
  @ApiProperty({ description: '수정된 균열 폭 (mm)' })
  @IsNumber() @Min(0)
  correctedWidthMm: number

  @ApiPropertyOptional({ description: '수정된 균열 길이 (mm)' })
  @IsOptional() @IsNumber() @Min(0)
  correctedLengthMm?: number

  @ApiPropertyOptional({ description: '보정 사유' })
  @IsOptional() @IsString()
  correctionNote?: string
}

export class ReviewCrackAnalysisDto {
  @ApiProperty({ enum: ['ACCEPTED', 'CORRECTED', 'REJECTED'] })
  @IsEnum(['ACCEPTED', 'CORRECTED', 'REJECTED'])
  reviewStatus: 'ACCEPTED' | 'CORRECTED' | 'REJECTED'

  @ApiPropertyOptional({ description: '검토 메모' })
  @IsOptional() @IsString()
  reviewNote?: string

  @ApiPropertyOptional({ type: ManualCorrectionDto })
  @IsOptional() @ValidateNested() @Type(() => ManualCorrectionDto)
  manualCorrection?: ManualCorrectionDto
}

// ── 쿼리 DTO ─────────────────────────────────────────────────────────────────

export class CrackAnalysisQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() gaugePointId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() complexId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() measurementId?: string
  @ApiPropertyOptional({ enum: CrackAnalysisStatus }) @IsOptional() @IsEnum(CrackAnalysisStatus) analysisStatus?: CrackAnalysisStatus
  @ApiPropertyOptional({ enum: CrackAnalysisReviewStatus }) @IsOptional() @IsEnum(CrackAnalysisReviewStatus) reviewStatus?: CrackAnalysisReviewStatus
  @ApiPropertyOptional({ type: Number }) @IsOptional() page?: number
  @ApiPropertyOptional({ type: Number }) @IsOptional() limit?: number
}

// ── 워커 내부 결과 저장 DTO ────────────────────────────────────────────────────

export class SaveCrackAnalysisResultDto {
  @IsString()
  analysisId: string

  @IsString()
  orgId: string

  @IsEnum(CrackAnalysisStatus)
  analysisStatus: CrackAnalysisStatus

  @IsNumber() @Min(0) @Max(1)
  confidence: number

  @IsNumber() @Min(0)
  finalWidthMm: number

  @IsOptional() @IsNumber() @Min(0)
  finalLengthMm?: number

  @IsString()
  modelVersion: string

  @IsNumber() @Min(0)
  processingTimeMs: number

  @IsOptional() @IsString()
  failureReason?: string
}
