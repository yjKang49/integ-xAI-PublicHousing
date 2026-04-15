// apps/api/src/modules/defect-candidates/dto/defect-candidate.dto.ts
import {
  IsString, IsNumber, IsOptional, IsEnum,
  IsBoolean, IsArray, Min, Max, ArrayMinSize, ArrayMaxSize,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  CandidateDefectType, CandidateSourceType, CandidateReviewStatus,
} from '@ax/shared'

export class ReviewCandidateDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsEnum(['APPROVED', 'REJECTED'])
  reviewStatus: 'APPROVED' | 'REJECTED'

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reviewNote?: string
}

export class PromoteCandidateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defectType?: string

  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] })
  @IsOptional()
  @IsString()
  severity?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locationDescription?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sessionId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string
}

export class CandidateQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() complexId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() buildingId?: string
  @ApiPropertyOptional({ enum: CandidateSourceType }) @IsOptional() @IsEnum(CandidateSourceType) sourceType?: CandidateSourceType
  @ApiPropertyOptional() @IsOptional() @IsString() sourceMissionId?: string
  @ApiPropertyOptional({ enum: CandidateDefectType }) @IsOptional() @IsEnum(CandidateDefectType) defectType?: CandidateDefectType
  @ApiPropertyOptional({ enum: CandidateReviewStatus }) @IsOptional() @IsEnum(CandidateReviewStatus) reviewStatus?: CandidateReviewStatus
  @ApiPropertyOptional({ enum: ['AUTO_ACCEPT', 'REQUIRES_REVIEW', 'MANUAL_REQUIRED'] })
  @IsOptional() @IsEnum(['AUTO_ACCEPT', 'REQUIRES_REVIEW', 'MANUAL_REQUIRED']) confidenceLevel?: 'AUTO_ACCEPT' | 'REQUIRES_REVIEW' | 'MANUAL_REQUIRED'
  @ApiPropertyOptional({ type: Number }) @IsOptional() page?: number
  @ApiPropertyOptional({ type: Number }) @IsOptional() limit?: number
}

// ── 워커 내부 배치 생성 DTO ────────────────────────────────────────────────────

export class BatchDetectionItemDto {
  @IsEnum(CandidateDefectType)
  defectType: CandidateDefectType

  @IsNumber() @Min(0) @Max(1)
  confidence: number

  @IsArray() @ArrayMinSize(4) @ArrayMaxSize(4)
  bbox: [number, number, number, number]

  @IsOptional() @IsString()
  suggestedSeverity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

  @IsOptional() @IsString()
  aiCaption?: string

  @IsOptional() @IsString()
  kcsStandardRef?: string

  @IsOptional() @IsBoolean()
  kcsExceedsLimit?: boolean
}

export class BatchCreateCandidatesDto {
  @IsString()
  jobDocId: string

  @IsString()
  orgId: string

  @IsString()
  complexId: string

  @IsOptional() @IsString()
  buildingId?: string

  @IsEnum(CandidateSourceType)
  sourceType: CandidateSourceType

  @IsString()
  sourceMediaId: string

  @IsOptional() @IsString()
  sourceMissionId?: string

  @IsOptional() @IsString()
  sourceFrameId?: string

  @IsString()
  storageKey: string

  @IsArray()
  detections: BatchDetectionItemDto[]

  @IsString()
  modelVersion: string

  @IsString()
  detectionMethod: string
}
