// apps/api/src/modules/diagnosis-opinions/dto/diagnosis-opinion.dto.ts
import {
  IsString, IsOptional, IsEnum, IsNumber, IsArray, Min, Max, ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  DiagnosisTargetType, DiagnosisOpinionStatus, DiagnosisUrgency,
} from '@ax/shared'

// ── 트리거 DTO ───────────────────────────────────────────────────────────────

export class TriggerDiagnosisOpinionDto {
  @ApiProperty({ enum: DiagnosisTargetType })
  @IsEnum(DiagnosisTargetType)
  targetType: DiagnosisTargetType

  @ApiProperty({ description: '주 대상 문서 ID' })
  @IsString()
  targetId: string

  @ApiProperty({ description: '단지 ID' })
  @IsString()
  complexId: string

  @ApiPropertyOptional({ description: '점검 세션 ID' })
  @IsOptional() @IsString()
  sessionId?: string

  @ApiPropertyOptional({ type: [String], description: '분석 결함 ID 목록' })
  @IsOptional() @IsArray() @IsString({ each: true })
  defectIds?: string[]

  @ApiPropertyOptional({ enum: ['MOCK', 'GPT4O_MINI', 'CLAUDE_HAIKU'], default: 'MOCK' })
  @IsOptional() @IsEnum(['MOCK', 'GPT4O_MINI', 'CLAUDE_HAIKU'])
  model?: 'MOCK' | 'GPT4O_MINI' | 'CLAUDE_HAIKU'

  @ApiPropertyOptional({ enum: ['ko', 'en'], default: 'ko' })
  @IsOptional() @IsEnum(['ko', 'en'])
  language?: 'ko' | 'en'
}

// ── 수정 DTO ─────────────────────────────────────────────────────────────────

export class UpdateDiagnosisOpinionDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString()
  summary?: string

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  technicalOpinionDraft?: string

  @ApiPropertyOptional({ enum: DiagnosisUrgency })
  @IsOptional() @IsEnum(DiagnosisUrgency)
  urgency?: DiagnosisUrgency

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional() @IsNumber() @Min(0) @Max(100)
  estimatedPriorityScore?: number
}

// ── 검토 DTO ─────────────────────────────────────────────────────────────────

export class ReviewDiagnosisOpinionDto {
  @ApiProperty({ enum: ['APPROVE', 'REJECT', 'REQUEST_REVISION'] })
  @IsEnum(['APPROVE', 'REJECT', 'REQUEST_REVISION'])
  action: 'APPROVE' | 'REJECT' | 'REQUEST_REVISION'

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  reviewNote?: string

  @ApiPropertyOptional({ type: UpdateDiagnosisOpinionDto })
  @IsOptional() @ValidateNested() @Type(() => UpdateDiagnosisOpinionDto)
  finalEdits?: UpdateDiagnosisOpinionDto
}

// ── 쿼리 DTO ─────────────────────────────────────────────────────────────────

export class DiagnosisOpinionQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() complexId?: string
  @ApiPropertyOptional({ enum: DiagnosisTargetType }) @IsOptional() @IsEnum(DiagnosisTargetType) targetType?: DiagnosisTargetType
  @ApiPropertyOptional() @IsOptional() @IsString() targetId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() sessionId?: string
  @ApiPropertyOptional({ enum: DiagnosisOpinionStatus }) @IsOptional() @IsEnum(DiagnosisOpinionStatus) status?: DiagnosisOpinionStatus
  @ApiPropertyOptional({ enum: DiagnosisUrgency }) @IsOptional() @IsEnum(DiagnosisUrgency) urgency?: DiagnosisUrgency
  @ApiPropertyOptional({ type: Number }) @IsOptional() page?: number
  @ApiPropertyOptional({ type: Number }) @IsOptional() limit?: number
}

// ── 워커 내부 결과 저장 DTO ──────────────────────────────────────────────────

export class SaveDiagnosisOpinionResultDto {
  @IsString() diagnosisId: string
  @IsString() orgId: string
  @IsEnum(DiagnosisOpinionStatus) status: DiagnosisOpinionStatus
  @IsString() summary: string
  @IsString() technicalOpinionDraft: string
  @IsEnum(DiagnosisUrgency) urgency: DiagnosisUrgency
  @IsNumber() @Min(0) @Max(100) estimatedPriorityScore: number
  @IsNumber() @Min(0) @Max(1) confidence: number
  @IsString() model: string
  @IsString() modelVersion: string
  @IsString() promptVersion: string
  @IsOptional() @IsNumber() tokensUsed?: number
  @IsNumber() @Min(0) processingTimeMs: number
  @IsOptional() @IsString() failureReason?: string
}
