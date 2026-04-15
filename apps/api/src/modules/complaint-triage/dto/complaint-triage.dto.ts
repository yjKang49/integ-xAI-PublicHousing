// apps/api/src/modules/complaint-triage/dto/complaint-triage.dto.ts
import {
  IsString, IsOptional, IsEnum, IsNumber, IsBoolean, Min, Max,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ComplaintTriageStatus, TriageDecisionStatus } from '@ax/shared'

// ── 트리거 DTO ───────────────────────────────────────────────────────────────

export class TriggerComplaintTriageDto {
  @ApiProperty({ description: '분류 대상 민원 ID' })
  @IsString()
  complaintId: string

  @ApiProperty({ description: '단지 ID' })
  @IsString()
  complexId: string

  @ApiPropertyOptional({ enum: ['MOCK', 'GPT4O_MINI', 'CLAUDE_HAIKU'], default: 'MOCK' })
  @IsOptional() @IsEnum(['MOCK', 'GPT4O_MINI', 'CLAUDE_HAIKU'])
  model?: 'MOCK' | 'GPT4O_MINI' | 'CLAUDE_HAIKU'
}

// ── 검토 DTO (Human-in-the-loop) ────────────────────────────────────────────

export class ReviewTriageDto {
  @ApiProperty({
    enum: ['ACCEPT', 'MODIFY', 'REJECT'],
    description: 'ACCEPT: AI 결과 그대로 수락 | MODIFY: 수정 후 확정 | REJECT: 기각',
  })
  @IsEnum(['ACCEPT', 'MODIFY', 'REJECT'])
  decision: 'ACCEPT' | 'MODIFY' | 'REJECT'

  @ApiPropertyOptional({ description: 'MODIFY 시 확정 카테고리' })
  @IsOptional() @IsString()
  acceptedCategory?: string

  @ApiPropertyOptional({ description: 'MODIFY 시 확정 우선순위' })
  @IsOptional() @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  acceptedPriority?: string

  @ApiPropertyOptional({ description: 'ACCEPT/MODIFY 시 최종 배정 담당자 userId' })
  @IsOptional() @IsString()
  acceptedAssigneeId?: string

  @ApiPropertyOptional({ description: '검토 메모' })
  @IsOptional() @IsString()
  reviewNote?: string
}

// ── 쿼리 DTO ─────────────────────────────────────────────────────────────────

export class ComplaintTriageQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() complexId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() complaintId?: string
  @ApiPropertyOptional({ enum: ComplaintTriageStatus }) @IsOptional() @IsEnum(ComplaintTriageStatus) status?: ComplaintTriageStatus
  @ApiPropertyOptional({ enum: TriageDecisionStatus }) @IsOptional() @IsEnum(TriageDecisionStatus) decisionStatus?: TriageDecisionStatus
  @ApiPropertyOptional({ type: Number }) @IsOptional() page?: number
  @ApiPropertyOptional({ type: Number }) @IsOptional() limit?: number
}

// ── 워커 내부 결과 저장 DTO ──────────────────────────────────────────────────

export class SaveComplaintTriageResultDto {
  @IsString() triageId: string
  @IsString() orgId: string
  @IsEnum(ComplaintTriageStatus) status: ComplaintTriageStatus
  @IsOptional() @IsString() aiCategory?: string
  @IsOptional() @IsString() aiSeverity?: string
  @IsNumber() @Min(0) @Max(100) urgencyScore: number
  @IsOptional() @IsString() suggestedPriority?: string
  @IsOptional() @IsString() suggestedSla?: string
  routingSuggestions: any[]
  @IsOptional() @IsString() classificationReason?: string
  @IsOptional() keywordMatches?: string[]
  @IsNumber() @Min(0) @Max(1) confidence: number
  @IsBoolean() isRuleBased: boolean
  @IsString() model: string
  @IsString() modelVersion: string
  @IsString() promptVersion: string
  @IsNumber() @Min(0) processingTimeMs: number
  @IsOptional() @IsString() failureReason?: string
}
