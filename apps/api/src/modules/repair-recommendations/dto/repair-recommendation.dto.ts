// apps/api/src/modules/repair-recommendations/dto/repair-recommendation.dto.ts
import {
  IsString, IsOptional, IsEnum, IsNumber, IsBoolean, IsArray, Min, ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { RepairTimeline } from '@ax/shared'

export class CostRangeDto {
  @IsNumber() @Min(0) min: number
  @IsNumber() @Min(0) max: number
  @IsString() currency: 'KRW'
}

export class UpdateRepairRecommendationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() recommendedAction?: string
  @ApiPropertyOptional() @IsOptional() @IsString() actionDetail?: string
  @ApiPropertyOptional({ enum: RepairTimeline }) @IsOptional() @IsEnum(RepairTimeline) recommendedTimeline?: RepairTimeline
  @ApiPropertyOptional({ minimum: 1 }) @IsOptional() @IsNumber() @Min(1) priorityRank?: number
  @ApiPropertyOptional({ type: CostRangeDto }) @IsOptional() @ValidateNested() @Type(() => CostRangeDto) estimatedCostRange?: CostRangeDto
  @ApiPropertyOptional() @IsOptional() @IsString() kcsStandardRef?: string
  @ApiPropertyOptional() @IsOptional() @IsString() kcsComplianceNote?: string
}

export class ApproveRepairRecommendationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() approvalNote?: string
}

export class RepairRecommendationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() complexId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() diagnosisOpinionId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() defectId?: string
  @ApiPropertyOptional({ type: Boolean }) @IsOptional() @IsBoolean() isApproved?: boolean
  @ApiPropertyOptional({ enum: RepairTimeline }) @IsOptional() @IsEnum(RepairTimeline) recommendedTimeline?: RepairTimeline
  @ApiPropertyOptional({ type: Number }) @IsOptional() page?: number
  @ApiPropertyOptional({ type: Number }) @IsOptional() limit?: number
}
