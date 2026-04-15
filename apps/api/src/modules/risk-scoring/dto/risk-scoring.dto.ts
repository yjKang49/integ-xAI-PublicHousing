// apps/api/src/modules/risk-scoring/dto/risk-scoring.dto.ts
// Phase 2-9: 위험도 스코어 DTO

import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RiskLevel, RiskTargetType } from '@ax/shared';

export class TriggerRiskCalculationDto {
  @ApiProperty({ example: 'complex:org1:cmp_001' })
  @IsString()
  complexId: string;

  @ApiProperty({ enum: RiskTargetType })
  @IsEnum(RiskTargetType)
  targetType: RiskTargetType;

  @ApiProperty({ example: 'facilityAsset:org1:ast_001' })
  @IsString()
  targetId: string;

  @ApiProperty({ example: '101동 외벽' })
  @IsString()
  targetName: string;

  @ApiPropertyOptional({ description: '완료 후 자동 권장 문서 생성' })
  @IsOptional()
  @IsBoolean()
  generateRecommendation?: boolean;
}

export class RiskScoreQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() complexId?: string;
  @ApiPropertyOptional({ enum: RiskTargetType }) @IsOptional() @IsEnum(RiskTargetType) targetType?: RiskTargetType;
  @ApiPropertyOptional() @IsOptional() @IsString() targetId?: string;
  @ApiPropertyOptional({ enum: RiskLevel }) @IsOptional() @IsEnum(RiskLevel) level?: RiskLevel;
  @ApiPropertyOptional() @IsOptional() @IsString() page?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() limit?: string;
}
