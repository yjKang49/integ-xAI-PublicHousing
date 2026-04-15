// apps/api/src/modules/maintenance-recommendations/dto/maintenance-recommendation.dto.ts
// Phase 2-9: 장기수선 권장 DTO

import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RiskLevel, MaintenanceType, RecommendationStatus } from '@ax/shared';

export class MaintenanceRecommendationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() complexId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() targetId?: string;
  @ApiPropertyOptional({ enum: RiskLevel }) @IsOptional() @IsEnum(RiskLevel) riskLevel?: RiskLevel;
  @ApiPropertyOptional({ enum: MaintenanceType }) @IsOptional() @IsEnum(MaintenanceType) maintenanceType?: MaintenanceType;
  @ApiPropertyOptional({ enum: RecommendationStatus }) @IsOptional() @IsEnum(RecommendationStatus) status?: RecommendationStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() page?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() limit?: string;
}

export class UpdateRecommendationStatusDto {
  @ApiPropertyOptional({ enum: RecommendationStatus })
  @IsEnum(RecommendationStatus)
  status: RecommendationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reviewNote?: string;
}
